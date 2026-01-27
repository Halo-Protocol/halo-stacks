;; halo-circle.clar
;; Core lending circle (ROSCA) logic
;;
;; Lifecycle: FORMING -> ACTIVE -> COMPLETED
;; - Creator creates circle with parameters, becomes member #1
;; - Members join, assigned sequential positions; collateral locked in vault
;; - Circle auto-activates when full
;; - Each round: all members contribute, recipient (by position) gets payout
;; - After all rounds complete, circle status -> COMPLETED, collateral released
;;
;; Token Support:
;; - STX circles: create-circle, contribute-stx, process-payout
;; - SIP-010 circles: create-token-circle, contribute-token, process-payout-token
;;
;; Cross-contract dependencies:
;; - halo-identity: verifies users have bound wallets
;; - halo-credit: records payments and circle completions for scoring
;; - halo-vault: collateral locking/release for circle participation

(use-trait ft-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u200))
(define-constant ERR_CIRCLE_NOT_FOUND (err u201))
(define-constant ERR_CIRCLE_NOT_FORMING (err u202))
(define-constant ERR_CIRCLE_NOT_ACTIVE (err u203))
(define-constant ERR_ALREADY_MEMBER (err u204))
(define-constant ERR_NOT_MEMBER (err u205))
(define-constant ERR_CIRCLE_FULL (err u206))
(define-constant ERR_INVALID_AMOUNT (err u207))
(define-constant ERR_ALREADY_CONTRIBUTED (err u208))
(define-constant ERR_INVALID_ROUND (err u209))
(define-constant ERR_NOT_VERIFIED (err u210))
(define-constant ERR_TRANSFER_FAILED (err u211))
(define-constant ERR_INVALID_PARAMS (err u212))
(define-constant ERR_CONTRIBUTIONS_INCOMPLETE (err u213))
(define-constant ERR_PAYOUT_ALREADY_PROCESSED (err u214))
(define-constant ERR_NOT_PAUSED (err u215))
(define-constant ERR_NOT_FOUND (err u216))
(define-constant ERR_INSUFFICIENT_COLLATERAL (err u217))
(define-constant ERR_TOKEN_MISMATCH (err u218))
(define-constant ERR_INVALID_TOKEN_TYPE (err u219))

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
(define-constant MIN_ROUND_DURATION u144)  ;; ~1 day in blocks
(define-constant MIN_CONTRIBUTION u1000000) ;; 1 STX minimum (in microSTX)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var circle-counter uint u0)
(define-data-var protocol-fee-rate uint u100) ;; 1% = 100 basis points (out of 10000)
(define-data-var temp-circle-id uint u0)       ;; Context for mapped member functions

;; ============================================
;; DATA MAPS
;; ============================================

;; Circle ID -> Circle Data
(define-map circles uint {
  name: (string-ascii 30),
  creator: principal,
  contribution-amount: uint,
  total-members: uint,
  current-round: uint,
  status: uint,
  created-at: uint,
  start-block: uint,
  round-duration: uint,
  grace-period: uint,
  total-contributed: uint,
  total-paid-out: uint,
  token-type: uint,
  token-contract: (optional principal)
})

;; (Circle ID, Member) -> Member Data
(define-map circle-members { circle-id: uint, member: principal } {
  unique-id: (buff 32),
  joined-at: uint,
  payout-position: uint,
  total-contributed: uint,
  has-received-payout: bool
})

;; (Circle ID, Member, Round) -> Contribution record
(define-map contributions { circle-id: uint, member: principal, round: uint } {
  amount: uint,
  contributed-at: uint,
  on-time: bool
})

;; Circle ID -> ordered list of member principals
(define-map circle-member-list uint (list 10 principal))

;; (Circle ID, Round) -> Payout record
(define-map payouts { circle-id: uint, round: uint } {
  recipient: principal,
  amount: uint,
  paid-at: uint
})

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-circle (circle-id uint))
  (map-get? circles circle-id)
)

(define-read-only (get-member (circle-id uint) (member principal))
  (map-get? circle-members { circle-id: circle-id, member: member })
)

(define-read-only (get-contribution (circle-id uint) (member principal) (round uint))
  (map-get? contributions { circle-id: circle-id, member: member, round: round })
)

(define-read-only (get-circle-members (circle-id uint))
  (default-to (list) (map-get? circle-member-list circle-id))
)

