import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  standardPrincipalCV,
  bufferCV,
  uintCV,
  ClarityValue,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";

function getNetwork() {
  const networkType = process.env.STACKS_NETWORK || "testnet";
  return networkFromName(networkType as "mainnet" | "testnet");
}

function getDeployerAddress(): string {
  const addr = process.env.DEPLOYER_ADDRESS;
  if (!addr) throw new Error("DEPLOYER_ADDRESS env var is required");
  return addr;
}

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
): Promise<ClarityValue> {
  const deployer = getDeployerAddress();
  const network = getNetwork();

  return fetchCallReadOnlyFunction({
    network,
    contractAddress: deployer,
    contractName,
    functionName,
    functionArgs,
    senderAddress: deployer,
  });
}

/**
 * Get credit score by wallet address from on-chain.
 */
export async function getCreditScoreByWallet(
  wallet: string,
): Promise<number> {
  const result = await callReadOnly("halo-credit", "get-score-by-wallet", [
    standardPrincipalCV(wallet),
  ]);
  const json = cvToJSON(result);
  return (json as { value: number }).value || 300;
}

/**
 * Get full credit data by unique ID from on-chain.
 */
export async function getCreditData(uniqueId: string) {
  const hexBytes = uniqueId.startsWith("0x") ? uniqueId.slice(2) : uniqueId;
  const result = await callReadOnly("halo-credit", "get-credit-data", [
    bufferCV(Buffer.from(hexBytes, "hex")),
  ]);
  const json = cvToJSON(result) as {
    value: Record<string, { value: number }> | null;
  };
  if (!json.value) return null;

  return {
    score: json.value["score"].value,
    totalPayments: json.value["total-payments"].value,
    onTimePayments: json.value["on-time-payments"].value,
    latePayments: json.value["late-payments"].value,
    circlesCompleted: json.value["circles-completed"].value,
    circlesDefaulted: json.value["circles-defaulted"].value,
    totalVolume: json.value["total-volume"].value,
    firstActivity: json.value["first-activity"].value,
    lastUpdated: json.value["last-updated"].value,
  };
}

export interface OnChainCircleInfo {
  name: string;
  creator: string;
  contributionAmount: number;
  totalMembers: number;
  currentRound: number;
  status: number;
  createdAt: number;
  startBlock: number;
  roundDuration: number;
  gracePeriod: number;
  totalContributed: number;
  totalPaidOut: number;
  tokenType: number;
  tokenContract: string | null;
}

/**
 * Get typed circle details from on-chain.
 */
export async function getCircleInfo(
  circleId: number,
): Promise<OnChainCircleInfo | null> {
  try {
    const result = await callReadOnly("halo-circle", "get-circle", [
      uintCV(circleId),
    ]);
    const json = cvToJSON(result) as {
      value: Record<string, { value: unknown }> | null;
    };
    if (!json.value) return null;

    const v = json.value;
    return {
      name: v["name"].value as string,
      creator: (v["creator"] as { value: string }).value,
      contributionAmount: Number(v["contribution-amount"].value),
      totalMembers: Number(v["total-members"].value),
      currentRound: Number(v["current-round"].value),
      status: Number(v["status"].value),
      createdAt: Number(v["created-at"].value),
      startBlock: Number(v["start-block"].value),
      roundDuration: Number(v["round-duration"].value),
      gracePeriod: Number(v["grace-period"].value),
      totalContributed: Number(v["total-contributed"].value),
      totalPaidOut: Number(v["total-paid-out"].value),
      tokenType: Number(v["token-type"].value),
      tokenContract: v["token-contract"]?.value
        ? String((v["token-contract"].value as { value: string }).value)
        : null,
    };
  } catch (err) {
    console.error("[stacks] getCircleInfo failed for circle", circleId, err);
    return null;
  }
}

/**
 * Check if a wallet is bound on-chain.
 */
export async function isWalletBoundOnChain(
  wallet: string,
): Promise<boolean> {
  const result = await callReadOnly("halo-identity", "is-wallet-bound", [
    standardPrincipalCV(wallet),
  ]);
  const json = cvToJSON(result);
  return (json as { value: boolean }).value === true;
}

/**
 * Get unique ID for a wallet from on-chain.
 */
export async function getIdByWallet(
  wallet: string,
): Promise<string | null> {
  const result = await callReadOnly("halo-identity", "get-id-by-wallet", [
    standardPrincipalCV(wallet),
  ]);
  const json = cvToJSON(result);
  const val = (json as { value: string | null }).value;
  return val ? `0x${val}` : null;
}

/**
 * Verify a transaction status via Hiro API.
 */
export async function getTransactionStatus(
  txId: string,
): Promise<"success" | "pending" | "failed"> {
  const apiUrl =
    process.env.STACKS_API_URL || "https://api.testnet.hiro.so";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return "pending";
    }

    const data = (await response.json()) as { tx_status: string };
    if (data.tx_status === "success") return "success";
    if (data.tx_status === "pending" || data.tx_status === "submitted")
      return "pending";
    return "failed";
  } catch (err) {
    console.error("[stacks] getTransactionStatus fetch failed:", err);
    return "pending";
  } finally {
    clearTimeout(timeout);
  }
}
