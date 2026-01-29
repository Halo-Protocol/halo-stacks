import { NextResponse } from "next/server";
import {
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
  uintCV,
  standardPrincipalCV,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";
import { requireWallet } from "../../../lib/middleware";
import { prisma } from "../../../lib/db";
import { getNextNonce, resetNonce } from "../../../lib/nonce-manager";

// 1000 hUSD = 1_000_000_000 micro-units (6 decimals)
const HUSD_MINT_AMOUNT = 1_000_000_000n;
// 0.01 sBTC = 1_000_000 satoshis (8 decimals)
const SBTC_MINT_AMOUNT = 1_000_000n;
// 24 hours in milliseconds
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const user = await requireWallet();
  if (user instanceof NextResponse) return user;

  const senderKey = process.env.DEPLOYER_PRIVATE_KEY;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  if (!senderKey || !deployerAddress) {
    return NextResponse.json(
      { error: "Faucet not configured" },
      { status: 503 },
    );
  }

  // Check 24-hour rate limit from DB
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);
  const recentRequest = await prisma.faucetRequest.findFirst({
    where: {
      walletAddress: user.walletAddress,
      requestedAt: { gte: cooldownCutoff },
      status: { in: ["success", "partial", "pending"] },
    },
    orderBy: { requestedAt: "desc" },
  });

  if (recentRequest) {
    const nextAvailable = new Date(
      recentRequest.requestedAt.getTime() + COOLDOWN_MS,
    );
    return NextResponse.json(
      {
        error: "Faucet rate limit: 1 request per 24 hours",
        nextAvailable: nextAvailable.toISOString(),
      },
      { status: 429 },
    );
  }

  const faucetRequest = await prisma.faucetRequest.create({
    data: {
      userId: user.id,
      walletAddress: user.walletAddress,
      hUsdAmount: HUSD_MINT_AMOUNT,
      sbtcAmount: SBTC_MINT_AMOUNT,
      status: "pending",
    },
  });

  const network = networkFromName("testnet");
  let hUsdTxId: string | null = null;
  let sbtcTxId: string | null = null;

  try {
    // Mint hUSD
    const hUsdNonce = await getNextNonce(deployerAddress);
    const hUsdTx = await makeContractCall({
      network,
      contractAddress: deployerAddress,
      contractName: "halo-mock-token",
      functionName: "mint",
      functionArgs: [
        uintCV(HUSD_MINT_AMOUNT),
        standardPrincipalCV(user.walletAddress),
      ],
      senderKey,
      nonce: hUsdNonce,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000,
    });

    const hUsdResult = await broadcastTransaction({
      transaction: hUsdTx,
      network,
    });
    if ("txid" in hUsdResult) {
      hUsdTxId = hUsdResult.txid;
    }

    // Mint sBTC
    const sbtcNonce = await getNextNonce(deployerAddress);
    const sbtcTx = await makeContractCall({
      network,
      contractAddress: deployerAddress,
      contractName: "halo-mock-sbtc",
      functionName: "mint",
      functionArgs: [
        uintCV(SBTC_MINT_AMOUNT),
        standardPrincipalCV(user.walletAddress),
      ],
      senderKey,
      nonce: sbtcNonce,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000,
    });

    const sbtcResult = await broadcastTransaction({
      transaction: sbtcTx,
      network,
    });
    if ("txid" in sbtcResult) {
      sbtcTxId = sbtcResult.txid;
    }
  } catch (err) {
    console.error("[faucet] mint transaction failed:", err);
    resetNonce();
  }

  const status =
    hUsdTxId && sbtcTxId
      ? "success"
      : hUsdTxId || sbtcTxId
        ? "partial"
        : "failed";

  await prisma.faucetRequest.update({
    where: { id: faucetRequest.id },
    data: { hUsdTxId, sbtcTxId, status },
  });

  if (status === "failed") {
    return NextResponse.json(
      { error: "Failed to broadcast mint transactions" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    hUsdTxId,
    sbtcTxId,
    hUsdAmount: HUSD_MINT_AMOUNT.toString(),
    sbtcAmount: SBTC_MINT_AMOUNT.toString(),
    message: "Tokens will arrive after transaction confirmation (~10-30 min)",
  });
}
