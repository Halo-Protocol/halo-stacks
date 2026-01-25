# Halo Protocol - Stacks Smart Contracts

Decentralized lending circles (ROSCA) with on-chain credit scoring, built on Stacks.

**License**: MIT | **Tests**: 243 passing (208 contract + 35 API) | **Clarity**: 3 (Epoch 3.0) | **Status**: Phase 3 Complete

## What is Halo Protocol?

Halo Protocol brings traditional lending circles (ROSCAs - Rotating Savings and Credit Associations) on-chain using Stacks smart contracts. In a lending circle, a group of members each contribute a fixed amount of STX each round, and one member receives the full pot as a payout. This continues until every member has received a payout.

Every on-time payment and completed circle builds the participant's on-chain credit score (300-850 range), creating a portable, transparent, and tamper-proof credit history on the Stacks blockchain.

The protocol consists of four core smart contracts that handle identity binding, credit scoring, circle lifecycle management, and collateral vaults with yield generation. All contracts are written in Clarity 3 and target Epoch 3.0.

## Architecture

```
halo-identity          (no dependencies)
     |
halo-credit            (depends on: halo-identity)
     |
halo-vault             (depends on: halo-sip010-trait)
     |
halo-circle            (depends on: halo-identity, halo-credit)
```

- **halo-identity** - Maps off-chain unique IDs to Stacks wallet addresses (one-time, permanent binding for Sybil resistance)
- **halo-credit** - On-chain credit scoring engine (300-850 range, 5 weighted components: payment history, circle completion, volume, tenure, consistency)
- **halo-vault** - Collateral vault with stablecoin deposits, LTV-based capacity, admin price oracle, and Synthetix-style yield accumulator
- **halo-circle** - Lending circle lifecycle management (FORMING -> ACTIVE -> COMPLETED) with STX contributions, payouts, and protocol fees

See [HALO_STACKS_TECHNICAL_ARCHITECTURE.md](HALO_STACKS_TECHNICAL_ARCHITECTURE.md) for full architecture details.

## Project Structure

```
halo-stacks/
  contracts/                    # Clarity smart contracts (8 contracts)
    halo-identity.clar          # Identity & wallet binding
    halo-credit.clar            # On-chain credit scoring
    halo-vault.clar             # Collateral vault with yield
    halo-circle.clar            # Lending circle (ROSCA) logic
    halo-sbtc-staking.clar      # sBTC staking for rewards + credit
    halo-sip010-trait.clar      # SIP-010 fungible token trait
    halo-mock-token.clar        # Mock hUSD stablecoin (6 decimals)
    halo-mock-sbtc.clar         # Mock sBTC token (8 decimals)
  tests/                        # Contract tests (208 tests)
    halo-identity.test.ts       # 24 tests
    halo-credit.test.ts         # 32 tests
    halo-vault.test.ts          # 58 tests
    halo-circle.test.ts         # 47 tests
    halo-sbtc-staking.test.ts   # 21 tests
    halo-mock-token.test.ts     # 20 tests
    integration.test.ts         # 6 tests
  src/                          # Next.js 14 backend API
    app/
      api/
        auth/[...nextauth]/     # NextAuth.js (Google + GitHub)
        identity/               # User identity endpoints
        circles/                # Circle CRUD + join/contribute
        credit/                 # Credit score + history
      layout.tsx
      page.tsx
    lib/
      auth.ts                   # NextAuth config
      db.ts                     # Prisma client
      stacks.ts                 # Stacks SDK helpers
      identity.ts               # Unique ID generation
      middleware.ts              # Auth middleware
    middleware.ts                # CORS middleware
    __tests__/                  # Backend tests (35 tests)
  prisma/
    schema.prisma               # PostgreSQL schema (6 tables)
  settings/
    Devnet.toml                 # Local development network
    Testnet.toml                # Stacks testnet config
    Mainnet.toml                # Mainnet config (placeholder)
  docs/
    API_REFERENCE.md            # REST API documentation
    CONTRACT_REFERENCE.md       # Function-level contract API reference
    IMPLEMENTATION_STATUS.md    # Project progress tracker
    TESTNET_DEPLOYMENT.md       # Testnet deployment guide
  .github/workflows/test.yml   # CI pipeline
  Clarinet.toml                 # Clarinet project configuration
  next.config.mjs              # Next.js configuration
  vitest.config.ts             # Contract test config
  vitest.api.config.ts         # Backend test config
  package.json
  tsconfig.json
```

## Prerequisites

- **Node.js** >= 20
- **Clarinet** v3.13.1
- **PostgreSQL** (or Supabase account) — for backend API

Install Clarinet:
```bash
curl -sL https://github.com/hirosystems/clarinet/releases/download/v3.13.1/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/halo-protocol/halo-stacks.git
cd halo-stacks

# Install dependencies
npm install

# Check contracts compile
clarinet check

# Run contract tests (208 tests)
npm test

# Run backend API tests (35 tests)
npm run test:api

# Start the backend API server (requires .env.local)
cp .env.example .env.local  # then fill in values
npm run dev
```

## Testing

The test suite uses Vitest 4 with `@stacks/clarinet-sdk` running against a simnet environment.

