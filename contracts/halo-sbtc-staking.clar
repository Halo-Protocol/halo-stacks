;; halo-sbtc-staking.clar
;; sBTC staking for rewards and credit score boosts
;;
;; Features:
;; - Stake sBTC (or mock-sbtc in testing) to earn rewards
;; - Minimum lock period (default ~1 month = 4320 blocks)
;; - Synthetix-style reward accumulator
;; - Cross-contract: records staking activity in halo-credit for score boost
;; - Admin-funded reward pool
;;
;; Dependencies: halo-sip010-trait, halo-identity, halo-credit

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u600))
(define-constant ERR_INVALID_AMOUNT (err u601))
(define-constant ERR_NO_STAKE (err u602))
(define-constant ERR_LOCK_NOT_EXPIRED (err u603))
(define-constant ERR_INSUFFICIENT_STAKE (err u604))
(define-constant ERR_TOKEN_MISMATCH (err u605))
(define-constant ERR_STAKING_TOKEN_NOT_SET (err u606))
(define-constant ERR_INVALID_PARAMS (err u607))
(define-constant ERR_NOT_VERIFIED (err u608))
(define-constant ERR_NO_REWARDS (err u609))

;; Default minimum lock: ~1 month (4320 blocks)
(define-constant DEFAULT_MIN_LOCK u4320)

;; Yield precision (10^12)
(define-constant PRECISION u1000000000000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var staking-token-principal (optional principal) none)
(define-data-var min-lock-blocks uint DEFAULT_MIN_LOCK)

;; Reward accumulator (Synthetix pattern)
(define-data-var reward-per-token-stored uint u0)
(define-data-var last-update-block uint u0)
(define-data-var reward-rate uint u0)       ;; reward tokens per block
(define-data-var reward-end-block uint u0)  ;; block when current reward period ends
(define-data-var total-staked uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

;; User staking data
(define-map staker-data principal {
  staked: uint,                    ;; total staked amount
  staked-at: uint,                 ;; block when first staked (for credit scoring)
  last-stake-block: uint,          ;; block of most recent stake action
  reward-per-token-paid: uint,     ;; snapshot for yield calculation
  rewards-earned: uint             ;; accumulated unclaimed rewards
})

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Min of two uints
(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

;; Update global reward accumulator
(define-private (update-reward)
  (let (
    (current-block stacks-block-height)
    (applicable-block (min-uint current-block (var-get reward-end-block)))
    (total (var-get total-staked))
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

;; Update user's reward snapshot (only if user has existing stake)
(define-private (update-user-reward (user principal))
  (match (map-get? staker-data user)
    stake-info (let (
      (staked (get staked stake-info))
      (paid (get reward-per-token-paid stake-info))
      (earned (get rewards-earned stake-info))
      (current-rpt (var-get reward-per-token-stored))
      (new-earned (+ earned (/ (* staked (- current-rpt paid)) PRECISION)))
    )
      (map-set staker-data user
        (merge stake-info {
          rewards-earned: new-earned,
          reward-per-token-paid: current-rpt
        })
      )
    )
    true ;; No stake exists, nothing to update
  )
)

;; Check if user has verified identity
(define-private (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get user's staking data
(define-read-only (get-staker-data (user principal))
  (map-get? staker-data user)
)

;; Get total staked across all users
(define-read-only (get-total-staked)
  (var-get total-staked)
)

;; Get staking configuration
(define-read-only (get-staking-config)
  {
    staking-token: (var-get staking-token-principal),
    min-lock-blocks: (var-get min-lock-blocks),
    total-staked: (var-get total-staked),
    reward-rate: (var-get reward-rate),
    reward-end-block: (var-get reward-end-block),
    reward-per-token-stored: (var-get reward-per-token-stored)
  }
)

;; Get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Check if user's lock period has expired
(define-read-only (is-lock-expired (user principal))
  (match (map-get? staker-data user)
    stake-info (>= stacks-block-height
                   (+ (get last-stake-block stake-info) (var-get min-lock-blocks)))
    true ;; No stake = not locked
  )
)

;; Get staking duration in blocks
(define-read-only (get-staking-duration (user principal))
  (match (map-get? staker-data user)
    stake-info (if (> stacks-block-height (get staked-at stake-info))
                  (- stacks-block-height (get staked-at stake-info))
                  u0)
    u0
  )
)

;; Get pending rewards for user (view function, no state change)
(define-read-only (get-pending-rewards (user principal))
  (match (map-get? staker-data user)
    stake-info (let (
      (staked (get staked stake-info))
      (paid (get reward-per-token-paid stake-info))
      (earned (get rewards-earned stake-info))
      (stored (var-get reward-per-token-stored))
      (total (var-get total-staked))
      (current-block stacks-block-height)
      (applicable-block (min-uint current-block (var-get reward-end-block)))
      (last-block (var-get last-update-block))
      (current-rpt (if (and (> total u0) (> applicable-block last-block))
        (+ stored (/ (* (* (- applicable-block last-block) (var-get reward-rate)) PRECISION) total))
        stored
      ))
    )
      (+ earned (/ (* staked (- current-rpt paid)) PRECISION))
    )
    u0
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Stake sBTC tokens
(define-public (stake-sbtc (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get staking-token-principal) ERR_STAKING_TOKEN_NOT_SET))
  )
    ;; Validate
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)

    ;; Update reward accumulator
    (update-reward)
    (update-user-reward caller)

    ;; Transfer tokens from user to staking contract
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    ;; Update staker data
    (let (
      (existing (map-get? staker-data caller))
      (current-staked (match existing info (get staked info) u0))
      (staked-at-block (match existing info (get staked-at info) stacks-block-height))
      (current-earned (match existing info (get rewards-earned info) u0))
    )
      (map-set staker-data caller {
        staked: (+ current-staked amount),
        staked-at: staked-at-block,
        last-stake-block: stacks-block-height,
        reward-per-token-paid: (var-get reward-per-token-stored),
        rewards-earned: current-earned
      })
    )

    ;; Update global total
    (var-set total-staked (+ (var-get total-staked) amount))

    ;; Record staking activity in credit contract
    (match (contract-call? .halo-identity get-id-by-wallet caller)
      unique-id (match (contract-call? .halo-credit record-staking-activity
                         unique-id
                         (+ (match (map-get? staker-data caller)
                              info (get staked info)
                              u0)
                            u0) ;; use 0 as fallback, but staker-data was just set
                         (get-staking-duration caller))
        success true
        error true ;; Non-critical: don't fail stake if credit recording fails
      )
      true ;; Non-critical
    )

    (print {
      event: "sbtc-staked",
      user: caller,
      amount: amount,
      total-staked: (var-get total-staked)
    })

    (ok true)
  )
)

;; Unstake sBTC tokens (after lock period)
(define-public (unstake-sbtc (token <ft-trait>) (amount uint))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get staking-token-principal) ERR_STAKING_TOKEN_NOT_SET))
    (stake-info (unwrap! (map-get? staker-data caller) ERR_NO_STAKE))
  )
    ;; Validate
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (<= amount (get staked stake-info)) ERR_INSUFFICIENT_STAKE)

    ;; Check lock period expired
    (asserts! (>= stacks-block-height
                  (+ (get last-stake-block stake-info) (var-get min-lock-blocks)))
              ERR_LOCK_NOT_EXPIRED)

    ;; Update reward accumulator
    (update-reward)
    (update-user-reward caller)

    ;; Re-read after reward update
    (let (
      (updated-info (unwrap! (map-get? staker-data caller) ERR_NO_STAKE))
      (new-staked (- (get staked updated-info) amount))
    )
      ;; Transfer tokens back to user
      (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

      ;; Update staker data
      (map-set staker-data caller
        (merge updated-info {
          staked: new-staked
        })
      )

      ;; Update global total
      (var-set total-staked (- (var-get total-staked) amount))

      (print {
        event: "sbtc-unstaked",
        user: caller,
        amount: amount,
        remaining-staked: new-staked
      })

      (ok true)
    )
  )
)

