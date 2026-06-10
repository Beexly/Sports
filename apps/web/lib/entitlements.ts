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

function isDevFakeAdminEnabled(): boolean {
  return process.env["DEV_FAKE_ADMIN"] === "true" && process.env["NODE_ENV"] !== "production";
}

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  if (isDevFakeAdminEnabled() && userId === "dev-admin") {
    return getEntitlements(DEV_FAKE_ADMIN_TIER);
  }

  const subscription = await db.subscription
    .findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      select: { tier: true },
    })
    .catch(() => null);

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
