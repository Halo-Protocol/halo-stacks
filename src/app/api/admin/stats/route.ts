import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const [
    userCount,
    walletsCount,
    circleStats,
    creditScores,
    depositCount,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { walletAddress: { not: null } } }),
    prisma.circleV2.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.creditScore.aggregate({
      _avg: { score: true },
      _min: { score: true },
      _max: { score: true },
    }),
    prisma.vaultDeposit.count({ where: { vaultVersion: 3 } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        walletAddress: true,
        createdAt: true,
      },
    }),
  ]);

  const circles = Object.fromEntries(
    circleStats.map((c) => [c.status, c._count]),
  );

  return NextResponse.json({
    users: {
      total: userCount,
      withWallet: walletsCount,
      creditScore: {
        avg: creditScores._avg.score ?? 0,
        min: creditScores._min.score ?? 0,
        max: creditScores._max.score ?? 0,
      },
    },
    circles,
    vaultDeposits: depositCount,
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      hasWallet: !!u.walletAddress,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
