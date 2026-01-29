import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./db";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  uniqueId: string;
  walletAddress: string | null;
  status: string;
}

/**
 * Require authentication. Returns the user or a 401 response.
 */
export async function requireAuth(): Promise<
  AuthenticatedUser | NextResponse
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    uniqueId: user.uniqueId,
    walletAddress: user.walletAddress,
    status: user.status,
  };
}

/**
 * Require authentication + wallet bound. Returns the user or an error response.
 */
export async function requireWallet(): Promise<
  (AuthenticatedUser & { walletAddress: string }) | NextResponse
> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!result.walletAddress) {
    return NextResponse.json(
      { error: "Wallet not bound. Complete wallet binding first." },
      { status: 403 },
    );
  }

  return result as AuthenticatedUser & { walletAddress: string };
}
