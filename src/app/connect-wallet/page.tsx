"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWallet } from "../../components/providers/wallet-provider";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Wallet, ArrowRight, CheckCircle } from "lucide-react";

export default function ConnectWalletPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { connected, address, connect } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (session?.user?.status === "active") {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription>
            Connect your Stacks wallet to continue setting up your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connected ? (
            <>
              <Button className="w-full h-12" onClick={connect}>
                <Wallet className="h-5 w-5 mr-2" />
                Connect Leather / Xverse
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Supports Leather and Xverse wallets on Stacks
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Wallet Connected</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {address?.slice(0, 8)}...{address?.slice(-4)}
                </Badge>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Next, you will permanently bind this wallet to your Halo
                  identity. This is a one-time on-chain transaction.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full h-12"
                onClick={() => router.push("/bind-wallet")}
              >
                Continue to Wallet Binding
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
