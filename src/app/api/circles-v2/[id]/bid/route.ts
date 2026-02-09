import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

const bidSchema = z.object({
  round: z.number().int().min(0),
  bidAmount: z.string().regex(/^\d+$/, "Bid must be a positive integer string"),
  txId: z.string().min(1).max(100).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const circle = await prisma.circleV2.findUnique({ where: { id } });
  if (!circle) {
    return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }

  // Get bids for current round
  const bids = await prisma.bidV2.findMany({
    where: { circleId: id, round: circle.currentRound },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { bidAmount: "asc" },
  });

  return NextResponse.json(
    bids.map((b) => ({
      userId: b.user.id,
      userName: b.user.name,
      round: b.round,
      bidAmount: b.bidAmount.toString(),
      txId: b.txId,
      bidAt: b.bidAt.toISOString(),
    })),
  );
}

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

  const parsed = bidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { round, bidAmount, txId } = parsed.data;

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

  // Verify membership and hasn't won yet
  const member = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Not a member of this circle" },
      { status: 403 },
    );
  }
  if (member.hasWon) {
    return NextResponse.json(
      { error: "You have already won a round" },
      { status: 400 },
    );
  }

  // Check for duplicate bid
  const existing = await prisma.bidV2.findUnique({
    where: {
      circleId_userId_round: { circleId: id, userId: user.id, round },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already bid for this round" },
      { status: 409 },
    );
  }

  const bid = await prisma.bidV2.create({
    data: {
      circleId: id,
      userId: user.id,
      round,
      bidAmount: BigInt(bidAmount),
      txId,
    },
  });

  return NextResponse.json(
    {
      id: bid.id,
      round: bid.round,
      bidAmount: bid.bidAmount.toString(),
      txId: bid.txId,
    },
    { status: 201 },
  );
}
