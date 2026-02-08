import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers - Halo Protocol",
  description:
    "Join the Halo Protocol team and help build the future of decentralized credit on the Stacks blockchain.",
  openGraph: {
    title: "Careers - Halo Protocol",
    description:
      "Join the Halo Protocol team and help build the future of decentralized credit on the Stacks blockchain.",
  },
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Careers
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-400">
            We&apos;re just getting started. Help us build the future of
            decentralized credit.
          </p>
        </div>

        {/* Message */}
        <section className="mb-16">
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10 text-center">
            <div className="mb-6 text-5xl">&#x1f331;</div>
            <h2 className="mb-4 text-2xl font-semibold text-white">
              We&apos;re Just Getting Started
            </h2>
            <p className="mb-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">
              Halo Protocol is an early-stage, open-source project building
              decentralized lending circles on Stacks. We don&apos;t have formal
              job postings yet, but we&apos;re always looking for passionate
              people who want to make a difference in financial inclusion.
            </p>
            <p className="mx-auto max-w-xl text-neutral-400 leading-relaxed">
              If you&apos;re excited about what we&apos;re building and want to
              contribute &mdash; whether as a developer, designer, community
              builder, or in any other capacity &mdash; we&apos;d love to hear
              from you.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">
            Our Values
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <h3 className="mb-3 text-lg font-semibold text-white">
                Open Source First
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Everything we build is open source. We believe financial
                infrastructure should be transparent, auditable, and accessible
                to everyone. Code is law, and law should be readable.
              </p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <h3 className="mb-3 text-lg font-semibold text-white">
                Financial Inclusion
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                We&apos;re building for the billions who lack access to formal
                credit. Our protocol turns community trust into verifiable
                credit, removing the barriers that traditional finance has built.
              </p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <h3 className="mb-3 text-lg font-semibold text-white">
                Blockchain Innovation
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                We push the boundaries of what&apos;s possible with Clarity
                smart contracts on Stacks. Bitcoin&apos;s security combined with
                Stacks&apos; programmability gives us the best of both worlds.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Interested?
            </h2>
            <p className="mb-6 mx-auto max-w-lg text-neutral-400 leading-relaxed">
              Drop us a line with a bit about yourself and what you&apos;d like
              to work on. We read every email.
            </p>
            <a
              href="mailto:founder@usehalo.fun"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              founder@usehalo.fun
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
