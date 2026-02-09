import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";

const joinSchema = z.object({
  txId: z.string().min(1).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const circle = await prisma.circleV2.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });

  if (!circle) {
    return NextResponse.json(
      { error: "Circle not found" },
      { status: 404 },
    );
  }

  if (circle.status !== "pending_creation" && circle.status !== "forming") {
    return NextResponse.json(
      { error: "Circle is not accepting members" },
      { status: 400 },
    );
  }

  if (circle._count.members >= circle.totalMembers) {
    return NextResponse.json(
      { error: "Circle is full" },
      { status: 400 },
    );
  }

  // Check if already a member
  const existing = await prisma.circleMemberV2.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already a member of this circle" },
      { status: 409 },
    );
  }

  const member = await prisma.circleMemberV2.create({
    data: {
      circleId: id,
      userId: user.id,
      status: "confirmed",
      joinTxId: parsed.data.txId,
      joinedAt: new Date(),
    },
  });

  // Check if circle is now full -> activate
  const memberCount = circle._count.members + 1;
  if (memberCount >= circle.totalMembers) {
    await prisma.circleV2.update({
      where: { id },
      data: {
        status: "active",
        startedAt: new Date(),
      },
    });
  }

  return NextResponse.json(
    {
      memberId: member.id,
      circleId: id,
      memberCount,
      activated: memberCount >= circle.totalMembers,
    },
    { status: 201 },
  );
}
