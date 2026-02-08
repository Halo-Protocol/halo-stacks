import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases - Halo Protocol",
  description:
    "Discover how Halo Protocol serves the unbanked, small business owners, community savings groups, and immigrants building credit on Stacks blockchain.",
  openGraph: {
    title: "Use Cases - Halo Protocol",
    description:
      "Discover how Halo Protocol serves the unbanked, small business owners, community savings groups, and immigrants building credit.",
  },
};

const useCases = [
  {
    title: "Unbanked & Underbanked Populations",
    tagline: "Financial access for everyone",
    description:
      "Over 1.4 billion adults worldwide lack access to basic banking services. Traditional credit systems require existing credit history, creating a catch-22 that locks people out. Halo Protocol provides an alternative path: build a verifiable credit score by participating in community lending circles, using only a smartphone and a Stacks wallet.",
    scenario:
      "Maria lives in a rural area with no bank branch nearby. She downloads a Stacks wallet, joins a lending circle with her neighbors, and starts building an on-chain credit score. After completing two circles with perfect payment history, her score reaches 720 -- opening doors to DeFi lending protocols that accept Halo credit scores.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    stats: [
      { value: "1.4B", label: "Unbanked adults globally" },
      { value: "$0", label: "Minimum to start" },
    ],
  },
  {
    title: "Small Business Owners",
    tagline: "Bootstrap capital through community trust",
    description:
      "Small business owners often need short-term capital for inventory, equipment, or seasonal expenses. Traditional small business loans require lengthy applications, collateral, and established credit. Halo Protocol lets entrepreneurs pool resources with other business owners, accessing capital on a predictable rotating schedule.",
    scenario:
      "James runs a small food cart and needs 200 STX to buy supplies for the upcoming festival season. He creates a circle with 5 other local vendors, each contributing 40 STX per round. James receives the first payout and stocks up on inventory. Over the following rounds, he contributes back, building both his credit and his business relationships.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    stats: [
      { value: "10-500", label: "STX per contribution" },
      { value: "5 min", label: "To create a circle" },
    ],
  },
  {
    title: "Community Savings Groups",
    tagline: "Digitize traditional savings clubs",
    description:
      "Savings groups and tandas have existed for centuries across cultures -- from susus in West Africa to chit funds in India to tandas in Latin America. Halo Protocol digitizes these trusted traditions, adding the guarantees of smart contracts while preserving the community-first ethos.",
    scenario:
      "A church group of 8 members has been running an informal monthly savings pool using cash envelopes. They migrate to Halo Protocol to eliminate the burden of manual bookkeeping and cash handling. The smart contract tracks every contribution, the payout rotation is transparent, and members can verify everything on the Stacks explorer. Their informal trust network now has formal, verifiable guarantees.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    stats: [
      { value: "3-10", label: "Members per circle" },
      { value: "100%", label: "On-chain transparency" },
    ],
  },
  {
    title: "Credit Building for Immigrants",
    tagline: "Start fresh with a portable score",
    description:
      "Immigrants arriving in a new country often start with zero credit history, regardless of their financial track record back home. Traditional credit systems do not transfer across borders. Halo Protocol provides a borderless credit score that lives on the blockchain -- accessible from anywhere, recognized by any protocol that integrates with it.",
    scenario:
      "Priya recently moved from India where she had excellent financial standing, but her new country's credit bureaus show no record. She joins a Halo circle with other newcomers from her community center. After six months of consistent contributions, she has an on-chain credit score of 680 and a verifiable payment history that any DeFi protocol can read directly from the blockchain.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    stats: [
      { value: "0", label: "Starting credit needed" },
      { value: "Global", label: "Score portability" },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="relative pt-28 pb-20 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Use Cases
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Halo Protocol is designed for anyone excluded from traditional
            financial systems. Here are the communities we serve and the
            problems we solve.
          </p>
        </div>

        {/* Use case cards */}
        <div className="space-y-12">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="glass-card p-8 md:p-10">
              <div className="flex flex-col gap-8">
                {/* Top: Icon + Title + Description */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                      {useCase.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">
                      {useCase.tagline}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      {useCase.title}
                    </h2>
                    <p className="text-neutral-400 leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                </div>

                {/* Scenario */}
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5 text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                      Example Scenario
                    </h3>
                  </div>
                  <p className="text-neutral-400 text-sm leading-relaxed italic">
                    {useCase.scenario}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  {useCase.stats.map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="glass-card inline-block p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              See Yourself Here?
            </h2>
            <p className="text-neutral-400 mb-6 max-w-lg mx-auto">
              Whether you are building credit for the first time or bringing your
              community's savings tradition on-chain, Halo Protocol is for you.
            </p>
            <a
              href="/signin"
              className="inline-flex items-center justify-center rounded-md bg-white text-[#0B0F1A] font-semibold px-8 py-3 hover:bg-neutral-200 transition-colors"
            >
              Join Halo Protocol
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
