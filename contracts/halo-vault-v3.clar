;; halo-vault-v3.clar
;; Multi-asset yield vault with dynamic asset registry
;;
;; Improvements over v2:
;; - Dynamic asset registry supporting up to 10 asset types (not hardcoded to 3)
;; - Strategy metadata per asset (strategy-name field for UI/reporting)
;; - Generic deposit/withdraw/claim functions parameterized by asset-type
;; - 4 initial asset types: USDCx (u0, 90% LTV), sBTC (u1, 60% LTV),
;;   STX (u2, 40% LTV), hUSD (u3, 80% LTV)
;; - Emergency pause capability for all user-facing operations
;; - Per-asset Synthetix-style yield accumulator (same proven algorithm as v2)
;; - Aggregate USD capacity across all assets for circle participation
;; - Authorized contracts can lock/release/slash collateral
;; - Admin price oracle for cross-asset USD conversion
;; - Slash priority: stablecoins first, then volatile assets
;;
;; Dependencies: halo-sip010-trait (deployed)

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

;; Error codes -- aligned with v2 numbering, extended for v3
(define-constant ERR_NOT_AUTHORIZED (err u700))
(define-constant ERR_INVALID_AMOUNT (err u701))
(define-constant ERR_INSUFFICIENT_BALANCE (err u702))
(define-constant ERR_INSUFFICIENT_CAPACITY (err u703))
(define-constant ERR_NO_DEPOSIT (err u704))
(define-constant ERR_TRANSFER_FAILED (err u705))
(define-constant ERR_INVALID_PARAMS (err u706))
(define-constant ERR_TOKEN_NOT_SUPPORTED (err u707))
(define-constant ERR_COMMITMENT_NOT_FOUND (err u708))
(define-constant ERR_ZERO_PRICE (err u709))
(define-constant ERR_ALREADY_AUTHORIZED (err u710))
(define-constant ERR_ASSET_NOT_FOUND (err u711))
(define-constant ERR_ASSET_NOT_ACTIVE (err u712))
(define-constant ERR_VAULT_PAUSED (err u713))
(define-constant ERR_RATE_TOO_HIGH (err u714))
(define-constant ERR_ASSET_NOT_CONFIGURED (err u715))
(define-constant ERR_ASSET_INACTIVE (err u716))
(define-constant ERR_MAX_ASSETS_REACHED (err u717))

;; Asset type constants for the 4 initial assets
(define-constant ASSET_TYPE_USDCX u0)  ;; USDCx stablecoin -- 90% LTV, 6 decimals
(define-constant ASSET_TYPE_SBTC  u1)  ;; sBTC -- 60% LTV, 8 decimals
(define-constant ASSET_TYPE_STX   u2)  ;; Native STX -- 40% LTV, 6 decimals
(define-constant ASSET_TYPE_HUSD  u3)  ;; hUSD stablecoin -- 80% LTV, 6 decimals

;; Maximum number of supported asset types
(define-constant MAX_ASSETS u10)

;; LTV denominator (basis points: 10000 = 100%)
(define-constant LTV_DENOMINATOR u10000)

;; Yield precision (10^12) for Synthetix-style accumulator
(define-constant PRECISION u1000000000000)

;; Price precision (6 decimals: $1.00 = u1000000)
(define-constant PRICE_PRECISION u1000000)

;; Minimum yield funding duration (~1 day at ~10 min/block)
(define-constant MIN_YIELD_DURATION u144)

;; Static list of asset indices for fold operations (0 through 9)
(define-constant ASSET_INDICES (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))

;; Slash priority order: stablecoins first (USDCx, hUSD), then volatile (STX, sBTC),
;; then any future assets in index order
(define-constant SLASH_PRIORITY (list u0 u3 u2 u1 u4 u5 u6 u7 u8 u9))

;; ============================================
;; DATA VARIABLES
;; ============================================

;; Admin principal -- can configure assets, set prices, fund yield, authorize contracts
(define-data-var admin principal CONTRACT_OWNER)

;; List of contracts authorized to lock/release/slash collateral (e.g., halo-circle)
(define-data-var authorized-contracts (list 10 principal) (list))

;; Emergency pause flag -- blocks deposits, withdrawals, yield claims, and new locks
(define-data-var vault-paused bool false)

