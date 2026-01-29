import { NextResponse } from "next/server";
import { requireWallet } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";
import { getCreditScoreByWallet } from "../../../../lib/stacks";

export async function GET() {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  // Try cached score first
  let creditScore = await prisma.creditScore.findUnique({
    where: { userId: user.id },
  });

  // If no cached score or stale, try fetching from chain
  if (!creditScore || !creditScore.lastSyncedBlock) {
    try {
      const chainScore = await getCreditScoreByWallet(user.walletAddress);

      if (creditScore) {
        creditScore = await prisma.creditScore.update({
          where: { userId: user.id },
          data: {
            score: chainScore,
            lastSyncedBlock: Date.now(), // Using timestamp as proxy
          },
        });
      } else {
        creditScore = await prisma.creditScore.create({
          data: {
            userId: user.id,
            uniqueId: user.uniqueId,
            score: chainScore,
            lastSyncedBlock: Date.now(),
          },
        });
      }
    } catch {
      // If chain query fails, return cached or default
      if (!creditScore) {
        return NextResponse.json({
          score: 300,
          totalPayments: 0,
          onTimePayments: 0,
          latePayments: 0,
          circlesCompleted: 0,
          circlesDefaulted: 0,
          totalVolume: "0",
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({
    score: creditScore!.score,
    totalPayments: creditScore!.totalPayments,
    onTimePayments: creditScore!.onTimePayments,
    latePayments: creditScore!.latePayments,
    circlesCompleted: creditScore!.circlesCompleted,
    circlesDefaulted: creditScore!.circlesDefaulted,
    totalVolume: creditScore!.totalVolume.toString(),
    lastUpdated: creditScore!.updatedAt.toISOString(),
  });
}
