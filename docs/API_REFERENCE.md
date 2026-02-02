# Halo Protocol API Reference

> REST API endpoints for the Halo Protocol backend (Next.js 14 App Router).

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: TBD

## Authentication

All authenticated endpoints require a NextAuth.js session. The frontend handles OAuth flow via `/api/auth/signin`.

Session is passed via cookies (same-origin) or `Authorization: Bearer <token>` header (cross-origin).

---

## Auth Endpoints

### `GET /api/auth/session`

Get the current authenticated session.

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Alice",
    "uniqueId": "0x...",
    "walletAddress": "ST1...",
    "status": "active"
  }
}
```

### `GET /api/auth/signin`

Redirects to NextAuth sign-in page with Google + GitHub options.

### `POST /api/auth/signout`

Signs out the current user.

---

## Identity Endpoints

### `GET /api/identity/me`

Get the authenticated user's profile.

**Auth**: Required

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "uniqueId": "0xabcdef...",
  "walletAddress": "ST1...",
  "status": "active"
}
```

### `POST /api/identity/bind-wallet`

Initiate wallet binding. Returns data needed for the on-chain transaction.

**Auth**: Required (status must be `pending_wallet`)

**Request**:
```json
{
  "walletAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
}
```

**Response** (200):
```json
{
  "uniqueId": "0xabcdef...",
  "walletAddress": "ST1...",
  "message": "Use these values to call halo-identity.bind-wallet on-chain..."
}
```

**Errors**:
- 400: Wallet already bound
- 409: Wallet linked to another account

### `POST /api/identity/confirm-binding`

Confirm wallet binding after the on-chain transaction is confirmed.

**Auth**: Required

**Request**:
```json
{
  "txId": "0xabc123...",
  "walletAddress": "ST1..."
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "uniqueId": "0x...",
  "walletAddress": "ST1...",
  "status": "active",
  "walletBoundAt": "2026-02-06T12:00:00.000Z"
}
```

**Errors**:
- 400: TX failed on-chain / already bound
- 202: TX still pending (retry later)

---

## Circle Endpoints

### `GET /api/circles`

List the authenticated user's circles (as member or creator).

**Auth**: Required + wallet bound

**Response** (200):
```json
[
  {
    "id": "uuid",
    "onChainId": 1,
    "name": "Office Fund",
    "contributionAmount": "100000000",
    "totalMembers": 5,
    "currentMembers": 3,
    "tokenType": 0,
    "inviteCode": "ABC123XY",
    "status": "forming",
    "creatorName": "Alice",
    "createdAt": "2026-02-06T12:00:00.000Z"
  }
]
```

### `POST /api/circles`

Create a new lending circle.

**Auth**: Required + wallet bound

**Request**:
```json
{
  "name": "Office Fund",
  "contributionAmount": 100000000,
  "totalMembers": 5,
  "roundDurationDays": 30,
  "gracePeriodDays": 1,
  "tokenType": 0,
  "tokenContract": null
}
```

**Parameters**:
- `name` (string, 3-30 chars): Circle display name
- `contributionAmount` (int, positive): Amount per round in micro-units
- `totalMembers` (int, 3-10): Number of members
- `roundDurationDays` (int, 7|14|30): Duration of each round
- `gracePeriodDays` (int, 1-7, default 1): Grace period for late payments
- `tokenType` (int, 0|1, default 0): 0=STX, 1=SIP-010
- `tokenContract` (string, optional): SIP-010 contract principal (required if tokenType=1)

**Response** (201):
```json
{
  "id": "uuid",
  "inviteCode": "ABC123XY",
  "inviteLink": "http://localhost:3001/join/ABC123XY",
  "onChainParams": {
    "name": "Office Fund",
    "contributionAmount": 100000000,
    "totalMembers": 5,
    "roundDuration": 4320,
    "gracePeriod": 144,
    "tokenType": 0,
    "tokenContract": null
  }
}
```

### `GET /api/circles/[id]`

Get detailed circle info including members, contributions, and payouts.

**Auth**: Required

**Response** (200):
```json
{
  "id": "uuid",
  "onChainId": 1,
  "name": "Office Fund",
  "contributionAmount": "100000000",
  "totalMembers": 5,
  "status": "active",
  "creator": { "id": "uuid", "name": "Alice", "walletAddress": "ST1..." },
  "members": [
    {
      "userId": "uuid",
      "name": "Alice",
      "walletAddress": "ST1...",
      "payoutPosition": 1,
      "status": "confirmed"
    }
  ],
  "contributions": [],
  "payouts": []
}
```

