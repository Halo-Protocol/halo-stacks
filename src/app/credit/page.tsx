"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
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

interface PaymentRecord {
  circleName: string;
  circleOnChainId: number;
  round: number;
  amount: string;
  onTime: boolean;
  txId: string;
  contributedAt: string;
}

function getScoreColor(score: number) {
  if (score >= 750) return "text-emerald-500";
  if (score >= 650) return "text-green-500";
  if (score >= 500) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number) {
  if (score >= 750) return "bg-emerald-500";
  if (score >= 650) return "bg-green-500";
  if (score >= 500) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 750) return { label: "Excellent", desc: "Outstanding credit. You're a top-tier participant." };
  if (score >= 650) return { label: "Good", desc: "Strong score. You're a reliable circle member." };
  if (score >= 500) return { label: "Fair", desc: "Getting there. Consistency is key." };
  return { label: "Building", desc: "Keep making on-time payments to build your score." };
}

const components = [
  { name: "Payment History", weight: 35, maxPoints: 192 },
  { name: "Circle Completion", weight: 20, maxPoints: 110 },
  { name: "Volume", weight: 15, maxPoints: 82 },
  { name: "Tenure", weight: 10, maxPoints: 55 },
  { name: "Consistency", weight: 10, maxPoints: 55 },
  { name: "Staking Activity", weight: 10, maxPoints: 55 },
];

export default function CreditPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [sessionStatus, router]);

  const { data: credit, loading: creditLoading } = useApi<CreditScore>(
    session?.user?.status === "active" ? "/api/credit/score" : null,
  );
  const { data: history, loading: historyLoading } = useApi<PaymentRecord[]>(
    session?.user ? "/api/credit/history" : null,
  );

  if (sessionStatus === "loading" || creditLoading) {
    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const score = credit?.score ?? 300;
  const scoreInfo = getScoreLabel(score);
  const percentage = ((score - 300) / 550) * 100;

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
      </div>

      {/* Score Display */}
      <Card>
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your Credit Score</p>
            <p className={`text-7xl font-bold ${getScoreColor(score)}`}>
              {score}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className={`${getScoreBg(score)} text-white`}>
                {scoreInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {scoreInfo.desc}
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 rounded-full bg-muted overflow-hidden max-w-md mx-auto">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${getScoreBg(score)} transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            <span>300</span>
            <span>850</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {credit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{credit.totalPayments}</p>
              <p className="text-xs text-muted-foreground">Total Payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-green-500">
                {credit.onTimePayments}
              </p>
              <p className="text-xs text-muted-foreground">On Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{credit.circlesCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">
                {formatSTX(credit.totalVolume || "0")}
              </p>
              <p className="text-xs text-muted-foreground">Total Volume (STX)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Component Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Components
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {components.map((comp) => (
              <div key={comp.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{comp.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {comp.weight}% (max +{comp.maxPoints})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${comp.weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((payment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    {payment.onTime ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {payment.circleName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Round {payment.round} &middot;{" "}
                        {new Date(payment.contributedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {formatSTX(payment.amount)} STX
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment history yet. Join a circle to start building credit!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips to Improve Your Score</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Make all payments on time to maximize Payment History (35%)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Complete circles to boost Circle Completion (20%)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Participate in higher-value circles for Volume (15%)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Stake sBTC for additional Staking Activity points (10%)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
