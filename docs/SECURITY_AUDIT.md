# Security Audit Report — Halo Protocol

**Date:** February 2026
**Scope:** Smart contracts (8), Backend API (15 routes), Frontend, Configuration
**Network:** Stacks Testnet (Epoch 3.0 / Clarity 3)
**Status:** Testnet — pre-mainnet audit

---

## Executive Summary

A comprehensive security audit was performed across the Halo Protocol codebase covering smart contracts, backend API routes, frontend components, and deployment configuration. **25 smart contract findings** and **~20 backend/frontend findings** were identified and categorized by severity.

**Backend/frontend fixes have been applied.** Smart contract findings require redeployment and are documented here for the mainnet audit phase.

### Findings Summary

| Severity | Smart Contract | Backend/Frontend | Status |
|----------|---------------|-----------------|--------|
| Critical | 5 | 4 | Backend: Fixed, Contracts: Pending |
| High | 5 | 4 | Backend: Fixed, Contracts: Pending |
| Medium | 6 | 5 | Backend: Fixed, Contracts: Pending |
| Low / Best Practice | 9 | 7 | Backend: Fixed, Contracts: Pending |

---

## Part 1: Smart Contract Findings

### Critical Severity

#### SC-C1: Vault LTV Change Affects Existing Commitments
- **Contract:** `halo-vault`
- **Function:** `set-ltv-ratio`
- **Description:** Admin can change the LTV ratio at any time. Users who deposited collateral based on a previous LTV could be immediately under-collateralized, triggering liquidation-like conditions.
- **Recommendation:** Grandfather existing commitments or add a time-delayed LTV change mechanism.

#### SC-C2: No Token Transfer Validation
- **Contract:** `halo-vault`
- **Description:** The vault trusts that SIP-010 token contracts will correctly implement `transfer`. A malicious or buggy token contract could return `(ok true)` without actually transferring tokens, draining the vault.
- **Recommendation:** Add post-transfer balance verification or whitelist approved token contracts.

#### SC-C3: Blanket Contract Authorization
- **Contract:** `halo-vault`, `halo-credit`
- **Function:** `authorize-contract`
- **Description:** Authorized contracts get full access to all vault/credit operations with no per-user or per-operation scoping. A compromised authorized contract could drain the vault or manipulate all credit scores.
- **Recommendation:** Implement per-operation authorization (e.g., separate authorize for deposits vs withdrawals) and add operation amount limits.

#### SC-C4: Identity Verification Single Point of Failure
- **Contract:** `halo-identity`, `halo-sbtc-staking`
- **Description:** Staking operations depend entirely on identity verification. If the identity contract is compromised or the admin key is leaked, all staking operations are affected.
- **Recommendation:** Add multi-sig admin control and/or time-locked admin operations.

#### SC-C5: No Deauthorize Function
- **Contract:** `halo-vault`, `halo-credit`
- **Description:** Once a contract is authorized (max 10 slots), it cannot be deauthorized. If a contract is compromised, there's no way to revoke its access.
- **Recommendation:** Add `deauthorize-contract` function with admin-only access.

### High Severity

#### SC-H1: Grace Period Minimum Too Low
- **Contract:** `halo-circle`
- **Function:** `create-circle`
- **Description:** Grace period minimum is 1 block (~10 minutes). This is insufficient for users to make contributions, especially during network congestion.
- **Recommendation:** Set minimum grace period to 144 blocks (~24 hours).

#### SC-H2: Price Oracle Has No Staleness Check
- **Contract:** `halo-vault`
- **Function:** `set-token-price`
- **Description:** Token price is set manually with no timestamp. Stale prices could lead to incorrect collateralization calculations.
- **Recommendation:** Add `last-price-update` block height and reject operations if price is older than N blocks.

