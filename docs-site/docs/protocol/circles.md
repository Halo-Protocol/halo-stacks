---
sidebar_position: 2
title: Lending Circles
description: How Halo's decentralized lending circles work — Classic ROSCA and Bidding modes.
---

# Lending Circles

Lending circles are the core primitive of Halo Protocol. A group of people pool money together, and each person takes turns receiving the full pot. Smart contracts guarantee that everyone contributes fairly and receives their payout.

---

## How It Works

### The Basics

1. **A creator starts a circle** with fixed terms: contribution amount, number of members, round duration, and grace period.
2. **Members join** the circle. Each member must have a verified identity (wallet bound to a social account).
3. **When the circle is full**, it automatically activates. Round 1 begins.
4. **Each round**, every member contributes the fixed amount. One member receives the full pool as their payout.
5. **After all rounds complete** (one round per member), the circle is marked as completed and all collateral is released.

### Example

> Alice creates a circle: 5 members, 100 STX contribution per round.
>
> Each round, all 5 members contribute 100 STX. One member receives 500 STX (minus a 1% protocol fee).
>
> After 5 rounds, every member has contributed 500 STX and received ~495 STX. The circle completes.

---

## Circle Lifecycle

```
FORMING ──→ ACTIVE ──→ COMPLETED
   │           │
   │           ├──→ PAUSED (admin only) ──→ ACTIVE
   │           │
   └──→ DISSOLVED (if not enough members)
```

| Status | Description |
|---|---|
| **FORMING** (0) | Circle is open for members to join. Automatically activates when full. |
| **ACTIVE** (1) | Contributions and payouts are in progress. |
| **PAUSED** (2) | Emergency pause by admin. No contributions or payouts allowed. |
| **COMPLETED** (3) | All rounds finished. Collateral released. |
| **DISSOLVED** (4) | Circle was cancelled before activation. |

---

## Classic ROSCA (V1)

The traditional rotating savings model. Payout order is determined by join position.

### Parameters

| Parameter | Constraints | Description |
|---|---|---|
| `name` | 1–50 characters | Human-readable circle name |
| `contribution-amount` | Min 1,000,000 micro-units | Amount each member contributes per round |
| `total-members` | 3–10 | Number of members in the circle |
| `round-duration` | Min 144 blocks (~1 day) | Length of each round in blocks |
| `grace-period` | ≤ round-duration | Time after round start to contribute on-time |

### Round Flow

```
Round Start
    │
    ├── Members contribute (within grace period = on-time)
    │
    ├── Members contribute (after grace period = late)
    │
    ├── All members contributed?
    │       │
    │       ├── Yes → Process Payout → Advance Round
    │       │
    │       └── No → Wait / Default handling
    │
    └── Last round? → Circle Completed
```

### Payout Order

In V1, payout position is assigned based on join order:

- 1st member to join → receives payout in Round 1
- 2nd member to join → receives payout in Round 2
- ...and so on

### Token Support

Circles can use either:

| Type | ID | How it works |
|---|---|---|
| **STX** | `u0` | Native Stacks token. Contributions use `stx-transfer?` |
| **SIP-010** | `u1` | Any SIP-010 token (hUSD, sBTC, etc.). Contributions use `contract-call? token transfer` |

### Protocol Fee

A protocol fee is deducted from each payout:

- **Default**: 1% (100 basis points)
- **Range**: 0–10% (0–1000 basis points)
- **Admin-configurable** via `set-protocol-fee-rate`

---

## Bidding Chit Fund (V2)

An advanced model inspired by Indian chit funds. Instead of fixed payout order, members **bid** for the pool each round.

### How Bidding Works

1. **Contribute Phase**: All members contribute the fixed amount
2. **Bid Phase**: Members who haven't won yet place bids (how much of the pool they're willing to accept)
3. **Settle Phase**: The **lowest bidder** wins — they receive their bid amount, and the surplus is divided equally among all members as a **dividend**

### Example

> 5-member circle, 100 STX contribution per round.
> Pool = 500 STX.
>
> Alice bids 350 STX, Bob bids 400 STX.
> Alice wins (lowest bid).
>
> - Protocol fee: 1% of 500 = 5 STX
> - Alice receives: 350 STX
> - Surplus: 500 - 5 - 350 = 145 STX
> - Dividend per member: 145 / 5 = 29 STX each
>
> Alice must repay 350 STX over the remaining rounds.

### Bid Constraints

| Rule | Value |
|---|---|
| Minimum bid | 10% of pool |
| Maximum bid | 100% of pool |
| Bid window | At least 72 blocks (~12 hours) |
| Eligible bidders | Members who haven't won yet |

### Winner Repayment

The round winner must repay their bid amount across the remaining rounds:

- Repayment amount per round = `winning_bid / remaining_rounds`
- On-time repayments are tracked and affect credit score
- Late/missed repayments can trigger collateral slashing

### Dividends

When a round settles, the surplus (pool - fee - winning bid) is divided equally among all members. Members claim dividends explicitly via `claim-dividend`.

---

## Collateral Requirements

Before joining a circle, members must have sufficient collateral deposited in the [Vault](vault).

The required collateral is calculated as:

```
commitment_usd = contribution_amount × (total_members - 1) × token_price
```

This represents the maximum amount a member could owe if they default on all remaining rounds. The vault's LTV ratio determines how much collateral is needed to cover this commitment:

```
required_collateral = commitment_usd / ltv_ratio
```

| Collateral Type | LTV Ratio | Example: 100 STX circle, 5 members |
|---|---|---|
| hUSD / USDCx | 80% | Need $500 commitment → deposit $625 |
| STX | 50% | Need $500 commitment → deposit $1000 in STX |
| sBTC | 50% | Need $500 commitment → deposit $1000 in sBTC |

---

## Credit Impact

Every action in a circle affects your [credit score](credit-scoring):

| Action | Impact |
|---|---|
| On-time contribution | Positive (payment history component) |
| Late contribution | Negative (payment history component) |
| Circle completed successfully | Positive (circle completion component) |
| Circle defaulted | Negative (circle completion component) |
| Contribution volume | Positive (volume component) |

---

## Invite System

Circles support invite-based joining:

1. When a circle is created, a unique **invite code** is generated
2. The creator shares the invite link: `https://gethalo.fun/join/{code}`
3. Members click the link, sign in, and join the circle
4. The invite link also works as a direct API call: `POST /api/circles/invite/{code}`

---

## Constraints & Limits

| Constraint | Value |
|---|---|
| Members per circle | 3–10 |
| Min contribution | 1,000,000 micro-units (~1 STX or 1 hUSD) |
| Min round duration | 144 blocks (~1 day) |
| Grace period | ≤ round duration |
| Protocol fee | 0–10% (default 1%) |
| Identity required | Yes — wallet must be bound via `halo-identity` |
| Collateral required | Yes — sufficient vault deposit required |
