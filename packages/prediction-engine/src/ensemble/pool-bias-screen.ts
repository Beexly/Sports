/**
 * Model-pool bias screen + champion-model baseline (arXiv 2008.01485).
 *
 * Two instruments against "much ado about nothing" ensembles:
 * (1) Per game-week, test the pool's unbiasedness with the Spiegelhalter
 *     z-test (and Hosmer-Lemeshow) on pooled probability forecasts; flag
 *     weeks where the pool is significantly biased.
 * (2) Best-single-model baseline: weekly compare ensemble Brier vs each
 *     individual model's; maintain the running fraction of weeks the
 *     ensemble beats most models, and keep a 'champion model' lane alive
 *     (trailing-8-week Brier leader).
 *
 * ACCEPTANCE GATE: ADOPT the champion-model lane if, on 2025 data, the
 * single best trailing-8-week model beats the equal-weight ensemble on
 * full-season Brier, OR the ensemble beats most models in fewer than 75%
 * of weeks while a skill-weighted variant does not recover.
 *
 * Research-only module. Not wired into any live aggregation path.
 */

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
    0.284496736) * t + 0.254829592) * t;
  return s * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface BiasScreenResult {
  z: number;
  /** Two-sided p-value. */
  pValue: number;
  /** True when the pool looks biased at the 5% level. */
  biased: boolean;
}

/**
 * Spiegelhalter z-test for calibration-in-the-large of pooled probability
 * forecasts: z = sum(y - p) / sqrt(sum(p (1-p))).
 */
export function spiegelhalterZ(
  probs: readonly number[],
  outcomes: readonly number[],
): BiasScreenResult {
  if (probs.length !== outcomes.length) throw new Error("spiegelhalterZ: length mismatch");
  if (probs.length === 0) throw new Error("spiegelhalterZ: no data");
  let num = 0;
  let den = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] as number;
    num += (outcomes[i] as number) - p;
    den += p * (1 - p);
  }
  if (den <= 0) throw new Error("spiegelhalterZ: degenerate probabilities");
  const z = num / Math.sqrt(den);
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, pValue, biased: pValue < 0.05 };
}

/**
 * Hosmer-Lemeshow test with G groups (default 10): chi-square statistic on
 * grouped observed vs expected counts.
 */
export function hosmerLemeshow(
  probs: readonly number[],
  outcomes: readonly number[],
  groups = 10,
): { chi2: number; df: number; pValue: number; biased: boolean } {
  if (probs.length !== outcomes.length) throw new Error("hosmerLemeshow: length mismatch");
  if (probs.length < groups * 2) throw new Error("hosmerLemeshow: not enough data");
  const order = probs.map((p, i) => i).sort((a, b) => (probs[a] as number) - (probs[b] as number));
  const n = probs.length;
  let chi2 = 0;
  let used = 0;
  for (let g = 0; g < groups; g++) {
    const idx = order.slice(Math.floor((g * n) / groups), Math.floor(((g + 1) * n) / groups));
    if (idx.length === 0) continue;
    const obs = idx.reduce((a, i) => a + (outcomes[i] as number), 0);
    const exp = idx.reduce((a, i) => a + (probs[i] as number), 0);
    if (exp <= 0 || exp >= idx.length) continue;
    chi2 += (obs - exp) ** 2 / (exp * (1 - exp / idx.length));
    used++;
  }
  const df = Math.max(1, used - 2);
  // Chi-square survival via the regularized gamma (Wilson-Hilferty approx).
  const pValue = chi2Survival(chi2, df);
  return { chi2, df, pValue, biased: pValue < 0.05 };
}

/** Chi-square survival function via Wilson-Hilferty normal approximation. */
function chi2Survival(x: number, df: number): number {
  if (x <= 0) return 1;
  const z =
    (Math.cbrt(x / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

function brier(probs: readonly number[], outcomes: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < probs.length; i++) s += ((probs[i] as number) - (outcomes[i] as number)) ** 2;
  return s / Math.max(1, probs.length);
}

export interface WeekResult {
  week: number;
  ensembleBrier: number;
  modelBriers: number[];
  /** True when the ensemble beats the majority of individual models. */
  ensembleBeatsMost: boolean;
  champion: number;
}

/**
 * Weekly champion tracking. modelProbs[m][i] = model m's forecast for game i
 * in this week; outcomes[i] = realized outcomes.
 */
export function weeklyChampion(
  week: number,
  modelProbs: ReadonlyArray<readonly number[]>,
  outcomes: readonly number[],
  trailingBriers: readonly number[],
): WeekResult {
  const m = modelProbs.length;
  if (m === 0) throw new Error("weeklyChampion: no models");
  if (trailingBriers.length !== m) throw new Error("weeklyChampion: trailing length mismatch");
  const n = outcomes.length;
  const ens = Array.from({ length: n }, (_, i) =>
    mean(modelProbs.map((mp) => mp[i] as number)),
  );
  const ensembleBrier = brier(ens, outcomes);
  const modelBriers = modelProbs.map((mp) => brier(mp, outcomes));
  const beaten = modelBriers.filter((b) => ensembleBrier < b).length;
  let champion = 0;
  for (let i = 1; i < m; i++) {
    if ((trailingBriers[i] as number) < (trailingBriers[champion] as number)) champion = i;
  }
  return {
    week,
    ensembleBrier,
    modelBriers,
    ensembleBeatsMost: beaten > m / 2,
    champion,
  };
}

/** Running fraction of weeks the ensemble beat most models. */
export function ensembleWinRate(weeks: readonly WeekResult[]): number {
  if (weeks.length === 0) throw new Error("ensembleWinRate: no weeks");
  return weeks.filter((w) => w.ensembleBeatsMost).length / weeks.length;
}
