import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const contributions = await prisma.contribution.findMany({
    where: { userId: user.id },
    include: {
      circle: { select: { name: true, onChainId: true } },
    },
    orderBy: { contributedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    contributions.map((c) => ({
      circleName: c.circle.name,
      circleOnChainId: c.circle.onChainId,
      round: c.round,
      amount: c.amount.toString(),
      onTime: c.onTime,
      txId: c.txId,
      contributedAt: c.contributedAt.toISOString(),
    })),
  );
}
