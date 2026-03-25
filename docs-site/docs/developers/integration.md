---
sidebar_position: 3
title: Integration Guide
description: How to integrate with Halo Protocol from your own application.
---

# Integration Guide

Halo's smart contracts are public and permissionless. Any application can read credit scores, check circle status, or build on top of Halo's primitives.

---

## Reading Credit Scores

The most common integration: check a user's Halo credit score from your own contract or app.

### From Clarity

```clarity
;; By wallet address
(contract-call? 'DEPLOYER.halo-credit get-score-by-wallet wallet-address)
;; → (response uint uint)

;; By unique ID (if you have it)
(contract-call? 'DEPLOYER.halo-credit get-credit-score unique-id)
;; → uint (300 if not found)

;; Get the tier label
(contract-call? 'DEPLOYER.halo-credit get-score-tier u720)
;; → "Good"
```

### From JavaScript/TypeScript

```typescript
import { fetchCallReadOnlyFunction } from '@stacks/transactions';
import { networkFromName } from '@stacks/network';

const result = await fetchCallReadOnlyFunction({
  contractAddress: 'DEPLOYER_ADDRESS',
  contractName: 'halo-credit',
  functionName: 'get-score-by-wallet',
  functionArgs: [principalCV(walletAddress)],
  network: networkFromName('testnet'),
  senderAddress: walletAddress,
});
```

### From the API

```bash
# Requires authenticated session
curl https://gethalo.fun/api/credit/score \
  -H "Cookie: <session-cookie>"
```

---

## Checking Identity

Verify if a wallet has a Halo identity:

```clarity
(contract-call? 'DEPLOYER.halo-identity is-wallet-bound wallet)
;; → bool
```

Look up the unique ID:

```clarity
(contract-call? 'DEPLOYER.halo-identity get-id-by-wallet wallet)
;; → (optional (buff 32))
```

---

## Checking Vault Capacity

See if a user has capacity for a new commitment:

```clarity
(contract-call? 'DEPLOYER.halo-vault can-commit user additional-commitment-usd)
;; → (response bool uint)
```

Get available capacity:

```clarity
(contract-call? 'DEPLOYER.halo-vault get-available-capacity user)
;; → (response uint uint)  ;; USD value with 6 decimals
```

---

## Reading Circle Data

```clarity
;; Get circle details
(contract-call? 'DEPLOYER.halo-circle get-circle circle-id)

;; Check membership
(contract-call? 'DEPLOYER.halo-circle get-member circle-id wallet)

;; Check contribution for a round
(contract-call? 'DEPLOYER.halo-circle get-contribution circle-id wallet round)

;; Total circles created
(contract-call? 'DEPLOYER.halo-circle get-circle-count)
```

---

## Stacks SDK Setup

### Installation

```bash
npm install @stacks/transactions @stacks/network @stacks/connect
```

### Key Differences (v7)

Halo uses Stacks SDK v7. Key changes from v6:

| v6 (Old) | v7 (Current) |
|---|---|
| `callReadOnlyFunction(...)` | `fetchCallReadOnlyFunction(...)` |
| `new StacksTestnet()` | `networkFromName("testnet")` |
| `makeStandardSTXPostCondition(...)` | `Pc.principal(addr).willSendEq(amount).ustx()` |
| `AnchorMode.Any` | Omit (not needed) |

### Example: Read-Only Call

```typescript
import {
  fetchCallReadOnlyFunction,
  uintCV,
  principalCV,
  cvToJSON,
} from '@stacks/transactions';
import { networkFromName } from '@stacks/network';

async function getCreditScore(walletAddress: string): Promise<number> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: 'DEPLOYER_ADDRESS',
    contractName: 'halo-credit',
    functionName: 'get-score-by-wallet',
    functionArgs: [principalCV(walletAddress)],
    network: networkFromName('testnet'),
    senderAddress: walletAddress,
  });

  const json = cvToJSON(result);
  return json.value?.value || 300;
}
```

### Example: Contract Call (Write)

```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV, contractPrincipalCV } from '@stacks/transactions';
import { networkFromName } from '@stacks/network';

await openContractCall({
  contractAddress: 'DEPLOYER_ADDRESS',
  contractName: 'halo-circle',
  functionName: 'contribute-stx',
  functionArgs: [uintCV(circleId)],
  network: networkFromName('testnet'),
  onFinish: (data) => {
    console.log('TX ID:', data.txId);
  },
});
```

---

## Webhook / Event Monitoring

Halo's backend includes an event listener that monitors blockchain events. You can build similar monitoring:

```typescript
// Poll the Stacks API for contract events
const response = await fetch(
  `https://api.hiro.so/extended/v1/contract/${contractAddress}.${contractName}/events?limit=20`
);
const events = await response.json();
```

Or sync via the admin API:

```bash
curl -X POST https://gethalo.fun/api/admin/sync \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

---

## Token Decimals Reference

When working with amounts, remember the decimal precision:

| Token | Decimals | 1 token = | Example |
|---|---|---|---|
| hUSD | 6 | 1,000,000 | 100 hUSD = `100000000` |
| STX | 6 | 1,000,000 | 50 STX = `50000000` |
| sBTC | 8 | 100,000,000 | 0.01 sBTC = `1000000` |
| USDCx | 6 | 1,000,000 | 250 USDC = `250000000` |

---

## Block Time Reference

Stacks produces approximately **144 blocks per day**:

| Duration | Blocks |
|---|---|
| 1 hour | ~6 |
| 1 day | ~144 |
| 1 week | ~1,008 |
| 1 month | ~4,320 |
| 3 months | ~15,552 |
| 6 months | ~31,104 |
| 1 year | ~62,208 |
