---
sidebar_position: 2
title: FAQ
description: Frequently asked questions about Halo Protocol.
---

# FAQ

---

## General

### What is a ROSCA?

A **Rotating Savings and Credit Association** (ROSCA) is a group savings mechanism used worldwide for centuries. A group of people contribute a fixed amount regularly, and each person takes turns receiving the full pot. Halo brings this concept on-chain with smart contract enforcement.

### Why Stacks?

Stacks is the leading smart contract platform on Bitcoin. By building on Stacks, Halo gets:

- **Bitcoin finality**: Transactions are anchored to the Bitcoin blockchain
- **Clarity language**: A decidable language that prevents common smart contract bugs
- **sBTC integration**: Native access to wrapped Bitcoin
- **Growing ecosystem**: Access to Stacks wallets, DEXs, and other DeFi protocols

### Is Halo custodial?

**No.** Halo is fully non-custodial. Your funds are controlled by smart contracts on the Stacks blockchain. The Halo team cannot access, freeze, or move your funds. The only exception is the admin `pause-circle` function for emergency use, which only prevents new transactions — it cannot move funds.

### What happens if I miss a contribution?

Your collateral in the vault is at risk of being slashed to cover your missed contribution. Your credit score will also take a significant hit. The circle continues for other members — they are protected by the collateral system.

---

## Identity & Wallets

### Why do I need to bind my wallet?

Wallet binding creates a verified, one-to-one link between your social identity and your wallet. This prevents Sybil attacks (one person creating multiple accounts) and enables portable credit scoring.

### Can I change my wallet after binding?

**No.** Wallet binding is permanent and irreversible. This is by design — it ensures credit scores cannot be transferred or reset by switching wallets.

### Which wallets are supported?

- **Leather** (formerly Hiro Wallet) — browser extension and desktop
- **Xverse** — browser extension, iOS, and Android

### Do I need STX to use Halo?

Yes, you need a small amount of STX for transaction fees (gas). On testnet, you can get free STX from the [Stacks faucet](https://explorer.hiro.so/sandbox/faucet).

---

## Circles

### How many members can a circle have?

Between **3 and 10** members.

### What's the minimum contribution?

1,000,000 micro-units, which equals:
- 1 STX
- 1 hUSD
- 0.01 sBTC

### How long does a round last?

The creator sets the round duration. Minimum is 144 blocks (~1 day). Typical circles use 1,008 blocks (~1 week).

### What's the difference between V1 and V2 circles?

| | V1 (Classic ROSCA) | V2 (Bidding) |
|---|---|---|
| Payout order | Fixed (join order) | Auction (lowest bid wins) |
| Dividends | None | Yes (from surplus) |
| Repayment | No | Winner repays bid |
| Complexity | Simple | Advanced |
| Best for | Predictable savings | Active earning |

### What's the protocol fee?

1% of each payout (100 basis points). The admin can adjust this between 0–10%.

### Can a circle be cancelled?

A circle in FORMING status can be dissolved. Once ACTIVE, it can only be paused (by admin) or completed. Pausing is an emergency measure — it doesn't cancel the circle.

---

## Credit Scoring

### How is my score calculated?

Six weighted components:

1. **Payment History** (35%) — on-time vs total payments
2. **Circle Completion** (20%) — completed vs defaulted circles
3. **Volume** (15%) — total contribution amount
4. **Tenure** (10%) — time since first activity
5. **Consistency** (10%) — regularity of participation
6. **Staking Activity** (10%) — sBTC staking amount and duration

### What's the score range?

**300 to 850**, mirroring traditional credit score ranges.

### Can I see other people's scores?

Yes. Credit scores are public and on-chain. Anyone can query any wallet's score using `get-score-by-wallet`.

### Does my score reset?

No. Your score is permanent and tied to your identity. You can only improve it through positive behavior.

---

## Vault & Collateral

### Why do I need collateral?

Collateral protects circle members from defaults. If someone misses a contribution, their collateral is slashed to cover the gap.

### What assets can I use as collateral?

- **hUSD** (80% LTV) — test stablecoin
- **USDCx** (80% LTV) — bridged USDC
- **STX** (50% LTV) — native Stacks token
- **sBTC** (50% LTV) — wrapped Bitcoin

### What is LTV?

**Loan-to-Value** ratio. It determines how much borrowing capacity your collateral provides. For example, at 80% LTV, $100 of hUSD gives you $80 of capacity.

### Can I withdraw collateral during a circle?

Only if your remaining capacity still covers your commitments. You cannot withdraw below your committed amount.

### Do I earn yield on my collateral?

Yes, when the yield pool is funded. Yield accrues continuously and proportionally to your deposit share.

---

## Staking

### What is sBTC staking?

You can stake sBTC (wrapped Bitcoin) to earn yield rewards and boost your credit score.

### How long is the lock period?

Default: **4,320 blocks (~30 days)**. Each new stake resets the timer.

### How does staking affect my credit score?

Staking contributes to the **Staking Activity** component (10% weight, max 55 points). The score depends on both the amount staked and how long you've been staking.

---

## Technical

### What blockchain does Halo use?

**Stacks** — a Bitcoin layer that enables smart contracts. Stacks transactions settle on Bitcoin.

### What language are the contracts in?

**Clarity 3** — a decidable, non-Turing-complete language designed for predictable smart contracts.

### Is the code open source?

Yes. All smart contracts and application code are open source.

### How do I report a bug?

For security vulnerabilities, email **security@gethalo.fun**. For other bugs, open an issue on GitHub.
