# Halo Protocol - Stacks Implementation Status

> Living document tracking past, present, and future of the Stacks blockchain implementation.

## Current Phase: Phase 7 Complete (Production Hardening & Audit)

### Completed

#### Project Foundation (Phase 1)
- [x] Clarinet v3.13.1 project setup (Clarity 3 / Epoch 3.0)
- [x] Vitest + @stacks/clarinet-sdk v3.9.0 test framework
- [x] TypeScript configuration (ESNext, ESM)
- [x] Monorepo directory structure (contracts, tests, settings, docs)
- [x] Devnet.toml with valid BIP39 mnemonics
- [x] Testnet.toml and Mainnet.toml placeholders
- [x] GitHub Actions CI/CD pipeline
- [x] .gitignore for secrets and node_modules

#### Smart Contracts (8 contracts, all compiling)

**Core Contracts:**
- [x] **halo-identity.clar** - Identity & wallet binding
  - Binds off-chain unique IDs (buff 32) to Stacks wallet addresses
  - Admin functions: deactivate/reactivate users, transfer admin
  - Read-only lookups by ID or wallet address
- [x] **halo-credit.clar** - On-chain credit scoring (updated Phase 2.5)
  - Score range: 300 (base) to 850 (max)
  - 6 weighted components: Payment History (35%), Circle Completion (20%), Volume (15%), Tenure (10%), Consistency (10%), **Staking Activity (10%)**
  - Authorized contract system for recording payments and staking activity
  - Cross-contract lookups via halo-identity
  - sBTC staking tier scoring (amount × duration)
- [x] **halo-circle.clar** - Lending circle (ROSCA) logic (major rewrite Phase 2.5)
  - Full lifecycle: FORMING -> ACTIVE -> COMPLETED
  - **Multi-token support**: STX circles + SIP-010 token circles (hUSD, sBTC, etc.)
  - `create-circle` (STX) + `create-token-circle` (SIP-010)
  - `contribute-stx` / `contribute-token` with token-type enforcement
  - `process-payout` / `process-payout-token` for STX / SIP-010 respectively
  - **Collateral integration**: locks vault collateral on create/join, releases on completion
  - Protocol fee system (basis points)
  - Auto-activation when circle fills, auto-completion after final round
  - Cross-contract integration with identity, credit, and vault contracts
- [x] **halo-vault.clar** - Collateral vault with yield generation (new Phase 2.5)
  - Stablecoin deposits as collateral for circle participation
  - 80% LTV ratio (configurable 50-90% in basis points)
  - Admin-set price oracle for cross-asset LTV calculations
  - Synthetix-style yield accumulator for depositors
  - Authorized contracts can lock/release/slash collateral
  - `calculate-commitment-usd` for cross-asset commitment sizing
- [x] **halo-sbtc-staking.clar** - sBTC staking for rewards + credit score boost (new Phase 2.5)
  - Stake sBTC (or mock-sbtc) to earn yield rewards
  - Minimum lock period (~1 month / 4320 blocks)
  - Synthetix-style reward accumulator (O(1) per action)
  - Cross-contract: records staking activity in halo-credit for score boost
  - Admin-funded reward pool with configurable duration

**Supporting Contracts:**
- [x] **halo-sip010-trait.clar** - SIP-010 fungible token trait definition
  - Local trait for simnet/devnet (mainnet uses canonical SIP-010 trait)
- [x] **halo-mock-token.clar** - Mock hUSD stablecoin for testing
  - SIP-010 compliant, 6 decimals, deployer-only minting
- [x] **halo-mock-sbtc.clar** - Mock sBTC token for testing
  - SIP-010 compliant, 8 decimals, deployer-only minting

#### Contract Test Suite (208 tests, all passing)
- [x] halo-identity.test.ts (24 tests) - Wallet binding, admin functions, queries
- [x] halo-credit.test.ts (32 tests) - Scoring, payments, staking activity, authorization, admin
- [x] halo-vault.test.ts (58 tests) - Deposits, withdrawals, LTV, collateral, yield, price oracle
- [x] halo-circle.test.ts (47 tests) - Circle lifecycle, contributions, payouts, multi-token, collateral, admin
- [x] halo-sbtc-staking.test.ts (21 tests) - Stake, unstake, rewards, lock period, credit integration
- [x] halo-mock-token.test.ts (20 tests) - SIP-010 compliance, mint/transfer/burn for hUSD and sBTC
- [x] integration.test.ts (6 tests) - Full ROSCA lifecycle with collateral, credit scoring integration

