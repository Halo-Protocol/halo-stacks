#!/usr/bin/env npx tsx
/**
 * Event Worker — Polls Hiro API for on-chain contract events
 * and stores them in the database.
 *
 * Usage:
 *   npx tsx scripts/event-worker.ts           # one-shot sync
 *   npx tsx scripts/event-worker.ts --cron     # poll every 2 minutes
 */
import { processAllContractEvents } from "../src/lib/event-listener";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const CRON = process.argv.includes("--cron");

function log(msg: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg, ...data }));
}

async function run() {
  log("Starting event sync...");
  const result = await processAllContractEvents();
  log("Event sync complete", { total: result.total, byContract: result.byContract });
}

async function main() {
  await run();

  if (CRON) {
    log(`Running in cron mode, polling every ${POLL_INTERVAL_MS / 1000}s`);
    setInterval(run, POLL_INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "Fatal", error: String(err) }));
  process.exit(1);
});
