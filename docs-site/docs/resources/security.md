---
sidebar_position: 1
title: Security
description: Security model, audit status, and responsible disclosure.
---

# Security

Halo Protocol takes security seriously. This document covers the security model, audit status, and how to report vulnerabilities.

---

## Smart Contract Security

### Clarity Advantages

Halo's contracts are written in **Clarity**, a decidable smart contract language on Stacks:

- **No reentrancy**: Clarity does not support reentrant calls by design
- **No unbounded loops**: All iterations have known bounds
- **No runtime errors**: Type checking at deploy time prevents many classes of bugs
- **Read-only separation**: Read-only functions cannot modify state
- **Post-conditions**: Users can set post-conditions on transactions to limit token transfers

### Access Control

All privileged operations use a consistent access control pattern:

```clarity
(define-data-var admin principal tx-sender)

(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)
```

| Action | Who Can Do It |
|---|---|
| Bind wallet | Any user (one-time) |
| Record payments | Authorized contracts only |
| Lock/slash collateral | Authorized contracts only |
| Set token prices | Admin only |
| Pause circles | Admin only |
| Fund yield pools | Admin only |

### Authorization Model

Contracts must be explicitly authorized to call sensitive functions:

```clarity
(contract-call? .halo-credit authorize-contract .halo-circle)
```

The credit contract uses `contract-caller` (not `tx-sender`) for authorization checks, preventing unauthorized callers from spoofing through intermediary contracts.

---

## Backend Security

### Authentication

- **NextAuth.js v4** with JWT strategy
- OAuth 2.0 via Google and GitHub — no passwords stored
- Sessions are stateless (JWT tokens)

### Rate Limiting

Three-tier in-memory sliding window rate limiter:

| Tier | Limit | Applied To |
|---|---|---|
| Standard | 60 req/min | Most read endpoints |
| Strict | 10 req/min | Auth, faucet, write operations |
| Moderate | 20 req/min | Read-heavy endpoints |

### Input Validation

- **HTML stripping**: All user inputs are stripped of HTML tags
- **String sanitization**: Special characters are escaped
- **Transaction ID validation**: Regex validation for Stacks transaction IDs
- **Type checking**: Prisma ORM provides parameterized queries (no SQL injection)

### Security Headers

Configured in `next.config.mjs`:

| Header | Value |
|---|---|
| Content-Security-Policy | Strict CSP (no `unsafe-eval`) |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | Restrictive |

### Admin Security

- Admin sync endpoint uses `crypto.timingSafeEqual` for Bearer token comparison (prevents timing attacks)
- Admin routes require authenticated sessions with admin role
- Environment variables validated at startup via `src/lib/env.ts`

### External Calls

- All external API calls (Stacks API, price feeds) have **15-second timeouts** via AbortController
- Nonce management uses a promise-based mutex to prevent race conditions

---

## Audit Status

### Internal Security Audit

A comprehensive internal audit has been completed covering:

- **25 smart contract findings** across all 8 contracts
- **20 backend findings** across API routes and utilities
- Findings categorized as Critical / High / Medium / Low / Informational

The full audit report is available at [docs/SECURITY_AUDIT.md](https://github.com/your-org/halo-stacks/blob/main/docs/SECURITY_AUDIT.md).

### Third-Party Audit

A third-party smart contract audit is planned before mainnet deployment. Status: **Pending**.

---

## Known Limitations

| Area | Limitation | Mitigation |
|---|---|---|
| Price oracle | Admin-set prices (centralized) | Plan to integrate decentralized feeds |
| Rate limiting | In-memory (resets on restart) | Acceptable for current scale |
| Circle size | Max 10 members | Gas limit considerations |
| Payment history | Max 100 entries per user | Oldest entries are dropped |
| Collateral types | Fixed set of supported tokens | New tokens require contract upgrade |

---

## Responsible Disclosure

If you discover a security vulnerability in Halo Protocol:

1. **Do NOT** disclose it publicly
2. Email **security@gethalo.fun** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
3. We will acknowledge receipt within 48 hours
4. We will work with you to understand and fix the issue
5. We will credit you in the fix announcement (unless you prefer anonymity)

### Scope

| In Scope | Out of Scope |
|---|---|
| Smart contract vulnerabilities | Social engineering |
| Backend API security issues | DoS/DDoS attacks |
| Authentication bypasses | Third-party dependencies (report upstream) |
| Privilege escalation | Issues in testnet-only code |
| Data exposure | UI/UX bugs |

---

## Security Checklist

For self-auditing or contributing:

- [ ] All admin functions check `is-admin` or `is-authorized`
- [ ] All token transfers use SIP-010 `transfer` with proper error handling
- [ ] No unbounded iterations in contract code
- [ ] All user inputs are sanitized before database queries
- [ ] No secrets in source code or git history
- [ ] Rate limiting applied to all public endpoints
- [ ] External API calls have timeouts
- [ ] CSP headers prevent XSS
- [ ] Admin tokens use timing-safe comparison
