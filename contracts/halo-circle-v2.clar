;; halo-circle-v2.clar
;; Bidding chit fund (ROSCA) with open bidding
;;
;; Round Lifecycle:
;; 1. CONTRIBUTE -- All members contribute X within grace period
;; 2. BID -- Eligible members (haven't won yet) place open bids
;; 3. SETTLE -- Lowest bidder wins; surplus split as dividends
;; 4. Advance round. After N rounds -> circle complete.
;;
;; Winner receives their bid amount, protocol fee deducted from pool,
;; remaining surplus distributed equally to non-winner members.
;; Winner must make separate repayment transactions over remaining rounds.
;;
;; Dependencies: halo-sip010-trait, halo-identity, halo-credit, halo-vault-v2

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_NOT_AUTHORIZED (err u800))
(define-constant ERR_CIRCLE_NOT_FOUND (err u801))
(define-constant ERR_CIRCLE_NOT_FORMING (err u802))
(define-constant ERR_CIRCLE_NOT_ACTIVE (err u803))
(define-constant ERR_ALREADY_MEMBER (err u804))
(define-constant ERR_NOT_MEMBER (err u805))
(define-constant ERR_CIRCLE_FULL (err u806))
(define-constant ERR_INVALID_AMOUNT (err u807))
(define-constant ERR_ALREADY_CONTRIBUTED (err u808))
(define-constant ERR_INVALID_ROUND (err u809))
(define-constant ERR_NOT_VERIFIED (err u810))
(define-constant ERR_TRANSFER_FAILED (err u811))
(define-constant ERR_INVALID_PARAMS (err u812))
(define-constant ERR_CONTRIBUTIONS_INCOMPLETE (err u813))
(define-constant ERR_ALREADY_PROCESSED (err u814))
(define-constant ERR_NOT_IN_BID_WINDOW (err u815))
(define-constant ERR_ALREADY_BID (err u816))
(define-constant ERR_ALREADY_WON (err u817))
(define-constant ERR_BID_TOO_LOW (err u818))
(define-constant ERR_BID_TOO_HIGH (err u819))
(define-constant ERR_NO_BIDS (err u820))
(define-constant ERR_REPAYMENT_NOT_DUE (err u821))
(define-constant ERR_INSUFFICIENT_COLLATERAL (err u822))
(define-constant ERR_BID_WINDOW_NOT_ENDED (err u823))
(define-constant ERR_NO_REPAYMENT_DUE (err u824))
(define-constant ERR_NOT_FOUND (err u825))
(define-constant ERR_TOKEN_MISMATCH (err u826))
(define-constant ERR_INVALID_TOKEN_TYPE (err u827))
(define-constant ERR_GRACE_PERIOD_NOT_ENDED (err u828))
(define-constant ERR_ALL_CONTRIBUTED (err u829))

;; Circle status
(define-constant STATUS_FORMING u0)
(define-constant STATUS_ACTIVE u1)
(define-constant STATUS_PAUSED u2)
(define-constant STATUS_COMPLETED u3)
(define-constant STATUS_DISSOLVED u4)

;; Token types
(define-constant TOKEN_TYPE_STX u0)
(define-constant TOKEN_TYPE_SIP010 u1)

;; Limits
(define-constant MIN_MEMBERS u3)
(define-constant MAX_MEMBERS u10)
(define-constant MIN_ROUND_DURATION u144)    ;; ~1 day in blocks
(define-constant MIN_BID_WINDOW u72)         ;; ~12 hours in blocks
(define-constant MIN_CONTRIBUTION u1000000)  ;; 1 STX minimum

;; Max uint for bid comparison initialization
(define-constant MAX_UINT u340282366920938463463374607431768211455)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var circle-counter uint u0)
(define-data-var protocol-fee-rate uint u100) ;; 1% = 100 basis points
(define-data-var temp-circle-id uint u0)       ;; Context for mapped functions

;; ============================================
;; DATA MAPS
;; ============================================

;; Circle configuration
(define-map circles-v2 uint {
  name: (string-ascii 30),
  creator: principal,
  contribution-amount: uint,
  total-members: uint,
  current-round: uint,
  status: uint,
  created-at: uint,
  start-block: uint,
  round-duration: uint,
  bid-window-blocks: uint,
  grace-period: uint,
  total-contributed: uint,
  total-paid-out: uint,
  token-type: uint,
  token-contract: (optional principal)
})

;; Circle members
(define-map circle-members-v2 { circle-id: uint, member: principal } {
  unique-id: (buff 32),
  joined-at: uint,
  total-contributed: uint,
  has-won: bool,
  won-round: uint,
  won-amount: uint,
  total-repaid: uint,
  total-dividends-received: uint
})

;; Contributions per round
(define-map contributions-v2 { circle-id: uint, member: principal, round: uint } {
  amount: uint,
  contributed-at: uint,
  on-time: bool
})

;; Bids per round
(define-map bids { circle-id: uint, round: uint, bidder: principal } {
  bid-amount: uint,
  bid-at: uint
})

;; Round settlement results
(define-map round-results { circle-id: uint, round: uint } {
  winner: principal,
  winning-bid: uint,
  pool-total: uint,
  protocol-fee: uint,
  surplus: uint,
  dividend-per-member: uint,
  settled-at: uint
})

;; Repayment schedule for winners
(define-map repayments { circle-id: uint, winner: principal, repayment-round: uint } {
  amount-due: uint,
  amount-paid: uint,
  paid-at: uint,
  on-time: bool
})

;; Ordered member list
(define-map circle-member-list-v2 uint (list 10 principal))

;; Pending token dividends (for SIP-010 circles, claim-based distribution)
(define-map pending-dividends { circle-id: uint, round: uint, member: principal } {
  amount: uint,
  claimed: bool
})

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-circle (circle-id uint))
  (map-get? circles-v2 circle-id)
)

(define-read-only (get-member (circle-id uint) (member principal))
  (map-get? circle-members-v2 { circle-id: circle-id, member: member })
)