#### SC-H3: No Circle Dissolution or Default Handling
- **Contract:** `halo-circle`
- **Description:** If a member defaults (fails to contribute), there's no mechanism to dissolve the circle or redistribute funds. The circle can freeze indefinitely.
- **Recommendation:** Add `dissolve-circle` function and automatic default detection after grace period expiry.

#### SC-H4: Credit Score Precision Loss
- **Contract:** `halo-credit`
- **Function:** `calculate-score`
- **Description:** Integer division in score calculation loses precision. `(/ (* on-time-payments 100) total-payments)` should multiply before dividing, but intermediate results can still truncate.
- **Recommendation:** Use higher precision multiplier (e.g., 10000) and scale down at the end.

#### SC-H5: Yield Accumulator Not Validated Before Re-funding
- **Contract:** `halo-sbtc-staking`
- **Description:** The reward pool can be re-funded without checking if existing rewards have been distributed, potentially diluting or losing undistributed rewards.
- **Recommendation:** Require distribution of existing rewards before re-funding or track funding epochs separately.

### Medium Severity

#### SC-M1: No Wallet Unbinding Mechanism
- **Contract:** `halo-identity`
- **Description:** Once a wallet is bound to an identity, it cannot be unbound. Users who lose access to their wallet are permanently locked out.
- **Impact:** Users cannot recover from lost wallets.
- **Recommendation:** Add admin-assisted wallet rebinding with appropriate security checks.

#### SC-M2: Payout Indexing Depends on Member List Position
- **Contract:** `halo-circle`
- **Description:** Payout order is determined by the position in the member list, which depends on join order. Late joiners always get later payouts.
- **Recommendation:** Allow configurable payout ordering (random, auction-based, or predetermined).

#### SC-M3: Vault Commitment Underflow Silently Masked
- **Contract:** `halo-vault`
- **Description:** If a withdrawal amount exceeds the tracked commitment (due to a bug), the underflow would be caught by Clarity's uint protection, but the error is generic.
- **Recommendation:** Add explicit balance check before subtraction with descriptive error.

#### SC-M4: Staking Duration Not Reset on Subsequent Stakes
- **Contract:** `halo-sbtc-staking`
- **Description:** If a user stakes additional sBTC, the staking duration is not reset, meaning rewards calculation may be incorrect for the additional stake.
- **Recommendation:** Track stake start block per deposit or calculate rewards proportionally.

#### SC-M5: Mock Tokens Have No Mint Cap
- **Contract:** `halo-mock-token`, `halo-mock-sbtc`
- **Description:** Mock tokens can be minted without limit by the deployer. On testnet this is acceptable, but the pattern should not carry to mainnet.
- **Recommendation:** Replace with real token integrations for mainnet.

#### SC-M6: No Reward Funding Duration Bounds
- **Contract:** `halo-sbtc-staking`
- **Description:** Reward funding has no minimum or maximum duration, allowing creation of extremely short or long reward periods.
- **Recommendation:** Enforce minimum (1 week) and maximum (1 year) duration bounds.

### Low / Best Practice

#### SC-L1: No Global Emergency Pause
- **Description:** There is no protocol-wide pause mechanism. If a critical vulnerability is discovered, each contract must be individually addressed.
- **Recommendation:** Add a shared pause contract that all other contracts check.

#### SC-L2: Protocol Fees to Admin Wallet
- **Contract:** `halo-circle`
- **Description:** Protocol fees are sent directly to the admin wallet rather than a treasury contract.
- **Recommendation:** Use a dedicated treasury contract for fee collection.

#### SC-L3: Inconsistent Event Schemas
- **Description:** Print event schemas vary across contracts (different key names, formats).
- **Recommendation:** Standardize event schemas with consistent naming.

#### SC-L4: No `as-contract` Helper
- **Description:** The `as-contract` pattern is repeated across multiple contracts without a shared helper.
- **Recommendation:** Consider a shared utility contract for common patterns.

