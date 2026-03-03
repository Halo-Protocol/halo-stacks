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
const CHAIN_LIMIT = 24; // stay under 25 TooMuchChaining limit

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface WalletInfo {
  name: string;
  privateKey: string;
  address: string;
  nextNonce: bigint;
  pending: number;
  capacity: number; // how many more txs we can chain
}

async function getWalletState(addr: string): Promise<{ nextNonce: bigint; pending: number }> {
  const r = await fetch(`${API}/extended/v1/address/${addr}/nonces`);
  const d = await r.json() as { possible_next_nonce: number; last_executed_tx_nonce: number };
  const pending = d.possible_next_nonce - d.last_executed_tx_nonce - 1;
  return { nextNonce: BigInt(d.possible_next_nonce), pending: Math.max(0, pending) };
}

async function main() {
  const data = JSON.parse(readFileSync("scripts/test-wallets.json", "utf-8"));
  const wallets: WalletInfo[] = [];

  console.log("Checking wallet states...\n");
  for (const w of data.wallets) {
    const addr = getAddressFromPrivateKey(w.privateKey, "mainnet");
    const state = await getWalletState(addr);
    const capacity = Math.max(0, CHAIN_LIMIT - state.pending);
    wallets.push({
      name: w.name, privateKey: w.privateKey, address: addr,
      nextNonce: state.nextNonce, pending: state.pending, capacity,
    });
    console.log(`  ${w.name.padEnd(12)} pending=${String(state.pending).padStart(2)} capacity=${capacity}`);
    await sleep(150);
  }

  const totalCapacity = wallets.reduce((s, w) => s + w.capacity, 0);
  console.log(`\nTotal available capacity: ${totalCapacity} txs`);

  if (totalCapacity < 5) {
    console.log("\nNot enough capacity. Wait for pending txs to confirm (~10-30 min per block).");
    console.log("Run this script again after a block confirms.");
    process.exit(0);
  }

  // Build tx queue - spread evenly across wallets with capacity
  interface Tx { key: string; cn: string; fn: string; args: ClarityValue[]; nonce: bigint; label: string }
  const queue: Tx[] = [];

  for (const w of wallets) {
    if (w.capacity <= 0) continue;
    let n = w.nextNonce;
    let sent = 0;

    while (sent + 2 <= w.capacity) {
      // deposit-stx / withdraw-stx pair (cheapest contract interactions)
      queue.push({ key: w.privateKey, cn: "halo-vault-v2", fn: "deposit-stx", args: [uintCV(500n)], nonce: n++, label: `${w.name} dep` });
      queue.push({ key: w.privateKey, cn: "halo-vault-v2", fn: "withdraw-stx", args: [uintCV(500n)], nonce: n++, label: `${w.name} wdr` });
      sent += 2;

      // Mix in vault-v1 deposit/withdraw for variety
      if (sent % 10 === 0 && sent + 2 <= w.capacity) {
        queue.push({ key: w.privateKey, cn: "halo-vault", fn: "deposit", args: [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(100n)], nonce: n++, label: `${w.name} v1d` });
        queue.push({ key: w.privateKey, cn: "halo-vault", fn: "withdraw", args: [contractPrincipalCV(DEPLOYER, "halo-mock-token"), uintCV(100n)], nonce: n++, label: `${w.name} v1w` });
        sent += 2;
      }
    }
  }

  const gasCost = queue.length * FEE;
  console.log(`\nQueued: ${queue.length} txs (${(gasCost / 1e6).toFixed(4)} STX gas)`);
  console.log("Broadcasting...\n");

  let sent = 0, failed = 0;
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
        if (failed <= 5) console.log(`  FAIL[${i}]: ${q.label} n=${q.nonce} - ${(res as any).reason || (res as any).error}`);
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      if (failed <= 5) console.log(`  ERR[${i}]: ${q.label} - ${(err as Error).message}`);
    }
    if ((i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  [${elapsed}s] ${i + 1}/${queue.length} sent=${sent} fail=${failed}`);
    }
    await sleep(300);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n=== BATCH COMPLETE (${elapsed}s) ===`);
  console.log(`  This batch:  ${sent} sent, ${failed} failed`);
  console.log(`  This gas:    ${(sent * FEE / 1e6).toFixed(4)} STX`);
  console.log(`\nRun again after next block confirms to send more.`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
