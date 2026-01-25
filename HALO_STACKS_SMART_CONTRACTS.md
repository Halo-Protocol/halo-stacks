# Halo Protocol: Smart Contracts (Clarity)

**Version:** 2.0.0
**Date:** February 2026
**Target:** Stacks Mainnet

---

## Overview

Halo Protocol consists of eight Clarity smart contracts (5 core + 3 supporting):

| Contract | Purpose |
|----------|---------|
| `halo-identity` | User identity and wallet binding |
| `halo-credit` | On-chain credit scoring (6 components including staking) |
| `halo-vault` | Collateral vault with LTV, price oracle, and yield |
| `halo-sbtc-staking` | sBTC staking for rewards and credit score boosts |
| `halo-circle` | Lending circle logic (multi-token + collateral) |
| `halo-sip010-trait` | SIP-010 fungible token trait definition |
| `halo-mock-token` | Mock hUSD stablecoin for testing (6 decimals) |
| `halo-mock-sbtc` | Mock sBTC token for testing (8 decimals) |

### Architecture

```
                    ┌───────────────────┐
                    │  halo-identity    │
                    │  (wallet binding) │
                    └────────┬──────────┘
           ┌─────────────────┼─────────────────┐
           │                 │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │ halo-circle │──▶│ halo-credit │◀──│ halo-sbtc-  │
    │ (multi-tok) │   │  (scoring)  │   │  staking    │
    └──┬──────┬───┘   └─────────────┘   └──────┬──────┘
       │      │                                 │
    ┌──▼──┐ ┌─▼──────────┐              ┌──────▼──────┐
    │ STX │ │ halo-vault  │              │ mock-sbtc / │
    │     │ │ (collateral │              │ real sBTC   │
    └─────┘ │ + oracle    │              └─────────────┘
            │ + yield)    │
            └──────┬──────┘
            ┌──────▼──────┐
            │ mock-token  │
            │ (hUSD)      │
            └─────────────┘
```

> **Note:** The inline Clarity code below represents the original design specifications. For the actual deployed contract code (which includes Phase 2.5 updates like multi-token circles, collateral integration, and staking credit components), see the source files in `contracts/`. Refer to `docs/CONTRACT_REFERENCE.md` for the current API reference.

---

## 1. Identity Contract

**File:** `contracts/halo-identity.clar`