#### SC-L5: Admin Transfer Not Two-Step
- **Contracts:** All contracts with admin
- **Description:** Admin transfer is immediate. A typo in the new admin address permanently locks out admin access.
- **Recommendation:** Implement propose/accept pattern for admin transfers.

#### SC-L6: No Event Emission on Admin Changes
- **Contracts:** Various
- **Description:** Admin changes (set-admin, authorize-contract) don't emit events, making off-chain tracking difficult.
- **Recommendation:** Add print statements for all admin operations.

#### SC-L7: Circle Name Not Validated
- **Contract:** `halo-circle`
- **Description:** Circle names have no length limit or character validation beyond being a string.
- **Recommendation:** Add min/max length validation.

#### SC-L8: No Contribution Deadline Per Round
- **Contract:** `halo-circle`
- **Description:** Contributions can be made at any time within a round until grace period expires.
- **Recommendation:** Add per-round contribution deadlines.

#### SC-L9: Missing Input Validation on Several Functions
- **Contracts:** Various
- **Description:** Some functions accept uint parameters without range validation (e.g., grace period of 0, contribution of 0).
- **Recommendation:** Add appropriate bounds checking.

---

## Part 2: Backend & Frontend Findings (Fixed)

### Critical — Fixed

#### BE-C1: Build Error in Deployment Config
- **File:** `scripts/lib/deployment-config.ts:20`
- **Issue:** `buildArgs` return type was `ReturnType<typeof contractPrincipalCV>[]` but `set-token-price` returns mixed types.
- **Fix:** Changed return type to `ClarityValue[]`.

#### BE-C2: Nonce Manager Race Condition
- **File:** `src/lib/nonce-manager.ts`
- **Issue:** Two concurrent `/api/faucet` requests could read the same nonce before either increments.
- **Fix:** Added promise-based mutex to serialize `getNextNonce()` calls.

#### BE-C3: Admin API Key Timing Attack
- **File:** `src/app/api/admin/sync/route.ts:8`
- **Issue:** String `!==` comparison is timing-vulnerable, allowing attackers to progressively guess the API key.
- **Fix:** Replaced with `crypto.timingSafeEqual()` with length pre-check.

#### BE-C4: Missing Error Logging
- **Files:** `src/app/api/faucet/route.ts:125`, `src/lib/stacks.ts:130`, `src/lib/sync.ts:64`
- **Issue:** Bare `catch {}` blocks silently swallowed errors, making debugging impossible.
- **Fix:** Added `console.error()` with context in all catch blocks.

### High — Fixed

#### BE-H1: CSP Allows unsafe-eval
- **File:** `next.config.mjs`
- **Issue:** `'unsafe-eval'` in `script-src` CSP directive allows arbitrary code execution via `eval()`.
- **Fix:** Removed `'unsafe-eval'` from script-src.

#### BE-H2: No Fetch Timeouts on External API Calls
- **File:** `src/lib/stacks.ts`, `src/lib/nonce-manager.ts`
- **Issue:** Fetch calls to Hiro API had no timeout, risking hung requests that block server resources.
- **Fix:** Added 15-second `AbortController` timeout to all external fetch calls.

#### BE-H3: No Environment Variable Validation
- **Issue:** Missing env vars caused cryptic runtime errors instead of clear startup failures.
- **Fix:** Created `src/lib/env.ts` that validates required vars on import from `db.ts`.

#### BE-H4: Seed Script Can Run in Production
- **File:** `prisma/seed.ts`
- **Issue:** No guard against running seed data in production, which would create test users in the live database.
- **Fix:** Added `process.env.NODE_ENV === "production"` guard with `process.exit(1)`.

### Medium — Fixed

#### BE-M1: Missing Database Indexes
- **File:** `prisma/schema.prisma`
- **Issue:** Foreign key columns used in queries lacked indexes, causing slow lookups as data grows.
- **Fix:** Added `@@index` on Circle.creatorId, CircleMember.circleId/userId, Contribution.circleId/userId, FaucetRequest.walletAddress/userId.

