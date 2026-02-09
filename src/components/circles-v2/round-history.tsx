"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { formatSTX } from "../../lib/contracts";

interface RoundResult {
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
}

interface RoundHistoryProps {
  results: RoundResult[];
}

export function RoundHistory({ results }: RoundHistoryProps) {
  if (results.length === 0) {
    return (
      <Card className="bg-[#111827] border-white/10">
        <CardContent className="py-8 text-center text-neutral-500 text-sm">
          No rounds settled yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111827] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Round History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((r) => (
          <div
            key={r.round}
            className="border border-white/5 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Round {r.round + 1}</span>
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                Settled
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-neutral-500">Winner</span>
                <p className="text-neutral-300">{r.winnerName}</p>
              </div>
              <div>
                <span className="text-neutral-500">Winning Bid</span>
                <p className="text-neutral-300 font-mono">{formatSTX(r.winningBid)} STX</p>
              </div>
              <div>
                <span className="text-neutral-500">Pool Total</span>
                <p className="text-neutral-300 font-mono">{formatSTX(r.poolTotal)} STX</p>
              </div>
              <div>
                <span className="text-neutral-500">Dividend/Member</span>
                <p className="text-neutral-300 font-mono">{formatSTX(r.dividendPerMember)} STX</p>
              </div>
              <div>
                <span className="text-neutral-500">Protocol Fee</span>
                <p className="text-neutral-300 font-mono">{formatSTX(r.protocolFee)} STX</p>
              </div>
              <div>
                <span className="text-neutral-500">Surplus</span>
                <p className="text-neutral-300 font-mono">{formatSTX(r.surplus)} STX</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
