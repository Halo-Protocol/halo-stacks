import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { applyRateLimit, DEFAULT_RATE_LIMIT, STRICT_RATE_LIMIT } from "../../../../../lib/api-helpers";

const bidSchema = z.object({
  round: z.number().int().min(0),
  bidAmount: z.string().regex(/^\d+$/, "Bid must be a positive integer string"),
  txId: z.string().min(1).max(100).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = applyRateLimit(request, "circle-v2-bid-get", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

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
  const rateLimited = applyRateLimit(request, "circle-v2-bid", STRICT_RATE_LIMIT);
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

  // Validate round matches current round
  if (round !== circle.currentRound) {
    return NextResponse.json(
      { error: `Invalid round. Current round is ${circle.currentRound}` },
      { status: 400 },
    );
  }

  // Validate bid amount: must be > 0 and <= pool total
  const poolTotal = circle.contributionAmount * BigInt(circle.totalMembers);
  const bidAmountBig = BigInt(bidAmount);
  if (bidAmountBig <= BigInt(0)) {
    return NextResponse.json(
      { error: "Bid amount must be greater than zero" },
      { status: 400 },
    );
  }
  if (bidAmountBig > poolTotal) {
    return NextResponse.json(
      { error: "Bid amount cannot exceed the pool total" },
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

  // Atomic create — rely on unique constraint to prevent duplicate bids
  let bid;
  try {
    bid = await prisma.bidV2.create({
      data: {
        circleId: id,
        userId: user.id,
        round,
        bidAmount: bidAmountBig,
        txId,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Already bid for this round" },
        { status: 409 },
      );
    }
    throw err;
  }

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
