import { NextRequest, NextResponse } from "next/server";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const circle = await prisma.circle.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true } },
    },
  });

  if (!circle) {
    return NextResponse.json(
      { error: "Circle not found" },
      { status: 404 },
    );
  }

  if (circle.status !== "forming" && circle.status !== "pending_creation") {
    return NextResponse.json(
      { error: "Circle is not accepting new members" },
      { status: 400 },
    );
  }

  // Check if already a member
  const existingMember = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: id,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: "Already a member of this circle" },
      { status: 409 },
    );
  }

  // Check if circle is full
  if (circle._count.members >= circle.totalMembers) {
    return NextResponse.json(
      { error: "Circle is full" },
      { status: 400 },
    );
  }

  const nextPosition = circle._count.members + 1;

  const membership = await prisma.circleMember.create({
    data: {
      circleId: id,
      userId: user.id,
      payoutPosition: nextPosition,
      status: "pending_join",
    },
  });

  return NextResponse.json(
    {
      membershipId: membership.id,
      circleId: id,
      onChainCircleId: circle.onChainId,
      payoutPosition: nextPosition,
      message:
        "Call halo-circle.join-circle on-chain to confirm membership",
    },
    { status: 201 },
  );
}