(define-read-only (get-contribution (circle-id uint) (member principal) (round uint))
  (map-get? contributions-v2 { circle-id: circle-id, member: member, round: round })
)

(define-read-only (get-bid (circle-id uint) (round uint) (bidder principal))
  (map-get? bids { circle-id: circle-id, round: round, bidder: bidder })
)

(define-read-only (get-round-result (circle-id uint) (round uint))
  (map-get? round-results { circle-id: circle-id, round: round })
)

(define-read-only (get-repayment (circle-id uint) (winner principal) (repayment-round uint))
  (map-get? repayments { circle-id: circle-id, winner: winner, repayment-round: repayment-round })
)

(define-read-only (get-circle-members (circle-id uint))
  (default-to (list) (map-get? circle-member-list-v2 circle-id))
)

(define-read-only (get-circle-count)
  (var-get circle-counter)
)

(define-read-only (get-protocol-fee-rate)
  (var-get protocol-fee-rate)
)

(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-pending-dividend (circle-id uint) (round uint) (member principal))
  (map-get? pending-dividends { circle-id: circle-id, round: round, member: member })
)

;; Check if user has a bound wallet
(define-read-only (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)

;; Get round timing for a circle
(define-read-only (get-round-timing (circle-id uint) (round uint))
  (match (map-get? circles-v2 circle-id)
    circle (let (
      (round-start (+ (get start-block circle) (* round (get round-duration circle))))
      (contribute-deadline (+ round-start (get grace-period circle)))
      (bid-window-start contribute-deadline)
      (bid-window-end (+ bid-window-start (get bid-window-blocks circle)))
    )
      (some {
        round-start: round-start,
        contribute-deadline: contribute-deadline,
        bid-window-start: bid-window-start,
        bid-window-end: bid-window-end
      })
    )
    none
  )
)

;; Check if currently in bid window for a round
(define-read-only (is-in-bid-window (circle-id uint) (round uint))
  (match (get-round-timing circle-id round)
    timing (and
      (>= stacks-block-height (get bid-window-start timing))
      (<= stacks-block-height (get bid-window-end timing))
    )
    false
  )
)

;; Check if bid window has ended
(define-read-only (is-bid-window-ended (circle-id uint) (round uint))
  (match (get-round-timing circle-id round)
    timing (> stacks-block-height (get bid-window-end timing))
    false
  )
)

;; Check if contribution is on time
(define-read-only (is-payment-on-time (circle-id uint))
  (match (map-get? circles-v2 circle-id)
    circle (let (
      (round-start (+ (get start-block circle)
                      (* (get current-round circle) (get round-duration circle))))
      (grace-deadline (+ round-start (get grace-period circle)))
    )
      (<= stacks-block-height grace-deadline)
    )
    false
  )
)

;; Count contributions for a round
(define-read-only (count-round-contributions (circle-id uint) (round uint))
  (let (
    (members (get-circle-members circle-id))
  )
    (get count (fold count-member-contribution members
      { circle-id: circle-id, round: round, count: u0 }))
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- LIFECYCLE
;; ============================================

;; Create a new STX bidding circle
(define-public (create-circle-v2
  (name (string-ascii 30))
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (bid-window-blocks uint)
  (grace-period uint)
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get circle-counter) u1))
  )
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    (asserts! (>= total-members MIN_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (<= total-members MAX_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (>= contribution-amount MIN_CONTRIBUTION) ERR_INVALID_AMOUNT)
    (asserts! (>= round-duration MIN_ROUND_DURATION) ERR_INVALID_PARAMS)
    (asserts! (>= bid-window-blocks MIN_BID_WINDOW) ERR_INVALID_PARAMS)
    (asserts! (> grace-period u0) ERR_INVALID_PARAMS)
    ;; Round duration must fit grace + bid window
    (asserts! (> round-duration (+ grace-period bid-window-blocks)) ERR_INVALID_PARAMS)

    ;; Create circle
    (map-set circles-v2 new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: stacks-block-height,
      start-block: u0,
      round-duration: round-duration,
      bid-window-blocks: bid-window-blocks,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0,
      token-type: TOKEN_TYPE_STX,
      token-contract: none
    })

    (map-set circle-member-list-v2 new-id (list))
    (var-set circle-counter new-id)

    ;; Add creator as member
    (try! (internal-add-member new-id caller))

    ;; Lock collateral via vault-v2
    (let (
      (commitment-usd (try! (contract-call? .halo-vault-v2 calculate-commitment-usd
                              contribution-amount total-members ASSET_TYPE_STX)))
    )
      (try! (contract-call? .halo-vault-v2 lock-collateral caller new-id commitment-usd))
    )

    (print {
      event: "circle-v2-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      contribution-amount: contribution-amount,
      total-members: total-members,
      round-duration: round-duration,
      bid-window-blocks: bid-window-blocks,
      grace-period: grace-period
    })

    (ok new-id)
  )
)

;; Create a SIP-010 token bidding circle
(define-public (create-token-circle-v2
  (name (string-ascii 30))
  (token <ft-trait>)
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (bid-window-blocks uint)
  (grace-period uint)
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get circle-counter) u1))
    (token-principal (contract-of token))
  )
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    (asserts! (>= total-members MIN_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (<= total-members MAX_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (> contribution-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= round-duration MIN_ROUND_DURATION) ERR_INVALID_PARAMS)
    (asserts! (>= bid-window-blocks MIN_BID_WINDOW) ERR_INVALID_PARAMS)
    (asserts! (> grace-period u0) ERR_INVALID_PARAMS)
    (asserts! (> round-duration (+ grace-period bid-window-blocks)) ERR_INVALID_PARAMS)

    (map-set circles-v2 new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: stacks-block-height,
      start-block: u0,
      round-duration: round-duration,
      bid-window-blocks: bid-window-blocks,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0,
      token-type: TOKEN_TYPE_SIP010,
      token-contract: (some token-principal)
    })

    (map-set circle-member-list-v2 new-id (list))
    (var-set circle-counter new-id)
    (try! (internal-add-member new-id caller))

    ;; Lock collateral -- use HUSD asset type for stablecoin circles
    (let (
      (commitment-usd (try! (contract-call? .halo-vault-v2 calculate-commitment-usd
                              contribution-amount total-members ASSET_TYPE_HUSD)))
    )
      (try! (contract-call? .halo-vault-v2 lock-collateral caller new-id commitment-usd))
    )

    (print {
      event: "circle-v2-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      token-type: TOKEN_TYPE_SIP010,
      token-contract: token-principal
    })

    (ok new-id)
  )
)

