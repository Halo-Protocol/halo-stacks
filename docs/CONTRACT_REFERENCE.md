# Halo Protocol - Smart Contract Reference

## Contract Deployment Order

```
1. halo-sip010-trait.clar  (no dependencies)
2. halo-identity.clar      (no dependencies)
3. halo-mock-token.clar    (depends on: halo-sip010-trait)
4. halo-mock-sbtc.clar     (depends on: halo-sip010-trait)
5. halo-credit.clar        (depends on: halo-identity)
6. halo-vault.clar         (depends on: halo-sip010-trait, halo-identity)
7. halo-sbtc-staking.clar  (depends on: halo-sip010-trait, halo-identity, halo-credit)
8. halo-circle.clar        (depends on: halo-identity, halo-credit, halo-vault, halo-sip010-trait)
```

**Post-deploy authorization:**
1. `halo-credit.authorize-contract(halo-circle)` — allow circle to record payments
2. `halo-credit.authorize-contract(halo-sbtc-staking)` — allow staking to record activity
3. `halo-vault.authorize-contract(halo-circle)` — allow circle to lock/release collateral
4. `halo-vault.set-vault-token(halo-mock-token)` — set accepted collateral token
5. `halo-vault.set-token-price(DEPLOYER, u500000, u6)` — set STX price ($0.50)
6. `halo-sbtc-staking.set-staking-token(halo-mock-sbtc)` — set staking token

---

## Core Contracts

### halo-identity.clar

Identity and wallet binding. Maps off-chain unique IDs to Stacks wallet addresses.

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u100 | ERR_NOT_AUTHORIZED | Caller is not admin |
| u101 | ERR_ALREADY_BOUND | Unique ID already bound to a wallet |
| u102 | ERR_WALLET_BOUND | Wallet already bound to a unique ID |
| u103 | ERR_NOT_FOUND | User metadata not found |
| u104 | ERR_INVALID_ID | Invalid unique ID (zero buffer) |

#### Public Functions
| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `bind-wallet` | `(unique-id (buff 32))` | `(ok bool)` | Bind caller's wallet to unique ID |
| `deactivate-user` | `(unique-id (buff 32))` | `(ok bool)` | Admin: set user inactive |
| `reactivate-user` | `(unique-id (buff 32))` | `(ok bool)` | Admin: set user active |
| `set-admin` | `(new-admin principal)` | `(ok bool)` | Admin: transfer admin role |

#### Read-Only Functions
| Function | Args | Returns |
|----------|------|---------|
| `get-wallet-by-id` | `(unique-id (buff 32))` | `(optional principal)` |
| `get-id-by-wallet` | `(wallet principal)` | `(optional (buff 32))` |
| `is-id-bound` | `(unique-id (buff 32))` | `bool` |
| `is-wallet-bound` | `(wallet principal)` | `bool` |
| `get-user-metadata` | `(unique-id (buff 32))` | `(optional tuple)` |
| `get-total-users` | none | `uint` |
| `get-admin` | none | `principal` |

---

### halo-credit.clar

On-chain credit scoring with payment history tracking.

#### Score Components
| Component | Weight | Max Points | Description |
|-----------|--------|------------|-------------|
| Payment History | 35% | 192 | On-time payment ratio |
| Circle Completion | 20% | 110 | Successful completion ratio |
| Volume | 15% | 82 | Total value transacted (tiered) |
| Tenure | 10% | 55 | Time active on protocol (tiered) |
| Consistency | 10% | 55 | Late payment frequency |
| Staking Activity | 10% | 55 | sBTC staking amount × duration |

**Score Range**: 300 (base) to 850 (maximum)

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u300 | ERR_NOT_AUTHORIZED | Caller is not authorized |
| u301 | ERR_NOT_FOUND | Data not found |
| u302 | ERR_INVALID_SCORE | Invalid score/already authorized |
| u303 | ERR_HISTORY_FULL | Payment history at capacity |

#### Public Functions
| Function | Args | Returns | Access |
|----------|------|---------|--------|
| `record-payment` | `unique-id, circle-id, round, amount, on-time` | `(ok uint)` (new score) | Authorized only |
| `record-circle-completion` | `unique-id, completed-successfully` | `(ok uint)` (new score) | Authorized only |
| `record-staking-activity` | `unique-id, sbtc-amount, duration-blocks` | `(ok uint)` (new score) | Authorized only |
| `authorize-contract` | `(contract principal)` | `(ok bool)` | Admin only |
| `set-admin` | `(new-admin principal)` | `(ok bool)` | Admin only |

