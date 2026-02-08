import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing - Halo Protocol",
  description:
    "Halo Protocol is free to use. The only costs are minimal STX gas fees and a 1% protocol fee on circle payouts. Compare with traditional credit building.",
  openGraph: {
    title: "Pricing - Halo Protocol",
    description:
      "Halo Protocol is free to use. The only costs are minimal STX gas fees and a 1% protocol fee on circle payouts.",
  },
};

const traditionalDrawbacks = [
  {
    label: "Monthly fees",
    detail: "$5-25/month for credit builder accounts",
  },
  {
    label: "Interest charges",
    detail: "15-25% APR on secured credit cards",
  },
  {
    label: "Security deposits",
    detail: "$200-500 required upfront for secured cards",
  },
  {
    label: "Slow progress",
    detail: "6-12 months to establish any credit history",
  },
  {
    label: "Opaque scoring",
    detail: "Black-box algorithms controlled by 3 bureaus",
  },
  {
    label: "Not portable",
    detail: "Credit scores do not transfer across countries",
  },
];

const haloAdvantages = [
  {
    label: "No sign-up fees",
    detail: "Create your account for free",
  },
  {
    label: "No monthly fees",
    detail: "Use the protocol as long as you want at no cost",
  },
  {
    label: "No deposit required",
    detail: "Start with any contribution amount from 10 STX",
  },
  {
    label: "Fast credit building",
    detail: "Score starts increasing after your first on-time payment",
  },
  {
    label: "Transparent scoring",
    detail: "Algorithm is open-source, score is stored on-chain",
  },
  {
    label: "Globally portable",
    detail: "Your score lives on the blockchain -- accessible from anywhere",
  },
];

export default function PricingPage() {
  return (
    <div className="relative pt-28 pb-20 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Halo Protocol is free to use. We believe financial access should not
            come with a price tag. The only costs are the minimal fees inherent
            to blockchain transactions.
          </p>
        </div>

        {/* Main pricing card */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="glass-card p-10 md:p-12 text-center glow-subtle">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-green-400 font-medium">
                Free Protocol
              </span>
            </div>

            <h2 className="text-5xl md:text-6xl font-bold text-white mb-2">
              $0
            </h2>
            <p className="text-neutral-400 mb-8">
              per month, forever
            </p>

            <div className="space-y-4 text-left mb-10">
              {[
                "Unlimited circle participation",
                "Full credit score tracking (300-850)",
                "sBTC staking access",
                "Dashboard and analytics",
                "Faucet access on testnet",
                "Open-source smart contracts",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-neutral-300">{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-md bg-white text-[#0B0F1A] font-semibold px-8 py-3 hover:bg-neutral-200 transition-colors w-full sm:w-auto"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        {/* Transaction costs breakdown */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Transaction Costs
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              The only costs are network gas fees and a small protocol fee on
              payouts. Both are minimal and fully transparent.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  STX Gas Fees
                </h3>
              </div>
              <p className="text-neutral-400 text-sm mb-4">
                Every on-chain transaction (contributions, payouts, credit score
                updates) requires a small gas fee paid in STX to Stacks miners.
              </p>
              <div className="bg-white/[0.03] rounded-lg border border-white/10 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 text-sm">
                    Typical gas fee
                  </span>
                  <span className="text-white font-mono font-semibold">
                    &lt; $0.01
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Protocol Fee
                </h3>
              </div>
              <p className="text-neutral-400 text-sm mb-4">
                A 1% fee is applied to circle payouts to sustain protocol
                development and maintenance. This fee is deducted automatically
                by the smart contract.
              </p>
              <div className="bg-white/[0.03] rounded-lg border border-white/10 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 text-sm">
                    On payout amount
                  </span>
                  <span className="text-white font-mono font-semibold">
                    1%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Halo vs. Traditional Credit Building
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              See how Halo Protocol compares to the expensive, slow, and opaque
              traditional credit system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional */}
            <div className="glass-card p-8 border-red-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Traditional Credit Building
                </h3>
              </div>
              <ul className="space-y-4">
                {traditionalDrawbacks.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <div>
                      <span className="text-neutral-300 text-sm font-medium">
                        {item.label}
                      </span>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Halo */}
            <div className="glass-card p-8 border-green-500/20 glow-subtle">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Halo Protocol
                </h3>
              </div>
              <ul className="space-y-4">
                {haloAdvantages.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-400 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <span className="text-neutral-300 text-sm font-medium">
                        {item.label}
                      </span>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-16 text-center">
          <p className="text-neutral-500 text-sm max-w-2xl mx-auto">
            All fees are transparent and enforced by open-source smart contracts.
            There are no hidden charges, subscription fees, or surprise costs.
            The 1% protocol fee is the only revenue mechanism and is clearly
            visible in the contract source code.
          </p>
        </div>
      </div>
    </div>
  );
}
