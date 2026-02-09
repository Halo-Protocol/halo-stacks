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

  const circle = await prisma.circleV2.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, walletAddress: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, walletAddress: true } },
        },
      },
      contributions: {
        orderBy: { contributedAt: "desc" },
      },
      bids: {
        orderBy: { bidAt: "desc" },
      },
      roundResults: {
        include: {
          winner: { select: { id: true, name: true } },
        },
        orderBy: { round: "asc" },
      },
      repayments: {
        orderBy: { repaymentRound: "asc" },
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
    currentRound: circle.currentRound,
    roundDuration: circle.roundDuration,
    bidWindowBlocks: circle.bidWindowBlocks,
    gracePeriod: circle.gracePeriod,
    tokenType: circle.tokenType,
    tokenContract: circle.tokenContract,
    inviteCode: circle.inviteCode,
    status: circle.status,
    createdAt: circle.createdAt.toISOString(),
    startedAt: circle.startedAt?.toISOString() ?? null,
    completedAt: circle.completedAt?.toISOString() ?? null,
    onChainRound: circle.onChainRound,
    onChainStatus: circle.onChainStatus,
    creator: circle.creator,
    members: circle.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      walletAddress: m.user.walletAddress,
      status: m.status,
      hasWon: m.hasWon,
      wonRound: m.wonRound,
      wonAmount: m.wonAmount?.toString() ?? null,
      totalRepaid: m.totalRepaid.toString(),
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
    bids: circle.bids.map((b) => ({
      userId: b.userId,
      round: b.round,
      bidAmount: b.bidAmount.toString(),
      txId: b.txId,
      bidAt: b.bidAt.toISOString(),
    })),
    roundResults: circle.roundResults.map((r) => ({
      round: r.round,
      winnerId: r.winnerId,
      winnerName: r.winner.name,
      winningBid: r.winningBid.toString(),
      poolTotal: r.poolTotal.toString(),
      protocolFee: r.protocolFee.toString(),
      surplus: r.surplus.toString(),
      dividendPerMember: r.dividendPerMember.toString(),
      settleTxId: r.settleTxId,
      settledAt: r.settledAt.toISOString(),
    })),
    repayments: circle.repayments.map((r) => ({
      userId: r.userId,
      repaymentRound: r.repaymentRound,
      amountDue: r.amountDue.toString(),
      amountPaid: r.amountPaid.toString(),
      onTime: r.onTime,
      txId: r.txId,
      paidAt: r.paidAt?.toISOString() ?? null,
    })),
  });
}