;; Counter tracking how many asset types have been configured (monotonically increasing)
(define-data-var asset-count uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

;; Per-asset configuration, strategy metadata, and Synthetix yield accumulator state.
;; Keyed by asset-type (uint 0-9). Each asset has its own independent reward
;; accumulator allowing different yield rates and strategies per asset class.
;;
;; Fields:
;;   token-principal  -- contract principal for SIP-010 tokens; none for native STX
;;   ltv-ratio        -- loan-to-value in basis points (9000 = 90%)
;;   price-usd        -- micro-USD price with 6 decimals ($1.00 = u1000000)
;;   decimals         -- token's native decimal precision (6 for stablecoins, 8 for sBTC)
;;   is-active        -- can be deactivated to block new deposits without removing
;;   strategy-name    -- human-readable yield strategy label for UI display
;;   reward-per-token-stored -- cumulative reward per deposited token (scaled by PRECISION)
;;   last-update-block       -- last block the accumulator was updated
;;   reward-rate             -- tokens distributed per block during active reward period
;;   reward-end-block        -- block at which current reward period ends
;;   total-deposited         -- aggregate deposits across all users for this asset
(define-map supported-assets uint {
  token-principal: (optional principal),
  ltv-ratio: uint,
  price-usd: uint,
  decimals: uint,
  is-active: bool,
  strategy-name: (string-ascii 64),
  reward-per-token-stored: uint,
  last-update-block: uint,
  reward-rate: uint,
  reward-end-block: uint,
  total-deposited: uint
})

;; Per-user, per-asset deposit balances and individual yield tracking.
;; The reward-per-token-paid snapshot enables O(1) yield calculation:
;; earned = deposited * (current_rpt - paid_rpt) / PRECISION + accumulated_rewards
(define-map user-asset-deposits { user: principal, asset-type: uint } {
  deposited: uint,
  reward-per-token-paid: uint,
  rewards-earned: uint
})

;; Aggregate USD value committed to circles per user.
;; Ensures a user cannot withdraw collateral below their total commitments.
(define-map user-committed principal {
  total-committed-usd: uint
})

;; Per-circle, per-user commitment tracking.
;; Allows individual circle release/slash without affecting other circles.
(define-map circle-commitments-v3 { user: principal, circle-id: uint } {
  commitment-usd: uint
})

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Return the smaller of two unsigned integers
(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

;; Check whether a caller is the admin or an authorized contract
(define-private (is-authorized-caller (caller principal))
  (or (is-eq caller (var-get admin))
      (is-some (index-of? (var-get authorized-contracts) caller)))
)

;; Read the current reward-per-token-stored for an asset (0 if not configured)
(define-private (get-asset-rpt (asset-type uint))
  (match (map-get? supported-assets asset-type)
    asset (get reward-per-token-stored asset)
    u0
  )
)

;; Get user deposit for an asset, or create a default entry with the current
;; reward-per-token snapshot so new depositors start earning from now
(define-private (get-or-create-user-deposit (user principal) (asset-type uint))
  (default-to {
    deposited: u0,
    reward-per-token-paid: (get-asset-rpt asset-type),
    rewards-earned: u0
  } (map-get? user-asset-deposits { user: user, asset-type: asset-type }))
)

;; Update the per-asset Synthetix yield accumulator.
;; Must be called BEFORE any deposit, withdrawal, or claim to ensure
;; reward-per-token-stored reflects all accrued rewards up to the current block.
;;
;; Algorithm:
;;   applicable_block = min(current_block, reward_end_block)
;;   if total_deposited > 0 AND applicable_block > last_update:
;;     elapsed = applicable_block - last_update
;;     additional = (elapsed * reward_rate * PRECISION) / total_deposited
;;     reward_per_token_stored += additional
;;   last_update_block = applicable_block
(define-private (update-asset-reward (asset-type uint))
  (match (map-get? supported-assets asset-type)
    asset (let (
      (current-block stacks-block-height)
      (applicable-block (min-uint current-block (get reward-end-block asset)))
      (total (get total-deposited asset))
      (stored (get reward-per-token-stored asset))
      (last-block (get last-update-block asset))
    )
      (if (and (> total u0) (> applicable-block last-block))
        (let (
          (elapsed (- applicable-block last-block))
          (new-rewards (* elapsed (get reward-rate asset)))
          (additional (/ (* new-rewards PRECISION) total))
        )
          (map-set supported-assets asset-type
            (merge asset {
              reward-per-token-stored: (+ stored additional),
              last-update-block: applicable-block
            })
          )
        )
        (map-set supported-assets asset-type
          (merge asset { last-update-block: applicable-block })
        )
      )
    )
    true ;; Asset not found -- no-op
  )
)

;; Update a user's individual reward snapshot for a specific asset.
;; Calculates newly earned rewards since the user's last snapshot and
;; adds them to their accumulated rewards-earned balance.
;;
;; Formula: new_earned = earned + deposited * (current_rpt - paid_rpt) / PRECISION
(define-private (update-user-asset-reward (user principal) (asset-type uint))
  (match (map-get? user-asset-deposits { user: user, asset-type: asset-type })
    dep (let (
      (deposited (get deposited dep))
      (paid (get reward-per-token-paid dep))
      (earned (get rewards-earned dep))
      (current-rpt (get-asset-rpt asset-type))
      (new-earned (+ earned (/ (* deposited (- current-rpt paid)) PRECISION)))
    )
      (map-set user-asset-deposits { user: user, asset-type: asset-type }
        (merge dep {
          rewards-earned: new-earned,
          reward-per-token-paid: current-rpt
        })
      )
    )
    true ;; No deposit -- nothing to update
  )
)

;; Calculate USD collateral capacity for a given deposit amount of a specific asset.
;; Only active assets contribute capacity. Inactive assets return 0.
;;
;; Formula: capacity = (deposited * price / 10^decimals) * ltv / 10000
(define-private (calculate-asset-capacity-usd (asset-type uint) (deposited uint))
  (match (map-get? supported-assets asset-type)
    asset (if (get is-active asset)
      (let (
        (price (get price-usd asset))
        (decimals (get decimals asset))
        (ltv (get ltv-ratio asset))
        (usd-value (/ (* deposited price) (pow u10 decimals)))
      )
        (/ (* usd-value ltv) LTV_DENOMINATOR)
      )
      u0
    )
    u0
  )
)

;; Get the deposited amount for a user on a specific asset (0 if no deposit)
(define-private (get-user-deposited-amount (user principal) (asset-type uint))
  (match (map-get? user-asset-deposits { user: user, asset-type: asset-type })
    dep (get deposited dep)
    u0
  )
)

;; Fold helper: sum capacity across all asset types for a user.
;; Used by get-total-capacity to iterate over ASSET_INDICES.
(define-private (fold-capacity-for-user
  (idx uint)
  (state { user: principal, total: uint })
)
  (let (
    (user (get user state))
    (deposited (get-user-deposited-amount user idx))
    (cap (calculate-asset-capacity-usd idx deposited))
  )
    { user: user, total: (+ (get total state) cap) }
  )
)

;; Fold helper: calculate capacity after a hypothetical withdrawal.
;; Used by check-withdrawal-allowed to verify commitments remain covered.
(define-private (fold-capacity-after-withdraw
  (idx uint)
  (state { user: principal, withdraw-asset: uint, withdraw-amount: uint, total: uint })
)
  (let (
    (user (get user state))
    (withdraw-asset (get withdraw-asset state))
    (withdraw-amount (get withdraw-amount state))
    (deposited (get-user-deposited-amount user idx))
    (effective-deposited (if (is-eq idx withdraw-asset)
      (if (> deposited withdraw-amount) (- deposited withdraw-amount) u0)
      deposited))
    (cap (calculate-asset-capacity-usd idx effective-deposited))
  )
    (merge state { total: (+ (get total state) cap) })
  )
)

;; Check whether a withdrawal would leave enough capacity to cover all commitments.
;; Simulates the post-withdrawal capacity by adjusting the target asset's deposit.
(define-private (check-withdrawal-allowed (user principal) (asset-type uint) (amount uint))
  (let (
    (dep (unwrap! (map-get? user-asset-deposits { user: user, asset-type: asset-type }) ERR_NO_DEPOSIT))
    (deposited (get deposited dep))
  )
    (asserts! (<= amount deposited) ERR_INSUFFICIENT_BALANCE)
    (let (
      (result (fold fold-capacity-after-withdraw ASSET_INDICES
        { user: user, withdraw-asset: asset-type, withdraw-amount: amount, total: u0 }))
      (new-total-cap (get total result))
      (committed (get total-committed-usd
        (default-to { total-committed-usd: u0 } (map-get? user-committed user))))
    )
      (asserts! (>= new-total-cap committed) ERR_INSUFFICIENT_CAPACITY)
      (ok true)
    )
  )
)

;; Private helper: slash USD amount from a specific asset's deposits.
;; Converts between USD and token amounts using the asset's price and decimals.
;; Updates yield accumulators before modifying balances to preserve reward accuracy.
;;
;; Returns { slashed: uint, remaining: uint } -- amounts in micro-USD terms.
(define-private (slash-from-asset (user principal) (asset-type uint) (slash-usd uint))
  (if (is-eq slash-usd u0)
    { slashed: u0, remaining: u0 }
    (match (map-get? user-asset-deposits { user: user, asset-type: asset-type })
      dep (match (map-get? supported-assets asset-type)
        asset (let (
          (deposited (get deposited dep))
          (price (get price-usd asset))
          (decimals (get decimals asset))
          ;; USD value of user's entire deposit for this asset
          (deposit-usd (/ (* deposited price) (pow u10 decimals)))
          ;; Slash at most the full deposit's USD value
          (slash-from-this (min-uint slash-usd deposit-usd))
          ;; Convert USD slash amount back to token micro-units
          (tokens-to-slash (if (> price u0)
            (/ (* slash-from-this (pow u10 decimals)) price)
            u0))
          (actual-tokens (min-uint tokens-to-slash deposited))
        )
          ;; Update yield accumulator before modifying balances
          (update-asset-reward asset-type)
          (update-user-asset-reward user asset-type)
          ;; Re-read deposit after yield update (rewards snapshot may have changed)
          (let (
            (updated-dep (unwrap-panic
              (map-get? user-asset-deposits { user: user, asset-type: asset-type })))
            (current-deposited (get deposited updated-dep))
            (new-deposited (if (> current-deposited actual-tokens)
              (- current-deposited actual-tokens) u0))
          )
            ;; Update user's deposit balance
            (map-set user-asset-deposits { user: user, asset-type: asset-type }
              (merge updated-dep { deposited: new-deposited })
            )
            ;; Update aggregate asset total
            (map-set supported-assets asset-type
              (merge asset {
                total-deposited: (if (> (get total-deposited asset) actual-tokens)
                  (- (get total-deposited asset) actual-tokens) u0)
              })
            )
            {
              slashed: slash-from-this,
              remaining: (if (> slash-usd slash-from-this)
                (- slash-usd slash-from-this) u0)
            }
          )
        )
        { slashed: u0, remaining: slash-usd } ;; asset config not found
      )
      { slashed: u0, remaining: slash-usd } ;; no deposit for this asset
    )
  )
)

;; Fold helper for slashing across assets in priority order.
;; Accumulates total slashed USD and tracks remaining amount to slash.
(define-private (fold-slash-asset
  (asset-type uint)
  (state { user: principal, remaining: uint, total-slashed: uint })
)
  (let (
    (user (get user state))
    (remaining (get remaining state))
    (result (slash-from-asset user asset-type remaining))
  )
    {
      user: user,
      remaining: (get remaining result),
      total-slashed: (+ (get total-slashed state) (get slashed result))
    }
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get full asset configuration including yield accumulator state
(define-read-only (get-asset-config (asset-type uint))
  (map-get? supported-assets asset-type)
)

;; Get a user's deposit record for a specific asset
(define-read-only (get-user-deposit (user principal) (asset-type uint))
  (map-get? user-asset-deposits { user: user, asset-type: asset-type })
)

;; Get a user's aggregate committed USD across all circles
(define-read-only (get-user-committed (user principal))
  (default-to { total-committed-usd: u0 }
    (map-get? user-committed user))
)

;; Get a specific circle commitment for a user
(define-read-only (get-circle-commitment (user principal) (circle-id uint))
  (map-get? circle-commitments-v3 { user: user, circle-id: circle-id })
)

;; Calculate total USD collateral capacity across all configured assets for a user.
;; Iterates over all 10 possible asset slots; unconfigured/inactive slots contribute 0.
(define-read-only (get-total-capacity (user principal))
  (let (
    (result (fold fold-capacity-for-user ASSET_INDICES
      { user: user, total: u0 }))
  )
    (ok (get total result))
  )
)

;; Get available capacity = total capacity minus committed USD.
;; This is the amount a user can still commit to new circles.
(define-read-only (get-available-capacity (user principal))
  (let (
    (total-cap (unwrap-panic (get-total-capacity user)))
    (committed (get total-committed-usd (get-user-committed user)))
  )
    (ok (if (> total-cap committed) (- total-cap committed) u0))
  )
)

;; Check if user can commit an additional USD amount to a circle
(define-read-only (can-commit (user principal) (additional-usd uint))
  (let (
    (available (unwrap-panic (get-available-capacity user)))
  )
    (ok (>= available additional-usd))
  )
)

;; Calculate pending (unclaimed) yield for a user on a specific asset.
;; This is a view-only function that does NOT modify state -- it simulates
;; what the reward-per-token would be at the current block.
(define-read-only (get-pending-yield (user principal) (asset-type uint))
  (match (map-get? user-asset-deposits { user: user, asset-type: asset-type })
    dep (match (map-get? supported-assets asset-type)
      asset (let (
        (deposited (get deposited dep))
        (paid (get reward-per-token-paid dep))
        (earned (get rewards-earned dep))
        (stored (get reward-per-token-stored asset))
        (total (get total-deposited asset))
        (current-block stacks-block-height)
        (applicable-block (min-uint current-block (get reward-end-block asset)))
        (last-block (get last-update-block asset))
        ;; Simulate what reward-per-token would be right now
        (current-rpt (if (and (> total u0) (> applicable-block last-block))
          (+ stored (/ (* (* (- applicable-block last-block) (get reward-rate asset)) PRECISION) total))
          stored
        ))
      )
        (+ earned (/ (* deposited (- current-rpt paid)) PRECISION))
      )
      u0
    )
    u0
  )
)

;; Calculate commitment USD for a circle.
;; Converts token-denominated contribution to USD using the asset's price.
;; Formula: commitment = (contribution * total_members * price) / 10^decimals
(define-read-only (calculate-commitment-usd
  (contribution uint)
  (total-members uint)
  (asset-type uint)
)
  (match (map-get? supported-assets asset-type)
    asset (let (
      (price (get price-usd asset))
      (decimals (get decimals asset))
      (total-obligation (* contribution total-members))
      (commitment-usd (/ (* total-obligation price) (pow u10 decimals)))
    )
      (ok commitment-usd)
    )
    ERR_ASSET_NOT_FOUND
  )
)

;; Get the current admin principal
(define-read-only (get-admin)
  (var-get admin)
)

;; Get the number of configured asset types
(define-read-only (get-asset-count)
  (var-get asset-count)
)

;; Check if the vault is currently paused
(define-read-only (is-paused)
  (var-get vault-paused)
)

;; Check if a contract is authorized to lock/release/slash
(define-read-only (is-authorized (caller principal))
  (is-authorized-caller caller)
)

;; Get a comprehensive vault summary for a user across the 4 initial asset types.
;; Returns individual deposit amounts plus aggregate capacity and commitment data.
(define-read-only (get-vault-summary (user principal))
  (let (
    (usdcx-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_USDCX })))
    (sbtc-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_SBTC })))
    (stx-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_STX })))
    (husd-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_HUSD })))
    (committed-data (get-user-committed user))
  )
    {
      usdcx-deposited: (get deposited usdcx-dep),
      sbtc-deposited: (get deposited sbtc-dep),
      stx-deposited: (get deposited stx-dep),
      husd-deposited: (get deposited husd-dep),
      total-committed-usd: (get total-committed-usd committed-data),
      total-capacity-usd: (unwrap-panic (get-total-capacity user)),
      available-capacity-usd: (unwrap-panic (get-available-capacity user))
    }
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- DEPOSITS
;; ============================================

