import { NextRequest, NextResponse } from "next/server";
import { requireWallet } from "../../../lib/middleware";
import { prisma } from "../../../lib/db";
import { applyRateLimit, DEFAULT_RATE_LIMIT } from "../../../lib/api-helpers";
import { getAllAssetYieldInfo, checkVaultPaused } from "../../../lib/yield-rates";
import { VAULT_V3_ASSET_TYPES } from "../../../lib/contracts";

const ASSET_NAMES: Record<number, string> = {
  [VAULT_V3_ASSET_TYPES.USDCX]: "USDCx",
  [VAULT_V3_ASSET_TYPES.SBTC]: "sBTC",
  [VAULT_V3_ASSET_TYPES.STX]: "STX",
  [VAULT_V3_ASSET_TYPES.HUSD]: "hUSD",
};

export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "vault-v3-get", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  // Fetch on-chain yield info, pause status, and DB deposits in parallel
  const [yieldInfo, paused, deposits, memberships] = await Promise.all([
    getAllAssetYieldInfo().catch(() => []),
    checkVaultPaused().catch(() => false),
    prisma.vaultDeposit.findMany({
      where: { userId: user.id, vaultVersion: 3 },
      orderBy: { createdAt: "desc" },
    }),
    prisma.circleMemberV2.findMany({
      where: { userId: user.id, status: { in: ["confirmed", "pending_join"] } },
      include: {
        circle: {
          select: { id: true, name: true, contributionAmount: true, status: true },
        },
      },
    }),
  ]);

  // Calculate net balances per asset type from DB records
  const balances: Record<number, bigint> = {};
  for (const d of deposits) {
    if (!balances[d.assetType]) balances[d.assetType] = 0n;
    if (d.action === "deposit") {
      balances[d.assetType] += d.amount;
    } else if (d.action === "withdraw") {
      balances[d.assetType] -= d.amount;
    }
  }

  // Build asset info combining DB balances with on-chain yield data
  const yieldMap = new Map(yieldInfo.map((y) => [y.assetType, y]));
  const assets = [0, 1, 2, 3].map((assetType) => {
    const deposited = balances[assetType] || 0n;
    const yield_ = yieldMap.get(assetType);
    return {
      assetType,
      name: ASSET_NAMES[assetType] || `Asset ${assetType}`,
      deposited: deposited.toString(),
      apy: yield_?.apy ?? 0,
      strategyName: yield_?.strategyName ?? "",
      isActive: yield_?.isActive ?? false,
      priceUsd: yield_?.priceUsd ?? 0,
      ltvPercent: yield_ ? Math.round(yield_.ltvRatio * 100) : 0,
      totalDeposited: yield_?.totalDeposited?.toString() ?? "0",
      decimals: yield_?.decimals ?? 6,
    };
  });

  const recentTransactions = deposits.slice(0, 20).map((d) => ({
    id: d.id,
    assetType: d.assetType,
    amount: d.amount.toString(),
    action: d.action,
    txId: d.txId,
    createdAt: d.createdAt.toISOString(),
  }));

  const commitments = memberships.map((m) => ({
    circleId: m.circle.id,
    circleName: m.circle.name,
    contributionAmount: m.circle.contributionAmount.toString(),
    status: m.circle.status,
  }));

  return NextResponse.json({
    paused,
    assets,
    commitments,
    recentTransactions,
  });
}
