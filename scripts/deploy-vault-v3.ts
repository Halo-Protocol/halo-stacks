#!/usr/bin/env npx tsx
/**
 * Deploy halo-vault-v3 contract to Stacks mainnet.
 *
 * Usage:
 *   npx tsx scripts/deploy-vault-v3.ts --dry-run    # check only
 *   npx tsx scripts/deploy-vault-v3.ts --execute     # deploy + configure
 */
import { readFileSync } from "fs";
import {
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
  principalCV,
  uintCV,
  someCV,
  noneCV,
  stringAsciiCV,
  Cl,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const MAINNET_API = "https://api.hiro.so";
const DEPLOYER = process.env.DEPLOYER_ADDRESS!;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

if (!DEPLOYER || !PRIVATE_KEY) {
  console.error("Missing DEPLOYER_ADDRESS or DEPLOYER_PRIVATE_KEY in env");
  process.exit(1);
}

const network = networkFromName("mainnet");

function log(msg: string) {
  console.log(`[vault-v3] ${msg}`);
}

async function getBalance(): Promise<number> {
  const res = await fetch(`${MAINNET_API}/v2/accounts/${DEPLOYER}`);
  const data = await res.json();
  return Number(BigInt(data.balance) - BigInt(data.locked)) / 1_000_000;
}

async function getNonce(): Promise<bigint> {
  const res = await fetch(`${MAINNET_API}/v2/accounts/${DEPLOYER}`);
  const data = await res.json();
  return BigInt(data.nonce);
}

async function waitForTx(txId: string, label: string): Promise<boolean> {
  log(`Waiting for ${label}: ${txId}`);
  const start = Date.now();
  const timeout = 20 * 60 * 1000; // 20 min

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${MAINNET_API}/extended/v1/tx/${txId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tx_status === "success") {
          log(`${label} confirmed!`);
          return true;
        }
        if (data.tx_status?.startsWith("abort")) {
          log(`${label} FAILED: ${data.tx_status}`);
          return false;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 15000));
  }
  log(`${label} timed out after 20 minutes`);
  return false;
}

async function deployContract() {
  log("=== Deploy halo-vault-v3 to mainnet ===");

  const balance = await getBalance();
  log(`Deployer: ${DEPLOYER}`);
  log(`Balance: ${balance.toFixed(2)} STX`);

  if (balance < 5) {
    log("ERROR: Insufficient balance (need at least 5 STX)");
    process.exit(1);
  }

  const contractSource = readFileSync("contracts/halo-vault-v3.clar", "utf8");
  log(`Contract size: ${contractSource.length} bytes`);

  if (!EXECUTE) {
    log("[DRY RUN] Would deploy halo-vault-v3");
    log("[DRY RUN] Would run 6 post-deploy configuration txs");
    return;
  }

  const nonce = await getNonce();
  log(`Nonce: ${nonce}`);

  const deployTx = await makeContractDeploy({
    contractName: "halo-vault-v3",
    codeBody: contractSource,
    senderKey: PRIVATE_KEY,
    network,
    nonce,
    fee: 500000n, // 0.5 STX — generous for ~29KB contract
    postConditionMode: PostConditionMode.Allow,
    clarityVersion: 3,
  });

  log("Broadcasting deploy transaction...");
  const result = await broadcastTransaction({ transaction: deployTx, network });

  if ("error" in result) {
    log(`Broadcast error: ${JSON.stringify(result)}`);
    process.exit(1);
  }

  const txId = typeof result === "string" ? result : result.txid;
  log(`Deploy tx: 0x${txId}`);
  log(`Explorer: https://explorer.hiro.so/txid/0x${txId}`);

  const success = await waitForTx(`0x${txId}`, "deploy");
  if (!success) {
    log("Deploy failed or timed out. Aborting.");
    process.exit(1);
  }

  // Post-deploy configuration
  await runPostDeployConfig(nonce + 1n);
}

async function runPostDeployConfig(startNonce: bigint) {
  log("\n=== Post-deploy configuration ===");

  const vaultV3 = `${DEPLOYER}.halo-vault-v3`;
  const usdcxContract = "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE";
  const sbtcContract = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4";

  const configs = [
    {
      label: "Authorize halo-circle",
      functionName: "authorize-contract",
      functionArgs: [principalCV(`${DEPLOYER}.halo-circle`)],
    },
    {
      label: "Authorize halo-circle-v2",
      functionName: "authorize-contract",
      functionArgs: [principalCV(`${DEPLOYER}.halo-circle-v2`)],
    },
    {
      label: "Configure USDCx (asset 0, 90% LTV, $1.00, 6 decimals)",
      functionName: "configure-asset",
      functionArgs: [
        uintCV(0), // ASSET_USDCX
        someCV(principalCV(`${usdcxContract}.usdcx`)),
        uintCV(9000), // 90% LTV
        uintCV(1000000), // $1.00
        uintCV(6),
        stringAsciiCV("Stable Yield via Granite Protocol"),
      ],
    },
    {
      label: "Configure sBTC (asset 1, 60% LTV, $90000, 8 decimals)",
      functionName: "configure-asset",
      functionArgs: [
        uintCV(1), // ASSET_SBTC
        someCV(principalCV(`${sbtcContract}.sbtc-token`)),
        uintCV(6000), // 60% LTV
        uintCV(90000000000), // $90,000.00
        uintCV(8),
        stringAsciiCV("BTC Earn via PoX Dual Stacking"),
      ],
    },
    {
      label: "Configure STX (asset 2, 40% LTV, $0.75, 6 decimals)",
      functionName: "configure-asset",
      functionArgs: [
        uintCV(2), // ASSET_STX
        noneCV(),
        uintCV(4000), // 40% LTV
        uintCV(750000), // $0.75
        uintCV(6),
        stringAsciiCV("STX Stack via Proof of Transfer"),
      ],
    },
    {
      label: "Configure hUSD (asset 3, 80% LTV, $1.00, 6 decimals)",
      functionName: "configure-asset",
      functionArgs: [
        uintCV(3), // ASSET_HUSD
        someCV(principalCV(`${DEPLOYER}.halo-mock-token`)),
        uintCV(8000), // 80% LTV
        uintCV(1000000), // $1.00
        uintCV(6),
        stringAsciiCV("Halo Native Stablecoin"),
      ],
    },
  ];

  let nonce = startNonce;

  for (const config of configs) {
    log(`\n${config.label}...`);

    const tx = await makeContractCall({
      contractAddress: DEPLOYER,
      contractName: "halo-vault-v3",
      functionName: config.functionName,
      functionArgs: config.functionArgs,
      senderKey: PRIVATE_KEY,
      network,
      nonce,
      fee: 50000n,
      postConditionMode: PostConditionMode.Allow,
    });

    const result = await broadcastTransaction({ transaction: tx, network });
    if ("error" in result) {
      log(`  ERROR: ${JSON.stringify(result)}`);
      continue;
    }

    const txId = typeof result === "string" ? result : result.txid;
    log(`  tx: 0x${txId}`);
    nonce++;

    // Small delay between txs
    await new Promise((r) => setTimeout(r, 2000));
  }

  log("\nAll configuration transactions broadcast!");
  log("Monitor at: https://explorer.hiro.so/address/" + DEPLOYER);
}

deployContract().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
