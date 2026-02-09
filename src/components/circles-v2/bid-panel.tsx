"use client";

import { useState } from "react";
import { uintCV } from "@stacks/transactions";
import { useContractCall } from "../../hooks/use-contract-call";
import { fetchApi } from "../../hooks/use-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { formatSTX } from "../../lib/contracts";

interface Bid {
  userId: string;
  userName: string;
  round: number;
  bidAmount: string;
  bidAt: string;
}

interface BidPanelProps {
  circleId: string;
  onChainId: number;
  currentRound: number;
  contributionAmount: string;
  totalMembers: number;
  bids: Bid[];
  hasWon: boolean;
  hasBid: boolean;
  onUpdate: () => void;
}

export function BidPanel({
  circleId,
  onChainId,
  currentRound,
  contributionAmount,
  totalMembers,
  bids,
  hasWon,
  hasBid,
  onUpdate,
}: BidPanelProps) {
  const [bidAmount, setBidAmount] = useState("");
  const { loading: txLoading, call } = useContractCall();
  const [submitting, setSubmitting] = useState(false);

  const poolTotal = BigInt(contributionAmount) * BigInt(totalMembers);
  const maxBid = poolTotal; // Max they can bid
  const bidMicroSTX = Math.floor(parseFloat(bidAmount || "0") * 1_000_000);

  const handleBid = async () => {
    if (bidMicroSTX <= 0) return;
    setSubmitting(true);
    try {
      await call({
        contractName: "halo-circle-v2",
        functionName: "place-bid",
        functionArgs: [uintCV(onChainId), uintCV(bidMicroSTX)],
        onFinish: async ({ txId }) => {
          await fetchApi(`/api/circles-v2/${circleId}/bid`, {
            method: "POST",
            body: JSON.stringify({
              round: currentRound,
              bidAmount: bidMicroSTX.toString(),
              txId,
            }),
          });
          toast.success("Bid submitted!");
          setBidAmount("");
          onUpdate();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-[#111827] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Bid for Round {currentRound + 1}
        </CardTitle>
        <CardDescription>
          Pool total: {formatSTX(poolTotal.toString())} STX. Lowest bid wins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current bids */}
        {bids.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Current Bids (lowest first)</p>
            {bids.map((b, i) => (
              <div
                key={`${b.userId}-${b.round}`}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-neutral-300">
                  {i === 0 && "🏆 "}{b.userName}
                </span>
                <span className="font-mono text-neutral-400">
                  {formatSTX(b.bidAmount)} STX
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Place bid form */}
        {hasWon ? (
          <p className="text-sm text-neutral-400 text-center py-2">
            You already won a previous round.
          </p>
        ) : hasBid ? (
          <p className="text-sm text-neutral-400 text-center py-2">
            You have already bid this round.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                Your Bid (STX) - bid the lowest you would accept
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="0"
                step="0.000001"
              />
              {bidMicroSTX > 0 && (
                <p className="text-xs text-neutral-500">
                  = {formatSTX(bidMicroSTX)} STX ({((bidMicroSTX / Number(poolTotal)) * 100).toFixed(1)}% of pool)
                </p>
              )}
            </div>
            <Button
              onClick={handleBid}
              disabled={bidMicroSTX <= 0 || submitting || txLoading}
              className="w-full"
            >
              {submitting || txLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Gavel className="h-4 w-4 mr-2" />
                  Place Bid
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
