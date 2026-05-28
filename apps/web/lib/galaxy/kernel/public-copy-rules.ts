/**
 * Public Copy Rules — what Galaxy says and what Galaxy never says publicly.
 *
 * Reference for editorial review and trust-gate scanning. The trust gate
 * enforces FORBIDDEN_* word lists; this file documents the deeper
 * positioning rules behind them.
 *
 * See also: docs/positioning.md and GALAXY_CONSTITUTION.md.
 */

/** Acceptable framings — use these. */
export const APPROVED_FRAMINGS: ReadonlyArray<string> = [
  "deterministic scoring",
  "evidence-backed",
  "model-supported",
  "factor trail",
  "transparent confidence",
  "publish gate",
  "pass list",
  "process grade",
  "signal grade",
  "no claim of certain outcomes",
  "research, not advice",
  "math you can read",
];

/** Forbidden framings — never use these even adjacent to disclaimers. */
export const FORBIDDEN_FRAMINGS: ReadonlyArray<string> = [
  "AI picks",
  "AI predictions",
  "AI-powered picks",
  "guaranteed",
  "lock",
  "sure thing",
  "smart picks that always",
  "winning system",
  "beat the books every time",
  "pro bettors swear by",
];

/** Voice principles. */
export const VOICE_PRINCIPLES: ReadonlyArray<string> = [
  "Restrained, not promotional",
  "Specific, not generic",
  "Calm, not urgent",
  "Honest about uncertainty",
  "Useful before flattering",
  "Operator-grade, not consumer-cheery",
];

/** The category-defining moves that distinguish Galaxy from competitors. */
export const POSITIONING_MOVES: ReadonlyArray<{
  readonly move: string;
  readonly contrast: string;
}> = [
  {
    move: "No-Bet as a first-class decision",
    contrast: "Tout services hide passes; Galaxy publishes them.",
  },
  {
    move: "Process grade above outcome grade",
    contrast: "Trackers brag about wins; Galaxy reviews decisions.",
  },
  {
    move: "Calibration gate at 30 picks",
    contrast: "Touts post win rates from day one; Galaxy refuses claims under sample.",
  },
  {
    move: "Failure case on every pick",
    contrast: "Tout cards sell certainty; Galaxy cards include how the bet can be wrong.",
  },
  {
    move: "Deterministic scoring, not AI marketing",
    contrast: "Competitors lean on 'AI picks'; Galaxy ships the factor trail.",
  },
];
