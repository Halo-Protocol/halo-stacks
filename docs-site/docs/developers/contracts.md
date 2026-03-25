---
sidebar_position: 1
title: Smart Contract Reference
description: Complete function reference for all Halo Protocol smart contracts.
---

# Smart Contract Reference

All contracts are written in **Clarity 3** and deployed on **Stacks (Epoch 3.0)**.

---

## Contract Addresses

### Testnet

| Contract | Address |
|---|---|
| halo-sip010-trait | `{deployer}.halo-sip010-trait` |
| halo-identity | `{deployer}.halo-identity` |
| halo-mock-token | `{deployer}.halo-mock-token` |
| halo-mock-sbtc | `{deployer}.halo-mock-sbtc` |
| halo-credit | `{deployer}.halo-credit` |
| halo-vault | `{deployer}.halo-vault` |
| halo-sbtc-staking | `{deployer}.halo-sbtc-staking` |
| halo-circle | `{deployer}.halo-circle` |

---

## halo-identity

Identity binding: wallet ↔ unique ID (one-to-one, permanent).

### Public Functions

#### `bind-wallet`

Bind the caller's wallet to a unique ID. One-time, irreversible.

```clarity
(define-public (bind-wallet (unique-id (buff 32)))
  → (response bool uint))
```

| Parameter | Type | Description |
|---|---|---|
| `unique-id` | `(buff 32)` | SHA-256 hash of social provider + account ID |

**Errors**: `u101` (ID already bound), `u102` (wallet already used), `u104` (invalid ID)

#### `deactivate-user` / `reactivate-user`

Admin-only. Toggle user's active status.

```clarity
(define-public (deactivate-user (unique-id (buff 32))) → (response bool uint))
(define-public (reactivate-user (unique-id (buff 32))) → (response bool uint))
```

#### `set-admin`

Transfer admin role.

```clarity
(define-public (set-admin (new-admin principal)) → (response bool uint))
```

### Read-Only Functions

| Function | Returns | Description |
|---|---|---|
| `get-wallet-by-id(unique-id)` | `(optional principal)` | Wallet for a unique ID |
| `get-id-by-wallet(wallet)` | `(optional (buff 32))` | Unique ID for a wallet |
| `is-id-bound(unique-id)` | `bool` | Whether ID is bound |
| `is-wallet-bound(wallet)` | `bool` | Whether wallet is bound |
| `get-user-metadata(unique-id)` | `(optional {registered-at, is-active})` | User metadata |
| `get-total-users()` | `uint` | Total registered users |
| `get-admin()` | `principal` | Current admin |

---

## halo-credit

On-chain credit scoring engine (300–850 range).

### Public Functions

#### `record-payment`

Record a circle contribution. **Authorized contracts only**.

```clarity
(define-public (record-payment
  (unique-id (buff 32))
  (circle-id uint)
  (round uint)
  (amount uint)
  (on-time bool))
  → (response bool uint))
```

Uses `contract-caller` for authorization (not `tx-sender`).

#### `record-circle-completion`

Record circle completion/default. **Authorized contracts only**.

```clarity
(define-public (record-circle-completion
  (unique-id (buff 32))
  (completed-successfully bool))
  → (response bool uint))
```

#### `record-staking-activity`

Record sBTC staking for credit boost. **Authorized contracts only**.

```clarity
(define-public (record-staking-activity
  (unique-id (buff 32))
  (sbtc-amount uint)
  (duration-blocks uint))
  → (response bool uint))
```

#### `authorize-contract`

Grant a contract permission to call recording functions. **Admin only**.

```clarity
(define-public (authorize-contract (contract principal))
  → (response bool uint))
```

### Read-Only Functions

| Function | Returns | Description |
|---|---|---|
| `get-credit-score(id)` | `uint` | Score (300–850), returns 300 if not found |
| `get-credit-data(id)` | `(optional {...})` | Full credit record |
| `get-payment-history(id)` | `(list 100 {...})` | Last 100 payments |
| `get-score-by-wallet(wallet)` | `uint` | Score via identity lookup |
| `get-credit-data-by-wallet(wallet)` | `(optional {...})` | Full data via wallet |
| `is-authorized(caller)` | `bool` | Check contract authorization |
| `get-score-tier(score)` | `(string-ascii 10)` | "Excellent"/"Good"/"Fair"/"Poor" |

---

## halo-vault

Multi-asset collateral vault with LTV enforcement and yield.

### Public Functions

#### `deposit` / `withdraw`

```clarity
(define-public (deposit (token <sip-010-trait>) (amount uint)) → (response bool uint))
(define-public (withdraw (token <sip-010-trait>) (amount uint)) → (response bool uint))
```

#### `claim-yield`

```clarity
(define-public (claim-yield (token <sip-010-trait>)) → (response uint uint))
```

#### `lock-collateral` / `release-collateral` / `slash-collateral`

**Authorized contracts only**.

```clarity
(define-public (lock-collateral (user principal) (circle-id uint) (commitment-usd uint))
  → (response bool uint))

(define-public (release-collateral (user principal) (circle-id uint))
  → (response bool uint))

(define-public (slash-collateral (user principal) (circle-id uint) (slash-amount uint))
  → (response bool uint))
```

#### Admin Functions

```clarity
(define-public (set-vault-token (token principal)) → (response bool uint))
(define-public (set-token-price (token principal) (price-usd uint) (decimals uint)) → (response bool uint))
(define-public (fund-yield-pool (token <sip-010-trait>) (amount uint) (duration uint)) → (response bool uint))
(define-public (set-ltv-ratio (new-ratio uint)) → (response bool uint))  ;; 5000–9000
(define-public (authorize-contract (contract principal)) → (response bool uint))
```

### Read-Only Functions

