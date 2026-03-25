---
sidebar_position: 3
title: Tokenomics & Fees
description: Protocol fees, yield distribution, and token mechanics.
---

# Tokenomics & Fees

Halo Protocol uses existing tokens (STX, sBTC, stablecoins) rather than issuing its own token. Revenue comes from protocol fees on circle payouts.

---

## Protocol Fee

A fee is deducted from each circle payout:

| Parameter | Value |
|---|---|
| Default fee | 1% (100 basis points) |
| Range | 0–10% (0–1000 basis points) |
| Configurable by | Admin |
| Applied to | Each round's payout |

### Example

5-member circle, 100 STX contribution:
- Pool: 500 STX
- Protocol fee: 5 STX (1%)
- Member payout: 495 STX

### Fee Destination

Protocol fees are collected in the contract. Admin can withdraw fees for protocol development, security audits, and operational costs.

---

## Supported Tokens

Halo does not have a native governance token. The protocol works with existing Stacks ecosystem tokens:

| Token | Use Cases | Decimals |
|---|---|---|
| **STX** | Circle contributions, vault collateral, transaction fees | 6 |
| **hUSD** | Testnet stablecoin, circle contributions, vault collateral | 6 |
| **sBTC** | Vault collateral, staking for yield + credit boost | 8 |
| **USDCx** | Bridged USDC, vault collateral (mainnet) | 6 |

---

## Yield Sources

### Vault Yield

Vault depositors earn yield from admin-funded reward pools:

```
yield_rate = funded_amount / duration_blocks
user_yield = (user_deposit / total_deposits) × yield_rate × blocks_elapsed
```

- Funded by the protocol from fee revenue or partnerships
- Distributed proportionally to all depositors
- Claimable at any time

### Staking Yield

sBTC stakers earn yield from a separate reward pool:

```
staking_yield = (user_stake / total_staked) × reward_rate × blocks_elapsed
```

- Separate from vault yield
- Requires minimum lock period (30 days default)
- Also boosts credit score

### Bidding Circle Dividends

In V2 circles, non-winning members earn dividends each round:

```
dividend = (pool - protocol_fee - winning_bid) / total_members
```

This creates an earning opportunity for patient members who don't bid.

---

## Economic Incentive Alignment

| Actor | Incentive | Mechanism |
|---|---|---|
| **Contributors** | Build credit, receive payouts | On-time payments improve score |
| **Depositors** | Earn yield on idle capital | Vault yield distribution |
| **Stakers** | Earn yield + credit boost | Staking rewards + score component |
| **Bidders** | Flexible access to funds | Win pool early (pay premium) |
| **Patient members** | Earn dividends | Surplus from low bids |
| **Protocol** | Fee revenue | 1% of all payouts |

---

## No Token, No Governance Token

Halo intentionally avoids issuing a governance or utility token:

- **No speculative dynamics** — The protocol's value comes from utility, not token price
- **No token unlocks** — No insider vesting schedules to worry about
- **Simpler regulation** — No token sale, no securities concerns
- **Aligned incentives** — Revenue comes from real usage (fees), not token inflation
- **Future flexibility** — A token could be introduced later if the community demands it

---

## Fee Revenue Model

```
Annual Revenue = Active Circles × Avg Members × Contribution × Rounds/Year × Fee Rate

Example:
  100 active circles × 5 members × 100 STX × 12 rounds/year × 1%
  = 60,000 STX in annual protocol fees
```

Revenue scales linearly with adoption. No inflationary pressure.