;; Deposit a SIP-010 token (USDCx, sBTC, hUSD, or any future SIP-010 asset).
;; The passed token contract must match the configured token-principal for the
;; given asset-type, preventing deposits of the wrong token.
;;
;; Follows checks-effects-interactions pattern:
;;   1. Validate all preconditions
;;   2. Update yield accumulators
;;   3. Update user and asset state
;;   4. Transfer tokens from user to vault (last, to prevent reentrancy issues)
(define-public (deposit-token (token <ft-trait>) (asset-type uint) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    ;; Checks
    (asserts! (get is-active asset) ERR_ASSET_INACTIVE)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)
    (asserts! (> (get price-usd asset) u0) ERR_ZERO_PRICE)

    ;; Update yield accumulators before modifying balances
    (update-asset-reward asset-type)
    (update-user-asset-reward caller asset-type)

    ;; Effects: update user deposit balance
    (let (
      (dep (get-or-create-user-deposit caller asset-type))
    )
      (map-set user-asset-deposits { user: caller, asset-type: asset-type }
        (merge dep { deposited: (+ (get deposited dep) amount) })
      )
    )

    ;; Effects: update aggregate asset total deposited
    (map-set supported-assets asset-type
      (merge (unwrap-panic (map-get? supported-assets asset-type))
        { total-deposited: (+ (get total-deposited asset) amount) })
    )

    ;; Interactions: transfer tokens from user to vault (last)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    (print {
      event: "vault-v3-deposit",
      user: caller,
      asset-type: asset-type,
      amount: amount
    })
    (ok true)
  )
)

