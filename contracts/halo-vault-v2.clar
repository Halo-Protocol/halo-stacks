;; halo-vault-v2.clar
;; Multi-asset collateral vault with per-asset LTV and yield
;;
;; Features:
;; - Deposits in hUSD (80% LTV), STX (50% LTV), sBTC (50% LTV)
;; - Per-asset Synthetix-style yield accumulator
;; - Aggregate USD capacity across all assets for circle participation
;; - Authorized contracts can lock/release/slash collateral
;; - Admin price oracle for cross-asset USD conversion
;;
;; Dependencies: halo-sip010-trait

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

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

;; Asset type constants
(define-constant ASSET_TYPE_HUSD u0)
(define-constant ASSET_TYPE_STX  u1)
(define-constant ASSET_TYPE_SBTC u2)

;; LTV denominator
(define-constant LTV_DENOMINATOR u10000)

;; Yield precision (10^12)
(define-constant PRECISION u1000000000000)

;; Price precision (6 decimals: $1.00 = u1000000)
(define-constant PRICE_PRECISION u1000000)

;; Minimum yield funding duration (~1 day in blocks)
(define-constant MIN_YIELD_DURATION u144)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var authorized-contracts (list 10 principal) (list))
(define-data-var vault-paused bool false)

;; ============================================
;; DATA MAPS
;; ============================================

;; Per-asset configuration and yield accumulator
(define-map supported-assets uint {
  token-principal: (optional principal),  ;; none for STX (native)
  ltv-ratio: uint,                        ;; basis points (8000 = 80%)
  price-usd: uint,                        ;; 6 decimal USD price
  decimals: uint,                         ;; token native decimals
  price-last-updated: uint,
  is-active: bool,
  ;; Per-asset Synthetix yield accumulator
  reward-per-token-stored: uint,
  last-update-block: uint,
  reward-rate: uint,
  reward-end-block: uint,
  total-deposited: uint
})

;; Per-user, per-asset balances and yield tracking
(define-map user-asset-deposits { user: principal, asset-type: uint } {
  deposited: uint,
  reward-per-token-paid: uint,
  rewards-earned: uint
})

;; Aggregate committed USD across all circles for a user
(define-map user-committed principal {
  total-committed-usd: uint
})

;; Per-circle commitment tracking
(define-map circle-commitments-v2 { user: principal, circle-id: uint } {
  commitment-usd: uint
})

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

(define-private (is-authorized-caller (caller principal))
  (or (is-eq caller (var-get admin))
      (is-some (index-of? (var-get authorized-contracts) caller)))
)

;; Get or create default user deposit for an asset
(define-private (get-or-create-user-deposit (user principal) (asset-type uint))
  (default-to {
    deposited: u0,
    reward-per-token-paid: (get-asset-rpt asset-type),
    rewards-earned: u0
  } (map-get? user-asset-deposits { user: user, asset-type: asset-type }))
)

;; Get asset's current reward-per-token-stored
(define-private (get-asset-rpt (asset-type uint))
  (match (map-get? supported-assets asset-type)
    asset (get reward-per-token-stored asset)
    u0
  )
)

;; Update per-asset yield accumulator (call before deposit/withdraw/claim)
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

;; Update user's reward snapshot for a specific asset
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
    true ;; No deposit, nothing to update
  )
)