### `POST /api/circles/[id]/join`

Join an existing circle.

**Auth**: Required + wallet bound

**Response** (201):
```json
{
  "membershipId": "uuid",
  "circleId": "uuid",
  "onChainCircleId": 1,
  "payoutPosition": 2,
  "message": "Call halo-circle.join-circle on-chain to confirm membership"
}
```

**Errors**:
- 404: Circle not found
- 400: Circle not accepting members / circle full
- 409: Already a member

### `POST /api/circles/[id]/contribute`

Record a contribution (after on-chain TX confirmed).

**Auth**: Required + wallet bound

**Request**:
```json
{
  "txId": "0xabc123...",
  "round": 0,
  "amount": 100000000,
  "onTime": true
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "circleId": "uuid",
  "round": 0,
  "amount": "100000000",
  "onTime": true,
  "txId": "0xabc123..."
}
```

### `GET /api/circles/invite/[code]`

Get circle preview by invite code. **No auth required** (public).

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Office Fund",
  "contributionAmount": "100000000",
  "totalMembers": 5,
  "currentMembers": 3,
  "tokenType": 0,
  "status": "forming",
  "creatorName": "Alice"
}
```

---

## Credit Endpoints

### `GET /api/credit/score`

Get the authenticated user's credit score (cached, refreshed from chain if stale).

**Auth**: Required + wallet bound

**Response** (200):
```json
{
  "score": 412,
  "totalPayments": 8,
  "onTimePayments": 7,
  "latePayments": 1,
  "circlesCompleted": 1,
  "circlesDefaulted": 0,
  "totalVolume": "800000000",
  "lastUpdated": "2026-02-06T12:00:00.000Z"
}
```

### `GET /api/credit/history`

Get the authenticated user's payment history.

**Auth**: Required

**Response** (200):
```json
[
  {
    "circleName": "Office Fund",
    "circleOnChainId": 1,
    "round": 2,
    "amount": "100000000",
    "onTime": true,
    "txId": "0xabc...",
    "contributedAt": "2026-02-06T12:00:00.000Z"
  }
]
```

---

## Faucet Endpoints

### `POST /api/faucet`

Request test tokens (1,000 hUSD + 0.01 sBTC) for the authenticated user's wallet.

**Auth**: Required + wallet bound

**Rate Limit**: 1 request per 24 hours per wallet

**Response** (200):
```json
{
  "hUsdTxId": "0xabc...",
  "sbtcTxId": "0xdef...",
  "message": "Tokens sent! They should arrive in ~10-30 minutes after confirmation."
}
```

**Errors**:
- 401: Not authenticated
- 429: Rate limit exceeded (already requested within 24h)
- 503: Faucet not configured (missing `DEPLOYER_PRIVATE_KEY`)
- 500: Transaction broadcast failed

---

## On-Chain Data Endpoints

### `GET /api/circles/[id]/on-chain`

Get live on-chain data for a deployed circle. Caches results to database.

**Auth**: Required

**Response** (200):
```json
{
  "currentRound": 2,
  "status": 1,
  "startBlock": 200,
  "totalContributed": 300000000,
  "totalPaidOut": 100000000,
  "roundDuration": 4320,
  "gracePeriod": 144
}
```

**Errors**:
- 401: Not authenticated
- 404: Circle not found or not deployed on-chain

---

## Admin Endpoints

### `POST /api/admin/sync`

Sync all forming/active circles with on-chain state. Updates `onChainRound`, `onChainStatus`, and timestamps.

**Auth**: `Authorization: Bearer <ADMIN_API_KEY>` header

**Response** (200):
```json
{
  "synced": 5,
  "failed": 0,
  "message": "Sync complete"
}
```

**Errors**:
- 401: Missing or invalid API key

---

## Health Endpoint

### `GET /api/health`

Health check endpoint (no auth required).

**Response** (200):
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## Error Responses

All errors return JSON with this format:

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

**Common HTTP status codes:**

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 402 | Transaction pending (retry later) |
| 403 | Forbidden (wallet not bound / not a member) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | Session encryption secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `DATABASE_URL` | PostgreSQL connection string |
| `HALO_ID_SALT` | Server-side salt for unique ID generation |
| `STACKS_NETWORK` | `testnet` or `mainnet` |
| `DEPLOYER_ADDRESS` | Contract deployer STX address |
| `DEPLOYER_PRIVATE_KEY` | Deployer private key (for faucet minting) |
| `ADMIN_API_KEY` | Bearer token for admin endpoints |
| `FRONTEND_URL` | Allowed CORS origin |