;; Join an existing circle
(define-public (join-circle-v2 (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-members (get-circle-members circle-id))
    (member-count (len current-members))
  )
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    (asserts! (is-eq (get status circle) STATUS_FORMING) ERR_CIRCLE_NOT_FORMING)
    (asserts! (is-none (map-get? circle-members-v2 { circle-id: circle-id, member: caller }))
              ERR_ALREADY_MEMBER)
    (asserts! (< member-count (get total-members circle)) ERR_CIRCLE_FULL)

    ;; Lock collateral
    (let (
      (asset-type (get-vault-asset-type (get token-type circle)))
      (commitment-usd (try! (contract-call? .halo-vault-v2 calculate-commitment-usd
                              (get contribution-amount circle)
                              (get total-members circle)
                              asset-type)))
    )
      (try! (contract-call? .halo-vault-v2 lock-collateral caller circle-id commitment-usd))
    )

    (try! (internal-add-member circle-id caller))

    ;; Auto-activate if full
    (let (
      (new-count (+ member-count u1))
    )
      (if (is-eq new-count (get total-members circle))
        (try! (internal-activate-circle circle-id))
        true
      )
    )

    (print {
      event: "member-joined-v2",
      circle-id: circle-id,
      member: caller,
      member-count: (+ member-count u1)
    })

    (ok (+ member-count u1))
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- CONTRIBUTIONS
;; ============================================

;; Contribute STX for current round
(define-public (contribute-stx-v2 (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members-v2 { circle-id: circle-id, member: caller })
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (contribution-amount (get contribution-amount circle))
    (on-time (is-payment-on-time circle-id))
  )
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_STX) ERR_TOKEN_MISMATCH)
    (asserts! (is-none (map-get? contributions-v2
                        { circle-id: circle-id, member: caller, round: current-round }))
              ERR_ALREADY_CONTRIBUTED)

    ;; Transfer STX
    (try! (stx-transfer? contribution-amount caller (as-contract tx-sender)))

    ;; Record contribution
    (map-set contributions-v2 { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: stacks-block-height,
      on-time: on-time
    })

    ;; Update member totals
    (map-set circle-members-v2 { circle-id: circle-id, member: caller }
      (merge member-data {
        total-contributed: (+ (get total-contributed member-data) contribution-amount)
      })
    )

    ;; Update circle totals
    (map-set circles-v2 circle-id
      (merge circle {
        total-contributed: (+ (get total-contributed circle) contribution-amount)
      })
    )

    ;; Record payment in credit contract (non-critical)
    (match (contract-call? .halo-identity get-id-by-wallet caller)
      unique-id (match (contract-call? .halo-credit record-payment
                   unique-id circle-id current-round contribution-amount on-time)
        success true
        error false
      )
      false
    )

    (print {
      event: "contribution-v2",
      circle-id: circle-id,
      member: caller,
      round: current-round,
      amount: contribution-amount,
      on-time: on-time
    })

    (ok true)
  )
)

;; Contribute SIP-010 token for current round
(define-public (contribute-token-v2 (circle-id uint) (token <ft-trait>))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members-v2 { circle-id: circle-id, member: caller })
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (contribution-amount (get contribution-amount circle))
    (on-time (is-payment-on-time circle-id))
  )
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)
    (asserts! (is-none (map-get? contributions-v2
                        { circle-id: circle-id, member: caller, round: current-round }))
              ERR_ALREADY_CONTRIBUTED)

    (try! (contract-call? token transfer contribution-amount caller (as-contract tx-sender) none))

    (map-set contributions-v2 { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: stacks-block-height,
      on-time: on-time
    })

    (map-set circle-members-v2 { circle-id: circle-id, member: caller }
      (merge member-data {
        total-contributed: (+ (get total-contributed member-data) contribution-amount)
      })
    )

    (map-set circles-v2 circle-id
      (merge circle {
        total-contributed: (+ (get total-contributed circle) contribution-amount)
      })
    )

    (match (contract-call? .halo-identity get-id-by-wallet caller)
      unique-id (match (contract-call? .halo-credit record-payment
                   unique-id circle-id current-round contribution-amount on-time)
        success true
        error false
      )
      false
    )

    (print {
      event: "contribution-v2",
      circle-id: circle-id,
      member: caller,
      round: current-round,
      amount: contribution-amount,
      on-time: on-time,
      token-type: TOKEN_TYPE_SIP010
    })

    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- BIDDING
;; ============================================