(define-read-only (get-payout (circle-id uint) (round uint))
  (map-get? payouts { circle-id: circle-id, round: round })
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

;; Check if user has a bound wallet (verified identity)
(define-read-only (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)

;; Check if a payment would be considered on-time for the current round
(define-read-only (is-payment-on-time (circle-id uint))
  (match (map-get? circles circle-id)
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

;; Get the deadline block for a specific round
(define-read-only (get-round-deadline (circle-id uint) (round uint))
  (match (map-get? circles circle-id)
    circle (some (+ (get start-block circle)
                    (* (+ round u1) (get round-duration circle))))
    none
  )
)

;; Count how many members have contributed in a given round
(define-read-only (count-round-contributions (circle-id uint) (round uint))
  (let (
    (members (get-circle-members circle-id))
  )
    (get count (fold count-member-contribution members
      { circle-id: circle-id, round: round, count: u0 }))
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Create a new STX lending circle
(define-public (create-circle
  (name (string-ascii 30))
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint)
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get circle-counter) u1))
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)

    ;; Validate parameters
    (asserts! (>= total-members MIN_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (<= total-members MAX_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (>= contribution-amount MIN_CONTRIBUTION) ERR_INVALID_AMOUNT)
    (asserts! (>= round-duration MIN_ROUND_DURATION) ERR_INVALID_PARAMS)
    (asserts! (> grace-period u0) ERR_INVALID_PARAMS)

    ;; Create circle (STX type)
    (map-set circles new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: stacks-block-height,
      start-block: u0,
      round-duration: round-duration,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0,
      token-type: TOKEN_TYPE_STX,
      token-contract: none
    })

    ;; Initialize empty member list
    (map-set circle-member-list new-id (list))

    ;; Update counter
    (var-set circle-counter new-id)

    ;; Add creator as member #1
    (try! (internal-add-member new-id caller u1))

    ;; Lock collateral for creator via vault
    (let (
      (commitment-usd (try! (contract-call? .halo-vault calculate-commitment-usd
                              contribution-amount total-members CONTRACT_OWNER)))
    )
      (try! (contract-call? .halo-vault lock-collateral caller new-id commitment-usd))
    )

    (print {
      event: "circle-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      contribution-amount: contribution-amount,
      total-members: total-members,
      round-duration: round-duration,
      grace-period: grace-period,
      token-type: TOKEN_TYPE_STX
    })

    (ok new-id)
  )
)

;; Create a new SIP-010 token lending circle
(define-public (create-token-circle
  (name (string-ascii 30))
  (token <ft-trait>)
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint)
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get circle-counter) u1))
    (token-principal (contract-of token))
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)

    ;; Validate parameters
    (asserts! (>= total-members MIN_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (<= total-members MAX_MEMBERS) ERR_INVALID_PARAMS)
    (asserts! (> contribution-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= round-duration MIN_ROUND_DURATION) ERR_INVALID_PARAMS)
    (asserts! (> grace-period u0) ERR_INVALID_PARAMS)

    ;; Create circle (SIP-010 type)
    (map-set circles new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: stacks-block-height,
      start-block: u0,
      round-duration: round-duration,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0,
      token-type: TOKEN_TYPE_SIP010,
      token-contract: (some token-principal)
    })

    ;; Initialize empty member list
    (map-set circle-member-list new-id (list))

    ;; Update counter
    (var-set circle-counter new-id)

    ;; Add creator as member #1
    (try! (internal-add-member new-id caller u1))

    ;; Lock collateral for creator via vault
    (let (
      (commitment-usd (try! (contract-call? .halo-vault calculate-commitment-usd
                              contribution-amount total-members token-principal)))
    )
      (try! (contract-call? .halo-vault lock-collateral caller new-id commitment-usd))
    )

    (print {
      event: "circle-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      contribution-amount: contribution-amount,
      total-members: total-members,
      round-duration: round-duration,
      grace-period: grace-period,
      token-type: TOKEN_TYPE_SIP010,
      token-contract: token-principal
    })

    (ok new-id)
  )
)

