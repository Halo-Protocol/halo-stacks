import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { isValidTxId } from "../../../../../lib/sanitize";

const contributeSchema = z.object({
  txId: z.string().min(1, "Transaction ID is required"),
  round: z.number().int().min(0),
  amount: z.number().int().positive(),
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

  const data = parsed.data;

  if (!isValidTxId(data.txId)) {
    return NextResponse.json(
      { error: "Invalid transaction ID format" },
      { status: 400 },
    );
  }

  // Verify circle exists and user is a member
  const circle = await prisma.circle.findUnique({
    where: { id },
  });

  if (!circle) {
    return NextResponse.json(
      { error: "Circle not found" },
      { status: 404 },
    );
  }

  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: id,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this circle" },
      { status: 403 },
    );
  }

  // Check for duplicate contribution
  const existing = await prisma.contribution.findUnique({
    where: {
      circleId_userId_round: {
        circleId: id,
        userId: user.id,
        round: data.round,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already contributed for this round" },
      { status: 409 },
    );
  }

  const contribution = await prisma.contribution.create({
    data: {
      circleId: id,
      userId: user.id,
      round: data.round,
      amount: BigInt(data.amount),
      onTime: data.onTime,
      txId: data.txId,
    },
  });

  return NextResponse.json(
    {
      id: contribution.id,
      circleId: id,
      round: data.round,
      amount: contribution.amount.toString(),
      onTime: contribution.onTime,
      txId: data.txId,
    },
    { status: 201 },
  );
}
