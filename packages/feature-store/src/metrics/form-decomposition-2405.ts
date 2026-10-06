/**
 * Team form decomposition: between-season level + within-season trajectory
 *
 * Research port: arXiv:2405.17214
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Decomposes team form: each NFL team's weekly EPA/play (or GSE rating) 2015-2025 modeled as y_{team,season,week} = g(season-index) + f_{team,season}(week/18) + opponent adjustment. Pure decomposition: season-level means plus within-season linear trajectories.
 *
 * ACCEPTANCE GATE: Adopt the decomposition only if the within-season trajectory component reduces second-half prediction MSE by >=5% vs the flat-season-average baseline on 2015-2025. Live-data gate -> GSE_FORM_DECOMP_ENABLED flag (default false).
 */

export interface TeamWeek {
  team: string;
  season: number;
  week: number; // 1..18
  value: number; // weekly EPA/play or rating
  opponentAdjustment: number;
}

export interface FormDecomposition {
  /** g(season-index): between-season level per team-season */
  level: number;
  /** f(week/18): within-season trajectory as linear slope + intercept on normalized week */
  slope: number;
  intercept: number;
}

/** Least-squares linear fit of value on normalized week t = week/18. */
export function fitTrajectory(weeks: TeamWeek[]): FormDecomposition {
  const adj = weeks.map((w) => ({ t: w.week / 18, y: w.value - w.opponentAdjustment }));
  const level = adj.length === 0 ? 0 : adj.reduce((a, w) => a + w.y, 0) / adj.length;
  if (adj.length < 2) return { level, slope: 0, intercept: level };
  const mt = adj.reduce((a, w) => a + w.t, 0) / adj.length;
  let num = 0, den = 0;
  for (const w of adj) { num += (w.t - mt) * (w.y - level); den += (w.t - mt) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  return { level, slope, intercept: level - slope * mt };
}

/** Predict y at a normalized week using the decomposition. */
export function predictForm(d: FormDecomposition, week: number, opponentAdjustment: number): number {
  return d.intercept + d.slope * (week / 18) + opponentAdjustment;
}

/** MSE of predictions vs observed. */
export function mse(predicted: number[], observed: number[]): number {
  if (predicted.length === 0 || predicted.length !== observed.length) return Infinity;
  return predicted.reduce((a, p, i) => a + (p - (observed[i] ?? p)) ** 2, 0) / predicted.length;
}

/** Gate: trajectory MSE must be >=5% below the flat-season-average baseline MSE. */
export function formDecompGatePasses(trajMse: number, flatMse: number): boolean {
  return flatMse > 0 && (flatMse - trajMse) / flatMse >= 0.05;
}

/** Live-data gate: second-half MSE reduction on 2015-2025. */
export const GSE_FORM_DECOMP_ENABLED = false;