```clarity
;; halo-identity.clar
;; Manages user identity and wallet bindings
;; 
;; Key Features:
;; - One-time permanent wallet binding
;; - Bidirectional mapping (ID <-> Wallet)
;; - Sybil resistance via unique IDs

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_ALREADY_BOUND (err u101))
(define-constant ERR_WALLET_ALREADY_USED (err u102))
(define-constant ERR_NOT_FOUND (err u103))
(define-constant ERR_INVALID_ID (err u104))

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var total-users uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

;; Unique ID -> Wallet Principal (one-way binding)
(define-map id-to-wallet (buff 32) principal)

;; Wallet Principal -> Unique ID (reverse lookup)
(define-map wallet-to-id principal (buff 32))

;; User metadata (off-chain reference)
(define-map user-metadata (buff 32) {
  registered-at: uint,
  is-active: bool
})

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get wallet for unique ID
(define-read-only (get-wallet-by-id (unique-id (buff 32)))
  (map-get? id-to-wallet unique-id)
)

;; Get unique ID for wallet
(define-read-only (get-id-by-wallet (wallet principal))
  (map-get? wallet-to-id wallet)
)

;; Check if unique ID has wallet bound
(define-read-only (is-id-bound (unique-id (buff 32)))
  (is-some (map-get? id-to-wallet unique-id))
)

;; Check if wallet is bound to any ID
(define-read-only (is-wallet-bound (wallet principal))
  (is-some (map-get? wallet-to-id wallet))
)

;; Get user metadata
(define-read-only (get-user-metadata (unique-id (buff 32)))
  (map-get? user-metadata unique-id)
)

;; Get total registered users
(define-read-only (get-total-users)
  (var-get total-users)
)

;; Get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Bind wallet to unique ID (ONE TIME ONLY)
;; Called by user with their wallet
(define-public (bind-wallet (unique-id (buff 32)))
  (let (
    (caller tx-sender)
  )
    ;; Validate unique ID length (32 bytes)
    (asserts! (is-eq (len unique-id) u32) ERR_INVALID_ID)
    
    ;; Check if unique ID already has wallet bound
    (asserts! (is-none (map-get? id-to-wallet unique-id)) ERR_ALREADY_BOUND)
    
    ;; Check if wallet is already bound to another ID
    (asserts! (is-none (map-get? wallet-to-id caller)) ERR_WALLET_ALREADY_USED)
    
    ;; Store bidirectional mapping
    (map-set id-to-wallet unique-id caller)
    (map-set wallet-to-id caller unique-id)
    
    ;; Store metadata
    (map-set user-metadata unique-id {
      registered-at: block-height,
      is-active: true
    })
    
    ;; Increment user count
    (var-set total-users (+ (var-get total-users) u1))
    
    ;; Emit event via print
    (print {
      event: "wallet-bound",
      unique-id: unique-id,
      wallet: caller,
      block: block-height
    })
    
    (ok true)
  )
)

;; Admin function to deactivate user (does not unbind)
(define-public (deactivate-user (unique-id (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (map-get? user-metadata unique-id)) ERR_NOT_FOUND)
    
    (match (map-get? user-metadata unique-id)
      metadata (begin
        (map-set user-metadata unique-id 
          (merge metadata { is-active: false })
        )
        (print {
          event: "user-deactivated",
          unique-id: unique-id
        })
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Reactivate user
(define-public (reactivate-user (unique-id (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (map-get? user-metadata unique-id)) ERR_NOT_FOUND)
    
    (match (map-get? user-metadata unique-id)
      metadata (begin
        (map-set user-metadata unique-id 
          (merge metadata { is-active: true })
        )
        (print {
          event: "user-reactivated",
          unique-id: unique-id
        })
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Transfer admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print {
      event: "admin-transferred",
      old-admin: tx-sender,
      new-admin: new-admin
    })
    (ok true)
  )
)
```

---

## 2. Circle Contract

**File:** `contracts/halo-circle.clar`

