import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Halo Protocol",
  description:
    "Learn about Halo Protocol's mission to make credit accessible through community-driven lending circles on the Stacks blockchain.",
  openGraph: {
    title: "About - Halo Protocol",
    description:
      "Learn about Halo Protocol's mission to make credit accessible through community-driven lending circles on the Stacks blockchain.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            About Halo Protocol
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-400">
            Making credit accessible through community. Built on Stacks.
            Secured by Bitcoin.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <h2 className="mb-6 text-2xl font-semibold text-white">
              Our Mission
            </h2>
            <p className="mb-4 text-neutral-400 leading-relaxed">
              Billions of people around the world lack access to formal credit.
              Without a credit score, they can&apos;t get loans, rent
              apartments, or access financial services that many take for
              granted. Halo Protocol exists to change that.
            </p>
            <p className="mb-4 text-neutral-400 leading-relaxed">
              We&apos;re building a decentralized lending circle protocol
              &mdash; known as a ROSCA (Rotating Savings and Credit Association)
              &mdash; that lets communities pool resources, take turns receiving
              funds, and build verifiable credit histories on-chain.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              Your credit score belongs to you, stored immutably on the
              blockchain. No middlemen. No gatekeepers. Just community trust,
              verified by code.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">
            How It Works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Form a Circle
              </h3>
              <p className="text-sm text-neutral-400">
                Create or join a lending circle with people you trust. Set
                contribution amounts, round frequency, and circle size.
              </p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Contribute Each Round
              </h3>
              <p className="text-sm text-neutral-400">
                Every round, all members contribute a fixed amount. One member
                receives the entire pot. Smart contracts enforce the rules.
              </p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Build Credit
              </h3>
              <p className="text-sm text-neutral-400">
                Every on-time payment is recorded on-chain. Complete circles to
                earn a verifiable credit score that you own forever.
              </p>
            </div>
          </div>
        </section>

        {/* Built on Stacks */}
        <section className="mb-16">
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <h2 className="mb-6 text-2xl font-semibold text-white">
              Built on Stacks, Secured by Bitcoin
            </h2>
            <p className="mb-4 text-neutral-400 leading-relaxed">
              Halo Protocol is built on the Stacks blockchain, which settles
              transactions on Bitcoin &mdash; the most secure and decentralized
              network in the world. Our smart contracts are written in Clarity, a
              decidable language that makes it possible to formally verify
              contract behavior before deployment.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              This means your funds are governed by transparent, auditable code.
              No hidden logic. No rug pulls. Every rule is readable directly
              on-chain.
            </p>
          </div>
        </section>

        {/* Open Source */}
        <section>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <h2 className="mb-6 text-2xl font-semibold text-white">
              Open Source, Community-Driven
            </h2>
            <p className="mb-4 text-neutral-400 leading-relaxed">
              Halo Protocol is fully open source under the MIT license. We
              believe that financial infrastructure should be transparent,
              auditable, and owned by the community it serves.
            </p>
            <p className="mb-6 text-neutral-400 leading-relaxed">
              We welcome contributions from developers, designers, and community
              organizers. Whether you want to improve the smart contracts, build
              new features, or help onboard communities &mdash; there&apos;s a
              place for you.
            </p>
            <a
              href="https://github.com/Halo-Protocol/halo-stacks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              View on GitHub
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
