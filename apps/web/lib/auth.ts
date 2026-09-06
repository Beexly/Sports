import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";
import { isAsciiEmail, canonicalEmail } from "@/lib/auth/email-guard";
import { logEntitlementFailClosed } from "@/lib/entitlement-observability";

export type UserRole = "USER" | "ADMIN";

/**
 * D-1 (C11 BEFORE DEPLOY): the settlement/alert worker refuses every recipient
 * whose User.emailVerified is null, and NOTHING in the codebase ever wrote that
 * column — the Prisma adapter's createUser leaves it null for OAuth users
 * (emailVerified is only non-null on the email-provider verify path). Result:
 * Elite alerts could never deliver to anyone. Google's OIDC profile carries an
 * `email_verified` boolean; we stamp it here on first sign-in.
 *
 * Fail-closed: only an explicit `email_verified === true` counts as verified.
 * A missing/false claim leaves the column untouched (never un-verifies).
 * Idempotent: skips the write when the row is already non-null.
 */
export async function stampEmailVerifiedFromProfile(
  dbLike: {
    user: {
      // Method syntax (bivariant params) so the real PrismaClient's
      // overloaded signatures structurally match; property-function
      // types would be checked contravariantly and reject it.
      findUnique(args: {
        where: { email: string };
        select: { emailVerified: true };
      }): Promise<{ emailVerified: Date | null } | null>;
      update(args: {
        where: { email: string };
        data: { emailVerified: Date };
      }): Promise<unknown>;
    };
  },
  email: string | null | undefined,
  profile: { email_verified?: unknown } | null | undefined,
  now: Date = new Date(),
): Promise<"stamped" | "already" | "unverified" | "no-user" | "no-email"> {
  if (!email) return "no-email";
  if (profile?.email_verified !== true) return "unverified";
  const existing = await dbLike.user
    .findUnique({ where: { email }, select: { emailVerified: true } })
    .catch(() => null);
  if (!existing) return "no-user";
  if (existing.emailVerified) return "already";
  await dbLike.user.update({ where: { email }, data: { emailVerified: now } });
  return "stamped";
}

/**
 * Owner/operator allow-list: comma-separated emails in ADMIN_EMAILS are
 * elevated to ADMIN at session time. This is the production path for the
 * founder to reach /cockpit without manual DB writes; the DB role still
 * works and is never downgraded by this check.
 *
 * Fail-closed on non-ASCII emails (GHSA-7rqj-j65f-68wh homoglyph class):
 * a Unicode lookalike can never match the allow-list, in either direction.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!isAsciiEmail(email)) return false;
  const list = (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(canonicalEmail(email));
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
  // Bound token lifetime so any stale claim (role, entitlement) self-heals within
  // a day even on the paths that don't re-resolve it — defense-in-depth for revocation.
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as unknown as { role?: UserRole }).role ?? "USER";
        // D-1: first sign-in — stamp emailVerified from Google's email_verified
        // claim (see stampEmailVerifiedFromProfile). `profile` carries the raw
        // OIDC ID-token claims. SEC-02: the write is AWAITED so the column is
        // settled before the token is issued (a fire-and-forget write could
        // still be pending when the alert worker reads the row). The catch
        // keeps a failed write from breaking sign-in; it leaves the column
        // null, which keeps alerts blocked (fail-closed), never falsely
        // verified.
        await stampEmailVerifiedFromProfile(
          db,
          token.email ?? user.email,
          profile as { email_verified?: unknown } | undefined,
        ).catch(() => undefined);
      } else if (token.email) {
        // Re-resolve the DB role on every refresh (not only when it is unset) so a
        // role change — e.g. an ADMIN downgraded to USER — propagates within the
        // token's life instead of being frozen at sign-in. The DB is the source of
        // truth; a failed/absent lookup leaves the existing role untouched (fail-safe,
        // never fail-open to ADMIN).
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

      // The ADMIN_EMAILS allow-list is applied FRESH in the session callback, never
      // baked into the token — so removing an email from the list revokes admin on
      // the next request instead of persisting for the token's whole lifetime.
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = isAdminEmail(session.user.email)
          ? "ADMIN"
          : ((token.role as UserRole | undefined) ?? "USER");
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin", error: "/auth/error" },
};

interface NextAuthInstance {
  handlers: {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
  };
  auth: () => Promise<Session | null>;
  signIn: (...args: unknown[]) => Promise<void>;
  signOut: (...args: unknown[]) => Promise<void>;
}

const nextAuth = NextAuth(config) as unknown as NextAuthInstance;

export const handlers = nextAuth.handlers;

const realAuth = nextAuth.auth;

/**
 * Dev-mode admin bypass.
 *
 * When DEV_FAKE_ADMIN=true, every auth() call returns a synthetic ADMIN
 * session. This is the launch-night escape hatch — it lets the operator
 * open /dashboard and /cockpit without OAuth or a real Postgres session
 * table. NEVER set this in production — and even if it leaks into a prod
 * env, the NODE_ENV !== "production" hard-gate below makes it inert
 * (defense-in-depth, mirroring entitlements.ts).
 */
export const auth: () => Promise<Session | null> = async () => {
  if (process.env["NODE_ENV"] !== "production" && process.env["DEV_FAKE_ADMIN"] === "true") {
    return {
      user: {
        id: "dev-admin",
        name: "Dev Admin",
        email: "dev-admin@local",
        image: null,
        role: "ADMIN",
      },
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
      // THIS is where a broken session store becomes a fail-closed downgrade.
      //
      // auth() swallows the throw and answers `null`, so every gate downstream
      // — `evaluateGate` in lib/api-entitlement.ts, `getViewerEntitlements` in
      // lib/pricing/tier-access.ts — sees an ordinary logged-out visitor and
      // answers 401 / the free surface. Their own try/catch around auth()
      // therefore never fires in production: the exception does not reach them.
      // Logging it as a plain warn *here* left the actual failure mode
      // ("every paying member is being treated as anonymous") looking like
      // routine noise.
      logEntitlementFailClosed("auth:session-store", undefined, err);
    }
    return null;
  }
};

export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

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

export const DEV_FAKE_ADMIN =
  process.env["NODE_ENV"] !== "production" && process.env["DEV_FAKE_ADMIN"] === "true";