```clarity
;; halo-circle.clar
;; Core lending circle logic
;;
;; Key Features:
;; - Create circles with configurable parameters
;; - Member management with position assignment
;; - Contribution tracking with on-time detection
;; - Automatic payout processing
;; - Integration with identity and credit contracts

;; ============================================
;; TRAITS
;; ============================================

;; Use SIP-010 trait for token interaction
(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

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
(define-constant ERR_INSUFFICIENT_BALANCE (err u211))
(define-constant ERR_TRANSFER_FAILED (err u212))
(define-constant ERR_INVALID_PARAMS (err u213))
(define-constant ERR_CONTRIBUTIONS_INCOMPLETE (err u214))

;; Circle status constants
(define-constant STATUS_FORMING u0)
(define-constant STATUS_ACTIVE u1)
(define-constant STATUS_PAUSED u2)
(define-constant STATUS_COMPLETED u3)
(define-constant STATUS_DISSOLVED u4)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var circle-counter uint u0)
(define-data-var identity-contract principal CONTRACT_OWNER)
(define-data-var credit-contract principal CONTRACT_OWNER)
(define-data-var protocol-fee-rate uint u100) ;; 1% = 100 basis points

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
  round-duration: uint,     ;; blocks per round (~4320 = 30 days)
  grace-period: uint,       ;; blocks for late payment (~144 = 1 day)
  total-contributed: uint,
  total-paid-out: uint
})

;; (Circle ID, Member Principal) -> Member Data
(define-map circle-members { circle-id: uint, member: principal } {
  unique-id: (buff 32),
  joined-at: uint,
  payout-position: uint,
  total-contributed: uint,
  has-received-payout: bool
})

;; (Circle ID, Member Principal, Round) -> Contribution
(define-map contributions { circle-id: uint, member: principal, round: uint } {
  amount: uint,
  contributed-at: uint,
  on-time: bool
})

;; Circle ID -> List of member principals (max 10)
(define-map circle-member-list uint (list 10 principal))

;; (Circle ID, Round) -> Payout info
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

;; Check if user is verified (has bound wallet in identity contract)
(define-read-only (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)

;; Get round deadline block
(define-read-only (get-round-deadline (circle-id uint) (round uint))
  (match (map-get? circles circle-id)
    circle (some (+ (get start-block circle) 
                    (* (+ round u1) (get round-duration circle))))
    none
  )
)

;; Check if payment is on-time for current round
(define-read-only (is-payment-on-time (circle-id uint))
  (match (map-get? circles circle-id)
    circle (let (
      (round-start (+ (get start-block circle) 
                      (* (get current-round circle) (get round-duration circle))))
      (grace-deadline (+ round-start (get grace-period circle)))
    )
      (<= block-height grace-deadline)
    )
    false
  )
)

;; Count contributions for a specific round
(define-read-only (count-round-contributions (circle-id uint) (round uint))
  (let (
    (members (get-circle-members circle-id))
  )
    (fold count-member-contribution members { circle-id: circle-id, round: round, count: u0 })
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Create a new lending circle
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
    ;; Verify caller has bound wallet (is verified)
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    
    ;; Validate parameters
    (asserts! (and (>= total-members u3) (<= total-members u10)) ERR_INVALID_PARAMS)
    (asserts! (> contribution-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= round-duration u144) ERR_INVALID_PARAMS) ;; Min 1 day
    (asserts! (> grace-period u0) ERR_INVALID_PARAMS)
    
    ;; Create circle
    (map-set circles new-id {
      name: name,
      creator: caller,
      contribution-amount: contribution-amount,
      total-members: total-members,
      current-round: u0,
      status: STATUS_FORMING,
      created-at: block-height,
      start-block: u0,
      round-duration: round-duration,
      grace-period: grace-period,
      total-contributed: u0,
      total-paid-out: u0
    })
    
    ;; Initialize empty member list
    (map-set circle-member-list new-id (list))
    
    ;; Update counter
    (var-set circle-counter new-id)
    
    ;; Add creator as first member (position 1)
    (try! (internal-add-member new-id caller u1))
    
    (print {
      event: "circle-created",
      circle-id: new-id,
      creator: caller,
      name: name,
      contribution-amount: contribution-amount,
      total-members: total-members
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
  )
    ;; Verify caller has bound wallet
    (asserts! (is-verified caller) ERR_NOT_VERIFIED)
    
    ;; Check circle is still forming
    (asserts! (is-eq (get status circle) STATUS_FORMING) ERR_CIRCLE_NOT_FORMING)
    
    ;; Check not already a member
    (asserts! (is-none (map-get? circle-members { circle-id: circle-id, member: caller })) 
              ERR_ALREADY_MEMBER)
    
    ;; Check not full
    (asserts! (< member-count (get total-members circle)) ERR_CIRCLE_FULL)
    
    ;; Add member with next position
    (let (
      (new-position (+ member-count u1))
    )
      (try! (internal-add-member circle-id caller new-position))
      
      ;; Check if circle is now full, auto-activate
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
)

;; Make contribution for current round (STX version)
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
    
    ;; Check not already contributed this round
    (asserts! (is-none (map-get? contributions 
                                  { circle-id: circle-id, member: caller, round: current-round })) 
              ERR_ALREADY_CONTRIBUTED)
    
    ;; Transfer STX from caller to contract
    (try! (stx-transfer? contribution-amount caller (as-contract tx-sender)))
    
    ;; Record contribution
    (map-set contributions { circle-id: circle-id, member: caller, round: current-round } {
      amount: contribution-amount,
      contributed-at: block-height,
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

;; Process payout for completed round (anyone can call when all contributed)
(define-public (process-payout-stx (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles circle-id) ERR_CIRCLE_NOT_FOUND))
    (current-round (get current-round circle))
    (members (get-circle-members circle-id))
    (total-members (get total-members circle))
    (contribution-amount (get contribution-amount circle))
    (gross-payout (* contribution-amount total-members))
    (protocol-fee (/ (* gross-payout (var-get protocol-fee-rate)) u10000))
    (net-payout (- gross-payout protocol-fee))
    (contribution-count (get count (count-round-contributions circle-id current-round)))
  )
    ;; Check circle is active
    (asserts! (is-eq (get status circle) STATUS_ACTIVE) ERR_CIRCLE_NOT_ACTIVE)
    
    ;; Check all members have contributed
    (asserts! (is-eq contribution-count total-members) ERR_CONTRIBUTIONS_INCOMPLETE)
    
    ;; Find recipient for this round (0-indexed in list, 1-indexed position)
    (let (
      (recipient (unwrap! (element-at members current-round) ERR_NOT_FOUND))
    )
      ;; Transfer net payout to recipient
      (try! (as-contract (stx-transfer? net-payout tx-sender recipient)))
      
      ;; Transfer protocol fee to admin
      (if (> protocol-fee u0)
        (try! (as-contract (stx-transfer? protocol-fee tx-sender (var-get admin))))
        true
      )
      
      ;; Record payout
      (map-set payouts { circle-id: circle-id, round: current-round } {
        recipient: recipient,
        amount: net-payout,
        paid-at: block-height
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
        protocol-fee: protocol-fee
      })
      
      (ok net-payout)
    )
  )
)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

(define-private (internal-add-member (circle-id uint) (member principal) (position uint))
  (let (
    (unique-id (unwrap! (contract-call? .halo-identity get-id-by-wallet member) ERR_NOT_VERIFIED))
    (current-members (get-circle-members circle-id))
  )
    ;; Add to member data
    (map-set circle-members { circle-id: circle-id, member: member } {
      unique-id: unique-id,
      joined-at: block-height,
      payout-position: position,
      total-contributed: u0,
      has-received-payout: false
    })
    
    ;; Add to member list
    (map-set circle-member-list circle-id 
      (unwrap! (as-max-len? (append current-members member) u10) ERR_CIRCLE_FULL))
    
    (ok true)
  )
)

(define-private (internal-activate-circle (circle-id uint))
  (match (map-get? circles circle-id)
    circle (begin
      (map-set circles circle-id
        (merge circle { 
          status: STATUS_ACTIVE,
          start-block: block-height
        })
      )
      (print {
        event: "circle-activated",
        circle-id: circle-id,
        start-block: block-height
      })
      (ok true)
    )
    ERR_CIRCLE_NOT_FOUND
  )
)

(define-private (internal-complete-circle (circle-id uint))
  (match (map-get? circles circle-id)
    circle (begin
      ;; Update status
      (map-set circles circle-id
        (merge circle { status: STATUS_COMPLETED })
      )
      
      ;; Record completion for all members in credit contract
      (let (
        (members (get-circle-members circle-id))
      )
        (map internal-record-member-completion members)
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

(define-private (internal-record-member-completion (member principal))
  (match (contract-call? .halo-identity get-id-by-wallet member)
    unique-id (begin
      (contract-call? .halo-credit record-circle-completion unique-id true)
      true
    )
    false
  )
)

;; Helper for counting contributions
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

(define-public (set-protocol-fee-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u1000) ERR_INVALID_PARAMS) ;; Max 10%
    (var-set protocol-fee-rate new-rate)
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)

;; Emergency pause circle
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

;; Resume paused circle
(define-public (resume-circle (circle-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? circles circle-id)
      circle (begin
        (asserts! (is-eq (get status circle) STATUS_PAUSED) ERR_CIRCLE_NOT_ACTIVE)
        (map-set circles circle-id (merge circle { status: STATUS_ACTIVE }))
        (print { event: "circle-resumed", circle-id: circle-id })
        (ok true)
      )
      ERR_CIRCLE_NOT_FOUND
    )
  )
)
```

