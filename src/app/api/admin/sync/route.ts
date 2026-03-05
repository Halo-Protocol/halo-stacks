import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/middleware";
import { syncAllActiveCircles } from "../../../../lib/sync";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const result = await syncAllActiveCircles();

  return NextResponse.json({
    message: "Sync complete",
    synced: result.synced,
    failed: result.failed,
    timestamp: new Date().toISOString(),
  });
}
