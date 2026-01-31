import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "../components/providers/providers";
import { Navbar } from "../components/layout/navbar";
import { Footer } from "../components/layout/footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Halo Protocol",
  description:
    "Build credit through community lending circles on the Stacks blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
