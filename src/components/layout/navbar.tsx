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
import { CircleDot, LayoutDashboard, TrendingUp, User, LogOut, Wallet } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const { connected, address } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <CircleDot className="h-6 w-6 text-primary" />
            <span>Halo</span>
          </Link>

          {session?.user && (
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/credit"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Credit Score
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {connected && address && (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
              <Wallet className="h-3 w-3" />
              {address.slice(0, 6)}...{address.slice(-4)}
            </Badge>
          )}

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{session.user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  {session.user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/credit">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Credit Score
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
