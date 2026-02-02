# Testnet Deployment Guide

Step-by-step guide for deploying Halo Protocol smart contracts to the Stacks testnet.

## Prerequisites

- **Clarinet v3.13.1** installed ([releases](https://github.com/hirosystems/clarinet/releases))
- **Node.js >= 20** with npm
- All tests passing locally (`npm test`)
- All contracts compiling (`clarinet check`)

## Step 1: Generate a Testnet Wallet

**Option A** - Generate a new wallet (recommended):
```bash
npm run wallet:generate
```
This creates a fresh 24-word mnemonic, STX address, and private key.

**Option B** - Derive from an existing seed phrase (e.g., from Xverse):
```bash
npm run wallet:from-mnemonic -- word1 word2 word3 ... word12
```

**Option C** - Stacks CLI:
```bash
npx @stacks/cli make_keychain -t
```

Save the output and add to `.env.local`:
```bash
DEPLOYER_ADDRESS=ST1YOUR_ADDRESS_HERE
DEPLOYER_PRIVATE_KEY=your_private_key_hex
```

Also update `settings/Testnet.toml` with the mnemonic for Clarinet deployments.

Never commit the mnemonic or private key to version control.

## Step 2: Fund Your Wallet

1. Go to the Hiro testnet faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
2. Paste your STX address
3. Request testnet STX
4. Wait for the transaction to confirm (~10-30 minutes)

You need enough STX to cover deployment fees for 8 contracts. 50 testnet STX should be more than sufficient.

## Step 3: Configure Testnet.toml

Edit `settings/Testnet.toml` and replace the placeholder:

```toml
[accounts.deployer]
mnemonic = "your actual twelve word mnemonic phrase goes here ..."
```

**IMPORTANT**: Never commit your real mnemonic. The `.gitignore` protects `.env` and `*.mnemonic` files, but `Testnet.toml` is tracked. Either:
- Only add the mnemonic locally and don't commit the change, or
- Use a separate local-only copy of the file

## Automated Deployment (Recommended)

Use the deployment scripts for a guided experience:

```bash
# Dry-run: validates everything, prints plan (no transactions)
npm run deploy:testnet:dry-run

# Execute: deploys contracts and runs auth transactions
npm run deploy:testnet

# Verify: checks on-chain state after deployment
npm run deploy:verify
```

The deploy script handles Steps 4-6 automatically, including all 6 post-deploy authorization calls. Use `--dry-run` first to validate your setup.

**Scripts:** `scripts/deploy-testnet.ts`, `scripts/verify-deployment.ts`, `scripts/lib/deployment-config.ts`.

## Manual Deployment

## Step 4: Generate Deployment Plan

```bash
clarinet deployments generate --testnet
```

Review the generated plan to confirm:
- All 8 contracts are included
- Deployment order respects dependencies
- Epoch is set to 3.0

## Step 5: Deploy Contracts

```bash
clarinet deployments apply --testnet
```

Monitor the output. Each contract deployment is a separate transaction. Wait for all to confirm before proceeding.

## Step 6: Post-Deploy Authorization

After all 8 contracts are deployed, run these authorization transactions. All are required for the full system to work.

Using the Stacks CLI or a transaction builder, call these in order:

```clarity
;; 1. Authorize circle contract to record payments in credit
(contract-call? '<DEPLOYER>.halo-credit authorize-contract '<DEPLOYER>.halo-circle)

;; 2. Authorize staking contract to record staking activity in credit
(contract-call? '<DEPLOYER>.halo-credit authorize-contract '<DEPLOYER>.halo-sbtc-staking)

;; 3. Authorize circle contract to lock/release collateral in vault
(contract-call? '<DEPLOYER>.halo-vault authorize-contract '<DEPLOYER>.halo-circle)

;; 4. Set vault's accepted collateral token (hUSD stablecoin)
(contract-call? '<DEPLOYER>.halo-vault set-vault-token '<DEPLOYER>.halo-mock-token)

;; 5. Set STX price in vault oracle ($0.50 = u500000, 6 decimals)
;; Note: deployer address is used as the "STX" key (sentinel) since STX has no contract principal
(contract-call? '<DEPLOYER>.halo-vault set-token-price '<DEPLOYER> u500000 u6)

;; 6. Set staking token (mock sBTC for testnet)
(contract-call? '<DEPLOYER>.halo-sbtc-staking set-staking-token '<DEPLOYER>.halo-mock-sbtc)
```

Replace `<DEPLOYER>` with your deployer's STX address (e.g., `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`).

## Step 7: Verify Deployment

Check each contract on the Hiro Explorer: https://explorer.hiro.so/?chain=testnet

Call read-only functions to verify initial state:

| Contract | Function | Expected Result |
|----------|----------|-----------------|
| halo-identity | `get-admin` | Your deployer address |
| halo-identity | `get-total-users` | `u0` |
| halo-credit | `get-admin` | Your deployer address |
| halo-credit | `get-authorized-contracts` | List containing halo-circle |
| halo-circle | `get-admin` | Your deployer address |
| halo-circle | `get-circle-count` | `u0` |
| halo-circle | `get-protocol-fee-rate` | `u100` (1%) |
| halo-vault | `get-admin` | Your deployer address |
| halo-vault | `get-ltv-ratio` | `u8000` (80%) |

## Testnet Contract Addresses

| Contract | Address |
|----------|---------|
| halo-sip010-trait | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-sip010-trait` |
| halo-identity | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-identity` |
| halo-mock-token | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-mock-token` |
| halo-mock-sbtc | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-mock-sbtc` |
| halo-credit | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-credit` |
| halo-vault | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-vault` |
| halo-sbtc-staking | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-sbtc-staking` |
| halo-circle | `ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4.halo-circle` |

Explorer: https://explorer.hiro.so/address/ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4?chain=testnet

## Faucet Setup (Test Token Distribution)

The faucet endpoint lets authenticated users mint test tokens (1,000 hUSD + 0.01 sBTC) with a 24-hour rate limit per wallet.

### Required Environment Variables

```bash
# Deployer's private key (used for server-side minting transactions)
DEPLOYER_PRIVATE_KEY=your-deployer-private-key-hex

# Deployer's STX address
DEPLOYER_ADDRESS=ST1YOUR_DEPLOYER_ADDRESS

# API key for admin endpoints (sync, etc.)
ADMIN_API_KEY=your-random-secret-key
```

### How It Works

1. User clicks "Get Test Tokens" on the dashboard
2. Backend uses deployer key to call `halo-mock-token.mint` (1,000 hUSD) and `halo-mock-sbtc.mint` (0.01 sBTC) to the user's wallet
3. A nonce manager prevents transaction collisions for sequential mints
4. Rate limited to 1 request per 24 hours per wallet (DB-persisted)
5. Tokens arrive in ~10-30 minutes after blockchain confirmation

### Database Seeding

Seed the database with test users and a sample circle:

```bash
npx prisma db seed
```

This creates 5 test users with wallet addresses, 1 sample circle, and initial credit scores.

## Admin Sync (On-Chain Status Synchronization)

Sync all active circles' on-chain state to the database:

```bash
curl -X POST http://localhost:3000/api/admin/sync \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

Response:
```json
{ "synced": 5, "failed": 0, "message": "Sync complete" }
```

This updates `onChainRound`, `onChainStatus`, `startedAt`, and `completedAt` for all forming/active circles based on on-chain data.

## Post-Deployment Testing

Run through a basic lending circle lifecycle on testnet:

1. **Bind identities** - Call `halo-identity.bind-wallet` for 3 test wallets
2. **Mint hUSD** - Call `halo-mock-token.mint` for each test wallet (e.g., 50 hUSD)
3. **Deposit collateral** - Call `halo-vault.deposit` with hUSD for each wallet
4. **Create a circle** - Call `halo-circle.create-circle` with 3 members, 1 STX contribution
5. **Join the circle** - Have 2 other wallets call `halo-circle.join-circle` (auto-activates at 3 members)
6. **Contribute** - All 3 members call `halo-circle.contribute-stx` for round 0
7. **Process payout** - Call `halo-circle.process-payout` for round 0
8. **Verify credit** - Check `halo-credit.get-score-by-wallet` shows updated scores
9. **Complete all rounds** - Repeat contribute + payout for remaining rounds
10. **Verify completion** - Circle status should be COMPLETED (u3), collateral released

## Security Reminders

- Never commit your testnet mnemonic to git
- Testnet STX has no monetary value
- These contracts have NOT been formally audited - testnet is for functional testing only
- Monitor deployed contracts for unexpected behavior
- The deployer address is the initial admin for all contracts

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "insufficient balance" | Not enough STX for fees | Get more from the testnet faucet |
| "nonce mismatch" | Pending transactions | Wait for all pending txs to confirm |
| "contract already deployed" | Contract name taken | Use a new deployer address |
| Deployment hangs | Testnet congestion | Be patient; testnet blocks can be slow |
| "authorization required" | Missing post-deploy step | Run `authorize-contract` (Step 6) |