;; Calculate USD capacity for a single asset deposit
(define-private (calculate-asset-capacity-usd (asset-type uint) (deposited uint))
  (match (map-get? supported-assets asset-type)
    asset (let (
      (price (get price-usd asset))
      (decimals (get decimals asset))
      (ltv (get ltv-ratio asset))
      ;; USD value = (deposited * price) / 10^decimals
      (usd-value (/ (* deposited price) (pow u10 decimals)))
      ;; Capacity = usd-value * ltv / 10000
    )
      (/ (* usd-value ltv) LTV_DENOMINATOR)
    )
    u0
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get asset configuration
(define-read-only (get-asset-config (asset-type uint))
  (map-get? supported-assets asset-type)
)

;; Get user's deposit for a specific asset
(define-read-only (get-user-deposit (user principal) (asset-type uint))
  (map-get? user-asset-deposits { user: user, asset-type: asset-type })
)

;; Get user's committed amount
(define-read-only (get-user-committed (user principal))
  (default-to { total-committed-usd: u0 }
    (map-get? user-committed user))
)

;; Get circle commitment
(define-read-only (get-circle-commitment (user principal) (circle-id uint))
  (map-get? circle-commitments-v2 { user: user, circle-id: circle-id })
)

;; Calculate total USD capacity across all assets for a user
(define-read-only (get-total-capacity (user principal))
  (let (
    ;; hUSD capacity
    (husd-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_HUSD })))
    (husd-cap (calculate-asset-capacity-usd ASSET_TYPE_HUSD (get deposited husd-dep)))
    ;; STX capacity
    (stx-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_STX })))
    (stx-cap (calculate-asset-capacity-usd ASSET_TYPE_STX (get deposited stx-dep)))
    ;; sBTC capacity
    (sbtc-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_SBTC })))
    (sbtc-cap (calculate-asset-capacity-usd ASSET_TYPE_SBTC (get deposited sbtc-dep)))
  )
    (ok (+ husd-cap (+ stx-cap sbtc-cap)))
  )
)

;; Get available capacity (total - committed)
(define-read-only (get-available-capacity (user principal))
  (let (
    (total-cap (unwrap-panic (get-total-capacity user)))
    (committed (get total-committed-usd (get-user-committed user)))
  )
    (ok (if (> total-cap committed) (- total-cap committed) u0))
  )
)

;; Check if user can commit additional USD amount
(define-read-only (can-commit (user principal) (additional-usd uint))
  (let (
    (available (unwrap-panic (get-available-capacity user)))
  )
    (ok (>= available additional-usd))
  )
)

;; Get pending yield for a user on a specific asset (view, no state change)
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

;; Calculate commitment USD for a circle (contribution * members, converted to USD)
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

;; Get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Check if a contract is authorized
(define-read-only (is-authorized (caller principal))
  (is-authorized-caller caller)
)

;; Get vault summary for a user
(define-read-only (get-vault-summary (user principal))
  (let (
    (husd-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_HUSD })))
    (stx-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_STX })))
    (sbtc-dep (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
      (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_SBTC })))
    (committed-data (get-user-committed user))
  )
    {
      husd-deposited: (get deposited husd-dep),
      stx-deposited: (get deposited stx-dep),
      sbtc-deposited: (get deposited sbtc-dep),
      total-committed-usd: (get total-committed-usd committed-data),
      total-capacity-usd: (unwrap-panic (get-total-capacity user)),
      available-capacity-usd: (unwrap-panic (get-available-capacity user))
    }
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- DEPOSITS
;; ============================================

;; Deposit hUSD stablecoin
(define-public (deposit-husd (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_HUSD) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)
    (asserts! (> (get price-usd asset) u0) ERR_ZERO_PRICE)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_HUSD)
    (update-user-asset-reward caller ASSET_TYPE_HUSD)

    ;; Update user deposit (effects before interactions)
    (let (
      (dep (get-or-create-user-deposit caller ASSET_TYPE_HUSD))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_HUSD }
        (merge dep { deposited: (+ (get deposited dep) amount) })
      )
    )

    ;; Update asset total (effects before interactions)
    (map-set supported-assets ASSET_TYPE_HUSD
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_HUSD))
        { total-deposited: (+ (get total-deposited asset) amount) })
    )

    ;; Transfer tokens (interactions last)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    (print { event: "vault-v2-deposit", user: caller, asset-type: ASSET_TYPE_HUSD, amount: amount })
    (ok true)
  )
)