| File | Tests | Coverage |
|------|-------|----------|
| halo-identity.test.ts | 24 | Wallet binding, admin functions, read-only queries |
| halo-credit.test.ts | 27 | Credit scoring, payment recording, authorization, admin |
| halo-vault.test.ts | 58 | Deposits, withdrawals, LTV, collateral, yield, price oracle |
| halo-circle.test.ts | 36 | Circle lifecycle, contributions, payouts, fees, admin |
| halo-mock-token.test.ts | 20 | SIP-010 compliance, mint/transfer/burn (hUSD + sBTC) |
| integration.test.ts | 6 | Full ROSCA lifecycle, cross-contract credit scoring |
| **Total** | **196** | |

```bash
npm test               # Run contract tests (208 tests)
npm run test:api       # Run backend API tests (35 tests)
npm run test:report    # Run with coverage
npm run test:watch     # Watch mode (requires chokidar)
```

## Smart Contracts

| Contract | Purpose | Dependencies |
|----------|---------|-------------|
| halo-identity | Identity & wallet binding | None |
| halo-credit | On-chain credit scoring (300-850) | halo-identity |
| halo-vault | Collateral vault with LTV, price oracle, yield | halo-sip010-trait |
| halo-circle | Lending circle (ROSCA) management | halo-identity, halo-credit |
| halo-sip010-trait | SIP-010 fungible token trait definition | None |
| halo-mock-token | Mock hUSD stablecoin (6 decimals) | halo-sip010-trait |
| halo-mock-sbtc | Mock sBTC token (8 decimals) | halo-sip010-trait |

See [docs/CONTRACT_REFERENCE.md](docs/CONTRACT_REFERENCE.md) for the complete function-level API reference.

See [HALO_STACKS_SMART_CONTRACTS.md](HALO_STACKS_SMART_CONTRACTS.md) for detailed contract design and implementation notes.

## Deployment

### Contract Deployment Order

Contracts must be deployed in dependency order:

1. `halo-sip010-trait` (no dependencies)
2. `halo-identity` (no dependencies)
3. `halo-mock-token` (depends on sip010-trait)
4. `halo-mock-sbtc` (depends on sip010-trait)
5. `halo-credit` (depends on identity)
6. `halo-vault` (depends on sip010-trait)
7. `halo-circle` (depends on identity + credit)

**Post-deploy authorization** (required): After all contracts are deployed, authorize the circle contract to record payments:

```clarity
(contract-call? .halo-credit authorize-contract .halo-circle)
```

### Devnet (Local Development)

```bash
clarinet devnet start
```

### Testnet

1. Generate a testnet wallet and fund it with testnet STX
2. Update `settings/Testnet.toml` with your deployer mnemonic
3. Generate and apply the deployment plan:
   ```bash
   clarinet deployments generate --testnet
   clarinet deployments apply --testnet
   ```
4. Run post-deploy authorization

See [docs/TESTNET_DEPLOYMENT.md](docs/TESTNET_DEPLOYMENT.md) for the full step-by-step guide.

### Mainnet

Not yet supported. `settings/Mainnet.toml` contains placeholders for future use.

## CI/CD

GitHub Actions runs on every push to `main`/`develop` and on PRs to `main`:

1. Checkout code
2. Setup Node.js 20
3. Install Clarinet v3.13.1
4. Install npm dependencies
5. Run `clarinet check` (contract compilation)
6. Run `npm test` (all 196 tests)

See [.github/workflows/test.yml](.github/workflows/test.yml).

## Documentation

| Document | Description |
|----------|-------------|
| [docs/CONTRACT_REFERENCE.md](docs/CONTRACT_REFERENCE.md) | Function-level smart contract API reference |
| [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) | Project progress and architecture decisions |
| [docs/TESTNET_DEPLOYMENT.md](docs/TESTNET_DEPLOYMENT.md) | Step-by-step testnet deployment guide |
| [HALO_STACKS_MVP_PRD.md](HALO_STACKS_MVP_PRD.md) | Full product requirements document |
| [HALO_STACKS_TECHNICAL_ARCHITECTURE.md](HALO_STACKS_TECHNICAL_ARCHITECTURE.md) | System architecture specification |
| [HALO_STACKS_SMART_CONTRACTS.md](HALO_STACKS_SMART_CONTRACTS.md) | Detailed smart contract design |
| [HALO_STACKS_POC_IMPLEMENTATION_PLAN.md](HALO_STACKS_POC_IMPLEMENTATION_PLAN.md) | Phased implementation plan |

## Security Considerations

- All contracts enforce admin-only guards on sensitive operations (fee changes, pausing, admin transfer)
- Identity binding is permanent and one-time per wallet (Sybil resistance)
- Circle operations require a verified identity (bound wallet)
- Credit score recording is restricted to authorized contracts only (not arbitrary callers)
- Protocol fee is capped at 10% (1000 basis points)
- Vault collateral locked/released only by authorized contracts, LTV enforced on withdrawals
- STX transfers use the native `stx-transfer?` function (no reentrancy risk)
- These contracts have **NOT been formally audited** - use at your own risk on testnet

## License

MIT License - see [LICENSE](LICENSE).

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch
3. Ensure all tests pass (`npm test`)
4. Ensure contracts compile (`clarinet check`)
5. Submit a pull request

Built by [XXIX Labs](https://github.com/halo-protocol) for the Halo Protocol.
