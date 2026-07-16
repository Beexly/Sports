/**
 * GSE Team Defense — the defensive half of every Matchup Skill Index pairing.
 *
 * A receiver matches against the opposing PASS-defense index; a running back
 * against the RUSH-defense index; an offensive line against the pass-rush
 * (see trench.ts). All indices are 50±10 across the league, built from
 * percentile-blended components with PUBLIC weights, z-scored:
 *
 *   passD = pct(−passEpaAllowed)·1.3 + pct(−coverageRating)·1.1 +
 *           pct(−coverageCompletionPct)·0.8 + pct(pressures)·0.9
 *   rushD = pct(−rushEpaAllowed)·1.4 + pct(−rushSuccessRateAllowed)·1.0
 *   overall = pct(−epaPerPlayAllowed)
 *
 * (The weighted sums feed a z-score, which is scale-invariant — the weights
 * express relative importance, not units.) Golden-verified against the
 * validated reference implementation's live 2025 team table in the test suite.
 */

import { percentileRanks, zscores, to100 } from "../core/stats";

export interface TeamDefenseCategories {
  readonly team: string;
  /** EPA per pass play allowed (lower = better defense). */
  readonly passEpaAllowed: number;
  /** EPA per rush play allowed. */
  readonly rushEpaAllowed: number;
  /** Success rate allowed on rushes (0–1). */
  readonly rushSuccessRateAllowed: number;
  /** EPA per scrimmage play allowed (overall). */
  readonly epaPerPlayAllowed: number;
  /** Target-weighted completion % allowed in coverage. */
  readonly coverageCompletionPct: number;
  /** Target-weighted passer rating allowed in coverage. */
  readonly coverageRating: number;
  /** Pressures generated. */
  readonly pressures: number;
}

export interface TeamDefenseIndices {
  readonly team: string;
  /** 50±10: higher = better pass defense. */
  readonly passDefenseIndex: number;
  /** 50±10: higher = better run defense. */
  readonly rushDefenseIndex: number;
  /** 50±10: higher = better overall defense (EPA/play allowed). */
  readonly overallIndex: number;
}

function indexOf(blended: readonly number[]): number[] {
  return zscores(blended).map(to100);
}

export function computeTeamDefense(teams: readonly TeamDefenseCategories[]): TeamDefenseIndices[] {
  const passEpa = percentileRanks(teams.map((t) => -t.passEpaAllowed));
  const covRat = percentileRanks(teams.map((t) => -t.coverageRating));
  const covCmp = percentileRanks(teams.map((t) => -t.coverageCompletionPct));
  const prss = percentileRanks(teams.map((t) => t.pressures));
  const passBlend = teams.map(
    (_, i) => passEpa[i]! * 1.3 + covRat[i]! * 1.1 + covCmp[i]! * 0.8 + prss[i]! * 0.9,
  );

  const rushEpa = percentileRanks(teams.map((t) => -t.rushEpaAllowed));
  const rushSr = percentileRanks(teams.map((t) => -t.rushSuccessRateAllowed));
  const rushBlend = teams.map((_, i) => rushEpa[i]! * 1.4 + rushSr[i]! * 1.0);

  const overallBlend = percentileRanks(teams.map((t) => -t.epaPerPlayAllowed));

  const passIdx = indexOf(passBlend);
  const rushIdx = indexOf(rushBlend);
  const overallIdx = indexOf(overallBlend);

  return teams.map((t, i) => ({
    team: t.team,
    passDefenseIndex: passIdx[i]!,
    rushDefenseIndex: rushIdx[i]!,
    overallIndex: overallIdx[i]!,
  }));
}