#### Testnet Readiness
- [x] All 8 contracts compile with `clarinet check`
- [x] 243 contract + backend tests passing with `npm test`
- [x] CI/CD pipeline running on push/PR
- [x] Testnet.toml configured (placeholder mnemonic - ready for deployer wallet)
- [x] Contract deployment order documented (8 contracts)
- [x] Post-deploy authorization steps documented
- [x] Testnet deployment guide created (docs/TESTNET_DEPLOYMENT.md)

### Next Up: Testnet Deployment
- [ ] Generate and fund testnet deployer wallet
- [ ] Deploy 8 contracts to Stacks testnet
- [ ] Execute post-deploy authorizations:
  - `halo-credit.authorize-contract(halo-circle)`
  - `halo-credit.authorize-contract(halo-sbtc-staking)`
  - `halo-vault.authorize-contract(halo-circle)`
  - `halo-vault.set-vault-token(halo-mock-token)`
  - `halo-vault.set-token-price(STX_SENTINEL, $0.50)`
  - `halo-sbtc-staking.set-staking-token(halo-mock-sbtc)`
- [ ] Verify contracts on Hiro Explorer
- [ ] Run end-to-end test circle on testnet (STX + hUSD circles)

#### Phase 3: Backend API (Next.js 14)
- [x] Next.js 14 App Router backend setup (monorepo in `src/`)
- [x] Prisma ORM + PostgreSQL schema (6 tables: users, circles, circle_members, contributions, payouts, credit_scores)
- [x] NextAuth.js v4 authentication (Google + GitHub OAuth)
  - JWT session strategy with custom callbacks
  - Auto user creation on first sign-in with unique ID generation
- [x] REST API endpoints (12 routes):
  - Auth: `GET/POST /api/auth/[...nextauth]`
  - Identity: `GET /api/identity/me`, `POST /api/identity/bind-wallet`, `POST /api/identity/confirm-binding`
  - Circles: `GET/POST /api/circles`, `GET /api/circles/[id]`, `POST /api/circles/[id]/join`, `POST /api/circles/[id]/contribute`, `GET /api/circles/invite/[code]`
  - Credit: `GET /api/credit/score`, `GET /api/credit/history`
- [x] Stacks SDK integration (`@stacks/transactions` v7, `@stacks/network` v7)
  - Read-only chain queries for credit scores, circle data, identity verification
  - Transaction status verification via Hiro API
- [x] CORS middleware for frontend cross-origin requests
- [x] Zod input validation on all POST endpoints
- [x] Backend tests (35 tests): identity generation, validation schemas
- [x] Next.js production build succeeds
- [x] Contract tests still pass (208 tests)

#### Backend Test Suite (35 tests)
- [x] identity.test.ts (15 tests) — Unique ID generation, validation, Stacks address validation
- [x] api/validation.test.ts (20 tests) — Zod schemas for circles, contributions, wallet binding

#### Phase 4: Frontend Integration (Same Monorepo)
- [x] Tailwind CSS v3 + shadcn/ui component library (18 components)
- [x] Provider layer: SessionProvider (NextAuth), WalletProvider (@stacks/connect), Toaster (Sonner)
- [x] Layout shell: responsive Navbar with auth + wallet status, Footer
- [x] Landing page: Hero, How It Works (3 steps), CTA section
- [x] Custom sign-in page: Google + GitHub OAuth buttons, redirect logic
- [x] Wallet connection page: Leather/Xverse via @stacks/connect
- [x] Wallet binding page: permanent on-chain identity binding with TX polling
- [x] Dashboard: credit score card (color-coded 300-850), circles list, empty state
- [x] Create circle wizard: 4-step flow (name/amount → members/duration → review → success + invite link)
- [x] Join circle via invite link: preview → join with contract call
- [x] Circle detail page: member list, contribute button (STX post-conditions via Pc builder), payout button
- [x] Credit score page: large score display, progress bar, 6-component breakdown, payment history, tips
- [x] Auth guards via middleware: protected routes redirect to /signin
- [x] Error boundary + custom 404 page
- [x] Shared hooks: useApi (fetch wrapper), useContractCall (openContractCall), useTxStatus (TX polling)
- [x] Shared utils: contracts.ts (deployer address, contract names, formatSTX, formatAddress)
- [x] Frontend tests (63 tests): contracts utils, fetchApi, landing pages, sign-in, credit score logic
- [x] Next.js production build succeeds (16 pages + 12 API routes)

#### Frontend Test Suite (63 tests)
- [x] contracts.test.ts (14 tests) — formatSTX, formatAddress, BLOCKS_PER_DAY, contract names
- [x] fetch-api.test.ts (8 tests) — fetchApi credentials, headers, error handling, options
- [x] landing.test.tsx (10 tests) — Hero, HowItWorks, CTASection rendering + links
- [x] signin.test.tsx (8 tests) — OAuth buttons, signIn calls, loading/redirect states
- [x] credit-score.test.tsx (23 tests) — Score colors, labels, boundaries, percentage calc, component weights

