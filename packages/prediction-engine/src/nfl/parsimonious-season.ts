/**
 * Maximally parsimonious season model (football-tables transplant).
 *
 * Two transfers: (a) the paper's MAE null E = (1/3)(n²−1)/n as the
 * documented chance baseline for every GSE season-standings product
 * (division-winner tables, playoff seeding forecasts) — exact math, adopted
 * regardless; (b) schedule-adjusted early point differential as the
 * engine's weeks-1-6 team-strength prior: regress final win totals on
 * week-r standings vs week-r schedule-adjusted point differential over
 * 2015–2024, and horse-race it against the full Monte-Carlo season
 * simulation on final-table MAE against the exact null. Improvements over
 * the paper: schedule-adjust the differential (the paper's goal difference
 * ignores fixture imbalance — worse in a 17-game season) and run the true
 * out-of-sample horse race the authors skipped.
 *
 * @see arXiv:1805.08937v1 — "Predicting Football Tables by a Maximally Parsimonious Model"
 *
 * ACCEPTANCE GATE: ADOPT schedule-adjusted early point differential as the
 * engine's weeks-1-6 team-strength prior only iff it beats the current prior
 * by ≥ 0.03 out-of-sample R² on 2025 final win totals (weeks 1–6
 * forecasts); REJECT (keep current prior) otherwise. Documentation gate
 * (independent): the MAE-null formulas are adopted into the
 * season-product methodology docs regardless. The gate is a backtest
 * concern; this module is the pure parsimony kernel, not wired live.
 */

/**
 * Exact MAE null for a final table of n teams under random ordering:
 * E = (1/3)(n² − 1)/n.
 */
export function maeNullTable(n: number): number {
  if (!(n >= 2)) throw new Error("maeNullTable: n ≥ 2");
  return ((n * n - 1) / n / 3);
}

export interface EarlyGame {
  team: string;
  opponent: string;
  pointDiff: number; // team perspective
  /** Opponent strength (e.g. market-implied rating) for schedule adjustment. */
  oppStrength: number;
}

/**
 * Schedule-adjusted early point differential per team: mean(pointDiff −
 * oppStrength), removing fixture imbalance the paper's raw goal difference
 * ignores.
 */
export function scheduleAdjustedDiff(games: readonly EarlyGame[]): Record<string, number> {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const g of games) {
    const a = acc.get(g.team) ?? { sum: 0, n: 0 };
    a.sum += g.pointDiff - g.oppStrength;
    a.n += 1;
    acc.set(g.team, a);
  }
  return Object.fromEntries(
    [...acc.entries()].map(([t, a]) => [t, a.sum / Math.max(1, a.n)]),
  );
}

/**
 * Fit final-wins ~ early differential (OLS, single feature + intercept).
 * Returns { slope, intercept, rSquared } on the training teams.
 */
export function fitWinsRegression(
  earlyDiff: Readonly<Record<string, number>>,
  finalWins: Readonly<Record<string, number>>,
): { slope: number; intercept: number; rSquared: number } {
  const teams = Object.keys(earlyDiff).filter((t) => t in finalWins);
  if (teams.length < 3) throw new Error("fitWinsRegression: need ≥ 3 teams");
  const xs = teams.map((t) => earlyDiff[t] ?? 0);
  const ys = teams.map((t) => finalWins[t] ?? 0);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = sxx > 0 ? xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0) / sxx : 0;
  const intercept = my - slope * mx;
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * (xs[i] ?? 0))) ** 2, 0);
  return { slope, intercept, rSquared: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

/** Predict final wins from the fitted regression. */
export function predictWins(
  earlyDiff: Readonly<Record<string, number>>,
  model: { slope: number; intercept: number },
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(earlyDiff).map(([t, d]) => [t, model.intercept + model.slope * d]),
  );
}

/** MAE of a final-table forecast vs actual wins (the horse-race metric). */
export function tableMae(
  predicted: Readonly<Record<string, number>>,
  actual: Readonly<Record<string, number>>,
): number {
  const teams = Object.keys(predicted).filter((t) => t in actual);
  if (teams.length === 0) throw new Error("tableMae: no overlapping teams");
  return teams.reduce((s, t) => s + Math.abs((predicted[t] ?? 0) - (actual[t] ?? 0)), 0) / teams.length;
}
