import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";

export type UserRole = "USER" | "ADMIN";

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = ((user as any).role as UserRole) ?? "USER";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(config) as any;

export const handlers = nextAuth.handlers as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};

const realAuth = nextAuth.auth as () => Promise<Session | null>;

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
        role: "ADMIN",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Session;
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

export const signIn = nextAuth.signIn as (...args: unknown[]) => Promise<void>;
export const signOut = nextAuth.signOut as (...args: unknown[]) => Promise<void>;

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

export const DEV_FAKE_ADMIN = process.env["DEV_FAKE_ADMIN"] === "true";
