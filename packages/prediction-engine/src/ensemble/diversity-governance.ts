/**
 * Ensemble-diversity governance (arXiv 2007.15508).
 *
 * The paper's ambiguous-role-of-social-influence analysis becomes a standing
 * governance rule for GSE's model pool:
 *  - alpha_proxy: mean pairwise correlation of week-to-week prediction
 *    changes across component models (do models move together?).
 *  - beta_proxy: each model's correlation with its independent signal vs.
 *    the ensemble mean (is it still thinking for itself?).
 *  - delta^2(t): cross-model variance of log-odds forecasts each week;
 *    flag "diversity rot" if it decays while models ingest the same data.
 *  - Model-independence registry: each component model must keep at least
 *    one unshared feature family / data source; retraining pipelines must
 *    not use the ensemble's own outputs as features.
 *
 * ACCEPTANCE GATE: ADOPT the governance rule if the audit finds either
 * (a) a statistically significant downward trend in delta^2(t) over 2025
 * (p < 0.05), or (b) any pair of component models with |correlation| > 0.9
 * on holdout predictions.
 *
 * Research-only module. Not wired into any live ensemble path.
 */

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

function correlation(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error("correlation: length mismatch");
  if (a.length < 2) throw new Error("correlation: need >= 2 observations");
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = (a[i] as number) - ma;
    const xb = (b[i] as number) - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da < 1e-300 || db < 1e-300) return NaN;
  return num / Math.sqrt(da * db);
}

function logit(p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(c / (1 - c));
}

/**
 * alpha_proxy: mean pairwise correlation of week-to-week prediction changes.
 * changes[m][t] = model m's forecast change from week t to t+1.
 */
export function alphaProxy(changes: ReadonlyArray<readonly number[]>): number {
  const m = changes.length;
  if (m < 2) throw new Error("alphaProxy: need >= 2 models");
  let sum = 0;
  let n = 0;
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const c = correlation(changes[i] as readonly number[], changes[j] as readonly number[]);
      if (Number.isNaN(c)) continue;
      sum += c;
      n++;
    }
  }
  if (n === 0) throw new Error("alphaProxy: no valid pairs");
  return sum / n;
}

/**
 * beta_proxy for one model: correlation of the model's forecast series with
 * its independent signal vs. with the ensemble mean. Returns
 * { withSignal, withEnsemble }: healthy when withSignal >> withEnsemble.
 */
export function betaProxy(
  modelSeries: readonly number[],
  independentSignal: readonly number[],
  ensembleMean: readonly number[],
): { withSignal: number; withEnsemble: number } {
  return {
    withSignal: correlation(modelSeries, independentSignal),
    withEnsemble: correlation(modelSeries, ensembleMean),
  };
}

/**
 * delta^2(t): cross-model variance of log-odds forecasts per week.
 * weeklyProbs[m][t] = model m's probability in week t.
 */
export function logOddsVarianceSeries(
  weeklyProbs: ReadonlyArray<readonly number[]>,
): number[] {
  const m = weeklyProbs.length;
  if (m < 2) throw new Error("logOddsVarianceSeries: need >= 2 models");
  const T = (weeklyProbs[0] as readonly number[]).length;
  const out: number[] = [];
  for (let t = 0; t < T; t++) {
    const ls = weeklyProbs.map((s) => logit(s[t] as number));
    const mu = mean(ls);
    out.push(ls.reduce((a, x) => a + (x - mu) ** 2, 0) / m);
  }
  return out;
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

/**
 * Diversity-rot test: OLS slope of delta^2(t) on time; flags rot when the
 * slope is significantly negative (one-sided p < 0.05).
 */
export function diversityRotTest(delta2: readonly number[]): {
  slope: number;
  pValue: number;
  rot: boolean;
} {
  const n = delta2.length;
  if (n < 4) throw new Error("diversityRotTest: need >= 4 weeks");
  const t = delta2.map((_, i) => i);
  const mt = mean(t);
  const my = mean(delta2);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - mt) ** 2;
    sxy += (i - mt) * ((delta2[i] as number) - my);
  }
  const slope = sxy / Math.max(1e-300, sxx);
  const resid = delta2.map((y, i) => (y as number) - (my + slope * (i - mt)));
  const s2 = resid.reduce((a, r) => a + r * r, 0) / Math.max(1, n - 2);
  const se = Math.sqrt(s2 / Math.max(1e-300, sxx));
  const z = se > 0 ? slope / se : 0;
  const pValue = normalCdf(z); // one-sided: P(slope < 0)
  return { slope, pValue, rot: pValue < 0.05 };
}

export interface RegistryEntry {
  model: string;
  /** Feature families / data sources unique to this model. */
  unsharedFamilies: string[];
  /** True when the retraining pipeline consumes ensemble outputs. */
  trainsOnEnsembleOutput: boolean;
}

/**
 * Model-independence registry audit: every model must keep at least one
 * unshared feature family, and no retraining pipeline may use the
 * ensemble's own outputs as features.
 */
export function auditIndependenceRegistry(
  entries: readonly RegistryEntry[],
): { model: string; violation: string }[] {
  const out: { model: string; violation: string }[] = [];
  for (const e of entries) {
    if (e.unsharedFamilies.length === 0) {
      out.push({ model: e.model, violation: "no unshared feature family" });
    }
    if (e.trainsOnEnsembleOutput) {
      out.push({ model: e.model, violation: "retrains on ensemble output" });
    }
  }
  return out;
}
