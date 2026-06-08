/**
 * Viewer access tiers — the single source of truth for the FREE -> PRO -> ELITE
 * value gradient, plus the founder (ADMIN) override.
 *
 * SERVER ONLY. This module calls auth() and the DB-backed entitlements lookup,
 * so it must never be imported into a client component. Pages/loaders read the
 * tier here on the server and pass a serializable `locked` boolean (or the tier
 * string) down to client components like <UpsellGate />.
 *
 * The free/paid LINE lives in ACCESS below — one object, one edit to retune what
 * FREE sees versus what is gated behind PRO/ELITE.
 */

import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";

/**
 * Viewer tiers in ascending order of access. ADMIN is the founder override and
 * outranks everything; it is NOT a billing tier (it never comes from a
 * Subscription row), so it is kept separate from the paid SubscriptionTier.
 */
export type ViewerTier = "FREE" | "PRO" | "ELITE" | "ADMIN";

/** Tier needed to clear a gate. Gates are expressed in billing terms. */
export type RequiredTier = "PRO" | "ELITE";

/**
 * Access ordering. Higher number == more access. ADMIN and ELITE both sit at the
 * top so a founder and a top-tier subscriber see the same full slate, with PRO
 * in the middle and FREE at the floor.
 */
const TIER_RANK: Record<ViewerTier, number> = {
  FREE: 0,
  PRO: 1,
  ELITE: 2,
  ADMIN: 2,
};

/**
 * THE FREE / PAID LINE — one config object so the gradient is trivially tunable.
 *
 * - freePlayerViews: which player-model views render in full for FREE viewers.
 *   Anything not listed is shown blurred behind an "Unlock with PRO" gate.
 * - freeRatingPositions: which positions reveal the full GSE Rating breakdown to
 *   FREE viewers. Other positions get the teaser headline only.
 *
 * Edit this object to move the line. Downstream code should branch off ACCESS +
 * canAccess() rather than hard-coding tier checks inline.
 */
export const ACCESS = {
  freePlayerViews: ["production", "snaps"],
  freeRatingPositions: ["QB"],
} as const;

/**
 * Pure ordering helper: does `tier` meet or exceed `required`?
 *
 * ADMIN/ELITE >= PRO >= FREE. `required` is a billing tier (PRO or ELITE); a
 * viewer clears it when their rank is at least the required rank. Pure and
 * synchronous so it is safe to call from anywhere (server or client).
 */
export function canAccess(tier: ViewerTier, required: RequiredTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/**
 * Resolve the current viewer's tier on the server.
 *
 * - role ADMIN (founder) -> "ADMIN" (sees everything, billing-independent)
 * - no authenticated user -> "FREE"
 * - otherwise -> the live subscription tier (FREE | PRO | ELITE) via the
 *   existing entitlements path.
 */
export async function getViewerTier(): Promise<ViewerTier> {
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    return "ADMIN";
  }

  const userId = session?.user?.id;
  if (!userId) {
    return "FREE";
  }

  const entitlements = await getUserEntitlements(userId);
  // entitlements.tier is SubscriptionTier ("FREE" | "PRO" | "ELITE"), a subset
  // of ViewerTier, so this maps cleanly with no extra translation.
  return entitlements.tier;
}