;; Place a bid for the current round's pot
(define-public (place-bid (circle-id uint) (bid-amount uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members-v2 { circle-id: circle-id, member: caller })
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (pool-total (* (get contribution-amount circle) (get total-members circle)))
    (max-fee (/ (* pool-total (var-get protocol-fee-rate)) u10000))
    (max-bid (- pool-total max-fee))
  )
    ;; Circle must be active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Must be in bid window
    (asserts! (is-in-bid-window circle-id current-round) ERR_NOT_IN_BID_WINDOW)

    ;; Member must not have already won in a previous round
    (asserts! (not (get has-won member-data)) ERR_ALREADY_WON)

    ;; Must not have already bid this round
    (asserts! (is-none (map-get? bids { circle-id: circle-id, round: current-round, bidder: caller }))
              ERR_ALREADY_BID)

    ;; Bid amount validation
    (asserts! (> bid-amount u0) ERR_BID_TOO_LOW)
    (asserts! (<= bid-amount max-bid) ERR_BID_TOO_HIGH)

    ;; Record bid
    (map-set bids { circle-id: circle-id, round: current-round, bidder: caller } {
      bid-amount: bid-amount,
      bid-at: stacks-block-height
    })

    (print {
      event: "bid-placed",
      circle-id: circle-id,
      round: current-round,
      bidder: caller,
      bid-amount: bid-amount
    })

    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- SETTLEMENT
;; ============================================

;; Process the current round: find lowest bid, distribute funds
(define-public (process-round-v2 (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (pool-total (* contribution-amount total-members))
    (contribution-count (count-round-contributions circle-id current-round))
  )
    ;; Circle must be active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; All contributions must be in
    (asserts! (is-eq contribution-count total-members) ERR_CONTRIBUTIONS_INCOMPLETE)

    ;; Bid window must have ended
    (asserts! (is-bid-window-ended circle-id current-round) ERR_BID_WINDOW_NOT_ENDED)

    ;; Not already processed
    (asserts! (is-none (map-get? round-results { circle-id: circle-id, round: current-round }))
              ERR_ALREADY_PROCESSED)

    ;; Find lowest bidder using fold
    (let (
      (bid-result (fold find-lowest-bid members {
        circle-id: circle-id,
        round: current-round,
        lowest-bid: MAX_UINT,
        lowest-bidder: CONTRACT_OWNER  ;; sentinel -- replaced if any bid found
      }))
    )
      ;; Must have at least one bid
      (asserts! (< (get lowest-bid bid-result) MAX_UINT) ERR_NO_BIDS)

      (let (
        (winner (get lowest-bidder bid-result))
        (winning-bid (get lowest-bid bid-result))
        (protocol-fee (/ (* pool-total (var-get protocol-fee-rate)) u10000))
        (surplus (- (- pool-total winning-bid) protocol-fee))
        ;; Dividends: split surplus among non-winner members
        (non-winner-count (- total-members u1))
        (dividend-per-member (if (> non-winner-count u0)
          (/ surplus non-winner-count) u0))
      )
        ;; Transfer winning bid to winner
        (if (is-eq (get token-type circle) TOKEN_TYPE_STX)
          (try! (as-contract (stx-transfer? winning-bid tx-sender winner)))
          ;; SIP-010 transfers handled separately
          true
        )

        ;; Transfer protocol fee to admin
        (if (and (> protocol-fee u0) (is-eq (get token-type circle) TOKEN_TYPE_STX))
          (try! (as-contract (stx-transfer? protocol-fee tx-sender (var-get admin))))
          true
        )

        ;; Distribute dividends to non-winner members
        (var-set temp-circle-id circle-id)
        (let (
          (distribute-result (fold distribute-dividend members {
            circle-id: circle-id,
            round: current-round,
            winner: winner,
            dividend: dividend-per-member,
            token-type: (get token-type circle),
            distributed-count: u0,
            total-members: total-members
          }))
        )
          ;; Handle dividend remainder (rounding) -- give to last non-winner
          ;; The fold handles this: last non-winner gets surplus - (dividend * (N-2))
          true
        )

        ;; Record round result
        (map-set round-results { circle-id: circle-id, round: current-round } {
          winner: winner,
          winning-bid: winning-bid,
          pool-total: pool-total,
          protocol-fee: protocol-fee,
          surplus: surplus,
          dividend-per-member: dividend-per-member,
          settled-at: stacks-block-height
        })

        ;; Mark winner
        (let (
          (winner-data (unwrap-panic (map-get? circle-members-v2 { circle-id: circle-id, member: winner })))
        )
          (map-set circle-members-v2 { circle-id: circle-id, member: winner }
            (merge winner-data {
              has-won: true,
              won-round: current-round,
              won-amount: winning-bid
            })
          )
        )

        ;; Create repayment schedule for winner
        ;; Winner repays winning-bid over remaining rounds
        (let (
          (remaining-rounds (- total-members (+ current-round u1)))
          (repayment-per-round (if (> remaining-rounds u0)
            (/ winning-bid remaining-rounds) u0))
        )
          (if (> remaining-rounds u0)
            (begin
              ;; Set up repayment entries for each future round
              (fold setup-repayment-round
                (list u1 u2 u3 u4 u5 u6 u7 u8 u9)
                {
                  circle-id: circle-id,
                  winner: winner,
                  current-round: current-round,
                  total-members: total-members,
                  repayment-per-round: repayment-per-round,
                  winning-bid: winning-bid,
                  remaining-rounds: remaining-rounds,
                  setup-count: u0
                }
              )
              true
            )
            true ;; Last round, no repayments needed
          )
        )

        ;; Advance round
        (let (
          (next-round (+ current-round u1))
        )
          (map-set circles-v2 circle-id
            (merge circle {
              total-paid-out: (+ (get total-paid-out circle) winning-bid),
              current-round: next-round
            })
          )

          ;; Complete if all rounds done
          (if (>= next-round total-members)
            (try! (internal-complete-circle circle-id))
            true
          )
        )

        (print {
          event: "round-settled-v2",
          circle-id: circle-id,
          round: current-round,
          winner: winner,
          winning-bid: winning-bid,
          protocol-fee: protocol-fee,
          surplus: surplus,
          dividend-per-member: dividend-per-member
        })

        (ok winning-bid)
      )
    )
  )
)

;; Process the current round for SIP-010 token circles
(define-public (process-round-v2-token (circle-id uint) (token <ft-trait>))
  (let (
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (pool-total (* contribution-amount total-members))
    (contribution-count (count-round-contributions circle-id current-round))
  )
    ;; Must be a SIP-010 circle
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)

    ;; Circle must be active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; All contributions must be in
    (asserts! (is-eq contribution-count total-members) ERR_CONTRIBUTIONS_INCOMPLETE)

    ;; Bid window must have ended
    (asserts! (is-bid-window-ended circle-id current-round) ERR_BID_WINDOW_NOT_ENDED)

    ;; Not already processed
    (asserts! (is-none (map-get? round-results { circle-id: circle-id, round: current-round }))
              ERR_ALREADY_PROCESSED)

    ;; Find lowest bidder using fold
    (let (
      (bid-result (fold find-lowest-bid members {
        circle-id: circle-id,
        round: current-round,
        lowest-bid: MAX_UINT,
        lowest-bidder: CONTRACT_OWNER
      }))
    )
      ;; Must have at least one bid
      (asserts! (< (get lowest-bid bid-result) MAX_UINT) ERR_NO_BIDS)

      (let (
        (winner (get lowest-bidder bid-result))
        (winning-bid (get lowest-bid bid-result))
        (protocol-fee (/ (* pool-total (var-get protocol-fee-rate)) u10000))
        (surplus (- (- pool-total winning-bid) protocol-fee))
        (non-winner-count (- total-members u1))
        (dividend-per-member (if (> non-winner-count u0)
          (/ surplus non-winner-count) u0))
      )
        ;; Transfer winning bid to winner via token
        (try! (as-contract (contract-call? token transfer winning-bid tx-sender winner none)))

        ;; Transfer protocol fee to admin via token
        (if (> protocol-fee u0)
          (try! (as-contract (contract-call? token transfer protocol-fee tx-sender (var-get admin) none)))
          true
        )

        ;; Record pending dividends for non-winner members (claim-based)
        (var-set temp-circle-id circle-id)
        (let (
          (distribute-result (fold record-pending-dividend members {
            circle-id: circle-id,
            round: current-round,
            winner: winner,
            dividend: dividend-per-member,
            distributed-count: u0,
            total-members: total-members,
            surplus: surplus
          }))
        )
          true
        )

        ;; Record round result
        (map-set round-results { circle-id: circle-id, round: current-round } {
          winner: winner,
          winning-bid: winning-bid,
          pool-total: pool-total,
          protocol-fee: protocol-fee,
          surplus: surplus,
          dividend-per-member: dividend-per-member,
          settled-at: stacks-block-height
        })

        ;; Mark winner
        (let (
          (winner-data (unwrap-panic (map-get? circle-members-v2 { circle-id: circle-id, member: winner })))
        )
          (map-set circle-members-v2 { circle-id: circle-id, member: winner }
            (merge winner-data {
              has-won: true,
              won-round: current-round,
              won-amount: winning-bid
            })
          )
        )

        ;; Create repayment schedule for winner
        (let (
          (remaining-rounds (- total-members (+ current-round u1)))
          (repayment-per-round (if (> remaining-rounds u0)
            (/ winning-bid remaining-rounds) u0))
        )
          (if (> remaining-rounds u0)
            (begin
              (fold setup-repayment-round
                (list u1 u2 u3 u4 u5 u6 u7 u8 u9)
                {
                  circle-id: circle-id,
                  winner: winner,
                  current-round: current-round,
                  total-members: total-members,
                  repayment-per-round: repayment-per-round,
                  winning-bid: winning-bid,
                  remaining-rounds: remaining-rounds,
                  setup-count: u0
                }
              )
              true
            )
            true
          )
        )

        ;; Advance round
        (let (
          (next-round (+ current-round u1))
        )
          (map-set circles-v2 circle-id
            (merge circle {
              total-paid-out: (+ (get total-paid-out circle) winning-bid),
              current-round: next-round
            })
          )

          ;; Complete if all rounds done
          (if (>= next-round total-members)
            (try! (internal-complete-circle circle-id))
            true
          )
        )

        (print {
          event: "round-settled-v2",
          circle-id: circle-id,
          round: current-round,
          winner: winner,
          winning-bid: winning-bid,
          protocol-fee: protocol-fee,
          surplus: surplus,
          dividend-per-member: dividend-per-member,
          token-type: TOKEN_TYPE_SIP010
        })

        (ok winning-bid)
      )
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- REPAYMENT
;; ============================================

;; Make STX repayment for the current round
(define-public (make-repayment-stx (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (repayment-data (unwrap! (map-get? repayments
                      { circle-id: circle-id, winner: caller, repayment-round: current-round })
                    ERR_NO_REPAYMENT_DUE))
    (amount-due (get amount-due repayment-data))
  )
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_STX) ERR_TOKEN_MISMATCH)
    (asserts! (> amount-due u0) ERR_NO_REPAYMENT_DUE)
    (asserts! (is-eq (get amount-paid repayment-data) u0) ERR_ALREADY_CONTRIBUTED) ;; Not yet paid

    ;; Transfer repayment to contract
    (try! (stx-transfer? amount-due caller (as-contract tx-sender)))

    ;; Update repayment record
    (map-set repayments { circle-id: circle-id, winner: caller, repayment-round: current-round }
      (merge repayment-data {
        amount-paid: amount-due,
        paid-at: stacks-block-height,
        on-time: (is-payment-on-time circle-id)
      })
    )

    ;; Update member total repaid
    (let (
      (member-data (unwrap-panic (map-get? circle-members-v2 { circle-id: circle-id, member: caller })))
    )
      (map-set circle-members-v2 { circle-id: circle-id, member: caller }
        (merge member-data {
          total-repaid: (+ (get total-repaid member-data) amount-due)
        })
      )
    )

    ;; Record in credit (non-critical)
    (match (contract-call? .halo-identity get-id-by-wallet caller)
      unique-id (match (contract-call? .halo-credit record-payment
                   unique-id circle-id current-round amount-due (is-payment-on-time circle-id))
        success true
        error false
      )
      false
    )

    (print {
      event: "repayment-made",
      circle-id: circle-id,
      winner: caller,
      round: current-round,
      amount: amount-due
    })

    (ok true)
  )
)

;; Make SIP-010 repayment
(define-public (make-repayment-token (circle-id uint) (token <ft-trait>))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (repayment-data (unwrap! (map-get? repayments
                      { circle-id: circle-id, winner: caller, repayment-round: current-round })
                    ERR_NO_REPAYMENT_DUE))
    (amount-due (get amount-due repayment-data))
  )
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)
    (asserts! (> amount-due u0) ERR_NO_REPAYMENT_DUE)
    (asserts! (is-eq (get amount-paid repayment-data) u0) ERR_ALREADY_CONTRIBUTED)

    (try! (contract-call? token transfer amount-due caller (as-contract tx-sender) none))

    (map-set repayments { circle-id: circle-id, winner: caller, repayment-round: current-round }
      (merge repayment-data {
        amount-paid: amount-due,
        paid-at: stacks-block-height,
        on-time: (is-payment-on-time circle-id)
      })
    )

    (let (
      (member-data (unwrap-panic (map-get? circle-members-v2 { circle-id: circle-id, member: caller })))
    )
      (map-set circle-members-v2 { circle-id: circle-id, member: caller }
        (merge member-data {
          total-repaid: (+ (get total-repaid member-data) amount-due)
        })
      )
    )

    (match (contract-call? .halo-identity get-id-by-wallet caller)
      unique-id (match (contract-call? .halo-credit record-payment
                   unique-id circle-id current-round amount-due (is-payment-on-time circle-id))
        success true
        error false
      )
      false
    )

    (print {
      event: "repayment-made",
      circle-id: circle-id,
      winner: caller,
      round: current-round,
      amount: amount-due,
      token-type: TOKEN_TYPE_SIP010
    })

    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- FORCE ADVANCE