| Function | Returns | Description |
|---|---|---|
| `get-vault-deposit(user)` | `(optional {...})` | User's deposit data |
| `get-available-capacity(user)` | `(response uint)` | Free capacity in USD |
| `can-commit(user, amount)` | `(response bool)` | Whether user can take new commitment |
| `get-token-price(token)` | `(optional {...})` | Token price data |
| `get-circle-commitment(user, id)` | `(optional {...})` | Commitment for a circle |
| `get-vault-config()` | `{...}` | Full vault configuration |
| `calculate-commitment-usd(contrib, members, token)` | `(response uint)` | Required commitment |
| `get-pending-yield(user)` | `uint` | Unclaimed yield |

---

## halo-sbtc-staking

sBTC staking with minimum lock period and credit score boost.

### Public Functions

```clarity
(define-public (stake-sbtc (token <sip-010-trait>) (amount uint)) → (response bool uint))
(define-public (unstake-sbtc (token <sip-010-trait>) (amount uint)) → (response bool uint))
(define-public (claim-rewards (token <sip-010-trait>)) → (response uint uint))
```

Admin:

```clarity
(define-public (set-staking-token (token principal)) → (response bool uint))
(define-public (fund-reward-pool (token <sip-010-trait>) (amount uint) (duration uint)) → (response bool uint))
(define-public (set-min-lock-blocks (blocks uint)) → (response bool uint))
(define-public (set-admin (new-admin principal)) → (response bool uint))
```

### Read-Only Functions

| Function | Returns | Description |
|---|---|---|
| `get-staker-data(user)` | `(optional {...})` | Staker position |
| `get-total-staked()` | `uint` | Total sBTC staked |
| `get-staking-config()` | `{...}` | Staking configuration |
| `is-lock-expired(user)` | `bool` | Lock status |
| `get-staking-duration(user)` | `uint` | Blocks since staked |
| `get-pending-rewards(user)` | `uint` | Unclaimed rewards |

---

## halo-circle

Core lending circle (ROSCA) lifecycle management.

### Public Functions

#### Circle Creation

```clarity
;; STX circle
(define-public (create-circle
  (name (string-ascii 50))
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint))
  → (response uint uint))   ;; Returns circle-id

;; SIP-010 token circle
(define-public (create-token-circle
  (name (string-ascii 50))
  (token <sip-010-trait>)
  (contribution-amount uint)
  (total-members uint)
  (round-duration uint)
  (grace-period uint))
  → (response uint uint))
```

#### Membership

```clarity
(define-public (join-circle (circle-id uint)) → (response bool uint))
```

Auto-activates the circle when the last member joins.

#### Contributions

```clarity
(define-public (contribute-stx (circle-id uint)) → (response bool uint))
(define-public (contribute-token (circle-id uint) (token <sip-010-trait>)) → (response bool uint))
```

Records payment in credit system. Tracks on-time status based on grace period.

#### Payouts

```clarity
(define-public (process-payout (circle-id uint)) → (response bool uint))
(define-public (process-payout-token (circle-id uint) (token <sip-010-trait>)) → (response bool uint))
```

Requires all members to have contributed for the current round.

#### Admin

```clarity
(define-public (pause-circle (circle-id uint)) → (response bool uint))
(define-public (resume-circle (circle-id uint)) → (response bool uint))
(define-public (set-protocol-fee-rate (rate uint)) → (response bool uint))  ;; 0–1000 bp
(define-public (set-admin (new-admin principal)) → (response bool uint))
```

### Read-Only Functions

| Function | Returns | Description |
|---|---|---|
| `get-circle(id)` | `(optional {...})` | Circle data |
| `get-member(id, member)` | `(optional {...})` | Member data |
| `get-contribution(id, member, round)` | `(optional {...})` | Contribution record |
| `get-circle-members(id)` | `(list 10 principal)` | Member list |
| `get-payout(id, round)` | `(optional {...})` | Payout record |
| `get-circle-count()` | `uint` | Total circles created |
| `get-protocol-fee-rate()` | `uint` | Fee in basis points |
| `is-verified(user)` | `bool` | Identity check |
| `is-payment-on-time(id)` | `bool` | Within grace period |
| `get-round-deadline(id, round)` | `(optional uint)` | Deadline block |
| `count-round-contributions(id, round)` | `uint` | Contributions this round |

---

## halo-mock-token (hUSD)

SIP-010 test stablecoin. 6 decimals. 1 hUSD = 1,000,000 micro-units.

```clarity
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  → (response bool uint))
(define-public (mint (amount uint) (recipient principal)) → (response bool uint))  ;; deployer only
(define-public (burn (amount uint)) → (response bool uint))
```

---

## halo-mock-sbtc (sBTC)

SIP-010 test Bitcoin wrapper. 8 decimals. 1 sBTC = 100,000,000 sats.

Same interface as halo-mock-token.

---

## Error Code Summary

| Range | Contract | Key Errors |
|---|---|---|
| u100–u104 | halo-identity | NOT_AUTHORIZED, ALREADY_BOUND, WALLET_ALREADY_USED |
| u200–u219 | halo-circle | CIRCLE_NOT_FOUND, NOT_MEMBER, INSUFFICIENT_COLLATERAL |
| u300–u303 | halo-credit | NOT_AUTHORIZED, NOT_FOUND, HISTORY_FULL |
| u400–u412 | halo-vault | INSUFFICIENT_CAPACITY, TRANSFER_FAILED, ZERO_PRICE |
| u500–u502 | halo-mock-token/sbtc | NOT_AUTHORIZED, INSUFFICIENT_BALANCE |
| u600–u609 | halo-sbtc-staking | LOCK_NOT_EXPIRED, NOT_VERIFIED, NO_REWARDS |
