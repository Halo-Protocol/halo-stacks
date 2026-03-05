/**
 * Dynamic APY calculation from on-chain vault-v3 data.
 * Reads reward-rate and total-deposited per asset to compute real APY.
 */
import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from "@stacks/transactions";
import { networkFromName } from "@stacks/network";

const DEPLOYER = process.env.DEPLOYER_ADDRESS || process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "";
const NETWORK_NAME = (process.env.STACKS_NETWORK || process.env.NEXT_PUBLIC_STACKS_NETWORK || "mainnet") as "mainnet" | "testnet";

// ~52,560 Stacks blocks per year (1 block per 10 min)
const BLOCKS_PER_YEAR = 52560;
// Yield precision from contract (10^12)
const PRECISION = 1_000_000_000_000;

interface AssetYieldInfo {
  assetType: number;
  strategyName: string;
  rewardRate: bigint;
  totalDeposited: bigint;
  rewardEndBlock: number;
  apy: number; // percentage, e.g. 5.2
  isActive: boolean;
  priceUsd: number;
  ltvRatio: number;
  decimals: number;
}

// Cache with 5-min TTL
let cache: { data: AssetYieldInfo[]; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function callReadOnly(functionName: string, functionArgs: any[]) {
  const network = networkFromName(NETWORK_NAME);
  return fetchCallReadOnlyFunction({
    network,
    contractAddress: DEPLOYER,
    contractName: "halo-vault-v3",
    functionName,
    functionArgs,
    senderAddress: DEPLOYER,
  });
}

function extractValue(json: any): any {
  if (json && typeof json === "object") {
    if ("value" in json) return json.value;
  }
  return json;
}

function extractOptionalString(json: any): string {
  if (json?.type === "string" || json?.type === "(string-ascii 64)") return json.value || "";
  if (json?.value?.value) return json.value.value;
  if (typeof json?.value === "string") return json.value;
  return "";
}

export async function getAssetYieldInfo(assetType: number): Promise<AssetYieldInfo | null> {
  try {
    const result = await callReadOnly("get-asset-config", [uintCV(assetType)]);
    const json = cvToJSON(result);

    if (!json || json.type === "none" || json.value === null) return null;

    const asset = json.value || json;
    const rewardRate = BigInt(extractValue(asset["reward-rate"]) || "0");
    const totalDeposited = BigInt(extractValue(asset["total-deposited"]) || "0");
    const rewardEndBlock = Number(extractValue(asset["reward-end-block"]) || "0");
    const priceUsd = Number(extractValue(asset["price-usd"]) || "0") / 1_000_000;
    const ltvRatio = Number(extractValue(asset["ltv-ratio"]) || "0") / 10000;
    const decimals = Number(extractValue(asset["decimals"]) || "6");
    const isActive = asset["is-active"]?.value === true || asset["is-active"] === true;
    const strategyName = extractOptionalString(asset["strategy-name"]);

    // APY = (rewardRate * BLOCKS_PER_YEAR * 100) / totalDeposited
    // Since rewardRate is in token units per block distributed across totalDeposited
    let apy = 0;
    if (totalDeposited > 0n && rewardRate > 0n) {
      apy = Number(rewardRate * BigInt(BLOCKS_PER_YEAR) * 100n) / Number(totalDeposited);
    }

    return {
      assetType,
      strategyName,
      rewardRate,
      totalDeposited,
      rewardEndBlock,
      apy: Math.round(apy * 100) / 100, // 2 decimal places
      isActive,
      priceUsd,
      ltvRatio,
      decimals,
    };
  } catch {
    return null;
  }
}

export async function getAllAssetYieldInfo(): Promise<AssetYieldInfo[]> {
  // Check cache
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const assets: AssetYieldInfo[] = [];
  // Query all 4 configured asset types
  const results = await Promise.allSettled([
    getAssetYieldInfo(0), // USDCx
    getAssetYieldInfo(1), // sBTC
    getAssetYieldInfo(2), // STX
    getAssetYieldInfo(3), // hUSD
  ]);

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      assets.push(result.value);
    }
  }

  cache = { data: assets, expiresAt: Date.now() + CACHE_TTL };
  return assets;
}

export function clearYieldCache() {
  cache = null;
}

/**
 * Check if the vault is currently paused on-chain.
 */
export async function checkVaultPaused(): Promise<boolean> {
  try {
    const result = await callReadOnly("is-paused", []);
    const json = cvToJSON(result);
    return extractValue(json) === true;
  } catch {
    return false;
  }
}
