;; halo-credit.clar
;; On-chain credit scoring and payment history tracking
;;
;; Score Range: 300 (base) to 850 (max)
;; Components:
;;   - Payment History (35%) - max 192 pts
;;   - Circle Completion (20%) - max 110 pts
;;   - Volume (15%) - max 82 pts
;;   - Tenure (10%) - max 55 pts
;;   - Consistency (10%) - max 55 pts
;;   - Staking Activity (10%) - max 55 pts
;;
;; Only authorized contracts (e.g., halo-circle, halo-sbtc-staking) can record

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_NOT_FOUND (err u301))
(define-constant ERR_INVALID_SCORE (err u302))
(define-constant ERR_HISTORY_FULL (err u303))

;; Score bounds
(define-constant MIN_SCORE u300)
(define-constant MAX_SCORE u850)
(define-constant INITIAL_SCORE u300)
(define-constant MAX_EARNED u550)

;; Score component weights (percentages, must sum to 100)
(define-constant PAYMENT_HISTORY_WEIGHT u35)
(define-constant CIRCLE_COMPLETION_WEIGHT u20)
(define-constant VOLUME_WEIGHT u15)
(define-constant TENURE_WEIGHT u10)
(define-constant CONSISTENCY_WEIGHT u10)
(define-constant STAKING_WEIGHT u10)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var authorized-contracts (list 10 principal) (list))

;; ============================================
;; DATA MAPS
;; ============================================

;; Unique ID -> Credit Score Data
(define-map credit-scores (buff 32) {
  score: uint,
  total-payments: uint,
  on-time-payments: uint,
  late-payments: uint,
  circles-completed: uint,
  circles-defaulted: uint,
  total-volume: uint,
  first-activity: uint,
  last-updated: uint,
  sbtc-staked: uint,
  staking-duration-blocks: uint
})

;; Unique ID -> Payment History (last 100 payments)
(define-map payment-history (buff 32) (list 100 {
  circle-id: uint,
  round: uint,
  amount: uint,
  on-time: bool,
  block: uint
}))

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get credit score only
(define-read-only (get-credit-score (unique-id (buff 32)))
  (match (map-get? credit-scores unique-id)
    score-data (ok (get score score-data))
    (ok INITIAL_SCORE)
  )
)

;; Get full credit data
(define-read-only (get-credit-data (unique-id (buff 32)))
  (map-get? credit-scores unique-id)
)

;; Get payment history
(define-read-only (get-payment-history (unique-id (buff 32)))
  (default-to (list) (map-get? payment-history unique-id))
)

;; Get score by wallet address (convenience for SDK/external protocols)
(define-read-only (get-score-by-wallet (wallet principal))
  (match (contract-call? .halo-identity get-id-by-wallet wallet)
    unique-id (match (map-get? credit-scores unique-id)
      score-data (ok (get score score-data))
      (ok INITIAL_SCORE)
    )
    (ok INITIAL_SCORE)
  )
)

;; Get full credit data by wallet
(define-read-only (get-credit-data-by-wallet (wallet principal))
  (match (contract-call? .halo-identity get-id-by-wallet wallet)
    unique-id (map-get? credit-scores unique-id)
    none
  )
)

;; Check if caller is authorized
(define-read-only (is-authorized (caller principal))
  (or (is-eq caller (var-get admin))
      (is-some (index-of? (var-get authorized-contracts) caller)))
)

;; Get score tier label
(define-read-only (get-score-tier (score uint))
  (if (>= score u750) "Excellent"
    (if (>= score u650) "Good"
      (if (>= score u550) "Fair"
        "Poor"
      )
    )
  )
)

;; Get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Get authorized contracts list
(define-read-only (get-authorized-contracts)
  (var-get authorized-contracts)
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Record a payment (called by authorized contracts like halo-circle)
(define-public (record-payment
  (unique-id (buff 32))
  (circle-id uint)
  (round uint)
  (amount uint)
  (on-time bool)
)
  (let (
    (caller contract-caller)
  )
    ;; Verify caller is authorized
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)

    (let (
      (current-data (get-or-create-credit-data unique-id))
      (new-total (+ (get total-payments current-data) u1))
      (new-on-time (if on-time
                      (+ (get on-time-payments current-data) u1)
                      (get on-time-payments current-data)))
      (new-late (if on-time
                   (get late-payments current-data)
                   (+ (get late-payments current-data) u1)))
      (new-volume (+ (get total-volume current-data) amount))
      (new-score (calculate-score
                   new-on-time
                   new-late
                   new-total
                   (get circles-completed current-data)
                   (get circles-defaulted current-data)
                   new-volume
                   (get first-activity current-data)
                   (get-staking-tier
                     (get sbtc-staked current-data)
                     (get staking-duration-blocks current-data))))
    )
      ;; Update credit data
      (map-set credit-scores unique-id {
        score: new-score,
        total-payments: new-total,
        on-time-payments: new-on-time,
        late-payments: new-late,
        circles-completed: (get circles-completed current-data),
        circles-defaulted: (get circles-defaulted current-data),
        total-volume: new-volume,
        first-activity: (get first-activity current-data),
        last-updated: stacks-block-height,
        sbtc-staked: (get sbtc-staked current-data),
        staking-duration-blocks: (get staking-duration-blocks current-data)
      })

      ;; Add to payment history
      (add-payment-record unique-id circle-id round amount on-time)

      (print {
        event: "payment-recorded",
        unique-id: unique-id,
        circle-id: circle-id,
        round: round,
        on-time: on-time,
        new-score: new-score
      })

      (ok new-score)
    )
  )
)

