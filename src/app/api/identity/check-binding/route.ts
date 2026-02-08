import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";
import { isWalletBoundOnChain, getIdByWallet } from "../../../../lib/stacks";
import { isValidStacksAddress } from "../../../../lib/identity";

const checkBindingSchema = z.object({
  walletAddress: z.string().refine(isValidStacksAddress, {
    message: "Invalid Stacks wallet address",
  }),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  // Already active — nothing to do
  if (user.status === "active") {
    return NextResponse.json({ status: "already_active" });
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

  const parsed = checkBindingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { walletAddress } = parsed.data;

  try {
    // Check on-chain if the wallet is already bound
    const isBound = await isWalletBoundOnChain(walletAddress);

    if (!isBound) {
      return NextResponse.json({ status: "not_bound" });
    }

    // Wallet is bound on-chain — check if it's bound to THIS user's unique-id
    const onChainId = await getIdByWallet(walletAddress);
    const userIdNormalized = user.uniqueId.startsWith("0x")
      ? user.uniqueId.toLowerCase()
      : `0x${user.uniqueId.toLowerCase()}`;
    const onChainIdNormalized = onChainId?.toLowerCase() || "";

    if (onChainIdNormalized !== userIdNormalized) {
      return NextResponse.json(
        {
          status: "bound_to_other",
          error: "This wallet is bound to a different identity on-chain",
        },
        { status: 409 },
      );
    }

    // Wallet is bound on-chain to THIS user — recover by updating DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        walletAddress,
        status: "active",
        walletBoundAt: new Date(),
      },
    });

    // Create initial credit score if it doesn't exist
    const existingScore = await prisma.creditScore.findFirst({
      where: { userId: user.id },
    });
    if (!existingScore) {
      await prisma.creditScore.create({
        data: {
          userId: user.id,
          uniqueId: user.uniqueId,
          score: 300,
        },
      });
    }

    return NextResponse.json({ status: "recovered" });
  } catch (err) {
    console.error("[check-binding] On-chain check failed:", err);
    return NextResponse.json(
      { error: "Failed to check on-chain binding status" },
      { status: 500 },
    );
  }
}
