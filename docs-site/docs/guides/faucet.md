---
sidebar_position: 4
title: Testnet Faucet
description: Get free hUSD and sBTC tokens on testnet.
---

# Testnet Faucet

The Halo faucet distributes free test tokens so you can try the protocol without real funds.

---

## What You Get

Each faucet request provides:

| Token | Amount | Decimals | USD Equivalent |
|---|---|---|---|
| hUSD | 1,000 | 6 | ~$1,000 |
| sBTC | 0.01 | 8 | ~$600 (varies) |

---

## How to Use

### Via the Dashboard

1. Sign in and bind your wallet
2. Go to your **Dashboard**
3. Click **Get Test Tokens**
4. Tokens arrive after the transactions confirm (~10 minutes)

### Via API

```bash
curl -X POST https://gethalo.fun/api/faucet \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>"
```

Response:

```json
{
  "success": true,
  "hUsdTxId": "0x...",
  "sbtcTxId": "0x...",
  "hUsdAmount": 1000000000,
  "sbtcAmount": 1000000
}
```

---

## Rate Limit

- **1 request per 24 hours** per wallet address
- The cooldown starts from your last successful request
- Attempting to request again within 24 hours returns a `429` error

---

## How It Works

The faucet uses the **deployer wallet** to mint tokens directly to your address:

1. `halo-mock-token.mint(1000000000, recipient)` — 1,000 hUSD
2. `halo-mock-sbtc.mint(1000000, recipient)` — 0.01 sBTC

Both transactions are submitted with sequential nonces via the [nonce manager](/developers/api) to prevent conflicts.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Rate limited" | Wait 24 hours from your last request |
| "Wallet not bound" | Complete identity binding first |
| Transaction pending | Check the [Stacks Explorer](https://explorer.hiro.so/) — testnet can be slow |
| Tokens not showing | Add hUSD/sBTC token contracts to your wallet manually |
