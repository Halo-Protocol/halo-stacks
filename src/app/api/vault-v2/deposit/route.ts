import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";

const depositSchema = z.object({
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

  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { assetType, amount, txId } = parsed.data;

  const deposit = await prisma.vaultDeposit.create({
    data: {
      userId: user.id,
      assetType,
      amount: BigInt(amount),
      txId,
      action: "deposit",
    },
  });

  return NextResponse.json(
    {
      id: deposit.id,
      assetType: deposit.assetType,
      amount: deposit.amount.toString(),
      txId: deposit.txId,
      action: deposit.action,
    },
    { status: 201 },
  );
}