#### Frontend Architecture
- Same-origin: frontend pages in `src/app/` alongside `src/app/api/` routes (no CORS needed)
- Client-side env vars: `NEXT_PUBLIC_DEPLOYER_ADDRESS`, `NEXT_PUBLIC_STACKS_NETWORK`
- @stacks/connect dynamically imported to avoid SSR issues (accesses window/localStorage)
- @stacks/transactions v7 Pc builder for post-conditions (replaces removed makeStandardSTXPostCondition)
- Three vitest configs: `vitest.config.ts` (clarinet/contracts), `vitest.api.config.ts` (node/backend), `vitest.frontend.config.ts` (jsdom/frontend)

#### Phase 5: Deployment, Security, E2E, CI/CD
- [x] Testnet deployment scripts (`scripts/deploy-testnet.ts`) — dry-run + execute modes
- [x] Post-deploy verification script (`scripts/verify-deployment.ts`)
- [x] Deployment config with 8 contracts, 6 auth calls, 8 verification checks
- [x] Health endpoint (`GET /api/health`) — DB check, version, no-store cache
- [x] Rate limiting — 3 tiers (60/min reads, 10/min mutations, 20/min auth)
- [x] CSP headers + security headers (X-Frame-Options, HSTS, nosniff, etc.)
- [x] Input sanitization — HTML stripping, txId validation, string sanitization
- [x] Playwright E2E tests (19 tests) — landing, auth flow, API integration
- [x] CI/CD pipeline expanded to 4 parallel jobs (contracts, backend, frontend, build)
- [x] Security docs, E2E testing docs, deployment guide updated

#### Phase 5 Test Suite (60 new tests)
- [x] deployment.test.ts (24 tests) — Contract order, auth calls, verification checks
- [x] rate-limit.test.ts (10 tests) — Limits, tiers, window reset, independent keys
- [x] sanitize.test.ts (21 tests) — HTML strip, string sanitize, txId validation
- [x] health.test.ts (5 tests) — Status, version, DB check, cache header
- [x] E2E: landing.spec.ts (5 tests) — Hero, badges, links, navigation
- [x] E2E: auth-flow.spec.ts (6 tests) — Redirects, OAuth buttons, mock session
- [x] E2E: api-integration.spec.ts (8 tests) — Health, 401s, 404, security headers

#### Phase 6: Testnet Launch Prep (30-50 Users)
- [x] Prisma schema migration — `FaucetRequest` model + Circle sync fields (`onChainRound`, `onChainStatus`, `lastSyncedAt`)
- [x] Nonce manager (`src/lib/nonce-manager.ts`) — singleton nonce tracking for deployer transactions
- [x] Faucet endpoint (`POST /api/faucet`) — mints 1,000 hUSD + 0.01 sBTC per user, 24h rate limit
- [x] Faucet UI (`src/components/dashboard/faucet-card.tsx`) — "Get Test Tokens" card on dashboard
- [x] Typed `getCircleInfo()` in `src/lib/stacks.ts` — replaces untyped `getCircleOnChain()`
- [x] On-chain circle endpoint (`GET /api/circles/[id]/on-chain`) — live chain data with DB caching
- [x] Fixed `currentRound` on circle detail page — reads from chain instead of hardcoded 0
- [x] On-chain sync utility (`src/lib/sync.ts`) — `syncCircleFromChain()` + `syncAllActiveCircles()`
- [x] Admin sync endpoint (`POST /api/admin/sync`) — Bearer token protected batch sync
- [x] Database seed script (`prisma/seed.ts`) — 5 test users, 1 sample circle, credit scores
- [x] Phase 6 tests (27 tests): nonce-manager, faucet, sync, circle-info, faucet-card, E2E faucet

#### Phase 6 Test Suite (27 new tests)
- [x] nonce-manager.test.ts (4 tests) — Fetch, increment, reset, error handling
- [x] faucet.test.ts (5 tests) — 401, 503, 429, 200 success, DB persistence
- [x] sync.test.ts (7 tests) — No onChainId, null data, status update, timestamps, batch sync
- [x] circle-info.test.ts (4 tests) — 401, 404 (missing/no onChainId), success with DB cache
- [x] faucet-card.test.tsx (5 tests) — Button, title, badges, faucet link, description
- [x] E2E: faucet.spec.ts (2 tests) — 401 without auth, 405 GET

