/**
 * Metric discrimination gate for joint forecasts (arXiv 2201.08671).
 *
 * The paper shows CRPS-Sum (sum-inside-score) can misrank joint
 * forecasters: a dummy marginal-matched noise model can beat a
 * known-good forecaster. GSE's guardrail:
 *  - ban CRPS-Sum (and any sum-inside-score metric) from model selection
 *    for joint forecasts (spread+total distributions, correlated slates);
 *  - use mean per-dimension CRPS + Energy Score;
 *  - institute the dummy-model discrimination test as a CI gate: every
 *    new evaluation metric must rank a known-good forecaster above (a) a
 *    marginal-matched noise forecaster and (b) a constant forecaster on
 *    backtest, or the metric is rejected. (The economic extension — can a
 *    degenerate always-bet-the-favorite strategy game the ROI metric? —
 *    reuses the same harness with ROI as the score.)
 *
 * ACCEPTANCE GATE: ADOPT the guardrail iff the reproduction confirms
 * CRPS-Sum can misrank on GSE's own joint forecasts (dummy beats or ties
 * the real model under CRPS-Sum while losing under Energy Score).
 *
 * Research-only module. Not wired into any live evaluation path.
 */

export type ScoreFn = (forecasts: number[][], outcomes: number[]) => number;

/** Mean per-dimension CRPS for ensemble forecasts (lower is better). */
export function meanCrps(forecasts: number[][], outcomes: number[]): number {
  const dims = outcomes.length;
  if (dims === 0) throw new Error("meanCrps: no dimensions");
  let total = 0;
  for (let d = 0; d < dims; d++) {
    const ens = forecasts.map((f) => f[d] as number);
    const y = outcomes[d] as number;
    const m = ens.length;
    let term1 = 0;
    for (const e of ens) term1 += Math.abs(e - y);
    let term2 = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) term2 += Math.abs((ens[i] as number) - (ens[j] as number));
    }
    total += term1 / m - term2 / (2 * m * m);
  }
  return total / dims;
}

/** Energy Score for ensemble joint forecasts (lower is better). */
export function energyScore(forecasts: number[][], outcomes: number[]): number {
  const m = forecasts.length;
  if (m === 0) throw new Error("energyScore: no ensemble members");
  const dist = (a: number[], b: number[]): number => {
    let s = 0;
    for (let d = 0; d < a.length; d++) s += ((a[d] as number) - (b[d] as number)) ** 2;
    return Math.sqrt(s);
  };
  let term1 = 0;
  for (const f of forecasts) term1 += dist(f, outcomes);
  let term2 = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) term2 += dist(forecasts[i] as number[], forecasts[j] as number[]);
  }
  return (2 * term1) / m - term2 / (m * m);
}

/**
 * CRPS-Sum: CRPS applied to the SUMMED forecast/outcome (sum-inside-score).
 * BANNED for model selection — included only to reproduce the misranking.
 */
export function crpsSum(forecasts: number[][], outcomes: number[]): number {
  const sumF = forecasts.map((f) => f.reduce((a, x) => a + x, 0));
  const sumY = outcomes.reduce((a, x) => a + x, 0);
  const m = sumF.length;
  const term1 = sumF.reduce((a, s) => a + Math.abs(s - sumY), 0) / m;
  let term2 = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) term2 += Math.abs((sumF[i] as number) - (sumF[j] as number));
  }
  return term1 - term2 / (2 * m * m);
}

export interface DiscriminationCase {
  name: string;
  good: number[][]; // known-good forecaster ensembles
  noise: number[][]; // marginal-matched noise forecaster
  constant: number[][]; // constant forecaster
  outcome: number[];
}

export interface DiscriminationVerdict {
  metric: string;
  /** True when the metric ranks good < noise AND good < constant. */
  discriminates: boolean;
  scores: { good: number; noise: number; constant: number };
}

/**
 * CI gate: a metric is admitted only if it ranks the known-good
 * forecaster strictly above both dummies (lower score = better).
 */
export function discriminationGate(
  metricName: string,
  score: ScoreFn,
  cases: readonly DiscriminationCase[],
): DiscriminationVerdict {
  if (cases.length === 0) throw new Error("discriminationGate: no cases");
  let good = 0;
  let noise = 0;
  let constant = 0;
  for (const c of cases) {
    good += score(c.good, c.outcome);
    noise += score(c.noise, c.outcome);
    constant += score(c.constant, c.outcome);
  }
  const n = cases.length;
  const scores = { good: good / n, noise: noise / n, constant: constant / n };
  return {
    metric: metricName,
    discriminates: scores.good < scores.noise && scores.good < scores.constant,
    scores,
  };
}
