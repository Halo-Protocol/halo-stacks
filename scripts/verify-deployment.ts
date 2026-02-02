#!/usr/bin/env npx tsx
/**
 * Halo Protocol — Post-Deployment Verification
 *
 * Calls read-only functions on deployed contracts to verify state.
 * Requires DEPLOYER_ADDRESS and STACKS_NETWORK env vars.
 */
import { fetchCallReadOnlyFunction, cvToJSON, ClarityValue } from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { VERIFICATION_CHECKS } from "./lib/deployment-config.js";

const deployer = process.env.DEPLOYER_ADDRESS;
const networkType = (process.env.STACKS_NETWORK || "testnet") as "testnet" | "mainnet";

if (!deployer) {
  console.error("Error: DEPLOYER_ADDRESS env var is required");
  process.exit(1);
}

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[] = [],
): Promise<unknown> {
  const network = networkFromName(networkType);
  const result = await fetchCallReadOnlyFunction({
    network,
    contractAddress: deployer!,
    contractName,
    functionName,
    functionArgs,
    senderAddress: deployer!,
  });
  return cvToJSON(result);
}

async function main() {
  console.log(`\n  Halo Protocol - Deployment Verification`);
  console.log(`  Network: ${networkType}`);
  console.log(`  Deployer: ${deployer}\n`);

  let passed = 0;
  let failed = 0;

  for (const check of VERIFICATION_CHECKS) {
    try {
      const result = await callReadOnly(check.contractName, check.functionName);
      console.log(`  [PASS] ${check.contractName}.${check.functionName}()`);
      console.log(`         Result: ${JSON.stringify(result)}`);
      console.log(`         Expected: ${check.description}`);
      passed++;
    } catch (err) {
      console.log(`  [FAIL] ${check.contractName}.${check.functionName}()`);
      console.log(`         Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed out of ${VERIFICATION_CHECKS.length} checks\n`);
  if (failed > 0) process.exit(1);
}

main();
