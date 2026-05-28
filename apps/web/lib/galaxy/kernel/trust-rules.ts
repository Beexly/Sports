/**
 * Trust Rules — Galaxy's compliance and trust posture as typed config.
 *
 * Mirror of the Constitution's compliance laws in machine-readable form.
 * Consumed by the trust-gate scanner (see scripts/guardrails/trust-gate.mjs)
 * and by editorial review tooling.
 *
 * Never weaken these rules to make a feature pass. Redesign the feature.
 */

/** Words that imply outcome certainty. Never appear in shipping copy. */
export const FORBIDDEN_CERTAINTY_WORDS: ReadonlyArray<string> = [
  "lock",
  "lock of the day",
  "guaranteed win",
  "guaranteed profit",
  "free money",
  "sure thing",
  "risk-free",
  "cannot lose",
  "can't lose",
  "easy money",
];

/** Words that imply an unverified track record. */
export const FORBIDDEN_OVERCLAIM_WORDS: ReadonlyArray<string> = [
  "verified track record",
  "proven winners",
  "pro picks",
];

/** Required disclosure lines for betting-adjacent pages. */
export const REQUIRED_TRUST_LINE =
  "Model-supported insights. Transparent confidence. No predicted outcome is certain.";

/** Required links on every betting-adjacent surface. */
export interface RequiredLink {
  readonly href: string;
  readonly label: string;
  readonly reason: string;
}

export const REQUIRED_LINKS_BETTING_ADJACENT: ReadonlyArray<RequiredLink> = [
  {
    href: "/methodology",
    label: "Methodology",
    reason: "Users must reach an explanation of how Galaxy scores.",
  },
  {
    href: "/responsible-play",
    label: "Responsible play",
    reason: "Compliance — every betting-adjacent surface must link.",
  },
];

/** Pages classified as betting-adjacent (require trust line + links). */
export const BETTING_ADJACENT_ROUTES: ReadonlyArray<string> = [
  "/",
  "/today",
  "/picks",
  "/no-bet",
  "/briefing",
  "/tracker",
  "/leaderboard",
  "/autopsy",
  "/parlay-mri",
  "/market-mirage",
  "/roster-shock",
  "/coaching-edge",
  "/profile",
  "/nfl",
  "/nba",
  "/mlb",
  "/props",
  "/performance",
  "/ledger",
  "/promotions",
];

/** Pages classified as educational (still require trust posture, lighter compliance). */
export const EDUCATIONAL_ROUTES: ReadonlyArray<string> = [
  "/academy",
  "/intelligence",
  "/methodology",
  "/brain",
  "/vault",
  "/market-gravity",
  "/fantasy",
  "/rumor-radar",
];