;; Deposit native STX
(define-public (deposit-stx (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_FOUND))
  )
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)
    (asserts! (> (get price-usd asset) u0) ERR_ZERO_PRICE)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    ;; Update user deposit (effects before interactions)
    (let (
      (dep (get-or-create-user-deposit caller ASSET_TYPE_STX))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { deposited: (+ (get deposited dep) amount) })
      )
    )

    ;; Update asset total (effects before interactions)
    (map-set supported-assets ASSET_TYPE_STX
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX))
        { total-deposited: (+ (get total-deposited asset) amount) })
    )

    ;; Transfer STX (interactions last)
    (try! (stx-transfer? amount caller (as-contract tx-sender)))

    (print { event: "vault-v2-deposit", user: caller, asset-type: ASSET_TYPE_STX, amount: amount })
    (ok true)
  )
)

;; Deposit sBTC
(define-public (deposit-sbtc (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_SBTC) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)
    (asserts! (> (get price-usd asset) u0) ERR_ZERO_PRICE)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_SBTC)
    (update-user-asset-reward caller ASSET_TYPE_SBTC)

    ;; Update user deposit (effects before interactions)
    (let (
      (dep (get-or-create-user-deposit caller ASSET_TYPE_SBTC))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_SBTC }
        (merge dep { deposited: (+ (get deposited dep) amount) })
      )
    )

    ;; Update asset total (effects before interactions)
    (map-set supported-assets ASSET_TYPE_SBTC
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_SBTC))
        { total-deposited: (+ (get total-deposited asset) amount) })
    )

    ;; Transfer tokens (interactions last)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    (print { event: "vault-v2-deposit", user: caller, asset-type: ASSET_TYPE_SBTC, amount: amount })
    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- WITHDRAWALS
;; ============================================

;; Internal withdrawal check: ensures remaining capacity covers commitments
(define-private (check-withdrawal-allowed (user principal) (asset-type uint) (amount uint))
  (let (
    (dep (unwrap! (map-get? user-asset-deposits { user: user, asset-type: asset-type }) ERR_NO_DEPOSIT))
    (deposited (get deposited dep))
  )
    (asserts! (<= amount deposited) ERR_INSUFFICIENT_BALANCE)
    ;; Calculate what total capacity would be after withdrawal
    (let (
      (husd-dep-amt (if (is-eq asset-type ASSET_TYPE_HUSD)
        (- deposited amount)
        (get deposited (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
          (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_HUSD })))))
      (stx-dep-amt (if (is-eq asset-type ASSET_TYPE_STX)
        (- deposited amount)
        (get deposited (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
          (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_STX })))))
      (sbtc-dep-amt (if (is-eq asset-type ASSET_TYPE_SBTC)
        (- deposited amount)
        (get deposited (default-to { deposited: u0, reward-per-token-paid: u0, rewards-earned: u0 }
          (map-get? user-asset-deposits { user: user, asset-type: ASSET_TYPE_SBTC })))))
      (new-total-cap (+
        (calculate-asset-capacity-usd ASSET_TYPE_HUSD husd-dep-amt)
        (+ (calculate-asset-capacity-usd ASSET_TYPE_STX stx-dep-amt)
           (calculate-asset-capacity-usd ASSET_TYPE_SBTC sbtc-dep-amt))))
      (committed (get total-committed-usd (get-user-committed user)))
    )
      (asserts! (>= new-total-cap committed) ERR_INSUFFICIENT_CAPACITY)
      (ok true)
    )
  )
)

;; Withdraw hUSD
(define-public (withdraw-husd (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_HUSD) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_HUSD)
    (update-user-asset-reward caller ASSET_TYPE_HUSD)

    ;; Check withdrawal allowed
    (try! (check-withdrawal-allowed caller ASSET_TYPE_HUSD amount))

    ;; Update deposit BEFORE transfer (checks-effects-interactions)
    (let (
      (dep (unwrap-panic (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_HUSD })))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_HUSD }
        (merge dep { deposited: (- (get deposited dep) amount) })
      )
    )

    ;; Update asset total BEFORE transfer
    (map-set supported-assets ASSET_TYPE_HUSD
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_HUSD))
        { total-deposited: (- (get total-deposited asset) amount) })
    )

    ;; Transfer (interactions last)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

    (print { event: "vault-v2-withdraw", user: caller, asset-type: ASSET_TYPE_HUSD, amount: amount })
    (ok true)
  )
)

