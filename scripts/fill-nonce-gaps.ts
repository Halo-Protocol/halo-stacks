import {
  makeContractCall, broadcastTransaction, PostConditionMode,
  getAddressFromPrivateKey, uintCV,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { readFileSync } from "fs";

const NETWORK = networkFromName("mainnet");
const API = "https://api.hiro.so";
const DEPLOYER = "SPWAYZFA113ZTRNDSD3A51WYY90S5MCTWQKXNB2M";
const FEE = 800;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const data = JSON.parse(readFileSync("scripts/test-wallets.json", "utf-8"));

  let totalGaps = 0;
  let totalFilled = 0;

  for (const w of data.wallets) {
    const addr = getAddressFromPrivateKey(w.privateKey, "mainnet");

    // Get nonce state and mempool txs (with rate limit handling)
    await sleep(500);
    const nonceR = await fetch(`${API}/extended/v1/address/${addr}/nonces`);
    if (!nonceR.ok) { console.log(`${w.name} rate limited, skipping`); continue; }
    const nonceRes = await nonceR.json();
    await sleep(300);
    const mempoolR = await fetch(`${API}/extended/v1/address/${addr}/mempool?limit=50`);
    if (!mempoolR.ok) { console.log(`${w.name} rate limited, skipping`); continue; }
    const mempoolRes = await mempoolR.json();

    const nextNeeded = nonceRes.last_executed_tx_nonce + 1;
    const highestQueued = nonceRes.possible_next_nonce;
    const mempoolNonces = new Set((mempoolRes as any).results.map((t: any) => t.nonce));

    // Find gaps between nextNeeded and highestQueued
    const gaps: number[] = [];
    for (let n = nextNeeded; n < highestQueued; n++) {
      if (!mempoolNonces.has(n)) gaps.push(n);
    }

    if (gaps.length === 0) {
      console.log(`${w.name.padEnd(12)} no gaps (conf=${nextNeeded}, next=${highestQueued})`);
      continue;
    }

    console.log(`${w.name.padEnd(12)} ${gaps.length} gaps: [${gaps.slice(0, 10).join(",")}${gaps.length > 10 ? "..." : ""}]`);
    totalGaps += gaps.length;

    // Fill each gap with a cheap deposit-stx/withdraw-stx tx
    for (const nonce of gaps) {
      try {
        const tx = await makeContractCall({
          network: NETWORK, contractAddress: DEPLOYER,
          contractName: "halo-vault-v2", functionName: "deposit-stx",
          functionArgs: [uintCV(500n)], senderKey: w.privateKey,
          nonce: BigInt(nonce), fee: FEE,
          postConditionMode: PostConditionMode.Allow,
        });
        const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
        if ("error" in res) {
          console.log(`  nonce ${nonce} FAIL: ${(res as any).reason || (res as any).error}`);
        } else {
          totalFilled++;
        }
      } catch (err) {
        console.log(`  nonce ${nonce} ERR: ${(err as Error).message}`);
      }
      await sleep(250);
    }

    await sleep(500);
  }

  console.log(`\n=== GAPS FILLED ===`);
  console.log(`Total gaps found: ${totalGaps}`);
  console.log(`Successfully filled: ${totalFilled}`);
  console.log(`Gas cost: ${(totalFilled * FEE / 1e6).toFixed(4)} STX`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
