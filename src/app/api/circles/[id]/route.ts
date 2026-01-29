import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const circle = await prisma.circle.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, walletAddress: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, walletAddress: true } },
        },
        orderBy: { payoutPosition: "asc" },
      },
      contributions: {
        orderBy: { contributedAt: "desc" },
      },
      payouts: {
        orderBy: { round: "asc" },
      },
    },
  });

  if (!circle) {
    return NextResponse.json(
      { error: "Circle not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: circle.id,
    onChainId: circle.onChainId,
    name: circle.name,
    contributionAmount: circle.contributionAmount.toString(),
    totalMembers: circle.totalMembers,
    tokenType: circle.tokenType,
    tokenContract: circle.tokenContract,
    inviteCode: circle.inviteCode,
    status: circle.status,
    createdAt: circle.createdAt.toISOString(),
    startedAt: circle.startedAt?.toISOString() ?? null,
    completedAt: circle.completedAt?.toISOString() ?? null,
    creator: circle.creator,
    members: circle.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      walletAddress: m.user.walletAddress,
      payoutPosition: m.payoutPosition,
      status: m.status,
      joinedAt: m.joinedAt?.toISOString() ?? null,
    })),
    contributions: circle.contributions.map((c) => ({
      userId: c.userId,
      round: c.round,
      amount: c.amount.toString(),
      onTime: c.onTime,
      txId: c.txId,
      contributedAt: c.contributedAt.toISOString(),
    })),
    payouts: circle.payouts.map((p) => ({
      recipientId: p.recipientId,
      round: p.round,
      amount: p.amount.toString(),
      txId: p.txId,
      paidAt: p.paidAt.toISOString(),
    })),
  });
}
