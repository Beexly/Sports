/**
 * Survivor weekly pick ranking — AGENTS.md ENGINE BENCHMARK: SURVIVOR WIN-PROB.
 *
 * v1 is log-survival of a single week's pick among unused teams. It is not a
 * contest-winning probability. Field-size Monte Carlo is out of scope until
 * engine ratings feed this module.
 *
 * Fail-closed: missing / non-finite / out-of-(0,1] win prob drops that team.
 * Empty unused set → refuse.
 */

import { round } from "../expected-metrics/numeric.js";

export const SURVIVOR_EV_METHOD_TAG = "gse-survivor-logscore-v1" as const;

export interface SurvivorTeamWeek {
  readonly teamId: string;
  /** Independent win probability in (0, 1]. */
  readonly winProb: number;
}

export interface SurvivorPickRow {
  readonly teamId: string;
  readonly winProb: number;
  /** ln(winProb). Higher is better. */
  readonly logSurvival: number;
  readonly rank: number;
}

export type SurvivorPickResult =
  | {
      readonly ok: true;
      readonly method: typeof SURVIVOR_EV_METHOD_TAG;
      readonly caveat: "weekly_log_survival_not_contest_win_probability";
      readonly rows: readonly SurvivorPickRow[];
    }
  | {
      readonly ok: false;
      readonly method: typeof SURVIVOR_EV_METHOD_TAG;
      readonly reason: "no_unused_teams_with_finite_win_prob";
    };

export function rankSurvivorPicks(
  teams: readonly SurvivorTeamWeek[],
  alreadyUsed: ReadonlySet<string>,
): SurvivorPickResult {
  const kept = teams.filter(
    (t) =>
      !alreadyUsed.has(t.teamId) &&
      Number.isFinite(t.winProb) &&
      t.winProb > 0 &&
      t.winProb <= 1,
  );
  if (kept.length === 0) {
    return {
      ok: false,
      method: SURVIVOR_EV_METHOD_TAG,
      reason: "no_unused_teams_with_finite_win_prob",
    };
  }
  const scored = kept
    .map((t) => ({
      teamId: t.teamId,
      winProb: t.winProb,
      logSurvival: Math.log(t.winProb),
      rank: 0,
    }))
    .sort(
      (a, b) =>
        b.logSurvival - a.logSurvival || (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0),
    )
    .map((row, i) => ({ ...row, logSurvival: round(row.logSurvival, 6), rank: i + 1 }));
  return {
    ok: true,
    method: SURVIVOR_EV_METHOD_TAG,
    caveat: "weekly_log_survival_not_contest_win_probability",
    rows: scored,
  };
}
