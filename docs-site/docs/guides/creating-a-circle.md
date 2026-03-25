---
sidebar_position: 3
title: Creating a Circle
description: Step-by-step guide to creating and managing a lending circle.
---

# Creating a Circle

This guide walks you through creating a lending circle, inviting members, and managing it through completion.

---

## Before You Start

Make sure you have:

- A **bound identity** (wallet linked to social account)
- **Collateral deposited** in the vault (enough to cover your commitment)
- **STX** for transaction fees

---

## Choose Your Circle Type

### Classic ROSCA (V1)

Best for: Groups who want simple, predictable payouts in fixed order.

- Fixed payout order (based on join position)
- Everyone knows when they'll receive their payout
- Simple to understand

### Bidding Chit Fund (V2)

Best for: Groups who want market-driven payouts with earning potential.

- Members bid for early access to the pool
- Lowest bidder wins each round
- Non-winners earn dividends from the surplus
- More complex but potentially more rewarding

---

## Creating a Classic Circle (V1)

### 1. Set Parameters

| Parameter | What to Consider |
|---|---|
| **Name** | Choose something descriptive (e.g., "Monthly Savings Club") |
| **Contribution** | How much each member contributes per round. Must be ≥ 1 STX / 1 hUSD |
| **Members** | 3–10 people. Smaller = faster completion, larger = bigger payouts |
| **Round Duration** | How long each round lasts. Min 144 blocks (~1 day). Typical: 1,008 blocks (~1 week) |
| **Grace Period** | Time to contribute before being marked late. Set ≤ round duration |
| **Token** | STX (native) or a SIP-010 token (hUSD, sBTC) |

### 2. Create on the App

1. Go to **Circles** → **Create Circle**
2. Fill in the parameters
3. Click **Create Circle**
4. Approve the transaction in your wallet
5. Wait for confirmation

### 3. Share the Invite Link

After creation, you'll receive:
- An **invite code** (e.g., `abc123`)
- An **invite link** (e.g., `https://gethalo.fun/join/abc123`)

Share this link with people you want to invite.

### 4. Wait for Members

- You're automatically the first member
- The circle stays in **FORMING** status until all spots are filled
- When the last member joins, the circle automatically activates

---

## Creating a Bidding Circle (V2)

The process is similar, with an additional parameter:

| Parameter | Description |
|---|---|
| **Bid Window** | How long the bidding phase lasts each round (min 72 blocks, ~12 hours) |

The round flow in V2 is:

1. **Contribute Phase** → All members contribute
2. **Bid Phase** → Eligible members place bids (bid window duration)
3. **Settle Phase** → Lowest bidder wins, dividends distributed

---

## Managing Your Circle

### During FORMING

- Share the invite link to fill remaining spots
- Track who has joined on the circle detail page

### During ACTIVE

Each round:

1. **Contribute** your amount before the grace period ends
2. **Check the dashboard** for round status and deadlines
3. **Process payout** — any member can trigger this after all contributions are in
4. In V2: **Place a bid** during the bid window if you want the pool this round

### Monitoring

Track your circle's status:

```
GET /api/circles/{id}
```

Returns members, contributions, current round, payout history, and on-chain state.

---

## Collateral Calculation

When you create/join a circle, the vault locks collateral:

```
commitment = contribution × (total_members - 1)
```

**Example**: 100 STX contribution, 5 members:
- Commitment = 100 × 4 = 400 STX worth of collateral needed
- With 80% LTV (hUSD): deposit 500 hUSD
- With 50% LTV (STX): deposit 800 STX worth

Make sure you have enough deposited before creating or joining.

---

## Tips for Circle Creators

1. **Start small** — Try a 3-member circle with low stakes first
2. **Set reasonable timelines** — Weekly rounds work well for most groups
3. **Use the grace period wisely** — Give members at least half the round duration
4. **Choose members carefully** — Collateral protects against defaults, but smooth circles work better with reliable participants
5. **Use hUSD for stable-value circles** — STX price fluctuations can affect real value

---

## What Happens on Default

If a member fails to contribute:

1. Their collateral can be **slashed** to cover the missing contribution
2. Their credit score takes a **significant hit**
3. The circle can continue — other members are protected by the collateral

This is why collateral requirements exist: they ensure the circle can complete even if someone defaults.
