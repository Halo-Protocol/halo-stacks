import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features - Halo Protocol",
  description:
    "Explore Halo Protocol features: lending circles, on-chain credit scoring, secure vault escrow, and sBTC staking on Stacks blockchain.",
  openGraph: {
    title: "Features - Halo Protocol",
    description:
      "Explore Halo Protocol features: lending circles, on-chain credit scoring, secure vault escrow, and sBTC staking.",
  },
};

const features = [
  {
    title: "Lending Circles",
    subtitle: "Community-Powered Savings",
    description:
      "Lending circles (also known as ROSCAs) are a time-tested financial tool used by communities worldwide. Halo Protocol brings this tradition on-chain with smart contract guarantees, so every member can trust the process without trusting a middleman.",
    details: [
      "Form circles with 3-10 trusted members",
      "Set custom STX contribution amounts (10-500 STX per round)",
      "Rotating payouts ensure every member receives the pooled funds",
      "Smart contracts enforce contribution schedules automatically",
      "Transparent round tracking visible to all members on-chain",
      "Circle creator sets terms: duration, frequency, and contribution size",
    ],
    icon: (
      <svg
        className="w-7 h-7 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    title: "Credit Scoring",
    subtitle: "On-Chain Reputation",
    description:
      "Build a verifiable credit score that lives on the Stacks blockchain. Your financial reputation is portable, transparent, and fully under your control -- no centralized credit bureau required.",
    details: [
      "Score range from 300 (starting) to 850 (excellent)",
      "Based on on-time payment history and circle completion rate",
      "Stored directly on-chain via the halo-credit smart contract",
      "Score tiers: Building (300-499), Fair (500-649), Good (650-749), Excellent (750-850)",
      "Higher scores unlock access to larger circles and better terms",
      "No centralized credit bureau -- your score is trustless and verifiable",
    ],
    icon: (
      <svg
        className="w-7 h-7 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    title: "Secure Vault",
    subtitle: "Smart Contract Escrow",
    description:
      "All circle funds are held in a non-custodial smart contract vault. No single person controls the money -- payouts happen automatically when conditions are met, with every transaction auditable on-chain.",
    details: [
      "Funds held in the halo-vault Clarity smart contract",
      "Automatic payout distribution at the end of each round",
      "No admin keys or multisig required -- code is law",
      "Post-conditions ensure exact transfer amounts on every transaction",
      "Full audit trail of deposits and withdrawals on-chain",
      "Contract source is open and verified on the Stacks explorer",
    ],
    icon: (
      <svg
        className="w-7 h-7 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  {
    title: "sBTC Staking",
    subtitle: "Earn While You Build",
    description:
      "Stake sBTC (synthetic Bitcoin on Stacks) to earn yield while simultaneously building your credit score. Your idle assets work for you, and staking activity demonstrates long-term commitment to the protocol.",
    details: [
      "Stake sBTC through the halo-sbtc-staking contract",
      "Earn staking rewards proportional to your stake duration",
      "Staking activity contributes positively to your credit score",
      "Withdraw anytime -- no lock-up period on testnet",
      "Rewards distributed automatically by the smart contract",
      "Bridging real BTC to sBTC supported via the Stacks sBTC bridge",
    ],
    icon: (
      <svg
        className="w-7 h-7 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative pt-28 pb-20 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Platform Features
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Halo Protocol combines time-tested community finance with blockchain
            technology. Every feature is designed to be transparent, secure, and
            accessible.
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`glass-card p-8 md:p-10 flex flex-col ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              } gap-8 md:gap-12 items-start`}
            >
              {/* Icon + Text */}
              <div className="flex-1">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  {feature.subtitle}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {feature.title}
                </h2>
                <p className="text-neutral-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Details list */}
              <div className="flex-1 w-full">
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-6">
                  <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4">
                    Key Details
                  </h3>
                  <ul className="space-y-3">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
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
                        <span className="text-neutral-400 text-sm">
                          {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "8", label: "Smart Contracts" },
            { value: "300-850", label: "Score Range" },
            { value: "3-10", label: "Members per Circle" },
            { value: "<$0.01", label: "Avg. Gas Fee" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