---

## 3. Credit Contract

**File:** `contracts/halo-credit.clar`

```clarity
;; halo-credit.clar
;; Credit scoring and history tracking
;;
;; Key Features:
;; - Score range: 300-850 (FICO-like)
;; - Component-based scoring
;; - Payment history tracking
;; - SDK query functions for external protocols

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_NOT_FOUND (err u301))
(define-constant ERR_INVALID_SCORE (err u302))

;; Score bounds
(define-constant MIN_SCORE u300)
(define-constant MAX_SCORE u850)
(define-constant INITIAL_SCORE u300)
(define-constant MAX_EARNED u550)

;; Score component weights (percentages)
(define-constant PAYMENT_HISTORY_WEIGHT u40)
(define-constant CIRCLE_COMPLETION_WEIGHT u25)
(define-constant VOLUME_WEIGHT u15)
(define-constant TENURE_WEIGHT u10)
(define-constant CONSISTENCY_WEIGHT u10)

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
  last-updated: uint
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
    score-data (ok (some (get score score-data)))
    (ok none)
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

;; Get score by wallet (convenience function for SDK)
(define-read-only (get-score-by-wallet (wallet principal))
  (match (contract-call? .halo-identity get-id-by-wallet wallet)
    unique-id (match (map-get? credit-scores unique-id)
      score-data (ok (some (get score score-data)))
      (ok (some INITIAL_SCORE))
    )
    (ok none)
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
  (is-some (index-of (var-get authorized-contracts) caller))
)

;; Get score tier (for display)
(define-read-only (get-score-tier (score uint))
  (if (>= score u750)
    "Excellent"
    (if (>= score u650)
      "Good"
      (if (>= score u550)
        "Fair"
        "Poor"
      )
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Record a payment (called by circle contract)
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
    ;; Verify caller is authorized (circle contract)
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)
    
    ;; Get or create credit data
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
    )
      ;; Calculate new score
      (let (
        (new-score (calculate-score 
                     new-on-time 
                     new-late 
                     new-total 
                     (get circles-completed current-data)
                     (get circles-defaulted current-data)
                     new-volume
                     (get first-activity current-data)))
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
          last-updated: block-height
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
)

;; Record circle completion
(define-public (record-circle-completion (unique-id (buff 32)) (completed-successfully bool))
  (let (
    (caller contract-caller)
  )
    ;; Verify caller is authorized
    (asserts! (is-authorized caller) ERR_NOT_AUTHORIZED)
    
    (match (map-get? credit-scores unique-id)
      current-data (let (
        (new-completed (if completed-successfully
                          (+ (get circles-completed current-data) u1)
                          (get circles-completed current-data)))
        (new-defaulted (if completed-successfully
                          (get circles-defaulted current-data)
                          (+ (get circles-defaulted current-data) u1)))
      )
        ;; Calculate new score
        (let (
          (new-score (calculate-score 
                       (get on-time-payments current-data)
                       (get late-payments current-data)
                       (get total-payments current-data)
                       new-completed
                       new-defaulted
                       (get total-volume current-data)
                       (get first-activity current-data)))
        )
          (map-set credit-scores unique-id
            (merge current-data {
              score: new-score,
              circles-completed: new-completed,
              circles-defaulted: new-defaulted,
              last-updated: block-height
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
      ;; No existing data - create new
      (let (
        (new-data {
          score: (if completed-successfully (+ INITIAL_SCORE u50) (- INITIAL_SCORE u50)),
          total-payments: u0,
          on-time-payments: u0,
          late-payments: u0,
          circles-completed: (if completed-successfully u1 u0),
          circles-defaulted: (if completed-successfully u0 u1),
          total-volume: u0,
          first-activity: block-height,
          last-updated: block-height
        })
      )
        (map-set credit-scores unique-id new-data)
        (ok (get score new-data))
      )
    )
  )
)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Get or create credit data
(define-private (get-or-create-credit-data (unique-id (buff 32)))
  (default-to {
    score: INITIAL_SCORE,
    total-payments: u0,
    on-time-payments: u0,
    late-payments: u0,
    circles-completed: u0,
    circles-defaulted: u0,
    total-volume: u0,
    first-activity: block-height,
    last-updated: block-height
  } (map-get? credit-scores unique-id))
)

;; Add payment to history
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
      block: block-height 
    })
    (updated-history (unwrap! (as-max-len? (append history new-record) u100) false))
  )
    (map-set payment-history unique-id updated-history)
    true
  )
)

;; Calculate credit score based on all factors
(define-private (calculate-score 
  (on-time uint) 
  (late uint) 
  (total-payments uint)
  (completed uint)
  (defaulted uint)
  (volume uint)
  (first-activity uint)
)
  (let (
    ;; 1. Payment History (40% weight) - max 220 pts
    (payment-ratio (if (> total-payments u0)
                      (/ (* on-time u100) total-payments)
                      u100))
    (payment-score (/ (* payment-ratio PAYMENT_HISTORY_WEIGHT MAX_EARNED) u10000))
    
    ;; 2. Circle Completion (25% weight) - max 137 pts
    (total-circles (+ completed defaulted))
    (completion-ratio (if (> total-circles u0)
                         (/ (* completed u100) total-circles)
                         u100))
    (completion-score (/ (* completion-ratio CIRCLE_COMPLETION_WEIGHT MAX_EARNED) u10000))
    
    ;; 3. Volume (15% weight) - max 82 pts
    (volume-tier (get-volume-tier volume))
    (volume-score (/ (* volume-tier VOLUME_WEIGHT MAX_EARNED) u10000))
    
    ;; 4. Tenure (10% weight) - max 55 pts
    (blocks-active (- block-height first-activity))
    (tenure-tier (get-tenure-tier blocks-active))
    (tenure-score (/ (* tenure-tier TENURE_WEIGHT MAX_EARNED) u10000))
    
    ;; 5. Consistency (10% weight) - max 55 pts
    (consistency-tier (if (is-eq late u0) u100 
                         (if (< late u3) u50 u25)))
    (consistency-score (/ (* consistency-tier CONSISTENCY_WEIGHT MAX_EARNED) u10000))
    
    ;; Total = base + earned (capped at MAX_SCORE)
    (total (+ MIN_SCORE (+ payment-score (+ completion-score 
                         (+ volume-score (+ tenure-score consistency-score))))))
  )
    (if (> total MAX_SCORE) MAX_SCORE total)
  )
)

;; Get volume tier (0-100)
(define-private (get-volume-tier (volume uint))
  (if (> volume u100000000000) u100    ;; $1000+ in microunits
    (if (> volume u10000000000) u75    ;; $100+
    (if (> volume u1000000000) u50     ;; $10+
    u25)))
)

;; Get tenure tier (0-100)
(define-private (get-tenure-tier (blocks uint))
  (let (
    (months (/ blocks u4320))  ;; ~4320 blocks per month
  )
    (if (> months u12) u100
      (if (> months u6) u75
      (if (> months u3) u50
      u25)))
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

(define-public (authorize-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (let (
      (current (var-get authorized-contracts))
    )
      (var-set authorized-contracts 
        (unwrap! (as-max-len? (append current contract) u10) ERR_NOT_AUTHORIZED))
      (print {
        event: "contract-authorized",
        contract: contract
      })
      (ok true)
    )
  )
)

(define-public (remove-authorized-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    ;; Note: Clarity doesn't have native list removal, would need custom logic
    ;; For MVP, this is acceptable limitation
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)
```