;; Deposit native STX into the vault (always asset-type u2).
;; Uses stx-transfer? instead of SIP-010 contract-call? since STX is native.
(define-public (deposit-stx (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_CONFIGURED))
  )
    ;; Checks
    (asserts! (get is-active asset) ERR_ASSET_INACTIVE)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)
    (asserts! (> (get price-usd asset) u0) ERR_ZERO_PRICE)

    ;; Update yield accumulators
    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    ;; Effects: update user deposit
    (let (
      (dep (get-or-create-user-deposit caller ASSET_TYPE_STX))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { deposited: (+ (get deposited dep) amount) })
      )
    )

    ;; Effects: update asset total
    (map-set supported-assets ASSET_TYPE_STX
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX))
        { total-deposited: (+ (get total-deposited asset) amount) })
    )

    ;; Interactions: transfer STX from user to vault
    (try! (stx-transfer? amount caller (as-contract tx-sender)))

    (print {
      event: "vault-v3-deposit",
      user: caller,
      asset-type: ASSET_TYPE_STX,
      amount: amount
    })
    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- WITHDRAWALS
;; ============================================

;; Withdraw a SIP-010 token from the vault.
;; Validates that remaining capacity after withdrawal still covers all
;; circle commitments. This prevents users from withdrawing collateral
;; that is backing active circle participation.
(define-public (withdraw-token (token <ft-trait>) (asset-type uint) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    ;; Checks
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield accumulators
    (update-asset-reward asset-type)
    (update-user-asset-reward caller asset-type)

    ;; Check withdrawal leaves enough capacity for commitments
    (try! (check-withdrawal-allowed caller asset-type amount))

    ;; Effects: update user deposit (before transfer)
    (let (
      (dep (unwrap-panic
        (map-get? user-asset-deposits { user: caller, asset-type: asset-type })))
    )
      (map-set user-asset-deposits { user: caller, asset-type: asset-type }
        (merge dep { deposited: (- (get deposited dep) amount) })
      )
    )

    ;; Effects: update asset total (before transfer)
    (map-set supported-assets asset-type
      (merge (unwrap-panic (map-get? supported-assets asset-type))
        { total-deposited: (- (get total-deposited asset) amount) })
    )

    ;; Interactions: transfer tokens from vault back to user (last)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

    (print {
      event: "vault-v3-withdraw",
      user: caller,
      asset-type: asset-type,
      amount: amount
    })
    (ok true)
  )
)

