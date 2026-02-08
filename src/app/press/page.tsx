import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press - Halo Protocol",
  description:
    "Press resources and media information for Halo Protocol, the decentralized lending circle protocol on Stacks.",
  openGraph: {
    title: "Press - Halo Protocol",
    description:
      "Press resources and media information for Halo Protocol, the decentralized lending circle protocol on Stacks.",
  },
};

export default function PressPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Press
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-400">
            Media resources and information about Halo Protocol.
          </p>
        </div>

        {/* Key Facts */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">Key Facts</h2>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Protocol
                </dt>
                <dd className="text-white">Halo Protocol</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Website
                </dt>
                <dd>
                  <a
                    href="https://gethalo.fun"
                    className="text-violet-400 hover:text-violet-300 transition"
                  >
                    gethalo.fun
                  </a>
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Category
                </dt>
                <dd className="text-white">
                  DeFi / Decentralized Lending Circles (ROSCA)
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Blockchain
                </dt>
                <dd className="text-white">Stacks (secured by Bitcoin)</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Smart Contract Language
                </dt>
                <dd className="text-white">Clarity</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  License
                </dt>
                <dd className="text-white">MIT (fully open source)</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Stage
                </dt>
                <dd className="text-white">Testnet</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  Twitter
                </dt>
                <dd>
                  <a
                    href="https://twitter.com/halodotfun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition"
                  >
                    @halodotfun
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* About Halo */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">
            About Halo Protocol
          </h2>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <p className="mb-4 text-neutral-400 leading-relaxed">
              Halo Protocol is a decentralized lending circle (ROSCA) platform
              built on the Stacks blockchain. It enables communities to form
              savings circles, pool resources, and build verifiable on-chain
              credit scores &mdash; all without relying on traditional financial
              institutions.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              By leveraging Clarity smart contracts and Bitcoin&apos;s security,
              Halo Protocol brings centuries-old community finance practices
              on-chain, making credit accessible to the billions who are
              underserved by traditional financial systems.
            </p>
          </div>
        </section>

        {/* Brand Assets */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">
            Brand Assets
          </h2>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
            <p className="mb-4 text-neutral-400 leading-relaxed">
              Our brand kit includes the Halo Protocol logo, wordmark, and brand
              guidelines. Please use official assets when referencing Halo
              Protocol in media coverage.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              For brand assets and logo files, please contact us at the email
              below and we will provide a download link.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Press Inquiries
            </h2>
            <p className="mb-6 mx-auto max-w-lg text-neutral-400 leading-relaxed">
              For press inquiries, interviews, or media requests, please reach
              out to our press team.
            </p>
            <a
              href="mailto:press@usehalo.fun"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              press@usehalo.fun
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
