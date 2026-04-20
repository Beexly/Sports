/**
 * Server-side entitlement system.
 * NEVER use client-side for access control — always call from server.
 */

import { db } from "@sports/db";
import { getEntitlements, type Entitlements, type SubscriptionTier } from "@sports/types";

export { getEntitlements };
export type { Entitlements };

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    select: { tier: true },
  });

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
