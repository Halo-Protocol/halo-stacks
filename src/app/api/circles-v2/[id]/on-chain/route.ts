import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/middleware";
import { prisma } from "../../../../../lib/db";
import { CONTRACTS, STACKS_NETWORK } from "../../../../../lib/contracts";
import {
  fetchCallReadOnlyFunction,
  ClarityType,
  cvToJSON,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const circle = await prisma.circleV2.findUnique({ where: { id } });
  if (!circle) {
    return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }

  if (!circle.onChainId) {
    return NextResponse.json(
      { error: "Circle has no on-chain ID" },
      { status: 400 },
    );
  }

  const network = networkFromName(STACKS_NETWORK);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACTS.circleV2.address,
      contractName: CONTRACTS.circleV2.name,
      functionName: "get-circle",
      functionArgs: [
        { type: ClarityType.UInt, value: BigInt(circle.onChainId) },
      ],
      senderAddress: CONTRACTS.circleV2.address,
      network,
    });

    clearTimeout(timeout);

    const json = cvToJSON(result);

    // Sync on-chain state to DB
    if (json.success && json.value?.value) {
      const onChainData = json.value.value;
      const onChainRound = onChainData["current-round"]?.value
        ? Number(onChainData["current-round"].value)
        : null;
      const onChainStatus = onChainData["status"]?.value
        ? Number(onChainData["status"].value)
        : null;

      await prisma.circleV2.update({
        where: { id },
        data: {
          onChainRound,
          onChainStatus,
          lastSyncedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      onChainId: circle.onChainId,
      data: json,
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    const message =
      error instanceof Error ? error.message : "Failed to fetch on-chain data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
