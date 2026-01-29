import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { getCircleInfo } from "../../../../../lib/stacks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const circle = await prisma.circle.findUnique({
    where: { id },
  });

  if (!circle || !circle.onChainId) {
    return NextResponse.json(
      { error: "Circle not found or not deployed on-chain" },
      { status: 404 },
    );
  }

  const info = await getCircleInfo(circle.onChainId);
  if (!info) {
    return NextResponse.json(
      { error: "Circle not found on-chain" },
      { status: 404 },
    );
  }

  await prisma.circle.update({
    where: { id },
    data: {
      onChainRound: info.currentRound,
      onChainStatus: info.status,
      lastSyncedAt: new Date(),
    },
  });

  return NextResponse.json({
    currentRound: info.currentRound,
    status: info.status,
    startBlock: info.startBlock,
    totalContributed: info.totalContributed,
    totalPaidOut: info.totalPaidOut,
    roundDuration: info.roundDuration,
    gracePeriod: info.gracePeriod,
  });
}