;; Withdraw native STX from the vault.
;; Same capacity check as withdraw-token to protect circle commitments.
(define-public (withdraw-stx (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_CONFIGURED))
  )
    ;; Checks
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield accumulators
    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    ;; Check withdrawal leaves enough capacity
    (try! (check-withdrawal-allowed caller ASSET_TYPE_STX amount))

    ;; Effects: update user deposit
    (let (
      (dep (unwrap-panic
        (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX })))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { deposited: (- (get deposited dep) amount) })
      )
    )

    ;; Effects: update asset total
    (map-set supported-assets ASSET_TYPE_STX
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX))
        { total-deposited: (- (get total-deposited asset) amount) })
    )

    ;; Interactions: transfer STX from vault back to user
    (try! (as-contract (stx-transfer? amount tx-sender caller)))

    (print {
      event: "vault-v3-withdraw",
      user: caller,
      asset-type: ASSET_TYPE_STX,
      amount: amount
    })
    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- YIELD CLAIMS
;; ============================================

;; Claim accumulated yield for a SIP-010 token asset.
;; Yield is paid in the same token as the deposit (e.g., USDCx yield paid in USDCx).
;; The vault must hold sufficient reward tokens (funded via fund-yield).
(define-public (claim-yield-token (token <ft-trait>) (asset-type uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    ;; Checks
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (get is-active asset) ERR_ASSET_INACTIVE)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield accumulators to capture all rewards up to now
    (update-asset-reward asset-type)
    (update-user-asset-reward caller asset-type)

    (let (
      (dep (unwrap! (map-get? user-asset-deposits { user: caller, asset-type: asset-type })
        ERR_NO_DEPOSIT))
      (reward (get rewards-earned dep))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)

      ;; Effects: zero out rewards before transfer (prevent double-claim)
      (map-set user-asset-deposits { user: caller, asset-type: asset-type }
        (merge dep { rewards-earned: u0 })
      )

      ;; Interactions: transfer reward tokens from vault to user
      (try! (as-contract (contract-call? token transfer reward tx-sender caller none)))

      (print {
        event: "yield-claimed-v3",
        user: caller,
        asset-type: asset-type,
        amount: reward
      })
      (ok reward)
    )
  )
)

