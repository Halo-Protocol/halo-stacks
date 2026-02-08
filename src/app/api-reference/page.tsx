import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference - Halo Protocol",
  description:
    "Complete REST API documentation for Halo Protocol. 15 endpoints covering authentication, identity, circles, credit scoring, faucet, and admin operations.",
  openGraph: {
    title: "API Reference - Halo Protocol",
    description:
      "Complete REST API documentation for Halo Protocol. 15 endpoints for decentralized lending circles.",
  },
};

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth: string;
  category: string;
  details?: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/health",
    description: "Health check endpoint returning system status, database connectivity, and version info.",
    auth: "None",
    category: "System",
    details: "Returns JSON with status, database check result, version, and timestamp. Uses no-store cache header.",
  },
  {
    method: "GET",
    path: "/api/auth/[...nextauth]",
    description: "NextAuth.js authentication handler. Supports Google and GitHub OAuth providers.",
    auth: "None (OAuth flow)",
    category: "Authentication",
    details: "JWT strategy with configurable session duration. Handles sign-in, sign-out, session, and callback routes.",
  },
  {
    method: "POST",
    path: "/api/auth/[...nextauth]",
    description: "NextAuth.js POST handler for sign-in and sign-out actions.",
    auth: "None (OAuth flow)",
    category: "Authentication",
    details: "Processes OAuth callbacks, CSRF token validation, and session creation.",
  },
  {
    method: "GET",
    path: "/api/identity",
    description: "Retrieve the authenticated user's on-chain identity and wallet binding status.",
    auth: "Session (JWT)",
    category: "Identity",
    details: "Returns the user's Stacks address, DID, registration block height, and identity status.",
  },
  {
    method: "POST",
    path: "/api/identity",
    description: "Register a new on-chain identity by binding a Stacks wallet address to the user account.",
    auth: "Session (JWT)",
    category: "Identity",
    details: "Accepts a Stacks address. Creates the on-chain identity via halo-identity contract and updates the user record.",
  },
  {
    method: "GET",
    path: "/api/circles",
    description: "List all circles the authenticated user is a member of, with status and member counts.",
    auth: "Session (JWT)",
    category: "Circles",
    details: "Returns an array of circle objects including name, contribution amount, total/current members, status, and token type.",
  },
  {
    method: "POST",
    path: "/api/circles",
    description: "Create a new lending circle with specified parameters.",
    auth: "Session (JWT)",
    category: "Circles",
    details: "Accepts name, contribution amount, total members, and token type. Creates the circle on-chain and in the database.",
  },
  {
    method: "GET",
    path: "/api/circle/[id]",
    description: "Get detailed information about a specific circle including members, rounds, and on-chain state.",
    auth: "Session (JWT)",
    category: "Circles",
    details: "Returns circle details, member list with wallet addresses, current round, payout schedule, and sync status.",
  },
  {
    method: "GET",
    path: "/api/credit/score",
    description: "Retrieve the authenticated user's current credit score and component breakdown.",
    auth: "Session (JWT)",
    category: "Credit",
    details: "Returns score (300-850), total payments, on-time payments, late payments, circles completed/defaulted, and total volume.",
  },
  {
    method: "GET",
    path: "/api/credit/history",
    description: "Retrieve the authenticated user's payment history across all circles.",
    auth: "Session (JWT)",
    category: "Credit",
    details: "Returns an array of payment records with circle name, round, amount, on-time status, transaction ID, and timestamp.",
  },
  {
    method: "POST",
    path: "/api/faucet",
    description: "Claim testnet tokens: 1,000 hUSD and 0.01 sBTC. Rate limited to once per 24 hours.",
    auth: "Session (JWT)",
    category: "Faucet",
    details: "Mints mock tokens to the user's Stacks address via the deployer account. Uses nonce manager for transaction ordering.",
  },
  {
    method: "POST",
    path: "/api/admin/sync",
    description: "Trigger batch synchronization of on-chain circle state to the database.",
    auth: "Bearer token (ADMIN_API_KEY)",
    category: "Admin",
    details: "Syncs circle status, current round, and member state from on-chain contracts to PostgreSQL. Uses timing-safe token comparison.",
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const categories = ["System", "Authentication", "Identity", "Circles", "Credit", "Faucet", "Admin"];

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 grid-pattern">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            API Reference
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl">
            Complete REST API documentation for the Halo Protocol backend. All
            endpoints are served from the Next.js 14 application at the same
            origin as the frontend.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        {/* Base URL */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Base URL</h2>
          <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm">
            <span className="text-neutral-400">Production:</span>{" "}
            <span className="text-white">https://halo-protocol.app</span>
          </div>
          <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm mt-2">
            <span className="text-neutral-400">Development:</span>{" "}
            <span className="text-white">http://localhost:3000</span>
          </div>
        </div>

        {/* Authentication */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Authentication
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed mb-4">
            Most endpoints require an authenticated session. The API uses
            NextAuth.js v4 with JWT strategy. Sessions are established via OAuth
            (Google or GitHub) and passed as HTTP-only cookies.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111827] rounded-lg p-4">
              <p className="text-xs text-neutral-400 mb-1">Session Auth</p>
              <p className="text-sm text-white">
                Automatic via HTTP-only cookie after OAuth sign-in. No manual
                token management required.
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-4">
              <p className="text-xs text-neutral-400 mb-1">Bearer Token</p>
              <p className="text-sm text-white">
                Admin endpoints use{" "}
                <code className="text-xs bg-white/5 px-1 rounded">
                  Authorization: Bearer ADMIN_API_KEY
                </code>{" "}
                header.
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-4">
              <p className="text-xs text-neutral-400 mb-1">Rate Limiting</p>
              <p className="text-sm text-white">
                Sliding window: 60 req/min (standard), 10 req/min (auth), 20
                req/min (write operations).
              </p>
            </div>
          </div>
        </div>

        {/* Endpoints by category */}
        {categories.map((category) => {
          const categoryEndpoints = endpoints.filter(
            (e) => e.category === category,
          );
          if (categoryEndpoints.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-2xl font-bold text-white mb-6">
                {category}
              </h2>
              <div className="space-y-4">
                {categoryEndpoints.map((endpoint) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="glass-card p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${methodColors[endpoint.method]} w-fit`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-white">
                        {endpoint.path}
                      </code>
                    </div>
                    <p className="text-sm text-neutral-400 leading-relaxed mb-3">
                      {endpoint.description}
                    </p>
                    {endpoint.details && (
                      <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                        {endpoint.details}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-neutral-500">Auth:</span>
                      <span className="text-neutral-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                        {endpoint.auth}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Response Format */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            Response Format
          </h2>
          <div className="glass-card p-6 space-y-4">
            <p className="text-sm text-neutral-400 leading-relaxed">
              All endpoints return JSON responses. Successful responses use
              standard HTTP status codes. Error responses include a consistent
              error object.
            </p>
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Success Response (200)
              </p>
              <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300">
                <pre>{`{
  "score": 650,
  "totalPayments": 12,
  "onTimePayments": 11,
  "latePayments": 1,
  "circlesCompleted": 2,
  "circlesDefaulted": 0,
  "totalVolume": "50000000"
}`}</pre>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Error Response (4xx/5xx)
              </p>
              <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300">
                <pre>{`{
  "error": "Unauthorized",
  "message": "Authentication required"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Status Codes */}
        <section className="pb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Status Codes
          </h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-6 text-neutral-400 font-medium">
                    Code
                  </th>
                  <th className="text-left py-3 px-6 text-neutral-400 font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-6 font-mono text-emerald-400">200</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Success. Response body contains requested data.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-emerald-400">201</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Created. Resource successfully created (e.g., new circle, identity).
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-amber-400">400</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Bad Request. Invalid parameters or missing required fields.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-amber-400">401</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Unauthorized. Missing or invalid authentication credentials.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-amber-400">403</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Forbidden. Authenticated but insufficient permissions.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-amber-400">429</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Too Many Requests. Rate limit exceeded. Retry after cooldown period.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-mono text-red-400">500</td>
                  <td className="py-3 px-6 text-neutral-400">
                    Internal Server Error. Unexpected failure. Check server logs.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
