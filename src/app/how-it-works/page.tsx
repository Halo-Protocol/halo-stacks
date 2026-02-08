import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works - Halo Protocol",
  description:
    "Learn how Halo Protocol works: sign up, connect your wallet, join a lending circle, and build your on-chain credit score on Stacks.",
  openGraph: {
    title: "How It Works - Halo Protocol",
    description:
      "Learn how Halo Protocol works: sign up, connect your wallet, join a lending circle, and build your on-chain credit score.",
  },
};

const steps = [
  {
    number: "01",
    title: "Sign Up & Verify Your Identity",
    description:
      "Create your Halo Protocol account using Google or GitHub OAuth. Your identity is verified through our sybil-resistant system to ensure one account per person, protecting the integrity of every circle.",
    details: [
      "Sign in with Google or GitHub -- no passwords to manage",
      "Identity verification prevents duplicate accounts",
      "Your personal data stays private; only your wallet address is on-chain",
      "Account creation is completely free",
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
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Connect Your Stacks Wallet",
    description:
      "Link your Leather or Xverse wallet to your account. This one-time binding connects your on-chain identity to your Halo account, enabling you to make contributions and receive payouts directly.",
    details: [
      "Supports Leather and Xverse wallets",
      "One-time permanent wallet binding for security",
      "Your wallet is how you interact with all smart contracts",
      "Testnet STX available through the built-in faucet",
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
          d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.008A2.25 2.25 0 0021 6V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V12z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Join or Create a Circle",
    description:
      "Browse existing circles and request to join, or create your own with custom parameters. As a circle creator, you define the contribution amount, number of rounds, and member capacity.",
    details: [
      "Browse open circles filtered by size, amount, and status",
      "Create a new circle with custom contribution amounts (10-500 STX)",
      "Set the number of members (3-10) and round schedule",
      "Invite friends or let others discover your circle",
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
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Contribute & Build Credit",
    description:
      "Make your STX contributions on time each round. Every on-time payment increases your credit score. When it is your turn, the full pooled amount is automatically sent to your wallet by the smart contract.",
    details: [
      "Contributions are collected by the halo-vault smart contract",
      "On-time payments boost your credit score (300-850 range)",
      "Payouts are automatic -- no manual claims needed",
      "Complete circles to unlock higher-tier opportunities",
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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
];

const faqs = [
  {
    question: "What is a lending circle (ROSCA)?",
    answer:
      "A Rotating Savings and Credit Association (ROSCA) is a group of individuals who agree to meet for a defined period in order to save and borrow together. Each member contributes a fixed amount each round, and the total pool is given to one member on a rotating basis. Halo Protocol automates this process with smart contracts on the Stacks blockchain.",
  },
  {
    question: "Do I need cryptocurrency to get started?",
    answer:
      "You need STX tokens to make contributions and pay gas fees. On testnet, you can get free test STX through our built-in faucet (plus mock hUSD and sBTC tokens). For mainnet, you will need to acquire real STX through an exchange.",
  },
  {
    question: "What happens if a member misses a payment?",
    answer:
      "Missed payments are recorded on-chain and negatively impact the member's credit score. The smart contract tracks all payment activity, and repeated missed payments can affect a member's ability to join future circles.",
  },
  {
    question: "How is my credit score calculated?",
    answer:
      "Your credit score (300-850) is calculated based on several factors: on-time payment history (the most significant factor), circle completion rate, account age, and overall participation. The score is computed and stored on-chain via the halo-credit smart contract.",
  },
  {
    question: "Is my money safe in the vault?",
    answer:
      "Circle funds are held in the halo-vault Clarity smart contract -- not by any person or company. The contract code is open-source and auditable. Post-conditions on every transaction ensure exact amounts are transferred. No admin keys or backdoors exist in the contract.",
  },
  {
    question: "Which wallets are supported?",
    answer:
      "Halo Protocol supports Leather (formerly Hiro Wallet) and Xverse wallet for Stacks. Both are available as browser extensions. You connect your wallet once, and it is permanently bound to your Halo account for security.",
  },
  {
    question: "What are the fees?",
    answer:
      "Halo Protocol charges a 1% protocol fee on circle payouts. The only other cost is STX gas fees for on-chain transactions, which are typically fractions of a cent. There are no sign-up fees, monthly fees, or hidden charges.",
  },
  {
    question: "Can I be in multiple circles at once?",
    answer:
      "Yes, you can participate in multiple circles simultaneously. This can actually help build your credit score faster, as diversity of circle participation is one of the factors in the scoring algorithm. Just make sure you can meet all your contribution obligations.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="relative pt-28 pb-20 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How It Works
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Get started with Halo Protocol in four simple steps. From sign-up to
            building your on-chain credit score, the entire process is designed
            to be straightforward and transparent.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12 mb-24">
          {steps.map((step, index) => (
            <div key={step.number} className="glass-card p-8 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Step number + icon */}
                <div className="shrink-0 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white font-mono text-xl font-bold">
                    {step.number}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center md:hidden">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {step.title}
                  </h2>
                  <p className="text-neutral-400 leading-relaxed mb-6">
                    {step.description}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {step.details.map((detail) => (
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

                {/* Desktop icon */}
                <div className="hidden md:flex w-14 h-14 rounded-xl bg-white/5 items-center justify-center shrink-0">
                  {step.icon}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block ml-8 mt-6">
                  <div className="w-px h-8 bg-white/10 mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mb-24">
          <div className="glass-card inline-block p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-neutral-400 mb-6 max-w-lg mx-auto">
              Join the Halo Protocol community and start building your on-chain
              credit score today. It only takes a few minutes.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-md bg-white text-[#0B0F1A] font-semibold px-8 py-3 hover:bg-neutral-200 transition-colors"
            >
              Create Your Account
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Common questions about Halo Protocol, lending circles, and on-chain
              credit scoring.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