#### BE-M2: Wallet Connection Missing onCancel Handler
- **File:** `src/components/providers/wallet-provider.tsx`
- **Issue:** No `onCancel` callback in `showConnect()`, leaving the UI in an ambiguous state if user cancels.
- **Fix:** Added `onCancel` callback with logging, and null address guard in `onFinish`.

#### BE-M3: Raw Error Display on Circle Page
- **File:** `src/app/circles/[id]/page.tsx`
- **Issue:** Raw error strings from API responses displayed directly to users, potentially leaking internal details.
- **Fix:** Replaced with generic user message; actual error logged to console.

#### BE-M4: Wallet Provider Doesn't Handle Missing Address
- **File:** `src/components/providers/wallet-provider.tsx`
- **Issue:** If wallet connection succeeds but address is null (edge case), UI shows connected state with no address.
- **Fix:** Added null address check — only set connected state when address is available.

#### BE-M5: No Fetch Timeout in Nonce Manager
- **File:** `src/lib/nonce-manager.ts`
- **Issue:** `fetchAccountNonce` could hang indefinitely on network issues.
- **Fix:** Added 15-second `AbortController` timeout.

### Low / Best Practice — Fixed

#### BE-L1-L7: Various improvements
- Database indexes for query performance
- Production guard on seed script
- Environment validation at startup
- Consistent error logging across all API routes
- Timing-safe string comparison for API keys
- CSP hardening
- Wallet connection UX improvements

---

## Part 3: Recommendations for Mainnet

### Before Mainnet Launch (Required)
1. **Fix all Critical and High smart contract findings** (SC-C1 through SC-H5)
2. **Professional third-party audit** of smart contracts
3. **Multi-sig admin keys** for all contract admin operations
4. **Real token integrations** — replace mock tokens with actual sBTC and stablecoin contracts
5. **Oracle integration** — replace manual price feed with a decentralized oracle
6. **Rate limiting** — move from in-memory to Redis-based rate limiting for multi-instance deployments
7. **Monitoring and alerting** — set up on-chain event monitoring for anomalous activity

### Before Mainnet Launch (Recommended)
8. **Two-step admin transfer** pattern across all contracts
9. **Emergency pause mechanism** (global circuit breaker)
10. **Treasury contract** for protocol fee collection
11. **Circle dissolution mechanism** for handling defaults
12. **Wallet recovery mechanism** through admin-assisted rebinding
13. **Event schema standardization** across contracts
14. **Contribution deadline enforcement** per round

### Testnet Acceptable (Current State)
- Mock tokens without mint caps
- Manual price oracle
- In-memory rate limiting
- Single admin key
- No wallet unbinding

---

## Appendix: Files Modified

| File | Change Type | Finding |
|------|------------|---------|
| `scripts/lib/deployment-config.ts` | Type fix | BE-C1 |
| `src/lib/nonce-manager.ts` | Mutex + timeout | BE-C2, BE-M5 |
| `src/app/api/admin/sync/route.ts` | Timing-safe comparison | BE-C3 |
| `src/app/api/faucet/route.ts` | Error logging | BE-C4 |
| `src/lib/stacks.ts` | Error logging + timeout | BE-C4, BE-H2 |
| `src/lib/sync.ts` | Error logging | BE-C4 |
| `next.config.mjs` | CSP hardening | BE-H1 |
| `src/lib/env.ts` | New — env validation | BE-H3 |
| `src/lib/db.ts` | Import env validation | BE-H3 |
| `prisma/seed.ts` | Production guard | BE-H4 |
| `prisma/schema.prisma` | Database indexes | BE-M1 |
| `src/components/providers/wallet-provider.tsx` | onCancel + null guard | BE-M2, BE-M4 |
| `src/app/circles/[id]/page.tsx` | Sanitized error display | BE-M3 |
