#!/usr/bin/env npx tsx
/**
 * Halo Protocol — Mainnet Deployment Script
 *
 * Deploys the top 6 essential contracts (5 core + 1 trait dependency) to Stacks mainnet.
 *
 * Usage:
 *   npx tsx scripts/deploy-mainnet.ts              # dry-run (default)
 *   npx tsx scripts/deploy-mainnet.ts --execute    # actually deploy
 *   npx tsx scripts/deploy-mainnet.ts --skip-deploy # only run post-deploy auth
 *
 * Prerequisites:
 *   - settings/Mainnet.toml configured with deployer mnemonic
 *   - .env.local: STACKS_NETWORK=mainnet, DEPLOYER_ADDRESS=SP..., DEPLOYER_PRIVATE_KEY=...
 *   - Deployer wallet has sufficient STX (recommended: ≥110 STX)
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { createInterface } from "readline";
import {
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import {
  MAINNET_CONTRACTS,
  getMainnetAuthorizationCalls,
  VERIFICATION_CHECKS,
} from "./lib/deployment-config.js";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const SKIP_DEPLOY = args.includes("--skip-deploy");
const MAINNET_API = "https://api.hiro.so";

function log(msg: string) {
  console.log(`[deploy:mainnet] ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

async function confirmExecution(): Promise<boolean> {
  if (DRY_RUN) return true;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log("\n⚠️  WARNING: You are about to deploy to MAINNET.");
    console.log("   This uses REAL STX and is IRREVERSIBLE.\n");
    rl.question("   Type 'DEPLOY MAINNET' to confirm: ", (answer) => {
      rl.close();
      resolve(answer.trim() === "DEPLOY MAINNET");
    });
  });
}

// --- Step 1: Validate prerequisites ---
function validatePrereqs() {
  logSection("Step 1: Validate Prerequisites");

  // Check clarinet
  try {
    const version = execSync("clarinet --version", { encoding: "utf8" }).trim();
    log(`Clarinet: ${version}`);
  } catch {
    throw new Error("Clarinet not found. Install from https://github.com/hirosystems/clarinet");
  }

  // Check contracts compile
  log("Running clarinet check...");
  try {
    execSync("clarinet check", { encoding: "utf8", cwd: process.cwd() });
    log("All contracts compile successfully");
  } catch (err) {
    throw new Error(`Contract compilation failed: ${err}`);
  }

  // Check Mainnet.toml
  try {
    const toml = readFileSync("settings/Mainnet.toml", "utf8");
    if (toml.includes("<YOUR_MAINNET_MNEMONIC>")) {
      if (!DRY_RUN) {
        throw new Error(
          "Mainnet.toml still has placeholder mnemonic. Update it with your actual mnemonic.",
        );
      }
      log("WARNING: Mainnet.toml has placeholder mnemonic (OK for dry-run)");
    } else {
      log("Mainnet.toml configured with mnemonic");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("placeholder")) throw err;
    throw new Error("Cannot read settings/Mainnet.toml");
  }

  // Validate deployer address is mainnet (SP prefix)
  const deployer = process.env.DEPLOYER_ADDRESS || "";
  if (!DRY_RUN && !deployer.startsWith("SP")) {
    throw new Error(
      `DEPLOYER_ADDRESS must be a mainnet address (SP prefix). Got: ${deployer}`,
    );
  }

  // Check deployer balance
  if (!DRY_RUN && deployer) {
    log("Checking deployer STX balance...");
    try {
      const res = execSync(
        `curl -s "${MAINNET_API}/v2/accounts/${deployer}?proof=0"`,
        { encoding: "utf8" },
      );
      const data = JSON.parse(res);
      const balanceSTX = Number(BigInt(data.balance)) / 1_000_000;
      log(`Deployer balance: ${balanceSTX.toFixed(2)} STX`);
      if (balanceSTX < 60) {
        throw new Error(
          `Insufficient STX balance (${balanceSTX.toFixed(2)} STX). Need at least ~60 STX for 6 contracts.`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Insufficient")) throw err;
      log("WARNING: Could not check deployer balance");
    }
  }

  log(`Contracts to deploy (${MAINNET_CONTRACTS.length}):`);
  for (const name of MAINNET_CONTRACTS) {
    log(`  - ${name}`);
  }
}

// --- Step 2: Generate deployment plan ---
function generateDeploymentPlan() {
  logSection("Step 2: Generate Deployment Plan");

  if (SKIP_DEPLOY) {
    log("Skipping deployment plan generation (--skip-deploy)");
    return;
  }

  if (DRY_RUN) {
    log("[DRY RUN] Would run: clarinet deployments generate --mainnet --low-cost");
    log(`Deployment plan would include ${MAINNET_CONTRACTS.length} contracts in dependency order`);
    return;
  }

  log("Generating mainnet deployment plan...");
  try {
    const output = execSync("clarinet deployments generate --mainnet --low-cost", {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    log(output);
  } catch (err) {
    throw new Error(`Deployment plan generation failed: ${err}`);
  }
}

// --- Step 3: Deploy contracts ---
function deployContracts() {
  logSection("Step 3: Deploy Contracts");

  if (SKIP_DEPLOY) {
    log("Skipping contract deployment (--skip-deploy)");
    return;
  }

  if (DRY_RUN) {
    log("[DRY RUN] Would run: clarinet deployments apply --mainnet");
    log(`This would deploy ${MAINNET_CONTRACTS.length} contracts to Stacks mainnet`);
    log("Estimated cost: ~55 STX total");
    return;
  }

  log("Deploying contracts to MAINNET...");
  try {
    const output = execSync("yes | clarinet deployments apply --mainnet --no-dashboard", {
      encoding: "utf8",
      cwd: process.cwd(),
      timeout: 900_000, // 15 min timeout (mainnet is slower)
    });
    log(output);
  } catch (err) {
    throw new Error(`Contract deployment failed: ${err}`);
  }
}

// --- Step 4: Post-deploy authorization ---
async function runPostDeployAuth() {
  logSection("Step 4: Post-Deploy Authorization");

  const deployer = process.env.DEPLOYER_ADDRESS || "<DEPLOYER_ADDRESS>";
  const authCalls = getMainnetAuthorizationCalls(deployer);

  if (DRY_RUN) {
    for (let i = 0; i < authCalls.length; i++) {
      const call = authCalls[i];
      log(`[${i + 1}/${authCalls.length}] ${call.description}`);
      log(`  Contract: ${deployer}.${call.contractName}`);
      log(`  Function: ${call.functionName}`);
      log("  [DRY RUN] Would broadcast this transaction");
    }
    return;
  }

  const senderKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!senderKey) throw new Error("DEPLOYER_PRIVATE_KEY env var required for --execute mode");
  const network = networkFromName("mainnet");

  // Fetch current nonce
  const apiUrl = process.env.STACKS_API_URL || MAINNET_API;
  const nonceRes = await fetch(`${apiUrl}/v2/accounts/${deployer}?proof=0`);
  if (!nonceRes.ok) throw new Error(`Failed to fetch nonce: ${nonceRes.status}`);
  const nonceData = (await nonceRes.json()) as { nonce: number };
  let currentNonce = BigInt(nonceData.nonce);
  log(`Starting nonce: ${currentNonce}`);

  for (let i = 0; i < authCalls.length; i++) {
    const call = authCalls[i];
    log(`[${i + 1}/${authCalls.length}] ${call.description}`);
    log(`  Contract: ${deployer}.${call.contractName}`);
    log(`  Function: ${call.functionName}`);
    log(`  Nonce: ${currentNonce}`);

    try {
      const tx = await makeContractCall({
        network,
        contractAddress: deployer,
        contractName: call.contractName,
        functionName: call.functionName,
        functionArgs: call.buildArgs(deployer),
        senderKey,
        nonce: currentNonce,
        postConditionMode: PostConditionMode.Allow,
        fee: 50000, // Higher fee for mainnet reliability
      });

      const result = await broadcastTransaction({ transaction: tx, network });
      if ("error" in result) {
        log(`  ERROR: ${JSON.stringify(result)}`);
      } else {
        log(`  TX broadcast: ${result.txid}`);
      }
      currentNonce++;
    } catch (err) {
      log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
      currentNonce++;
    }
  }
}

// --- Step 5: Verification checks ---
function printVerificationChecks() {
  logSection("Step 5: Verification Checks");

  const mainnetChecks = VERIFICATION_CHECKS.filter((c) =>
    MAINNET_CONTRACTS.includes(c.contractName as (typeof MAINNET_CONTRACTS)[number]),
  );

  log("After deployment, verify these read-only calls on Hiro Explorer:");
  log("https://explorer.hiro.so\n");

  for (const check of mainnetChecks) {
    log(`  ${check.contractName}.${check.functionName}()`);
    log(`    Expected: ${check.description}`);
  }

  log("\nRun 'npm run deploy:verify' (with STACKS_NETWORK=mainnet) to automate these checks.");
}

// --- Main ---
async function main() {
  console.log("\n  Halo Protocol - MAINNET Deployment");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "🔴 EXECUTE (REAL STX)"}`);
  console.log(`  Skip deploy: ${SKIP_DEPLOY}`);
  console.log(`  Contracts: ${MAINNET_CONTRACTS.length} (essential only)\n`);

  const confirmed = await confirmExecution();
  if (!confirmed) {
    log("Deployment cancelled by user.");
    process.exit(0);
  }

  try {
    validatePrereqs();
    generateDeploymentPlan();
    deployContracts();
    await runPostDeployAuth();
    printVerificationChecks();

    logSection("Deployment Complete");
    if (DRY_RUN) {
      log("This was a dry run. Use --execute to actually deploy.");
    } else {
      log("All steps completed! Check Hiro Explorer for contract status:");
      log("https://explorer.hiro.so");
    }
  } catch (err) {
    console.error(`\n[FATAL] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
