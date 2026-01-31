"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useApi } from "../../hooks/use-api";
import { CreditScoreCard } from "../../components/dashboard/credit-score-card";
import { CirclesList } from "../../components/dashboard/circles-list";
import { EmptyState } from "../../components/dashboard/empty-state";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { Plus } from "lucide-react";
import { FaucetCard } from "../../components/dashboard/faucet-card";

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

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

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
        <Button asChild>
          <Link href="/circles/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Circle
          </Link>
        </Button>
      </div>

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

      {/* Circles */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Circles</h2>
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
