"use client";

import { Card, CardContent } from "../ui/card";
import { TOKEN_DECIMALS } from "../../lib/contracts";
import { TrendingUp, Wallet } from "lucide-react";

interface AssetInfo {
  assetType: number;
  name: string;
  deposited: string;
  apy: number;
  priceUsd: number;
  decimals: number;
}

interface PortfolioSummaryProps {
  assets: AssetInfo[];
}

export function PortfolioSummary({ assets }: PortfolioSummaryProps) {
  let totalUsd = 0;
  let weightedApy = 0;

  for (const a of assets) {
    const decimals = TOKEN_DECIMALS[a.assetType] || a.decimals || 6;
    const amount = Number(BigInt(a.deposited || "0")) / Math.pow(10, decimals);
    const usd = amount * (a.priceUsd || 0);
    totalUsd += usd;
    weightedApy += usd * a.apy;
  }

  const avgApy = totalUsd > 0 ? weightedApy / totalUsd : 0;

  return (
    <Card className="bg-gradient-to-br from-[#0d1117] to-[#111827] border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400 flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              Your Vault Portfolio
            </p>
            <p className="text-3xl font-bold text-white mt-1">
              ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {avgApy > 0 && (
            <div className="text-right">
              <p className="text-sm text-neutral-400 flex items-center gap-1.5 justify-end">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Avg. APY
              </p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {avgApy.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Mini asset breakdown */}
        {totalUsd > 0 && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
            {assets
              .filter((a) => a.deposited !== "0" && a.deposited !== "")
              .map((a) => {
                const decimals = TOKEN_DECIMALS[a.assetType] || a.decimals || 6;
                const amount = Number(BigInt(a.deposited || "0")) / Math.pow(10, decimals);
                const usd = amount * (a.priceUsd || 0);
                const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
                return (
                  <div key={a.assetType} className="flex-1 text-center">
                    <p className="text-xs text-neutral-500">{a.name}</p>
                    <p className="text-sm font-mono text-white">${usd.toFixed(2)}</p>
                    <p className="text-[10px] text-neutral-500">{pct.toFixed(0)}%</p>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
