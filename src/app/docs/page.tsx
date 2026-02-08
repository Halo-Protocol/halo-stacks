import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation - Halo Protocol",
  description:
    "Learn how to build with Halo Protocol. Explore smart contracts, API reference, SDK guides, and deployment instructions for decentralized lending circles on Stacks.",
  openGraph: {
    title: "Documentation - Halo Protocol",
    description:
      "Learn how to build with Halo Protocol. Explore smart contracts, API reference, SDK guides, and deployment instructions.",
  },
};

const sections = [
  {
    title: "Getting Started",
    description:
      "Set up your development environment and deploy your first lending circle in minutes. Covers wallet connection, identity registration, and circle creation.",
    href: "#getting-started",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    ),
  },
  {
    title: "Smart Contracts",
    description:
      "Deep dive into the 8 Clarity smart contracts powering Halo Protocol: identity, credit scoring, vaults, circles, sBTC staking, and SIP-010 token standards.",
    href: "#smart-contracts",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    title: "API Reference",
    description:
      "Complete REST API documentation covering 15 endpoints: authentication, identity management, circle operations, credit scoring, faucet, and admin sync.",
    href: "/api-reference",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    title: "SDK & Developer Tools",
    description:
      "Integrate Halo Protocol into your application with @stacks/connect for wallets and @stacks/transactions for contract interactions. Includes code examples.",
    href: "/sdk",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
      </svg>
    ),
  },
  {
    title: "Deployment Guide",
    description:
      "Deploy Halo Protocol to Stacks testnet or mainnet. Covers contract deployment order, configuration, verification, and CI/CD pipeline setup.",
    href: "#deployment",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
      </svg>
    ),
  },
  {
    title: "Architecture",
    description:
      "Understand the full-stack architecture: Clarity contracts on Stacks L2, Next.js 14 backend with Prisma, and a React frontend with wallet integration.",
    href: "#architecture",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
      </svg>
    ),
  },
];

const contracts = [
  { name: "halo-sip010-trait", description: "SIP-010 fungible token trait definition" },
  { name: "halo-identity", description: "On-chain identity registration and DID management" },
  { name: "halo-mock-token", description: "Mock hUSD token for testnet (SIP-010 compliant)" },
  { name: "halo-mock-sbtc", description: "Mock sBTC token for testnet staking" },
  { name: "halo-credit", description: "Decentralized credit scoring (300-850 range)" },
  { name: "halo-vault", description: "Secure token vault for circle contributions" },
  { name: "halo-sbtc-staking", description: "sBTC staking for yield and credit boost" },
  { name: "halo-circle", description: "ROSCA lending circle lifecycle management" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 grid-pattern">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Documentation
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl">
            Everything you need to build with Halo Protocol. From connecting a
            wallet and joining your first circle to deploying contracts and
            integrating the SDK.
          </p>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const isExternal = section.href.startsWith("/");
            const Wrapper = isExternal ? Link : "a";
            return (
              <Wrapper
                key={section.title}
                href={section.href}
                className="glass-card p-6 hover:border-white/20 transition-colors group"
              >
                <div className="text-neutral-400 group-hover:text-white transition-colors mb-4">
                  {section.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {section.title}
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {section.description}
                </p>
              </Wrapper>
            );
          })}
        </div>
      </section>

      {/* Getting Started */}
      <section id="getting-started" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">Getting Started</h2>
        <div className="glass-card p-8 space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              1. Prerequisites
            </h3>
            <p className="text-neutral-400 mb-4">
              Before building with Halo Protocol, ensure you have the following
              installed:
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 space-y-1">
              <p># Node.js 18+ and npm</p>
              <p>node --version</p>
              <p className="mt-2"># Clarinet v3.13+ for contract development</p>
              <p>clarinet --version</p>
              <p className="mt-2"># A Stacks wallet (Leather or Xverse)</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              2. Clone and Install
            </h3>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 space-y-1">
              <p>git clone https://github.com/halo-protocol/halo-stacks.git</p>
              <p>cd halo-stacks</p>
              <p>npm install</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              3. Run Contract Tests
            </h3>
            <p className="text-neutral-400 mb-4">
              Verify all 232 contract tests pass with Vitest and the Clarinet
              SDK:
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 space-y-1">
              <p>npx vitest run</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              4. Start the Application
            </h3>
            <p className="text-neutral-400 mb-4">
              Launch the full-stack Next.js application with the backend API and
              frontend:
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 space-y-1">
              <p># Copy environment template</p>
              <p>cp .env.example .env</p>
              <p className="mt-2"># Run database migrations</p>
              <p>npx prisma migrate dev</p>
              <p className="mt-2"># Start dev server</p>
              <p>npm run dev</p>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Contracts */}
      <section id="smart-contracts" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-4">Smart Contracts</h2>
        <p className="text-neutral-400 mb-8 max-w-3xl">
          Halo Protocol consists of 8 Clarity smart contracts deployed on the
          Stacks blockchain. Contracts must be deployed in the following order
          due to inter-contract dependencies.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((contract, index) => (
            <div key={contract.name} className="glass-card p-5">
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-mono text-sm text-white font-medium">
                    {contract.name}
                  </h4>
                  <p className="text-sm text-neutral-400 mt-1">
                    {contract.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">Architecture</h2>
        <div className="glass-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Smart Contracts
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                8 Clarity contracts on Stacks L2, secured by Bitcoin. Handles
                identity, credit scoring, token vaults, lending circles, and
                sBTC staking. Written in Clarity 3 (Epoch 3.0).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Backend API
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Next.js 14 App Router with 15 API routes. Prisma v6 ORM with
                PostgreSQL (Supabase). NextAuth.js v4 for OAuth. On-chain sync
                keeps the database in lockstep with contract state.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Frontend
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                React with Tailwind CSS v3 and shadcn/ui components.
                @stacks/connect v8 for Leather and Xverse wallet integration.
                Same-origin architecture eliminates CORS complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment */}
      <section id="deployment" className="max-w-6xl mx-auto px-4 py-16 pb-24">
        <h2 className="text-3xl font-bold text-white mb-8">Deployment</h2>
        <div className="glass-card p-8 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Testnet Deployment
            </h3>
            <p className="text-neutral-400 mb-4">
              Deploy all 8 contracts to Stacks testnet with the deployment
              script. The script handles ordering, authorization calls, and
              verification automatically.
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 space-y-1">
              <p># Dry run (no transactions broadcast)</p>
              <p>npx ts-node scripts/deploy-testnet.ts --dry-run</p>
              <p className="mt-2"># Execute deployment</p>
              <p>npx ts-node scripts/deploy-testnet.ts --execute</p>
              <p className="mt-2"># Verify deployment</p>
              <p>npx ts-node scripts/verify-deployment.ts</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              CI/CD Pipeline
            </h3>
            <p className="text-neutral-400">
              GitHub Actions runs 4 parallel jobs on every push: contract tests,
              backend API tests, frontend tests, and a full production build.
              All 412 tests must pass before merging to main.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
