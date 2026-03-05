import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/middleware";
import { getAllAssetYieldInfo, checkVaultPaused } from "../../../../lib/yield-rates";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const [yieldInfo, paused, deposits] = await Promise.all([
    getAllAssetYieldInfo().catch(() => []),
    checkVaultPaused().catch(() => false),
    prisma.vaultDeposit.groupBy({
      by: ["assetType", "action"],
      where: { vaultVersion: 3 },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Calculate net TVL per asset
  const tvl: Record<number, { deposited: bigint; withdrawn: bigint; net: bigint; txCount: number }> = {};
  for (const d of deposits) {
    if (!tvl[d.assetType]) {
      tvl[d.assetType] = { deposited: 0n, withdrawn: 0n, net: 0n, txCount: 0 };
    }
    const amount = d._sum.amount ?? 0n;
    tvl[d.assetType].txCount += d._count;
    if (d.action === "deposit") {
      tvl[d.assetType].deposited += amount;
    } else if (d.action === "withdraw") {
      tvl[d.assetType].withdrawn += amount;
    }
  }
  for (const t of Object.values(tvl)) {
    t.net = t.deposited - t.withdrawn;
  }

  const ASSET_NAMES: Record<number, string> = { 0: "USDCx", 1: "sBTC", 2: "STX", 3: "hUSD" };

  const assets = [0, 1, 2, 3].map((assetType) => {
    const t = tvl[assetType];
    const y = yieldInfo.find((yi) => yi.assetType === assetType);
    return {
      assetType,
      name: ASSET_NAMES[assetType] || `Asset ${assetType}`,
      tvl: t?.net?.toString() ?? "0",
      totalDeposited: t?.deposited?.toString() ?? "0",
      totalWithdrawn: t?.withdrawn?.toString() ?? "0",
      txCount: t?.txCount ?? 0,
      apy: y?.apy ?? 0,
      isActive: y?.isActive ?? false,
      priceUsd: y?.priceUsd ?? 0,
      ltvPercent: y ? Math.round(y.ltvRatio * 100) : 0,
      rewardEndBlock: y?.rewardEndBlock ?? 0,
    };
  });

  return NextResponse.json({
    paused,
    assets,
    // Serialize bigints in TVL
    totalTvlByAsset: Object.fromEntries(
      Object.entries(tvl).map(([k, v]) => [k, { ...v, deposited: v.deposited.toString(), withdrawn: v.withdrawn.toString(), net: v.net.toString() }]),
    ),
  });
}