;; Claim accumulated yield for native STX deposits.
;; Yield is paid in STX. The vault must hold sufficient STX (funded via fund-yield-stx).
(define-public (claim-yield-stx)
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_CONFIGURED))
  )
    ;; Checks
    (asserts! (get is-active asset) ERR_ASSET_INACTIVE)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield accumulators
    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    (let (
      (dep (unwrap! (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX })
        ERR_NO_DEPOSIT))
      (reward (get rewards-earned dep))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)

      ;; Effects: zero out rewards before transfer
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { rewards-earned: u0 })
      )

      ;; Interactions: transfer STX reward from vault to user
      (try! (as-contract (stx-transfer? reward tx-sender caller)))

      (print {
        event: "yield-claimed-v3",
        user: caller,
        asset-type: ASSET_TYPE_STX,
        amount: reward
      })
      (ok reward)
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- COLLATERAL (authorized contracts only)
;; ============================================

;; Lock collateral capacity for a circle.
;; Called by authorized circle contracts when a user joins a circle.
;; Verifies the user has enough available USD capacity to cover the commitment.
;; Does NOT actually move tokens -- it reserves capacity against future withdrawals.
(define-public (lock-collateral (user principal) (circle-id uint) (commitment-usd uint))
  (let (
    (caller contract-caller)
  )
    ;; Only authorized contracts (e.g., halo-circle) can lock collateral
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> commitment-usd u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    (let (
      (total-cap (unwrap-panic (get-total-capacity user)))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (+ current-committed commitment-usd))
    )
      ;; Ensure total capacity covers all commitments including this new one
      (asserts! (<= new-committed total-cap) ERR_INSUFFICIENT_CAPACITY)

      ;; Update aggregate committed USD
      (map-set user-committed user { total-committed-usd: new-committed })

      ;; Record per-circle commitment for individual release/slash
      (map-set circle-commitments-v3 { user: user, circle-id: circle-id } {
        commitment-usd: commitment-usd
      })

      (print {
        event: "collateral-locked-v3",
        user: user,
        circle-id: circle-id,
        commitment-usd: commitment-usd,
        total-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Release collateral when a circle completes successfully.
;; Removes the per-circle commitment and reduces aggregate committed amount.
;; The user can then withdraw the freed-up collateral or use it for new circles.
(define-public (release-collateral (user principal) (circle-id uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)

    (let (
      (commitment (unwrap!
        (map-get? circle-commitments-v3 { user: user, circle-id: circle-id })
        ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (if (> current-committed commitment-usd)
                        (- current-committed commitment-usd)
                        u0))
    )
      ;; Update aggregate committed
      (map-set user-committed user { total-committed-usd: new-committed })
      ;; Remove per-circle record
      (map-delete circle-commitments-v3 { user: user, circle-id: circle-id })

      (print {
        event: "collateral-released-v3",
        user: user,
        circle-id: circle-id,
        released-usd: commitment-usd,
        remaining-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Slash collateral on default.
;; First releases the circle commitment, then slashes actual deposit tokens
;; across assets in priority order (stablecoins first: USDCx, hUSD, then STX, sBTC,
;; then any future assets). The slash amount is in micro-USD (6 decimals).
;;
;; Slashing converts the USD amount to token units using each asset's price,
;; effectively confiscating tokens proportional to the slash amount.
;; The slashed tokens remain in the vault (not burned or transferred out).
(define-public (slash-collateral (user principal) (circle-id uint) (slash-usd uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> slash-usd u0) ERR_INVALID_AMOUNT)

    ;; Release the circle commitment first
    (let (
      (commitment (unwrap!
        (map-get? circle-commitments-v3 { user: user, circle-id: circle-id })
        ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (if (> current-committed commitment-usd)
                        (- current-committed commitment-usd)
                        u0))
    )
      ;; Update committed totals
      (map-set user-committed user { total-committed-usd: new-committed })
      (map-delete circle-commitments-v3 { user: user, circle-id: circle-id })

      ;; Slash across assets in priority order using fold
      (let (
        (slash-result (fold fold-slash-asset SLASH_PRIORITY
          { user: user, remaining: slash-usd, total-slashed: u0 }))
        (total-slashed (get total-slashed slash-result))
      )
        (print {
          event: "collateral-slashed-v3",
          user: user,
          circle-id: circle-id,
          slash-usd: slash-usd,
          total-slashed-usd: total-slashed
        })

        (ok total-slashed)
      )
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Configure a new or existing asset type.
;; Sets all parameters including LTV ratio, initial price, decimals, and strategy name.
;; When reconfiguring an existing asset, preserves the yield accumulator state and
;; existing price (use set-asset-price to update price separately).
;; Increments asset-count when adding a brand new (previously unconfigured) asset.
;;
;; Parameters:
;;   asset-type       -- index 0-9 identifying the asset
;;   token-principal  -- SIP-010 contract principal, or none for native STX
;;   ltv-ratio        -- loan-to-value in basis points (100 = 1%, 9500 = 95% max)
;;   price-usd        -- initial micro-USD price (only used for new assets)
;;   decimals         -- token decimal precision
;;   strategy-name    -- human-readable strategy label (max 64 chars)
(define-public (configure-asset
  (asset-type uint)
  (token-principal (optional principal))
  (ltv-ratio uint)
  (price-usd uint)
  (decimals uint)
  (strategy-name (string-ascii 64))
)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (< asset-type MAX_ASSETS) ERR_INVALID_PARAMS)
    (asserts! (>= ltv-ratio u100) ERR_INVALID_PARAMS)     ;; min 1% LTV
    (asserts! (<= ltv-ratio u9500) ERR_INVALID_PARAMS)     ;; max 95% LTV
    (asserts! (<= decimals u18) ERR_INVALID_PARAMS)
    (asserts! (> price-usd u0) ERR_ZERO_PRICE)

    (let (
      (existing (map-get? supported-assets asset-type))
      (is-new (is-none existing))
    )
      ;; Check max assets limit for new assets
      (asserts! (or (not is-new) (< (var-get asset-count) MAX_ASSETS))
        ERR_MAX_ASSETS_REACHED)

      (map-set supported-assets asset-type {
        token-principal: token-principal,
        ltv-ratio: ltv-ratio,
        ;; Preserve existing price on reconfigure; use provided price for new assets
        price-usd: (match existing
          ex (get price-usd ex)
          price-usd),
        decimals: decimals,
        is-active: true,
        strategy-name: strategy-name,
        ;; Preserve existing yield accumulator state or initialize to zero
        reward-per-token-stored: (match existing
          ex (get reward-per-token-stored ex)
          u0),
        last-update-block: stacks-block-height,
        reward-rate: (match existing
          ex (get reward-rate ex)
          u0),
        reward-end-block: (match existing
          ex (get reward-end-block ex)
          u0),
        total-deposited: (match existing
          ex (get total-deposited ex)
          u0)
      })

      ;; Increment asset count for new assets
      (if is-new
        (var-set asset-count (+ (var-get asset-count) u1))
        true
      )

      (print {
        event: "asset-configured-v3",
        asset-type: asset-type,
        ltv-ratio: ltv-ratio,
        decimals: decimals,
        strategy-name: strategy-name,
        is-new: is-new
      })
      (ok true)
    )
  )
)

;; Update the USD price for an asset (oracle price feed).
;; Does not require the asset to be active -- allows price updates on paused assets.
;; Price is in micro-USD with 6 decimal places ($1.00 = u1000000).
(define-public (set-asset-price (asset-type uint) (price-usd uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> price-usd u0) ERR_ZERO_PRICE)

    (let (
      (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    )
      (map-set supported-assets asset-type
        (merge asset { price-usd: price-usd })
      )
      (print {
        event: "price-updated-v3",
        asset-type: asset-type,
        price-usd: price-usd
      })
      (ok true)
    )
  )
)

;; Fund the yield pool for a SIP-010 token asset.
;; Transfers reward tokens from admin to the vault and sets the distribution rate.
;; If an existing reward period is still active, any remaining undistributed rewards
;; are rolled over into the new period for smooth rate transitions.
;;
;; Rate calculation: new_rate = (amount + remaining_from_current_period) / duration
(define-public (fund-yield (token <ft-trait>) (asset-type uint) (amount uint) (duration-blocks uint))
  (let (
    (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= duration-blocks MIN_YIELD_DURATION) ERR_INVALID_PARAMS)

    ;; Update accumulator before changing rate
    (update-asset-reward asset-type)

    ;; Transfer reward tokens from admin to vault
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

    (let (
      (current-block stacks-block-height)
      (updated-asset (unwrap-panic (map-get? supported-assets asset-type)))
      ;; Roll over remaining rewards from current period
      (remaining (if (> (get reward-end-block updated-asset) current-block)
        (* (get reward-rate updated-asset)
           (- (get reward-end-block updated-asset) current-block))
        u0))
      (total-reward (+ amount remaining))
      (new-rate (/ total-reward duration-blocks))
    )
      (map-set supported-assets asset-type
        (merge updated-asset {
          reward-rate: new-rate,
          reward-end-block: (+ current-block duration-blocks),
          last-update-block: current-block
        })
      )
      (print {
        event: "yield-funded-v3",
        asset-type: asset-type,
        amount: amount,
        rate: new-rate,
        duration: duration-blocks
      })
      (ok true)
    )
  )
)

;; Fund the yield pool for native STX deposits.
;; Same as fund-yield but uses stx-transfer? instead of SIP-010 contract-call.
(define-public (fund-yield-stx (amount uint) (duration-blocks uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= duration-blocks MIN_YIELD_DURATION) ERR_INVALID_PARAMS)

    ;; Update accumulator before changing rate
    (update-asset-reward ASSET_TYPE_STX)

    ;; Transfer STX from admin to vault
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (let (
      (current-block stacks-block-height)
      (asset (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX)))
      ;; Roll over remaining rewards from current period
      (remaining (if (> (get reward-end-block asset) current-block)
        (* (get reward-rate asset) (- (get reward-end-block asset) current-block))
        u0))
      (total-reward (+ amount remaining))
      (new-rate (/ total-reward duration-blocks))
    )
      (map-set supported-assets ASSET_TYPE_STX
        (merge asset {
          reward-rate: new-rate,
          reward-end-block: (+ current-block duration-blocks),
          last-update-block: current-block
        })
      )
      (print {
        event: "yield-funded-v3",
        asset-type: ASSET_TYPE_STX,
        amount: amount,
        rate: new-rate,
        duration: duration-blocks
      })
      (ok true)
    )
  )
)

;; Authorize a contract to call lock/release/slash collateral functions.
;; Typically used to authorize the halo-circle contract.
;; Maximum 10 authorized contracts.
(define-public (authorize-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (current (var-get authorized-contracts))
    )
      (asserts! (is-none (index-of? current contract)) ERR_ALREADY_AUTHORIZED)
      (var-set authorized-contracts
        (unwrap! (as-max-len? (append current contract) u10) ERR_NOT_AUTHORIZED))
      (print { event: "contract-authorized-v3", contract: contract })
      (ok true)
    )
  )
)

;; Emergency pause -- blocks deposits, withdrawals, yield claims, and new locks.
;; Admin functions (configure-asset, set-price, set-admin) and collateral
;; release remain operational during pause for safety.
(define-public (pause-vault)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set vault-paused true)
    (print { event: "vault-paused-v3" })
    (ok true)
  )
)

;; Unpause vault -- re-enables all user-facing operations.
(define-public (unpause-vault)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set vault-paused false)
    (print { event: "vault-unpaused-v3" })
    (ok true)
  )
)

;; Transfer admin role to a new principal.
;; Takes effect immediately -- the caller loses admin access.
;; There is no two-step transfer or timelock for simplicity.
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-transferred-v3", new-admin: new-admin })
    (ok true)
  )
)

;; Deactivate an asset type.
;; Prevents new deposits but allows withdrawals so users can exit.
;; The asset's yield accumulator continues to function for existing depositors.
(define-public (deactivate-asset (asset-type uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    )
      (map-set supported-assets asset-type
        (merge asset { is-active: false })
      )
      (print { event: "asset-deactivated-v3", asset-type: asset-type })
      (ok true)
    )
  )
)

;; Reactivate a previously deactivated asset type.
;; Re-enables deposits for this asset.
(define-public (reactivate-asset (asset-type uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_CONFIGURED))
    )
      (map-set supported-assets asset-type
        (merge asset { is-active: true })
      )
      (print { event: "asset-reactivated-v3", asset-type: asset-type })
      (ok true)
    )
  )
)
