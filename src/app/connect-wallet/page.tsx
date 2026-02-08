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
import {
  Wallet,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function ConnectWalletPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { connected, address, connecting, walletInstalled, connect } =
    useWallet();
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
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 pt-20">
      <Card className="w-full max-w-md bg-[#111827] border-white/10">
        <CardHeader className="text-center">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-white" />
          <CardTitle className="text-2xl text-white">
            Connect Your Wallet
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Connect your Stacks wallet to continue setting up your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connected ? (
            <>
              <Button
                className="w-full h-12"
                onClick={connect}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Leather / Xverse
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-neutral-500">
                A popup will appear to approve the connection
              </p>

              {!walletInstalled && (
                <div className="space-y-3 pt-2">
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-sm text-yellow-200">
                      No wallet extension detected. You may need to install one:
                    </AlertDescription>
                  </Alert>
                  <a
                    href="https://leather.io/install-extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        Leather Wallet
                      </div>
                      <div className="text-xs text-neutral-400">
                        Browser extension for Stacks
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-neutral-400" />
                  </a>
                  <a
                    href="https://www.xverse.app/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        Xverse Wallet
                      </div>
                      <div className="text-xs text-neutral-400">
                        Mobile & browser extension
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-neutral-400" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-white">
                    Wallet Connected
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-white/20 text-neutral-300"
                >
                  {address?.slice(0, 8)}...{address?.slice(-4)}
                </Badge>
              </div>

              <Alert className="bg-white/5 border-white/10">
                <AlertDescription className="text-sm text-neutral-300">
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
