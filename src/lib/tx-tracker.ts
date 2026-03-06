/**
 * Transaction Status Tracker — polls Hiro API for pending transactions
 * and updates their status in the database.
 */
import { prisma } from "./db";
import { logger } from "./logger";
import { getTransactionStatus } from "./stacks";

/**
 * Check and update all pending transactions.
 */
export async function pollPendingTransactions(): Promise<{
  checked: number;
  confirmed: number;
  failed: number;
}> {
  const pending = await prisma.pendingTransaction.findMany({
    where: { status: "pending" },
    orderBy: { submittedAt: "asc" },
    take: 50,
  });

  let confirmed = 0;
  let failed = 0;

  for (const tx of pending) {
    try {
      const status = await getTransactionStatus(tx.txId);

      if (status === "success") {
        await prisma.pendingTransaction.update({
          where: { id: tx.id },
          data: { status: "confirmed", confirmedAt: new Date() },
        });
        confirmed++;
        logger.info({ txId: tx.txId, txType: tx.txType }, "Transaction confirmed");
      } else if (status === "failed") {
        await prisma.pendingTransaction.update({
          where: { id: tx.id },
          data: { status: "failed", failedAt: new Date(), error: "Transaction failed on-chain" },
        });
        failed++;
        logger.warn({ txId: tx.txId, txType: tx.txType }, "Transaction failed on-chain");
      }
      // "pending" stays as-is
    } catch (err) {
      logger.error({ txId: tx.txId, err }, "Error checking transaction status");
    }
  }

  return { checked: pending.length, confirmed, failed };
}

/**
 * Record a new pending transaction for tracking.
 */
export async function trackTransaction(params: {
  txId: string;
  userId?: string;
  txType: string;
  contractName?: string;
  functionName?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  await prisma.pendingTransaction.create({
    data: {
      txId: params.txId,
      userId: params.userId,
      txType: params.txType,
      contractName: params.contractName,
      functionName: params.functionName,
      metadata: params.metadata ?? undefined,
    },
  });
}

/**
 * Get transaction history for a user.
 */
export async function getUserTransactions(userId: string, limit = 20) {
  return prisma.pendingTransaction.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}