#### Phase 7: Production Hardening & Security Audit
- [x] **Build fix**: deployment-config.ts `ClarityValue[]` return type, tsconfig `ES2020` target, removed deprecated `AnchorMode`
- [x] **Nonce manager mutex**: promise-based serialization prevents concurrent nonce conflicts
- [x] **Error logging**: bare catch blocks now log errors in faucet, stacks, sync modules
- [x] **Timing-safe comparison**: admin API key uses `crypto.timingSafeEqual()` instead of `!==`
- [x] **CSP hardening**: removed `'unsafe-eval'` from script-src directive
- [x] **Fetch timeouts**: 15-second `AbortController` on all Hiro API calls (stacks.ts, nonce-manager.ts)
- [x] **Env validation**: `src/lib/env.ts` validates required vars at runtime (skips build phase)
- [x] **Seed script guard**: `process.env.NODE_ENV === "production"` exits immediately
- [x] **Database indexes**: 7 `@@index` directives on foreign key columns (Circle, CircleMember, Contribution, FaucetRequest)
- [x] **Wallet UX**: `onCancel` handler, null address guard in wallet-provider.tsx
- [x] **Error sanitization**: circle detail page shows generic message, logs actual error
- [x] **Security audit doc**: `docs/SECURITY_AUDIT.md` — 25 contract findings + 20 backend/frontend findings
- [x] All tests passing: 232 contract + 91 API + 68 frontend = **391 tests** + 21 E2E

### Future: Phase 8+
- **Phase 8**: User testing with 30-50 users (testnet STX + mock hUSD + mock sBTC)
- **Phase 9**: Third-party security audit, fix critical/high contract findings, mainnet deployment

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo structure | Monorepo | Backend + contracts in same repo for easier development |
| Database | Supabase (PostgreSQL) | Managed, real-time subscriptions, auth integration |
| Clarity version | 3 (Epoch 3.0) | Current mainnet standard; avoids Clarity 4 breaking changes |
| Token support | Multi-token (STX + SIP-010) | STX circles for simplicity, SIP-010 for stablecoins/sBTC |
| Collateral | Vault with LTV-based capacity | Stablecoin deposits, admin price oracle, Synthetix-style yield |
| Staking | sBTC staking with credit boost | Incentivizes Bitcoin commitment, boosts credit score |
| Test framework | Vitest + @stacks/clarinet-sdk | Modern, fast; official Hiro tooling |
| Contract deployment order | trait -> identity -> tokens -> credit -> vault -> staking -> circle | Dependency chain requirement |
| Backend framework | Next.js 14 App Router | API routes, server-side rendering, Vercel deployment |
| ORM | Prisma v6 | Type-safe queries, schema migrations, PostgreSQL support |
| Auth | NextAuth.js v4 + JWT | Stateless sessions, Google + GitHub OAuth |
| Validation | Zod | Runtime type checking for all API inputs |
| Backend in src/ | Colocated with contracts | Single repo, shared types, unified CI/CD |
| Frontend in monorepo | Same Next.js app | Same-origin API calls, no CORS, single `npm run dev` |
| CSS framework | Tailwind CSS v3 + shadcn/ui | Utility-first, pre-built accessible components |
| Wallet integration | @stacks/connect v8 | Official Stacks wallet library for Leather/Xverse |
| Frontend tests | Vitest + React Testing Library + jsdom | Consistent with existing test framework |
| E2E tests | Playwright + Chromium | Industry standard, headless CI support |
| Rate limiting | In-memory sliding window | No external deps, sufficient for single-instance |
| Deployment scripts | TypeScript + tsx | Type-safe, reuses existing @stacks/transactions |
| CI/CD | 4 parallel GitHub Actions jobs | Fast feedback, independent failure isolation |

## Key Technical Notes

- **Epoch "latest" warning**: Clarinet 3.13.1 maps `epoch = "latest"` to 3.3 (Clarity 4), which removes `as-contract` in favor of `as-contract?`. We pin to `epoch = "3.0"` for Clarity 3 compatibility.
- **block-height renamed**: Clarity 3 renames `block-height` to `stacks-block-height`.
- **No Simnet.toml**: Clarinet auto-generates simnet config from Devnet.toml.
- **STX price sentinel**: The deployer principal is used as the key for STX in the vault price oracle (since STX has no contract principal).
- **Multi-token circles**: Each circle stores `token-type` (u0=STX, u1=SIP-010) and `token-contract` (optional principal). Separate contribute/payout functions enforce token-type matching.
- **Collateral flow**: create-circle/join-circle → vault.calculate-commitment-usd → vault.lock-collateral; on completion → vault.release-collateral for all members.
- **Credit scoring**: 6 components (35/20/15/10/10/10 weights). Staking tier = (amount_tier × duration_modifier) / 100.
- **Post-deploy requirement**: Circle contract must be authorized in both credit and vault contracts. Staking contract must be authorized in credit contract.
