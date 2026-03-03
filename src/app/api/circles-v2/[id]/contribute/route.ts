import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { applyRateLimit, verifyTransaction, STRICT_RATE_LIMIT } from "../../../../../lib/api-helpers";

const contributeSchema = z.object({
  round: z.number().int().min(0),
  amount: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
  txId: z.string().min(1).max(100),
  onTime: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = await applyRateLimit(request, "circle-v2-contribute", STRICT_RATE_LIMIT);
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

  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { round, amount, txId, onTime } = parsed.data;

  // Verify on-chain transaction
  const txError = await verifyTransaction(txId);
  if (txError) {
    return NextResponse.json({ error: txError }, { status: 400 });
  }

  // Verify circle exists and is active
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

  // Verify membership
  const member = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Not a member of this circle" },
      { status: 403 },
    );
  }

  // Atomic create — rely on unique constraint to prevent duplicates
  let contribution;
  try {
    contribution = await prisma.contributionV2.create({
      data: {
        circleId: id,
        userId: user.id,
        round,
        amount: BigInt(amount),
        onTime,
        txId,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Already contributed for this round" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(
    {
      id: contribution.id,
      round: contribution.round,
      amount: contribution.amount.toString(),
      txId: contribution.txId,
    },
    { status: 201 },
  );
}
