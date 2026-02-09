import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

const repaySchema = z.object({
  repaymentRound: z.number().int().min(0),
  amountPaid: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
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

  const parsed = repaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { repaymentRound, amountPaid, txId, onTime } = parsed.data;

  // Verify membership and is a winner
  const member = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Not a member of this circle" },
      { status: 403 },
    );
  }
  if (!member.hasWon) {
    return NextResponse.json(
      { error: "No repayment due - you haven't won yet" },
      { status: 400 },
    );
  }

  // Upsert repayment record
  const repayment = await prisma.$transaction(async (tx) => {
    const rep = await tx.repaymentV2.upsert({
      where: {
        circleId_userId_repaymentRound: {
          circleId: id,
          userId: user.id,
          repaymentRound,
        },
      },
      update: {
        amountPaid: BigInt(amountPaid),
        txId,
        onTime,
        paidAt: new Date(),
      },
      create: {
        circleId: id,
        userId: user.id,
        repaymentRound,
        amountDue: BigInt(amountPaid),
        amountPaid: BigInt(amountPaid),
        txId,
        onTime,
        paidAt: new Date(),
      },
    });

    // Update member total repaid
    await tx.circleMemberV2.update({
      where: { circleId_userId: { circleId: id, userId: user.id } },
      data: {
        totalRepaid: { increment: BigInt(amountPaid) },
      },
    });

    return rep;
  });

  return NextResponse.json(
    {
      id: repayment.id,
      repaymentRound: repayment.repaymentRound,
      amountPaid: repayment.amountPaid.toString(),
      txId: repayment.txId,
    },
    { status: 201 },
  );
}