;; Record circle completion (called by authorized contracts)
(define-public (record-circle-completion (unique-id (buff 32)) (completed-successfully bool))
  (let (
    (caller contract-caller)
  )
    ;; Verify caller is authorized
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)

    (let (
      (current-data (get-or-create-credit-data unique-id))
      (new-completed (if completed-successfully
                        (+ (get circles-completed current-data) u1)
                        (get circles-completed current-data)))
      (new-defaulted (if completed-successfully
                        (get circles-defaulted current-data)
                        (+ (get circles-defaulted current-data) u1)))
      (new-score (calculate-score
                   (get on-time-payments current-data)
                   (get late-payments current-data)
                   (get total-payments current-data)
                   new-completed
                   new-defaulted
                   (get total-volume current-data)
                   (get first-activity current-data)
                   (get-staking-tier
                     (get sbtc-staked current-data)
                     (get staking-duration-blocks current-data))))
    )
      (map-set credit-scores unique-id
        (merge current-data {
          score: new-score,
          circles-completed: new-completed,
          circles-defaulted: new-defaulted,
          last-updated: stacks-block-height
        })
      )

      (print {
        event: "circle-completion-recorded",
        unique-id: unique-id,
        success: completed-successfully,
        new-score: new-score
      })

      (ok new-score)
    )
  )
)

;; Record staking activity (called by halo-sbtc-staking)
(define-public (record-staking-activity
  (unique-id (buff 32))
  (sbtc-amount uint)
  (duration-blocks uint)
)
  (let (
    (caller contract-caller)
  )
    ;; Verify caller is authorized
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)

    (let (
      (current-data (get-or-create-credit-data unique-id))
      (staking-tier (get-staking-tier sbtc-amount duration-blocks))
      (new-score (calculate-score
                   (get on-time-payments current-data)
                   (get late-payments current-data)
                   (get total-payments current-data)
                   (get circles-completed current-data)
                   (get circles-defaulted current-data)
                   (get total-volume current-data)
                   (get first-activity current-data)
                   staking-tier))
    )
      (map-set credit-scores unique-id
        (merge current-data {
          score: new-score,
          sbtc-staked: sbtc-amount,
          staking-duration-blocks: duration-blocks,
          last-updated: stacks-block-height
        })
      )

      (print {
        event: "staking-activity-recorded",
        unique-id: unique-id,
        sbtc-amount: sbtc-amount,
        duration-blocks: duration-blocks,
        staking-tier: staking-tier,
        new-score: new-score
      })

      (ok new-score)
    )
  )
)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Get or create default credit data
(define-private (get-or-create-credit-data (unique-id (buff 32)))
  (default-to {
    score: INITIAL_SCORE,
    total-payments: u0,
    on-time-payments: u0,
    late-payments: u0,
    circles-completed: u0,
    circles-defaulted: u0,
    total-volume: u0,
    first-activity: stacks-block-height,
    last-updated: stacks-block-height,
    sbtc-staked: u0,
    staking-duration-blocks: u0
  } (map-get? credit-scores unique-id))
)

;; Add payment to history list
(define-private (add-payment-record
  (unique-id (buff 32))
  (circle-id uint)
  (round uint)
  (amount uint)
  (on-time bool)
)
  (let (
    (history (get-payment-history unique-id))
    (new-record {
      circle-id: circle-id,
      round: round,
      amount: amount,
      on-time: on-time,
      block: stacks-block-height
    })
  )
    (match (as-max-len? (append history new-record) u100)
      updated-history (begin
        (map-set payment-history unique-id updated-history)
        true
      )
      false  ;; History full, silently skip (non-critical)
    )
  )
)

