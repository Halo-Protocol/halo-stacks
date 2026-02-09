"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../providers/wallet-provider";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  CircleDot,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  TrendingUp,
  User,
  LogOut,
  Wallet,
} from "lucide-react";
import { DEPLOYER_ADDRESS, STACKS_NETWORK } from "../../lib/contracts";

interface BalanceData {
  stx: string;
  hUsd: string;
  sBtc: string;
}

function useWalletBalances(address: string | null) {
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const base =
        STACKS_NETWORK === "mainnet"
          ? "https://api.hiro.so"
          : "https://api.testnet.hiro.so";
      const res = await fetch(
        `${base}/extended/v1/address/${address}/balances`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const stxMicro = BigInt(data.stx?.balance || "0");
      const stx = (Number(stxMicro) / 1_000_000).toFixed(2);

      // Find hUSD and sBTC in fungible tokens
      const ftMap = data.fungible_tokens || {};
      let hUsd = "0";
      let sBtc = "0";
      for (const [key, val] of Object.entries(ftMap)) {
        const b = (val as { balance: string }).balance || "0";
        if (key.includes("halo-mock-token")) {
          hUsd = (Number(BigInt(b)) / 1_000_000).toFixed(2);
        } else if (key.includes("halo-mock-sbtc")) {
          sBtc = (Number(BigInt(b)) / 1_00_000_000).toFixed(8);
        }
      }

      setBalances({ stx, hUsd, sBtc });
    } catch (err) {
      console.error("[navbar] Failed to fetch balances:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, refetch: fetchBalances };
}

export function Navbar() {
  const { data: session } = useSession();
  const { connected, address } = useWallet();
  const { balances, loading: balancesLoading, refetch } = useWalletBalances(
    connected ? address : null,
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F1A]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-white"
          >
            <CircleDot className="h-6 w-6" />
            <span>Halo</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/credit"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Credit Score
                </Link>
                <Link
                  href="/card"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Card
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="/about"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/card"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Card
                </Link>
              </>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {connected && address && (
              <DropdownMenu onOpenChange={(open) => open && refetch()}>
                <DropdownMenuTrigger asChild>
                  <Badge
                    variant="outline"
                    className="hidden sm:flex items-center gap-1.5 border-white/20 text-neutral-300 cursor-pointer hover:border-white/40 transition-colors"
                  >
                    <Wallet className="h-3 w-3" />
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111827] border-white/10 w-64"
                >
                  <DropdownMenuLabel className="text-xs text-neutral-400 font-normal">
                    Wallet Balances ({STACKS_NETWORK})
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {balancesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                    </div>
                  ) : balances ? (
                    <div className="px-2 py-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">STX</span>
                        <span className="text-sm font-mono text-white">{balances.stx}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">hUSD</span>
                        <span className="text-sm font-mono text-white">{balances.hUsd}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">sBTC</span>
                        <span className="text-sm font-mono text-white">{balances.sBtc}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-2 py-2 text-xs text-neutral-500">
                      Unable to load balances
                    </div>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <a
                      href={`https://explorer.hiro.so/address/${address}?chain=${STACKS_NETWORK}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-300 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View on Explorer
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-neutral-300 hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {session.user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111827] border-white/10"
                >
                  <DropdownMenuItem className="text-xs text-neutral-400">
                    {session.user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="text-neutral-300">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/credit" className="text-neutral-300">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Credit Score
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/card" className="text-neutral-300">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Card
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-neutral-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-white"
                  asChild
                >
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signin">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
