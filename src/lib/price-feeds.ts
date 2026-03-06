/**
 * Price feed module — fetches asset prices from CoinGecko.
 * Used by the price oracle automation script to update vault-v3 on-chain prices.
 */
import { logger } from "./logger";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

// CoinGecko IDs for our vault assets
const ASSET_COINGECKO_IDS: Record<number, string> = {
  0: "usd-coin", // USDCx — pegged to USDC
  1: "bitcoin",  // sBTC — pegged to BTC
  2: "blockstack", // STX
  3: "usd-coin", // hUSD — stablecoin pegged to USD
};

export interface PriceData {
  assetType: number;
  priceUsd: number; // e.g. 1.0 for $1.00
  priceUsdMicro: bigint; // micro-USD (6 decimals), e.g. 1000000n for $1.00
  source: string;
  fetchedAt: Date;
}

/**
 * Fetch current USD prices for all vault assets from CoinGecko.
 */
export async function fetchAllPrices(): Promise<PriceData[]> {
  const ids = [...new Set(Object.values(ASSET_COINGECKO_IDS))].join(",");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: controller.signal },
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API returned ${res.status}`);
    }

    const data = await res.json() as Record<string, { usd: number }>;
    const prices: PriceData[] = [];

    for (const [assetType, coinId] of Object.entries(ASSET_COINGECKO_IDS)) {
      const price = data[coinId]?.usd;
      if (price === undefined || price <= 0) {
        logger.warn({ assetType, coinId }, "No price data from CoinGecko");
        continue;
      }

      prices.push({
        assetType: Number(assetType),
        priceUsd: price,
        priceUsdMicro: BigInt(Math.round(price * 1_000_000)),
        source: "coingecko",
        fetchedAt: new Date(),
      });
    }

    return prices;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch price for a single asset.
 */
export async function fetchPrice(assetType: number): Promise<PriceData | null> {
  const coinId = ASSET_COINGECKO_IDS[assetType];
  if (!coinId) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`,
      { signal: controller.signal },
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API returned ${res.status}`);
    }

    const data = await res.json() as Record<string, { usd: number }>;
    const price = data[coinId]?.usd;
    if (!price || price <= 0) return null;

    return {
      assetType,
      priceUsd: price,
      priceUsdMicro: BigInt(Math.round(price * 1_000_000)),
      source: "coingecko",
      fetchedAt: new Date(),
    };
  } finally {
    clearTimeout(timeout);
  }
}
