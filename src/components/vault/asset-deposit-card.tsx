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
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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

function formatAssetAmount(microAmount: string, assetType: number): string {
  const decimals = ASSET_DECIMALS[assetType] || 6;
  const amount = Number(BigInt(microAmount)) / Math.pow(10, decimals);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
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
  const { loading: txLoading, call } = useContractCall();
  const [submitting, setSubmitting] = useState(false);

  const decimals = ASSET_DECIMALS[assetType] || 6;
  const microAmount = Math.floor(parseFloat(amount || "0") * Math.pow(10, decimals));

  const handleAction = async () => {
    if (microAmount <= 0) return;
    setSubmitting(true);
    try {
      const fnName = ASSET_CONTRACT_FN[assetType]?.[mode];
      if (!fnName) throw new Error("Unknown asset type");

      // STX deposit/withdraw only takes amount; hUSD and sBTC require token trait as first arg
      const TOKEN_CONTRACTS: Record<number, string> = {
        0: "halo-mock-token",  // hUSD
        2: "halo-mock-sbtc",   // sBTC
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
          // Record in DB
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

  return (
    <Card className="bg-[#111827] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant="outline" className="border-white/20 text-neutral-400">
            {ltvPercent}% LTV
          </Badge>
        </div>
        <p className="text-sm text-neutral-400">
          Deposited: <span className="text-white font-mono">{depositedFormatted} {name}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={mode === "deposit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("deposit")}
          >
            <ArrowDownToLine className="h-3 w-3 mr-1" />
            Deposit
          </Button>
          <Button
            variant={mode === "withdraw" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("withdraw")}
          >
            <ArrowUpFromLine className="h-3 w-3 mr-1" />
            Withdraw
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-neutral-400">Amount ({name})</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step={1 / Math.pow(10, decimals)}
          />
        </div>

        <Button
          onClick={handleAction}
          disabled={microAmount <= 0 || submitting || txLoading}
          className="w-full"
        >
          {submitting || txLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `${mode === "deposit" ? "Deposit" : "Withdraw"} ${name}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