;; Join an existing circle
(define-public (join-circle (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-members (get-circle-members circle-id))
    (member-count (len current-members))
    (new-position (+ member-count u1))
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)

    ;; Check circle is forming
    (asserts! (is-eq (get status circle) STATUS_FORMING) ERR_CIRCLE_NOT_FORMING)

    ;; Check not already a member
    (asserts! (is-none (map-get? circle-members { circle-id: circle-id, member: caller }))
              ERR_ALREADY_MEMBER)

    ;; Check not full
    (asserts! (< member-count (get total-members circle)) ERR_CIRCLE_FULL)

    ;; Lock collateral for this member via vault
    (let (
      (price-key (if (is-eq (get token-type circle) TOKEN_TYPE_STX)
                    CONTRACT_OWNER
                    (unwrap! (get token-contract circle) ERR_INVALID_TOKEN_TYPE)))
      (commitment-usd (try! (contract-call? .halo-vault calculate-commitment-usd
                              (get contribution-amount circle)
                              (get total-members circle)
                              price-key)))
    )
      (try! (contract-call? .halo-vault lock-collateral caller circle-id commitment-usd))
    )

    ;; Add member
    (try! (internal-add-member circle-id caller new-position))

    ;; Auto-activate if full
    (if (is-eq new-position (get total-members circle))
      (try! (internal-activate-circle circle-id))
      true
    )

    (print {
      event: "member-joined",
      circle-id: circle-id,
      member: caller,
      position: new-position
    })

    (ok new-position)
  )
)

;; Make STX contribution for current round
(define-public (contribute-stx (circle-id uint))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: caller })
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (contribution-amount (get contribution-amount circle))
    (on-time (is-payment-on-time circle-id))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Check circle is STX type
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_STX) ERR_TOKEN_MISMATCH)

    ;; Check not already contributed this round
    (asserts! (is-none (map-get? contributions
                                  { circle-id: circle-id, member: caller, round: current-round }))
              ERR_ALREADY_CONTRIBUTED)

    ;; Transfer STX from caller to contract
    (try! (stx-transfer? contribution-amount caller (as-contract tx-sender)))

    ;; Record contribution
    (map-set contributions { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: stacks-block-height,
      on-time: on-time
    })

    ;; Update member totals
    (map-set circle-members { circle-id: circle-id, member: caller }
      (merge member-data {
        total-contributed: (+ (get total-contributed member-data) contribution-amount)
      })
    )

    ;; Update circle totals
    (map-set circles circle-id
      (merge circle {
        total-contributed: (+ (get total-contributed circle) contribution-amount)
      })
    )

    ;; Record payment in credit contract
    (let (
      (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet caller) ERR_NOT_VERIFIED))
    )
      (try! (contract-call? .halo-credit record-payment
             unique-id
             circle-id
             current-round
             contribution-amount
             on-time))
    )

    (print {
      event: "contribution-made",
      circle-id: circle-id,
      member: caller,
      round: current-round,
      amount: contribution-amount,
      on-time: on-time
    })

    (ok true)
  )
)

