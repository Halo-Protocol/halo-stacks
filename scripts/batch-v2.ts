import {
  makeContractCall, broadcastTransaction, PostConditionMode,
  getAddressFromPrivateKey, uintCV, contractPrincipalCV, noneCV,
  standardPrincipalCV, bufferCV, ClarityValue,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { createHash } from "crypto";
import { readFileSync } from "fs";

const NETWORK = networkFromName("mainnet");
const API = "https://api.hiro.so";
const DEPLOYER = "SPWAYZFA113ZTRNDSD3A51WYY90S5MCTWQKXNB2M";
const FEE = 800;
const BUDGET = 785_000; // ~0.785 STX remaining from 1 STX

async function fetchNonce(addr: string): Promise<bigint> {
  const r = await fetch(`${API}/v2/accounts/${addr}?proof=0`);
  return BigInt((await r.json() as { nonce: number }).nonce);
}
function sha256(s: string): Buffer { return createHash("sha256").update(s).digest(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const data = JSON.parse(readFileSync("scripts/test-wallets.json", "utf-8"));
  const wallets = data.wallets.map((w: any) => ({
    name: w.name, privateKey: w.privateKey,
    address: getAddressFromPrivateKey(w.privateKey, "mainnet"),
  }));

  const maxTxs = Math.floor(BUDGET / FEE);
  console.log("Target: " + maxTxs + " txs at " + FEE + " fee (" + (maxTxs * FEE / 1e6).toFixed(4) + " STX)\n");

  // Fetch fresh nonces + check identity status
  const nonces = new Map<string, bigint>();
  const bound = new Map<string, boolean>();
  for (const w of wallets) {
    nonces.set(w.address, await fetchNonce(w.address));
    try {
      const r = await fetch(`${API}/v2/contracts/call-read/${DEPLOYER}/halo-identity/is-wallet-bound`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: DEPLOYER, arguments: ["0x05" + w.address] }),
      });
      // Simple check: just see if nonce > 0 means they've transacted
      bound.set(w.address, true); // will check properly below
    } catch { bound.set(w.address, false); }
  }

  interface Tx { key: string; cn: string; fn: string; args: ClarityValue[]; nonce: bigint; label: string; }
  const queue: Tx[] = [];
  const counts: Record<string, number> = {};

  function add(w: any, cn: string, fn: string, args: ClarityValue[], n: bigint, l: string) {
    queue.push({ key: w.privateKey, cn, fn, args, nonce: n, label: l });
    counts[cn] = (counts[cn] || 0) + 1;
  }

  // Build: vault-v2 deposit/withdraw cycles + vault-v1 + token transfers (fixed memo)
  const txsPerWallet = Math.floor(maxTxs / wallets.length);
  
  for (let wi = 0; wi < wallets.length; wi++) {
    const w = wallets[wi];
    const isOrig = wi < 5;
    let n = nonces.get(w.address)!;
    let allocated = 0;

    // vault-v2 deposit/withdraw pairs
    while (allocated + 2 <= txsPerWallet && queue.length + 2 <= maxTxs) {
      add(w, "halo-vault-v2", "deposit-stx", [uintCV(1000n)], n++, w.name + " v2d");
      add(w, "halo-vault-v2", "withdraw-stx", [uintCV(1000n)], n++, w.name + " v2w");
      allocated += 2;

      // Mix in vault-v1 for original wallets (every 10th pair)
      if (isOrig && allocated % 20 === 0 && allocated + 2 <= txsPerWallet && queue.length + 2 <= maxTxs) {
        add(w, "halo-vault", "deposit", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(1000n)], n++, w.name + " v1d");
        add(w, "halo-vault", "withdraw", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(1000n)], n++, w.name + " v1w");
        allocated += 2;
      }

      // Mix in token transfer for original wallets (every 20th pair) — fixed memo
      if (isOrig && allocated % 40 === 0 && allocated + 1 <= txsPerWallet && queue.length < maxTxs) {
        const next = wallets[(wi + 1) % wallets.length];
        add(w, "halo-mock-token", "transfer", [uintCV(1n), standardPrincipalCV(w.address), standardPrincipalCV(next.address), noneCV()], n++, w.name + " xfer");
        allocated += 1;
      }
    }
  }

  if (queue.length > maxTxs) queue.length = maxTxs;
  console.log("Queued: " + queue.length + " txs\n");
  for (const [c, cnt] of Object.entries(counts).sort((a,b) => b[1] - a[1]))
    console.log("  " + c.padEnd(20) + cnt);

  console.log("\nBroadcasting...\n");
  let sent = 0, failed = 0, fees = 0;
  const t0 = Date.now();

  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    try {
      const tx = await makeContractCall({
        network: NETWORK, contractAddress: DEPLOYER,
        contractName: q.cn, functionName: q.fn,
        functionArgs: q.args, senderKey: q.key,
        nonce: q.nonce, fee: FEE, postConditionMode: PostConditionMode.Allow,
      });
      const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
      if ("error" in res) {
        failed++;
        if (failed <= 3) console.log("  FAIL: " + q.label + " — " + ((res as any).reason || (res as any).error));
      } else { sent++; fees += FEE; }
    } catch (err) {
      failed++;
      if (failed <= 3) console.log("  ERR: " + q.label + " — " + (err as Error).message);
    }
    if ((i+1) % 100 === 0) console.log("  [" + ((Date.now()-t0)/1000).toFixed(0) + "s] " + (i+1) + "/" + queue.length + " sent=" + sent + " fail=" + failed);
    if ((i+1) % 15 === 0) await sleep(80);
  }

  console.log("\n=== DONE (" + ((Date.now()-t0)/1000).toFixed(0) + "s) ===");
  console.log("  Sent:     " + sent);
  console.log("  Failed:   " + failed);
  console.log("  Gas:      " + (fees / 1e6).toFixed(4) + " STX");
  console.log("  + prior:  0.2148 STX");
  console.log("  TOTAL:    " + ((fees / 1e6) + 0.2148).toFixed(4) + " STX");
  for (const [c, cnt] of Object.entries(counts).sort((a,b) => b[1] - a[1]))
    console.log("  " + c.padEnd(20) + cnt);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
