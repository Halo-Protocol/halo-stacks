/**
 * Halo Protocol — Testnet Integration Test Script
 *
 * Tests all smart contract functionality with real testnet transactions.
 * Run in phases (each phase waits for prior txs to confirm ~10-30 min):
 *
 *   npx tsx scripts/testnet-test.ts --phase setup
 *   npx tsx scripts/testnet-test.ts --phase fund
 *   npx tsx scripts/testnet-test.ts --phase identity
 *   npx tsx scripts/testnet-test.ts --phase vault
 *   npx tsx scripts/testnet-test.ts --phase price
 *   npx tsx scripts/testnet-test.ts --phase circle
 *   npx tsx scripts/testnet-test.ts --phase contribute
 *   npx tsx scripts/testnet-test.ts --phase payout
 *   npx tsx scripts/testnet-test.ts --phase staking
 *   npx tsx scripts/testnet-test.ts --phase verify
 */

import { generateSecretKey, generateWallet } from "@stacks/wallet-sdk";
import {
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToJSON,
  PostConditionMode,
  uintCV,
  standardPrincipalCV,
  contractPrincipalCV,
  bufferCV,
  stringAsciiCV,
  noneCV,
  ClarityValue,
  getAddressFromPrivateKey,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CONFIG
// ============================================

const NETWORK = networkFromName("testnet");
const API_URL = "https://api.testnet.hiro.so";
const DEPLOYER = "ST3Z4DG7WT691EBYNTFXG0HT5XRFYNHD9VJ5TB4W4";
const DEPLOYER_MNEMONIC =
  "pulp know nature faint era buyer what large test measure naive develop system alpha lemon road enough peace raccoon illegal rug park unable floor";
const WALLETS_FILE = join(__dirname, "test-wallets.json");
const FEE = 10_000;
const EXPLORER = "https://explorer.hiro.so/txid";

// Token amounts
const HUSD_MINT_AMOUNT = 500_000_000n; // 500 hUSD (6 decimals)
const SBTC_MINT_AMOUNT = 5_000_000n; // 0.05 sBTC (8 decimals)
const VAULT_DEPOSIT = 400_000_000n; // 400 hUSD
const CIRCLE_CONTRIBUTION = 100_000_000n; // 100 hUSD
const STAKE_AMOUNT = 2_000_000n; // 0.02 sBTC

interface WalletInfo {
  name: string;
  mnemonic: string;
  privateKey: string;
  address: string;
}

interface WalletsFile {
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
  return `${EXPLORER}/${txid}?chain=testnet`;
}

async function fetchNonce(address: string): Promise<bigint> {
  const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
  if (!res.ok) throw new Error(`Failed to fetch nonce for ${address}: ${res.status}`);
  const data = (await res.json()) as { nonce: number };
  return BigInt(data.nonce);
}

async function getDeployerKey(): Promise<string> {
  const wallet = await generateWallet({ secretKey: DEPLOYER_MNEMONIC, password: "" });
  return wallet.accounts[0].stxPrivateKey;
}

async function sendTx(opts: {
  senderKey: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  nonce: bigint;
}): Promise<string> {
  const tx = await makeContractCall({
    network: NETWORK,
    contractAddress: DEPLOYER,
    contractName: opts.contractName,
    functionName: opts.functionName,
    functionArgs: opts.functionArgs,
    senderKey: opts.senderKey,
    nonce: opts.nonce,
    postConditionMode: PostConditionMode.Allow,
    fee: FEE,
  });

  const result = await broadcastTransaction({ transaction: tx, network: NETWORK });

  if ("error" in result) {
    const errMsg = (result as { error: string; reason?: string }).reason ||
      (result as { error: string }).error;
    throw new Error(`Broadcast failed: ${errMsg}`);
  }

  return (result as { txid: string }).txid;
}

async function readOnly(
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

function loadWallets(): WalletsFile {
  if (!existsSync(WALLETS_FILE)) {
    throw new Error(`Wallets file not found. Run --phase setup first.`);
  }
  return JSON.parse(readFileSync(WALLETS_FILE, "utf-8"));
}

function saveWallets(data: WalletsFile) {
  writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2));
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

// ============================================
// PHASE: SETUP — Generate 5 wallets
// ============================================

async function phaseSetup() {
  log("=== PHASE: SETUP — Generating 5 test wallets ===");

  const names = ["test-alice", "test-bob", "test-carol", "test-dave", "test-eve"];
  const wallets: WalletInfo[] = [];

  for (const name of names) {
    const mnemonic = generateSecretKey(256);
    const wallet = await generateWallet({ secretKey: mnemonic, password: "" });
    const privateKey = wallet.accounts[0].stxPrivateKey;
    const address = getAddressFromPrivateKey(privateKey, "testnet");

    wallets.push({ name, mnemonic, privateKey, address });
    log(`  ${name}: ${address}`);
  }

  saveWallets({ wallets });
  log(`\nSaved to ${WALLETS_FILE}`);
  log("Next: npx tsx scripts/testnet-test.ts --phase fund");
}

// ============================================
// PHASE: FUND — STX faucet + mint tokens
// ============================================

async function phaseFund() {
  log("=== PHASE: FUND — Funding wallets ===");
  const { wallets } = loadWallets();
  const deployerKey = await getDeployerKey();

  // 1. Request STX from faucet for each wallet
  log("\n--- Requesting STX from testnet faucet ---");
  for (const w of wallets) {
    try {
      const res = await fetch(`${API_URL}/extended/v1/faucets/stx?address=${w.address}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success || data.txId) {
        log(`  ${w.name}: STX faucet OK — ${data.txId || "queued"}`);
      } else {
        log(`  ${w.name}: STX faucet response — ${JSON.stringify(data).slice(0, 120)}`);
      }
    } catch (err) {
      log(`  ${w.name}: STX faucet error — ${(err as Error).message}`);
    }
  }

  // 2. Mint hUSD + sBTC from deployer
  log("\n--- Minting hUSD + sBTC from deployer ---");
  let nonce = await fetchNonce(DEPLOYER);

  for (const w of wallets) {
    // Mint hUSD
    try {
      const txid = await sendTx({
        senderKey: deployerKey,
        contractName: "halo-mock-token",
        functionName: "mint",
        functionArgs: [uintCV(HUSD_MINT_AMOUNT), standardPrincipalCV(w.address)],
        nonce: nonce++,
      });
      log(`  ${w.name}: hUSD mint TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: hUSD mint FAILED — ${(err as Error).message}`);
    }

    // Mint sBTC
    try {
      const txid = await sendTx({
        senderKey: deployerKey,
        contractName: "halo-mock-sbtc",
        functionName: "mint",
        functionArgs: [uintCV(SBTC_MINT_AMOUNT), standardPrincipalCV(w.address)],
        nonce: nonce++,
      });
      log(`  ${w.name}: sBTC mint TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: sBTC mint FAILED — ${(err as Error).message}`);
    }
  }

  log(`\nBroadcast ${wallets.length * 2} mint transactions.`);
  log("Wait ~10-30 min for confirmation, then: npx tsx scripts/testnet-test.ts --phase identity");
}

// ============================================
// PHASE: IDENTITY — Bind wallets
// ============================================

async function phaseIdentity() {
  log("=== PHASE: IDENTITY — Binding wallets ===");
  const { wallets } = loadWallets();

  for (const w of wallets) {
    const uniqueId = sha256(w.address);
    const nonce = await fetchNonce(w.address);

    try {
      const txid = await sendTx({
        senderKey: w.privateKey,
        contractName: "halo-identity",
        functionName: "bind-wallet",
        functionArgs: [bufferCV(uniqueId)],
        nonce,
      });
      log(`  ${w.name}: bind-wallet TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: bind-wallet FAILED — ${(err as Error).message}`);
    }
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase vault");
}

// ============================================
// PHASE: VAULT — Deposit collateral
// ============================================

async function phaseVault() {
  log("=== PHASE: VAULT — Depositing hUSD collateral ===");
  const { wallets } = loadWallets();
  const circleMembers = wallets.slice(0, 3); // Alice, Bob, Carol

  for (const w of circleMembers) {
    const nonce = await fetchNonce(w.address);

    try {
      const txid = await sendTx({
        senderKey: w.privateKey,
        contractName: "halo-vault",
        functionName: "deposit",
        functionArgs: [
          contractPrincipalCV(DEPLOYER, "halo-mock-token"),
          uintCV(VAULT_DEPOSIT),
        ],
        nonce,
      });
      log(`  ${w.name}: vault deposit 400 hUSD TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: vault deposit FAILED — ${(err as Error).message}`);
    }
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase price");
}

// ============================================
// PHASE: PRICE — Set hUSD token price
// ============================================

async function phasePrice() {
  log("=== PHASE: PRICE — Setting hUSD price in vault oracle ===");
  const deployerKey = await getDeployerKey();
  const nonce = await fetchNonce(DEPLOYER);

  try {
    const txid = await sendTx({
      senderKey: deployerKey,
      contractName: "halo-vault",
      functionName: "set-token-price",
      functionArgs: [
        contractPrincipalCV(DEPLOYER, "halo-mock-token"),
        uintCV(1_000_000n), // $1.00 (6 decimal precision)
        uintCV(6n), // hUSD has 6 decimals
      ],
      nonce,
    });
    log(`  set-token-price(hUSD, $1.00) TX — ${txLink(txid)}`);
  } catch (err) {
    log(`  set-token-price FAILED — ${(err as Error).message}`);
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase circle");
}

// ============================================
// PHASE: CIRCLE — Create and join circle
// ============================================

async function phaseCircle() {
  log("=== PHASE: CIRCLE — Creating and joining lending circle ===");
  const data = loadWallets();
  const [alice, bob, carol] = data.wallets;

  // Alice creates token circle
  log("\n--- Alice creates hUSD circle (100 hUSD, 3 members) ---");
  const aliceNonce = await fetchNonce(alice.address);
  try {
    const txid = await sendTx({
      senderKey: alice.privateKey,
      contractName: "halo-circle",
      functionName: "create-token-circle",
      functionArgs: [
        stringAsciiCV("Testnet Circle 1"),
        contractPrincipalCV(DEPLOYER, "halo-mock-token"),
        uintCV(CIRCLE_CONTRIBUTION), // 100 hUSD
        uintCV(3n), // 3 members
        uintCV(144n), // ~1 day round duration
        uintCV(72n), // ~12h grace period
      ],
      nonce: aliceNonce,
    });
    log(`  Alice create-token-circle TX — ${txLink(txid)}`);
  } catch (err) {
    log(`  Alice create-token-circle FAILED — ${(err as Error).message}`);
  }

  // Check circle count to find the circle ID
  log("\n--- Checking circle count ---");
  try {
    const result = await readOnly("halo-circle", "get-circle-count") as { value: string };
    const circleId = parseInt(result.value);
    data.circleId = circleId;
    saveWallets(data);
    log(`  Current circle count: ${circleId} (new circle will be #${circleId + 1})`);
    log("  Note: Circle ID will be confirmed after tx confirms. Saving estimated ID.");
    // Save what we expect the ID to be (current count + 1 after our create tx confirms)
    data.circleId = circleId + 1;
    saveWallets(data);
  } catch (err) {
    log(`  get-circle-count failed — ${(err as Error).message}`);
    log("  Defaulting circleId=1");
    data.circleId = 1;
    saveWallets(data);
  }

  log("\nWait for Alice's create tx to confirm (~10-30 min).");
  log("Then Bob and Carol join:");

  // Bob joins
  log("\n--- Bob joins circle ---");
  const bobNonce = await fetchNonce(bob.address);
  try {
    const txid = await sendTx({
      senderKey: bob.privateKey,
      contractName: "halo-circle",
      functionName: "join-circle",
      functionArgs: [uintCV(BigInt(data.circleId!))],
      nonce: bobNonce,
    });
    log(`  Bob join-circle TX — ${txLink(txid)}`);
  } catch (err) {
    log(`  Bob join-circle FAILED — ${(err as Error).message}`);
  }

  // Carol joins
  log("\n--- Carol joins circle ---");
  const carolNonce = await fetchNonce(carol.address);
  try {
    const txid = await sendTx({
      senderKey: carol.privateKey,
      contractName: "halo-circle",
      functionName: "join-circle",
      functionArgs: [uintCV(BigInt(data.circleId!))],
      nonce: carolNonce,
    });
    log(`  Carol join-circle TX — ${txLink(txid)}`);
  } catch (err) {
    log(`  Carol join-circle FAILED — ${(err as Error).message}`);
  }

  log("\nWait for all join txs to confirm. Circle auto-activates when Carol joins (3/3).");
  log("Then: npx tsx scripts/testnet-test.ts --phase contribute");
}

// ============================================
// PHASE: CONTRIBUTE — Round 0 contributions
// ============================================

async function phaseContribute() {
  log("=== PHASE: CONTRIBUTE — Round 0 contributions ===");
  const data = loadWallets();
  const circleId = data.circleId;
  if (!circleId) throw new Error("No circleId saved. Run --phase circle first.");

  const members = data.wallets.slice(0, 3); // Alice, Bob, Carol

  for (const w of members) {
    const nonce = await fetchNonce(w.address);
    try {
      const txid = await sendTx({
        senderKey: w.privateKey,
        contractName: "halo-circle",
        functionName: "contribute-token",
        functionArgs: [
          uintCV(BigInt(circleId)),
          contractPrincipalCV(DEPLOYER, "halo-mock-token"),
        ],
        nonce,
      });
      log(`  ${w.name}: contribute-token TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: contribute-token FAILED — ${(err as Error).message}`);
    }
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase payout");
}

// ============================================
// PHASE: PAYOUT — Process round 0 payout
// ============================================

async function phasePayout() {
  log("=== PHASE: PAYOUT — Processing round 0 payout ===");
  const data = loadWallets();
  const circleId = data.circleId;
  if (!circleId) throw new Error("No circleId saved. Run --phase circle first.");

  // Anyone can call process-payout-token; use Alice
  const alice = data.wallets[0];
  const nonce = await fetchNonce(alice.address);

  try {
    const txid = await sendTx({
      senderKey: alice.privateKey,
      contractName: "halo-circle",
      functionName: "process-payout-token",
      functionArgs: [
        uintCV(BigInt(circleId)),
        contractPrincipalCV(DEPLOYER, "halo-mock-token"),
      ],
      nonce,
    });
    log(`  process-payout-token TX — ${txLink(txid)}`);
    log("  Alice (position 0) should receive 297 hUSD (300 - 1% fee)");
  } catch (err) {
    log(`  process-payout-token FAILED — ${(err as Error).message}`);
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase staking");
}

// ============================================
// PHASE: STAKING — Stake sBTC
// ============================================

async function phaseStaking() {
  log("=== PHASE: STAKING — Dave & Eve stake sBTC ===");
  const { wallets } = loadWallets();
  const stakers = wallets.slice(3, 5); // Dave, Eve

  for (const w of stakers) {
    const nonce = await fetchNonce(w.address);
    try {
      const txid = await sendTx({
        senderKey: w.privateKey,
        contractName: "halo-sbtc-staking",
        functionName: "stake-sbtc",
        functionArgs: [
          contractPrincipalCV(DEPLOYER, "halo-mock-sbtc"),
          uintCV(STAKE_AMOUNT),
        ],
        nonce,
      });
      log(`  ${w.name}: stake-sbtc (0.02 sBTC) TX — ${txLink(txid)}`);
    } catch (err) {
      log(`  ${w.name}: stake-sbtc FAILED — ${(err as Error).message}`);
    }
  }

  log("\nWait for confirmation, then: npx tsx scripts/testnet-test.ts --phase verify");
}

// ============================================
// PHASE: VERIFY — Full state verification
// ============================================

async function phaseVerify() {
  log("=== PHASE: VERIFY — Full state verification ===\n");
  const data = loadWallets();

  // 1. Identity
  log("--- halo-identity ---");
  try {
    const totalUsers = await readOnly("halo-identity", "get-total-users");
    log(`  Total users: ${JSON.stringify(totalUsers)}`);
  } catch (err) {
    log(`  get-total-users FAILED: ${(err as Error).message}`);
  }

  for (const w of data.wallets) {
    try {
      const bound = await readOnly("halo-identity", "is-wallet-bound", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name} bound: ${JSON.stringify(bound)}`);
    } catch (err) {
      log(`  ${w.name} is-wallet-bound FAILED: ${(err as Error).message}`);
    }
  }

  // 2. Token balances
  log("\n--- Token Balances ---");
  for (const w of data.wallets) {
    try {
      const husd = await readOnly("halo-mock-token", "get-balance", [
        standardPrincipalCV(w.address),
      ]);
      const sbtc = await readOnly("halo-mock-sbtc", "get-balance", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name}: hUSD=${JSON.stringify(husd)}, sBTC=${JSON.stringify(sbtc)}`);
    } catch (err) {
      log(`  ${w.name} balances FAILED: ${(err as Error).message}`);
    }
  }

  // 3. Vault deposits
  log("\n--- halo-vault ---");
  try {
    const config = await readOnly("halo-vault", "get-vault-config");
    log(`  Vault config: ${JSON.stringify(config)}`);
  } catch (err) {
    log(`  get-vault-config FAILED: ${(err as Error).message}`);
  }

  for (const w of data.wallets.slice(0, 3)) {
    try {
      const deposit = await readOnly("halo-vault", "get-vault-deposit", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name} deposit: ${JSON.stringify(deposit)}`);
    } catch (err) {
      log(`  ${w.name} vault FAILED: ${(err as Error).message}`);
    }
  }

  // 4. Credit scores
  log("\n--- halo-credit ---");
  for (const w of data.wallets) {
    try {
      const score = await readOnly("halo-credit", "get-score-by-wallet", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name} credit score: ${JSON.stringify(score)}`);
    } catch (err) {
      log(`  ${w.name} credit FAILED: ${(err as Error).message}`);
    }
  }

  // 5. Circle
  log("\n--- halo-circle ---");
  try {
    const count = await readOnly("halo-circle", "get-circle-count");
    log(`  Circle count: ${JSON.stringify(count)}`);
  } catch (err) {
    log(`  get-circle-count FAILED: ${(err as Error).message}`);
  }

  if (data.circleId) {
    try {
      const circle = await readOnly("halo-circle", "get-circle", [
        uintCV(BigInt(data.circleId)),
      ]);
      log(`  Circle #${data.circleId}: ${JSON.stringify(circle)}`);
    } catch (err) {
      log(`  get-circle FAILED: ${(err as Error).message}`);
    }

    try {
      const members = await readOnly("halo-circle", "get-circle-members", [
        uintCV(BigInt(data.circleId)),
      ]);
      log(`  Circle members: ${JSON.stringify(members)}`);
    } catch (err) {
      log(`  get-circle-members FAILED: ${(err as Error).message}`);
    }

    try {
      const payout = await readOnly("halo-circle", "get-payout", [
        uintCV(BigInt(data.circleId)),
        uintCV(0n),
      ]);
      log(`  Round 0 payout: ${JSON.stringify(payout)}`);
    } catch (err) {
      log(`  get-payout FAILED: ${(err as Error).message}`);
    }
  }

  // 6. Staking
  log("\n--- halo-sbtc-staking ---");
  try {
    const totalStaked = await readOnly("halo-sbtc-staking", "get-total-staked");
    log(`  Total staked: ${JSON.stringify(totalStaked)}`);
  } catch (err) {
    log(`  get-total-staked FAILED: ${(err as Error).message}`);
  }

  for (const w of data.wallets.slice(3, 5)) {
    try {
      const stakeData = await readOnly("halo-sbtc-staking", "get-staker-data", [
        standardPrincipalCV(w.address),
      ]);
      log(`  ${w.name} stake: ${JSON.stringify(stakeData)}`);
    } catch (err) {
      log(`  ${w.name} staking FAILED: ${(err as Error).message}`);
    }
  }

  log("\n=== VERIFICATION COMPLETE ===");
}

// ============================================
// MAIN
// ============================================

async function main() {
  const phaseArg = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ||
    process.argv[process.argv.indexOf("--phase") + 1];

  if (!phaseArg) {
    console.log("Halo Protocol — Testnet Integration Tests\n");
    console.log("Usage: npx tsx scripts/testnet-test.ts --phase <phase>\n");
    console.log("Phases (run in order, wait for tx confirmation between each):");
    console.log("  setup       Generate 5 test wallets");
    console.log("  fund        Fund wallets (STX faucet + mint hUSD/sBTC)");
    console.log("  identity    Bind wallet identities");
    console.log("  vault       Deposit hUSD collateral (Alice, Bob, Carol)");
    console.log("  price       Set hUSD price in vault oracle (admin)");
    console.log("  circle      Create + join lending circle");
    console.log("  contribute  Make round 0 contributions");
    console.log("  payout      Process round 0 payout");
    console.log("  staking     Stake sBTC (Dave, Eve)");
    console.log("  verify      Full state verification (read-only)");
    process.exit(0);
  }

  const phases: Record<string, () => Promise<void>> = {
    setup: phaseSetup,
    fund: phaseFund,
    identity: phaseIdentity,
    vault: phaseVault,
    price: phasePrice,
    circle: phaseCircle,
    contribute: phaseContribute,
    payout: phasePayout,
    staking: phaseStaking,
    verify: phaseVerify,
  };

  const fn = phases[phaseArg];
  if (!fn) {
    console.error(`Unknown phase: ${phaseArg}`);
    console.error(`Available: ${Object.keys(phases).join(", ")}`);
    process.exit(1);
  }

  try {
    await fn();
  } catch (err) {
    console.error(`\nFATAL: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
