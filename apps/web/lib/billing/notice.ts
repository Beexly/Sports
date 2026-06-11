/**
 * Server-side billing notice for member-facing surfaces.
 * Derives a dunning banner from subscription state — never from the
 * client. Returns null when billing is healthy or the user has no
 * paid subscription.
 */

import { db } from "@sports/db";
import { PAST_DUE_GRACE_DAYS } from "@/lib/entitlements";

export interface BillingNotice {
  /** Why the banner is showing. */
  kind: "PAST_DUE_IN_GRACE" | "PAST_DUE_EXPIRED" | "INCOMPLETE";
  /** Paid tier the member is at risk of losing. */
  tier: "PRO" | "ELITE";
  /** End of the grace window, when one applies. */
  graceEndsAt: Date | null;
}

export async function getBillingNotice(userId: string): Promise<BillingNotice | null> {
  let subscription: {
    tier: string;
    status: string;
    pastDueSince: Date | null;
  } | null;

  try {
    subscription = await db.subscription.findUnique({
      where: { userId },
      select: { tier: true, status: true, pastDueSince: true },
    });
  } catch {
    // Billing banner is best-effort UI — never block the dashboard on it.
    return null;
  }

  if (!subscription) return null;
  if (subscription.tier !== "PRO" && subscription.tier !== "ELITE") return null;

  const tier = subscription.tier;

  if (subscription.status === "INCOMPLETE") {
    return { kind: "INCOMPLETE", tier, graceEndsAt: null };
  }

  if (subscription.status === "PAST_DUE") {
    const graceEndsAt = subscription.pastDueSince
      ? new Date(subscription.pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const inGrace = graceEndsAt !== null && graceEndsAt.getTime() > Date.now();
    return {
      kind: inGrace ? "PAST_DUE_IN_GRACE" : "PAST_DUE_EXPIRED",
      tier,
      graceEndsAt,
    };
  }

  return null;
}
