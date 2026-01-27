;; halo-sip010-trait.clar
;; Local SIP-010 fungible token trait definition for simnet/devnet
;; On mainnet, contracts reference the canonical trait at:
;;   SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait

(define-trait sip-010-trait
  (
    ;; Transfer tokens between principals
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Token metadata
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))

    ;; Balance and supply
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))

    ;; Token URI
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
