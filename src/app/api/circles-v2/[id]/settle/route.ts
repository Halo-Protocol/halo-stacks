import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

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

  // Check for duplicate settlement
  const existing = await prisma.roundResultV2.findUnique({
    where: { circleId_round: { circleId: id, round: data.round } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Round already settled" },
      { status: 409 },
    );
  }

  // Create round result and update member in a transaction
  const result = await prisma.$transaction(async (tx) => {
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
