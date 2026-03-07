"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { TOKEN_DECIMALS } from "../../lib/contracts";

interface AssetInfo {
  assetType: number;
  name: string;
  deposited: string;
  ltvPercent: number;
  priceUsd?: number;
  decimals?: number;
}

interface Commitment {
  circleId: string;
  circleName: string;
  contributionAmount: string;
  status: string;
}

interface CapacityBarProps {
  assets: AssetInfo[];
  commitments: Commitment[];
}

// Fallback prices when on-chain prices aren't available
const FALLBACK_PRICES: Record<number, number> = {
  0: 1,        // USDCx = $1
  1: 65000,    // sBTC = $65,000
  2: 0.50,     // STX = $0.50
  3: 1,        // hUSD = $1
};

export function CapacityBar({ assets, commitments }: CapacityBarProps) {
  let totalCapacityUsd = 0;
  for (const a of assets) {
    const decimals = TOKEN_DECIMALS[a.assetType] || a.decimals || 6;
    const depositedNum = Number(BigInt(a.deposited || "0")) / Math.pow(10, decimals);
    const priceUsd = a.priceUsd || FALLBACK_PRICES[a.assetType] || 0;
    totalCapacityUsd += depositedNum * priceUsd * (a.ltvPercent / 100);
  }

  let committedUsd = 0;
  for (const c of commitments) {
    committedUsd += Number(BigInt(c.contributionAmount || "0")) / 1_000_000;
  }

  const availableUsd = Math.max(0, totalCapacityUsd - committedUsd);
  const usedPercent = totalCapacityUsd > 0
    ? Math.min(100, (committedUsd / totalCapacityUsd) * 100)
    : 0;

  return (
    <Card className="bg-[#0d1117] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Circle Capacity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Committed</span>
            <span className="text-white font-mono">
              ${committedUsd.toFixed(2)} / ${totalCapacityUsd.toFixed(2)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usedPercent}%`,
                background: usedPercent > 90
                  ? "rgb(239, 68, 68)"
                  : usedPercent > 70
                    ? "rgb(234, 179, 8)"
                    : "rgb(34, 197, 94)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Available: ${availableUsd.toFixed(2)}</span>
            <span>{usedPercent.toFixed(0)}% committed</span>
          </div>
        </div>

        {commitments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400 font-medium">Active Commitments</p>
            {commitments.map((c) => (
              <div
                key={c.circleId}
                className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0"
              >
                <span className="text-neutral-300 truncate">{c.circleName}</span>
                <span className="text-neutral-400 font-mono text-xs">
                  ${(Number(BigInt(c.contributionAmount || "0")) / 1_000_000).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
