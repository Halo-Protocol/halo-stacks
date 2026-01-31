"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { uintCV } from "@stacks/transactions";
import { useApi, fetchApi } from "../../../hooks/use-api";
import { useContractCall } from "../../../hooks/use-contract-call";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Users, Loader2 } from "lucide-react";
import { formatSTX } from "../../../lib/contracts";
import { toast } from "sonner";

interface CirclePreview {
  id: string;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  currentMembers: number;
  tokenType: number;
  status: string;
  creatorName: string;
}

export default function JoinCirclePage() {
  const params = useParams();
  const code = params.code as string;
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { loading: txLoading, call } = useContractCall();
  const [joining, setJoining] = useState(false);

  const { data: circle, loading, error } = useApi<CirclePreview>(
    `/api/circles/invite/${code}`,
  );

  const handleJoin = async () => {
    if (!circle) return;
    setJoining(true);
    try {
      const joinResult = await fetchApi<{
        membershipId: string;
        onChainCircleId: number;
      }>(`/api/circles/${circle.id}/join`, { method: "POST" });

      await call({
        contractName: "halo-circle",
        functionName: "join-circle",
        functionArgs: [uintCV(joinResult.onChainCircleId)],
        onFinish: () => {
          toast.success("Join transaction submitted!");
          router.push(`/circles/${circle.id}`);
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to join circle",
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-lg py-8">
        <Card>
          <CardContent className="pt-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="container max-w-lg py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error || "Circle not found"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{circle.name}</CardTitle>
          <CardDescription>
            Created by {circle.creatorName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {formatSTX(circle.contributionAmount)}
              </p>
              <p className="text-xs text-muted-foreground">STX / round</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {circle.currentMembers}/{circle.totalMembers}
              </p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge
              variant={circle.status === "forming" || circle.status === "pending_creation" ? "secondary" : "outline"}
            >
              {circle.status === "forming" || circle.status === "pending_creation"
                ? "Accepting Members"
                : circle.status}
            </Badge>
          </div>

          {sessionStatus === "unauthenticated" ? (
            <Button
              className="w-full h-12"
              onClick={() =>
                router.push(`/signin?callbackUrl=/join/${code}`)
              }
            >
              Sign In to Join
            </Button>
          ) : session?.user?.status === "pending_wallet" ? (
            <Button
              className="w-full h-12"
              onClick={() => router.push("/connect-wallet")}
            >
              Connect Wallet First
            </Button>
          ) : circle.status === "forming" || circle.status === "pending_creation" ? (
            <Button
              className="w-full h-12"
              onClick={handleJoin}
              disabled={joining || txLoading}
            >
              {joining || txLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Circle"
              )}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              This circle is no longer accepting new members.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