;; Withdraw STX
(define-public (withdraw-stx (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_FOUND))
  )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    ;; Check withdrawal allowed
    (try! (check-withdrawal-allowed caller ASSET_TYPE_STX amount))

    ;; Update deposit BEFORE transfer (checks-effects-interactions)
    (let (
      (dep (unwrap-panic (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX })))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { deposited: (- (get deposited dep) amount) })
      )
    )

    ;; Update asset total BEFORE transfer
    (map-set supported-assets ASSET_TYPE_STX
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX))
        { total-deposited: (- (get total-deposited asset) amount) })
    )

    ;; Transfer STX back (interactions last)
    (try! (as-contract (stx-transfer? amount tx-sender caller)))

    (print { event: "vault-v2-withdraw", user: caller, asset-type: ASSET_TYPE_STX, amount: amount })
    (ok true)
  )
)

;; Withdraw sBTC
(define-public (withdraw-sbtc (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_SBTC) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (var-get vault-paused)) ERR_VAULT_PAUSED)

    ;; Update yield
    (update-asset-reward ASSET_TYPE_SBTC)
    (update-user-asset-reward caller ASSET_TYPE_SBTC)

    ;; Check withdrawal allowed
    (try! (check-withdrawal-allowed caller ASSET_TYPE_SBTC amount))

    ;; Update deposit BEFORE transfer (checks-effects-interactions)
    (let (
      (dep (unwrap-panic (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_SBTC })))
    )
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_SBTC }
        (merge dep { deposited: (- (get deposited dep) amount) })
      )
    )

    ;; Update asset total BEFORE transfer
    (map-set supported-assets ASSET_TYPE_SBTC
      (merge (unwrap-panic (map-get? supported-assets ASSET_TYPE_SBTC))
        { total-deposited: (- (get total-deposited asset) amount) })
    )

    ;; Transfer (interactions last)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

    (print { event: "vault-v2-withdraw", user: caller, asset-type: ASSET_TYPE_SBTC, amount: amount })
    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- YIELD
;; ============================================

;; Claim yield for hUSD deposits
(define-public (claim-yield-husd (token <ft-trait>))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_HUSD) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)

    (update-asset-reward ASSET_TYPE_HUSD)
    (update-user-asset-reward caller ASSET_TYPE_HUSD)

    (let (
      (dep (unwrap! (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_HUSD }) ERR_NO_DEPOSIT))
      (reward (get rewards-earned dep))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)
      (try! (as-contract (contract-call? token transfer reward tx-sender caller none)))
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_HUSD }
        (merge dep { rewards-earned: u0 })
      )
      (print { event: "yield-claimed-v2", user: caller, asset-type: ASSET_TYPE_HUSD, amount: reward })
      (ok reward)
    )
  )
)

;; Claim yield for STX deposits (paid in STX)
(define-public (claim-yield-stx)
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_STX) ERR_ASSET_NOT_FOUND))
  )
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)

    (update-asset-reward ASSET_TYPE_STX)
    (update-user-asset-reward caller ASSET_TYPE_STX)

    (let (
      (dep (unwrap! (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }) ERR_NO_DEPOSIT))
      (reward (get rewards-earned dep))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)
      (try! (as-contract (stx-transfer? reward tx-sender caller)))
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_STX }
        (merge dep { rewards-earned: u0 })
      )
      (print { event: "yield-claimed-v2", user: caller, asset-type: ASSET_TYPE_STX, amount: reward })
      (ok reward)
    )
  )
)

