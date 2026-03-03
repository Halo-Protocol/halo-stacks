import {
  makeContractCall, broadcastTransaction, PostConditionMode,
  getAddressFromPrivateKey, uintCV, contractPrincipalCV, noneCV,
  standardPrincipalCV, ClarityValue,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { readFileSync } from "fs";

const NETWORK = networkFromName("mainnet");
const API = "https://api.hiro.so";
const DEPLOYER = "SPWAYZFA113ZTRNDSD3A51WYY90S5MCTWQKXNB2M";
const FEE = 800;
const MAX_TOTAL_GAS = 700_000; // 0.7 STX remaining budget

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getNextNonce(addr: string): Promise<bigint> {
  const r = await fetch(`${API}/extended/v1/address/${addr}/nonces`);
  const d = await r.json() as { possible_next_nonce: number };
  return BigInt(d.possible_next_nonce);
}

async function main() {
  const data = JSON.parse(readFileSync("scripts/test-wallets.json", "utf-8"));
  const wallets = data.wallets.map((w: any) => ({
    name: w.name, privateKey: w.privateKey,
    address: getAddressFromPrivateKey(w.privateKey, "mainnet"),
  }));

  const maxTxs = Math.floor(MAX_TOTAL_GAS / FEE);
  console.log("Target: " + maxTxs + " txs at " + FEE + " fee (" + (maxTxs * FEE / 1e6).toFixed(4) + " STX)\n");

  // Fetch mempool-aware nonces
  const nonces = new Map<string, bigint>();
  for (const w of wallets) {
    const n = await getNextNonce(w.address);
    nonces.set(w.address, n);
    console.log("  " + w.name + ": next nonce = " + n);
  }

  interface Tx { key: string; cn: string; fn: string; args: ClarityValue[]; nonce: bigint; label: string; }
  const queue: Tx[] = [];
  const counts: Record<string, number> = {};

  function add(w: any, cn: string, fn: string, args: ClarityValue[], n: bigint, l: string) {
    queue.push({ key: w.privateKey, cn, fn, args, nonce: n, label: l });
    counts[cn] = (counts[cn] || 0) + 1;
  }

  // Build: pure vault-v2 deposit/withdraw + vault-v1 for original 5
  const perWallet = Math.floor(maxTxs / wallets.length);

  for (let wi = 0; wi < wallets.length; wi++) {
    const w = wallets[wi]; const isOrig = wi < 5;
    let n = nonces.get(w.address)!;
    let count = 0;

    while (count + 2 <= perWallet && queue.length + 2 <= maxTxs) {
      add(w, "halo-vault-v2", "deposit-stx", [uintCV(500n)], n++, w.name + " dep");
      add(w, "halo-vault-v2", "withdraw-stx", [uintCV(500n)], n++, w.name + " wdr");
      count += 2;

      // Vault v1 for original wallets every 16 txs
      if (isOrig && count % 16 === 0 && count + 2 <= perWallet && queue.length + 2 <= maxTxs) {
        add(w, "halo-vault", "deposit", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(500n)], n++, w.name + " v1d");
        add(w, "halo-vault", "withdraw", [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(500n)], n++, w.name + " v1w");
        count += 2;
      }

      // Token transfer for original wallets every 32 txs
      if (isOrig && count % 32 === 0 && count + 1 <= perWallet && queue.length < maxTxs) {
        const next = wallets[(wi + 1) % wallets.length];
        add(w, "halo-mock-token", "transfer", [uintCV(1n), standardPrincipalCV(w.address), standardPrincipalCV(next.address), noneCV()], n++, w.name + " xfer");
        count++;
      }
    }
  }
  if (queue.length > maxTxs) queue.length = maxTxs;

  console.log("\nQueued: " + queue.length + " txs (" + (queue.length * FEE / 1e6).toFixed(4) + " STX)");
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
        if (failed <= 3) console.log("  FAIL[" + i + "]: " + q.label + " n=" + q.nonce + " — " + ((res as any).reason || (res as any).error));
      } else { sent++; fees += FEE; }
    } catch (err) {
      failed++;
      if (failed <= 3) console.log("  ERR[" + i + "]: " + q.label + " — " + (err as Error).message);
    }
    if ((i+1) % 100 === 0) console.log("  [" + ((Date.now()-t0)/1000).toFixed(0) + "s] " + (i+1) + "/" + queue.length + " sent=" + sent + " fail=" + failed);
    if ((i+1) % 15 === 0) await sleep(80);
  }

  console.log("\n=== BATCH COMPLETE (" + ((Date.now()-t0)/1000).toFixed(0) + "s) ===");
  console.log("  This batch:  " + sent + " sent, " + failed + " failed");
  console.log("  This gas:    " + (fees / 1e6).toFixed(4) + " STX");
  console.log("  Prior gas:   ~0.30 STX");
  console.log("  TOTAL GAS:   ~" + ((fees / 1e6) + 0.30).toFixed(4) + " STX");
  console.log("  TOTAL SENT:  ~" + (sent + 285) + " txs (285 prior + " + sent + " this batch)");
  for (const [c, cnt] of Object.entries(counts).sort((a,b) => b[1] - a[1]))
    console.log("  " + c.padEnd(20) + cnt);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