;; Make SIP-010 token contribution for current round
(define-public (contribute-token (circle-id uint) (token <ft-trait>))
  (let (
    (caller tx-sender)
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: caller })
                          ERR_NOT_MEMBER))
    (current-round (get current-round circle))
    (contribution-amount (get contribution-amount circle))
    (on-time (is-payment-on-time circle-id))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Check circle is SIP-010 type
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)

    ;; Check token matches circle's token
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)

    ;; Check not already contributed this round
    (asserts! (is-none (map-get? contributions
                                  { circle-id: circle-id, member: caller, round: current-round }))
              ERR_ALREADY_CONTRIBUTED)

    ;; Transfer tokens from caller to contract
    (try! (contract-call? token transfer contribution-amount caller (as-contract tx-sender) none))

    ;; Record contribution
    (map-set contributions { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: stacks-block-height,
      on-time: on-time
    })

    ;; Update member totals
    (map-set circle-members { circle-id: circle-id, member: caller }
      (merge member-data {
        total-contributed: (+ (get total-contributed member-data) contribution-amount)
      })
    )

    ;; Update circle totals
    (map-set circles circle-id
      (merge circle {
        total-contributed: (+ (get total-contributed circle) contribution-amount)
      })
    )

    ;; Record payment in credit contract
    (let (
      (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet caller) ERR_NOT_VERIFIED))
    )
      (try! (contract-call? .halo-credit record-payment
             unique-id
             circle-id
             current-round
             contribution-amount
             on-time))
    )

    (print {
      event: "contribution-made",
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

;; Process STX payout for current round (anyone can call when all have contributed)
(define-public (process-payout (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (gross-payout (* contribution-amount total-members))
    (protocol-fee (/ (* gross-payout (var-get protocol-fee-rate)) u10000))
    (net-payout (- gross-payout protocol-fee))
    (contribution-count (count-round-contributions circle-id current-round))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Check circle is STX type
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_STX) ERR_TOKEN_MISMATCH)

    ;; Check payout not already processed for this round
    (asserts! (is-none (map-get? payouts { circle-id: circle-id, round: current-round }))
              ERR_PAYOUT_ALREADY_PROCESSED)

    ;; Check ALL members have contributed
    (asserts! (is-eq contribution-count total-members) ERR_CONTRIBUTIONS_INCOMPLETE)

    ;; Find recipient for this round (0-indexed in list)
    (let (
      (recipient (unwrap! (element-at? members current-round) ERR_NOT_FOUND))
    )
      ;; Transfer net payout to recipient
      (try! (as-contract (stx-transfer? net-payout tx-sender recipient)))

      ;; Transfer protocol fee to admin (if any)
      (if (> protocol-fee u0)
        (try! (as-contract (stx-transfer? protocol-fee tx-sender (var-get admin))))
        true
      )

      ;; Record payout
      (map-set payouts { circle-id: circle-id, round: current-round } {
        recipient: recipient,
        amount: net-payout,
        paid-at: stacks-block-height
      })

      ;; Update member payout status
      (let (
        (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: recipient })
                              ERR_NOT_MEMBER))
      )
        (map-set circle-members { circle-id: circle-id, member: recipient }
          (merge member-data { has-received-payout: true })
        )
      )

      ;; Advance to next round
      (let (
        (next-round (+ current-round u1))
      )
        (map-set circles circle-id
          (merge circle {
            total-paid-out: (+ (get total-paid-out circle) net-payout),
            current-round: next-round
          })
        )

        ;; Check if circle is complete (all rounds done)
        (if (>= next-round total-members)
          (try! (internal-complete-circle circle-id))
          true
        )
      )

      (print {
        event: "payout-processed",
        circle-id: circle-id,
        round: current-round,
        recipient: recipient,
        gross-amount: gross-payout,
        net-amount: net-payout,
        protocol-fee: protocol-fee
      })

      (ok net-payout)
    )
  )
)

;; Process SIP-010 token payout for current round
(define-public (process-payout-token (circle-id uint) (token <ft-trait>))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (gross-payout (* contribution-amount total-members))
    (protocol-fee (/ (* gross-payout (var-get protocol-fee-rate)) u10000))
    (net-payout (- gross-payout protocol-fee))
    (contribution-count (count-round-contributions circle-id current-round))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)

    ;; Check circle is SIP-010 type
    (asserts! (is-eq (get token-type circle) TOKEN_TYPE_SIP010) ERR_INVALID_TOKEN_TYPE)

    ;; Check token matches circle's token
    (asserts! (is-eq (some (contract-of token)) (get token-contract circle)) ERR_TOKEN_MISMATCH)

    ;; Check payout not already processed
    (asserts! (is-none (map-get? payouts { circle-id: circle-id, round: current-round }))
              ERR_PAYOUT_ALREADY_PROCESSED)

    ;; Check ALL members have contributed
    (asserts! (is-eq contribution-count total-members) ERR_CONTRIBUTIONS_INCOMPLETE)

    ;; Find recipient
    (let (
      (recipient (unwrap! (element-at? members current-round) ERR_NOT_FOUND))
    )
      ;; Transfer net payout to recipient
      (try! (as-contract (contract-call? token transfer net-payout tx-sender recipient none)))

      ;; Transfer protocol fee to admin
      (if (> protocol-fee u0)
        (try! (as-contract (contract-call? token transfer protocol-fee tx-sender (var-get admin) none)))
        true
      )

      ;; Record payout
      (map-set payouts { circle-id: circle-id, round: current-round } {
        recipient: recipient,
        amount: net-payout,
        paid-at: stacks-block-height
      })

      ;; Update member payout status
      (let (
        (member-data (unwrap! (map-get? circle-members { circle-id: circle-id, member: recipient })
                              ERR_NOT_MEMBER))
      )
        (map-set circle-members { circle-id: circle-id, member: recipient }
          (merge member-data { has-received-payout: true })
        )
      )

      ;; Advance to next round
      (let (
        (next-round (+ current-round u1))
      )
        (map-set circles circle-id
          (merge circle {
            total-paid-out: (+ (get total-paid-out circle) net-payout),
            current-round: next-round
          })
        )

        ;; Check if circle is complete
        (if (>= next-round total-members)
          (try! (internal-complete-circle circle-id))
          true
        )
      )

      (print {
        event: "payout-processed",
        circle-id: circle-id,
        round: current-round,
        recipient: recipient,
        gross-amount: gross-payout,
        net-amount: net-payout,
        protocol-fee: protocol-fee,
        token-type: TOKEN_TYPE_SIP010
      })

      (ok net-payout)
    )
  )
)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Add a member to a circle
(define-private (internal-add-member (circle-id uint) (member principal) (position uint))
  (let (
    (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet member) ERR_NOT_VERIFIED))
    (current-members (get-circle-members circle-id))
  )
    ;; Add to member data map
    (map-set circle-members { circle-id: circle-id, member: member } {
      unique-id: unique-id,
      joined-at: stacks-block-height,
      payout-position: position,
      total-contributed: u0,
      has-received-payout: false
    })

    ;; Add to ordered member list
    (map-set circle-member-list circle-id
      (unwrap! (as-max-len? (append current-members member) u10) ERR_CIRCLE_FULL))

    (ok true)
  )
)

