import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Node.js modules (no bcrypt, no mongoose).
 * Used by proxy.ts which runs in the Edge runtime.
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
  providers: [],
} satisfies NextAuthConfig;
