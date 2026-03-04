/**
 * Halo Protocol — Mainnet Activity Script
 *
 * Generates real on-chain transactions from 5 test wallets interacting with
 * deployed contracts on mainnet. Minimizes STX gas fees.
 *
 * Usage:
 *   npx tsx scripts/mainnet-activity.ts --check              # Check balances + contract state
 *   npx tsx scripts/mainnet-activity.ts --admin-setup        # Deployer config calls (one-time)
 *   npx tsx scripts/mainnet-activity.ts --mint               # Mint hUSD+sBTC to test wallets
 *   npx tsx scripts/mainnet-activity.ts --identity           # Bind all wallet identities
 *   npx tsx scripts/mainnet-activity.ts --vault-deposit      # Deposit hUSD to vault-v2
 *   npx tsx scripts/mainnet-activity.ts --create-circle      # Create a lending circle (v2)
 *   npx tsx scripts/mainnet-activity.ts --join-circle        # Bob+Carol join the circle
 *   npx tsx scripts/mainnet-activity.ts --contribute         # All members contribute
 *   npx tsx scripts/mainnet-activity.ts --stake              # Dave+Eve stake sBTC
 *   npx tsx scripts/mainnet-activity.ts --daily              # Daily round-robin STX transfers
 *   npx tsx scripts/mainnet-activity.ts --daily --rounds 3   # Multiple rounds
 */

