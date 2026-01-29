import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/middleware";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    uniqueId: user.uniqueId,
    walletAddress: user.walletAddress,
    status: user.status,
  });
}
