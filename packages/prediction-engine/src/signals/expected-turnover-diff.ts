/**
 * expected_turnover_diff — the competitive/research signal-gap item, wired
 * as a thin, named adapter over the already-tested `computeTurnoverLuck`
 * decomposition.
 *
 * WHY THIS ONE
 * ------------
 * Ops notes name five high-leverage candidates:
 *   opp_adj_epa_team, expected_turnover_diff, pressure_matchup,
 *   qb_epa_cpoe, market_clv_features
 * `turnover-luck.ts` already implements the occurrence-vs-recovery
 * decomposition with tests (`signals/__tests__/turnover-luck.test.ts`) and
 * is explicitly "NOT WIRED IN" (file header). This adapter is the missing
 * single-scalar DIFF the engine can read: expected turnover DIFFERENTIAL
 * between two teams (the regressed recovery swing), which is exactly the
 * `expected_turnover_diff` name. No fake data, no new ingestion, no fitted
 * weights.
 *
 * NULL-NOT-NEUTRAL: `computeTurnoverLuck` returns null on insufficient
 * sample and nulled `recovery` on thin forced-fumble counts. This adapter
 * preserves that: a missing side yields a null diff and a named gap, never
 * a zero.
 *
 * FLAG (disabled by default; additive):
 *   EXPECTED_TURNOVER_DIFF_ENABLED=true
 * When false the adapter returns `enabled: false` and null diffs. Nothing
 * in scoreGame / generate-signal-slate reads this until the flag is on;
 * MODEL_VERSION is untouched. The combining WEIGHT between this diff and
 * Elo remains a calibration decision this module does not invent — the
 * adapter only produces the signed differential.
 *
 * Pure, no I/O.
 */

import {
  computeTurnoverLuck,
  type TurnoverLuckInput,
  type TurnoverLuckResult,
} from "./turnover-luck.js";

export const EXPECTED_TURNOVER_DIFF_FLAG = "EXPECTED_TURNOVER_DIFF_ENABLED";

export interface ExpectedTurnoverDiffTeam {
  readonly teamId: string;
  readonly input: TurnoverLuckInput;
}

export interface ExpectedTurnoverDiffResult {
  readonly enabled: boolean;
  /**
   * home expected-regression-points minus away, in approximate points.
   * Positive = home is due a favorable turnover-regression swing.
   * Null when either side lacks a recovery component (insufficient sample
   * or thin forced-fumble count) or when disabled.
   */
  readonly expectedTurnoverDiff: number | null;
  readonly home: TurnoverLuckResult | null;
  readonly away: TurnoverLuckResult | null;
  /** Why the diff is null (empty when populated). */
  readonly gaps: readonly string[];
}

export interface ExpectedTurnoverDiffOptions {
  /** EXPECTED_TURNOVER_DIFF_ENABLED. Default false. */
  readonly enabled?: boolean;
}

/**
 * Signed expected-turnover differential for one matchup.
 *
 * Diff = home.recovery.expectedRegressionPoints
 *      − away.recovery.expectedRegressionPoints
 *
 * This is a DIRECTIONAL estimate for a future weighting step, never a
 * score and never a published pick input until a MODEL_VERSION step
 * combines it (see the module header on turnover-luck.ts).
 */
export function computeExpectedTurnoverDiff(
  home: ExpectedTurnoverDiffTeam,
  away: ExpectedTurnoverDiffTeam,
  options: ExpectedTurnoverDiffOptions = {},
): ExpectedTurnoverDiffResult {
  const enabled = options.enabled === true;
  if (!enabled) {
    return {
      enabled: false,
      expectedTurnoverDiff: null,
      home: null,
      away: null,
      gaps: [`${EXPECTED_TURNOVER_DIFF_FLAG} is off`],
    };
  }

  const homeLuck = computeTurnoverLuck(home.input);
  const awayLuck = computeTurnoverLuck(away.input);
  const gaps: string[] = [];

  if (homeLuck === null) {
    gaps.push(`home ${home.teamId}: insufficient sample (computeTurnoverLuck null)`);
  } else if (homeLuck.recovery === null) {
    gaps.push(`home ${home.teamId}: recovery null (thin forced-fumble count)`);
  }
  if (awayLuck === null) {
    gaps.push(`away ${away.teamId}: insufficient sample (computeTurnoverLuck null)`);
  } else if (awayLuck.recovery === null) {
    gaps.push(`away ${away.teamId}: recovery null (thin forced-fumble count)`);
  }

  const homePts = homeLuck?.recovery?.expectedRegressionPoints ?? null;
  const awayPts = awayLuck?.recovery?.expectedRegressionPoints ?? null;
  const expectedTurnoverDiff =
    homePts === null || awayPts === null ? null : homePts - awayPts;

  return {
    enabled: true,
    expectedTurnoverDiff,
    home: homeLuck,
    away: awayLuck,
    gaps,
  };
}
