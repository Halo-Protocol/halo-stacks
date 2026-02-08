import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whitepaper - Halo Protocol",
  description:
    "Halo Protocol whitepaper: decentralized lending circles (ROSCA) on Stacks, bringing verifiable credit scoring to 2 billion unbanked people worldwide.",
  openGraph: {
    title: "Whitepaper - Halo Protocol",
    description:
      "Decentralized lending circles on Stacks, bringing verifiable credit scoring to 2 billion unbanked people worldwide.",
  },
};

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 grid-pattern">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
            Whitepaper v1.0 &mdash; February 2026
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Halo Protocol
          </h1>
          <p className="text-xl text-neutral-400 max-w-3xl">
            Decentralized Lending Circles with On-Chain Credit Scoring on the
            Stacks Blockchain
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        {/* Abstract */}
        <section>
          <div className="glass-card p-8">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Abstract
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Halo Protocol introduces a decentralized implementation of Rotating
              Savings and Credit Associations (ROSCAs) on the Stacks blockchain.
              By combining the centuries-old practice of community-based lending
              circles with programmable smart contracts and Bitcoin-secured
              finality, Halo enables participants to build verifiable,
              portable credit scores without relying on centralized credit
              bureaus. The protocol targets the 2 billion adults worldwide who
              lack access to formal financial services, providing a trustless
              mechanism for cooperative savings and credit building.
            </p>
          </div>
        </section>

        {/* Problem Statement */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            1. Problem Statement
          </h2>
          <div className="space-y-4 text-neutral-400 leading-relaxed">
            <p>
              An estimated 2 billion adults globally remain unbanked, lacking
              access to basic financial services such as savings accounts, credit
              lines, and insurance. Even in developed economies, millions are
              considered &ldquo;credit invisible&rdquo;&mdash;individuals with no
              credit history at traditional bureaus, effectively locked out of
              housing, employment, and lending markets.
            </p>
            <p>
              Traditional credit scoring systems suffer from three fundamental
              flaws:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-2">
                  Centralization
                </h3>
                <p className="text-sm text-neutral-400">
                  A handful of credit bureaus control the financial identities of
                  billions. Data breaches, errors, and opaque algorithms
                  disproportionately harm vulnerable populations.
                </p>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-2">Exclusion</h3>
                <p className="text-sm text-neutral-400">
                  Traditional models require existing credit to build credit,
                  creating a circular dependency that excludes first-time
                  borrowers, immigrants, and the economically marginalized.
                </p>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-2">Opacity</h3>
                <p className="text-sm text-neutral-400">
                  Scoring algorithms are proprietary black boxes. Consumers
                  cannot audit, verify, or port their credit data between
                  providers or jurisdictions.
                </p>
              </div>
            </div>
            <p>
              Meanwhile, informal lending circles (known as tandas, chit funds,
              susus, or ROSCAs) have operated successfully across cultures for
              centuries. These community-based savings groups demonstrate that
              peer accountability and social trust can underwrite financial
              cooperation without institutional intermediaries. Halo Protocol
              formalizes this model on-chain.
            </p>
          </div>
        </section>

        {/* ROSCA Mechanism */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            2. Mechanism Design: The ROSCA Model
          </h2>
          <div className="space-y-4 text-neutral-400 leading-relaxed">
            <p>
              A Rotating Savings and Credit Association is a group of individuals
              who agree to contribute a fixed amount of money to a common pool at
              regular intervals. In each round, one member receives the entire
              pool. The rotation continues until every member has received the
              payout exactly once.
            </p>
          </div>

          <div className="glass-card p-8 mt-8 space-y-6">
            <h3 className="text-xl font-semibold text-white">
              Circle Lifecycle
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  1
                </span>
                <div>
                  <p className="text-white font-medium">Formation</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    A creator defines the circle parameters: contribution amount,
                    number of members, payout frequency, and token type (hUSD or
                    sBTC). Members join by registering their on-chain identity.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  2
                </span>
                <div>
                  <p className="text-white font-medium">Activation</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Once the required number of members join, the circle
                    activates. The smart contract locks the configuration and
                    begins tracking rounds.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  3
                </span>
                <div>
                  <p className="text-white font-medium">Contribution Rounds</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Each round, all members contribute the fixed amount to the
                    vault contract. Contributions are recorded on-chain with
                    timestamps for credit scoring.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  4
                </span>
                <div>
                  <p className="text-white font-medium">Payout</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    The designated recipient for the round receives the pooled
                    funds from the vault. Payout order is determined at
                    activation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-sm font-semibold text-white shrink-0">
                  5
                </span>
                <div>
                  <p className="text-white font-medium">Completion</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    After all members have received their payout, the circle
                    completes. Final credit score adjustments are applied based
                    on participation quality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Credit Scoring */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            3. Credit Scoring Algorithm
          </h2>
          <div className="space-y-4 text-neutral-400 leading-relaxed">
            <p>
              Halo Protocol implements a transparent, on-chain credit scoring
              system with scores ranging from 300 (minimum) to 850 (maximum).
              Unlike traditional credit bureaus, every factor and weight is
              publicly auditable in the smart contract code. Scores are
              computed deterministically from on-chain data.
            </p>
          </div>

          <div className="glass-card p-8 mt-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              Score Components
            </h3>
            <div className="space-y-6">
              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Payment History</h4>
                  <span className="text-sm font-mono text-neutral-400">
                    35% weight
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-white/40"
                    style={{ width: "35%" }}
                  />
                </div>
                <p className="text-sm text-neutral-400">
                  The single most important factor. Tracks the ratio of on-time
                  contributions to total expected contributions across all
                  circles. Late or missed payments have a significant negative
                  impact. Maximum contribution: +192 points.
                </p>
              </div>

              {/* Circle Completion */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Circle Completion</h4>
                  <span className="text-sm font-mono text-neutral-400">
                    25% weight
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-white/40"
                    style={{ width: "25%" }}
                  />
                </div>
                <p className="text-sm text-neutral-400">
                  Measures the number of circles a participant has completed
                  without defaulting. Completing circles demonstrates long-term
                  reliability and commitment to the community. Maximum
                  contribution: +137 points.
                </p>
              </div>

              {/* Account Age */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Account Age</h4>
                  <span className="text-sm font-mono text-neutral-400">
                    15% weight
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-white/40"
                    style={{ width: "15%" }}
                  />
                </div>
                <p className="text-sm text-neutral-400">
                  Longer participation history indicates stability. Calculated
                  from the block height of the first on-chain identity
                  registration to the current block. Maximum contribution: +82
                  points.
                </p>
              </div>

              {/* Utilization */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Utilization</h4>
                  <span className="text-sm font-mono text-neutral-400">
                    15% weight
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-white/40"
                    style={{ width: "15%" }}
                  />
                </div>
                <p className="text-sm text-neutral-400">
                  Measures the total volume of funds contributed relative to
                  capacity. Healthy utilization signals active participation
                  without overextension. Includes both STX and token-denominated
                  contributions. Maximum contribution: +82 points.
                </p>
              </div>

              {/* Diversity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Diversity</h4>
                  <span className="text-sm font-mono text-neutral-400">
                    10% weight
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-white/40"
                    style={{ width: "10%" }}
                  />
                </div>
                <p className="text-sm text-neutral-400">
                  Rewards participation across different circle sizes, token
                  types, and contribution amounts. Diversified participation
                  demonstrates adaptability and broad community engagement.
                  Maximum contribution: +55 points.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Total Range</span>
                <span className="font-mono text-white">300 &ndash; 850</span>
              </div>
              <p className="text-sm text-neutral-400 mt-2">
                All new participants begin at 300. The theoretical maximum of 850
                requires sustained, diversified participation over an extended
                period. Score tiers: Building (300-499), Fair (500-649), Good
                (650-749), Excellent (750-850).
              </p>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            4. Technical Architecture
          </h2>
          <div className="space-y-4 text-neutral-400 leading-relaxed">
            <p>
              Halo Protocol is built on the Stacks blockchain, a Layer 2 that
              settles transactions on Bitcoin. This provides the security
              guarantees of Bitcoin&apos;s proof-of-work consensus while enabling
              the expressive smart contract capabilities required for ROSCA
              management and credit scoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Clarity Smart Contracts
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                All protocol logic is implemented in Clarity, a decidable
                language that prevents reentrancy attacks and enables complete
                static analysis. Clarity&apos;s interpreted execution means what you
                see in the source code is exactly what runs on-chain&mdash;no
                compiler bugs, no hidden optimizations. The protocol uses 8
                contracts with explicit, minimal trust boundaries between them.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bitcoin Settlement
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Every Stacks transaction is anchored to a Bitcoin block through
                the Proof of Transfer (PoX) consensus mechanism. This means
                circle contributions, payouts, and credit score updates inherit
                Bitcoin&apos;s finality. Reversing a Halo transaction would require
                reorganizing the Bitcoin blockchain itself.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Vault Security Model
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Circle funds are held in the halo-vault contract, not in user
                wallets or the circle contract. The vault enforces strict access
                controls: only authorized circle contracts can deposit or
                withdraw, and only the designated round recipient can claim the
                payout. This separation of concerns limits the blast radius of
                any single contract vulnerability.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                sBTC Staking Integration
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                The halo-sbtc-staking contract enables participants to stake sBTC
                (synthetic Bitcoin on Stacks) for yield generation and credit
                score boosts. Staking demonstrates long-term commitment to the
                protocol and provides additional security through economic
                alignment between participants and the network.
              </p>
            </div>
          </div>
        </section>

        {/* Tokenomics */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            5. Token Design
          </h2>
          <div className="space-y-4 text-neutral-400 leading-relaxed">
            <p>
              Halo Protocol supports two token standards for circle
              contributions, both compliant with the SIP-010 fungible token
              standard:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                hUSD (Halo USD)
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                A stable-value token used for circle contributions. On testnet,
                hUSD is minted via the faucet (1,000 hUSD per claim, 24-hour
                cooldown). On mainnet, hUSD will be backed by a basket of
                stablecoins or minted through a collateralization mechanism.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                sBTC (Synthetic Bitcoin)
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                A 1:1 Bitcoin-backed token on Stacks. sBTC-denominated circles
                allow participants to build credit while maintaining Bitcoin
                exposure. sBTC can also be staked in the halo-sbtc-staking
                contract for additional yield and credit score benefits.
              </p>
            </div>
          </div>
        </section>

        {/* Governance and Future */}
        <section className="pb-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            6. Roadmap
          </h2>
          <div className="glass-card p-8">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10 border border-green-500/20 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Phase 1-7: Foundation (Completed)
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Smart contract development, backend API, frontend
                    application, security hardening, deployment scripts, testnet
                    launch preparation, and production hardening. 412 tests
                    passing across all layers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Phase 8: Testnet Launch
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    User testing with 30-50 participants on Stacks testnet.
                    Faucet distribution of testnet hUSD and sBTC. Real-world
                    circle formation and credit score accumulation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-neutral-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Phase 9: Security Audit & Mainnet
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Third-party security audit of all 8 smart contracts.
                    Resolution of critical and high findings. Mainnet deployment
                    with real value at stake.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-neutral-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Phase 10: Ecosystem Growth
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Cross-protocol credit score portability. Integration with
                    DeFi lending markets. Governance token and DAO formation for
                    protocol parameter management. Mobile application launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
