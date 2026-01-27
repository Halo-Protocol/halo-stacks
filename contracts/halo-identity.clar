;; halo-identity.clar
;; Manages user identity and permanent wallet bindings
;;
;; Key Features:
;; - One-time permanent wallet binding (unique-id <-> wallet)
;; - Bidirectional mapping for lookups
;; - Sybil resistance via unique IDs generated from social auth
;; - Admin controls for user management

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

;; Unique ID -> Wallet Principal
(define-map id-to-wallet (buff 32) principal)

;; Wallet Principal -> Unique ID
(define-map wallet-to-id principal (buff 32))

;; User metadata
(define-map user-metadata (buff 32) {
  registered-at: uint,
  is-active: bool
})

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-wallet-by-id (unique-id (buff 32)))
  (map-get? id-to-wallet unique-id)
)

(define-read-only (get-id-by-wallet (wallet principal))
  (map-get? wallet-to-id wallet)
)

(define-read-only (is-id-bound (unique-id (buff 32)))
  (is-some (map-get? id-to-wallet unique-id))
)

(define-read-only (is-wallet-bound (wallet principal))
  (is-some (map-get? wallet-to-id wallet))
)

(define-read-only (get-user-metadata (unique-id (buff 32)))
  (map-get? user-metadata unique-id)
)

(define-read-only (get-total-users)
  (var-get total-users)
)

(define-read-only (get-admin)
  (var-get admin)
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Bind wallet to unique ID (ONE TIME ONLY, PERMANENT)
(define-public (bind-wallet (unique-id (buff 32)))
  (let (
    (caller tx-sender)
  )
    ;; Validate unique ID is 32 bytes
    (asserts! (is-eq (len unique-id) u32) ERR_INVALID_ID)

    ;; Ensure unique ID not already bound
    (asserts! (is-none (map-get? id-to-wallet unique-id)) ERR_ALREADY_BOUND)

    ;; Ensure wallet not already bound to another ID
    (asserts! (is-none (map-get? wallet-to-id caller)) ERR_WALLET_ALREADY_USED)

    ;; Store bidirectional mapping
    (map-set id-to-wallet unique-id caller)
    (map-set wallet-to-id caller unique-id)

    ;; Store metadata
    (map-set user-metadata unique-id {
      registered-at: stacks-block-height,
      is-active: true
    })

    ;; Increment user count
    (var-set total-users (+ (var-get total-users) u1))

    (print {
      event: "wallet-bound",
      unique-id: unique-id,
      wallet: caller,
      block: stacks-block-height
    })

    (ok true)
  )
)

;; Admin: deactivate user (does NOT unbind wallet)
(define-public (deactivate-user (unique-id (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? user-metadata unique-id)
      metadata (begin
        (map-set user-metadata unique-id
          (merge metadata { is-active: false })
        )
        (print { event: "user-deactivated", unique-id: unique-id })
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Admin: reactivate user
(define-public (reactivate-user (unique-id (buff 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (match (map-get? user-metadata unique-id)
      metadata (begin
        (map-set user-metadata unique-id
          (merge metadata { is-active: true })
        )
        (print { event: "user-reactivated", unique-id: unique-id })
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Admin: transfer admin role
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
