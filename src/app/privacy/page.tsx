import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Halo Protocol",
  description:
    "Privacy Policy for Halo Protocol. Learn how we collect, use, and protect your data.",
  openGraph: {
    title: "Privacy Policy - Halo Protocol",
    description:
      "Privacy Policy for Halo Protocol. Learn how we collect, use, and protect your data.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-neutral-400">Last updated: February 2026</p>
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
          <div className="space-y-10">
            {/* Introduction */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                1. Introduction
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                Halo Protocol (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
                &ldquo;us&rdquo;) operates the gethalo.fun website and
                decentralized lending circle protocol. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our platform. Please read this policy
                carefully. If you do not agree with the terms of this policy,
                please do not access the platform.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                2. Information We Collect
              </h2>

              <h3 className="mb-2 mt-6 text-lg font-medium text-white">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-300">Account Information:</strong>{" "}
                  When you sign in using Google or GitHub OAuth, we receive your
                  name, email address, and profile picture from the
                  authentication provider.
                </li>
                <li>
                  <strong className="text-neutral-300">Wallet Addresses:</strong>{" "}
                  When you connect a Stacks wallet (e.g., Leather, Xverse), we
                  store your public wallet address to associate it with your
                  account. We never have access to your private keys.
                </li>
                <li>
                  <strong className="text-neutral-300">Circle Participation:</strong>{" "}
                  Information about lending circles you create or join, including
                  contribution amounts and payment history.
                </li>
              </ul>

              <h3 className="mb-2 mt-6 text-lg font-medium text-white">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-300">Usage Data:</strong>{" "}
                  Browser type, operating system, pages visited, time spent on
                  pages, and other diagnostic data.
                </li>
                <li>
                  <strong className="text-neutral-300">Session Data:</strong>{" "}
                  Authentication tokens and session identifiers necessary for
                  keeping you signed in.
                </li>
              </ul>

              <h3 className="mb-2 mt-6 text-lg font-medium text-white">
                2.3 Blockchain Data
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Transactions you make through the Halo Protocol smart contracts
                are recorded on the Stacks blockchain and are publicly visible.
                This includes contributions, payouts, and credit score updates.
                Blockchain data is immutable and cannot be deleted.
              </p>
            </section>

            {/* How We Use Data */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>To provide and maintain the Halo Protocol platform</li>
                <li>
                  To authenticate your identity and manage your account sessions
                </li>
                <li>
                  To associate your wallet address with your account for circle
                  participation
                </li>
                <li>
                  To calculate and display credit scores based on on-chain
                  activity
                </li>
                <li>To improve and optimize the platform experience</li>
                <li>
                  To communicate important updates about the protocol or your
                  circles
                </li>
                <li>To detect and prevent fraud or abuse of the platform</li>
              </ul>
            </section>

            {/* No Selling */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                4. We Do Not Sell Your Data
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We do not sell, trade, or rent your personal information to third
                parties. We will never monetize your data. Your information is
                used solely to operate and improve the Halo Protocol platform.
              </p>
            </section>

            {/* Third Party Services */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                5. Third-Party Services
              </h2>
              <p className="mb-4 text-neutral-400 leading-relaxed">
                We use the following third-party services that may collect
                information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-300">Google OAuth:</strong>{" "}
                  For authentication. Subject to{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 underline"
                  >
                    Google&apos;s Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-neutral-300">GitHub OAuth:</strong>{" "}
                  For authentication. Subject to{" "}
                  <a
                    href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 underline"
                  >
                    GitHub&apos;s Privacy Statement
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-neutral-300">Stacks Blockchain:</strong>{" "}
                  Transaction data is publicly recorded on the Stacks blockchain
                  and viewable by anyone.
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                6. Cookies
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We use essential cookies only, required to maintain your
                authentication session. We do not use tracking cookies,
                advertising cookies, or analytics cookies. For more details, see
                our{" "}
                <a
                  href="/cookies"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  Cookie Policy
                </a>
                .
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                7. Data Security
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We implement reasonable security measures to protect your
                personal information, including encrypted connections (HTTPS),
                secure session management, and access controls. However, no
                method of transmission over the Internet is 100% secure, and we
                cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                8. Data Retention
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We retain your account information for as long as your account is
                active. You may request deletion of your off-chain data by
                contacting us. Please note that on-chain data (blockchain
                transactions, credit scores) is immutable and cannot be deleted
                or modified.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                9. Your Rights
              </h2>
              <p className="mb-4 text-neutral-400 leading-relaxed">
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your off-chain data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability</li>
              </ul>
            </section>

            {/* Children */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                10. Children&apos;s Privacy
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                Halo Protocol is not intended for use by individuals under the
                age of 18. We do not knowingly collect personal information from
                children. If we become aware that we have collected data from a
                child, we will take steps to delete it.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                11. Changes to This Policy
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the &ldquo;Last updated&rdquo; date. Your continued
                use of the platform after changes are posted constitutes your
                acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                12. Contact Us
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                If you have questions or concerns about this Privacy Policy or
                our data practices, please contact us at{" "}
                <a
                  href="mailto:founder@usehalo.fun"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  founder@usehalo.fun
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