;; Calculate credit score from all factors
;; Returns a score between MIN_SCORE (300) and MAX_SCORE (850)
(define-private (calculate-score
  (on-time uint)
  (late uint)
  (total-payments uint)
  (completed uint)
  (defaulted uint)
  (volume uint)
  (first-activity uint)
  (staking-tier uint)
)
  (let (
    ;; 1. Payment History (35% weight) - max 192 pts
    (payment-ratio (if (> total-payments u0)
                      (/ (* on-time u100) total-payments)
                      u100))
    (payment-score (/ (* payment-ratio PAYMENT_HISTORY_WEIGHT MAX_EARNED) u10000))

    ;; 2. Circle Completion (20% weight) - max 110 pts
    (total-circles (+ completed defaulted))
    (completion-ratio (if (> total-circles u0)
                         (/ (* completed u100) total-circles)
                         u100))
    (completion-score (/ (* completion-ratio CIRCLE_COMPLETION_WEIGHT MAX_EARNED) u10000))

    ;; 3. Volume (15% weight) - max 82 pts
    (volume-tier (get-volume-tier volume))
    (volume-score (/ (* volume-tier VOLUME_WEIGHT MAX_EARNED) u10000))

    ;; 4. Tenure (10% weight) - max 55 pts
    (blocks-active (if (> stacks-block-height first-activity)
                      (- stacks-block-height first-activity)
                      u0))
    (tenure-tier (get-tenure-tier blocks-active))
    (tenure-score (/ (* tenure-tier TENURE_WEIGHT MAX_EARNED) u10000))

    ;; 5. Consistency (10% weight) - max 55 pts
    (consistency-tier (if (is-eq late u0) u100
                         (if (< late u3) u50
                           u25)))
    (consistency-score (/ (* consistency-tier CONSISTENCY_WEIGHT MAX_EARNED) u10000))

    ;; 6. Staking Activity (10% weight) - max 55 pts
    (staking-score (/ (* staking-tier STAKING_WEIGHT MAX_EARNED) u10000))

    ;; Total = base + earned (capped at MAX_SCORE)
    (total (+ MIN_SCORE
             (+ payment-score
               (+ completion-score
                 (+ volume-score
                   (+ tenure-score
                     (+ consistency-score staking-score)))))))
  )
    (if (> total MAX_SCORE) MAX_SCORE total)
  )
)

;; Volume tier: returns 0-100 based on total volume in microSTX
(define-private (get-volume-tier (volume uint))
  (if (> volume u500000000000) u100    ;; 500,000+ STX
    (if (> volume u100000000000) u90   ;; 100,000+ STX
    (if (> volume u10000000000) u75    ;; 10,000+ STX
    (if (> volume u1000000000) u60     ;; 1,000+ STX
    (if (> volume u100000000) u45      ;; 100+ STX
    (if (> volume u10000000) u30       ;; 10+ STX
    u15))))))                          ;; < 10 STX
)

;; Tenure tier: returns 0-100 based on blocks active
(define-private (get-tenure-tier (blocks uint))
  (let (
    (months (/ blocks u4320))  ;; ~4320 blocks per month on Stacks
  )
    (if (> months u12) u100
      (if (> months u6) u75
      (if (> months u3) u50
      u25)))
  )
)

;; Staking tier: combined amount + duration score (0-100)
;; Amount tiers (0-100): >1 BTC=100, >0.1=80, >0.01=60, >0.001=40, >0=20, 0=0
;; Duration modifier (0-100): >12mo=100, >6mo=80, >3mo=60, >1mo=40, >0=20
;; Combined: (amount_tier * duration_modifier) / 100
(define-private (get-staking-tier (sbtc-amount uint) (duration-blocks uint))
  (if (is-eq sbtc-amount u0) u0
    (let (
      ;; Amount tier (sBTC has 8 decimals: 1 BTC = 100000000)
      (amount-tier
        (if (> sbtc-amount u100000000) u100       ;; > 1 BTC
          (if (> sbtc-amount u10000000) u80        ;; > 0.1 BTC
            (if (> sbtc-amount u1000000) u60        ;; > 0.01 BTC
              (if (> sbtc-amount u100000) u40        ;; > 0.001 BTC
                u20)))))                              ;; > 0
      ;; Duration in months (~4320 blocks per month)
      (duration-months (/ duration-blocks u4320))
      (duration-modifier
        (if (> duration-months u12) u100
          (if (> duration-months u6) u80
            (if (> duration-months u3) u60
              (if (> duration-months u1) u40
                u20)))))
    )
      (/ (* amount-tier duration-modifier) u100)
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Authorize a contract to record payments/completions
(define-public (authorize-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (current (var-get authorized-contracts))
    )
      (asserts! (is-none (index-of? current contract)) ERR_INVALID_SCORE) ;; Already authorized
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
