import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SDK & Developer Tools - Halo Protocol",
  description:
    "Integrate Halo Protocol into your application. SDK guides for @stacks/connect, @stacks/transactions, wallet integration, and contract interactions.",
  openGraph: {
    title: "SDK & Developer Tools - Halo Protocol",
    description:
      "Integrate Halo Protocol into your application with Stacks SDK tools and code examples.",
  },
};

export default function SdkPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 grid-pattern">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SDK &amp; Developer Tools
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl">
            Everything you need to integrate Halo Protocol into your
            application. Connect wallets, call contracts, and build on
            decentralized credit.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        {/* Package Overview */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            Core Packages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-2">
                @stacks/connect
              </h3>
              <p className="text-xs text-neutral-500 mb-3">v8.x</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Wallet integration for Leather and Xverse. Handles
                authentication, transaction signing, and message signing in the
                browser. Required for all user-facing interactions.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-2">
                @stacks/transactions
              </h3>
              <p className="text-xs text-neutral-500 mb-3">v7.x</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Build, sign, and broadcast Stacks transactions. Call smart
                contract functions, construct post-conditions, and read on-chain
                state. Server-side and client-side compatible.
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-2">
                @stacks/network
              </h3>
              <p className="text-xs text-neutral-500 mb-3">v7.x</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Network configuration for testnet and mainnet. Use{" "}
                <code className="text-xs bg-white/5 px-1 rounded">
                  networkFromName()
                </code>{" "}
                to get the correct API endpoints and chain ID for your target
                environment.
              </p>
            </div>
          </div>
        </section>

        {/* Installation */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            Getting Started
          </h2>
          <div className="glass-card p-8 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                1. Install Dependencies
              </h3>
              <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
                <pre>{`npm install @stacks/connect @stacks/transactions @stacks/network`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                2. Configure Network
              </h3>
              <p className="text-neutral-400 text-sm mb-3">
                Set up the Stacks network for your target environment. The v7
                SDK uses factory functions instead of class constructors.
              </p>
              <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
                <pre>{`import { networkFromName } from "@stacks/network";

// For testnet development
const network = networkFromName("testnet");

// For mainnet production
// const network = networkFromName("mainnet");

// Deployer address (set via environment variable)
const DEPLOYER = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS;`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                3. Set Environment Variables
              </h3>
              <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
                <pre>{`# .env.local
NEXT_PUBLIC_DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
NEXT_PUBLIC_STACKS_NETWORK=testnet`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Wallet Connection */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            Wallet Connection
          </h2>
          <div className="glass-card p-8 space-y-6">
            <p className="text-neutral-400 text-sm leading-relaxed">
              Use <code className="font-mono text-xs bg-white/5 px-1 rounded">@stacks/connect</code> to
              prompt users to connect their Leather or Xverse wallet. The
              component must use{" "}
              <code className="font-mono text-xs bg-white/5 px-1 rounded">&quot;use client&quot;</code> and
              dynamic imports to avoid SSR errors.
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
              <pre>{`"use client";

import { showConnect } from "@stacks/connect";

function ConnectWallet() {
  const handleConnect = () => {
    showConnect({
      appDetails: {
        name: "Halo Protocol",
        icon: "/logo.png",
      },
      onFinish: (data) => {
        const address = data.userSession
          .loadUserData()
          .profile.stxAddress.testnet;
        console.log("Connected:", address);
      },
      onCancel: () => {
        console.log("User cancelled");
      },
    });
  };

  return (
    <button onClick={handleConnect}>
      Connect Wallet
    </button>
  );
}`}</pre>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm text-amber-400 font-medium mb-1">
                Important: SSR Compatibility
              </p>
              <p className="text-xs text-neutral-400">
                @stacks/connect requires browser APIs and will crash during
                server-side rendering. Always use{" "}
                <code className="font-mono bg-white/5 px-1 rounded">
                  &quot;use client&quot;
                </code>{" "}
                at the top of wallet components. For Next.js dynamic imports,
                use{" "}
                <code className="font-mono bg-white/5 px-1 rounded">
                  {`dynamic(() => import("..."), { ssr: false })`}
                </code>.
              </p>
            </div>
          </div>
        </section>

        {/* Contract Calls */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            Smart Contract Interactions
          </h2>

          {/* Read-only call */}
          <div className="glass-card p-8 space-y-6 mb-6">
            <h3 className="text-xl font-semibold text-white">
              Read-Only Contract Calls
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Read on-chain state without broadcasting a transaction. The v7 SDK
              uses{" "}
              <code className="font-mono text-xs bg-white/5 px-1 rounded">
                fetchCallReadOnlyFunction
              </code>{" "}
              (the old <code className="font-mono text-xs bg-white/5 px-1 rounded">callReadOnlyFunction</code> was
              removed).
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
              <pre>{`import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  principalCV,
} from "@stacks/transactions";
import { networkFromName } from "@stacks/network";

async function getCreditScore(address: string) {
  const network = networkFromName("testnet");
  const DEPLOYER = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS!;

  const result = await fetchCallReadOnlyFunction({
    network,
    contractAddress: DEPLOYER,
    contractName: "halo-credit",
    functionName: "get-credit-score",
    functionArgs: [principalCV(address)],
    senderAddress: address,
  });

  const json = cvToJSON(result);
  return json.value?.score?.value ?? 300;
}`}</pre>
            </div>
          </div>

          {/* Write call */}
          <div className="glass-card p-8 space-y-6 mb-6">
            <h3 className="text-xl font-semibold text-white">
              Write Transactions (Contract Calls)
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Broadcast state-changing transactions to the blockchain. The v7 SDK
              removed <code className="font-mono text-xs bg-white/5 px-1 rounded">AnchorMode</code>&mdash;simply
              omit it from the options object.
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
              <pre>{`import { openContractCall } from "@stacks/connect";
import { uintCV, stringUtf8CV } from "@stacks/transactions";

async function joinCircle(circleId: number) {
  const DEPLOYER = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS!;

  await openContractCall({
    contractAddress: DEPLOYER,
    contractName: "halo-circle",
    functionName: "join-circle",
    functionArgs: [uintCV(circleId)],
    onFinish: (data) => {
      console.log("TX broadcast:", data.txId);
    },
    onCancel: () => {
      console.log("User rejected transaction");
    },
  });
}`}</pre>
            </div>
          </div>

          {/* Post-conditions */}
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-semibold text-white">
              Post-Conditions
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Post-conditions protect users by ensuring a transaction only
              succeeds if specified conditions are met. The v7 SDK uses the
              fluent <code className="font-mono text-xs bg-white/5 px-1 rounded">Pc</code> builder
              (the old <code className="font-mono text-xs bg-white/5 px-1 rounded">makeStandardSTXPostCondition</code> was
              removed).
            </p>
            <div className="bg-[#111827] rounded-lg p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
              <pre>{`import { Pc } from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";

async function contributeToCircle(
  circleId: number,
  amount: number,
  senderAddress: string,
) {
  const DEPLOYER = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS!;

  // Ensure the user sends exactly the contribution amount
  const postConditions = [
    Pc.principal(senderAddress)
      .willSendEq(amount)
      .ustx(),
  ];

  await openContractCall({
    contractAddress: DEPLOYER,
    contractName: "halo-circle",
    functionName: "contribute",
    functionArgs: [uintCV(circleId)],
    postConditions,
    onFinish: (data) => {
      console.log("Contribution TX:", data.txId);
    },
  });
}`}</pre>
            </div>
          </div>
        </section>

        {/* Contract Reference */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            Contract Reference
          </h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Key public functions available on the Halo Protocol contracts.
            All contracts are deployed by the deployer address and use Clarity 3
            (Epoch 3.0).
          </p>

          <div className="space-y-4">
            {/* halo-identity */}
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-3">
                halo-identity
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      register-identity (name)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Register a new on-chain identity with a display name.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    READ
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      get-identity (principal)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Look up an identity by Stacks address.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* halo-credit */}
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-3">
                halo-credit
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      record-payment (user, circle-id, amount, on-time)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Record a circle contribution. Authorized via
                      contract-caller. Updates credit score components.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    READ
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      get-credit-score (principal)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Retrieve the composite credit score (300-850) for a user.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* halo-circle */}
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-3">
                halo-circle
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      create-circle (name, contribution, total-members,
                      token-type)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Create a new lending circle with specified parameters.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      join-circle (circle-id)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Join an existing circle that is still in formation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      contribute (circle-id)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Make a contribution for the current round. Transfers
                      tokens to the vault.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    READ
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      get-circle (circle-id)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Retrieve circle details including status, members, and
                      current round.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* halo-sbtc-staking */}
            <div className="glass-card p-6">
              <h3 className="font-mono text-sm text-white font-semibold mb-3">
                halo-sbtc-staking
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      stake (amount)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Stake sBTC for yield and credit score boost.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    WRITE
                  </span>
                  <div>
                    <code className="font-mono text-white">
                      unstake (amount)
                    </code>
                    <p className="text-neutral-400 text-xs mt-1">
                      Withdraw staked sBTC with accrued yield.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gotchas */}
        <section className="pb-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            Common Pitfalls
          </h2>
          <div className="glass-card p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-1">
                  v7 Breaking Changes
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  @stacks/transactions v7 removed several APIs.{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    callReadOnlyFunction
                  </code>{" "}
                  is replaced by{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    fetchCallReadOnlyFunction
                  </code>.{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    makeStandardSTXPostCondition
                  </code>{" "}
                  is replaced by the{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    Pc
                  </code>{" "}
                  fluent builder.{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    AnchorMode
                  </code>{" "}
                  is removed entirely.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Network Constructor Removal
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  @stacks/network v7 removed class constructors like{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    new StacksTestnet()
                  </code>. Use{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    networkFromName(&quot;testnet&quot;)
                  </code>{" "}
                  instead.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Clarity Map Field Names
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Clarity uses kebab-case for map field names (e.g.,{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    total-members
                  </code>). In JavaScript, access these with bracket notation:{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    {`result["total-members"]`}
                  </code>.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Credit Contract Authorization
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  The halo-credit contract&apos;s{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    record-payment
                  </code>{" "}
                  function uses{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    contract-caller
                  </code>{" "}
                  for authorization, not{" "}
                  <code className="font-mono text-xs bg-white/5 px-1 rounded">
                    tx-sender
                  </code>. Only the authorized circle contract can record
                  payments.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
