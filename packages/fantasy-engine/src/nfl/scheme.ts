/**
 * GSE Coaching/Scheme engine — the "does this coach's system help my RB or my
 * WR?" read, as NUMBERS per team, updatable weekly.
 *
 * The incumbent equivalent is a paywalled editorial franchise published once
 * a season. GSE computes the same read from play-by-play tendencies: pace,
 * PROE (pass rate over expected — the truest play-caller-tendency stat),
 * neutral-situation pass rate, shotgun/no-huddle usage, red-zone pass rate,
 * plus roster concentration (bellcow-vs-committee backfield, WR1 target
 * funnel) — then auto-labels the scheme with PUBLIC thresholds.
 *
 * This module is the pure engine half: it consumes per-team aggregated
 * tendencies (the play-by-play aggregation lives in the data adapters) and
 * produces labels + concentration shares. Golden-verified against the
 * validated reference implementation's live 2025 output in the test suite.
 */

export interface TeamSchemeTendencies {
  readonly team: string;
  /** Scrimmage plays per game (pace). */
  readonly playsPerGame: number;
  /** Pass rate over expected (percentage points; nflverse pass_oe mean). */
  readonly proe: number;
  /** Lead back's share of team RB carries (0–1). High = bellcow. */
  readonly rbBellcowShare: number;
  /** Top receiver's share of team WR/TE targets (0–1). High = funnel. */
  readonly wr1TargetShare: number;
}

/** Public labeling thresholds (pinned by tests). */
export const SCHEME_THRESHOLDS = {
  passHeavyProe: 2,
  runHeavyProe: -2,
  fastPace: 64,
  slowPace: 60,
  bellcow: 0.62,
  committee: 0.5,
  wr1Funnel: 0.26,
} as const;

/**
 * Auto-label a team's scheme from its tendencies — the same rule set the
 * reference implementation used, reproduced label-for-label in the golden
 * test. Tags joined with " · ".
 */
export function schemeLabel(t: TeamSchemeTendencies): string {
  const tags: string[] = [];
  tags.push(
    t.proe > SCHEME_THRESHOLDS.passHeavyProe
      ? "PASS-heavy"
      : t.proe < SCHEME_THRESHOLDS.runHeavyProe
        ? "RUN-heavy"
        : "balanced",
  );
  tags.push(
    t.playsPerGame >= SCHEME_THRESHOLDS.fastPace
      ? "fast"
      : t.playsPerGame <= SCHEME_THRESHOLDS.slowPace
        ? "slow"
        : "avg-pace",
  );
  if (t.rbBellcowShare >= SCHEME_THRESHOLDS.bellcow) tags.push("bellcow-RB");
  else if (t.rbBellcowShare < SCHEME_THRESHOLDS.committee) tags.push("committee-RB");
  if (t.wr1TargetShare >= SCHEME_THRESHOLDS.wr1Funnel) tags.push("WR1-funnel");
  return tags.join(" · ");
}

/**
 * Top-share concentration: the lead player's share of a team total (carries
 * for the bellcow read, targets for the funnel read). NaN when the total is
 * zero — never a fabricated share.
 */
export function topShare(playerValues: readonly number[]): number {
  let total = 0;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of playerValues) {
    if (Number.isFinite(v)) {
      total += v;
      if (v > max) max = v;
    }
  }
  return total > 0 ? max / total : Number.NaN;
}