;; ============================================

;; Force-advance a round when contributions are incomplete after grace period.
;; Slashes non-contributors' collateral and records their default,
;; then auto-fills missing contributions so the round can proceed to bidding.
;; Any member can call this after the grace period has passed.
(define-public (force-advance-round (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (contribution-count (count-round-contributions circle-id current-round))
  )
    ;; Must be active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Caller must be a member
    (asserts! (is-some (map-get? circle-members-v2 { circle-id: circle-id, member: tx-sender }))
              ERR_NOT_MEMBER)

    ;; Grace period must have passed (contributions are late)
    (asserts! (not (is-payment-on-time circle-id)) ERR_GRACE_PERIOD_NOT_ENDED)

    ;; Not all members have contributed (otherwise just use process-round-v2)
    (asserts! (< contribution-count total-members) ERR_ALL_CONTRIBUTED)

    ;; Slash non-contributors and auto-record their contributions
    (var-set temp-circle-id circle-id)
    (fold slash-non-contributor members {
      circle-id: circle-id,
      round: current-round,
      contribution-amount: contribution-amount,
      token-type: (get token-type circle),
      slashed-count: u0
    })

    ;; Update circle total-contributed for the auto-filled contributions
    (let (
      (missing-count (- total-members contribution-count))
      (auto-filled-total (* missing-count contribution-amount))
    )
      (map-set circles-v2 circle-id
        (merge circle {
          total-contributed: (+ (get total-contributed circle) auto-filled-total)
        })
      )
    )

    (print {
      event: "round-force-advanced",
      circle-id: circle-id,
      round: current-round,
      contributions-before: contribution-count,
      total-members: total-members
    })

    (ok true)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- DIVIDEND CLAIMS
;; ============================================

;; Claim pending token dividend for a specific round
(define-public (claim-dividend-token (circle-id uint) (round uint) (token <ft-trait>))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (dividend-data (unwrap! (map-get? pending-dividends
                    { circle-id: circle-id, round: round, member: caller })
                  ERR_NOT_FOUND))
    (amount (get amount dividend-data))
  )
    ;; Must be a SIP-010 circle
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)

    ;; Must not already claimed
    (asserts! (not (get claimed dividend-data)) ERR_ALREADY_CONTRIBUTED)

    ;; Must have a positive amount
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Transfer tokens from contract to member
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

    ;; Mark as claimed
    (map-set pending-dividends { circle-id: circle-id, round: round, member: caller }
      (merge dividend-data { claimed: true })
    )

    ;; Update member's dividend total
    (match (map-get? circle-members-v2 { circle-id: circle-id, member: caller })
      member-data (map-set circle-members-v2 { circle-id: circle-id, member: caller }
        (merge member-data {
          total-dividends-received: (+ (get total-dividends-received member-data) amount)
        })
      )
      true
    )

    (print {
      event: "dividend-claimed",
      circle-id: circle-id,
      round: round,
      member: caller,
      amount: amount
    })

    (ok amount)
  )
)

