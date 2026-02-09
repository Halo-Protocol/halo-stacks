"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApi } from "../../hooks/use-api";
import { AssetDepositCard } from "../../components/vault/asset-deposit-card";
import { CapacityBar } from "../../components/vault/capacity-bar";
import { Skeleton } from "../../components/ui/skeleton";
import { Shield } from "lucide-react";

interface VaultAsset {
  assetType: number;
  name: string;
  deposited: string;
  ltvPercent: number;
}

interface VaultCommitment {
  circleId: string;
  circleName: string;
  contributionAmount: string;
  status: string;
}

interface VaultData {
  assets: VaultAsset[];
  commitments: VaultCommitment[];
  recentTransactions: {
    id: string;
    assetType: number;
    amount: string;
    action: string;
    txId: string | null;
    createdAt: string;
  }[];
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
    session?.user?.status === "active" ? "/api/vault-v2" : null,
  );

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const assets = data?.assets || [];
  const commitments = data?.commitments || [];

  return (
    <div className="container py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold">Vault</h1>
        </div>
        <p className="text-muted-foreground">
          Stake assets to earn yield and unlock circle participation capacity.
        </p>
      </div>

      {/* Capacity overview */}
      <CapacityBar assets={assets} commitments={commitments} />

      {/* Asset cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <AssetDepositCard
              key={asset.assetType}
              assetType={asset.assetType}
              name={asset.name}
              deposited={asset.deposited}
              ltvPercent={asset.ltvPercent}
              onUpdate={refetch}
            />
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#111827] border border-white/10 rounded-lg p-6">
        <h3 className="font-semibold mb-3">How Staking Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-400">
          <div>
            <p className="text-white font-medium mb-1">1. Deposit Assets</p>
            <p>Stake hUSD, STX, or sBTC into the vault. Your deposits earn yield over time.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">2. Unlock Capacity</p>
            <p>Stablecoins unlock 80% LTV. Volatile assets (STX/sBTC) unlock 50% LTV.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">3. Join Circles</p>
            <p>Use your capacity to join one or more bidding circles. Capacity is locked while circles are active.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
