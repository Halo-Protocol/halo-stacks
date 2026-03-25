import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Halo Protocol",
  tagline: "Decentralized lending circles on Stacks, secured by Bitcoin.",
  favicon: "img/favicon.ico",

  url: "https://docs.gethalo.fun",
  baseUrl: "/",

  organizationName: "halo-protocol",
  projectName: "halo-stacks",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/halo-protocol/halo-stacks/tree/main/docs-site/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/halo-social-card.png",
    navbar: {
      title: "Halo Protocol",
      logo: {
        alt: "Halo Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://gethalo.fun",
          label: "Launch App",
          position: "right",
        },
        {
          href: "https://github.com/halo-protocol/halo-stacks",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Learn",
          items: [
            { label: "What is Halo?", to: "/overview/what-is-halo" },
            { label: "How It Works", to: "/overview/how-it-works" },
            { label: "Getting Started", to: "/guides/getting-started" },
          ],
        },
        {
          title: "Protocol",
          items: [
            { label: "Lending Circles", to: "/protocol/circles" },
            { label: "Credit Scoring", to: "/protocol/credit-scoring" },
            { label: "Collateral Vault", to: "/protocol/vault" },
            { label: "sBTC Staking", to: "/protocol/sbtc-staking" },
          ],
        },
        {
          title: "Developers",
          items: [
            { label: "Smart Contracts", to: "/developers/contracts" },
            { label: "API Reference", to: "/developers/api" },
            { label: "Integration Guide", to: "/developers/integration" },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "GitHub", href: "https://github.com/halo-protocol/halo-stacks" },
            { label: "Discord", href: "https://discord.gg/halo" },
            { label: "Twitter", href: "https://twitter.com/haloprotocol" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Halo Protocol. Built on Stacks, secured by Bitcoin.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "toml"],
    },
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
