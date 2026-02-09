import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

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

  // Check for duplicate
  const existing = await prisma.contributionV2.findUnique({
    where: { circleId_userId_round: { circleId: id, userId: user.id, round } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already contributed for this round" },
      { status: 409 },
    );
  }

  const contribution = await prisma.contributionV2.create({
    data: {
      circleId: id,
      userId: user.id,
      round,
      amount: BigInt(amount),
      onTime,
      txId,
    },
  });

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
