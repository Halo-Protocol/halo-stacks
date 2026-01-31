"use client";

import { SessionProvider } from "./session-provider";
import { WalletProvider } from "./wallet-provider";
import { Toaster } from "../ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WalletProvider>
        {children}
        <Toaster />
      </WalletProvider>
    </SessionProvider>
  );
}
