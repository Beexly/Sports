import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";

export type UserRole = "USER" | "ADMIN";

/** Typed shape of what NextAuth() returns — avoids casting the whole instance to any. */
interface NextAuthInstance {
  handlers: {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
  };
  auth: () => Promise<Session | null>;
  signIn: (...args: unknown[]) => Promise<void>;
  signOut: (...args: unknown[]) => Promise<void>;
}

const config: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "dev-noop",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "dev-noop",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // user.role is populated by Prisma adapter — see module augmentation below
        token.role = (user as { role?: UserRole }).role ?? "USER";
      }

      if (!token.role && token.email) {
        const dbUser = await db.user
          .findUnique({
            where: { email: token.email },
            select: { id: true, role: true },
          })
          .catch(() => null);

        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = ((token.role as UserRole | undefined) ?? "USER");
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin", error: "/auth/error" },
};

const nextAuth = NextAuth(config) as unknown as NextAuthInstance;

export const handlers = nextAuth.handlers;

const realAuth = nextAuth.auth;

/**
 * Dev-mode admin bypass.
 *
 * When DEV_FAKE_ADMIN=true, every auth() call returns a synthetic ADMIN
 * session. This is the launch-night escape hatch — it lets the operator
 * open /dashboard and /cockpit without OAuth or a real Postgres session
 * table. NEVER set this in production.
 */
export const auth: () => Promise<Session | null> = async () => {
  if (process.env["DEV_FAKE_ADMIN"] === "true" && process.env["NODE_ENV"] !== "production") {
    return {
      user: {
        id: "dev-admin",
        name: "Dev Admin",
        email: "dev-admin@local",
        image: null,
        role: "ADMIN" as UserRole,
      },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    } as unknown as Session;
  }
  try {
    return await realAuth();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isStaticGenerationProbe =
      message.includes("Dynamic server usage") ||
      message.includes("couldn't be rendered statically");

    if (!isStaticGenerationProbe) {
      // eslint-disable-next-line no-console
      console.warn("[auth] realAuth() failed:", message);
    }
    return null;
  }
};

export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

declare module "next-auth" {
  /** Prisma adapter surfaces role on every sign-in; declare it here so jwt callback is typed. */
  interface User {
    role?: UserRole;
  }
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

/** True only in non-production environments when DEV_FAKE_ADMIN=true is explicitly set. */
export const DEV_FAKE_ADMIN = process.env["DEV_FAKE_ADMIN"] === "true" && process.env["NODE_ENV"] !== "production";
