import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";
import { getTransactionStatus, getIdByWallet } from "../../../../lib/stacks";
import { isValidTxId } from "../../../../lib/sanitize";
import { applyRateLimit, STRICT_RATE_LIMIT } from "../../../../lib/api-helpers";

const confirmBindingSchema = z.object({
  txId: z.string().min(1, "Transaction ID is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
});

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(request, "confirm-binding", STRICT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (user.status !== "pending_wallet") {
    return NextResponse.json(
      { error: "Wallet already bound" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = confirmBindingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { txId, walletAddress } = parsed.data;

  if (!isValidTxId(txId)) {
    return NextResponse.json(
      { error: "Invalid transaction ID format" },
      { status: 400 },
    );
  }

  // Verify transaction on chain
  const txStatus = await getTransactionStatus(txId);

  if (txStatus === "failed") {
    return NextResponse.json(
      { error: "Binding transaction failed on-chain" },
      { status: 400 },
    );
  }

  if (txStatus === "pending") {
    return NextResponse.json(
      {
        error: "Transaction still pending. Try again after confirmation.",
        status: "pending",
      },
      { status: 202 },
    );
  }

  // Verify the binding actually happened on-chain
  try {
    const onChainId = await getIdByWallet(walletAddress);
    if (onChainId && onChainId.toLowerCase() !== user.uniqueId.toLowerCase()) {
      return NextResponse.json(
        { error: "Wallet is bound to a different identity on-chain" },
        { status: 409 },
      );
    }
  } catch {
    // On-chain check failed — allow through since tx was confirmed
  }

  // Transaction confirmed — update user record
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      walletAddress,
      bindingTxId: txId,
      status: "active",
      walletBoundAt: new Date(),
    },
  });

  // Create initial credit score record
  await prisma.creditScore.create({
    data: {
      userId: user.id,
      uniqueId: user.uniqueId,
      score: 300,
    },
  });

  return NextResponse.json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    uniqueId: updatedUser.uniqueId,
    walletAddress: updatedUser.walletAddress,
    status: updatedUser.status,
    walletBoundAt: updatedUser.walletBoundAt,
  });
}
