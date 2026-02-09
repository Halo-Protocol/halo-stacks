"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { formatSTX } from "../../lib/contracts";

interface Repayment {
  userId: string;
  repaymentRound: number;
  amountDue: string;
  amountPaid: string;
  onTime: boolean;
  txId: string | null;
  paidAt: string | null;
}

interface RepaymentScheduleProps {
  repayments: Repayment[];
  currentUserId: string;
}

export function RepaymentSchedule({ repayments, currentUserId }: RepaymentScheduleProps) {
  const myRepayments = repayments.filter((r) => r.userId === currentUserId);

  if (myRepayments.length === 0) return null;

  const totalDue = myRepayments.reduce((sum, r) => sum + Number(BigInt(r.amountDue)), 0);
  const totalPaid = myRepayments.reduce((sum, r) => sum + Number(BigInt(r.amountPaid)), 0);

  return (
    <Card className="bg-[#111827] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Repayment Schedule</CardTitle>
          <span className="text-xs text-neutral-400 font-mono">
            {formatSTX(totalPaid)} / {formatSTX(totalDue)} STX paid
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {myRepayments.map((r) => {
            const isPaid = BigInt(r.amountPaid) >= BigInt(r.amountDue);
            return (
              <div
                key={r.repaymentRound}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-300">
                    Round {r.repaymentRound + 1}
                  </span>
                  {isPaid ? (
                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                      Due
                    </Badge>
                  )}
                  {!r.onTime && isPaid && (
                    <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                      Late
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-mono text-neutral-400">
                  {formatSTX(r.amountDue)} STX
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
