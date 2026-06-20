/**
 * Galaxy Dynasty — subscription tier helper (GSE Pro gating).
 *
 * "Pro = vision, not wins." Pro/Elite unlocks DEEPER read tools (War Room intel,
 * opponent scouting) — never an outcome, rating, or calibration advantage. Always
 * resolved server-side. Reuses the platform's grace-window logic shape; fails
 * closed to FREE when no active subscription / no DB.
 */

import { db } from "@sports/db";

export type GalaxyTier = "FREE" | "PRO" | "ELITE";

const GRACE_DAYS = 7;

export async function getGalaxyTier(userId: string | null | undefined): Promise<GalaxyTier> {
  if (!userId) return "FREE";
  // Dev escalation mirrors the platform entitlements (non-prod only).
  if (process.env["NODE_ENV"] !== "production" && process.env["DEV_FAKE_ADMIN"] === "true" && userId === "dev-admin") {
    return "ELITE";
  }
  const graceCutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  try {
    const sub = await db.subscription.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: ["ACTIVE", "TRIALING"] } },
          { status: "PAST_DUE", pastDueSince: { gte: graceCutoff } },
        ],
      },
      select: { tier: true },
    });
    const tier = (sub?.tier ?? "FREE") as GalaxyTier;
    return tier === "PRO" || tier === "ELITE" ? tier : "FREE";
  } catch {
    return "FREE";
  }
}

export function isPro(tier: GalaxyTier): boolean {
  return tier === "PRO" || tier === "ELITE";
}
