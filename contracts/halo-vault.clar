;; halo-vault.clar
;; Collateral vault with admin price oracle and yield generation
;;
;; Features:
;; - Stablecoin deposits as collateral for circle participation
;; - 80% LTV ratio (configurable 50-90% in basis points)
;; - Admin-set price oracle for cross-asset LTV calculations
;; - Synthetix-style yield accumulator for depositors
;; - Authorized contracts (halo-circle) can lock/release/slash collateral
;;
;; Assumptions:
;; - Vault token is a stablecoin with 6 decimal precision (1:1 USD)
;; - Committed amounts are in USD with 6 decimal precision
;; - Price oracle uses 6 decimal USD precision ($1.00 = u1000000)
;;
;; Dependencies: halo-sip010-trait

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u400))
(define-constant ERR_INVALID_AMOUNT (err u401))
(define-constant ERR_INSUFFICIENT_BALANCE (err u402))
(define-constant ERR_INSUFFICIENT_CAPACITY (err u403))
(define-constant ERR_NO_DEPOSIT (err u404))
(define-constant ERR_TRANSFER_FAILED (err u405))
(define-constant ERR_INVALID_PARAMS (err u406))
(define-constant ERR_TOKEN_MISMATCH (err u407))
(define-constant ERR_COMMITMENT_NOT_FOUND (err u408))
(define-constant ERR_ZERO_PRICE (err u409))
(define-constant ERR_ALREADY_AUTHORIZED (err u410))
(define-constant ERR_VAULT_TOKEN_NOT_SET (err u411))
(define-constant ERR_PRICE_NOT_SET (err u412))

;; LTV bounds (basis points, 10000 = 100%)
(define-constant MAX_LTV_RATIO u9000)   ;; 90%
(define-constant MIN_LTV_RATIO u5000)   ;; 50%
(define-constant LTV_DENOMINATOR u10000)

;; Yield precision (10^12)
(define-constant PRECISION u1000000000000)

;; Price precision (6 decimals: $1.00 = u1000000)
(define-constant PRICE_PRECISION u1000000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var authorized-contracts (list 10 principal) (list))
(define-data-var ltv-ratio uint u8000) ;; 80% default
(define-data-var vault-token-principal (optional principal) none)

