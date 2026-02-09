import { NextResponse } from "next/server";
import { requireWallet } from "../../../lib/middleware";
import { prisma } from "../../../lib/db";

export async function GET() {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  // Get all vault deposits/withdrawals for this user
  const deposits = await prisma.vaultDeposit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Calculate net balances per asset type
  const balances: Record<number, bigint> = {};
  for (const d of deposits) {
    if (!balances[d.assetType]) balances[d.assetType] = 0n;
    if (d.action === "deposit") {
      balances[d.assetType] += d.amount;
    } else if (d.action === "withdraw") {
      balances[d.assetType] -= d.amount;
    }
  }

  // Get circle commitments
  const memberShips = await prisma.circleMemberV2.findMany({
    where: { userId: user.id, status: { in: ["confirmed", "pending_join"] } },
    include: {
      circle: {
        select: {
          id: true,
          name: true,
          contributionAmount: true,
          status: true,
        },
      },
    },
  });

  // Asset config: type -> { name, ltv }
  const assetConfig: Record<number, { name: string; ltv: number }> = {
    0: { name: "hUSD", ltv: 80 },
    1: { name: "STX", ltv: 50 },
    2: { name: "sBTC", ltv: 50 },
  };

  const assets = Object.entries(assetConfig).map(([typeStr, config]) => {
    const assetType = parseInt(typeStr);
    const deposited = balances[assetType] || 0n;
    return {
      assetType,
      name: config.name,
      deposited: deposited.toString(),
      ltvPercent: config.ltv,
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

  const commitments = memberShips.map((m) => ({
    circleId: m.circle.id,
    circleName: m.circle.name,
    contributionAmount: m.circle.contributionAmount.toString(),
    status: m.circle.status,
  }));

  return NextResponse.json({
    assets,
    commitments,
    recentTransactions,
  });
}
