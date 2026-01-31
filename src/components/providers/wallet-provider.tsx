"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { AppConfig, UserSession, showConnect } from "@stacks/connect";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
  userSession: UserSession;
}

const WalletContext = createContext<WalletContextType | null>(null);

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
      const addr =
        network === "mainnet"
          ? userData.profile?.stxAddress?.mainnet
          : userData.profile?.stxAddress?.testnet;
      setConnected(true);
      setAddress(addr || null);
    }
  }, []);

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: "Halo Protocol",
        icon: typeof window !== "undefined" ? window.location.origin + "/logo.svg" : "/logo.svg",
      },
      onFinish: () => {
        const userData = userSession.loadUserData();
        const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
        const addr =
          network === "mainnet"
            ? userData.profile?.stxAddress?.mainnet
            : userData.profile?.stxAddress?.testnet;
        if (!addr) {
          console.error("[wallet] Connected but no address found in profile");
          return;
        }
        setConnected(true);
        setAddress(addr);
      },
      onCancel: () => {
        console.log("[wallet] User cancelled wallet connection");
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setConnected(false);
    setAddress(null);
  }, []);

  const value = useMemo(
    () => ({ connected, address, connect, disconnect, userSession }),
    [connected, address, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
