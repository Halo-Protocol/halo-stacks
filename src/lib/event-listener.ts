/**
 * On-chain event listener — polls Hiro API for contract events
 * and stores them in the BlockchainEvent table.
 */
import { prisma } from "./db";
import { logger } from "./logger";

const API_URL = process.env.STACKS_API_URL || "https://api.hiro.so";
const DEPLOYER = process.env.DEPLOYER_ADDRESS || process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "";

const MONITORED_CONTRACTS = [
  "halo-vault-v3",
  "halo-circle-v2",
  "halo-credit",
  "halo-identity",
];

interface HiroEvent {
  tx_id: string;
  event_index: number;
  block_height: number;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: { repr: string; hex: string };
  };
}

/**
 * Fetch recent contract events from Hiro API for a given contract.
 */
async function fetchContractEvents(
  contractName: string,
  offset = 0,
  limit = 50,
): Promise<{ results: HiroEvent[]; total: number }> {
  const contractId = `${DEPLOYER}.${contractName}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `${API_URL}/extended/v1/contract/${contractId}/events?offset=${offset}&limit=${limit}`,
      { signal: controller.signal },
    );

    if (!res.ok) {
      throw new Error(`Hiro API returned ${res.status} for ${contractName}`);
    }

    return await res.json() as { results: HiroEvent[]; total: number };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse event type from Clarity print value repr.
 * Events typically print maps like: { event: "vault-v3-deposit", ... }
 */
function parseEventType(repr: string): string {
  const match = repr.match(/event:\s*"([^"]+)"/);
  return match?.[1] || "unknown";
}

/**
 * Parse event data from repr into a JSON-safe object.
 */
function parseEventData(repr: string): Record<string, string> {
  const data: Record<string, string> = {};
  // Match key-value pairs like `key: value` or `key: "string"`
  const pairs = repr.matchAll(/(\w[\w-]*):\s*(u\d+|"[^"]*"|'[^']*'|true|false)/g);
  for (const [, key, value] of pairs) {
    data[key] = value.replace(/^["']|["']$/g, "");
  }
  return data;
}

/**
 * Get the highest block height we've already processed for a contract.
 */
async function getLastProcessedBlock(contractName: string): Promise<number> {
  const latest = await prisma.blockchainEvent.findFirst({
    where: { contractName },
    orderBy: { blockHeight: "desc" },
    select: { blockHeight: true },
  });
  return latest?.blockHeight ?? 0;
}

/**
 * Process new events for a single contract.
 * Returns the number of new events stored.
 */
export async function processContractEvents(contractName: string): Promise<number> {
  const lastBlock = await getLastProcessedBlock(contractName);
  let stored = 0;
  let offset = 0;

  while (true) {
    const { results } = await fetchContractEvents(contractName, offset);
    if (results.length === 0) break;

    // Filter to only new events (above last processed block)
    const newEvents = results.filter((e) => e.block_height > lastBlock);
    if (newEvents.length === 0) break;

    for (const event of newEvents) {
      if (!event.contract_log) continue;

      const repr = event.contract_log.value.repr;
      const eventType = parseEventType(repr);
      const data = parseEventData(repr);

      try {
        await prisma.blockchainEvent.create({
          data: {
            blockHeight: event.block_height,
            txId: event.tx_id,
            eventIndex: event.event_index,
            contractName,
            eventType,
            data,
          },
        });
        stored++;
      } catch (err: unknown) {
        // Skip duplicates (unique constraint on txId + eventIndex)
        if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
          continue;
        }
        throw err;
      }
    }

    // If all results were new, fetch more
    if (newEvents.length === results.length) {
      offset += results.length;
    } else {
      break;
    }
  }

  return stored;
}

/**
 * Process events for all monitored contracts.
 */
export async function processAllContractEvents(): Promise<{
  total: number;
  byContract: Record<string, number>;
}> {
  const byContract: Record<string, number> = {};
  let total = 0;

  for (const contractName of MONITORED_CONTRACTS) {
    try {
      const count = await processContractEvents(contractName);
      byContract[contractName] = count;
      total += count;
      if (count > 0) {
        logger.info({ contractName, newEvents: count }, "Processed contract events");
      }
    } catch (err) {
      logger.error({ contractName, err }, "Failed to process contract events");
      byContract[contractName] = -1;
    }
  }

  return { total, byContract };
}