---

## 4. Test Examples

**File:** `tests/halo-identity_test.ts`

```typescript
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Clarinet.test({
  name: "Can bind wallet to unique ID",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const uniqueId = '0x' + '1234'.repeat(16); // 32 bytes
    
    let block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from(uniqueId.slice(2), 'hex'))
      ], wallet1.address),
    ]);
    
    block.receipts[0].result.expectOk().expectBool(true);
    
    // Verify mapping
    let result = chain.callReadOnlyFn(
      'halo-identity',
      'get-wallet-by-id',
      [types.buff(Buffer.from(uniqueId.slice(2), 'hex'))],
      wallet1.address
    );
    
    result.result.expectSome().expectPrincipal(wallet1.address);
  },
});

Clarinet.test({
  name: "Cannot bind same wallet twice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const uniqueId1 = '0x' + '1111'.repeat(16);
    const uniqueId2 = '0x' + '2222'.repeat(16);
    
    let block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from(uniqueId1.slice(2), 'hex'))
      ], wallet1.address),
    ]);
    
    block.receipts[0].result.expectOk();
    
    // Try to bind again with different ID
    block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from(uniqueId2.slice(2), 'hex'))
      ], wallet1.address),
    ]);
    
    // Should fail with ERR_WALLET_ALREADY_USED (102)
    block.receipts[0].result.expectErr().expectUint(102);
  },
});

Clarinet.test({
  name: "Cannot bind to same unique ID twice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const uniqueId = '0x' + 'abcd'.repeat(16);
    
    let block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from(uniqueId.slice(2), 'hex'))
      ], wallet1.address),
    ]);
    
    block.receipts[0].result.expectOk();
    
    // Try to bind same ID to different wallet
    block = chain.mineBlock([
      Tx.contractCall('halo-identity', 'bind-wallet', [
        types.buff(Buffer.from(uniqueId.slice(2), 'hex'))
      ], wallet2.address),
    ]);
    
    // Should fail with ERR_ALREADY_BOUND (101)
    block.receipts[0].result.expectErr().expectUint(101);
  },
});
```

