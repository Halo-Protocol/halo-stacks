import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - Halo Protocol",
  description:
    "Cookie Policy for Halo Protocol. Learn about the cookies we use and why.",
  openGraph: {
    title: "Cookie Policy - Halo Protocol",
    description:
      "Cookie Policy for Halo Protocol. Learn about the cookies we use and why.",
  },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="text-neutral-400">Last updated: February 2026</p>
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10">
          <div className="space-y-10">
            {/* Introduction */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                1. What Are Cookies
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                Cookies are small text files stored on your device by your web
                browser. They are widely used to make websites function
                correctly, improve user experience, and provide information to
                site operators. This policy explains how Halo Protocol uses
                cookies on the gethalo.fun platform.
              </p>
            </section>

            {/* Our Approach */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                2. Our Approach: Essential Cookies Only
              </h2>
              <p className="mb-4 text-neutral-400 leading-relaxed">
                Halo Protocol uses <strong className="text-neutral-300">essential cookies only</strong>.
                We do not use tracking cookies, advertising cookies, analytics
                cookies, or any third-party marketing cookies. We believe in
                minimal data collection and respect your privacy.
              </p>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-neutral-400">
                  <strong className="text-green-400">No tracking.</strong> We do
                  not track your browsing behavior, serve targeted ads, or share
                  cookie data with advertisers.
                </p>
              </div>
            </section>

            {/* Cookies We Use */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                3. Cookies We Use
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 pr-4 text-neutral-300 font-medium">
                        Cookie Name
                      </th>
                      <th className="pb-3 pr-4 text-neutral-300 font-medium">
                        Purpose
                      </th>
                      <th className="pb-3 pr-4 text-neutral-300 font-medium">
                        Type
                      </th>
                      <th className="pb-3 text-neutral-300 font-medium">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-400">
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4 font-mono text-xs text-violet-400">
                        next-auth.session-token
                      </td>
                      <td className="py-3 pr-4">
                        Maintains your authenticated session after signing in
                        with Google or GitHub OAuth
                      </td>
                      <td className="py-3 pr-4">Essential</td>
                      <td className="py-3">Session</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4 font-mono text-xs text-violet-400">
                        next-auth.csrf-token
                      </td>
                      <td className="py-3 pr-4">
                        Protects against cross-site request forgery (CSRF)
                        attacks during authentication
                      </td>
                      <td className="py-3 pr-4">Essential</td>
                      <td className="py-3">Session</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 pr-4 font-mono text-xs text-violet-400">
                        next-auth.callback-url
                      </td>
                      <td className="py-3 pr-4">
                        Stores the URL to redirect you to after successful
                        authentication
                      </td>
                      <td className="py-3 pr-4">Essential</td>
                      <td className="py-3">Session</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono text-xs text-violet-400">
                        __Secure-next-auth.session-token
                      </td>
                      <td className="py-3 pr-4">
                        Secure variant of the session token used in production
                        (HTTPS only)
                      </td>
                      <td className="py-3 pr-4">Essential</td>
                      <td className="py-3">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Authentication Cookies */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                4. Authentication Cookies (NextAuth)
              </h2>
              <p className="mb-4 text-neutral-400 leading-relaxed">
                We use NextAuth.js for authentication, which sets cookies to
                manage your login session. These cookies are strictly necessary
                for the Platform to function when you choose to sign in. They
                contain an encrypted session token and do not store any personal
                information directly.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                If you sign in using Google or GitHub OAuth, those providers may
                also set their own cookies during the authentication flow. Those
                cookies are governed by the respective provider&apos;s cookie
                policies.
              </p>
            </section>

            {/* What We Don't Use */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                5. Cookies We Do Not Use
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-300">Analytics cookies:</strong>{" "}
                  We do not use Google Analytics, Mixpanel, or similar tracking
                  services
                </li>
                <li>
                  <strong className="text-neutral-300">Advertising cookies:</strong>{" "}
                  We do not serve ads or use advertising networks
                </li>
                <li>
                  <strong className="text-neutral-300">Social media cookies:</strong>{" "}
                  We do not embed social media tracking pixels or widgets
                </li>
                <li>
                  <strong className="text-neutral-300">Preference cookies:</strong>{" "}
                  We do not currently store user preferences in cookies (theme,
                  language, etc.)
                </li>
              </ul>
            </section>

            {/* Managing Cookies */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                6. Managing Cookies
              </h2>
              <p className="mb-4 text-neutral-400 leading-relaxed">
                You can control and manage cookies through your browser settings.
                Most browsers allow you to block or delete cookies. However, if
                you block the essential cookies listed above, you will not be
                able to sign in to the Platform.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                Because we only use essential cookies, there is no cookie consent
                banner. Essential cookies do not require consent under most
                privacy regulations as they are strictly necessary for the
                service you have requested.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                7. Changes to This Policy
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect
                changes in the cookies we use or for other operational, legal, or
                regulatory reasons. We will update the &ldquo;Last
                updated&rdquo; date at the top of this page when changes are
                made.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">
                8. Contact
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                If you have questions about our use of cookies, please contact us
                at{" "}
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
