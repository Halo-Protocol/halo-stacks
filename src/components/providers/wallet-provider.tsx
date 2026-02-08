"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  AppConfig,
  UserSession,
  request,
  getStacksProvider,
} from "@stacks/connect";

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
      // Get the wallet extension provider directly — bypasses the
      // @stacks/connect-ui Stencil modal which doesn't render in Next.js
      const provider = getStacksProvider();
      if (!provider) {
        console.error("[wallet] No Stacks wallet extension found");
        setConnecting(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await request(
        { provider },
        "getAddresses"
      );

      // Find the STX address from the response
      const stxEntry = result.addresses?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => a.symbol === "STX" || a.address?.startsWith("S")
      );
      const addr = stxEntry?.address;

      if (!addr) {
        console.error("[wallet] No STX address in wallet response");
        setConnecting(false);
        return;
      }

      // Store in userSession for compatibility with contract calls
      const sessionData = userSession.store.getSessionData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ud = (sessionData as any).userData ?? { profile: {} };
      ud.profile = ud.profile ?? {};
      ud.profile.stxAddress = ud.profile.stxAddress ?? { mainnet: "", testnet: "" };
      const isMainnet = addr[1] === "P" || addr[1] === "M";
      ud.profile.stxAddress[isMainnet ? "mainnet" : "testnet"] = addr;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sessionData as any).userData = ud;
      userSession.store.setSessionData(sessionData);

      setConnected(true);
      setAddress(addr);
      setConnecting(false);
    } catch (error) {
      console.error("[wallet] Failed to connect:", error);
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
