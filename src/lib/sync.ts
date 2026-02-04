import { prisma } from "./db";
import { getCircleInfo } from "./stacks";

const STATUS_MAP: Record<number, string> = {
  0: "forming",
  1: "active",
  2: "paused",
  3: "completed",
  4: "dissolved",
};

export async function syncCircleFromChain(
  circleDbId: string,
): Promise<boolean> {
  const circle = await prisma.circle.findUnique({
    where: { id: circleDbId },
  });

  if (!circle?.onChainId) return false;

  const info = await getCircleInfo(circle.onChainId);
  if (!info) return false;

  const onChainStatusStr = STATUS_MAP[info.status] || circle.status;

  await prisma.circle.update({
    where: { id: circleDbId },
    data: {
      onChainRound: info.currentRound,
      onChainStatus: info.status,
      status: onChainStatusStr,
      lastSyncedAt: new Date(),
      ...(info.status === 1 && !circle.startedAt
        ? { startedAt: new Date() }
        : {}),
      ...(info.status === 3 && !circle.completedAt
        ? { completedAt: new Date() }
        : {}),
    },
  });

  return true;
}

export async function syncAllActiveCircles(): Promise<{
  synced: number;
  failed: number;
}> {
  const activeCircles = await prisma.circle.findMany({
    where: {
      onChainId: { not: null },
      status: { in: ["forming", "active", "pending_creation"] },
    },
  });

  let synced = 0;
  let failed = 0;

  for (const circle of activeCircles) {
    try {
      const ok = await syncCircleFromChain(circle.id);
      if (ok) synced++;
      else failed++;
    } catch (err) {
      console.error("[sync] failed to sync circle", circle.id, err);
      failed++;
    }
  }

  return { synced, failed };
}
