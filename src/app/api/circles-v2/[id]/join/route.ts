import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { applyRateLimit, STRICT_RATE_LIMIT } from "../../../../../lib/api-helpers";

const joinSchema = z.object({
  txId: z.string().min(1).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = applyRateLimit(request, "circle-v2-join", STRICT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

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

  const circle = await prisma.circleV2.findUnique({ where: { id } });

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

  // Atomic join: create member + check capacity + activate in one transaction
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      // Count current members inside transaction for atomicity
      const currentCount = await tx.circleMemberV2.count({
        where: { circleId: id },
      });

      if (currentCount >= circle.totalMembers) {
        throw new Error("CIRCLE_FULL");
      }

      const member = await tx.circleMemberV2.create({
        data: {
          circleId: id,
          userId: user.id,
          status: "confirmed",
          joinTxId: parsed.data.txId,
          joinedAt: new Date(),
        },
      });

      const newCount = currentCount + 1;

      // Activate circle if now full
      if (newCount >= circle.totalMembers) {
        await tx.circleV2.update({
          where: { id },
          data: {
            status: "active",
            startedAt: new Date(),
          },
        });
      }

      return { member, memberCount: newCount, activated: newCount >= circle.totalMembers };
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CIRCLE_FULL") {
      return NextResponse.json({ error: "Circle is full" }, { status: 400 });
    }
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Already a member of this circle" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(
    {
      memberId: result.member.id,
      circleId: id,
      memberCount: result.memberCount,
      activated: result.activated,
    },
    { status: 201 },
  );
}
