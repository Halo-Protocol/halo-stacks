"use client";

import { Badge } from "../ui/badge";

interface RoundPhaseIndicatorProps {
  currentRound: number;
  totalMembers: number;
  status: string;
}

export function RoundPhaseIndicator({
  currentRound,
  totalMembers,
  status,
}: RoundPhaseIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "pending_creation":
        return { label: "Pending Creation", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      case "forming":
        return { label: "Forming", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "active":
        return { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
      case "completed":
        return { label: "Completed", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" };
      case "paused":
        return { label: "Paused", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      default:
        return { label: status, color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" };
    }
  };

  const { label, color } = getStatusInfo();

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className={color}>
        {label}
      </Badge>
      {status === "active" && (
        <span className="text-sm text-neutral-400">
          Round <span className="text-white font-mono">{currentRound + 1}</span>
          {" / "}
          <span className="text-white font-mono">{totalMembers}</span>
        </span>
      )}
      {status === "active" && (
        <div className="flex gap-1 ml-auto">
          {Array.from({ length: totalMembers }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full ${
                i < currentRound
                  ? "bg-green-500"
                  : i === currentRound
                    ? "bg-blue-500 animate-pulse"
                    : "bg-white/10"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
