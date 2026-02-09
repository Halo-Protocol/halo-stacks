"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useWallet } from "../providers/wallet-provider";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  CircleDot,
  CreditCard,
  LayoutDashboard,
  TrendingUp,
  User,
  LogOut,
  Wallet,
} from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const { connected, address } = useWallet();

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
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1.5 border-white/20 text-neutral-300"
              >
                <Wallet className="h-3 w-3" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </Badge>
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
