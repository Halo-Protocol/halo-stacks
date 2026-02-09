import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const COUNT_OFFSET = 1240;

export async function GET() {
  const count = await prisma.waitlist.count();
  return NextResponse.json({ count: count + COUNT_OFFSET });
}
