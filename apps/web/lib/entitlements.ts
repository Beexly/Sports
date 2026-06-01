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
 * paid slate during launch-night demos. Never active in production.
 */
const DEV_FAKE_ADMIN_TIER: SubscriptionTier = "ELITE";

/**
 * Resolve the effective access tier from comp + subscription state.
 * Pure so it can be unit-tested without a DB.
 *
 * Precedence: an operator comp overrides billing entirely; otherwise paid
 * access requires an ACTIVE/TRIALING subscription; everything else is FREE.
 */
export function resolveEntitlementTier(input: {
  compedTier?: SubscriptionTier | null;
  subscriptionTier?: SubscriptionTier | null;
  subscriptionStatus?: string | null;
}): SubscriptionTier {
  if (input.compedTier) return input.compedTier;
  const active =
    input.subscriptionStatus === "ACTIVE" ||
    input.subscriptionStatus === "TRIALING";
  return active ? input.subscriptionTier ?? "FREE" : "FREE";
}

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  if (process.env["DEV_FAKE_ADMIN"] === "true" && userId === "dev-admin") {
    return getEntitlements(DEV_FAKE_ADMIN_TIER);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      compedTier: true,
      subscription: { select: { tier: true, status: true } },
    },
  });

  const tier = resolveEntitlementTier({
    compedTier: user?.compedTier ?? null,
    subscriptionTier: user?.subscription?.tier ?? null,
    subscriptionStatus: user?.subscription?.status ?? null,
  });
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
