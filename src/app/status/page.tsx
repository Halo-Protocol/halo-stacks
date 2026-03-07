"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  checks: {
    database: string;
    stacksApi: string;
    vaultPaused: boolean;
    deployerBalance: { stx: string; sufficient: boolean } | null;
  };
  circles: { status: string; count: number }[];
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function fetchHealth() {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
    } catch {
      setError("Failed to reach health endpoint");
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const statusColor = (s: string) => {
    if (s === "ok") return "bg-green-500";
    if (s === "degraded") return "bg-yellow-500";
    return "bg-red-500";
  };

  const checkIcon = (ok: boolean) => (ok ? "text-green-600" : "text-red-600");

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Halo Protocol Status</h1>
        <p className="text-gray-400 mb-8">
          Real-time system health for the Halo Protocol.
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {health && (
          <>
            {/* Overall Status */}
            <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-4 h-4 rounded-full ${statusColor(health.status)} animate-pulse`}
                />
                <span className="text-xl font-semibold capitalize">
                  {health.status === "ok"
                    ? "All Systems Operational"
                    : health.status === "degraded"
                      ? "Degraded Performance"
                      : "Service Disruption"}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Version {health.version} &middot; Last checked{" "}
                {lastChecked?.toLocaleTimeString()}
              </p>
            </div>

            {/* Service Checks */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 divide-y divide-gray-800">
              <div className="p-4 flex items-center justify-between">
                <span>Database</span>
                <span className={checkIcon(health.checks.database === "ok")}>
                  {health.checks.database === "ok" ? "Operational" : "Down"}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span>Stacks API</span>
                <span className={checkIcon(health.checks.stacksApi === "ok")}>
                  {health.checks.stacksApi === "ok" ? "Operational" : "Down"}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span>Vault Status</span>
                <span
                  className={checkIcon(!health.checks.vaultPaused)}
                >
                  {health.checks.vaultPaused ? "Paused" : "Active"}
                </span>
              </div>
              {health.checks.deployerBalance && (
                <div className="p-4 flex items-center justify-between">
                  <span>Deployer Balance</span>
                  <span
                    className={checkIcon(
                      health.checks.deployerBalance.sufficient,
                    )}
                  >
                    {health.checks.deployerBalance.stx} STX
                  </span>
                </div>
              )}
            </div>

            {/* Circle Stats */}
            {health.circles && health.circles.length > 0 && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 mt-6 p-6">
                <h2 className="text-lg font-semibold mb-4">Circles</h2>
                <div className="grid grid-cols-2 gap-4">
                  {health.circles.map((c) => (
                    <div key={c.status} className="text-center">
                      <div className="text-2xl font-bold">{c.count}</div>
                      <div className="text-gray-400 text-sm capitalize">
                        {c.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!health && !error && (
          <div className="text-gray-400">Loading health data...</div>
        )}

        <p className="text-gray-600 text-xs mt-8">
          Auto-refreshes every 60 seconds.
        </p>
      </div>
    </div>
  );
}
