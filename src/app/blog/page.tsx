import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog - Halo Protocol",
  description:
    "News, updates, and insights from the Halo Protocol team. Follow our journey building decentralized lending circles on Stacks.",
  openGraph: {
    title: "Blog - Halo Protocol",
    description:
      "News, updates, and insights from the Halo Protocol team.",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 grid-pattern">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl">
            News, updates, and insights from the Halo Protocol team.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Featured Post */}
        <article className="glass-card p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white border border-white/10">
              Announcement
            </span>
            <time
              dateTime="2026-02-01"
              className="text-sm text-neutral-500"
            >
              February 1, 2026
            </time>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            Introducing Halo Protocol on Stacks
          </h2>

          <div className="space-y-6 text-neutral-400 leading-relaxed">
            <p>
              We are excited to announce the launch of Halo Protocol, a
              decentralized lending circle platform built on the Stacks
              blockchain. Halo brings the centuries-old tradition of Rotating
              Savings and Credit Associations (ROSCAs) on-chain, enabling anyone
              to build a verifiable credit score through community participation.
            </p>

            <p>
              An estimated 2 billion adults worldwide lack access to formal
              financial services. Traditional credit scoring systems create a
              catch-22: you need credit to build credit. Halo Protocol breaks
              this cycle by allowing participants to establish creditworthiness
              through transparent, on-chain contribution records in community
              lending circles.
            </p>

            <h3 className="text-xl font-semibold text-white pt-4">
              How It Works
            </h3>
            <p>
              Halo Protocol operates through lending circles&mdash;groups of
              participants who contribute a fixed amount of tokens each round. In
              every round, one member receives the pooled funds. By the time the
              circle completes, every participant has both saved and borrowed,
              and their contribution history is permanently recorded on the
              Stacks blockchain.
            </p>
            <p>
              Each participant accumulates a credit score from 300 to 850, based
              on five transparent factors: payment history (35%), circle
              completion (25%), account age (15%), utilization (15%), and
              diversity (10%). Unlike traditional credit bureaus, our scoring
              algorithm is fully auditable in the smart contract source code.
            </p>

            <h3 className="text-xl font-semibold text-white pt-4">
              Built on Bitcoin Security
            </h3>
            <p>
              Halo Protocol is built on Stacks, a Layer 2 blockchain that
              settles every transaction on Bitcoin through Proof of Transfer.
              This means your circle contributions, payouts, and credit score
              updates are secured by Bitcoin&apos;s proof-of-work consensus. All
              protocol logic is written in Clarity, a decidable smart contract
              language that prevents reentrancy attacks and allows complete
              static analysis.
            </p>

            <h3 className="text-xl font-semibold text-white pt-4">
              What We Have Built
            </h3>
            <p>
              The initial release includes 8 Clarity smart contracts covering
              identity management, credit scoring, token vaults, lending
              circles, and sBTC staking. The full-stack application features a
              Next.js 14 backend with 15 API routes, a React frontend with
              wallet integration for Leather and Xverse, and a comprehensive
              test suite with 412 tests across all layers.
            </p>

            <h3 className="text-xl font-semibold text-white pt-4">
              Testnet Launch
            </h3>
            <p>
              Halo Protocol is now live on Stacks testnet. We are inviting
              30&ndash;50 early participants to create circles, make
              contributions, and build credit scores using testnet tokens. The
              faucet provides 1,000 hUSD and 0.01 sBTC per claim, with a
              24-hour cooldown between requests.
            </p>

            <h3 className="text-xl font-semibold text-white pt-4">
              What Comes Next
            </h3>
            <p>
              Following the testnet phase, we will pursue a third-party security
              audit of all smart contracts, resolve any findings, and prepare for
              mainnet deployment. Longer term, we are working on cross-protocol
              credit score portability, DeFi lending market integrations,
              governance mechanisms, and a mobile application to bring
              decentralized credit building to the widest possible audience.
            </p>

            <div className="pt-6 flex flex-wrap gap-4">
              <Link
                href="/docs"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-[#0B0F1A] text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                Read the Docs
              </Link>
              <Link
                href="/whitepaper"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Read the Whitepaper
              </Link>
            </div>
          </div>
        </article>

        {/* More Posts Placeholder */}
        <div className="mt-16 text-center">
          <div className="glass-card inline-block px-8 py-12">
            <p className="text-neutral-400 text-sm">
              More posts coming soon. Follow our progress as we move toward
              mainnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
