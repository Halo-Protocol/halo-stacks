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

type WalletType = "leather" | "xverse";

interface DetectedWallets {
  leather: boolean;
  xverse: boolean;
}

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  walletInstalled: boolean;
  detectedWallets: DetectedWallets;
  connect: () => void;
  connectWith: (wallet: WalletType) => void;
  disconnect: () => void;
  userSession: UserSession;
}

const WalletContext = createContext<WalletContextType | null>(null);

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// Module-level provider so useContractCall can access it without context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _selectedProvider: any = null;

/** Returns the wallet provider chosen during connect, or the default */
export function getSelectedProvider() {
  return _selectedProvider || getStacksProvider();
}

function detectWallets(): DetectedWallets {
  if (typeof window === "undefined") return { leather: false, xverse: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return {
    leather: !!w.StacksProvider,
    xverse: !!w.XverseProviders?.StacksProvider,
  };
}

function getProviderFor(wallet: WalletType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (wallet === "xverse" && w.XverseProviders?.StacksProvider) {
    return w.XverseProviders.StacksProvider;
  }
  // Leather (or fallback)
  return w.StacksProvider || getStacksProvider();
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [detected, setDetected] = useState<DetectedWallets>({ leather: false, xverse: false });

  useEffect(() => {
    const check = () => {
      const d = detectWallets();
      setDetected(d);
      setWalletInstalled(d.leather || d.xverse);
    };
    check();
    // Re-check after a delay — extensions may inject late
    const timer = setTimeout(check, 1000);
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

  const doConnect = useCallback(async (provider: unknown) => {
    setConnecting(true);
    try {
      if (!provider) {
        console.error("[wallet] No Stacks wallet extension found");
        setConnecting(false);
        return;
      }

      _selectedProvider = provider;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await request(
        { provider: provider as any },
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

  const connect = useCallback(() => {
    doConnect(getStacksProvider());
  }, [doConnect]);

  const connectWith = useCallback(
    (wallet: WalletType) => {
      doConnect(getProviderFor(wallet));
    },
    [doConnect],
  );

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    _selectedProvider = null;
    setConnected(false);
    setAddress(null);
  }, []);

  const value = useMemo(
    () => ({
      connected,
      address,
      connecting,
      walletInstalled,
      detectedWallets: detected,
      connect,
      connectWith,
      disconnect,
      userSession,
    }),
    [connected, address, connecting, walletInstalled, detected, connect, connectWith, disconnect]
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
