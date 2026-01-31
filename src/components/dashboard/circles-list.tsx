"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Users } from "lucide-react";
import { formatSTX } from "../../lib/contracts";

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

export function CirclesList({ circles }: { circles: Circle[] }) {
  return (
    <div className="space-y-3">
      {circles.map((circle) => (
        <Link key={circle.id} href={`/circles/${circle.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{circle.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatSTX(circle.contributionAmount)} STX/round
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {circle.currentMembers}/{circle.totalMembers}
                </span>
                {statusBadge(circle.status)}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
