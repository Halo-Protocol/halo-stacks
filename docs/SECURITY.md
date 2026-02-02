# Security

Security measures implemented in Halo Protocol.

## Rate Limiting

In-memory sliding-window rate limiter applied to all `/api/*` routes (except `/api/health`).

| Tier | Routes | Limit | Window |
|------|--------|-------|--------|
| Default | GET requests | 60 req | 1 min |
| Strict | POST/PUT/DELETE/PATCH | 10 req | 1 min |
| Auth | `/api/auth/*` | 20 req | 1 min |

Rate limit headers are included in all API responses:
- `X-RateLimit-Limit` — Max requests allowed
- `X-RateLimit-Remaining` — Requests remaining
- `X-RateLimit-Reset` — Unix timestamp when window resets

When exceeded, returns `429 Too Many Requests` with `Retry-After` header.

**Key by:** IP address + pathname (independent limits per route).

**Implementation:** `src/lib/rate-limit.ts`, applied in `src/middleware.ts`.

## Content Security Policy

Configured in `next.config.mjs`:

```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' https://fonts.gstatic.com
connect-src 'self' https://api.testnet.hiro.so https://api.hiro.so https://*.stacks.co
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

## Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limits referrer info |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Disables unused APIs |
| X-DNS-Prefetch-Control | on | Performance optimization |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Forces HTTPS |

## Input Sanitization

- **HTML stripping**: Circle names are sanitized with `stripHtml()` to prevent XSS
- **Transaction ID validation**: `isValidTxId()` enforces `0x` + 64 hex chars format
- **String sanitization**: `sanitizeString()` trims, removes null bytes, limits length
- **Zod validation**: All POST endpoints validate input schemas with Zod

**Implementation:** `src/lib/sanitize.ts`.

## Authentication

- **NextAuth.js v4** with JWT session strategy
- **OAuth providers**: Google, GitHub
- **Session cookies**: `next-auth.session-token` (HTTP-only, SameSite=Lax)
- **Protected routes**: Middleware redirects unauthenticated users to `/signin`
- **API auth**: `requireWallet()` middleware validates JWT and checks wallet binding

## Wallet Security

- **On-chain identity binding**: One-time permanent binding of OAuth identity to Stacks wallet
- **Transaction verification**: TX IDs are validated against Hiro API before confirming bindings
- **Post-conditions**: STX transfers use `Pc.principal().willSendEq().ustx()` to prevent overspending
