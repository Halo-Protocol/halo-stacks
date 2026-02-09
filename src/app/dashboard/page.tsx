"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useApi } from "../../hooks/use-api";
import { useWallet } from "../../components/providers/wallet-provider";
import { CreditScoreCard } from "../../components/dashboard/credit-score-card";
import { CirclesList } from "../../components/dashboard/circles-list";
import { EmptyState } from "../../components/dashboard/empty-state";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Gavel, Plus, Shield, Wallet } from "lucide-react";
import { FaucetCard } from "../../components/dashboard/faucet-card";
import { Badge } from "../../components/ui/badge";
import { formatSTX } from "../../lib/contracts";

interface CreditScore {
  score: number;
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  circlesCompleted: number;
  circlesDefaulted: number;
  totalVolume: string;
}

interface Circle {
  id: string;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  currentMembers: number;
  status: string;
  tokenType: number;
  creatorName: string;
}

interface CircleV2 {
  id: string;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  currentMembers: number;
  currentRound: number;
  status: string;
  creatorName: string;
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { connected } = useWallet();
  const router = useRouter();
  const needsReconnect =
    session?.user?.status === "active" && !connected;

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    } else if (session?.user?.status === "pending_wallet") {
      router.push("/connect-wallet");
    }
  }, [session, sessionStatus, router]);

  const { data: credit, loading: creditLoading } =
    useApi<CreditScore>(
      session?.user?.status === "active" ? "/api/credit/score" : null,
    );
  const { data: circles, loading: circlesLoading } =
    useApi<Circle[]>(
      session?.user?.status === "active" ? "/api/circles" : null,
    );
  const { data: circlesV2, loading: circlesV2Loading } =
    useApi<CircleV2[]>(
      session?.user?.status === "active" ? "/api/circles-v2" : null,
    );

  if (sessionStatus === "loading") {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full max-w-sm" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/vault">
              <Shield className="h-4 w-4 mr-2" />
              Vault
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/circles-v2/create">
              <Gavel className="h-4 w-4 mr-2" />
              New Bidding Circle
            </Link>
          </Button>
        </div>
      </div>

      {needsReconnect && (
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <Wallet className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm text-yellow-200">
              Your wallet is not connected. Reconnect to make transactions.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-4 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"
              onClick={() => router.push("/connect-wallet")}
            >
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Score + Faucet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          {creditLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : credit ? (
            <CreditScoreCard
              score={credit.score}
              totalPayments={credit.totalPayments}
              onTimePayments={credit.onTimePayments}
            />
          ) : (
            <CreditScoreCard score={300} totalPayments={0} onTimePayments={0} />
          )}
        </div>
        <FaucetCard />
      </div>

      {/* Bidding Circles (V2) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Bidding Circles</h2>
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
            New
          </Badge>
        </div>
        {circlesV2Loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : circlesV2 && circlesV2.length > 0 ? (
          <div className="space-y-3">
            {circlesV2.map((c) => (
              <Link
                key={c.id}
                href={`/circles-v2/${c.id}`}
                className="block p-4 rounded-lg border border-white/10 bg-[#111827] hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{c.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        c.status === "active"
                          ? "border-green-500/30 text-green-400"
                          : c.status === "completed"
                            ? "border-neutral-500/30 text-neutral-400"
                            : "border-yellow-500/30 text-yellow-400"
                      }`}
                    >
                      {c.status === "active"
                        ? `Round ${c.currentRound + 1}/${c.totalMembers}`
                        : c.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-neutral-400">
                    {formatSTX(c.contributionAmount)} STX/round
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                  <span>{c.currentMembers}/{c.totalMembers} members</span>
                  <span>by {c.creatorName}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
            <Gavel className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="text-sm text-neutral-500 mb-3">
              No bidding circles yet. Stake in the Vault first, then create one.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/circles-v2/create">Create Bidding Circle</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Classic Circles (V1) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Classic Circles</h2>
        {circlesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : circles && circles.length > 0 ? (
          <CirclesList circles={circles} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
