;; halo-mock-sbtc.clar
;; Mock SIP-010 sBTC token for simnet/devnet testing
;; 8 decimals (matching real sBTC: 1 sBTC = 100_000_000 satoshis)
;; Deployer can mint to any address for test setup
;; On mainnet: SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token

(impl-trait .halo-sip010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u500))
(define-constant ERR_INSUFFICIENT_BALANCE (err u501))
(define-constant ERR_INVALID_AMOUNT (err u502))

(define-constant TOKEN_NAME "Mock sBTC")
(define-constant TOKEN_SYMBOL "sBTC")
(define-constant TOKEN_DECIMALS u8)

;; ============================================
;; TOKEN DEFINITION
;; ============================================

(define-fungible-token mock-sbtc)

;; ============================================
;; SIP-010 IMPLEMENTATION
;; ============================================

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (ft-transfer? mock-sbtc amount sender recipient))
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
  (ok (ft-get-balance mock-sbtc account))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-sbtc))
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
    (ft-mint? mock-sbtc amount recipient)
  )
)

;; Burn tokens from caller
(define-public (burn (amount uint))
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (ft-burn? mock-sbtc amount tx-sender)
  )
)
