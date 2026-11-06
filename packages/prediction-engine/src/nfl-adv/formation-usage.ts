/**
 * Under-center usage × efficiency — AGENTS.md ENGINE BENCHMARK: UNDER-CENTER USAGE.
 *
 * nflverse `shotgun` is the only public snap-alignment flag. shotgun === 0 is
 * treated as under-center-or-pistol (pistol is not separately labeled). Do not
 * read a usage rate as an efficiency claim; both splits are returned.
 *
 * Empty split → null EPA, never 0.
 */

import { mean, round } from "../expected-metrics/numeric.js";

export const FORMATION_USAGE_METHOD_TAG = "gse-formation-usage-v1" as const;

export interface FormationPlay {
  /** nflverse `shotgun` (0/1). */
  readonly shotgun: 0 | 1;
  /** Lab-sample EPA (caller already applied inLabSample). */
  readonly epa: number;
}

export interface FormationUsageSplit {
  readonly plays: number;
  readonly epaPerPlay: number | null;
  readonly successRate: number | null;
}

export interface FormationUsageResult {
  readonly method: typeof FORMATION_USAGE_METHOD_TAG;
  readonly n: number;
  /** Share of snaps with shotgun === 0. Null if n === 0. */
  readonly underCenterOrPistolRate: number | null;
  readonly shotgun: FormationUsageSplit;
  readonly underCenterOrPistol: FormationUsageSplit;
  readonly caveat: "shotgun_eq_0_is_under_center_or_pistol_nflverse_has_no_pistol_flag";
}

function split(plays: readonly FormationPlay[]): FormationUsageSplit {
  if (plays.length === 0) {
    return { plays: 0, epaPerPlay: null, successRate: null };
  }
  const epas = plays.map((p) => p.epa);
  const successes = plays.filter((p) => p.epa > 0).length;
  return {
    plays: plays.length,
    epaPerPlay: round(mean(epas), 6),
    successRate: round(successes / plays.length, 6),
  };
}

export function formationUsage(plays: readonly FormationPlay[]): FormationUsageResult {
  const shotgunPlays = plays.filter((p) => p.shotgun === 1);
  const under = plays.filter((p) => p.shotgun === 0);
  return {
    method: FORMATION_USAGE_METHOD_TAG,
    n: plays.length,
    underCenterOrPistolRate: plays.length === 0 ? null : round(under.length / plays.length, 6),
    shotgun: split(shotgunPlays),
    underCenterOrPistol: split(under),
    caveat: "shotgun_eq_0_is_under_center_or_pistol_nflverse_has_no_pistol_flag",
  };
}
