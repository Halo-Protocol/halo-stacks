"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { uintCV } from "@stacks/transactions";
import { useApi } from "../../../hooks/use-api";
import { useContractCall } from "../../../hooks/use-contract-call";
import { fetchApi } from "../../../hooks/use-api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Separator } from "../../../components/ui/separator";
import { Badge } from "../../../components/ui/badge";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Users,
  Gavel,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { formatSTX, formatAddress } from "../../../lib/contracts";
import { RoundPhaseIndicator } from "../../../components/circles-v2/round-phase-indicator";
import { BidPanel } from "../../../components/circles-v2/bid-panel";
import { RoundHistory } from "../../../components/circles-v2/round-history";
import { RepaymentSchedule } from "../../../components/circles-v2/repayment-schedule";

interface CircleV2Detail {
  id: string;
  onChainId: number | null;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  currentRound: number;
  roundDuration: number;
  bidWindowBlocks: number;
  gracePeriod: number;
  tokenType: number;
  inviteCode: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  creator: { id: string; name: string; walletAddress: string | null };
  members: {
    id: string;
    userId: string;
    name: string;
    walletAddress: string | null;
    status: string;
    hasWon: boolean;
    wonRound: number | null;
    wonAmount: string | null;
    totalRepaid: string;
    joinedAt: string | null;
  }[];
  contributions: {
    userId: string;
    round: number;
    amount: string;
    onTime: boolean;
    txId: string;
    contributedAt: string;
  }[];
  bids: {
    userId: string;
    round: number;
    bidAmount: string;
    txId: string | null;
    bidAt: string;
  }[];
  roundResults: {
    round: number;
    winnerId: string;
    winnerName: string;
    winningBid: string;
    poolTotal: string;
    protocolFee: string;
    surplus: string;
    dividendPerMember: string;
    settleTxId: string | null;
    settledAt: string;
  }[];
  repayments: {
    userId: string;
    repaymentRound: number;
    amountDue: string;
    amountPaid: string;
    onTime: boolean;
    txId: string | null;
    paidAt: string | null;
  }[];
}