;; Yield accumulator (Synthetix pattern)
(define-data-var reward-per-token-stored uint u0)
(define-data-var last-update-block uint u0)
(define-data-var reward-rate uint u0)       ;; reward tokens per block
(define-data-var reward-end-block uint u0)  ;; block when current reward period ends
(define-data-var total-deposited uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

;; Token prices: token-principal -> price data
;; For STX, use CONTRACT_OWNER principal as sentinel
(define-map token-prices principal {
  price-usd: uint,        ;; USD price, 6 decimal precision ($1.00 = u1000000)
  decimals: uint,          ;; token's native decimal places
  last-updated: uint
})

;; User vault deposits
(define-map vault-deposits principal {
  deposited: uint,                 ;; total deposited (stablecoin micro-units)
  committed: uint,                 ;; total locked for circles (USD, 6 decimals)
  reward-per-token-paid: uint,     ;; snapshot for yield calculation
  rewards-earned: uint             ;; accumulated unclaimed rewards
})

;; Per-circle collateral commitments: (user, circle-id) -> USD commitment
(define-map circle-commitments { user: principal, circle-id: uint } {
  commitment-usd: uint
})

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Min of two uints
(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

;; Check if caller is authorized
(define-private (is-authorized-caller (caller principal))
  (or (is-eq caller (var-get admin))
      (is-some (index-of? (var-get authorized-contracts) caller)))
)

;; Get or create default deposit data
(define-private (get-or-create-deposit (user principal))
  (default-to {
    deposited: u0,
    committed: u0,
    reward-per-token-paid: (var-get reward-per-token-stored),
    rewards-earned: u0
  } (map-get? vault-deposits user))
)

;; Update global yield accumulator (call before any deposit/withdraw/claim)
(define-private (update-reward)
  (let (
    (current-block stacks-block-height)
    (applicable-block (min-uint current-block (var-get reward-end-block)))
    (total (var-get total-deposited))
    (stored (var-get reward-per-token-stored))
    (last-block (var-get last-update-block))
  )
    (if (and (> total u0) (> applicable-block last-block))
      (let (
        (elapsed (- applicable-block last-block))
        (new-rewards (* elapsed (var-get reward-rate)))
        (additional (/ (* new-rewards PRECISION) total))
      )
        (var-set reward-per-token-stored (+ stored additional))
        (var-set last-update-block applicable-block)
      )
      (var-set last-update-block applicable-block)
    )
  )
)

;; Update a user's reward snapshot (call after update-reward)
;; Only updates if user has an existing deposit (does NOT create new entries)
(define-private (update-user-reward (user principal))
  (match (map-get? vault-deposits user)
    deposit-data (let (
      (deposited (get deposited deposit-data))
      (paid (get reward-per-token-paid deposit-data))
      (earned (get rewards-earned deposit-data))
      (current-rpt (var-get reward-per-token-stored))
      (new-earned (+ earned (/ (* deposited (- current-rpt paid)) PRECISION)))
    )
      (map-set vault-deposits user
        (merge deposit-data {
          rewards-earned: new-earned,
          reward-per-token-paid: current-rpt
        })
      )
    )
    true ;; No deposit exists, nothing to update
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get user's vault deposit data
(define-read-only (get-vault-deposit (user principal))
  (map-get? vault-deposits user)
)

;; Get user's available borrowing capacity (deposited * LTV - committed)
(define-read-only (get-available-capacity (user principal))
  (match (map-get? vault-deposits user)
    deposit-data (let (
      (max-capacity (/ (* (get deposited deposit-data) (var-get ltv-ratio)) LTV_DENOMINATOR))
      (committed (get committed deposit-data))
    )
      (if (> max-capacity committed)
        (ok (- max-capacity committed))
        (ok u0)
      )
    )
    (ok u0)
  )
)

;; Check if user can commit additional USD amount
(define-read-only (can-commit (user principal) (additional-usd uint))
  (let (
    (capacity (unwrap-panic (get-available-capacity user)))
  )
    (ok (>= capacity additional-usd))
  )
)

;; Get token price from oracle
(define-read-only (get-token-price (token-principal principal))
  (map-get? token-prices token-principal)
)

;; Get a user's circle commitment
(define-read-only (get-circle-commitment (user principal) (circle-id uint))
  (map-get? circle-commitments { user: user, circle-id: circle-id })
)

;; Get vault configuration
(define-read-only (get-vault-config)
  {
    ltv-ratio: (var-get ltv-ratio),
    vault-token: (var-get vault-token-principal),
    total-deposited: (var-get total-deposited),
    reward-rate: (var-get reward-rate),
    reward-end-block: (var-get reward-end-block),
    reward-per-token-stored: (var-get reward-per-token-stored)
  }
)

;; Get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Check if a contract is authorized
(define-read-only (is-authorized (caller principal))
  (is-authorized-caller caller)
)

;; Get LTV ratio
(define-read-only (get-ltv-ratio)
  (var-get ltv-ratio)
)

;; Calculate circle commitment in USD
;; contribution: amount in token micro-units
;; total-members: number of members in the circle
;; token-principal: the circle's token (for price lookup)
(define-read-only (calculate-commitment-usd
  (contribution uint)
  (total-members uint)
  (token-principal principal)
)
  (match (map-get? token-prices token-principal)
    price-data (let (
      (price-usd (get price-usd price-data))
      (token-decimals (get decimals price-data))
      (total-obligation (* contribution total-members))
      ;; Convert to USD: (amount * price) / 10^decimals
      (commitment-usd (/ (* total-obligation price-usd) (pow u10 token-decimals)))
    )
      (ok commitment-usd)
    )
    ERR_PRICE_NOT_SET
  )
)

;; Get pending yield for user (view function, doesn't modify state)
(define-read-only (get-pending-yield (user principal))
  (match (map-get? vault-deposits user)
    deposit-data (let (
      (deposited (get deposited deposit-data))
      (paid (get reward-per-token-paid deposit-data))
      (earned (get rewards-earned deposit-data))
      (stored (var-get reward-per-token-stored))
      (total (var-get total-deposited))
      (current-block stacks-block-height)
      (applicable-block (min-uint current-block (var-get reward-end-block)))
      (last-block (var-get last-update-block))
      ;; Simulate current reward-per-token without modifying state
      (current-rpt (if (and (> total u0) (> applicable-block last-block))
        (+ stored (/ (* (* (- applicable-block last-block) (var-get reward-rate)) PRECISION) total))
        stored
      ))
    )
      (+ earned (/ (* deposited (- current-rpt paid)) PRECISION))
    )
    u0
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Deposit stablecoins into the vault as collateral
(define-public (deposit (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get vault-token-principal) ERR_VAULT_TOKEN_NOT_SET))
  )
    ;; Validate
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Update yield accumulator before state change
    (update-reward)
    (update-user-reward caller)

    ;; Transfer tokens from user to vault contract
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    ;; Update deposit (re-read after yield update)
    (let (
      (deposit-data (get-or-create-deposit caller))
    )
      (map-set vault-deposits caller
        (merge deposit-data {
          deposited: (+ (get deposited deposit-data) amount)
        })
      )
    )

    ;; Update global total
    (var-set total-deposited (+ (var-get total-deposited) amount))

    (print {
      event: "vault-deposit",
      user: caller,
      amount: amount,
      total-deposited: (var-get total-deposited)
    })

    (ok true)
  )
)

;; Withdraw stablecoins (only uncommitted portion, respects LTV)
(define-public (withdraw (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get vault-token-principal) ERR_VAULT_TOKEN_NOT_SET))
  )
    ;; Validate token
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Update yield accumulator before state change
    (update-reward)
    (update-user-reward caller)

    ;; Read updated deposit data and check withdrawable amount
    (let (
      (deposit-data (unwrap! (map-get? vault-deposits caller) ERR_NO_DEPOSIT))
      (deposited (get deposited deposit-data))
      (committed (get committed deposit-data))
      ;; Minimum deposit to maintain LTV for committed amount
      ;; min-deposit = committed * 10000 / ltv-ratio (inverse of LTV)
      (min-deposit (if (> committed u0)
                      (/ (* committed LTV_DENOMINATOR) (var-get ltv-ratio))
                      u0))
      (withdrawable (if (> deposited min-deposit) (- deposited min-deposit) u0))
    )
      (asserts! (<= amount withdrawable) ERR_INSUFFICIENT_BALANCE)

      ;; Transfer tokens from vault to user
      (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

      ;; Update deposit
      (map-set vault-deposits caller
        (merge deposit-data {
          deposited: (- deposited amount)
        })
      )

      ;; Update global total
      (var-set total-deposited (- (var-get total-deposited) amount))

      (print {
        event: "vault-withdraw",
        user: caller,
        amount: amount
      })

      (ok true)
    )
  )
)

;; Claim accrued yield rewards
(define-public (claim-yield (token <ft-trait>))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get vault-token-principal) ERR_VAULT_TOKEN_NOT_SET))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)

    ;; Update yield accumulator
    (update-reward)
    (update-user-reward caller)

    ;; Read updated deposit data
    (let (
      (deposit-data (unwrap! (map-get? vault-deposits caller) ERR_NO_DEPOSIT))
      (reward (get rewards-earned deposit-data))
    )
      (asserts! (> reward u0) ERR_INVALID_AMOUNT)

      ;; Transfer reward tokens from vault to user
      (try! (as-contract (contract-call? token transfer reward tx-sender caller none)))

      ;; Reset earned rewards
      (map-set vault-deposits caller
        (merge deposit-data { rewards-earned: u0 })
      )

      (print {
        event: "yield-claimed",
        user: caller,
        amount: reward
      })

      (ok reward)
    )
  )
)

