import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { checkVaultPaused } from "../../../lib/yield-rates";

const STACKS_API_URL = process.env.STACKS_API_URL || "https://api.hiro.so";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "";

async function checkStacksApi(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${STACKS_API_URL}/v2/info`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok ? "ok" : "degraded";
  } catch {
    return "error";
  }
}

async function getDeployerBalance(): Promise<{ stx: number; status: string }> {
  if (!DEPLOYER_ADDRESS) return { stx: 0, status: "unknown" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `${STACKS_API_URL}/extended/v1/address/${DEPLOYER_ADDRESS}/stx`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return { stx: 0, status: "error" };
    const data = await res.json();
    const stx = Number(data.balance || 0) / 1_000_000;
    return { stx, status: stx < 10 ? "low" : "ok" };
  } catch {
    return { stx: 0, status: "error" };
  }
}

export async function GET() {
  const [dbResult, stacksApi, vaultPaused, deployerBalance, circleStats] =
    await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => "ok" as const).catch(() => "error" as const),
      checkStacksApi(),
      checkVaultPaused().catch(() => false),
      getDeployerBalance(),
      prisma.circleV2.groupBy({
        by: ["status"],
        _count: true,
      }).catch(() => []),
    ]);

  const circlesByStatus: Record<string, number> = {};
  for (const c of circleStats) {
    circlesByStatus[c.status] = c._count;
  }

  const allOk = dbResult === "ok" && stacksApi === "ok" && !vaultPaused && deployerBalance.status !== "low";

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: "3.0.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbResult,
        stacksApi,
        vaultPaused,
        deployerBalance: {
          stx: Math.round(deployerBalance.stx * 100) / 100,
          status: deployerBalance.status,
        },
      },
      circles: circlesByStatus,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
