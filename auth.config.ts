import type { NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

/**
 * Edge-compatible auth config — no Node.js modules (no bcrypt, no mongoose).
 * Used by middleware.ts which runs in the Edge runtime.
 * auth.ts extends this with the MongoDB adapter, Credentials provider, and DB callbacks.
 */
export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    jwt({ token, user }) {
      // Set token fields on first sign-in; full DB refresh happens in auth.ts
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
} satisfies NextAuthConfig;
