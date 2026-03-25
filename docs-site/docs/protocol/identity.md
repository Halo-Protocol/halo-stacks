---
sidebar_position: 6
title: Identity System
description: One-time wallet binding that links social identity to Stacks addresses.
---

# Identity System

Halo's identity contract creates a permanent, one-to-one binding between a **social identity** (Google/GitHub account) and a **Stacks wallet address**. This binding is the foundation for credit scoring, circle membership, and Sybil resistance.

---

## How It Works

1. **Sign in** with Google or GitHub via NextAuth.js
2. **Connect your Stacks wallet** (Leather or Xverse)
3. **Bind your wallet** — a one-time on-chain transaction that permanently links your social ID hash to your wallet address
4. **Done** — your identity is now verified and usable across all Halo contracts

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  Social Account  │     │   Stacks Wallet  │
│  (Google/GitHub) │     │  (Leather/Xverse)│
└────────┬─────────┘     └────────┬─────────┘
         │                         │
         ▼                         ▼
┌──────────────────────────────────────────┐
│         Unique ID (SHA-256 hash)         │
│   = hash(provider + socialId)            │
│   → buff32                               │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│          halo-identity contract          │
│                                          │
│   id-to-wallet:  buff32 → principal      │
│   wallet-to-id:  principal → buff32      │
│   user-metadata: buff32 → {registered,   │
│                             is-active}    │
└──────────────────────────────────────────┘
```

---

## Unique ID Generation

The unique ID is a SHA-256 hash of the social provider and account ID:

```typescript
import { sha256 } from '@stacks/encryption';

function generateUniqueId(provider: string, socialId: string): Buffer {
  const input = `${provider}:${socialId}`;
  return sha256(Buffer.from(input));  // → 32-byte buffer
}
```

This ensures:
- **Deterministic**: Same social account always produces the same ID
- **Privacy-preserving**: The hash cannot be reversed to reveal the social account
- **Unique**: Different accounts produce different IDs (collision-resistant)

---

## Binding Process

### Step 1: Initiate Binding

```
POST /api/identity/bind-wallet
```

The API generates the unique ID from the authenticated session and returns transaction parameters for the wallet to sign.

### Step 2: Sign & Broadcast

The frontend uses `@stacks/connect` to prompt the user to sign the `bind-wallet` contract call:

```clarity
(contract-call? .halo-identity bind-wallet unique-id)
```

### Step 3: Confirm

After the transaction confirms on-chain:

```
POST /api/identity/confirm-binding/{txId}
```

The backend verifies the transaction succeeded and updates the database.

---

## Properties

| Property | Detail |
|---|---|
| **One-time** | Once bound, a wallet cannot be re-bound to a different ID |
| **Permanent** | Bindings cannot be reversed (no unbind function) |
| **Bidirectional** | Look up wallet by ID or ID by wallet |
| **One-to-one** | Each ID maps to exactly one wallet, and vice versa |

---

## Admin Functions

The admin can deactivate/reactivate users (e.g., for violations):

```clarity
;; Deactivate a user (sets is-active to false)
(contract-call? .halo-identity deactivate-user unique-id)

;; Reactivate a user
(contract-call? .halo-identity reactivate-user unique-id)

;; Transfer admin role
(contract-call? .halo-identity set-admin new-admin)
```

Deactivation does not unbind the wallet — it marks the user as inactive, which other contracts can check.

---

## Read-Only Queries

```clarity
;; Look up wallet by unique ID
(contract-call? .halo-identity get-wallet-by-id unique-id)
;; → (optional principal)

;; Look up unique ID by wallet
(contract-call? .halo-identity get-id-by-wallet wallet)
;; → (optional buff32)

;; Check if bound
(contract-call? .halo-identity is-id-bound unique-id)      ;; → bool
(contract-call? .halo-identity is-wallet-bound wallet)      ;; → bool

;; User metadata
(contract-call? .halo-identity get-user-metadata unique-id)
;; → { registered-at: uint, is-active: bool }

;; Total registered users
(contract-call? .halo-identity get-total-users)
;; → uint
```

---

## Cross-Contract Usage

Other Halo contracts verify identity before allowing actions:

```clarity
;; In halo-circle: check if user is verified
(define-read-only (is-verified (user principal))
  (is-some (contract-call? .halo-identity get-id-by-wallet user))
)
```

Contracts that require verified identity:
- **halo-circle**: Creating and joining circles
- **halo-sbtc-staking**: Staking sBTC
- **halo-credit**: Score lookups by wallet (uses identity for wallet→ID mapping)

---

## Why Identity Matters

1. **Sybil resistance**: One person = one wallet = one credit score. You can't create multiple identities to game the system.
2. **Credit portability**: Your credit score follows your unique ID, not a specific wallet address.
3. **Accountability**: Circle members can be identified and held accountable for defaults.
4. **Privacy**: Only a hash is stored on-chain — your social account details stay off-chain.

---

## Error Reference

| Code | Name | Description |
|---|---|---|
| u100 | NOT_AUTHORIZED | Caller is not admin |
| u101 | ALREADY_BOUND | This unique ID is already bound to a wallet |
| u102 | WALLET_ALREADY_USED | This wallet is already bound to a different ID |
| u103 | NOT_FOUND | Unique ID not found |
| u104 | INVALID_ID | Invalid unique ID format |
