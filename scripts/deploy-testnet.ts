#!/usr/bin/env npx tsx
/**
 * Halo Protocol — Testnet Deployment Script
 *
 * Usage:
 *   npx tsx scripts/deploy-testnet.ts              # dry-run (default)
 *   npx tsx scripts/deploy-testnet.ts --execute    # actually deploy
 *   npx tsx scripts/deploy-testnet.ts --skip-deploy # only run post-deploy auth
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import {
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { CONTRACTS, getAuthorizationCalls, VERIFICATION_CHECKS } from "./lib/deployment-config.js";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const SKIP_DEPLOY = args.includes("--skip-deploy");

function log(msg: string) {
  console.log(`[deploy] ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
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

  // Check Testnet.toml
  try {
    const toml = readFileSync("settings/Testnet.toml", "utf8");
    if (toml.includes("<YOUR_TESTNET_MNEMONIC>")) {
      if (!DRY_RUN) {
        throw new Error(
          "Testnet.toml still has placeholder mnemonic. Update it with your actual mnemonic.",
        );
      }
      log("WARNING: Testnet.toml has placeholder mnemonic (OK for dry-run)");
    } else {
      log("Testnet.toml configured with mnemonic");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("placeholder")) throw err;
    throw new Error("Cannot read settings/Testnet.toml");
  }

  log(`Contracts to deploy: ${CONTRACTS.length}`);
  for (const name of CONTRACTS) {
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
    log("[DRY RUN] Would run: clarinet deployments generate --testnet --low-cost");
    log("Deployment plan would include all 8 contracts in dependency order");
    return;
  }

  log("Generating testnet deployment plan...");
  try {
    const output = execSync("clarinet deployments generate --testnet --low-cost", {
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
    log("[DRY RUN] Would run: clarinet deployments apply --testnet");
    log("This would deploy all 8 contracts to Stacks testnet");
    log("Estimated cost: ~0.01 STX per contract (0.08 STX total)");
    return;
  }

  log("Deploying contracts to testnet...");
  try {
    const output = execSync("yes | clarinet deployments apply --testnet --no-dashboard", {
      encoding: "utf8",
      cwd: process.cwd(),
      timeout: 600_000, // 10 min timeout
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
  const authCalls = getAuthorizationCalls(deployer);

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
  const network = networkFromName("testnet");

  // Fetch current nonce once, then increment locally for sequential calls
  const apiUrl = process.env.STACKS_API_URL || "https://api.testnet.hiro.so";
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
        fee: 10000,
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

  log("After deployment, verify these read-only calls on Hiro Explorer:");
  log("https://explorer.hiro.so/?chain=testnet\n");

  for (const check of VERIFICATION_CHECKS) {
    log(`  ${check.contractName}.${check.functionName}()`);
    log(`    Expected: ${check.description}`);
  }

  log("\nRun 'npm run deploy:verify' to automate these checks.");
}

// --- Main ---
async function main() {
  console.log("\n  Halo Protocol - Testnet Deployment");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
  console.log(`  Skip deploy: ${SKIP_DEPLOY}`);

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
      log("All steps completed. Check Hiro Explorer for contract status.");
    }
  } catch (err) {
    console.error(`\n[FATAL] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
