"use client";

import { useEffect, useState } from "react";

interface StatsData {
  users: {
    total: number;
    withWallet: number;
    creditScore: { avg: number; min: number; max: number };
  };
  circles: Record<string, number>;
  vaultDeposits: number;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    status: string;
    hasWallet: boolean;
    createdAt: string;
  }[];
}

interface VaultData {
  paused: boolean;
  assets: {
    assetType: number;
    name: string;
    tvl: string;
    totalDeposited: string;
    totalWithdrawn: string;
    txCount: number;
    apy: number;
    isActive: boolean;
    priceUsd: number;
    ltvPercent: number;
    rewardEndBlock: number;
  }[];
}

export default function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${apiKey}` };

  async function fetchData() {
    try {
      const [statsRes, vaultRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/vault", { headers }),
      ]);

      if (statsRes.status === 401 || vaultRes.status === 401) {
        setError("Invalid admin key");
        setAuthenticated(false);
        return;
      }

      setStats(await statsRes.json());
      setVault(await vaultRes.json());
      setAuthenticated(true);
      setError(null);
    } catch {
      setError("Failed to fetch admin data");
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authenticated, apiKey]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
          <input
            type="password"
            placeholder="Admin API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 mb-4"
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
          />
          <button
            onClick={fetchData}
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => { setAuthenticated(false); setApiKey(""); }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Sign Out
          </button>
        </div>

        {/* Overview Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card label="Total Users" value={stats.users.total} />
            <Card label="With Wallet" value={stats.users.withWallet} />
            <Card
              label="Avg Credit Score"
              value={Math.round(stats.users.creditScore.avg)}
            />
            <Card label="Vault Deposits" value={stats.vaultDeposits} />
          </div>
        )}

        {/* Circle Stats */}
        {stats && Object.keys(stats.circles).length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Circles</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.circles).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-gray-400 text-sm capitalize">
                    {status.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vault-V3 */}
        {vault && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">Vault V3</h2>
              {vault.paused && (
                <span className="bg-red-600 text-xs px-2 py-1 rounded">
                  PAUSED
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-800">
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">TVL</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">APY</th>
                    <th className="pb-2">LTV</th>
                    <th className="pb-2">Txs</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vault.assets.map((a) => (
                    <tr key={a.assetType} className="border-b border-gray-800/50">
                      <td className="py-3 font-medium">{a.name}</td>
                      <td className="py-3">{formatAmount(a.tvl, a.assetType)}</td>
                      <td className="py-3">${a.priceUsd.toLocaleString()}</td>
                      <td className="py-3">{a.apy}%</td>
                      <td className="py-3">{a.ltvPercent}%</td>
                      <td className="py-3">{a.txCount}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded ${a.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}
                        >
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Users */}
        {stats && stats.recentUsers.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-800">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Wallet</th>
                    <th className="pb-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/50">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-gray-400">{u.email}</td>
                      <td className="py-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-800">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-2">
                        {u.hasWallet ? (
                          <span className="text-green-400">Bound</span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function formatAmount(raw: string, assetType: number): string {
  const decimals = assetType === 1 ? 8 : 6;
  const val = Number(BigInt(raw)) / 10 ** decimals;
  return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