;; Lock collateral for a circle (called by authorized contracts only)
(define-public (lock-collateral (user principal) (circle-id uint) (commitment-usd uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> commitment-usd u0) ERR_INVALID_AMOUNT)

    (let (
      (deposit-data (unwrap! (map-get? vault-deposits user) ERR_NO_DEPOSIT))
      (max-capacity (/ (* (get deposited deposit-data) (var-get ltv-ratio)) LTV_DENOMINATOR))
      (new-committed (+ (get committed deposit-data) commitment-usd))
    )
      ;; Check user has sufficient capacity
      (asserts! (<= new-committed max-capacity) ERR_INSUFFICIENT_CAPACITY)

      ;; Lock the commitment
      (map-set vault-deposits user
        (merge deposit-data { committed: new-committed })
      )

      ;; Record per-circle commitment
      (map-set circle-commitments { user: user, circle-id: circle-id } {
        commitment-usd: commitment-usd
      })

      (print {
        event: "collateral-locked",
        user: user,
        circle-id: circle-id,
        commitment-usd: commitment-usd,
        total-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Release collateral when circle completes (called by authorized contracts)
(define-public (release-collateral (user principal) (circle-id uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)

    (let (
      (commitment (unwrap! (map-get? circle-commitments { user: user, circle-id: circle-id })
                           ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
      (deposit-data (unwrap! (map-get? vault-deposits user) ERR_NO_DEPOSIT))
      (current-committed (get committed deposit-data))
      (new-committed (if (> current-committed commitment-usd)
                        (- current-committed commitment-usd)
                        u0))
    )
      ;; Release the commitment
      (map-set vault-deposits user
        (merge deposit-data { committed: new-committed })
      )

      ;; Remove per-circle record
      (map-delete circle-commitments { user: user, circle-id: circle-id })

      (print {
        event: "collateral-released",
        user: user,
        circle-id: circle-id,
        released-usd: commitment-usd,
        remaining-committed: new-committed
      })

      (ok true)
    )
  )
)

;; Slash collateral on default (called by authorized contracts)
(define-public (slash-collateral (user principal) (circle-id uint) (slash-amount uint))
  (let (
    (caller contract-caller)
  )
    (asserts! (is-authorized-caller caller) ERR_NOT_AUTHORIZED)
    (asserts! (> slash-amount u0) ERR_INVALID_AMOUNT)

    (let (
      (commitment (unwrap! (map-get? circle-commitments { user: user, circle-id: circle-id })
                           ERR_COMMITMENT_NOT_FOUND))
      (commitment-usd (get commitment-usd commitment))
    )
      ;; Update yield before modifying deposit
      (update-reward)
      (update-user-reward user)

      ;; Re-read after yield update
      (let (
        (deposit-data (unwrap! (map-get? vault-deposits user) ERR_NO_DEPOSIT))
        (actual-slash (min-uint slash-amount (get deposited deposit-data)))
        (new-deposited (- (get deposited deposit-data) actual-slash))
        (current-committed (get committed deposit-data))
        (new-committed (if (> current-committed commitment-usd)
                          (- current-committed commitment-usd)
                          u0))
      )
        ;; Slash deposit and release commitment
        (map-set vault-deposits user
          (merge deposit-data {
            deposited: new-deposited,
            committed: new-committed
          })
        )

        ;; Update global total
        (var-set total-deposited (- (var-get total-deposited) actual-slash))

        ;; Remove per-circle record
        (map-delete circle-commitments { user: user, circle-id: circle-id })

        (print {
          event: "collateral-slashed",
          user: user,
          circle-id: circle-id,
          slash-amount: actual-slash,
          remaining-deposit: new-deposited
        })

        (ok actual-slash)
      )
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Set the vault token (stablecoin accepted for deposits)
(define-public (set-vault-token (token-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set vault-token-principal (some token-principal))
    (print { event: "vault-token-set", token: token-principal })
    (ok true)
  )
)

;; Set token price in the oracle
(define-public (set-token-price (token-principal principal) (price-usd uint) (decimals uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> price-usd u0) ERR_ZERO_PRICE)
    (map-set token-prices token-principal {
      price-usd: price-usd,
      decimals: decimals,
      last-updated: stacks-block-height
    })
    (print {
      event: "price-updated",
      token: token-principal,
      price-usd: price-usd,
      decimals: decimals
    })
    (ok true)
  )
)

;; Fund yield pool (admin deposits reward tokens, distributed over duration)
(define-public (fund-yield-pool (token <ft-trait>) (amount uint) (duration-blocks uint))
  (let (
    (expected-token (unwrap! (var-get vault-token-principal) ERR_VAULT_TOKEN_NOT_SET))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> duration-blocks u0) ERR_INVALID_PARAMS)

    ;; Update accumulated rewards before changing rate
    (update-reward)

    ;; Transfer reward tokens to vault
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

    ;; Calculate new rate, rolling over any remaining rewards
    (let (
      (current-block stacks-block-height)
      (remaining (if (> (var-get reward-end-block) current-block)
                    (* (var-get reward-rate) (- (var-get reward-end-block) current-block))
                    u0))
      (total-reward (+ amount remaining))
      (new-rate (/ total-reward duration-blocks))
    )
      (var-set reward-rate new-rate)
      (var-set reward-end-block (+ current-block duration-blocks))
      (var-set last-update-block current-block)

      (print {
        event: "yield-pool-funded",
        amount: amount,
        duration-blocks: duration-blocks,
        new-rate: new-rate,
        end-block: (+ current-block duration-blocks)
      })

      (ok true)
    )
  )
)

;; Set LTV ratio (basis points, 5000-9000)
(define-public (set-ltv-ratio (new-ratio uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (>= new-ratio MIN_LTV_RATIO) ERR_INVALID_PARAMS)
    (asserts! (<= new-ratio MAX_LTV_RATIO) ERR_INVALID_PARAMS)
    (var-set ltv-ratio new-ratio)
    (print { event: "ltv-updated", new-ratio: new-ratio })
    (ok true)
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
      (print { event: "contract-authorized", contract: contract })
      (ok true)
    )
  )
)

;; Transfer admin role
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-transferred", new-admin: new-admin })
    (ok true)
  )
)
