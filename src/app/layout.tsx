import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "../components/providers/providers";
import { Navbar } from "../components/layout/navbar";
import { Footer } from "../components/layout/footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const SITE_URL = process.env.NEXTAUTH_URL || "https://haloprotocol.xyz";
const SITE_NAME = "Halo Protocol";
const DESCRIPTION =
  "Decentralized lending circles on the Stacks blockchain. Join community-based savings groups, earn yield on multi-asset vaults, and build a verifiable on-chain credit score.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Decentralized Lending Circles on Stacks`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "Halo Protocol",
    "lending circles",
    "ROSCA",
    "Stacks blockchain",
    "DeFi",
    "decentralized finance",
    "credit score",
    "on-chain credit",
    "Bitcoin L2",
    "multi-asset vault",
    "USDCx",
    "sBTC",
    "STX",
    "hUSD",
    "yield farming",
    "community lending",
    "peer-to-peer lending",
    "chit fund",
    "savings group",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Decentralized Lending Circles on Stacks`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Decentralized Lending Circles on Stacks`,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    "talentapp:project_verification":
      "4d3916a16d4e2a2b2069994ea84a8671a972777816864a99f0e0d243bee5cb7a363c061fcce731c5b90c8968bb10de8a627d6beec0be208fa364d358543d6bcf",
  },
};

// JSON-LD Structured Data for Google rich results & LLM discovery
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to join lending circles",
  },
  creator: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  featureList: [
    "Decentralized lending circles (ROSCA)",
    "Multi-asset vault (USDCx, sBTC, STX, hUSD)",
    "On-chain credit scoring (300-850)",
    "Competitive bidding for pool access",
    "Collateral-backed participation",
    "Yield earning on deposits",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen flex flex-col bg-[#0B0F1A]`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
