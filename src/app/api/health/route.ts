import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  let dbStatus = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  return NextResponse.json(
    {
      status: "ok",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