;; Activate a circle (called when full)
(define-private (internal-activate-circle (circle-id uint))
  (match (map-get? circles circle-id)
    circle (begin
      (map-set circles circle-id
        (merge circle {
          status: STATUS_ACTIVE,
          start-block: stacks-block-height
        })
      )
      (print {
        event: "circle-activated",
        circle-id: circle-id,
        start-block: stacks-block-height
      })
      (ok true)
    )
    ERR_CIRCLE_NOT_FOUND
  )
)

;; Complete a circle (all rounds done)
(define-private (internal-complete-circle (circle-id uint))
  (match (map-get? circles circle-id)
    circle (begin
      (map-set circles circle-id
        (merge circle { status: STATUS_COMPLETED })
      )

      ;; Set context for mapped functions
      (var-set temp-circle-id circle-id)

      ;; Release collateral and record completion for all members
      (let (
        (members (get-circle-members circle-id))
      )
        (map internal-complete-member members)
      )

      (print {
        event: "circle-completed",
        circle-id: circle-id
      })

      (ok true)
    )
    ERR_CIRCLE_NOT_FOUND
  )
)

;; Release collateral and record credit completion for a single member (used with map)
(define-private (internal-complete-member (member principal))
  (let (
    (cid (var-get temp-circle-id))
  )
    (begin
      ;; Release collateral in vault
      (match (contract-call? .halo-vault release-collateral member cid)
        success true
        error false
      )
      ;; Record credit completion
      (match (contract-call? .halo-identity get-id-by-wallet member)
        unique-id (match (contract-call? .halo-credit record-circle-completion unique-id true)
          success true
          error false
        )
        false
      )
    )
  )
)

;; Helper: count a member's contribution for fold
(define-private (count-member-contribution
  (member principal)
  (state { circle-id: uint, round: uint, count: uint })
)
  (if (is-some (map-get? contributions {
        circle-id: (get circle-id state),
        member: member,
        round: (get round state)
      }))
    (merge state { count: (+ (get count state) u1) })
    state
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Set protocol fee rate (basis points, max 10% = 1000)
(define-public (set-protocol-fee-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u1000) ERR_INVALID_PARAMS)
    (var-set protocol-fee-rate new-rate)
    (print { event: "fee-rate-updated", new-rate: new-rate })
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

;; Emergency: pause an active circle
(define-public (pause-circle (circle-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? circles circle-id)
      circle (begin
        (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
        (map-set circles circle-id (merge circle { status: STATUS_PAUSED }))
        (print { event: "circle-paused", circle-id: circle-id })
        (ok true)
      )
      ERR_CIRCLE_NOT_FOUND
    )
  )
)

;; Resume a paused circle
(define-public (resume-circle (circle-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? circles circle-id)
      circle (begin
        (asserts! (is-eq (get status circle) STATUS_PAUSED)
                  ERR_NOT_PAUSED)
        (map-set circles circle-id (merge circle { status: STATUS_ACTIVE }))
        (print { event: "circle-resumed", circle-id: circle-id })
        (ok true)
      )
      ERR_CIRCLE_NOT_FOUND
    )
  )
)
