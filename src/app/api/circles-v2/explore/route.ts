import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { applyRateLimit, DEFAULT_RATE_LIMIT } from "../../../../lib/api-helpers";

export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "explore", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "forming";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const validStatuses = ["forming", "active", "pending_creation"];
  const filterStatus = validStatuses.includes(status) ? status : "forming";

  const [circles, total] = await Promise.all([
    prisma.circleV2.findMany({
      where: { status: filterStatus },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        contributionAmount: true,
        totalMembers: true,
        status: true,
        tokenType: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.circleV2.count({ where: { status: filterStatus } }),
  ]);

  return NextResponse.json({
    circles: circles.map((c) => ({
      id: c.id,
      name: c.name,
      contributionAmount: c.contributionAmount.toString(),
      totalMembers: c.totalMembers,
      currentMembers: c._count.members,
      status: c.status,
      tokenType: c.tokenType,
      createdAt: c.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
