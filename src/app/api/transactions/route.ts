import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../lib/middleware";
import { applyRateLimit, DEFAULT_RATE_LIMIT } from "../../../lib/api-helpers";
import { getUserTransactions } from "../../../lib/tx-tracker";

export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "transactions", DEFAULT_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const transactions = await getUserTransactions(user.id);

  return NextResponse.json({
    transactions: transactions.map((tx) => ({
      id: tx.id,
      txId: tx.txId,
      txType: tx.txType,
      status: tx.status,
      contractName: tx.contractName,
      functionName: tx.functionName,
      submittedAt: tx.submittedAt.toISOString(),
      confirmedAt: tx.confirmedAt?.toISOString() ?? null,
      failedAt: tx.failedAt?.toISOString() ?? null,
      error: tx.error,
    })),
  });
}
