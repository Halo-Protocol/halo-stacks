import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "./db";
import { generateUniqueId } from "./identity";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      uniqueId: string;
      walletAddress: string | null;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      const provider = account.provider;
      const socialId = account.providerAccountId;
      const email = user.email.toLowerCase();
      const name = user.name || email.split("@")[0];

      // Check if user exists by social provider + social ID
      const existingUser = await prisma.user.findUnique({
        where: {
          socialProvider_socialId: {
            socialProvider: provider,
            socialId: socialId,
          },
        },
      });

      if (!existingUser) {
        // Check if email already used with different provider
        const emailUser = await prisma.user.findUnique({
          where: { email },
        });

        if (emailUser) {
          // Email already registered with another provider
          return false;
        }

        // Create new user
        const uniqueId = generateUniqueId(provider, socialId, email);

        await prisma.user.create({
          data: {
            email,
            name,
            socialProvider: provider,
            socialId: socialId,
            uniqueId,
            status: "pending_wallet",
          },
        });
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        // On initial sign-in, look up user to store ID in token
        const dbUser = await prisma.user.findUnique({
          where: {
            socialProvider_socialId: {
              socialProvider: account.provider,
              socialId: account.providerAccountId,
            },
          },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
        });

        if (dbUser) {
          session.user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            uniqueId: dbUser.uniqueId,
            walletAddress: dbUser.walletAddress,
            status: dbUser.status,
          };
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },
};
