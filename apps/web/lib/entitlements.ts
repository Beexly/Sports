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
  return code === "P1001" || message.includes("Can't reach database server");
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
          { status: { in: ["ACTIVE", "TRIALING"] } },
          // Failed payment in dunning: keep access through the grace window.
          { status: "PAST_DUE", pastDueSince: { gte: graceCutoff } },
        ],
      },
      select: { tier: true },
    });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
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
