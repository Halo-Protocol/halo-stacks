---
sidebar_position: 4
title: Collateral Vault
description: Multi-asset collateral vault with LTV enforcement, yield distribution, and slashing.
---

# Collateral Vault

The Halo Vault is a multi-asset collateral system that protects lending circles from defaults. Members deposit assets, the vault locks collateral against circle commitments, and yield is distributed to depositors.

---

## How It Works

```
┌─────────────────────────────────────────────┐
│                  Halo Vault                  │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │  hUSD   │  │   STX   │  │    sBTC     │ │
│  │  80% LTV│  │  50% LTV│  │   50% LTV   │ │
│  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │             │              │         │
│       └─────────────┼──────────────┘         │
│                     │                        │
│            ┌────────┴────────┐               │
│            │ Total Capacity  │               │
│            │ (USD-denominated)│               │
│            └────────┬────────┘               │
│                     │                        │
│     ┌───────────────┼───────────────┐        │
│     │               │               │        │
│  ┌──┴───┐      ┌────┴────┐    ┌────┴────┐   │
│  │ Free │      │Committed│    │  Yield  │   │
│  │      │      │(locked) │    │  Pool   │   │
│  └──────┘      └─────────┘    └─────────┘   │
└─────────────────────────────────────────────┘
```

---

## Supported Assets

| Asset | Type ID | Decimals | LTV Ratio | Description |
|---|---|---|---|---|
| **hUSD** | `u3` | 6 | 80% | Halo test stablecoin |
| **USDCx** | `u0` | 6 | 80% | Bridged USDC on Stacks |
| **STX** | `u2` | 6 | 50% | Native Stacks token |
| **sBTC** | `u1` | 8 | 50% | Wrapped Bitcoin on Stacks |

Stablecoins get higher LTV ratios (80%) because of lower price volatility. Volatile assets (STX, sBTC) have conservative 50% LTV to absorb price swings.

---

## Key Concepts

### Loan-to-Value (LTV) Ratio

The LTV ratio determines how much borrowing capacity each dollar of collateral provides:

```
capacity = deposit_value_usd × ltv_ratio
```

**Example**: Deposit 1000 hUSD (worth $1000) at 80% LTV → $800 of borrowing capacity.

### Commitment

When you join a circle, the vault **locks** collateral equal to your maximum obligation:

```
commitment_usd = contribution × (total_members - 1) × token_price_usd
```

This represents the worst case — the total amount you'd owe if you defaulted on all future rounds.

### Available Capacity

```
available_capacity = total_capacity - total_committed
```

You can only join new circles if your available capacity covers the new commitment.

---

## Depositing

Deposit assets to build collateral capacity:

```clarity
;; Deposit hUSD
(contract-call? .halo-vault deposit .halo-mock-token u1000000000)  ;; 1000 hUSD

;; Deposit STX (V3)
(contract-call? .halo-vault-v3 deposit-stx u100000000)  ;; 100 STX

;; Deposit sBTC (V3)
(contract-call? .halo-vault-v3 deposit-sbtc .sbtc-token u10000000)  ;; 0.1 sBTC
```

### API

```
POST /api/vault-v3/deposit
Content-Type: application/json

{
  "assetType": "husd",
  "amount": 1000000000
}
```

---

## Withdrawing

You can withdraw deposited assets as long as your remaining capacity still covers all commitments:

```
remaining_capacity = (deposit - withdrawal) × ltv_ratio
must be ≥ total_committed
```

If withdrawing would put you below your commitment, the transaction is rejected.

---

## Collateral Locking

When you join a circle, the vault locks collateral automatically:

1. Circle contract calls `vault.calculate-commitment-usd` to compute required commitment
2. Circle contract calls `vault.lock-collateral(user, circle-id, commitment-usd)`
3. Vault verifies the user has sufficient available capacity
4. Commitment is recorded — locked collateral cannot be withdrawn

---

## Collateral Release

When a circle completes successfully, collateral is released:

```clarity
(contract-call? .halo-vault release-collateral user circle-id)
```

The full commitment amount is freed, and the user can withdraw their assets again.

---

## Slashing

If a member defaults (misses contributions), their collateral can be slashed:

```clarity
(contract-call? .halo-vault slash-collateral user circle-id slash-amount)
```

Slashing:
- Reduces the member's deposit by the slash amount
- Reduces their commitment by the same amount
- The slashed funds are used to cover the defaulted contribution

---

## Yield Distribution

The vault includes a **Synthetix-style** continuous yield distribution system:

### How It Works

1. Admin funds the yield pool: `fund-yield-pool(token, amount, duration-blocks)`
2. Yield rate = `amount / duration` per block
3. Each depositor earns yield proportional to their share of total deposits
4. Yield accrues continuously and can be claimed at any time

### Yield Calculation

```
pending_yield = deposit × (reward_per_token_current - reward_per_token_paid)
```

Where:

```
reward_per_token = reward_per_token_stored + (blocks_elapsed × reward_rate / total_deposits)
```

### Claiming

```clarity
(contract-call? .halo-vault claim-yield .halo-mock-token)
```

### API

```
GET /api/vault-v3/
```

Returns pending yield per asset type in the response.

---

## Price Oracle

The vault uses admin-set token prices to calculate USD-denominated capacity:

```clarity
(contract-call? .halo-vault set-token-price token-principal price-usd decimals)
```

| Parameter | Description |
|---|---|
| `token-principal` | The token contract address |
| `price-usd` | Price in USD with 6 decimal precision ($1.00 = u1000000) |
| `decimals` | Token's decimal places |

Prices must be kept up-to-date by the admin. Future versions will integrate decentralized price feeds.

---

## Vault Configuration

| Parameter | Default | Range | Description |
|---|---|---|---|
| LTV Ratio | 80% (8000 bp) | 50–90% | Loan-to-value ratio |
| Price Precision | 6 decimals | — | USD price precision |
| Yield Precision | 10^12 | — | Internal yield math precision |

Admin functions:

```clarity
(contract-call? .halo-vault set-ltv-ratio u7000)        ;; Set to 70%
(contract-call? .halo-vault set-vault-token token)       ;; Set accepted token
(contract-call? .halo-vault authorize-contract contract)  ;; Authorize caller
```

---

## Error Reference

| Code | Name | Description |
|---|---|---|
| u400 | NOT_AUTHORIZED | Caller is not admin or authorized contract |
| u401 | INVALID_AMOUNT | Zero or negative amount |
| u402 | INSUFFICIENT_BALANCE | Withdrawal exceeds deposit |
| u403 | INSUFFICIENT_CAPACITY | Not enough capacity to cover commitment |
| u404 | NO_DEPOSIT | No deposit found for user |
| u405 | TRANSFER_FAILED | Token transfer failed |
| u406 | INVALID_PARAMS | Invalid function parameters |
| u407 | TOKEN_MISMATCH | Wrong token for this vault |
| u408 | COMMITMENT_NOT_FOUND | No commitment for this circle |
| u409 | ZERO_PRICE | Token price not set |
| u410 | ALREADY_AUTHORIZED | Contract already authorized |
| u411 | VAULT_TOKEN_NOT_SET | Vault token not configured |
| u412 | PRICE_NOT_SET | Token price not configured |
