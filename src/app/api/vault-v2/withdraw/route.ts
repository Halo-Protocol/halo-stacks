import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";

const withdrawSchema = z.object({
  assetType: z.number().int().min(0).max(2),
  amount: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
  txId: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { assetType, amount, txId } = parsed.data;

  const withdrawal = await prisma.vaultDeposit.create({
    data: {
      userId: user.id,
      assetType,
      amount: BigInt(amount),
      txId,
      action: "withdraw",
    },
  });

  return NextResponse.json(
    {
      id: withdrawal.id,
      assetType: withdrawal.assetType,
      amount: withdrawal.amount.toString(),
      txId: withdrawal.txId,
      action: withdrawal.action,
    },
    { status: 201 },
  );
}
