"use client";

import { useState } from "react";
import { fetchApi } from "../../hooks/use-api";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Droplets, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FaucetResult {
  hUsdTxId: string | null;
  sbtcTxId: string | null;
  hUsdAmount: string;
  sbtcAmount: string;
  message: string;
}

export function FaucetCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FaucetResult | null>(null);

  const requestTokens = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<FaucetResult>("/api/faucet", {
        method: "POST",
      });
      setResult(data);
      toast.success(
        "Test tokens requested! They'll arrive in ~10-30 minutes.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Faucet request failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Test Tokens
        </CardTitle>
        <Droplets className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get free test tokens for lending circles on testnet.
        </p>
        <div className="flex gap-2">
          <Badge variant="secondary">1,000 hUSD</Badge>
          <Badge variant="secondary">0.01 sBTC</Badge>
        </div>

        {result ? (
          <div className="space-y-2 text-sm">
            {result.hUsdTxId && (
              <p className="text-green-600">
                hUSD mint: {result.hUsdTxId.slice(0, 12)}...
              </p>
            )}
            {result.sbtcTxId && (
              <p className="text-green-600">
                sBTC mint: {result.sbtcTxId.slice(0, 12)}...
              </p>
            )}
            <p className="text-xs text-muted-foreground">{result.message}</p>
          </div>
        ) : (
          <Button
            onClick={requestTokens}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4 mr-2" />
                Get Test Tokens
              </>
            )}
          </Button>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Need STX for gas?{" "}
            <a
              href="https://explorer.hiro.so/sandbox/faucet?chain=testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              Hiro STX Faucet
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
