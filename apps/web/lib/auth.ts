import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";

export type UserRole = "USER" | "ADMIN";

/**
 * Admin allowlist. Comma-separated emails in ADMIN_EMAILS env var. On every
 * sign-in we check whether the authenticated user's email is in the list —
 * matching users are promoted to ADMIN in the DB. Non-matches are left alone.
 *
 * This removes the friction of manually running SQL to flip a role after
 * first sign-in. Set ADMIN_EMAILS="you@example.com,ops@example.com" in .env.
 */
function getAdminEmails(): Set<string> {
  const raw = process.env["ADMIN_EMAILS"] ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

const config: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env["GOOGLE_CLIENT_ID"]!,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // PrismaAdapter extends AdapterUser with our User model fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = ((user as any).role as UserRole) ?? "USER";
      }
      return session;
    },
  },
  events: {
    // Promote allowlisted emails to ADMIN on every sign-in. Idempotent: if the
    // role is already ADMIN we still call update() — it's a single query either
    // way and avoids a branch. If the email leaves ADMIN_EMAILS later, we do
    // NOT auto-demote (operator must demote manually).
    async signIn({ user }) {
      if (!user?.email || !user?.id) return;
      const admins = getAdminEmails();
      if (!admins.has(user.email.toLowerCase())) return;
      try {
        await db.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      } catch (err) {
        console.error(
          `[auth] failed to promote ${user.email} to ADMIN: ` +
            (err instanceof Error ? err.message : err)
        );
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(config) as any;

export const handlers = nextAuth.handlers as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};

export const auth = nextAuth.auth as () => Promise<Session | null>;
export const signIn = nextAuth.signIn as (...args: unknown[]) => Promise<void>;
export const signOut = nextAuth.signOut as (...args: unknown[]) => Promise<void>;

// Type augmentation for NextAuth session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}
