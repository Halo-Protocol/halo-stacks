"use client";

import { useState } from "react";
import { uintCV, contractPrincipalCV } from "@stacks/transactions";
import { useContractCall } from "../../hooks/use-contract-call";
import { fetchApi } from "../../hooks/use-api";
import { DEPLOYER_ADDRESS, CONTRACTS, TOKEN_DECIMALS } from "../../lib/contracts";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ChevronUp, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface StrategyCardProps {
  assetType: number;
  name: string;
  deposited: string;
  apy: number;
  strategyName: string;
  isActive: boolean;
  priceUsd: number;
  ltvPercent: number;
  totalDeposited: string;
  decimals: number;
  disabled?: boolean;
  onUpdate: () => void;
}

const ASSET_COLORS: Record<number, { color: string; bg: string; border: string }> = {
  0: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  1: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  2: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  3: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

const ASSET_ICONS: Record<number, string> = {
  0: "$",   // USDCx
  1: "₿",   // sBTC
  2: "⚡",  // STX
  3: "ℍ",   // hUSD
};

const STRATEGY_DESCRIPTIONS: Record<number, string> = {
  0: "Earn interest by lending USDCx via Granite Protocol",
  1: "Earn BTC rewards from PoX Dual Stacking",
  2: "Earn rewards via Proof of Transfer stacking",
  3: "Stable savings with protocol yield",
};

// V3 contract function names per asset
const V3_FUNCTIONS: Record<number, { deposit: string; withdraw: string }> = {
  0: { deposit: "deposit-token", withdraw: "withdraw-token" },
  1: { deposit: "deposit-token", withdraw: "withdraw-token" },
  2: { deposit: "deposit-stx", withdraw: "withdraw-stx" },
  3: { deposit: "deposit-token", withdraw: "withdraw-token" },
};

// Token contract principals for SIP-010 tokens
const TOKEN_PRINCIPALS: Record<number, { address: string; name: string } | null> = {
  0: { address: CONTRACTS.usdcx.address, name: CONTRACTS.usdcx.name },
  1: { address: CONTRACTS.realSbtc.address, name: CONTRACTS.realSbtc.name },
  2: null, // STX is native, no token contract
  3: { address: DEPLOYER_ADDRESS, name: "halo-mock-token" },
};

function formatAmount(microAmount: string, decimals: number): string {
  const amount = Number(BigInt(microAmount)) / Math.pow(10, decimals);
  if (amount === 0) return "0";
  if (amount < 0.01) return amount.toFixed(decimals > 6 ? 8 : 6);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 6 ? 8 : 2,
  });
}

export function StrategyCard({
  assetType,
  name,
  deposited,
  apy,
  strategyName,
  isActive,
  priceUsd,
  ltvPercent,
  totalDeposited,
  decimals,
  disabled,
  onUpdate,
}: StrategyCardProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [expanded, setExpanded] = useState(false);
  const { loading: txLoading, call } = useContractCall();
  const [submitting, setSubmitting] = useState(false);

  const effectiveDecimals = TOKEN_DECIMALS[assetType] || decimals || 6;
  const microAmount = Math.floor(parseFloat(amount || "0") * Math.pow(10, effectiveDecimals));
  const colors = ASSET_COLORS[assetType] || ASSET_COLORS[0];
  const depositedFormatted = formatAmount(deposited, effectiveDecimals);
  const hasDeposit = deposited !== "0" && deposited !== "";
  const depositedUsd = hasDeposit && priceUsd > 0
    ? (Number(BigInt(deposited)) / Math.pow(10, effectiveDecimals)) * priceUsd
    : 0;
  const tvlFormatted = formatAmount(totalDeposited, effectiveDecimals);

  const handleAction = async () => {
    if (microAmount <= 0) return;
    setSubmitting(true);
    try {
      const fns = V3_FUNCTIONS[assetType];
      if (!fns) throw new Error("Unknown asset type");

      const fnName = mode === "deposit" ? fns.deposit : fns.withdraw;
      const tokenPrincipal = TOKEN_PRINCIPALS[assetType];

      const functionArgs = tokenPrincipal
        ? [contractPrincipalCV(tokenPrincipal.address, tokenPrincipal.name), uintCV(assetType), uintCV(microAmount)]
        : [uintCV(microAmount)];

      await call({
        contractName: "halo-vault-v3",
        functionName: fnName,
        functionArgs,
        onFinish: async ({ txId }) => {
          await fetchApi(`/api/vault-v3/${mode}`, {
            method: "POST",
            body: JSON.stringify({
              assetType,
              amount: microAmount.toString(),
              txId,
            }),
          });
          toast.success(`${mode === "deposit" ? "Deposit" : "Withdrawal"} TX submitted!`);
          setAmount("");
          setExpanded(false);
          onUpdate();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={`bg-[#0d1117] border-white/10 hover:${colors.border} transition-all`}>
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center text-xl`}>
              {ASSET_ICONS[assetType]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{name}</h3>
                {isActive && <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">Live</Badge>}
              </div>
              <p className="text-xs text-neutral-500">
                {strategyName || STRATEGY_DESCRIPTIONS[assetType] || "Yield strategy"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${apy > 0 ? colors.color : "text-neutral-500"}`}>
              {apy > 0 ? `${apy}%` : "—"}
            </div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">APY</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 py-2 px-3 rounded-lg bg-white/[0.03]">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase">Your Balance</p>
            <p className="text-sm text-white font-mono">{depositedFormatted}</p>
            {depositedUsd > 0 && (
              <p className="text-[10px] text-neutral-500">${depositedUsd.toFixed(2)}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase">TVL</p>
            <p className="text-sm text-white font-mono">{tvlFormatted}</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase">LTV</p>
            <p className="text-sm text-white font-mono">{ltvPercent}%</p>
          </div>
        </div>

        <p className="text-[10px] text-neutral-600 px-1">
          Yield is distributed by the protocol admin from real DeFi strategies.
        </p>

        {/* Action area */}
        {!expanded ? (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => { setMode("deposit"); setExpanded(true); }}
            >
              <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
              Deposit
            </Button>
            {hasDeposit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setMode("withdraw"); setExpanded(true); }}
              >
                <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" />
                Withdraw
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 border-t border-white/5 pt-3">
            <div className="flex gap-2">
              <Button
                variant={mode === "deposit" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("deposit")}
              >
                Deposit
              </Button>
              {hasDeposit && (
                <Button
                  variant={mode === "withdraw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("withdraw")}
                >
                  Withdraw
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-neutral-500"
                onClick={() => { setExpanded(false); setAmount(""); }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                {mode === "deposit" ? "Deposit" : "Withdraw"} amount ({name})
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step={1 / Math.pow(10, effectiveDecimals)}
                  autoFocus
                  className="flex-1"
                />
                {mode === "withdraw" && hasDeposit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => setAmount(depositedFormatted)}
                  >
                    Max
                  </Button>
                )}
              </div>
              {microAmount > 0 && priceUsd > 0 && (
                <p className="text-[10px] text-neutral-500">
                  ≈ ${((microAmount / Math.pow(10, effectiveDecimals)) * priceUsd).toFixed(2)} USD
                </p>
              )}
            </div>

            <Button
              onClick={handleAction}
              disabled={microAmount <= 0 || submitting || txLoading || disabled}
              className="w-full"
              size="sm"
            >
              {submitting || txLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${mode === "deposit" ? "Deposit" : "Withdraw"} ${name}`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
