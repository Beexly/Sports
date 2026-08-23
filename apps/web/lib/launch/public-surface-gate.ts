/**
 * Public product surface gates — smart defaults.
 *
 * COMPLETE products ship public.
 * FOUNDATION / fixture-only / rights-incomplete products stay dark
 * until the founder flips an explicit opt-in env.
 *
 * Do NOT default-open unfinished work.
 */

function truthy(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function falsy(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

/**
 * Galaxy StatKing (`/stats/*`) — still foundation / snapshot pipeline.
 * Default OFF. Opt-in only: STATS_PUBLIC=true when readiness + rights clear.
 */
export function isStatsPublic(): boolean {
  return truthy(process.env.STATS_PUBLIC);
}

/**
 * Contest Bay (`/fantasy/contests`) — free paper skill board is a complete product.
 * Default ON. Emergency dark: CONTESTS_PUBLIC=false.
 */
export function isContestsPublic(): boolean {
  if (falsy(process.env.CONTESTS_PUBLIC)) return false;
  // default public — free skill paper product is finished
  return true;
}

/**
 * Policy map (documentation for operators / agents).
 */
export const PUBLIC_NAV_POLICY = {
  stats: "opt-in STATS_PUBLIC — foundation until rights+live feeds clear",
  contests: "default-public free paper skill (no prizes, no fees)",
  podcast: "episode archive complete — public",
  newsletter: "issue archive + subscribe form complete — public",
  observatory: "readiness-sealed complete — public",
  gsn: "board-backed transmission — public",
  airwave: "illustrative demo — keep unlabeled as live intake",
} as const;
