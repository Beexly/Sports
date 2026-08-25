/**
 * Free-tier feature bullets — gate-coupled, so the pricing page cannot
 * advertise a surface the app is currently serving as a 404.
 *
 * WHY THIS MODULE EXISTS
 * The pricing page's own doctrine (see the COMPARISON_CELLS comment in
 * `apps/web/app/pricing/page.tsx`) is that FREE cells must describe what a
 * visitor gets TODAY, never an opened-gate future. One bullet broke that
 * rule: "Contest Bay paper skills" shipped with `included: true` and a
 * checkmark, but Contest Bay is opt-in behind `CONTESTS_PUBLIC`
 * (`apps/web/lib/launch/public-surface-gate.ts`, default OFF). With the flag
 * unset, `/contests` and `/fantasy/contests` both `notFound()`, and
 * `/api/contests/week` refuses — so the pricing page was selling a checkmark
 * on a route that 404s. `components/ui/footer.tsx` already hides the Contest
 * Bay link behind the same gate; this module applies that established pattern
 * to the one surface that still asserted it unconditionally.
 *
 * Reading the gate here (rather than hardcoding a label) means the bullet can
 * never drift out of sync with the surface again: flipping CONTESTS_PUBLIC on
 * restores the bullet, flipping it off removes it, with no copy edit.
 *
 * Pure module — env read only, no DB, fully unit-testable.
 */

import { isContestsPublic } from "@/lib/launch/public-surface-gate";

export interface PlanFeature {
  readonly label: string;
  readonly included: boolean;
}

/**
 * Bullets that are true for a Free visitor regardless of any gate. Kept as a
 * separate constant so the gated additions below are obvious at a glance.
 */
const ALWAYS_ON_FREE_FEATURES: readonly PlanFeature[] = [
  { label: "Free calculators & intelligence tools (no account wall)", included: true },
  { label: "The Academy: full training floor", included: true },
  { label: "Public methodology + calibration status (building honestly)", included: true },
] as const;

/** What Free does NOT get. Free's honesty depends on showing this, and no
 *  gate changes it. */
const FREE_LOCKED_FEATURES: readonly PlanFeature[] = [
  { label: "The full daily board, every signal (Pro)", included: false },
  { label: "Confidence rating on every pick (Pro)", included: false },
  { label: "Factor trail & evidence audit (Pro)", included: false },
  { label: "Trend Lab + Parlay MRI (Pro)", included: false },
  { label: "Graded-pick alerts (Elite)", included: false },
  { label: "Line-value tracker + staking toolkit (Elite)", included: false },
] as const;

export const CONTEST_BAY_FEATURE_LABEL =
  "Contest Bay paper skills (no fees, no prizes, no wagering)";

export const FOUNDING_WAITLIST_FEATURE_LABEL =
  "Founding waitlist for early operator updates";

/**
 * The Free plan's bullets as they should render right now. Contest Bay only
 * appears while its public gate is open; the waitlist bullet is always true
 * (the form ships on /pricing itself).
 */
export function freeTierFeatures(): readonly PlanFeature[] {
  const gated: PlanFeature[] = [];
  if (isContestsPublic()) {
    gated.push({ label: CONTEST_BAY_FEATURE_LABEL, included: true });
  }
  return [
    ...ALWAYS_ON_FREE_FEATURES,
    ...gated,
    { label: FOUNDING_WAITLIST_FEATURE_LABEL, included: true },
    ...FREE_LOCKED_FEATURES,
  ];
}
