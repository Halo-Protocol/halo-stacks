"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { bufferCV } from "@stacks/transactions";
import { useWallet } from "../../components/providers/wallet-provider";
import { useContractCall } from "../../hooks/use-contract-call";
import { useTxStatus } from "../../hooks/use-tx-status";
import { fetchApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Shield, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function BindWalletPage() {
  const { data: session, status: sessionStatus, update } = useSession();
  const { connected, address } = useWallet();
  const { loading: txLoading, txId, error: txError, call, reset: resetTx } = useContractCall();
  const txStatus = useTxStatus(txId);
  const router = useRouter();

  const [confirmed, setConfirmed] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [confirmFailed, setConfirmFailed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [walletConflict, setWalletConflict] = useState(false);
  const confirmingRef = useRef(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (!connected) {
      router.push("/connect-wallet");
    }
  }, [connected, router]);

  // On mount: check if wallet is already bound on-chain (recovery from previous attempt)
  useEffect(() => {
    if (!connected || !address || checkedRef.current) {
      setChecking(false);
      return;
    }
    checkedRef.current = true;

    fetchApi<{ status: string }>("/api/identity/check-binding", {
      method: "POST",
      body: JSON.stringify({ walletAddress: address }),
    })
      .then((data) => {
        if (data.status === "recovered" || data.status === "already_active") {
          toast.success("Wallet already bound! Redirecting...");
          update();
          router.push("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch((err) => {
        // If wallet is bound to a different identity on-chain, show conflict
        const message = err instanceof Error ? err.message : "";
        if (message.toLowerCase().includes("bound to a different") || message.toLowerCase().includes("already linked")) {
          setWalletConflict(true);
        }
        setChecking(false);
      });
  }, [connected, address, update, router]);

  // When TX is confirmed on-chain, notify backend (once)
  useEffect(() => {
    if (txStatus === "success" && txId && address && !confirmingRef.current) {
      confirmingRef.current = true;
      fetchApi("/api/identity/confirm-binding", {
        method: "POST",
        body: JSON.stringify({ txId, walletAddress: address }),
      })
        .then(() => {
          toast.success("Wallet bound successfully!");
          update(); // Refresh session
          router.push("/dashboard");
        })
        .catch((err) => {
          toast.error(`Confirmation failed: ${err.message}`);
          setConfirmFailed(true);
          // Don't reset ref — prevents infinite retry loop
        });
    }
  }, [txStatus, txId, address, update, router]);

  const handleBind = async () => {
    if (!address || !session?.user?.uniqueId) return;

    setInitiating(true);
    try {
      // Pre-check: see if wallet is already bound on-chain (from a previous attempt)
      try {
        const checkResult = await fetchApi<{ status: string }>("/api/identity/check-binding", {
          method: "POST",
          body: JSON.stringify({ walletAddress: address }),
        });
        if (checkResult.status === "recovered" || checkResult.status === "already_active") {
          toast.success("Wallet was already bound! Redirecting...");
          update();
          router.push("/dashboard");
          return;
        }
      } catch {
        // Pre-check failed or returned error — proceed with binding
      }

      // Step 1: Tell backend we're initiating binding
      await fetchApi("/api/identity/bind-wallet", {
        method: "POST",
        body: JSON.stringify({ walletAddress: address }),
      });

      // Step 2: Call on-chain bind-wallet
      const uniqueId = session.user.uniqueId;
      const hexBytes = uniqueId.startsWith("0x")
        ? uniqueId.slice(2)
        : uniqueId;

      await call({
        contractName: "halo-identity",
        functionName: "bind-wallet",
        functionArgs: [bufferCV(Buffer.from(hexBytes, "hex"))],
        onFinish: () => {
          toast.info("Transaction submitted! Waiting for confirmation...");
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initiate binding";
      if (message.toLowerCase().includes("already linked")) {
        setWalletConflict(true);
      } else {
        toast.error(message);
      }
    } finally {
      setInitiating(false);
    }
  };

  const retryConfirm = () => {
    if (!txId || !address) return;
    setConfirmFailed(false);
    confirmingRef.current = true;
    fetchApi("/api/identity/confirm-binding", {
      method: "POST",
      body: JSON.stringify({ txId, walletAddress: address }),
    })
      .then(() => {
        toast.success("Wallet bound successfully!");
        update();
        router.push("/dashboard");
      })
      .catch((err) => {
        toast.error(`Confirmation failed: ${err.message}`);
        setConfirmFailed(true);
      });
  };

  if (sessionStatus === "loading" || checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4 pt-20">
        <Card className="w-full max-w-md bg-[#111827] border-white/10">
          <CardContent className="pt-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto bg-white/10" />
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-12 w-full bg-white/10" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 pt-20">
      <Card className="w-full max-w-md bg-[#111827] border-white/10">
        <CardHeader className="text-center">
          <Shield className="h-10 w-10 mx-auto mb-2 text-white" />
          <CardTitle className="text-2xl text-white">Bind Your Wallet</CardTitle>
          <CardDescription className="text-neutral-400">
            Permanently link your wallet to your Halo identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet address */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-white/10">
            <span className="text-sm text-neutral-400">Wallet</span>
            <Badge variant="outline" className="font-mono text-xs border-white/20 text-neutral-300">
              {address?.slice(0, 8)}...{address?.slice(-4)}
            </Badge>
          </div>

          {/* Wallet conflict error */}
          {walletConflict ? (
            <>
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-sm text-red-200">
                  This wallet is already linked to another account.
                  Each wallet can only be bound to one Halo identity.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-neutral-400">
                <p>You can resolve this by:</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-500">
                  <li>Connecting a different wallet that hasn&apos;t been used before</li>
                  <li>Signing in with the account that originally bound this wallet</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full border-white/20 text-neutral-300 hover:bg-white/10"
                onClick={() => {
                  setWalletConflict(false);
                  router.push("/connect-wallet");
                }}
              >
                Use a Different Wallet
              </Button>
            </>
          ) : (
            <>
              {/* Warning */}
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-sm text-red-200">
                  This binding is <strong>permanent</strong> and cannot be undone.
                  Your wallet address will be permanently linked to your Halo
                  identity.
                </AlertDescription>
              </Alert>

              {/* Confirmation checkbox */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-white/10">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                  disabled={!!txId}
                />
                <label htmlFor="confirm" className="text-sm cursor-pointer text-neutral-300">
                  I understand this binding is permanent and I want to proceed
                </label>
              </div>

              {/* TX Status */}
              {txId && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/5">
                  {txStatus === "pending" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-sm text-neutral-300">
                        Transaction pending... (~10-15 minutes)
                      </span>
                    </>
                  )}
                  {txStatus === "success" && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-neutral-300">Transaction confirmed!</span>
                    </>
                  )}
                  {txStatus === "failed" && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-300">
                        Transaction failed on-chain. This can happen if the wallet
                        or ID was already bound.
                      </span>
                    </>
                  )}
                </div>
              )}

              {txStatus === "failed" && (
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-neutral-300 hover:bg-white/10"
                  onClick={() => {
                    resetTx();
                    confirmingRef.current = false;
                  }}
                >
                  Try Again
                </Button>
              )}

              {confirmFailed && txStatus === "success" && (
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-neutral-300 hover:bg-white/10"
                  onClick={retryConfirm}
                >
                  Retry Confirmation
                </Button>
              )}

              {txError && (
                <p className="text-sm text-red-400 text-center">{txError}</p>
              )}

              {/* Bind button */}
              {!txId && (
                <Button
                  className="w-full h-12"
                  onClick={handleBind}
                  disabled={!confirmed || initiating || txLoading}
                >
                  {initiating || txLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Bind Wallet"
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
