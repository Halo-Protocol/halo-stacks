import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "doc",
      id: "index",
      label: "Introduction",
    },
    {
      type: "category",
      label: "Overview",
      collapsed: false,
      items: [
        "overview/what-is-halo",
        "overview/how-it-works",
        "overview/tokenomics",
      ],
    },
    {
      type: "category",
      label: "Protocol",
      collapsed: false,
      items: [
        "protocol/overview",
        "protocol/circles",
        "protocol/credit-scoring",
        "protocol/vault",
        "protocol/sbtc-staking",
        "protocol/identity",
      ],
    },
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: [
        "guides/getting-started",
        "guides/wallet-setup",
        "guides/creating-a-circle",
        "guides/faucet",
      ],
    },
    {
      type: "category",
      label: "Developers",
      collapsed: false,
      items: [
        "developers/contracts",
        "developers/api",
        "developers/integration",
      ],
    },
    {
      type: "category",
      label: "Governance",
      items: ["governance/admin"],
    },
    {
      type: "category",
      label: "Resources",
      items: [
        "resources/security",
        "resources/faq",
        "resources/glossary",
      ],
    },
  ],
};

export default sidebars;
