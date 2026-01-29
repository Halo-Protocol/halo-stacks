import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const circle = await prisma.circle.findUnique({
    where: { inviteCode: code },
    include: {
      creator: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  if (!circle) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 },
    );
  }

  // Public preview — no sensitive data
  return NextResponse.json({
    id: circle.id,
    name: circle.name,
    contributionAmount: circle.contributionAmount.toString(),
    totalMembers: circle.totalMembers,
    currentMembers: circle._count.members,
    tokenType: circle.tokenType,
    status: circle.status,
    creatorName: circle.creator.name,
    createdAt: circle.createdAt.toISOString(),
  });
}
