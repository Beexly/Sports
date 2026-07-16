/**
 * GSE Trench Matchup Index — team O-line and D-line indices on the 50±10
 * scale.
 *
 * The trenches decide fantasy outcomes (pocket time for the passing game,
 * yards-before-contact for the run game), and sealed trench "matchup" grades
 * hide the formula. GSE's version is a published formula:
 * percentile-rank each component (average-rank ties), weight-blend, z-score
 * the blend across the league, map to 50±10.
 *
 *   O-line (pass pro + run block), weights /4.2:
 *     pct(−pressure%)·1.3 + pct(−sackRate)·1.2 + pct(pocketTime)·0.8 + pct(ybc/att)·0.9
 *   D-line (pass rush generated), weights /4.2:
 *     pct(pressures)·1.2 + pct(sacks)·1.3 + pct(qbKnockdowns)·0.8 + pct(hurries)·0.9
 *
 * A matchup = one offense's O-line index against the opponent's D-line index.
 * Port of the validated clean-room reference implementation; the O-line side
 * is golden-verified against its live 2025 team table in the test suite.
 */

import { percentileRanks, zscores, to100 } from "../core/stats";

export interface TeamOffensiveLine {
  readonly team: string;
  /** Pass-attempt-weighted pressure rate allowed (%). Lower is better. */
  readonly pressurePct: number;
  /** Sacks / (attempts + sacks). Lower is better. */
  readonly sackRate: number;
  /** Pass-attempt-weighted average pocket time (s). Higher is better. */
  readonly pocketTime: number;
  /** Attempt-weighted rushing yards before contact per attempt. Higher is better. */
  readonly yardsBeforeContactPerAtt: number;
}

export interface TeamDefensiveLine {
  readonly team: string;
  readonly pressures: number;
  readonly sacks: number;
  readonly qbKnockdowns: number;
  readonly hurries: number;
}

export interface TrenchIndex {
  readonly team: string;
  /** 50±10 index across the league passed in. */
  readonly index: number;
}

const OL_WEIGHT_TOTAL = 4.2;
const DL_WEIGHT_TOTAL = 4.2;

/** O-line index across a league of teams (returns input order). */
export function computeOffensiveLineIndex(teams: readonly TeamOffensiveLine[]): TrenchIndex[] {
  const pressure = percentileRanks(teams.map((t) => -t.pressurePct));
  const sack = percentileRanks(teams.map((t) => -t.sackRate));
  const pocket = percentileRanks(teams.map((t) => t.pocketTime));
  const ybc = percentileRanks(teams.map((t) => t.yardsBeforeContactPerAtt));
  const blended = teams.map(
    (_, i) =>
      (pressure[i]! * 1.3 + sack[i]! * 1.2 + pocket[i]! * 0.8 + ybc[i]! * 0.9) / OL_WEIGHT_TOTAL,
  );
  const z = zscores(blended);
  return teams.map((t, i) => ({ team: t.team, index: to100(z[i]!) }));
}

/** D-line pass-rush index across a league of teams (returns input order). */
export function computeDefensiveLineIndex(teams: readonly TeamDefensiveLine[]): TrenchIndex[] {
  const prss = percentileRanks(teams.map((t) => t.pressures));
  const sk = percentileRanks(teams.map((t) => t.sacks));
  const qbkd = percentileRanks(teams.map((t) => t.qbKnockdowns));
  const hrry = percentileRanks(teams.map((t) => t.hurries));
  const blended = teams.map(
    (_, i) => (prss[i]! * 1.2 + sk[i]! * 1.3 + qbkd[i]! * 0.8 + hrry[i]! * 0.9) / DL_WEIGHT_TOTAL,
  );
  const z = zscores(blended);
  return teams.map((t, i) => ({ team: t.team, index: to100(z[i]!) }));
}

/**
 * The matchup read: positive = the offense's line wins the trenches; the
 * magnitude is in 50±10 index points on the same league scale.
 */
export function trenchMatchup(offenseOlIndex: number, defenseDlIndex: number): number {
  return offenseOlIndex - defenseDlIndex;
}
