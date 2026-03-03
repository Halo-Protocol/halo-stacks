import {
  makeContractCall, broadcastTransaction, PostConditionMode,
  getAddressFromPrivateKey, uintCV, standardPrincipalCV,
  contractPrincipalCV, bufferCV, ClarityValue,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { createHash } from "crypto";
import { readFileSync } from "fs";

const NETWORK = networkFromName("mainnet");
const API = "https://api.hiro.so";
const DEPLOYER = "SPWAYZFA113ZTRNDSD3A51WYY90S5MCTWQKXNB2M";
const FEE = 1200;
const MAX_SPEND = 1_000_000; // 1 STX

async function fetchNonce(addr: string): Promise<bigint> {
  const r = await fetch(`${API}/v2/accounts/${addr}?proof=0`);
  return BigInt((await r.json() as { nonce: number }).nonce);
}
function sha256(s: string): Buffer { return createHash("sha256").update(s).digest(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface Tx { senderKey: string; contractName: string; functionName: string; functionArgs: ClarityValue[]; nonce: bigint; label: string; }

async function main() {
  const data = JSON.parse(readFileSync("scripts/test-wallets.json", "utf-8"));
  const wallets = data.wallets.map((w: any) => ({
    name: w.name, privateKey: w.privateKey,
    address: getAddressFromPrivateKey(w.privateKey, "mainnet"),
  }));

  const queue: Tx[] = [];
  const counts: Record<string, number> = {};
  const maxTxs = Math.floor(MAX_SPEND / FEE); // 833

  function add(w: any, cn: string, fn: string, args: ClarityValue[], n: bigint, l: string) {
    queue.push({ senderKey: w.privateKey, contractName: cn, functionName: fn, functionArgs: args, nonce: n, label: l });
    counts[cn] = (counts[cn] || 0) + 1;
  }

  console.log("Building queue (target: " + maxTxs + " txs, budget: 1 STX)...\n");

  const nonces = new Map<string, bigint>();
  for (const w of wallets) nonces.set(w.address, await fetchNonce(w.address));

  // Phase 1: Identity for new wallets (10 txs -> halo-identity)
  for (let i = 5; i < wallets.length; i++) {
    const w = wallets[i]; const n = nonces.get(w.address)!;
    add(w, "halo-identity", "bind-wallet", [bufferCV(sha256(w.address))], n, w.name + " identity");
    nonces.set(w.address, n + 1n);
  }

  // Phase 2: Interleaved cycles across all 15 wallets
  let cycle = 0;
  while (queue.length < maxTxs) {
    for (let wi = 0; wi < wallets.length && queue.length < maxTxs; wi++) {
      const w = wallets[wi]; const isOrig = wi < 5;
      let n = nonces.get(w.address)!;

      add(w, "halo-vault-v2", "deposit-stx", [uintCV(1000n)], n++, w.name + " v2d" + cycle);
      if (queue.length < maxTxs)
        add(w, "halo-vault-v2", "withdraw-stx", [uintCV(1000n)], n++, w.name + " v2w" + cycle);

      if (isOrig && cycle % 8 === 0 && queue.length + 2 <= maxTxs) {
        add(w, "halo-vault", "deposit", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(1000n)], n++, w.name + " v1d" + cycle);
        add(w, "halo-vault", "withdraw", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(1000n)], n++, w.name + " v1w" + cycle);
      }

      if (isOrig && cycle % 12 === 0 && queue.length < maxTxs) {
        const next = wallets[(wi + 1) % wallets.length];
        add(w, "halo-mock-token", "transfer", [uintCV(1n), standardPrincipalCV(w.address), standardPrincipalCV(next.address), bufferCV(Buffer.alloc(0))], n++, w.name + "->" + next.name);
      }

      nonces.set(w.address, n);
    }
    cycle++;
  }
  if (queue.length > maxTxs) queue.length = maxTxs;

  console.log("Queued: " + queue.length + " txs (" + (queue.length * FEE / 1e6).toFixed(4) + " STX)\n");
  for (const [c, n] of Object.entries(counts).sort((a,b) => b[1] - a[1]))
    console.log("  " + c.padEnd(20) + " " + n);

  console.log("\nBroadcasting...\n");
  let sent = 0, failed = 0, fees = 0;
  const t0 = Date.now();

  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    try {
      const tx = await makeContractCall({
        network: NETWORK, contractAddress: DEPLOYER,
        contractName: q.contractName, functionName: q.functionName,
        functionArgs: q.functionArgs, senderKey: q.senderKey,
        nonce: q.nonce, fee: FEE, postConditionMode: PostConditionMode.Allow,
      });
      const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
      if ("error" in res) {
        failed++;
        if (failed <= 5) console.log("  FAIL: " + q.label + " — " + ((res as any).reason || (res as any).error));
      } else { sent++; fees += FEE; }
    } catch (err) {
      failed++;
      if (failed <= 5) console.log("  ERR: " + q.label + " — " + (err as Error).message);
    }
    if ((i+1) % 100 === 0) console.log("  [" + ((Date.now()-t0)/1000).toFixed(0) + "s] " + (i+1) + "/" + queue.length + " sent=" + sent + " fail=" + failed);
    if ((i+1) % 15 === 0) await sleep(100);
  }

  console.log("\n=== DONE (" + ((Date.now()-t0)/1000).toFixed(0) + "s) ===");
  console.log("  Sent:  " + sent);
  console.log("  Failed: " + failed);
  console.log("  Gas:   " + (fees / 1e6).toFixed(4) + " STX");
  for (const [c, n] of Object.entries(counts).sort((a,b) => b[1] - a[1]))
    console.log("  " + c.padEnd(20) + " " + n);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
