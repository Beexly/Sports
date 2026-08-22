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

/**
 * Galaxy StatKing (`/stats/*`) — still foundation / snapshot pipeline.
 * Default OFF. Opt-in only: STATS_PUBLIC=true when readiness + rights clear.
 */
export function isStatsPublic(): boolean {
  return truthy(process.env.STATS_PUBLIC);
}

/**
 * Contest Bay (`/fantasy/contests`) — free paper skill board.
 * Default OFF. Opt-in only: CONTESTS_PUBLIC=true.
 */
export function isContestsPublic(): boolean {
  return truthy(process.env.CONTESTS_PUBLIC);
}

/**
 * Policy map (documentation for operators / agents).
 */
export const PUBLIC_NAV_POLICY = {
  stats: "opt-in STATS_PUBLIC — foundation until rights+live feeds clear",
  contests: "opt-in CONTESTS_PUBLIC — paper skill stays dark until founder opens it",
  podcast: "episode archive complete — public",
  newsletter: "issue archive + subscribe form complete — public",
  observatory: "readiness-sealed complete — public",
  gsn: "board-backed transmission — public",
  airwave: "illustrative demo — keep unlabeled as live intake",
} as const;
