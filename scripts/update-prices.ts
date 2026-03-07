#!/usr/bin/env npx tsx
/**
 * Price Oracle Script — Fetches live prices from CoinGecko and submits
 * set-asset-price transactions to halo-vault-v3.
 *
 * Usage:
 *   npx tsx scripts/update-prices.ts           # one-shot update
 *   npx tsx scripts/update-prices.ts --cron     # run every 30 minutes
 *   npx tsx scripts/update-prices.ts --dry-run  # fetch prices without submitting
 *
 * Required env vars:
 *   DEPLOYER_ADDRESS, DEPLOYER_PRIVATE_KEY, STACKS_NETWORK (mainnet|testnet)
 */
import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  fetchCallReadOnlyFunction,
  cvToJSON,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { fetchAllPrices, PriceData } from "../src/lib/price-feeds";
import { getNextNonce, resetNonce } from "../src/lib/nonce-manager";

const DEPLOYER = process.env.DEPLOYER_ADDRESS || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const NETWORK_NAME = (process.env.STACKS_NETWORK || "mainnet") as "mainnet" | "testnet";
const CONTRACT_NAME = "halo-vault-v3";
const CRON_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const STALE_THRESHOLD_PERCENT = 1; // update if price moved > 1%

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CRON = args.includes("--cron");

function log(msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.log(JSON.stringify({ ts, msg, ...data }));
}

function logError(msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.error(JSON.stringify({ ts, level: "error", msg, ...data }));
}

const ASSET_NAMES: Record<number, string> = {
  0: "USDCx",
  1: "sBTC",
  2: "STX",
  3: "hUSD",
};

async function getOnChainPrice(assetType: number): Promise<bigint | null> {
  try {
    const network = networkFromName(NETWORK_NAME);
    const result = await fetchCallReadOnlyFunction({
      network,
      contractAddress: DEPLOYER,
      contractName: CONTRACT_NAME,
      functionName: "get-asset-config",
      functionArgs: [uintCV(assetType)],
      senderAddress: DEPLOYER,
    });
    const json = cvToJSON(result);
    if (!json || json.type === "none" || json.value === null) return null;
    const asset = json.value || json;
    return BigInt(asset["price-usd"]?.value || "0");
  } catch {
    return null;
  }
}

function shouldUpdate(onChainMicro: bigint, newMicro: bigint): boolean {
  if (onChainMicro === 0n) return true;
  const diff = Number(newMicro > onChainMicro ? newMicro - onChainMicro : onChainMicro - newMicro);
  const pct = (diff / Number(onChainMicro)) * 100;
  return pct >= STALE_THRESHOLD_PERCENT;
}

async function submitPriceUpdate(assetType: number, priceUsdMicro: bigint): Promise<string | null> {
  if (DRY_RUN) {
    log("DRY RUN: would submit set-asset-price", {
      assetType,
      priceUsdMicro: priceUsdMicro.toString(),
      asset: ASSET_NAMES[assetType],
    });
    return null;
  }

  const network = networkFromName(NETWORK_NAME);
  const nonce = await getNextNonce(DEPLOYER);

  const tx = await makeContractCall({
    network,
    contractAddress: DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: "set-asset-price",
    functionArgs: [uintCV(assetType), uintCV(priceUsdMicro)],
    senderKey: PRIVATE_KEY,
    nonce,
    fee: 5000n,
  });

  const result = await broadcastTransaction({ transaction: tx, network });

  if ("error" in result) {
    logError("Broadcast failed", {
      asset: ASSET_NAMES[assetType],
      error: result.error,
      reason: (result as Record<string, unknown>).reason,
    });
    return null;
  }

  return result.txid;
}

async function updateAllPrices(): Promise<void> {
  log("Fetching prices from CoinGecko...");

  let prices: PriceData[];
  try {
    prices = await fetchAllPrices();
  } catch (err) {
    logError("Failed to fetch prices", { error: String(err) });
    return;
  }

  if (prices.length === 0) {
    logError("No prices returned from CoinGecko");
    return;
  }

  log("Prices fetched", {
    prices: prices.map((p) => ({
      asset: ASSET_NAMES[p.assetType],
      price: `$${p.priceUsd}`,
    })),
  });

  // Check each price against on-chain and update if stale
  for (const price of prices) {
    const onChain = await getOnChainPrice(price.assetType);
    const name = ASSET_NAMES[price.assetType] || `Asset ${price.assetType}`;

    if (onChain !== null && !shouldUpdate(onChain, price.priceUsdMicro)) {
      log(`${name}: price unchanged (on-chain: ${onChain}, new: ${price.priceUsdMicro}), skipping`);
      continue;
    }

    log(`${name}: updating price`, {
      onChain: onChain?.toString() || "unknown",
      new: price.priceUsdMicro.toString(),
      priceUsd: price.priceUsd,
    });

    const txId = await submitPriceUpdate(price.assetType, price.priceUsdMicro);
    if (txId) {
      log(`${name}: price update submitted`, { txId });
    }
  }

  log("Price update cycle complete");
}

async function main() {
  if (!DEPLOYER) {
    logError("DEPLOYER_ADDRESS env var is required");
    process.exit(1);
  }

  if (!DRY_RUN && !PRIVATE_KEY) {
    logError("DEPLOYER_PRIVATE_KEY env var is required (use --dry-run to skip)");
    process.exit(1);
  }

  log("Price oracle started", { network: NETWORK_NAME, dryRun: DRY_RUN, cron: CRON });

  await updateAllPrices();

  if (CRON) {
    log(`Running in cron mode, updating every ${CRON_INTERVAL_MS / 60000} minutes`);
    setInterval(async () => {
      resetNonce(); // refresh nonce from chain each cycle
      await updateAllPrices();
    }, CRON_INTERVAL_MS);
  }
}

main().catch((err) => {
  logError("Fatal error", { error: String(err) });
  process.exit(1);
});
