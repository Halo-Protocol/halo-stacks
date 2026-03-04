import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/middleware";
import { applyRateLimit, DEFAULT_RATE_LIMIT } from "../../../../lib/api-helpers";

export async function GET(request: NextRequest) {
  const rateLimited = applyRateLimit(request, "identity-me", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

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
