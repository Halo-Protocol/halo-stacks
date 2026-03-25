---
sidebar_position: 1
title: Protocol Overview
description: Architecture, smart contract design, and how the pieces fit together.
---

# Protocol Overview

Halo Protocol consists of **8 smart contracts** on Stacks that work together to deliver trustless lending circles with on-chain credit scoring and collateral protection.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│         Wallet Connect · Dashboard · Circle UI           │
├─────────────────────────────────────────────────────────┤
│                    Backend API (Next.js)                  │
│      Auth · Circle Management · Credit · Vault · Faucet  │
├─────────────────────────────────────────────────────────┤
│                  Stacks Blockchain (Clarity 3)            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  halo-circle  │  │  halo-credit │  │  halo-vault   │  │
│  │  (ROSCA Core) │──│  (Scoring)   │  │  (Collateral) │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                  │                   │          │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴───────┐  │
│  │halo-identity │  │halo-sbtc-    │  │ halo-mock-    │  │
│  │(User Binding)│  │staking       │  │ token / sbtc  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            halo-sip010-trait (SIP-010)            │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Contract Dependency Graph

| Contract | Depends On | Called By |
|---|---|---|
| `halo-sip010-trait` | — | All token contracts |
| `halo-identity` | — | `halo-circle`, `halo-credit`, `halo-sbtc-staking` |
| `halo-mock-token` | `halo-sip010-trait` | `halo-vault`, `halo-circle` |
| `halo-mock-sbtc` | `halo-sip010-trait` | `halo-vault`, `halo-sbtc-staking` |
| `halo-credit` | `halo-identity` | `halo-circle`, `halo-sbtc-staking` |
| `halo-vault` | `halo-sip010-trait` | `halo-circle` |
| `halo-sbtc-staking` | `halo-identity`, `halo-credit`, `halo-sip010-trait` | — |
| `halo-circle` | `halo-identity`, `halo-credit`, `halo-vault` | — |

---

## Deployment Order

Contracts must be deployed in this exact order due to dependencies:

1. **halo-sip010-trait** — SIP-010 fungible token trait
2. **halo-identity** — Identity binding (wallet ↔ unique ID)
3. **halo-mock-token** — hUSD test stablecoin
4. **halo-mock-sbtc** — Mock sBTC for testing
5. **halo-credit** — Credit scoring engine
6. **halo-vault** — Collateral vault
7. **halo-sbtc-staking** — sBTC staking with credit boost
8. **halo-circle** — Core lending circle logic

After deployment, the admin must authorize cross-contract calls:

```clarity
;; Allow halo-circle to record payments in the credit system
(contract-call? .halo-credit authorize-contract .halo-circle)

;; Allow halo-circle to lock/release collateral in the vault
(contract-call? .halo-vault authorize-contract .halo-circle)

;; Allow halo-sbtc-staking to record staking in credit system
(contract-call? .halo-credit authorize-contract .halo-sbtc-staking)
```

---

## Token Standards

All fungible tokens in Halo implement **SIP-010**, the Stacks standard for fungible tokens (analogous to ERC-20).

| Token | Symbol | Decimals | Purpose |
|---|---|---|---|
| Halo Test USD | hUSD | 6 | Testnet stablecoin (1 hUSD = 1,000,000 micro-units) |
| Mock sBTC | sBTC | 8 | Testnet Bitcoin wrapper (1 sBTC = 100,000,000 sats) |
| USDCx | USDCx | 6 | Bridged USDC on Stacks (mainnet) |

---

## Circle Modes

Halo supports two distinct circle types:

### Classic ROSCA (V1)
The traditional rotating savings model. Members contribute equally each round, and the payout recipient is determined by join order (position-based). Simple, predictable, and fair.

### Bidding Chit Fund (V2)
An advanced model where members bid for early access to the pool. The lowest bidder wins each round, pays their bid amount, and the surplus is distributed as dividends to all members. This creates a market-driven mechanism where members who need funds urgently pay a premium, while patient members earn dividends.

[Read the full comparison →](circles)

---

## Security Model

### On-Chain Guarantees
- **Immutable rules**: Circle terms (contribution, members, rounds) are set at creation and cannot be changed
- **Collateral enforcement**: The vault contract enforces LTV ratios — members cannot withdraw below their commitment
- **Slashing**: Defaulting members lose collateral proportional to their obligation
- **Authorization**: Only admin-approved contracts can call sensitive functions (record payments, lock collateral)

### Off-Chain Security
- **Rate limiting**: 3-tier sliding window (60/10/20 requests per minute by endpoint type)
- **Input sanitization**: HTML stripping, string sanitization, transaction ID validation
- **CSP headers**: Strict Content Security Policy with no `unsafe-eval`
- **Timing-safe auth**: Admin endpoints use `crypto.timingSafeEqual` to prevent timing attacks
- **Fetch timeouts**: 15-second AbortController on all external API calls

[Read the full security documentation →](/resources/security)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Clarity 3, Epoch 3.0 |
| Blockchain | Stacks (anchored to Bitcoin) |
| Backend | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma v6 |
| Auth | NextAuth.js v4 (Google + GitHub OAuth) |
| Frontend | React, Tailwind CSS v3, shadcn/ui |
| Wallet | @stacks/connect v8 (Leather / Xverse) |
| Testing | Vitest 4, Clarinet SDK, Playwright |
