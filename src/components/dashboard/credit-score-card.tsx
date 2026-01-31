"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { TrendingUp } from "lucide-react";

function getScoreColor(score: number) {
  if (score >= 750) return "text-emerald-500";
  if (score >= 650) return "text-green-500";
  if (score >= 500) return "text-amber-500";
  return "text-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 750) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 500) return "Fair";
  return "Building";
}

interface CreditScoreCardProps {
  score: number;
  totalPayments: number;
  onTimePayments: number;
}

export function CreditScoreCard({
  score,
  totalPayments,
  onTimePayments,
}: CreditScoreCardProps) {
  return (
    <Link href="/credit">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Credit Score
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">/ 850</span>
          </div>
          <p className={`text-sm font-medium mt-1 ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </p>
          {totalPayments > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {onTimePayments}/{totalPayments} on-time payments
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
