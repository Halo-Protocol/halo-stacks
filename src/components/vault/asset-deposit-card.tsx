"use client";

import { useState } from "react";
import { uintCV, contractPrincipalCV } from "@stacks/transactions";
import { useContractCall } from "../../hooks/use-contract-call";
import { fetchApi } from "../../hooks/use-api";
import { DEPLOYER_ADDRESS } from "../../lib/contracts";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronUp, Coins, Zap, Shield } from "lucide-react";
import { toast } from "sonner";

interface AssetDepositCardProps {
  assetType: number;
  name: string;
  deposited: string;
  ltvPercent: number;
  onUpdate: () => void;
}

const ASSET_DECIMALS: Record<number, number> = {
  0: 6,  // hUSD
  1: 6,  // STX
  2: 8,  // sBTC
};

const ASSET_CONTRACT_FN: Record<number, { deposit: string; withdraw: string }> = {
  0: { deposit: "deposit-husd", withdraw: "withdraw-husd" },
  1: { deposit: "deposit-stx", withdraw: "withdraw-stx" },
  2: { deposit: "deposit-sbtc", withdraw: "withdraw-sbtc" },
};

const ASSET_META: Record<number, { icon: typeof Coins; color: string; bgColor: string; apy: string; description: string }> = {
  0: { icon: Coins, color: "text-green-400", bgColor: "bg-green-500/20", apy: "4.2%", description: "Stablecoin" },
  1: { icon: Zap, color: "text-purple-400", bgColor: "bg-purple-500/20", apy: "3.8%", description: "Native token" },
  2: { icon: Shield, color: "text-orange-400", bgColor: "bg-orange-500/20", apy: "2.1%", description: "Bitcoin-backed" },
};

function formatAssetAmount(microAmount: string, assetType: number): string {
  const decimals = ASSET_DECIMALS[assetType] || 6;
  const amount = Number(BigInt(microAmount)) / Math.pow(10, decimals);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals > 2 ? 4 : 2,
  });
}

export function AssetDepositCard({
  assetType,
  name,
  deposited,
  ltvPercent,
  onUpdate,
}: AssetDepositCardProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [expanded, setExpanded] = useState(false);
  const { loading: txLoading, call } = useContractCall();
  const [submitting, setSubmitting] = useState(false);

  const decimals = ASSET_DECIMALS[assetType] || 6;
  const microAmount = Math.floor(parseFloat(amount || "0") * Math.pow(10, decimals));
  const meta = ASSET_META[assetType] || ASSET_META[0];
  const IconComponent = meta.icon;

  const handleAction = async () => {
    if (microAmount <= 0) return;
    setSubmitting(true);
    try {
      const fnName = ASSET_CONTRACT_FN[assetType]?.[mode];
      if (!fnName) throw new Error("Unknown asset type");

      const TOKEN_CONTRACTS: Record<number, string> = {
        0: "halo-mock-token",
        2: "halo-mock-sbtc",
      };
      const tokenName = TOKEN_CONTRACTS[assetType];
      const functionArgs = tokenName
        ? [contractPrincipalCV(DEPLOYER_ADDRESS, tokenName), uintCV(microAmount)]
        : [uintCV(microAmount)];

      await call({
        contractName: "halo-vault-v2",
        functionName: fnName,
        functionArgs,
        onFinish: async ({ txId }) => {
          await fetchApi(`/api/vault-v2/${mode}`, {
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

  const depositedFormatted = formatAssetAmount(deposited, assetType);
  const hasDeposit = deposited !== "0" && deposited !== "";

  return (
    <Card className="bg-[#111827] border-white/10 hover:border-white/20 transition-colors">
      <CardContent className="p-5 space-y-4">
        {/* Asset header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${meta.bgColor} flex items-center justify-center`}>
              <IconComponent className={`h-5 w-5 ${meta.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              <p className="text-xs text-neutral-500">{meta.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-white/20 text-neutral-400 text-xs">
            {ltvPercent}% LTV
          </Badge>
        </div>

        {/* Reward rate */}
        <div className="text-2xl font-bold text-white">
          {meta.apy} <span className="text-sm font-normal text-neutral-400">rewards</span>
        </div>

        {/* Deposited balance */}
        {hasDeposit && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <span className="text-xs text-neutral-400">Your balance</span>
            <span className="text-sm text-white font-mono">{depositedFormatted} {name}</span>
          </div>
        )}

        {/* Action buttons */}
        {!expanded ? (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => { setMode("deposit"); setExpanded(true); }}
            >
              Stake
            </Button>
            {hasDeposit && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setMode("withdraw"); setExpanded(true); }}
              >
                Withdraw
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={mode === "deposit" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("deposit")}
              >
                <ArrowDownToLine className="h-3 w-3 mr-1" />
                Stake
              </Button>
              {hasDeposit && (
                <Button
                  variant={mode === "withdraw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("withdraw")}
                >
                  <ArrowUpFromLine className="h-3 w-3 mr-1" />
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

            {/* Amount input */}
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                {mode === "deposit" ? "Stake" : "Withdraw"} amount ({name})
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step={1 / Math.pow(10, decimals)}
                autoFocus
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleAction}
              disabled={microAmount <= 0 || submitting || txLoading}
              className="w-full"
            >
              {submitting || txLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${mode === "deposit" ? "Stake" : "Withdraw"} ${name}`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