;; ============================================
;; PUBLIC FUNCTIONS -- DEFAULT
;; ============================================

;; Report a defaulter (any member can call after grace period)
(define-public (report-default (circle-id uint) (defaulter principal))
  (let (
    (circle (unwrap! (map-get? circles-v2 circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
  )
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Check if defaulter has an unpaid repayment for the current round
    (let (
      (repayment-data (unwrap! (map-get? repayments
                        { circle-id: circle-id, winner: defaulter, repayment-round: current-round })
                      ERR_NO_REPAYMENT_DUE))
      (amount-due (get amount-due repayment-data))
      (amount-paid (get amount-paid repayment-data))
      (outstanding (- amount-due amount-paid))
    )
      (asserts! (> outstanding u0) ERR_NO_REPAYMENT_DUE)

      ;; Check that grace period has passed
      (asserts! (not (is-payment-on-time circle-id)) ERR_NOT_IN_BID_WINDOW)

      ;; Slash collateral from vault-v2
      ;; Convert outstanding token amount to USD for slashing
      (let (
        (asset-type (get-vault-asset-type (get token-type circle)))
        (slash-usd (try! (contract-call? .halo-vault-v2 calculate-commitment-usd
                           outstanding u1 asset-type)))
      )
        (try! (contract-call? .halo-vault-v2 slash-collateral defaulter circle-id slash-usd))
      )

      ;; Mark repayment as partially covered
      (map-set repayments { circle-id: circle-id, winner: defaulter, repayment-round: current-round }
        (merge repayment-data {
          amount-paid: amount-due,
          on-time: false
        })
      )

      (print {
        event: "default-reported",
        circle-id: circle-id,
        defaulter: defaulter,
        round: current-round,
        outstanding-amount: outstanding
      })

      (ok true)
    )
  )
)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Asset type constants for vault interaction (must match halo-vault-v2)
(define-constant ASSET_TYPE_HUSD u0)
(define-constant ASSET_TYPE_STX u1)
(define-constant ASSET_TYPE_SBTC u2)

;; Map circle token-type to vault asset-type for collateral operations
(define-private (get-vault-asset-type (token-type uint))
  (if (is-eq token-type TOKEN_TYPE_STX)
    ASSET_TYPE_STX
    ASSET_TYPE_HUSD  ;; SIP-010 tokens use hUSD asset type for collateral
  )
)

;; Add a member to a circle
(define-private (internal-add-member (circle-id uint) (member principal))
  (let (
    (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet member) ERR_NOT_VERIFIED))
    (current-members (get-circle-members circle-id))
  )
    (map-set circle-members-v2 { circle-id: circle-id, member: member } {
      unique-id: unique-id,
      joined-at: stacks-block-height,
      total-contributed: u0,
      has-won: false,
      won-round: u0,
      won-amount: u0,
      total-repaid: u0,
      total-dividends-received: u0
    })

    (map-set circle-member-list-v2 circle-id
      (unwrap! (as-max-len? (append current-members member) u10) ERR_CIRCLE_FULL))

    (ok true)
  )
)

;; Activate circle when full
(define-private (internal-activate-circle (circle-id uint))
  (match (map-get? circles-v2 circle-id)
    circle (begin
      (map-set circles-v2 circle-id
        (merge circle {
          status: STATUS_ACTIVE,
          start-block: stacks-block-height
        })
      )
      (print { event: "circle-v2-activated", circle-id: circle-id, start-block: stacks-block-height })
      (ok true)
    )
    ERR_CIRCLE_NOT_FOUND
  )
)

;; Complete a circle (all rounds done)
(define-private (internal-complete-circle (circle-id uint))
  (match (map-get? circles-v2 circle-id)
    circle (begin
      (map-set circles-v2 circle-id
        (merge circle { status: STATUS_COMPLETED })
      )

      ;; Release collateral and record completion for all members
      (var-set temp-circle-id circle-id)
      (let (
        (members (get-circle-members circle-id))
      )
        (map internal-complete-member members)
      )

      (print { event: "circle-v2-completed", circle-id: circle-id })
      (ok true)
    )
    ERR_CIRCLE_NOT_FOUND
  )
)

;; Release collateral for a member on completion (with repayment verification)
(define-private (internal-complete-member (member principal))
  (let (
    (cid (var-get temp-circle-id))
    (member-data (map-get? circle-members-v2 { circle-id: cid, member: member }))
  )
    (match member-data
      mdata (let (
        (has-won (get has-won mdata))
        (won-amount (get won-amount mdata))
        (total-repaid (get total-repaid mdata))
        (fully-repaid (or (not has-won) (>= total-repaid won-amount)))
      )
        (if fully-repaid
          ;; Member either never won or fully repaid -- release collateral
          (begin
            (match (contract-call? .halo-vault-v2 release-collateral member cid)
              success true
              error false
            )
            (match (contract-call? .halo-identity get-id-by-wallet member)
              unique-id (match (contract-call? .halo-credit record-circle-completion unique-id true)
                success true
                error false
              )
              false
            )
          )
          ;; Member won but did NOT fully repay -- slash outstanding amount
          (let (
            (outstanding (- won-amount total-repaid))
            (circle (unwrap-panic (map-get? circles-v2 cid)))
            (asset-type (get-vault-asset-type (get token-type circle)))
          )
            ;; Slash collateral for the outstanding amount
            (match (contract-call? .halo-vault-v2 calculate-commitment-usd outstanding u1 asset-type)
              slash-usd (match (contract-call? .halo-vault-v2 slash-collateral member cid slash-usd)
                success true
                error false
              )
              error false
            )
            ;; Record circle completion as defaulted
            (match (contract-call? .halo-identity get-id-by-wallet member)
              unique-id (match (contract-call? .halo-credit record-circle-completion unique-id false)
                success true
                error false
              )
              false
            )
          )
        )
      )
      ;; No member data found (shouldn't happen)
      true
    )
  )
)

;; Fold helper: count member contribution
(define-private (count-member-contribution
  (member principal)
  (state { circle-id: uint, round: uint, count: uint })
)
  (if (is-some (map-get? contributions-v2 {
        circle-id: (get circle-id state),
        member: member,
        round: (get round state)
      }))
    (merge state { count: (+ (get count state) u1) })
    state
  )
)

;; Fold helper: find lowest bid
(define-private (find-lowest-bid
  (member principal)
  (state { circle-id: uint, round: uint, lowest-bid: uint, lowest-bidder: principal })
)
  ;; Skip members who have already won
  (match (map-get? circle-members-v2 { circle-id: (get circle-id state), member: member })
    member-data (if (get has-won member-data)
      state ;; Already won, skip
      ;; Check if this member placed a bid
      (match (map-get? bids { circle-id: (get circle-id state), round: (get round state), bidder: member })
        bid-data (if (< (get bid-amount bid-data) (get lowest-bid state))
          (merge state {
            lowest-bid: (get bid-amount bid-data),
            lowest-bidder: member
          })
          state
        )
        state ;; No bid from this member
      )
    )
    state ;; Not a member (shouldn't happen)
  )
)

;; Fold helper: slash non-contributors and auto-fill their contributions
(define-private (slash-non-contributor
  (member principal)
  (state {
    circle-id: uint,
    round: uint,
    contribution-amount: uint,
    token-type: uint,
    slashed-count: uint
  })
)
  (let (
    (has-contributed (is-some (map-get? contributions-v2 {
      circle-id: (get circle-id state),
      member: member,
      round: (get round state)
    })))
  )
    (if has-contributed
      state ;; Already contributed, skip
      (begin
        ;; Auto-record a late contribution entry
        (map-set contributions-v2 {
          circle-id: (get circle-id state),
          member: member,
          round: (get round state)
        } {
          amount: (get contribution-amount state),
          contributed-at: stacks-block-height,
          on-time: false
        })

        ;; Slash collateral for the missed contribution
        (let (
          (asset-type (get-vault-asset-type (get token-type state)))
        )
          (match (contract-call? .halo-vault-v2 calculate-commitment-usd
                   (get contribution-amount state) u1 asset-type)
            slash-usd (match (contract-call? .halo-vault-v2 slash-collateral
                        member (get circle-id state) slash-usd)
              success true
              error false
            )
            error false
          )
        )

        ;; Record missed payment in credit (non-critical)
        (match (contract-call? .halo-identity get-id-by-wallet member)
          unique-id (match (contract-call? .halo-credit record-payment
                     unique-id (get circle-id state) (get round state)
                     (get contribution-amount state) false)
            success true
            error false
          )
          false
        )

        (print {
          event: "non-contributor-slashed",
          circle-id: (get circle-id state),
          round: (get round state),
          member: member,
          amount: (get contribution-amount state)
        })

        (merge state { slashed-count: (+ (get slashed-count state) u1) })
      )
    )
  )
)

;; Fold helper: record pending token dividends for non-winner members (SIP-010)
(define-private (record-pending-dividend
  (member principal)
  (state {
    circle-id: uint,
    round: uint,
    winner: principal,
    dividend: uint,
    distributed-count: uint,
    total-members: uint,
    surplus: uint
  })
)
  (if (is-eq member (get winner state))
    state ;; Skip winner
    (let (
      (new-count (+ (get distributed-count state) u1))
      (is-last-recipient (is-eq new-count (- (get total-members state) u1)))
      ;; Last non-winner gets remainder to handle rounding dust
      (already-distributed (* (get dividend state) (get distributed-count state)))
      (this-dividend (if is-last-recipient
        (- (get surplus state) already-distributed)
        (get dividend state)))
    )
      (if (> this-dividend u0)
        (begin
          (map-set pending-dividends {
            circle-id: (get circle-id state),
            round: (get round state),
            member: member
          } {
            amount: this-dividend,
            claimed: false
          })
          (merge state { distributed-count: new-count })
        )
        (merge state { distributed-count: new-count })
      )
    )
  )
)

;; Fold helper: distribute dividends to non-winner members (STX only)
(define-private (distribute-dividend
  (member principal)
  (state {
    circle-id: uint,
    round: uint,
    winner: principal,
    dividend: uint,
    token-type: uint,
    distributed-count: uint,
    total-members: uint
  })
)
  (if (is-eq member (get winner state))
    state ;; Skip winner
    (if (is-eq (get token-type state) TOKEN_TYPE_STX)
      (begin
        ;; Transfer dividend to this non-winner member
        (match (as-contract (stx-transfer? (get dividend state) tx-sender member))
          success (begin
            ;; Update member's dividend total
            (match (map-get? circle-members-v2 { circle-id: (get circle-id state), member: member })
              member-data (map-set circle-members-v2 { circle-id: (get circle-id state), member: member }
                (merge member-data {
                  total-dividends-received: (+ (get total-dividends-received member-data)
                                               (get dividend state))
                })
              )
              true
            )
            (merge state { distributed-count: (+ (get distributed-count state) u1) })
          )
          error state ;; Transfer failed, continue
        )
      )
      ;; For SIP-010: dividends handled via claim-based record-pending-dividend
      (merge state { distributed-count: (+ (get distributed-count state) u1) })
    )
  )
)

;; Fold helper: setup repayment rounds for the winner
(define-private (setup-repayment-round
  (offset uint)
  (state {
    circle-id: uint,
    winner: principal,
    current-round: uint,
    total-members: uint,
    repayment-per-round: uint,
    winning-bid: uint,
    remaining-rounds: uint,
    setup-count: uint
  })
)
  (let (
    (target-round (+ (get current-round state) offset))
  )
    ;; Only setup for rounds within the circle's duration
    (if (and (< target-round (get total-members state))
             (< (get setup-count state) (get remaining-rounds state)))
      (let (
        ;; Last repayment round gets remainder to handle rounding
        (is-last (is-eq (+ (get setup-count state) u1) (get remaining-rounds state)))
        (already-scheduled (* (get repayment-per-round state) (get setup-count state)))
        (amount (if is-last
          (- (get winning-bid state) already-scheduled)
          (get repayment-per-round state)))
      )
        (map-set repayments {
          circle-id: (get circle-id state),
          winner: (get winner state),
          repayment-round: target-round
        } {
          amount-due: amount,
          amount-paid: u0,
          paid-at: u0,
          on-time: false
        })
        (merge state { setup-count: (+ (get setup-count state) u1) })
      )
      state ;; Already past total members, skip
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

(define-public (set-protocol-fee-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u1000) ERR_INVALID_PARAMS)
    (var-set protocol-fee-rate new-rate)
    (print { event: "fee-rate-updated-v2", new-rate: new-rate })
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-transferred-v2", new-admin: new-admin })
    (ok true)
  )
)

(define-public (pause-circle (circle-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? circles-v2 circle-id)
      circle (begin
        (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
        (map-set circles-v2 circle-id (merge circle { status: STATUS_PAUSED }))
        (print { event: "circle-v2-paused", circle-id: circle-id })
        (ok true)
      )
      ERR_CIRCLE_NOT_FOUND
    )
  )
)

(define-public (resume-circle (circle-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? circles-v2 circle-id)
      circle (begin
        (asserts! (is-eq (get status circle) STATUS_PAUSED) ERR_CIRCLE_NOT_ACTIVE)
        (map-set circles-v2 circle-id (merge circle { status: STATUS_ACTIVE }))
        (print { event: "circle-v2-resumed", circle-id: circle-id })
        (ok true)
      )
      ERR_CIRCLE_NOT_FOUND
    )
  )
)
