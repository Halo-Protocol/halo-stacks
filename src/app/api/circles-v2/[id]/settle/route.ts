import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { applyRateLimit, verifyTransaction, STRICT_RATE_LIMIT } from "../../../../../lib/api-helpers";

const settleSchema = z.object({
  round: z.number().int().min(0),
  winnerId: z.string().uuid(),
  winningBid: z.string().regex(/^\d+$/),
  poolTotal: z.string().regex(/^\d+$/),
  protocolFee: z.string().regex(/^\d+$/),
  surplus: z.string().regex(/^\d+$/),
  dividendPerMember: z.string().regex(/^\d+$/),
  settleTxId: z.string().min(1).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = applyRateLimit(request, "circle-v2-settle", STRICT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = settleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const circle = await prisma.circleV2.findUnique({ where: { id } });
  if (!circle) {
    return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }
  if (circle.status !== "active") {
    return NextResponse.json(
      { error: "Circle is not active" },
      { status: 400 },
    );
  }

  // Only the circle creator can settle rounds
  if (circle.creatorId !== user.id) {
    return NextResponse.json(
      { error: "Only the circle creator can settle rounds" },
      { status: 403 },
    );
  }

  // Validate round matches current round
  if (data.round !== circle.currentRound) {
    return NextResponse.json(
      { error: `Invalid round. Current round is ${circle.currentRound}` },
      { status: 400 },
    );
  }

  // Validate pool total matches expected value
  const expectedPool = circle.contributionAmount * BigInt(circle.totalMembers);
  if (BigInt(data.poolTotal) !== expectedPool) {
    return NextResponse.json(
      { error: "Pool total does not match expected value" },
      { status: 400 },
    );
  }

  // Validate winning bid doesn't exceed pool total
  if (BigInt(data.winningBid) > expectedPool || BigInt(data.winningBid) <= BigInt(0)) {
    return NextResponse.json(
      { error: "Invalid winning bid amount" },
      { status: 400 },
    );
  }

  // Verify winner is a member who hasn't already won
  const winner = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: data.winnerId } },
  });
  if (!winner) {
    return NextResponse.json(
      { error: "Winner is not a member of this circle" },
      { status: 400 },
    );
  }
  if (winner.hasWon) {
    return NextResponse.json(
      { error: "Winner has already won a previous round" },
      { status: 400 },
    );
  }

  // Verify on-chain transaction if provided
  if (data.settleTxId) {
    const txError = await verifyTransaction(data.settleTxId);
    if (txError) {
      return NextResponse.json({ error: txError }, { status: 400 });
    }
  }

  // Create round result and update member in a transaction
  // Use try/catch to handle race condition on duplicate settlement
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const roundResult = await tx.roundResultV2.create({
        data: {
          circleId: id,
          round: data.round,
          winnerId: data.winnerId,
          winningBid: BigInt(data.winningBid),
          poolTotal: BigInt(data.poolTotal),
          protocolFee: BigInt(data.protocolFee),
          surplus: BigInt(data.surplus),
          dividendPerMember: BigInt(data.dividendPerMember),
          settleTxId: data.settleTxId,
        },
      });

      // Mark winner
      await tx.circleMemberV2.update({
        where: { circleId_userId: { circleId: id, userId: data.winnerId } },
        data: {
          hasWon: true,
          wonRound: data.round,
          wonAmount: BigInt(data.winningBid),
        },
      });

      // Advance round
      const nextRound = data.round + 1;
      const isComplete = nextRound >= circle.totalMembers;

      await tx.circleV2.update({
        where: { id },
        data: {
          currentRound: nextRound,
          status: isComplete ? "completed" : "active",
          completedAt: isComplete ? new Date() : undefined,
        },
      });

      return roundResult;
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Round already settled" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(
    {
      id: result.id,
      round: result.round,
      winnerId: result.winnerId,
      winningBid: result.winningBid.toString(),
      poolTotal: result.poolTotal.toString(),
    },
    { status: 201 },
  );
}
