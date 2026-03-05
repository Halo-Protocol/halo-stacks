"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApi } from "../../hooks/use-api";
import { StrategyCard } from "../../components/vault/strategy-card";
import { PortfolioSummary } from "../../components/vault/portfolio-summary";
import { CapacityBar } from "../../components/vault/capacity-bar";
import { TransactionHistory } from "../../components/vault/transaction-history";
import { ErrorBoundary } from "../../components/error-boundary";
import { Skeleton } from "../../components/ui/skeleton";
import { Shield, AlertTriangle } from "lucide-react";

interface VaultAsset {
  assetType: number;
  name: string;
  deposited: string;
  apy: number;
  strategyName: string;
  isActive: boolean;
  priceUsd: number;
  ltvPercent: number;
  totalDeposited: string;
  decimals: number;
}

interface VaultCommitment {
  circleId: string;
  circleName: string;
  contributionAmount: string;
  status: string;
}

interface VaultTransaction {
  id: string;
  assetType: number;
  amount: string;
  action: string;
  txId: string | null;
  createdAt: string;
}

interface VaultData {
  paused?: boolean;
  assets: VaultAsset[];
  commitments: VaultCommitment[];
  recentTransactions: VaultTransaction[];
}

export default function VaultPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    } else if (session?.user?.status === "pending_wallet") {
      router.push("/connect-wallet");
    }
  }, [session, sessionStatus, router]);

  const { data, loading, refetch } = useApi<VaultData>(
    session?.user?.status === "active" ? "/api/vault-v3" : null,
  );

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const paused = data?.paused ?? false;
  const assets = data?.assets || [];
  const commitments = data?.commitments || [];
  const transactions = data?.recentTransactions || [];

  return (
    <ErrorBoundary>
    <div className="container py-8 space-y-8">
      {/* Pause banner */}
      {paused && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Vault Temporarily Paused</p>
            <p className="text-sm text-yellow-300/70">Deposits and withdrawals are currently disabled for maintenance.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold">Vault</h1>
        </div>
        <p className="text-muted-foreground">
          Deposit assets to earn real yield and unlock circle participation capacity.
        </p>
      </div>

      {/* Portfolio overview */}
      <PortfolioSummary assets={assets} />

      {/* Capacity */}
      <CapacityBar assets={assets} commitments={commitments} />

      {/* Strategy cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Yield Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assets.map((asset) => (
            <StrategyCard
              key={asset.assetType}
              assetType={asset.assetType}
              name={asset.name}
              deposited={asset.deposited}
              apy={asset.apy}
              strategyName={asset.strategyName}
              isActive={asset.isActive}
              priceUsd={asset.priceUsd}
              ltvPercent={asset.ltvPercent}
              totalDeposited={asset.totalDeposited}
              decimals={asset.decimals}
              disabled={paused}
              onUpdate={refetch}
            />
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <TransactionHistory transactions={transactions} />

      {/* How it works */}
      <div className="bg-[#0d1117] border border-white/10 rounded-lg p-6">
        <h3 className="font-semibold mb-3">How the Vault Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-neutral-400">
          <div>
            <p className="text-white font-medium mb-1">1. Deposit Assets</p>
            <p>Deposit USDCx, sBTC, STX, or hUSD. Your assets earn yield from real DeFi strategies.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">2. Earn Yield</p>
            <p>APY is calculated from on-chain reward rates. Yield accrues every Stacks block (~10 min).</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">3. Unlock Capacity</p>
            <p>Deposits unlock borrowing capacity based on LTV ratios (40-90% depending on asset).</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">4. Join Circles</p>
            <p>Use capacity to join lending circles. Capacity is locked while circles are active.</p>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
