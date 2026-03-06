"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CircleInfo {
  id: string;
  name: string;
  contributionAmount: string;
  totalMembers: number;
  currentMembers: number;
  status: string;
  tokenType: number;
  createdAt: string;
}

const TOKEN_NAMES: Record<number, string> = { 0: "hUSD", 1: "sBTC", 2: "STX" };

export default function ExplorePage() {
  const [circles, setCircles] = useState<CircleInfo[]>([]);
  const [status, setStatus] = useState("forming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/circles-v2/explore?status=${status}`)
      .then((r) => r.json())
      .then((d) => {
        setCircles(d.circles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  function formatAmount(raw: string, tokenType: number): string {
    const decimals = tokenType === 1 ? 8 : 6;
    return (Number(BigInt(raw)) / 10 ** decimals).toLocaleString();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Explore Circles</h1>
        <p className="text-gray-400 mb-6">
          Discover and join lending circles on the Halo Protocol.
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["forming", "active", "pending_creation"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize ${
                status === s
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400">Loading circles...</p>
        ) : circles.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
            No circles found with status &ldquo;{status}&rdquo;.
          </div>
        ) : (
          <div className="grid gap-4">
            {circles.map((c) => (
              <Link
                key={c.id}
                href={`/circles/${c.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-600 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-gray-800 capitalize">
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                  <div>
                    <div className="text-white font-medium">
                      {formatAmount(c.contributionAmount, c.tokenType)}{" "}
                      {TOKEN_NAMES[c.tokenType] || "Token"}
                    </div>
                    <div>Per Round</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {c.currentMembers} / {c.totalMembers}
                    </div>
                    <div>Members</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                    <div>Created</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
