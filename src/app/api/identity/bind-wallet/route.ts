import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/middleware";
import { prisma } from "../../../../lib/db";
import { isValidStacksAddress } from "../../../../lib/identity";

const bindWalletSchema = z.object({
  walletAddress: z.string().refine(isValidStacksAddress, {
    message: "Invalid Stacks wallet address",
  }),
});

export async function POST(request: NextRequest) {
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

  const parsed = bindWalletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { walletAddress } = parsed.data;

  // Check if wallet already bound to another user
  const existingWallet = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (existingWallet) {
    return NextResponse.json(
      { error: "This wallet is already linked to another account" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    uniqueId: user.uniqueId,
    walletAddress,
    message:
      "Use these values to call halo-identity.bind-wallet on-chain, then confirm with /api/identity/confirm-binding",
  });
}