---

## 5. Deployment Configuration

**File:** `deployments/testnet.yaml`

```yaml
---
id: 0
name: Halo Protocol Testnet Deployment
network: testnet
stacks-node: "https://api.testnet.hiro.so"
bitcoin-node: "https://blockstream.info/testnet/api"
plan:
  batches:
    - id: 0
      transactions:
        - contract-publish:
            contract-name: halo-identity
            expected-sender: ST...
            cost: 100000
            path: contracts/halo-identity.clar
            anchor-block-only: true
        - contract-publish:
            contract-name: halo-credit
            expected-sender: ST...
            cost: 100000
            path: contracts/halo-credit.clar
            anchor-block-only: true
        - contract-publish:
            contract-name: halo-circle
            expected-sender: ST...
            cost: 150000
            path: contracts/halo-circle.clar
            anchor-block-only: true
    - id: 1
      transactions:
        # Authorize circle contract in credit contract
        - contract-call:
            contract-id: ST....halo-credit
            expected-sender: ST...
            method: authorize-contract
            parameters:
              - "'ST....halo-circle"
            cost: 10000
```

---

## 6. Contract Interaction Examples

### Bind Wallet (Frontend)

```typescript
import { openContractCall } from '@stacks/connect';
import { bufferCV } from '@stacks/transactions';

async function bindWallet(uniqueId: string) {
  await openContractCall({
    contractAddress: 'SP...',
    contractName: 'halo-identity',
    functionName: 'bind-wallet',
    functionArgs: [
      bufferCV(Buffer.from(uniqueId.slice(2), 'hex'))
    ],
    onFinish: (data) => {
      console.log('Binding TX:', data.txId);
    },
  });
}
```