#### Read-Only Functions
| Function | Args | Returns |
|----------|------|---------|
| `get-credit-score` | `(unique-id (buff 32))` | `(ok uint)` |
| `get-credit-data` | `(unique-id (buff 32))` | `(optional tuple)` |
| `get-score-by-wallet` | `(wallet principal)` | `(ok uint)` |
| `get-credit-data-by-wallet` | `(wallet principal)` | `(optional tuple)` |
| `get-payment-history` | `(unique-id (buff 32))` | `(list 100 tuple)` |
| `is-authorized` | `(caller principal)` | `bool` |
| `get-score-tier` | `(score uint)` | `string-ascii` |
| `get-admin` | none | `principal` |
| `get-authorized-contracts` | none | `(list 10 principal)` |

---

### halo-circle.clar

Lending circle (ROSCA) management with multi-token support (STX + SIP-010) and collateral integration.

#### Circle Lifecycle
```
FORMING (u0) -> ACTIVE (u1) -> COMPLETED (u3)
                     |
                     v
               PAUSED (u2) -> ACTIVE (u1)
```

#### Constants
| Constant | Value | Description |
|----------|-------|-------------|
| MIN_MEMBERS | u3 | Minimum members per circle |
| MAX_MEMBERS | u10 | Maximum members per circle |
| MIN_ROUND_DURATION | u144 | ~1 day in Stacks blocks |
| MIN_CONTRIBUTION | u1000000 | 1 STX minimum (in microSTX) |

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u200 | ERR_NOT_AUTHORIZED | Not admin |
| u201 | ERR_CIRCLE_NOT_FOUND | Circle doesn't exist |
| u202 | ERR_CIRCLE_NOT_FORMING | Circle not in FORMING status |
| u203 | ERR_CIRCLE_NOT_ACTIVE | Circle not in ACTIVE status |
| u204 | ERR_ALREADY_MEMBER | Already a member |
| u205 | ERR_NOT_MEMBER | Not a member |
| u206 | ERR_CIRCLE_FULL | Circle at max capacity |
| u207 | ERR_INVALID_AMOUNT | Contribution below minimum |
| u208 | ERR_ALREADY_CONTRIBUTED | Already contributed this round |
| u209 | ERR_INVALID_ROUND | Invalid round number |
| u210 | ERR_NOT_VERIFIED | No identity binding (unverified) |
| u211 | ERR_TRANSFER_FAILED | STX transfer failed |
| u212 | ERR_INVALID_PARAMS | Invalid circle parameters |
| u213 | ERR_CONTRIBUTIONS_INCOMPLETE | Not all members contributed |
| u214 | ERR_PAYOUT_ALREADY_PROCESSED | Payout already done for round |
| u215 | ERR_NOT_PAUSED | Circle is not paused |
| u216 | ERR_NOT_FOUND | Generic not found |
| u217 | ERR_INSUFFICIENT_COLLATERAL | Not enough vault collateral |
| u218 | ERR_TOKEN_MISMATCH | Wrong token type for circle operation |
| u219 | ERR_INVALID_TOKEN_TYPE | Invalid token type value |

#### Public Functions
| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `create-circle` | `name, contribution-amount, total-members, round-duration, grace-period` | `(ok uint)` (circle ID) | Create STX circle (locks vault collateral) |
| `create-token-circle` | `name, token <ft-trait>, contribution-amount, total-members, round-duration, grace-period` | `(ok uint)` (circle ID) | Create SIP-010 token circle |
| `join-circle` | `(circle-id uint)` | `(ok uint)` (position) | Join existing circle (locks vault collateral) |
| `contribute-stx` | `(circle-id uint)` | `(ok bool)` | Contribute STX (STX circles only) |
| `contribute-token` | `(circle-id uint) (token <ft-trait>)` | `(ok bool)` | Contribute SIP-010 token (token circles only) |
| `process-payout` | `(circle-id uint)` | `(ok uint)` (net amount) | Process STX payout (STX circles only) |
| `process-payout-token` | `(circle-id uint) (token <ft-trait>)` | `(ok uint)` (net amount) | Process SIP-010 payout (token circles only) |
| `pause-circle` | `(circle-id uint)` | `(ok bool)` | Admin: pause active circle |
| `resume-circle` | `(circle-id uint)` | `(ok bool)` | Admin: resume paused circle |
| `set-protocol-fee-rate` | `(new-rate uint)` | `(ok bool)` | Admin: set fee (max 1000 bp = 10%) |
| `set-admin` | `(new-admin principal)` | `(ok bool)` | Admin: transfer admin role |