import {
  makeSTXTokenTransfer,
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToJSON,
  PostConditionMode,
  getAddressFromPrivateKey,
  uintCV,
  standardPrincipalCV,
  contractPrincipalCV,
  bufferCV,
  stringAsciiCV,
  noneCV,
  someCV,
  ClarityValue,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { generateWallet } from "@stacks/wallet-sdk";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CONFIG
// ============================================

const NETWORK = networkFromName("mainnet");
const API_URL = "https://api.hiro.so";
const WALLETS_FILE = join(__dirname, "test-wallets.json");
const EXPLORER = "https://explorer.hiro.so/txid";
const DEPLOYER = "SPWAYZFA113ZTRNDSD3A51WYY90S5MCTWQKXNB2M";
const DEPLOYER_MNEMONIC =
  "math tide across olive tree suggest scrub long supreme cotton trade advance atom multiply mobile side diary hair over search amazing grow clean various";

// Fees — minimal to save STX
const TRANSFER_FEE = 500; // 0.0005 STX for simple transfers
const CALL_FEE = 2000; // 0.002 STX for contract calls
const TRANSFER_AMOUNT = 1n; // 1 microSTX for daily transfers

// Asset type constants (from vault-v2)
const ASSET_TYPE_HUSD = 0n;
const ASSET_TYPE_STX = 1n;
const ASSET_TYPE_SBTC = 2n;

interface WalletInfo {
  name: string;
  mnemonic: string;
  privateKey: string;
  address: string;
}

interface StateFile {
  wallets: WalletInfo[];
  circleId?: number;
}

// ============================================
// HELPERS
// ============================================

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function txLink(txid: string): string {
  const id = txid.startsWith("0x") ? txid : `0x${txid}`;
  return `${EXPLORER}/${id}?chain=mainnet`;
}

function loadState(): StateFile {
  if (!existsSync(WALLETS_FILE)) {
    throw new Error("Wallets file not found. Run testnet-test.ts --phase setup first.");
  }
  const data = JSON.parse(readFileSync(WALLETS_FILE, "utf-8"));
  return {
    ...data,
    wallets: data.wallets.map((w: WalletInfo) => ({
      ...w,
      address: getAddressFromPrivateKey(w.privateKey, "mainnet"),
    })),
  };
}

function saveState(data: StateFile) {
  // Save with original testnet addresses (source of truth)
  const original = JSON.parse(readFileSync(WALLETS_FILE, "utf-8"));
  original.circleId = data.circleId;
  writeFileSync(WALLETS_FILE, JSON.stringify(original, null, 2));
}

async function fetchNonce(address: string): Promise<bigint> {
  const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
  if (!res.ok) throw new Error(`Nonce fetch failed: ${res.status}`);
  const data = (await res.json()) as { nonce: number };
  return BigInt(data.nonce);
}

async function fetchBalance(address: string): Promise<bigint> {
  const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
  if (!res.ok) throw new Error(`Balance fetch failed: ${address}`);
  const data = (await res.json()) as { balance: string };
  return BigInt(parseInt(data.balance, 16));
}

async function getDeployerKey(): Promise<string> {
  const wallet = await generateWallet({ secretKey: DEPLOYER_MNEMONIC, password: "" });
  return wallet.accounts[0].stxPrivateKey;
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

async function callContract(opts: {
  senderKey: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  nonce: bigint;
  fee?: number;
}): Promise<string> {
  const tx = await makeContractCall({
    network: NETWORK,
    contractAddress: DEPLOYER,
    contractName: opts.contractName,
    functionName: opts.functionName,
    functionArgs: opts.functionArgs,
    senderKey: opts.senderKey,
    nonce: opts.nonce,
    fee: opts.fee || CALL_FEE,
    postConditionMode: PostConditionMode.Allow,
  });
  const result = await broadcastTransaction({ transaction: tx, network: NETWORK });
  if ("error" in result) {
    const err = result as { error: string; reason?: string };
    throw new Error(err.reason || err.error);
  }
  return (result as { txid: string }).txid;
}

async function readContract(
  contractName: string,
  functionName: string,
  args: ClarityValue[] = [],
): Promise<unknown> {
  const result = await fetchCallReadOnlyFunction({
    network: NETWORK,
    contractAddress: DEPLOYER,
    contractName,
    functionName,
    functionArgs: args,
    senderAddress: DEPLOYER,
  });
  return cvToJSON(result);
}

// ============================================
// --check: Balances + contract state
// ============================================

async function cmdCheck() {
  log("=== MAINNET STATUS ===\n");
  const state = loadState();

  // Wallet balances
  log("--- Wallet Balances ---");
  let totalBal = 0n;
  let totalTxs = 0;
  for (const w of state.wallets) {
    const bal = await fetchBalance(w.address);
    const nonce = await fetchNonce(w.address);
    totalBal += bal;
    totalTxs += Number(nonce);
    log(`  ${w.name.padEnd(14)} ${w.address}  ${(Number(bal) / 1e6).toFixed(4)} STX  txs=${nonce}`);
  }
  log(`  Total: ${(Number(totalBal) / 1e6).toFixed(4)} STX | ${totalTxs} txs\n`);

  // Deployer balance
  const depBal = await fetchBalance(DEPLOYER);
  log(`  Deployer: ${DEPLOYER}  ${(Number(depBal) / 1e6).toFixed(4)} STX\n`);

  // Contract state
  log("--- Contract State ---");
  try {
    const users = await readContract("halo-identity", "get-total-users");
    log(`  identity.total-users: ${JSON.stringify(users)}`);
  } catch { log("  identity: error reading"); }

  try {
    const count = await readContract("halo-circle-v2", "get-circle-count");
    log(`  circle-v2.circle-count: ${JSON.stringify(count)}`);
  } catch { log("  circle-v2: error reading"); }

  try {
    const staked = await readContract("halo-sbtc-staking", "get-total-staked");
    log(`  staking.total-staked: ${JSON.stringify(staked)}`);
  } catch { log("  staking: error reading"); }

  // Check wallet identity bindings
  log("\n--- Identity Bindings ---");
  for (const w of state.wallets) {
    try {
      const bound = await readContract("halo-identity", "is-wallet-bound", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name}: ${JSON.stringify(bound)}`);
    } catch { log(`  ${w.name}: error`); }
  }

  // Check credit scores
  log("\n--- Credit Scores ---");
  for (const w of state.wallets) {
    try {
      const score = await readContract("halo-credit", "get-score-by-wallet", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name}: ${JSON.stringify(score)}`);
    } catch { log(`  ${w.name}: error`); }
  }
}

// ============================================
// --admin-setup: One-time deployer config
// ============================================

async function cmdAdminSetup() {
  log("=== ADMIN SETUP — One-time deployer config ===\n");
  const deployerKey = await getDeployerKey();
  let nonce = await fetchNonce(DEPLOYER);

  const calls = [
    // Vault v1: set hUSD price
    {
      contract: "halo-vault", fn: "set-token-price",
      args: [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(1_000_000n), uintCV(6n)],
      desc: "vault: set hUSD price $1.00",
    },
    // Vault v1: authorize circle-v2
    {
      contract: "halo-vault", fn: "authorize-contract",
      args: [contractPrincipalCV(DEPLOYER, "halo-circle-v2")],
      desc: "vault: authorize circle-v2",
    },
    // Vault v2: configure hUSD asset (type=0, 80% LTV, 6 decimals)
    {
      contract: "halo-vault-v2", fn: "configure-asset",
      args: [
        uintCV(ASSET_TYPE_HUSD),
        someCV(contractPrincipalCV(DEPLOYER, "halo-mock-token")),
        uintCV(8000n),
        uintCV(6n),
      ],
      desc: "vault-v2: configure hUSD (80% LTV)",
    },
    // Vault v2: configure STX asset (type=1, 50% LTV, 6 decimals)
    {
      contract: "halo-vault-v2", fn: "configure-asset",
      args: [uintCV(ASSET_TYPE_STX), noneCV(), uintCV(5000n), uintCV(6n)],
      desc: "vault-v2: configure STX (50% LTV)",
    },
    // Vault v2: configure sBTC asset (type=2, 50% LTV, 8 decimals)
    {
      contract: "halo-vault-v2", fn: "configure-asset",
      args: [
        uintCV(ASSET_TYPE_SBTC),
        someCV(contractPrincipalCV(DEPLOYER, "halo-mock-sbtc")),
        uintCV(5000n),
        uintCV(8n),
      ],
      desc: "vault-v2: configure sBTC (50% LTV)",
    },
    // Vault v2: set prices
    {
      contract: "halo-vault-v2", fn: "set-asset-price",
      args: [uintCV(ASSET_TYPE_HUSD), uintCV(1_000_000n)],
      desc: "vault-v2: hUSD price $1.00",
    },
    {
      contract: "halo-vault-v2", fn: "set-asset-price",
      args: [uintCV(ASSET_TYPE_STX), uintCV(1_000_000n)],
      desc: "vault-v2: STX price $1.00",
    },
    {
      contract: "halo-vault-v2", fn: "set-asset-price",
      args: [uintCV(ASSET_TYPE_SBTC), uintCV(80_000_000_000n)],
      desc: "vault-v2: sBTC price $80,000",
    },
    // Vault v2: authorize circle-v2
    {
      contract: "halo-vault-v2", fn: "authorize-contract",
      args: [contractPrincipalCV(DEPLOYER, "halo-circle-v2")],
      desc: "vault-v2: authorize circle-v2",
    },
    // Credit: authorize circle-v2
    {
      contract: "halo-credit", fn: "authorize-contract",
      args: [contractPrincipalCV(DEPLOYER, "halo-circle-v2")],
      desc: "credit: authorize circle-v2",
    },
    // Credit: authorize staking
    {
      contract: "halo-credit", fn: "authorize-contract",
      args: [contractPrincipalCV(DEPLOYER, "halo-sbtc-staking")],
      desc: "credit: authorize staking",
    },
    // Staking: set token
    {
      contract: "halo-sbtc-staking", fn: "set-staking-token",
      args: [contractPrincipalCV(DEPLOYER, "halo-mock-sbtc")],
      desc: "staking: set token to mock-sbtc",
    },
  ];

  log(`Broadcasting ${calls.length} admin config transactions...\n`);
  for (const c of calls) {
    try {
      const txid = await callContract({
        senderKey: deployerKey,
        contractName: c.contract,
        functionName: c.fn,
        functionArgs: c.args,
        nonce: nonce++,
      });
      log(`  ${c.desc}: ${txLink(txid)}`);
    } catch (err) {
      log(`  ${c.desc}: FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nBroadcast ${calls.length} txs. Wait ~10-30 min, then run --mint`);
}

// ============================================
// --mint: Mint hUSD + sBTC to test wallets
// ============================================

async function cmdMint() {
  log("=== MINT — hUSD + sBTC to test wallets ===\n");
  const { wallets } = loadState();
  const deployerKey = await getDeployerKey();
  let nonce = await fetchNonce(DEPLOYER);

  for (const w of wallets) {
    // 500 hUSD
    try {
      const txid = await callContract({
        senderKey: deployerKey,
        contractName: "halo-mock-token",
        functionName: "mint",
        functionArgs: [uintCV(500_000_000n), standardPrincipalCV(w.address)],
        nonce: nonce++,
      });
      log(`  ${w.name}: 500 hUSD mint — ${txLink(txid)}`);
    } catch (err) { log(`  ${w.name}: hUSD FAILED — ${(err as Error).message}`); }

    // 0.05 sBTC
    try {
      const txid = await callContract({
        senderKey: deployerKey,
        contractName: "halo-mock-sbtc",
        functionName: "mint",
        functionArgs: [uintCV(5_000_000n), standardPrincipalCV(w.address)],
        nonce: nonce++,
      });
      log(`  ${w.name}: 0.05 sBTC mint — ${txLink(txid)}`);
    } catch (err) { log(`  ${w.name}: sBTC FAILED — ${(err as Error).message}`); }
  }

  log(`\nWait for confirmation, then run --identity`);
}

// ============================================
// --identity: Bind wallet identities
// ============================================

async function cmdIdentity() {
  log("=== IDENTITY — Binding wallets ===\n");
  const { wallets } = loadState();

  for (const w of wallets) {
    const uniqueId = sha256(w.address);
    const nonce = await fetchNonce(w.address);

    try {
      const txid = await callContract({
        senderKey: w.privateKey,
        contractName: "halo-identity",
        functionName: "bind-wallet",
        functionArgs: [bufferCV(uniqueId)],
        nonce,
      });
      log(`  ${w.name}: bind-wallet — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nWait for confirmation, then run --vault-deposit`);
}

// ============================================
// --vault-deposit: Deposit hUSD collateral
// ============================================

async function cmdVaultDeposit() {
  log("=== VAULT-V2 — Depositing hUSD collateral (Alice, Bob, Carol) ===\n");
  const { wallets } = loadState();

  for (const w of wallets.slice(0, 3)) {
    const nonce = await fetchNonce(w.address);
    try {
      // Circle-v2 uses vault-v2, so deposit there
      const txid = await callContract({
        senderKey: w.privateKey,
        contractName: "halo-vault-v2",
        functionName: "deposit-husd",
        functionArgs: [
          contractPrincipalCV(DEPLOYER, "halo-mock-token"),
          uintCV(400_000_000n), // 400 hUSD
        ],
        nonce,
      });
      log(`  ${w.name}: vault-v2 deposit 400 hUSD — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nWait for confirmation, then run --create-circle`);
}

// ============================================
// --create-circle: Alice creates a circle (v2)
// ============================================

async function cmdCreateCircle() {
  log("=== CIRCLE — Alice creates lending circle (v2) ===\n");
  const state = loadState();
  const alice = state.wallets[0];

  // Get current circle count to predict ID
  let expectedId = 1;
  try {
    const count = await readContract("halo-circle-v2", "get-circle-count") as { value: string };
    expectedId = parseInt(count.value) + 1;
  } catch { /* default 1 */ }

  const nonce = await fetchNonce(alice.address);
  try {
    const txid = await callContract({
      senderKey: alice.privateKey,
      contractName: "halo-circle-v2",
      functionName: "create-token-circle-v2",
      functionArgs: [
        stringAsciiCV("Halo Mainnet Circle"),
        contractPrincipalCV(DEPLOYER, "halo-mock-token"),
        uintCV(100_000_000n), // 100 hUSD contribution
        uintCV(3n), // 3 members
        uintCV(144n), // ~1 day round duration
        uintCV(72n), // ~12h bid window
        uintCV(36n), // ~6h grace period
      ],
      nonce,
    });
    log(`  Alice create-token-circle-v2: ${txLink(txid)}`);
    log(`  Expected circle ID: ${expectedId}`);

    state.circleId = expectedId;
    saveState(state);
  } catch (err) {
    log(`  FAILED — ${(err as Error).message}`);
  }

  log(`\nWait for confirmation, then run --join-circle`);
}

// ============================================
// --join-circle: Bob + Carol join
// ============================================

async function cmdJoinCircle() {
  log("=== CIRCLE — Bob + Carol join ===\n");
  const state = loadState();
  const circleId = state.circleId;
  if (!circleId) throw new Error("No circleId saved. Run --create-circle first.");

  for (const w of state.wallets.slice(1, 3)) {
    const nonce = await fetchNonce(w.address);
    try {
      const txid = await callContract({
        senderKey: w.privateKey,
        contractName: "halo-circle-v2",
        functionName: "join-circle-v2",
        functionArgs: [uintCV(BigInt(circleId))],
        nonce,
      });
      log(`  ${w.name}: join-circle-v2(${circleId}) — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nCircle auto-activates when Carol joins (3/3). Wait, then run --contribute`);
}

// ============================================
// --contribute: All members contribute round 0
// ============================================

async function cmdContribute() {
  log("=== CONTRIBUTE — Round 0 contributions ===\n");
  const state = loadState();
  const circleId = state.circleId;
  if (!circleId) throw new Error("No circleId. Run --create-circle first.");

  for (const w of state.wallets.slice(0, 3)) {
    const nonce = await fetchNonce(w.address);
    try {
      const txid = await callContract({
        senderKey: w.privateKey,
        contractName: "halo-circle-v2",
        functionName: "contribute-token-v2",
        functionArgs: [
          uintCV(BigInt(circleId)),
          contractPrincipalCV(DEPLOYER, "halo-mock-token"),
        ],
        nonce,
      });
      log(`  ${w.name}: contribute-token-v2 — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nWait for confirmation. Credit scores should update.`);
}

// ============================================
// --stake: Dave + Eve stake sBTC
// ============================================

async function cmdStake() {
  log("=== STAKING — Dave + Eve stake sBTC ===\n");
  const { wallets } = loadState();

  for (const w of wallets.slice(3, 5)) {
    const nonce = await fetchNonce(w.address);
    try {
      const txid = await callContract({
        senderKey: w.privateKey,
        contractName: "halo-sbtc-staking",
        functionName: "stake-sbtc",
        functionArgs: [
          contractPrincipalCV(DEPLOYER, "halo-mock-sbtc"),
          uintCV(2_000_000n), // 0.02 sBTC
        ],
        nonce,
      });
      log(`  ${w.name}: stake 0.02 sBTC — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: FAILED — ${(err as Error).message}`);
    }
  }
}

// ============================================
// --daily: Round-robin STX transfers
// ============================================

async function cmdDaily(rounds: number) {
  log(`=== DAILY ACTIVITY — ${rounds} round(s) ===\n`);
  const { wallets } = loadState();
  const date = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let failed = 0;

  for (let round = 0; round < rounds; round++) {
    if (rounds > 1) log(`--- Round ${round + 1}/${rounds} ---`);
    for (let i = 0; i < wallets.length; i++) {
      const sender = wallets[i];
      const recipient = wallets[(i + 1) % wallets.length];
      try {
        const nonce = await fetchNonce(sender.address);
        const tx = await makeSTXTokenTransfer({
          network: NETWORK,
          recipient: recipient.address,
          amount: TRANSFER_AMOUNT,
          senderKey: sender.privateKey,
          nonce,
          fee: TRANSFER_FEE,
          memo: `halo-${date}`,
        });
        const result = await broadcastTransaction({ transaction: tx, network: NETWORK });
        if ("error" in result) {
          log(`  ${sender.name} -> ${recipient.name}: FAIL — ${(result as { reason?: string }).reason || (result as { error: string }).error}`);
          failed++;
        } else {
          log(`  ${sender.name} -> ${recipient.name}: ${txLink((result as { txid: string }).txid)}`);
          sent++;
        }
      } catch (err) {
        log(`  ${sender.name}: ERROR — ${(err as Error).message}`);
        failed++;
      }
    }
  }

  log(`\nSent: ${sent} | Failed: ${failed} | Fees: ${((sent * TRANSFER_FEE) / 1e6).toFixed(4)} STX`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--check")) return cmdCheck();
  if (args.includes("--admin-setup")) return cmdAdminSetup();
  if (args.includes("--mint")) return cmdMint();
  if (args.includes("--identity")) return cmdIdentity();
  if (args.includes("--vault-deposit")) return cmdVaultDeposit();
  if (args.includes("--create-circle")) return cmdCreateCircle();
  if (args.includes("--join-circle")) return cmdJoinCircle();
  if (args.includes("--contribute")) return cmdContribute();
  if (args.includes("--stake")) return cmdStake();

  if (args.includes("--daily") || args.length === 0) {
    const ri = args.indexOf("--rounds");
    const rounds = ri >= 0 ? parseInt(args[ri + 1]) || 1 : 1;
    return cmdDaily(rounds);
  }

  console.log("Unknown command. Run without args for daily transfers, or use --check, --admin-setup, etc.");
}

main().catch((err) => {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
});
