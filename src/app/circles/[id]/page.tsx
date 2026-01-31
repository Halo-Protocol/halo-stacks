"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { uintCV, Pc } from "@stacks/transactions";
import { useApi, fetchApi } from "../../../hooks/use-api";
import { useContractCall } from "../../../hooks/use-contract-call";
import { useWallet } from "../../../components/providers/wallet-provider";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Users,
  Copy,
  Loader2,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatSTX, formatAddress } from "../../../lib/contracts";
import { toast } from "sonner";

interface CircleDetail {
  id: string;
  onChainId: number;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  roundDuration: number;
  gracePeriod: number;
  tokenType: number;
  inviteCode: string;
  status: string;
  creator: { id: string; name: string; walletAddress: string };
  members: {
    userId: string;
    name: string;
    walletAddress: string;
    payoutPosition: number;
    status: string;
  }[];
  contributions: {
    userId: string;
    round: number;
    amount: string;
    onTime: boolean;
    txId: string;
  }[];
  payouts: {
    recipientId: string;
    round: number;
    amount: string;
    txId: string;
  }[];
}

function statusBadge(status: string) {
  switch (status) {
    case "pending_creation":
    case "forming":
      return <Badge variant="secondary">Forming</Badge>;
    case "active":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function CircleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const router = useRouter();
  const { address } = useWallet();
  const { loading: txLoading, call } = useContractCall();
  const [contributing, setContributing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { data: circle, loading, error, refetch } = useApi<CircleDetail>(
    `/api/circles/${id}`,
  );

  if (loading) {
    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !circle) {
    if (error) console.error("[circle-detail] Failed to load circle:", error);
    return (
      <div className="container max-w-3xl py-8 text-center">
        <p className="text-muted-foreground">
          {error ? "Unable to load circle details. Please try again later." : "Circle not found"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { data: onChainData } = useApi<{
    currentRound: number;
    status: number;
  }>(circle?.onChainId ? `/api/circles/${id}/on-chain` : null);
  const currentRound = onChainData?.currentRound ?? 0;
  const isMember = circle.members.some(
    (m) => m.userId === session?.user?.id,
  );
  const isForming = circle.status === "forming" || circle.status === "pending_creation";
  const isActive = circle.status === "active";

  const handleContribute = async () => {
    if (!circle.onChainId || !address) return;
    setContributing(true);
    try {
      await call({
        contractName: "halo-circle",
        functionName: "contribute-stx",
        functionArgs: [uintCV(circle.onChainId)],
        postConditions: [
          Pc.principal(address)
            .willSendEq(circle.contributionAmount)
            .ustx(),
        ],
        onFinish: async (data) => {
          // Record in backend
          await fetchApi(`/api/circles/${id}/contribute`, {
            method: "POST",
            body: JSON.stringify({
              txId: data.txId,
              round: currentRound,
              amount: parseInt(circle.contributionAmount),
              onTime: true,
            }),
          });
          toast.success("Contribution submitted!");
          refetch();
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Contribution failed",
      );
    } finally {
      setContributing(false);
    }
  };

  const handlePayout = async () => {
    if (!circle.onChainId) return;
    setProcessing(true);
    try {
      await call({
        contractName: "halo-circle",
        functionName: "process-payout",
        functionArgs: [uintCV(circle.onChainId)],
        onFinish: () => {
          toast.success("Payout processed!");
          refetch();
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setProcessing(false);
    }
  };

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${circle.inviteCode}`
      : "";

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{circle.name}</h1>
          <p className="text-sm text-muted-foreground">
            Created by {circle.creator.name}
          </p>
        </div>
        {statusBadge(circle.status)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">
              {formatSTX(circle.contributionAmount)}
            </p>
            <p className="text-xs text-muted-foreground">STX / round</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">
              {circle.members.length}/{circle.totalMembers}
            </p>
            <p className="text-xs text-muted-foreground">Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">
              {Math.round(circle.roundDuration / 144)}
            </p>
            <p className="text-xs text-muted-foreground">Days / round</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">
              {formatSTX(
                BigInt(circle.contributionAmount) *
                  BigInt(circle.totalMembers),
              )}
            </p>
            <p className="text-xs text-muted-foreground">Total pot</p>
          </CardContent>
        </Card>
      </div>

      {/* Invite link (while forming) */}
      {isForming && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <span className="text-sm text-muted-foreground">Invite:</span>
            <code className="flex-1 text-sm truncate">{inviteLink}</code>
            <Button variant="ghost" size="sm" onClick={copyInvite}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {isActive && isMember && (
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleContribute}
            disabled={contributing || txLoading}
          >
            {contributing || txLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Contribute {formatSTX(circle.contributionAmount)} STX
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handlePayout}
            disabled={processing || txLoading}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Process Payout"
            )}
          </Button>
        </div>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {circle.members.map((member, i) => (
              <div
                key={member.userId}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {member.payoutPosition || i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatAddress(member.walletAddress || "")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {member.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contributions */}
      {circle.contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {circle.contributions.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {c.onTime ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span>Round {c.round}</span>
                  </div>
                  <span className="font-medium">
                    {formatSTX(c.amount)} STX
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
