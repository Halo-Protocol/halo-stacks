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

export const metadata: Metadata = {
  title: "Halo Protocol - Build Credit Through Community",
  description:
    "Join lending circles, make contributions, and build a verifiable credit score on the Stacks blockchain. Access financial opportunities you deserve.",
  openGraph: {
    title: "Halo Protocol - Build Credit Through Community",
    description:
      "Join lending circles, make contributions, and build a verifiable credit score on the Stacks blockchain.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Halo Protocol - Build Credit Through Community",
    description:
      "Join lending circles, make contributions, and build a verifiable credit score on the Stacks blockchain.",
  },
  other: {
    "talentapp:project_verification":
      "4d3916a16d4e2a2b2069994ea84a8671a972777816864a99f0e0d243bee5cb7a363c061fcce731c5b90c8968bb10de8a627d6beec0be208fa364d358543d6bcf",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
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
