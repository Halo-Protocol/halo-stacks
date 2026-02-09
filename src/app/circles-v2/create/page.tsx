"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { stringAsciiCV, uintCV } from "@stacks/transactions";
import { useContractCall } from "../../../hooks/use-contract-call";
import { fetchApi } from "../../../hooks/use-api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Users,
  Gavel,
} from "lucide-react";
import { toast } from "sonner";
import { formatSTX } from "../../../lib/contracts";

interface CreateV2Result {
  id: string;
  inviteCode: string;
  inviteLink: string;
  onChainParams: {
    name: string;
    contributionAmount: number;
    totalMembers: number;
    roundDuration: number;
    bidWindowBlocks: number;
    gracePeriod: number;
    tokenType: number;
  };
}

export default function CreateCircleV2Page() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { loading: txLoading, call } = useContractCall();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [totalMembers, setTotalMembers] = useState("3");
  const [roundDuration, setRoundDuration] = useState("30");
  const [bidWindow, setBidWindow] = useState("2");
  const [gracePeriod, setGracePeriod] = useState("1");

  // Result
  const [result, setResult] = useState<CreateV2Result | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [sessionStatus, router]);

  const amountMicroSTX = Math.floor(parseFloat(amount || "0") * 1_000_000);

  const canProceedStep1 =
    name.length >= 3 && name.length <= 30 && amountMicroSTX > 0;

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const data = await fetchApi<CreateV2Result>("/api/circles-v2", {
        method: "POST",
        body: JSON.stringify({
          name,
          contributionAmount: amountMicroSTX,
          totalMembers: parseInt(totalMembers),
          roundDurationDays: parseInt(roundDuration),
          bidWindowDays: parseInt(bidWindow),
          gracePeriodDays: parseInt(gracePeriod),
        }),
      });

      setResult(data);

      const p = data.onChainParams;
      await call({
        contractName: "halo-circle-v2",
        functionName: "create-circle-v2",
        functionArgs: [
          stringAsciiCV(p.name),
          uintCV(p.contributionAmount),
          uintCV(p.totalMembers),
          uintCV(p.roundDuration),
          uintCV(p.bidWindowBlocks),
          uintCV(p.gracePeriod),
        ],
        onFinish: () => {
          toast.success("Circle creation TX submitted!");
        },
      });

      setStep(4);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create circle",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inviteLink =
    result?.inviteCode && typeof window !== "undefined"
      ? `${window.location.origin}/circles-v2/join/${result.inviteCode}`
      : result?.inviteLink || "";

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!");
    }
  };

  return (
    <div className="container max-w-lg py-8">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Name & Amount */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              <CardTitle>Bidding Circle Details</CardTitle>
            </div>
            <CardDescription>
              Create a new bidding chit fund circle. Members contribute each round,
              then bid for the lowest payout amount. Lowest bidder wins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Circle Name</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Savings Pool"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/30 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Contribution Amount (STX per round)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.000001"
              />
              {amountMicroSTX > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {amountMicroSTX.toLocaleString()} microSTX per round
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Members, Duration, Bid Window */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Members & Timing</CardTitle>
            <CardDescription>
              Configure circle size, round duration, and bid window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Total Members</Label>
              <Select value={totalMembers} onValueChange={setTotalMembers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} members ({n} rounds total)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundDuration">Round Duration (days)</Label>
              <Input
                id="roundDuration"
                type="number"
                value={roundDuration}
                onChange={(e) => setRoundDuration(e.target.value)}
                min="7"
                max="90"
              />
            </div>
            <div className="space-y-2">
              <Label>Bid Window (days)</Label>
              <Select value={bidWindow} onValueChange={setBidWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} day{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Time members have to place bids after contributions close.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Grace Period (days)</Label>
              <Select value={gracePeriod} onValueChange={setGracePeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} day{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* How bidding works explainer */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-neutral-400 space-y-1">
              <p className="text-blue-400 font-medium text-sm">How Bidding Works</p>
              <p>Each round, all {totalMembers} members contribute {amount || "X"} STX each (pool = {parseInt(totalMembers) * parseFloat(amount || "0")} STX).</p>
              <p>Eligible members (who haven't won yet) bid the lowest amount they'd accept from the pool.</p>
              <p>Lowest bidder wins and takes their bid amount. A small protocol fee is deducted.</p>
              <p>The surplus is split equally among non-winners as dividends.</p>
              <p>Winners repay their bid amount over the remaining rounds.</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Circle</CardTitle>
            <CardDescription>
              Confirm your circle parameters before creating
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contribution</span>
                <span className="font-medium">{formatSTX(amountMicroSTX)} STX / round</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Members</span>
                <span className="font-medium">{totalMembers}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Round Duration</span>
                <span className="font-medium">{roundDuration} days</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bid Window</span>
                <span className="font-medium">{bidWindow} day{parseInt(bidWindow) > 1 ? "s" : ""}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Grace Period</span>
                <span className="font-medium">{gracePeriod} day{parseInt(gracePeriod) > 1 ? "s" : ""}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pool per Round</span>
                <span className="font-medium">
                  {formatSTX(amountMicroSTX * parseInt(totalMembers))} STX
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Duration</span>
                <span className="font-medium">
                  {parseInt(totalMembers) * parseInt(roundDuration || "0")} days ({totalMembers} rounds)
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={submitting || txLoading}
              >
                {submitting || txLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Create Bidding Circle
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && result && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Bidding Circle Created!</CardTitle>
            <CardDescription>
              Share the invite link with your circle members. They must stake collateral in the Vault before joining.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <code className="flex-1 text-sm truncate">{inviteLink}</code>
              <Button variant="ghost" size="sm" onClick={copyInviteLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Invite Code:</span>
              <Badge variant="outline" className="font-mono">
                {result.inviteCode}
              </Badge>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push(`/circles-v2/${result.id}`)}
              >
                View Circle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
