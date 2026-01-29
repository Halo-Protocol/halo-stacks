import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { syncAllActiveCircles } from "../../../../lib/sync";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || !authHeader || !safeCompare(authHeader, `Bearer ${adminKey}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllActiveCircles();

  return NextResponse.json({
    message: "Sync complete",
    synced: result.synced,
    failed: result.failed,
    timestamp: new Date().toISOString(),
  });
}
