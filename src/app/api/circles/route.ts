import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWallet } from "../../../lib/middleware";
import { prisma } from "../../../lib/db";
import { randomBytes } from "crypto";
import { stripHtml } from "../../../lib/sanitize";

const createCircleSchema = z.object({
  name: z.string().min(3).max(30),
  contributionAmount: z.number().int().positive(),
  totalMembers: z.number().int().min(3).max(10),
  roundDurationDays: z.number().int().refine((v) => [7, 14, 30].includes(v), {
    message: "Round duration must be 7, 14, or 30 days",
  }),
  gracePeriodDays: z.number().int().min(1).max(7).default(1),
  tokenType: z.number().int().min(0).max(1).default(0),
  tokenContract: z.string().optional(),
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function GET() {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  // Get circles where user is a member or creator
  const circles = await prisma.circle.findMany({
    where: {
      OR: [
        { creatorId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      _count: { select: { members: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    circles.map((c) => ({
      id: c.id,
      onChainId: c.onChainId,
      name: c.name,
      contributionAmount: c.contributionAmount.toString(),
      totalMembers: c.totalMembers,
      currentMembers: c._count.members,
      tokenType: c.tokenType,
      tokenContract: c.tokenContract,
      inviteCode: c.inviteCode,
      status: c.status,
      creatorName: c.creator.name,
      createdAt: c.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createCircleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Validate token contract required for SIP-010 circles
  if (data.tokenType === 1 && !data.tokenContract) {
    return NextResponse.json(
      { error: "tokenContract is required for SIP-010 circles" },
      { status: 400 },
    );
  }

  const inviteCode = generateInviteCode();
  const blocksPerDay = 144; // ~144 Stacks blocks per day

  const sanitizedName = stripHtml(data.name).trim();

  const circle = await prisma.circle.create({
    data: {
      creatorId: user.id,
      name: sanitizedName,
      contributionAmount: BigInt(data.contributionAmount),
      totalMembers: data.totalMembers,
      roundDuration: data.roundDurationDays * blocksPerDay,
      gracePeriod: data.gracePeriodDays * blocksPerDay,
      tokenType: data.tokenType,
      tokenContract: data.tokenContract,
      inviteCode,
      status: "pending_creation",
    },
  });

  // Add creator as first member
  await prisma.circleMember.create({
    data: {
      circleId: circle.id,
      userId: user.id,
      payoutPosition: 1,
      status: "confirmed",
      joinedAt: new Date(),
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return NextResponse.json(
    {
      id: circle.id,
      inviteCode,
      inviteLink: `${frontendUrl}/join/${inviteCode}`,
      onChainParams: {
        name: data.name,
        contributionAmount: data.contributionAmount,
        totalMembers: data.totalMembers,
        roundDuration: data.roundDurationDays * blocksPerDay,
        gracePeriod: data.gracePeriodDays * blocksPerDay,
        tokenType: data.tokenType,
        tokenContract: data.tokenContract,
      },
    },
    { status: 201 },
  );
}
