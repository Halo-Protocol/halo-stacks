"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface AssetInfo {
  assetType: number;
  name: string;
  deposited: string;
  ltvPercent: number;
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

// Approximate USD prices for capacity estimation (client-side only)
const ASSET_PRICES_USD: Record<number, number> = {
  0: 1,        // hUSD = $1
  1: 0.50,     // STX = $0.50
  2: 65000,    // sBTC = $65,000
};

const ASSET_DECIMALS: Record<number, number> = {
  0: 6,
  1: 6,
  2: 8,
};

export function CapacityBar({ assets, commitments }: CapacityBarProps) {
  // Calculate total capacity in USD
  let totalCapacityUsd = 0;
  for (const a of assets) {
    const decimals = ASSET_DECIMALS[a.assetType] || 6;
    const depositedNum = Number(BigInt(a.deposited || "0")) / Math.pow(10, decimals);
    const priceUsd = ASSET_PRICES_USD[a.assetType] || 0;
    totalCapacityUsd += depositedNum * priceUsd * (a.ltvPercent / 100);
  }

  // Calculate committed amount in USD
  let committedUsd = 0;
  for (const c of commitments) {
    // contributionAmount is in micro-units, assume it's the per-round commitment
    committedUsd += Number(BigInt(c.contributionAmount || "0")) / 1_000_000;
  }

  const availableUsd = Math.max(0, totalCapacityUsd - committedUsd);
  const usedPercent = totalCapacityUsd > 0
    ? Math.min(100, (committedUsd / totalCapacityUsd) * 100)
    : 0;

  return (
    <Card className="bg-[#111827] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Staking Capacity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Used</span>
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
            <span>{usedPercent.toFixed(0)}% used</span>
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
