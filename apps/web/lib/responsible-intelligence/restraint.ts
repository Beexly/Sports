/**
 * Restraint — the small set of always-eligible restraint affordances
 * the product can elevate on any surface.
 *
 * Distinct from friction (which is contextual). Restraint is the
 * permanent floor: every betting-adjacent surface inherits these.
 */

export type RestraintAffordance =
  | "responsible-play-link"
  | "self-exclusion-info"
  | "session-time-summary"
  | "no-bet-doctrine-link"
  | "cool-off-link"
  | "support-resource-link";

export const RESTRAINT_REGISTRY: ReadonlyArray<{
  readonly id: RestraintAffordance;
  readonly label: string;
  readonly href: string;
  readonly alwaysEligible: boolean;
}> = [
  {
    id: "responsible-play-link",
    label: "Responsible play",
    href: "/responsible-play",
    alwaysEligible: true,
  },
  {
    id: "self-exclusion-info",
    label: "Self-exclusion options",
    href: "/responsible-play#self-exclusion",
    alwaysEligible: true,
  },
  {
    id: "session-time-summary",
    label: "Session time",
    href: "/profile#session-time",
    alwaysEligible: false,
  },
  {
    id: "no-bet-doctrine-link",
    label: "No-Bet doctrine",
    href: "/no-bet",
    alwaysEligible: true,
  },
  {
    id: "cool-off-link",
    label: "Cool-off",
    href: "/responsible-play#cool-off",
    alwaysEligible: true,
  },
  {
    id: "support-resource-link",
    label: "Support resources",
    href: "/responsible-play#support",
    alwaysEligible: true,
  },
];

const BY_ID = new Map(RESTRAINT_REGISTRY.map((r) => [r.id, r]));

export function restraintLink(id: RestraintAffordance): { readonly label: string; readonly href: string } {
  const entry = BY_ID.get(id)!;
  return { label: entry.label, href: entry.href };
}

/** Restraint cannot be conditioned on tier — never gated by subscription. */
export function isRestraintGatedByTier(): false {
  return false;
}
