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
  connecting: boolean;
  walletInstalled: boolean;
  connect: () => void;
  disconnect: () => void;
  userSession: UserSession;
}

const WalletContext = createContext<WalletContextType | null>(null);

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function detectWallet(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(w.StacksProvider || w.XverseProviders);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    const checkWallet = () => setWalletInstalled(detectWallet());
    checkWallet();
    // Re-check after a delay — extensions may inject late
    const timer = setTimeout(checkWallet, 1000);
    return () => clearTimeout(timer);
  }, []);

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

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await showConnect({
        appDetails: {
          name: "Halo Protocol",
          icon:
            typeof window !== "undefined"
              ? window.location.origin + "/logo.svg"
              : "/logo.svg",
        },
        onFinish: () => {
          const userData = userSession.loadUserData();
          const network =
            process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
          const addr =
            network === "mainnet"
              ? userData.profile?.stxAddress?.mainnet
              : userData.profile?.stxAddress?.testnet;
          if (!addr) {
            console.error(
              "[wallet] Connected but no address found in profile"
            );
            setConnecting(false);
            return;
          }
          setConnected(true);
          setAddress(addr);
          setConnecting(false);
        },
        onCancel: () => {
          console.log("[wallet] User cancelled wallet connection");
          setConnecting(false);
        },
        userSession,
      });
    } catch (error) {
      console.error("[wallet] Failed to open wallet connect:", error);
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setConnected(false);
    setAddress(null);
  }, []);

  const value = useMemo(
    () => ({
      connected,
      address,
      connecting,
      walletInstalled,
      connect,
      disconnect,
      userSession,
    }),
    [connected, address, connecting, walletInstalled, connect, disconnect]
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