;; Claim yield for sBTC deposits
(define-public (claim-yield-sbtc (token <ft-trait>))
  (let (
    (caller tx-sender)
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_SBTC) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (get is-active asset) ERR_ASSET_NOT_ACTIVE)

    (update-asset-reward ASSET_TYPE_SBTC)
    (update-user-asset-reward caller ASSET_TYPE_SBTC)

    (let (
      (dep (unwrap! (map-get? user-asset-deposits { user: caller, asset-type: ASSET_TYPE_SBTC }) ERR_NO_DEPOSIT))
      (reward (get rewards-earned dep))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)
      (try! (as-contract (contract-call? token transfer reward tx-sender caller none)))
      (map-set user-asset-deposits { user: caller, asset-type: ASSET_TYPE_SBTC }
        (merge dep { rewards-earned: u0 })
      )
      (print { event: "yield-claimed-v2", user: caller, asset-type: ASSET_TYPE_SBTC, amount: reward })
      (ok reward)
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- COLLATERAL (authorized contracts only)
;; ============================================

;; Lock collateral for a circle
(define-public (lock-collateral (user principal) (circle-id uint) (commitment-usd uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> commitment-usd u0) ERR_INVALID_AMOUNT)

    ;; Check total capacity covers new commitment
    (let (
      (total-cap (unwrap-panic (get-total-capacity user)))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (+ current-committed commitment-usd))
    )
      (asserts! (<= new-committed total-cap) ERR_INSUFFICIENT_CAPACITY)

      ;; Update aggregate committed
      (map-set user-committed user { total-committed-usd: new-committed })

      ;; Record per-circle commitment
      (map-set circle-commitments-v2 { user: user, circle-id: circle-id } {
        commitment-usd: commitment-usd
      })

      (print {
        event: "collateral-locked-v2",
        user: user,
        circle-id: circle-id,
        commitment-usd: commitment-usd,
        total-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Release collateral when circle completes
(define-public (release-collateral (user principal) (circle-id uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)

    (let (
      (commitment (unwrap! (map-get? circle-commitments-v2 { user: user, circle-id: circle-id })
                           ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (if (> current-committed commitment-usd)
                        (- current-committed commitment-usd)
                        u0))
    )
      (map-set user-committed user { total-committed-usd: new-committed })
      (map-delete circle-commitments-v2 { user: user, circle-id: circle-id })

      (print {
        event: "collateral-released-v2",
        user: user,
        circle-id: circle-id,
        released-usd: commitment-usd,
        remaining-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Slash collateral on default
;; Slashes from deposits in priority order: hUSD first, then STX, then sBTC
;; slash-usd is in 6-decimal USD terms
(define-public (slash-collateral (user principal) (circle-id uint) (slash-usd uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> slash-usd u0) ERR_INVALID_AMOUNT)

    ;; Release the circle commitment first
    (let (
      (commitment (unwrap! (map-get? circle-commitments-v2 { user: user, circle-id: circle-id })
                           ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
      (committed-data (get-user-committed user))
      (current-committed (get total-committed-usd committed-data))
      (new-committed (if (> current-committed commitment-usd)
                        (- current-committed commitment-usd)
                        u0))
    )
      ;; Update committed
      (map-set user-committed user { total-committed-usd: new-committed })
      (map-delete circle-commitments-v2 { user: user, circle-id: circle-id })

      ;; Slash from hUSD first
      (let (
        (remaining-slash slash-usd)
        (slash-result-husd (slash-from-asset user ASSET_TYPE_HUSD remaining-slash))
        (remaining-after-husd (get remaining slash-result-husd))
        ;; Then STX
        (slash-result-stx (slash-from-asset user ASSET_TYPE_STX remaining-after-husd))
        (remaining-after-stx (get remaining slash-result-stx))
        ;; Then sBTC
        (slash-result-sbtc (slash-from-asset user ASSET_TYPE_SBTC remaining-after-stx))
        (final-remaining (get remaining slash-result-sbtc))
        (total-slashed (if (> slash-usd final-remaining) (- slash-usd final-remaining) u0))
      )
        (print {
          event: "collateral-slashed-v2",
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

;; Private helper: slash USD amount from a specific asset
;; Returns { slashed: uint, remaining: uint } -- amounts in USD terms
(define-private (slash-from-asset (user principal) (asset-type uint) (slash-usd uint))
  (if (is-eq slash-usd u0)
    { slashed: u0, remaining: u0 }
    (match (map-get? user-asset-deposits { user: user, asset-type: asset-type })
      dep (match (map-get? supported-assets asset-type)
        asset (let (
          (deposited (get deposited dep))
          (price (get price-usd asset))
          (decimals (get decimals asset))
          ;; USD value of user's deposit
          (deposit-usd (/ (* deposited price) (pow u10 decimals)))
          ;; How much USD can we slash from this asset
          (slash-from-this (min-uint slash-usd deposit-usd))
          ;; Convert USD slash back to token micro-units
          (tokens-to-slash (if (> price u0)
            (/ (* slash-from-this (pow u10 decimals)) price)
            u0))
          (actual-tokens (min-uint tokens-to-slash deposited))
        )
          ;; Update yield before modifying
          (update-asset-reward asset-type)
          (update-user-asset-reward user asset-type)
          ;; Re-read deposit after yield update
          (let (
            (updated-dep (unwrap-panic (map-get? user-asset-deposits { user: user, asset-type: asset-type })))
            (new-deposited (if (> (get deposited updated-dep) actual-tokens)
              (- (get deposited updated-dep) actual-tokens) u0))
          )
            (map-set user-asset-deposits { user: user, asset-type: asset-type }
              (merge updated-dep { deposited: new-deposited })
            )
            ;; Update asset total
            (map-set supported-assets asset-type
              (merge asset {
                total-deposited: (if (> (get total-deposited asset) actual-tokens)
                  (- (get total-deposited asset) actual-tokens) u0)
              })
            )
            { slashed: slash-from-this, remaining: (if (> slash-usd slash-from-this) (- slash-usd slash-from-this) u0) }
          )
        )
        { slashed: u0, remaining: slash-usd } ;; asset config not found
      )
      { slashed: u0, remaining: slash-usd } ;; no deposit for this asset
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Configure a supported asset
(define-public (configure-asset
  (asset-type uint)
  (token-principal (optional principal))
  (ltv-ratio uint)
  (decimals uint)
)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= asset-type u2) ERR_INVALID_PARAMS)
    (asserts! (>= ltv-ratio u1000) ERR_INVALID_PARAMS) ;; min 10% LTV
    (asserts! (<= ltv-ratio u8000) ERR_INVALID_PARAMS) ;; max 80% LTV
    (asserts! (<= decimals u18) ERR_INVALID_PARAMS) ;; max 18 decimals

    (map-set supported-assets asset-type {
      token-principal: token-principal,
      ltv-ratio: ltv-ratio,
      price-usd: (match (map-get? supported-assets asset-type)
        existing (get price-usd existing)
        u0),
      decimals: decimals,
      price-last-updated: stacks-block-height,
      is-active: true,
      ;; Preserve existing yield state or initialize
      reward-per-token-stored: (match (map-get? supported-assets asset-type)
        existing (get reward-per-token-stored existing)
        u0),
      last-update-block: stacks-block-height,
      reward-rate: (match (map-get? supported-assets asset-type)
        existing (get reward-rate existing)
        u0),
      reward-end-block: (match (map-get? supported-assets asset-type)
        existing (get reward-end-block existing)
        u0),
      total-deposited: (match (map-get? supported-assets asset-type)
        existing (get total-deposited existing)
        u0)
    })

    (print { event: "asset-configured", asset-type: asset-type, ltv-ratio: ltv-ratio, decimals: decimals })
    (ok true)
  )
)

;; Set asset price (oracle update)
(define-public (set-asset-price (asset-type uint) (price-usd uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> price-usd u0) ERR_ZERO_PRICE)

    (let (
      (asset (unwrap! (map-get? supported-assets asset-type) ERR_ASSET_NOT_FOUND))
    )
      (map-set supported-assets asset-type
        (merge asset {
          price-usd: price-usd,
          price-last-updated: stacks-block-height
        })
      )
      (print { event: "price-updated-v2", asset-type: asset-type, price-usd: price-usd })
      (ok true)
    )
  )
)

;; Fund yield pool for a specific asset
(define-public (fund-yield-husd (token <ft-trait>) (amount uint) (duration-blocks uint))
  (let (
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_HUSD) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= duration-blocks MIN_YIELD_DURATION) ERR_INVALID_PARAMS)

    (update-asset-reward ASSET_TYPE_HUSD)
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

    (let (
      (current-block stacks-block-height)
      (updated-asset (unwrap-panic (map-get? supported-assets ASSET_TYPE_HUSD)))
      (remaining (if (> (get reward-end-block updated-asset) current-block)
        (* (get reward-rate updated-asset) (- (get reward-end-block updated-asset) current-block))
        u0))
      (total-reward (+ amount remaining))
      (new-rate (/ total-reward duration-blocks))
    )
      (map-set supported-assets ASSET_TYPE_HUSD
        (merge updated-asset {
          reward-rate: new-rate,
          reward-end-block: (+ current-block duration-blocks),
          last-update-block: current-block
        })
      )
      (print { event: "yield-funded-v2", asset-type: ASSET_TYPE_HUSD, amount: amount, rate: new-rate })
      (ok true)
    )
  )
)

;; Fund STX yield pool (admin sends STX)
(define-public (fund-yield-stx (amount uint) (duration-blocks uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= duration-blocks MIN_YIELD_DURATION) ERR_INVALID_PARAMS)

    (update-asset-reward ASSET_TYPE_STX)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (let (
      (current-block stacks-block-height)
      (asset (unwrap-panic (map-get? supported-assets ASSET_TYPE_STX)))
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
      (print { event: "yield-funded-v2", asset-type: ASSET_TYPE_STX, amount: amount, rate: new-rate })
      (ok true)
    )
  )
)

;; Fund sBTC yield pool
(define-public (fund-yield-sbtc (token <ft-trait>) (amount uint) (duration-blocks uint))
  (let (
    (asset (unwrap! (map-get? supported-assets ASSET_TYPE_SBTC) ERR_ASSET_NOT_FOUND))
    (expected-token (unwrap! (get token-principal asset) ERR_TOKEN_NOT_SUPPORTED))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= duration-blocks MIN_YIELD_DURATION) ERR_INVALID_PARAMS)

    (update-asset-reward ASSET_TYPE_SBTC)
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

    (let (
      (current-block stacks-block-height)
      (updated-asset (unwrap-panic (map-get? supported-assets ASSET_TYPE_SBTC)))
      (remaining (if (> (get reward-end-block updated-asset) current-block)
        (* (get reward-rate updated-asset) (- (get reward-end-block updated-asset) current-block))
        u0))
      (total-reward (+ amount remaining))
      (new-rate (/ total-reward duration-blocks))
    )
      (map-set supported-assets ASSET_TYPE_SBTC
        (merge updated-asset {
          reward-rate: new-rate,
          reward-end-block: (+ current-block duration-blocks),
          last-update-block: current-block
        })
      )
      (print { event: "yield-funded-v2", asset-type: ASSET_TYPE_SBTC, amount: amount, rate: new-rate })
      (ok true)
    )
  )
)

;; Authorize a contract to lock/release/slash collateral
(define-public (authorize-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (current (var-get authorized-contracts))
    )
      (asserts! (is-none (index-of? current contract)) ERR_ALREADY_AUTHORIZED)
      (var-set authorized-contracts
        (unwrap! (as-max-len? (append current contract) u10) ERR_NOT_AUTHORIZED))
      (print { event: "contract-authorized-v2", contract: contract })
      (ok true)
    )
  )
)

;; Emergency pause -- blocks deposits, withdrawals, and yield claims
(define-public (pause-vault)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set vault-paused true)
    (print { event: "vault-paused" })
    (ok true)
  )
)

;; Unpause vault
(define-public (unpause-vault)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set vault-paused false)
    (print { event: "vault-unpaused" })
    (ok true)
  )
)

;; Check if vault is paused
(define-read-only (is-vault-paused)
  (var-get vault-paused)
)

;; Transfer admin role
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-transferred-v2", new-admin: new-admin })
    (ok true)
  )
)
