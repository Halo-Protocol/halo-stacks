---
sidebar_position: 5
title: sBTC Staking
description: Stake sBTC to earn yield and boost your credit score.
---

# sBTC Staking

Halo's sBTC staking module lets you lock wrapped Bitcoin to earn yield rewards and boost your on-chain credit score. The longer you stake and the more you commit, the higher your rewards.

---

## How It Works

1. **Verify your identity** — You must have a bound wallet via `halo-identity`
2. **Deposit sBTC** — Stake any amount of sBTC into the staking contract
3. **Lock period** — Your stake is locked for a minimum period (default: ~30 days)
4. **Earn yield** — Continuous yield accrual from the reward pool
5. **Credit boost** — Your staking activity is recorded in the credit system
6. **Unstake** — After the lock expires, withdraw your sBTC + claim rewards

---

## Staking

```clarity
(contract-call? .halo-sbtc-staking stake-sbtc .halo-mock-sbtc u10000000)  ;; Stake 0.1 sBTC
```

When you stake:
- sBTC is transferred from your wallet to the staking contract
- Your staker data is created/updated
- The credit contract records your staking activity (amount + duration)
- Pending yield is auto-claimed before updating your stake

---

## Lock Period

Staked sBTC is subject to a minimum lock period:

| Parameter | Default | Description |
|---|---|---|
| Min lock | 4,320 blocks (~30 days) | Minimum time before unstaking |

The lock is based on `last-stake-block` — each new stake resets the lock timer.

Check if your lock has expired:

```clarity
(contract-call? .halo-sbtc-staking is-lock-expired tx-sender)
```

---

## Unstaking

After the lock period expires:

```clarity
(contract-call? .halo-sbtc-staking unstake-sbtc .halo-mock-sbtc u10000000)  ;; Unstake 0.1 sBTC
```

- Verifies the lock period has passed
- Transfers sBTC back to your wallet
- Auto-claims any pending rewards
- Updates staking totals

---

## Yield Rewards

The staking module uses **Synthetix-style continuous reward distribution**:

### How Yield Works

1. Admin funds the reward pool: `fund-reward-pool(token, amount, duration-blocks)`
2. Rewards are distributed proportionally to all stakers based on their share
3. Yield accrues every block and can be claimed anytime

### Claiming Rewards

```clarity
(contract-call? .halo-sbtc-staking claim-rewards .halo-mock-sbtc)
```

### Yield Formula

```
pending_rewards = staked × (current_reward_per_token - reward_per_token_paid)

reward_per_token = stored + (elapsed_blocks × reward_rate / total_staked)
```

---

## Credit Score Impact

Staking sBTC directly boosts your credit score's **Staking Activity** component (10% weight, max 55 points).

The boost is calculated from two factors:

### Amount Tier

| Staked | Points |
|---|---|
| > 1 BTC (100,000,000 sats) | 100 |
| > 0.1 BTC (10,000,000 sats) | 80 |
| > 0.01 BTC (1,000,000 sats) | 60 |
| > 0.001 BTC (100,000 sats) | 40 |
| > 0 | 20 |

### Duration Modifier

| Duration | Modifier |
|---|---|
| > 12 months (~62,208 blocks) | 100 |
| > 6 months (~31,104 blocks) | 80 |
| > 3 months (~15,552 blocks) | 60 |
| > 1 month (~4,320 blocks) | 40 |
| > 0 | 20 |

### Combined Score

```
staking_points = (amount_tier × duration_modifier / 100) × 55 / 100
```

**Example**: Stake 0.05 BTC for 4 months:
- Amount tier: 60 (> 0.01 BTC)
- Duration modifier: 60 (> 3 months)
- Points: (60 × 60 / 100) × 55 / 100 = **19.8 → 19 points**

---

## Configuration

| Parameter | Default | Admin Function |
|---|---|---|
| Staking token | Set by admin | `set-staking-token(token)` |
| Min lock blocks | 4,320 (~30 days) | `set-min-lock-blocks(blocks)` |
| Reward pool | Funded by admin | `fund-reward-pool(token, amount, duration)` |

---

## Read-Only Queries

```clarity
;; Get staker data
(contract-call? .halo-sbtc-staking get-staker-data user)
;; → { staked, staked-at, last-stake-block, reward-per-token-paid, rewards-earned }

;; Total staked across all users
(contract-call? .halo-sbtc-staking get-total-staked)

;; Check lock status
(contract-call? .halo-sbtc-staking is-lock-expired user)

;; Staking duration in blocks
(contract-call? .halo-sbtc-staking get-staking-duration user)

;; Pending rewards
(contract-call? .halo-sbtc-staking get-pending-rewards user)

;; Full config
(contract-call? .halo-sbtc-staking get-staking-config)
```

---

## Identity Requirement

Unlike the vault (which anyone can use), staking requires a **verified identity**:

```clarity
;; The contract checks this internally:
(contract-call? .halo-identity get-id-by-wallet tx-sender)
```

If your wallet is not bound to a unique ID via `halo-identity`, staking will fail with error `u608` (NOT_VERIFIED).

---

## Error Reference

| Code | Name | Description |
|---|---|---|
| u600 | NOT_AUTHORIZED | Caller is not admin |
| u601 | INVALID_AMOUNT | Zero or negative amount |
| u602 | NO_STAKE | No staking position found |
| u603 | LOCK_NOT_EXPIRED | Lock period hasn't passed yet |
| u604 | INSUFFICIENT_STAKE | Unstake amount exceeds staked amount |
| u605 | TOKEN_MISMATCH | Wrong token contract |
| u606 | STAKING_TOKEN_NOT_SET | Staking token not configured |
| u607 | INVALID_PARAMS | Invalid function parameters |
| u608 | NOT_VERIFIED | Wallet not bound via halo-identity |
| u609 | NO_REWARDS | No pending rewards to claim |
