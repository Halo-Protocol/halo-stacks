"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { TOKEN_DECIMALS, VAULT_V3_ASSET_TYPES } from "../../lib/contracts";
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink } from "lucide-react";

interface Transaction {
  id: string;
  assetType: number;
  amount: string;
  action: string;
  txId: string | null;
  createdAt: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const ASSET_NAMES: Record<number, string> = {
  [VAULT_V3_ASSET_TYPES.USDCX]: "USDCx",
  [VAULT_V3_ASSET_TYPES.SBTC]: "sBTC",
  [VAULT_V3_ASSET_TYPES.STX]: "STX",
  [VAULT_V3_ASSET_TYPES.HUSD]: "hUSD",
};

function formatAmount(microAmount: string, assetType: number): string {
  const decimals = TOKEN_DECIMALS[assetType] || 6;
  const amount = Number(BigInt(microAmount)) / Math.pow(10, decimals);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 6 ? 8 : 2,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const explorerUrl = process.env.NEXT_PUBLIC_STACKS_NETWORK === "testnet"
  ? "https://explorer.hiro.so/txid/"
  : "https://explorer.hiro.so/txid/";

const chainParam = process.env.NEXT_PUBLIC_STACKS_NETWORK === "testnet" ? "?chain=testnet" : "";

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#0d1117] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.map((tx) => {
          const isDeposit = tx.action === "deposit";
          return (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDeposit ? "bg-green-500/10" : "bg-red-500/10"
                }`}>
                  {isDeposit ? (
                    <ArrowDownToLine className="h-4 w-4 text-green-400" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-white">
                    {isDeposit ? "Deposit" : "Withdraw"}{" "}
                    <span className="font-mono">{formatAmount(tx.amount, tx.assetType)}</span>{" "}
                    {ASSET_NAMES[tx.assetType] || `Asset ${tx.assetType}`}
                  </p>
                  <p className="text-[11px] text-neutral-500">{formatDate(tx.createdAt)}</p>
                </div>
              </div>
              {tx.txId && (
                <a
                  href={`${explorerUrl}${tx.txId}${chainParam}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
