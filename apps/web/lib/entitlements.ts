/**
 * Server-side entitlement system.
 * NEVER use client-side for access control — always call from server.
 */

import { db } from "@sports/db";
import { getEntitlements, type Entitlements, type SubscriptionTier } from "@sports/types";

export { getEntitlements };
export type { Entitlements };

/**
 * Dev-mode shortcut: when DEV_FAKE_ADMIN=true the fake admin session has
 * no real Subscription row, so the DB lookup returns FREE. Treat the
 * fake admin as ELITE so the dashboard / picks pages render the full
 * paid slate during launch-night demos. Hard-gated to non-production in
 * `getUserEntitlements` below — a stray DEV_FAKE_ADMIN=true in a prod
 * environment can never mint paid access.
 */
const DEV_FAKE_ADMIN_TIER: SubscriptionTier = "ELITE";

/**
 * Days a PAST_DUE member keeps premium access while Stripe retries the
 * charge. Anchored to pastDueSince (stamped once on the first failed
 * payment) so retries can't slide the window. After the window, or if
 * the anchor is missing, access fails closed to FREE.
 */
export const PAST_DUE_GRACE_DAYS = 7;

function isDatabaseUnreachable(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : String(error);
  // Fail CLOSED (treat as FREE) not just when the DB is unreachable (P1001),
  // but also on a schema-lag error during a deploy window: new code that reads
  // a column/table the migration has not applied yet (P2022 column missing,
  // P2021 table missing) must degrade to FREE, never 500 the whole site's
  // authenticated surface. Migrations still lead code; this is the safety net.
  return (
    code === "P1001" ||
    code === "P2021" ||
    code === "P2022" ||
    message.includes("Can't reach database server")
  );
}

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  // Dev-only escalation, hard-gated to non-production. Without the NODE_ENV
  // guard a misconfigured prod (DEV_FAKE_ADMIN=true) would hand ELITE to any
  // session whose id is literally "dev-admin" — bypassing the paywall.
  if (
    process.env["NODE_ENV"] !== "production" &&
    process.env["DEV_FAKE_ADMIN"] === "true" &&
    userId === "dev-admin"
  ) {
    return getEntitlements(DEV_FAKE_ADMIN_TIER);
  }

  const graceCutoff = new Date(Date.now() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);

  let subscription: { tier: string } | null;
  try {
    subscription = await db.subscription.findFirst({
      where: {
        userId,
        OR: [
          {
            status: { in: ["ACTIVE", "TRIALING"] },
            // Crypto passes are fixed-term with NO renewal webhook or cron to
            // flip them out of ACTIVE, so their expiry is enforced here at read
            // time. Stripe rows keep webhook-driven expiry (their
            // currentPeriodEnd can legitimately lag), so gate only the crypto
            // provider on the period end.
            OR: [
              { paymentProvider: { not: "COINBASE_COMMERCE" } },
              { currentPeriodEnd: { gt: new Date() } },
            ],
          },
          // Failed payment in dunning: keep access through the grace window.
          { status: "PAST_DUE", pastDueSince: { gte: graceCutoff } },
        ],
      },
      select: { tier: true },
    });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "P2021" || code === "P2022") {
        // ERROR, not warn: if this is a brief migration window it self-heals,
        // but if the migration never applied (wrong DB, dropped column) this is
        // a SILENT total entitlement outage — every paying user reads FREE — and
        // must page someone, not hide in warn-level noise.
        console.error(
          `[entitlements] failing closed to FREE on schema mismatch (${code}). If this persists ` +
            "past a deploy, a migration did not apply — this is a launch-blocking incident.",
        );
      }
      return getEntitlements("FREE");
    }
    throw error;
  }

  const tier = (subscription?.tier ?? "FREE") as SubscriptionTier;
  return getEntitlements(tier);
}

export async function requireEntitlement(
  userId: string,
  check: (entitlements: Entitlements) => boolean
): Promise<Entitlements> {
  const entitlements = await getUserEntitlements(userId);
  if (!check(entitlements)) {
    throw new EntitlementError("Subscription required for this feature");
  }
  return entitlements;
}

export class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}