;; Claim staking rewards
(define-public (claim-rewards (token <ft-trait>))
  (let (
    (caller tx-sender)
    (expected-token (unwrap! (var-get staking-token-principal) ERR_STAKING_TOKEN_NOT_SET))
  )
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)

    ;; Update reward accumulator
    (update-reward)
    (update-user-reward caller)

    ;; Read updated data
    (let (
      (stake-info (unwrap! (map-get? staker-data caller) ERR_NO_STAKE))
      (reward (get rewards-earned stake-info))
    )
      (asserts! (> reward u0) ERR_NO_REWARDS)

      ;; Transfer reward tokens
      (try! (as-contract (contract-call? token transfer reward tx-sender caller none)))

      ;; Reset earned rewards
      (map-set staker-data caller
        (merge stake-info { rewards-earned: u0 })
      )

      (print {
        event: "staking-rewards-claimed",
        user: caller,
        amount: reward
      })

      (ok reward)
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Set the staking token (sBTC or mock-sbtc)
(define-public (set-staking-token (token-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set staking-token-principal (some token-principal))
    (print { event: "staking-token-set", token: token-principal })
    (ok true)
  )
)

;; Fund reward pool (admin deposits reward tokens)
(define-public (fund-reward-pool (token <ft-trait>) (amount uint) (duration-blocks uint))
  (let (
    (expected-token (unwrap! (var-get staking-token-principal) ERR_STAKING_TOKEN_NOT_SET))
  )
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (contract-of token) expected-token) ERR_TOKEN_MISMATCH)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> duration-blocks u0) ERR_INVALID_PARAMS)

    ;; Update accumulated rewards before changing rate
    (update-reward)

    ;; Transfer reward tokens to contract
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))

    ;; Calculate new rate, rolling over remaining rewards
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
        event: "reward-pool-funded",
        amount: amount,
        duration-blocks: duration-blocks,
        new-rate: new-rate
      })

      (ok true)
    )
  )
)

;; Set minimum lock period
(define-public (set-min-lock-blocks (new-min uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (> new-min u0) ERR_INVALID_PARAMS)
    (var-set min-lock-blocks new-min)
    (print { event: "min-lock-updated", new-min: new-min })
    (ok true)
  )
)

;; Transfer admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-transferred", new-admin: new-admin })
    (ok true)
  )
)
