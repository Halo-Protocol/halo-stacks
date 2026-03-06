import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { applyRateLimit, DEFAULT_RATE_LIMIT } from "../../../../../lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = await applyRateLimit(request, "circle-activity", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  // Verify circle exists and user is a member
  const membership = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this circle" }, { status: 403 });
  }

  // Fetch contributions, bids, settlements in parallel
  const [contributions, bids, settlements] = await Promise.all([
    prisma.contributionV2.findMany({
      where: { circleId: id },
      orderBy: { contributedAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    }),
    prisma.bidV2.findMany({
      where: { circleId: id },
      orderBy: { bidAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.roundResultV2.findMany({
      where: { circleId: id },
      orderBy: { settledAt: "desc" },
      take: 10,
      include: { winner: { select: { name: true } } },
    }),
  ]);

  // Merge into unified activity feed
  type Activity = { type: string; timestamp: string; data: Record<string, unknown> };
  const activities: Activity[] = [];

  for (const c of contributions) {
    activities.push({
      type: "contribution",
      timestamp: c.contributedAt.toISOString(),
      data: {
        userName: c.user.name,
        round: c.round,
        amount: c.amount.toString(),
        onTime: c.onTime,
      },
    });
  }

  for (const b of bids) {
    activities.push({
      type: "bid",
      timestamp: b.bidAt.toISOString(),
      data: {
        userName: b.user.name,
        round: b.round,
        bidAmount: b.bidAmount.toString(),
      },
    });
  }

  for (const s of settlements) {
    activities.push({
      type: "settlement",
      timestamp: s.settledAt.toISOString(),
      data: {
        winnerName: s.winner.name,
        round: s.round,
        winningBid: s.winningBid.toString(),
        poolTotal: s.poolTotal.toString(),
      },
    });
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ activities: activities.slice(0, 50) });
}
