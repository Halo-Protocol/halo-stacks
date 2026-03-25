---
sidebar_position: 3
title: Credit Scoring
description: On-chain credit scores built from verifiable lending behavior.
---

# Credit Scoring

Halo's on-chain credit scoring system creates a **portable, verifiable credit history** built entirely from on-chain behavior. Your score is computed deterministically from smart contract data — no oracles, no off-chain data, no black boxes.

---

## Score Range

| Range | Tier | Description |
|---|---|---|
| **750–850** | Excellent | Consistent on-time payments, multiple completed circles, active staker |
| **650–749** | Good | Reliable participant with solid history |
| **500–649** | Fair | Some history, room for improvement |
| **300–499** | Poor | New user, defaults, or limited activity |

Every new user starts at **300** (base score). Your score increases as you participate in circles, make on-time payments, and stake sBTC.

---

## Score Components

The credit score is calculated from **6 weighted components**, each contributing a maximum number of points:

```
Total Score = 300 (base) + Payment History + Circle Completion
            + Volume + Tenure + Consistency + Staking Activity
```

### 1. Payment History (35%) — Max 192 pts

The most heavily weighted component. Tracks the ratio of on-time payments to total payments.

```
score = (on_time_payments / total_payments) × 192
```

- Each on-time contribution adds to your on-time count
- Late contributions add to total but not on-time
- Missed contributions (defaults) hurt this ratio significantly

### 2. Circle Completion (20%) — Max 110 pts

Rewards members who see circles through to the end.

```
score = (completed / (completed + defaulted)) × 110
```

- Completing a circle successfully adds to `circles-completed`
- Defaulting adds to `circles-defaulted`
- A perfect record (all completed, zero defaults) earns full points

### 3. Volume (15%) — Max 82 pts

Tracks total contribution volume across all circles.

```
score = min(total_volume / volume_threshold, 1.0) × 82
```

Higher total lifetime contributions earn more points, up to the cap.

### 4. Tenure (10%) — Max 55 pts

Rewards long-term protocol participants.

```
score = min(blocks_since_first_activity / tenure_threshold, 1.0) × 55
```

The longer you've been active on Halo, the more tenure points you earn.

### 5. Consistency (10%) — Max 55 pts

Measures regularity of participation across time periods.

```
score = consistency_factor × 55
```

Users who participate steadily over time score higher than those with sporadic bursts.

### 6. Staking Activity (10%) — Max 55 pts

Rewards sBTC stakers with a combined tier based on amount and duration.

**Amount Tiers:**

| Staked Amount | Tier Score |
|---|---|
| > 1 BTC (100M sats) | 100 |
| > 0.1 BTC | 80 |
| > 0.01 BTC | 60 |
| > 0.001 BTC | 40 |
| > 0 | 20 |

**Duration Modifier:**

| Duration | Modifier |
|---|---|
| > 12 months (~62,208 blocks) | 100 |
| > 6 months (~31,104 blocks) | 80 |
| > 3 months (~15,552 blocks) | 60 |
| > 1 month (~4,320 blocks) | 40 |
| > 0 | 20 |

**Combined:**

```
staking_score = (amount_tier × duration_modifier / 100) × 55 / 100
```

---

## How Scores Update

Scores are updated on-chain whenever a relevant action occurs:

| Trigger | Contract Call | Components Affected |
|---|---|---|
| Circle contribution | `halo-credit.record-payment` | Payment history, Volume |
| Circle completion | `halo-credit.record-circle-completion` | Circle completion |
| sBTC staked | `halo-credit.record-staking-activity` | Staking activity |

Only **authorized contracts** can call these functions. The admin grants authorization via `authorize-contract`:

```clarity
(contract-call? .halo-credit authorize-contract .halo-circle)
(contract-call? .halo-credit authorize-contract .halo-sbtc-staking)
```

---

## Payment History

The credit contract stores the last **100 payments** per user as an on-chain list:

```clarity
{
  circle-id: uint,
  round: uint,
  amount: uint,
  on-time: bool,
  block: uint
}
```

This provides a transparent, auditable record of every contribution a user has made.

---

## Querying Your Score

### On-Chain (Clarity)

```clarity
;; By unique ID
(contract-call? .halo-credit get-credit-score unique-id)

;; By wallet address (looks up identity automatically)
(contract-call? .halo-credit get-score-by-wallet wallet-address)

;; Full credit data
(contract-call? .halo-credit get-credit-data unique-id)

;; Score tier label
(contract-call? .halo-credit get-score-tier u720)
;; → "Good"
```

### API

```
GET /api/credit/score
```

Returns:

```json
{
  "score": 720,
  "tier": "Good",
  "components": {
    "paymentHistory": { "score": 168, "max": 192, "onTime": 45, "total": 52 },
    "circleCompletion": { "score": 88, "max": 110, "completed": 4, "defaulted": 0 },
    "volume": { "score": 62, "max": 82, "totalVolume": "15000000000" },
    "tenure": { "score": 45, "max": 55, "firstActivity": 6800000 },
    "consistency": { "score": 40, "max": 55 },
    "stakingActivity": { "score": 17, "max": 55, "staked": "1000000", "duration": 8640 }
  },
  "lastUpdated": 7010000
}
```

---

## Score Benefits

Higher credit scores unlock tangible benefits in the protocol:

| Benefit | How |
|---|---|
| **Lower collateral** | Future: Excellent-tier users may qualify for reduced LTV requirements |
| **Priority access** | Circle creators can set minimum score requirements |
| **Reputation signal** | Score is publicly queryable — proves creditworthiness |
| **Staking boost** | Staking activity directly improves your score |

---

## Design Principles

1. **Fully on-chain**: No off-chain oracles or centralized scoring. Everything is verifiable from contract state.
2. **Deterministic**: Given the same inputs, the same score is produced. No randomness or hidden weights.
3. **Portable**: Your score is tied to your Stacks identity, not a specific app. Any protocol can read it.
4. **Sybil-resistant**: Scores require real economic activity (contributions, staking). You can't game the system without putting capital at risk.
5. **Privacy-respecting**: Scores are public, but linked to wallet addresses, not real-world identity.
