---
sidebar_position: 2
title: API Reference
description: REST API documentation for the Halo Protocol backend.
---

# API Reference

The Halo backend is a **Next.js 14** API running alongside the frontend. All endpoints are under `/api/`.

**Base URL**: `https://gethalo.fun/api`

**Authentication**: Most endpoints require an authenticated session via NextAuth.js (cookie-based). Admin endpoints use Bearer token authentication.

---

## Authentication

### `GET /api/auth/[...nextauth]`

NextAuth.js OAuth flow. Supports **Google** and **GitHub** providers.

**Session Strategy**: JWT (stateless)

---

## Identity

### `POST /api/identity/bind-wallet`

Initiate wallet binding. Returns transaction parameters for the client to sign.

**Auth**: Required

**Response**:

```json
{
  "txParams": {
    "contractAddress": "...",
    "contractName": "halo-identity",
    "functionName": "bind-wallet",
    "functionArgs": ["0x..."],
    "network": "testnet"
  }
}
```

### `GET /api/identity/check-binding/{txId}`

Check if a binding transaction has confirmed.

**Auth**: Required

**Response**:

```json
{
  "status": "confirmed" | "pending" | "failed",
  "blockHeight": 7010000
}
```

### `POST /api/identity/confirm-binding/{txId}`

Finalize binding after transaction confirmation. Updates the database.

**Auth**: Required

### `GET /api/identity/me`

Get current user profile with wallet binding status.

**Auth**: Required

**Response**:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "walletAddress": "ST...",
  "walletBound": true,
  "walletBoundAt": "2025-01-15T10:30:00Z",
  "creditScore": 720
}
```

---

## Circles (V1 — Classic ROSCA)

### `GET /api/circles`

List circles for the authenticated user.

**Auth**: Required

**Response**:

```json
{
  "circles": [
    {
      "id": "uuid",
      "onChainId": 1,
      "name": "Monthly Savings",
      "contributionAmount": "100000000",
      "totalMembers": 5,
      "currentRound": 3,
      "status": "ACTIVE",
      "memberCount": 5,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/circles`

Create a new circle.

**Auth**: Required (wallet must be bound)

**Body**:

```json
{
  "name": "Monthly Savings",
  "contributionAmount": 100000000,
  "totalMembers": 5,
  "roundDuration": 1008,
  "gracePeriod": 504,
  "tokenType": "stx"
}
```

**Response**:

```json
{
  "circle": { ... },
  "inviteCode": "abc123",
  "inviteLink": "https://gethalo.fun/join/abc123"
}
```

### `GET /api/circles/{id}`

Get circle details including members, contributions, and on-chain state.

### `POST /api/circles/{id}/join`

Join a FORMING circle.

### `POST /api/circles/{id}/contribute`

Contribute to the current round. Returns transaction parameters.

### `POST /api/circles/invite/{code}`

Join a circle via invite code.

---

## Circles (V2 — Bidding)

### `GET /api/circles-v2`

List V2 circles for the authenticated user.

### `POST /api/circles-v2`

Create a bidding circle.

**Body**:

```json
{
  "name": "Bidding Circle",
  "contributionAmount": 100000000,
  "totalMembers": 5,
  "roundDuration": 1008,
  "bidWindowBlocks": 144,
  "gracePeriod": 504,
  "tokenType": "stx"
}
```

### `GET /api/circles-v2/{id}`

Get circle details with bidding state.

### `GET /api/circles-v2/{id}/activity`

Get activity feed: contributions, bids, settlements, dividends.

### `POST /api/circles-v2/{id}/join`

Join a V2 circle.

### `POST /api/circles-v2/{id}/contribute`

Contribute to the current round.

### `POST /api/circles-v2/{id}/bid`

Place a bid during the bid window.

**Body**:

```json
{
  "bidAmount": 350000000
}
```

### `POST /api/circles-v2/{id}/settle`

Settle the current round. Determines winner, distributes dividends.

### `POST /api/circles-v2/{id}/repay`

Winner repays bid amount for a given round.

### `GET /api/circles-v2/{id}/on-chain`

Fetch current on-chain state for the circle.

### `GET /api/circles-v2/explore`

Discover open circles. Supports pagination.

**Query Parameters**:

| Param | Default | Description |
|---|---|---|
| `page` | 1 | Page number |
| `limit` | 10 | Results per page |
| `status` | `FORMING` | Filter by status |

---

## Credit Scoring

### `GET /api/credit/score`

Get the authenticated user's credit score and component breakdown.

**Auth**: Required

**Response**:

```json
{
  "score": 720,
  "tier": "Good",
  "components": {
    "paymentHistory": { "score": 168, "max": 192, "onTime": 45, "total": 52 },
    "circleCompletion": { "score": 88, "max": 110, "completed": 4, "defaulted": 0 },
    "volume": { "score": 62, "max": 82, "totalVolume": "15000000000" },
    "tenure": { "score": 45, "max": 55 },
    "consistency": { "score": 40, "max": 55 },
    "stakingActivity": { "score": 17, "max": 55, "staked": "1000000", "duration": 8640 }
  }
}
```

### `GET /api/credit/history`

Get payment history from on-chain data.

---

## Vault

### `GET /api/vault-v3`

Get vault summary: deposits per asset, capacity, committed amounts, pending yield.

**Auth**: Required

### `POST /api/vault-v3/deposit`

Deposit collateral.

**Body**:

```json
{
  "assetType": "husd" | "stx" | "sbtc" | "usdcx",
  "amount": 1000000000
}
```

### `POST /api/vault-v3/withdraw`

Withdraw collateral (respects LTV constraints).

**Body**:

```json
{
  "assetType": "husd",
  "amount": 500000000
}
```

---

## Faucet

### `POST /api/faucet`

Request testnet tokens. Rate limited to 1 request per 24 hours.

**Auth**: Required (wallet must be bound)

**Response**:

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

## Transactions

### `GET /api/transactions`

Get pending transactions for the authenticated user with status polling.

**Auth**: Required

---

## Health

### `GET /api/health`

Public health check endpoint.

**Auth**: None required

**Response**:

```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Headers**: `Cache-Control: no-store`

---

## Admin

### `GET /api/admin/stats`

Get protocol-wide statistics.

**Auth**: Admin session required

**Response**:

```json
{
  "totalUsers": 150,
  "totalCircles": 25,
  "activeCircles": 12,
  "totalVolume": "500000000000",
  "averageCreditScore": 620
}
```

### `POST /api/admin/sync`

Batch sync circle state from chain to database.

**Auth**: Bearer token (`Authorization: Bearer {ADMIN_API_KEY}`)

**Security**: Uses `crypto.timingSafeEqual` for token comparison.

### `GET /api/admin/vault`

Get vault admin data: total deposits, yield pool status, token prices.

**Auth**: Admin session required

---

## Waitlist

### `POST /api/waitlist`

Add email to pre-launch waitlist.

**Body**: `{ "email": "user@example.com" }`

### `GET /api/waitlist/count`

Get total waitlist signups.

---

## Rate Limiting

All endpoints are rate-limited using an in-memory sliding window:

| Tier | Limit | Endpoints |
|---|---|---|
| Standard | 60 req/min | Most endpoints |
| Strict | 10 req/min | Auth, faucet, write operations |
| Moderate | 20 req/min | Read-heavy endpoints |

Exceeding the limit returns `429 Too Many Requests`.

---

## Error Format

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role/permissions) |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Internal server error |
