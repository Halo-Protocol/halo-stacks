;; halo-mock-token.clar
;; Mock SIP-010 stablecoin for simnet/devnet testing
;; Represents "Halo Test USD" (hUSD) - 6 decimals (1 hUSD = 1_000_000 micro-units)
;; Deployer can mint to any address for test setup

(impl-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u500))
(define-constant ERR_INSUFFICIENT_BALANCE (err u501))
(define-constant ERR_INVALID_AMOUNT (err u502))

(define-constant TOKEN_NAME "Halo Test USD")
(define-constant TOKEN_SYMBOL "hUSD")
(define-constant TOKEN_DECIMALS u6)

;; ============================================
;; TOKEN DEFINITION
;; ============================================

(define-fungible-token halo-usd)

;; ============================================
;; SIP-010 IMPLEMENTATION
;; ============================================

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (ft-transfer? halo-usd amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok TOKEN_NAME)
)

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL)
)

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS)
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance halo-usd account))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply halo-usd))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; ============================================
;; ADMIN FUNCTIONS (test helpers)
;; ============================================

;; Mint tokens to any address (deployer only, for test setup)
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (ft-mint? halo-usd amount recipient)
  )
)

;; Burn tokens from caller
(define-public (burn (amount uint))
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (ft-burn? halo-usd amount tx-sender)
  )
)