#### Read-Only Functions
| Function | Args | Returns |
|----------|------|---------|
| `get-circle` | `(circle-id uint)` | `(optional tuple)` |
| `get-member` | `(circle-id uint) (member principal)` | `(optional tuple)` |
| `get-contribution` | `(circle-id uint) (member principal) (round uint)` | `(optional tuple)` |
| `get-circle-members` | `(circle-id uint)` | `(list 10 principal)` |
| `get-payout` | `(circle-id uint) (round uint)` | `(optional tuple)` |
| `get-circle-count` | none | `uint` |
| `get-protocol-fee-rate` | none | `uint` |
| `get-admin` | none | `principal` |
| `is-verified` | `(user principal)` | `bool` |
| `is-payment-on-time` | `(circle-id uint)` | `bool` |
| `get-round-deadline` | `(circle-id uint) (round uint)` | `(optional uint)` |
| `count-round-contributions` | `(circle-id uint) (round uint)` | `uint` |

---

### halo-vault.clar

Collateral vault with stablecoin deposits, LTV-based capacity, admin price oracle, and Synthetix-style yield accumulator. Authorized contracts can lock, release, and slash collateral.

#### Constants
| Constant | Value | Description |
|----------|-------|-------------|
| MAX_LTV_RATIO | u9000 | Maximum LTV (90%) |
| MIN_LTV_RATIO | u5000 | Minimum LTV (50%) |
| LTV_DENOMINATOR | u10000 | Basis point denominator |
| PRECISION | u1000000000000 | Yield calculation precision (10^12) |

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u400 | ERR_NOT_AUTHORIZED | Caller is not admin or authorized contract |
| u401 | ERR_INVALID_AMOUNT | Amount must be > 0 |
| u402 | ERR_INSUFFICIENT_BALANCE | Not enough withdrawable balance (LTV constraint) |
| u403 | ERR_INSUFFICIENT_CAPACITY | Not enough capacity to lock collateral |
| u404 | ERR_NO_DEPOSIT | User has no vault deposit |
| u405 | ERR_TRANSFER_FAILED | Token transfer failed |
| u406 | ERR_INVALID_PARAMS | Invalid parameters |
| u407 | ERR_TOKEN_MISMATCH | Token doesn't match configured vault token |
| u408 | ERR_COMMITMENT_NOT_FOUND | No collateral commitment for this circle |
| u409 | ERR_ZERO_PRICE | Price must be > 0 |
| u410 | ERR_ALREADY_AUTHORIZED | Contract already authorized |
| u411 | ERR_VAULT_TOKEN_NOT_SET | Vault token not configured |
| u412 | ERR_PRICE_NOT_SET | Token price not set in oracle |

#### Public Functions
| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `deposit` | `(token ft-trait) (amount uint)` | `(ok bool)` | Deposit stablecoins as collateral |
| `withdraw` | `(token ft-trait) (amount uint)` | `(ok bool)` | Withdraw uncommitted funds (respects LTV) |
| `claim-yield` | `(token ft-trait)` | `(ok uint)` | Claim accrued yield rewards |
| `lock-collateral` | `(user principal) (circle-id uint) (commitment-usd uint)` | `(ok bool)` | Authorized: lock collateral for circle |
| `release-collateral` | `(user principal) (circle-id uint)` | `(ok bool)` | Authorized: release on circle completion |
| `slash-collateral` | `(user principal) (circle-id uint) (slash-amount uint)` | `(ok uint)` | Authorized: slash on default |
| `set-vault-token` | `(token-principal principal)` | `(ok bool)` | Admin: set accepted stablecoin |
| `set-token-price` | `(token-principal principal) (price-usd uint) (decimals uint)` | `(ok bool)` | Admin: set oracle price |
| `fund-yield-pool` | `(token ft-trait) (amount uint) (duration-blocks uint)` | `(ok bool)` | Admin: fund yield rewards |
| `set-ltv-ratio` | `(new-ratio uint)` | `(ok bool)` | Admin: set LTV (5000-9000 bp) |
| `authorize-contract` | `(contract principal)` | `(ok bool)` | Admin: authorize lock/release/slash caller |
| `set-admin` | `(new-admin principal)` | `(ok bool)` | Admin: transfer admin role |

#### Read-Only Functions
| Function | Args | Returns |
|----------|------|---------|
| `get-vault-deposit` | `(user principal)` | `(optional tuple)` |
| `get-available-capacity` | `(user principal)` | `(ok uint)` |
| `can-commit` | `(user principal) (additional-usd uint)` | `(ok bool)` |
| `get-token-price` | `(token-principal principal)` | `(optional tuple)` |
| `get-circle-commitment` | `(user principal) (circle-id uint)` | `(optional tuple)` |
| `get-vault-config` | none | `tuple` |
| `get-admin` | none | `principal` |
| `is-authorized` | `(caller principal)` | `bool` |
| `get-ltv-ratio` | none | `uint` |
| `calculate-commitment-usd` | `(contribution uint) (total-members uint) (token-principal principal)` | `(ok uint)` |
| `get-pending-yield` | `(user principal)` | `uint` |

