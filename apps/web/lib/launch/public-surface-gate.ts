/**
 * Public product surface gates.
 *
 * Incomplete products stay dark by default. Flip only when the surface is
 * launch-ready (not "almost" / fixture-only / foundation).
 *
 * Admin / cockpit routes are never covered here.
 */

function truthy(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Galaxy StatKing — /stats/* */
export function isStatsPublic(): boolean {
  return truthy(process.env.STATS_PUBLIC);
}

/** Contest Bay — /fantasy/contests */
export function isContestsPublic(): boolean {
  return truthy(process.env.CONTESTS_PUBLIC);
}

/**
 * Surfaces that may appear in public nav/footer only when ready.
 * Waitlist pages (podcast, newsletter) are complete products and stay public.
 */
export const PUBLIC_NAV_POLICY = {
  stats: "env:STATS_PUBLIC",
  contests: "env:CONTESTS_PUBLIC",
  podcast: "waitlist-complete",
  newsletter: "waitlist-complete",
  observatory: "readiness-sealed-complete",
  gsn: "format-specimen-complete",
} as const;