export default function CircleV2DetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const circleId = params.id as string;

  const { loading: txLoading, call } = useContractCall();
  const [contributeAmount, setContributeAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [sessionStatus, router]);

  const { data: circle, loading, refetch } = useApi<CircleV2Detail>(
    circleId ? `/api/circles-v2/${circleId}` : null,
  );

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="container max-w-3xl py-8">
        <p className="text-neutral-400">Circle not found.</p>
      </div>
    );
  }

  const currentUserId = session?.user?.id || "";
  const myMember = circle.members.find((m) => m.userId === currentUserId);
  const isMember = !!myMember;
  const hasWon = myMember?.hasWon || false;

  // Current round bids
  const currentBids = circle.bids
    .filter((b) => b.round === circle.currentRound)
    .map((b) => {
      const member = circle.members.find((m) => m.userId === b.userId);
      return {
        ...b,
        userName: member?.name || formatAddress(b.userId),
      };
    })
    .sort((a, b) => Number(BigInt(a.bidAmount) - BigInt(b.bidAmount)));

  const hasBid = currentBids.some((b) => b.userId === currentUserId);

  // Current round contributions
  const currentContributions = circle.contributions.filter(
    (c) => c.round === circle.currentRound,
  );
  const hasContributed = currentContributions.some(
    (c) => c.userId === currentUserId,
  );

  const handleContribute = async () => {
    if (!circle.onChainId) return;
    const microAmount = Math.floor(parseFloat(contributeAmount || "0") * 1_000_000);
    if (microAmount <= 0) return;
    setActionLoading(true);
    try {
      await call({
        contractName: "halo-circle-v2",
        functionName: "contribute-stx-v2",
        functionArgs: [uintCV(circle.onChainId)],
        onFinish: async ({ txId }) => {
          await fetchApi(`/api/circles-v2/${circleId}/contribute`, {
            method: "POST",
            body: JSON.stringify({
              round: circle.currentRound,
              amount: microAmount.toString(),
              txId,
              onTime: true,
            }),
          });
          toast.success("Contribution TX submitted!");
          setContributeAmount("");
          refetch();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to contribute");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!circle.onChainId) return;
    const microAmount = Math.floor(parseFloat(repayAmount || "0") * 1_000_000);
    if (microAmount <= 0) return;
    setActionLoading(true);
    try {
      await call({
        contractName: "halo-circle-v2",
        functionName: "make-repayment-stx",
        functionArgs: [uintCV(circle.onChainId)],
        onFinish: async ({ txId }) => {
          await fetchApi(`/api/circles-v2/${circleId}/repay`, {
            method: "POST",
            body: JSON.stringify({
              repaymentRound: circle.currentRound,
              amountPaid: microAmount.toString(),
              txId,
              onTime: true,
            }),
          });
          toast.success("Repayment TX submitted!");
          setRepayAmount("");
          refetch();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to repay");
    } finally {
      setActionLoading(false);
    }
  };

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/circles-v2/join/${circle.inviteCode}`
      : "";

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="mb-2 text-neutral-400"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{circle.name}</h1>
            <p className="text-sm text-muted-foreground">
              Created by {circle.creator.name}
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Gavel className="h-3 w-3" />
            Bidding Circle
          </Badge>
        </div>
      </div>

      {/* Phase indicator */}
      <RoundPhaseIndicator
        currentRound={circle.currentRound}
        totalMembers={circle.totalMembers}
        status={circle.status}
      />

      {/* Circle details card */}
      <Card className="bg-[#111827] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Circle Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-500">Contribution</span>
              <p className="text-white font-mono">{formatSTX(circle.contributionAmount)} STX</p>
            </div>
            <div>
              <span className="text-neutral-500">Pool per Round</span>
              <p className="text-white font-mono">
                {formatSTX((BigInt(circle.contributionAmount) * BigInt(circle.totalMembers)).toString())} STX
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Members</span>
              <p className="text-white">{circle.members.length} / {circle.totalMembers}</p>
            </div>
            <div>
              <span className="text-neutral-500">Round Duration</span>
              <p className="text-white">{Math.round(circle.roundDuration / 144)} days</p>
            </div>
            <div>
              <span className="text-neutral-500">Bid Window</span>
              <p className="text-white">{Math.round(circle.bidWindowBlocks / 144)} days</p>
            </div>
            <div>
              <span className="text-neutral-500">Grace Period</span>
              <p className="text-white">{Math.round(circle.gracePeriod / 144)} days</p>
            </div>
          </div>

          {/* Invite link for pending circles */}
          {(circle.status === "pending_creation" || circle.status === "forming") && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-neutral-400 mb-2">Share invite link:</p>
              <div className="flex items-center gap-2 p-2 rounded border border-white/10 bg-black/20">
                <code className="flex-1 text-xs truncate text-neutral-300">
                  {inviteLink}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="bg-[#111827] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {circle.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-300">{m.name}</span>
                  {m.userId === circle.creator.id && (
                    <Badge variant="outline" className="text-[10px] py-0 border-blue-500/30 text-blue-400">
                      Creator
                    </Badge>
                  )}
                  {m.hasWon && (
                    <Badge variant="outline" className="text-[10px] py-0 border-green-500/30 text-green-400">
                      Won R{(m.wonRound ?? 0) + 1}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  {m.walletAddress ? formatAddress(m.walletAddress) : ""}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contribute section */}
      {circle.status === "active" && isMember && !hasContributed && (
        <Card className="bg-[#111827] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" />
              Contribute to Round {circle.currentRound + 1}
            </CardTitle>
            <CardDescription>
              Expected: {formatSTX(circle.contributionAmount)} STX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              placeholder={`${Number(BigInt(circle.contributionAmount)) / 1_000_000}`}
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              min="0"
              step="0.000001"
            />
            <Button
              onClick={handleContribute}
              disabled={
                !contributeAmount || parseFloat(contributeAmount) <= 0 || actionLoading || txLoading
              }
              className="w-full"
            >
              {actionLoading || txLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Contribute"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {hasContributed && circle.status === "active" && (
        <div className="text-center text-sm text-green-400 py-2">
          You have contributed to Round {circle.currentRound + 1}.
        </div>
      )}

      {/* Bid panel */}
      {circle.status === "active" && isMember && circle.onChainId && (
        <BidPanel
          circleId={circleId}
          onChainId={circle.onChainId}
          currentRound={circle.currentRound}
          contributionAmount={circle.contributionAmount}
          totalMembers={circle.totalMembers}
          bids={currentBids}
          hasWon={hasWon}
          hasBid={hasBid}
          onUpdate={refetch}
        />
      )}

      {/* Repayment section for winners */}
      {circle.status === "active" && hasWon && (
        <Card className="bg-[#111827] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Make Repayment</CardTitle>
            <CardDescription>
              Pay your installment for this round
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              placeholder="Amount in STX"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              min="0"
              step="0.000001"
            />
            <Button
              onClick={handleRepay}
              disabled={
                !repayAmount || parseFloat(repayAmount) <= 0 || actionLoading || txLoading
              }
              className="w-full"
            >
              {actionLoading || txLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Make Repayment"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Repayment schedule */}
      <RepaymentSchedule
        repayments={circle.repayments}
        currentUserId={currentUserId}
      />

      {/* Round history */}
      <RoundHistory results={circle.roundResults} />

      {/* Contribution history */}
      {circle.contributions.length > 0 && (
        <Card className="bg-[#111827] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contribution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {circle.contributions.slice(0, 20).map((c, i) => {
                const member = circle.members.find((m) => m.userId === c.userId);
                return (
                  <div
                    key={`${c.userId}-${c.round}-${i}`}
                    className="flex items-center justify-between py-1 border-b border-white/5 last:border-0"
                  >
                    <span className="text-neutral-300">
                      {member?.name || "Unknown"} (R{c.round + 1})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400">
                        {formatSTX(c.amount)} STX
                      </span>
                      {c.onTime ? (
                        <Badge variant="outline" className="text-[10px] py-0 border-green-500/30 text-green-400">
                          On time
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 border-red-500/30 text-red-400">
                          Late
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
