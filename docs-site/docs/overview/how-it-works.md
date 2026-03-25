---
sidebar_position: 2
title: How It Works
description: A visual walkthrough of the Halo Protocol user journey.
---

# How It Works

A step-by-step walkthrough of using Halo Protocol, from first sign-in to circle completion.

---

## The User Journey

```
1. SIGN UP          2. DEPOSIT           3. JOIN              4. PARTICIPATE       5. COMPLETE
┌──────────┐       ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│ Sign in  │──────▶│ Deposit  │───────▶│ Create/  │───────▶│Contribute│───────▶│ Receive  │
│ + Bind   │       │Collateral│        │ Join a   │        │ Each     │        │ Payout + │
│ Wallet   │       │ to Vault │        │ Circle   │        │ Round    │        │ Build    │
│          │       │          │        │          │        │          │        │ Credit   │
└──────────┘       └──────────┘        └──────────┘        └──────────┘        └──────────┘
```

---

## Step 1: Sign Up & Bind Wallet

**What happens:**
- Sign in with Google or GitHub
- Connect your Stacks wallet (Leather or Xverse)
- Bind your wallet to your social identity (one-time transaction)

**Why it matters:**
This creates a Sybil-resistant identity. One person = one identity = one credit score. The binding is permanent, ensuring credit scores can't be gamed by switching wallets.

**On-chain:**
```clarity
(contract-call? .halo-identity bind-wallet unique-id)
```

---

## Step 2: Deposit Collateral

**What happens:**
- Choose an asset: hUSD (80% LTV), STX (50% LTV), or sBTC (50% LTV)
- Deposit into the Halo vault
- Your collateral capacity is calculated based on the deposit value and LTV ratio

**Why it matters:**
Collateral protects other circle members. If you default, your collateral covers the gap. Higher deposits = more capacity to join circles.

**Example:**
> Deposit 1,000 hUSD → Capacity: $800 (at 80% LTV)
> This lets you join circles with up to $800 in total commitment.

---

## Step 3: Create or Join a Circle

### Creating a Circle

**What happens:**
- Set the terms: name, contribution amount, member count, round duration
- The circle enters FORMING status
- Share the invite link with friends or community members

### Joining a Circle

**What happens:**
- Click an invite link or browse the Explore page
- The vault checks if you have enough collateral capacity
- Collateral is locked for your commitment
- When the last member joins, the circle automatically activates

**Collateral locked:**
```
commitment = contribution × (total_members - 1)
```

---

## Step 4: Participate Each Round

### Classic ROSCA (V1)

Each round is simple:

```
┌───────────────────────────────────────┐
│              Round N                   │
│                                       │
│  1. All members contribute X amount   │
│  2. Contributions within grace period │
│     are marked "on-time"              │
│  3. Once all contribute, payout is    │
│     processed to position N member    │
│  4. Protocol fee (1%) deducted        │
│  5. Credit scores updated             │
│  6. Round advances                    │
└───────────────────────────────────────┘
```

### Bidding Circle (V2)

Each round has three phases:

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  CONTRIBUTE    │───▶│     BID        │───▶│    SETTLE      │
│                │    │                │    │                │
│ All members    │    │ Eligible       │    │ Lowest bidder  │
│ contribute X   │    │ members place  │    │ wins the pool  │
│                │    │ bids for the   │    │                │
│                │    │ pool           │    │ Surplus split   │
│                │    │                │    │ as dividends   │
└────────────────┘    └────────────────┘    └────────────────┘
```

---

## Step 5: Complete & Build Credit

**What happens when a circle completes:**
- All rounds have been processed
- Circle status changes to COMPLETED
- All collateral commitments are released
- Members can withdraw their vault deposits
- Circle completion is recorded in credit scores

**Credit score update:**

```
┌─────────────────────────────────────┐
│         Credit Score Impact          │
│                                     │
│  ✓ On-time payments → +score        │
│  ✓ Circle completed → +score        │
│  ✓ Volume increased → +score        │
│  ✓ Tenure extended → +score         │
│  ✗ Late payments → -score           │
│  ✗ Default → -score + slashing      │
└─────────────────────────────────────┘
```

---

## Optional: Stake sBTC

At any point, you can stake sBTC for additional benefits:

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  Stake   │──────▶│  Lock    │──────▶│  Earn    │
│  sBTC    │       │  Period  │       │  Yield + │
│          │       │  (~30d)  │       │  Credit  │
│          │       │          │       │  Boost   │
└──────────┘       └──────────┘       └──────────┘
```

Staking affects the **Staking Activity** component of your credit score (10% weight).

---

## The Full Picture

```
                    ┌─────────────────┐
                    │   Your Wallet   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  halo-identity  │
                    │ (Verify Once)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │  halo-vault   │ │  halo-   │ │ halo-sbtc-  │
     │  (Deposit     │ │  circle  │ │ staking     │
     │   Collateral) │ │  (Join & │ │ (Stake for  │
     │               │ │   Play)  │ │  Yield)     │
     └───────────────┘ └────┬─────┘ └──────┬──────┘
                            │              │
                    ┌───────▼──────────────▼┐
                    │     halo-credit       │
                    │  (Score: 300–850)     │
                    │  Portable · On-Chain  │
                    └──────────────────────┘
```

Every interaction builds your on-chain reputation. Over time, your credit score becomes a valuable, portable asset that proves your creditworthiness across the entire Stacks ecosystem.