---

### halo-sbtc-staking.clar

sBTC staking for yield rewards and credit score boosts. Uses Synthetix-style reward accumulator for O(1) gas per action.

#### Constants
| Constant | Value | Description |
|----------|-------|-------------|
| DEFAULT_MIN_LOCK | u4320 | ~1 month minimum lock period |
| PRECISION | u1000000000000 | Yield calculation precision (10^12) |

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u600 | ERR_NOT_AUTHORIZED | Caller is not admin |
| u601 | ERR_INVALID_AMOUNT | Amount must be > 0 |
| u602 | ERR_NO_STAKE | User has no active stake |
| u603 | ERR_LOCK_NOT_EXPIRED | Lock period not yet expired |
| u604 | ERR_INSUFFICIENT_STAKE | Unstake amount exceeds staked balance |
| u605 | ERR_TOKEN_MISMATCH | Wrong token passed |
| u606 | ERR_STAKING_TOKEN_NOT_SET | Staking token not configured |
| u607 | ERR_INVALID_PARAMS | Invalid parameters |
| u608 | ERR_NOT_VERIFIED | User has no verified identity |
| u609 | ERR_NO_REWARDS | No rewards to claim |

#### Public Functions
| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `stake-sbtc` | `(token <ft-trait>) (amount uint)` | `(ok bool)` | Stake sBTC tokens, records in credit |
| `unstake-sbtc` | `(token <ft-trait>) (amount uint)` | `(ok bool)` | Unstake after lock period expires |
| `claim-rewards` | `(token <ft-trait>)` | `(ok uint)` (reward amount) | Claim accumulated staking rewards |
| `set-staking-token` | `(token-principal principal)` | `(ok bool)` | Admin: set sBTC token address |
| `fund-reward-pool` | `(token <ft-trait>) (amount uint) (duration-blocks uint)` | `(ok bool)` | Admin: fund reward pool |
| `set-min-lock-blocks` | `(new-min uint)` | `(ok bool)` | Admin: set minimum lock period |
| `set-admin` | `(new-admin principal)` | `(ok bool)` | Admin: transfer admin role |

#### Read-Only Functions
| Function | Args | Returns |
|----------|------|---------|
| `get-staker-data` | `(user principal)` | `(optional tuple)` |
| `get-total-staked` | none | `uint` |
| `get-staking-config` | none | `tuple` |
| `get-admin` | none | `principal` |
| `is-lock-expired` | `(user principal)` | `bool` |
| `get-staking-duration` | `(user principal)` | `uint` |
| `get-pending-rewards` | `(user principal)` | `uint` |

---

## Supporting Contracts

### halo-sip010-trait.clar

Local SIP-010 fungible token trait definition for simnet/devnet. On mainnet, contracts should reference the canonical trait at `SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait`.

Defines the standard interface: `transfer`, `get-name`, `get-symbol`, `get-decimals`, `get-balance`, `get-total-supply`, `get-token-uri`.

---

### halo-mock-token.clar

Mock SIP-010 stablecoin for testing. Represents "Halo Test USD" (hUSD) with 6 decimals.

#### Error Codes
| Code | Constant | Description |
|------|----------|-------------|
| u500 | ERR_NOT_AUTHORIZED | Caller is not deployer |
| u501 | ERR_INSUFFICIENT_BALANCE | Insufficient token balance |
| u502 | ERR_INVALID_AMOUNT | Amount must be > 0 |

#### Public Functions
| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `transfer` | `amount, sender, recipient, memo` | `(ok bool)` | SIP-010: transfer tokens |
| `mint` | `(amount uint) (recipient principal)` | `(ok bool)` | Admin: mint tokens for testing |
| `burn` | `(amount uint)` | `(ok bool)` | Burn caller's tokens |

#### Read-Only Functions (SIP-010)
| Function | Returns |
|----------|---------|
| `get-name` | `(ok "Halo Test USD")` |
| `get-symbol` | `(ok "hUSD")` |
| `get-decimals` | `(ok u6)` |
| `get-balance` | `(ok uint)` |
| `get-total-supply` | `(ok uint)` |
| `get-token-uri` | `(ok none)` |

---

### halo-mock-sbtc.clar

Mock SIP-010 sBTC token for testing. 8 decimals (matching real sBTC: 1 sBTC = 100,000,000 satoshis).

Same interface as `halo-mock-token.clar` with these differences:
- Token name: `"Mock sBTC"`, symbol: `"sBTC"`, decimals: `u8`
- Same error codes (u500-u502) and functions (transfer, mint, burn)
- On mainnet, real sBTC is at: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`