### Create Circle (Frontend)

```typescript
import { openContractCall } from '@stacks/connect';
import { stringAsciiCV, uintCV } from '@stacks/transactions';

async function createCircle(
  name: string,
  amount: number,
  members: number,
  durationBlocks: number,
  gracePeriodBlocks: number
) {
  await openContractCall({
    contractAddress: 'SP...',
    contractName: 'halo-circle',
    functionName: 'create-circle',
    functionArgs: [
      stringAsciiCV(name),
      uintCV(amount * 1_000_000), // Convert to microSTX
      uintCV(members),
      uintCV(durationBlocks),
      uintCV(gracePeriodBlocks),
    ],
    onFinish: (data) => {
      console.log('Circle TX:', data.txId);
    },
  });
}
```

### Query Credit Score (SDK)

```typescript
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';

async function getCreditScore(wallet: string): Promise<number | null> {
  const result = await callReadOnlyFunction({
    contractAddress: 'SP...',
    contractName: 'halo-credit',
    functionName: 'get-score-by-wallet',
    functionArgs: [standardPrincipalCV(wallet)],
    network: 'mainnet',
    senderAddress: wallet,
  });
  
  const json = cvToJSON(result);
  return json.value?.value || null;
}
```

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 2026 | XXIX Labs | Initial 3-contract design |
| 2.0.0 | Feb 2026 | XXIX Labs | Phase 2.5: vault, staking, multi-token circles (8 contracts) |
