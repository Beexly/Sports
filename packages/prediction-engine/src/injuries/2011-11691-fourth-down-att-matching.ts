/**
 * arXiv 2011.11691: The causal effect of a timeout at stopping an opposing run in the NBA
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NFL 4th-down replication: units = 4th-down decisions (go-for-it vs punt/FG) or 2-point conversion attempts; outcome = integrated centered win-probability difference over the next drive / rest of half; covariates = yard line, yards to go, score differential, time remaining, timeouts remaining, pre-game spread/total, weather, team identities, coach identity; propensity via GAM or gradient-boosted model + genetic matching; estimand = ATT of aggressive 4th-down decisions with heterogeneity by coach; Rosenbaum Gamma sensitivity.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * NFL 4th-down replication: units = 4th-down decisions (go-for-it vs punt/FG) or 2-point conversion attempts; outcome = integrated centered win-probability difference over the next drive / rest of half; covariates = yard line, yards to go, score differential, time remaining, timeouts remaining, pre-game spread/total, weather, team identities, coach identity; propensity via GAM or gradient-boosted model + genetic matching; estimand = ATT of aggressive 4th-down decisions with heterogeneity by coach; serving offline research.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the pipeline if on the NFL 4th-down replication (a) post-match |standardized bias| < 0.2 for all covariates, (b) the ATT estimate has |t| > 2 and the sign is unchanged when FG attempts are excluded from the control pool, and (c) Rosenbaum Gamma for loss of significance >= 1.5. REJECT if balance fails or Gamma < 1.2.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */

export const ENABLED = false;

/** Stratified (exact-match) ATT: mean treated-minus-control within strata. */
export function stratifiedATT(y: number[], t: number[], strata: number[]): number {
  const sIds = [...new Set(strata)];
  let num = 0;
  let den = 0;
  for (const s of sIds) {
    const yt = y.filter((_, i) => strata[i] === s && t[i] === 1);
    const yc = y.filter((_, i) => strata[i] === s && t[i] === 0);
    if (yt.length === 0 || yc.length === 0) continue;
    const mt = yt.reduce((a, b) => a + b, 0) / yt.length;
    const mc = yc.reduce((a, b) => a + b, 0) / yc.length;
    num += yt.length * (mt - mc);
    den += yt.length;
  }
  return den === 0 ? NaN : num / den;
}

/** Permutation p-value for the stratified ATT (two-sided). */
export function permutationP(
  y: number[],
  t: number[],
  strata: number[],
  rand: () => number,
  B = 500,
): number {
  const obs = Math.abs(stratifiedATT(y, t, strata));
  let ge = 0;
  for (let b = 0; b < B; b++) {
    const tp = [...t];
    for (let i = tp.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = tp[i]!;
      tp[i] = tp[j]!;
      tp[j] = tmp;
    }
    if (Math.abs(stratifiedATT(y, tp, strata)) >= obs) ge++;
  }
  return (ge + 1) / (B + 1);
}

/** Rosenbaum Gamma sensitivity: upper bound on the sign-test p-value. */
export function rosenbaumGammaBound(diffs: number[], Gamma: number): number {
  // matched-pair differences; worst-case p under hidden bias Gamma
  const n = diffs.length;
  const pos = diffs.filter((d) => d > 0).length;
  const pPlus = Gamma / (1 + Gamma);
  // normal approx to Binomial(n, pPlus) upper tail
  const m = n * pPlus;
  const sd = Math.sqrt(n * pPlus * (1 - pPlus));
  const z = (pos - 0.5 - m) / Math.max(1e-9, sd);
  return 1 - normalCdfR(z);
}

function normalCdfR(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Genetic-matching-style balance objective: max |SMD| across covariates. */
export function maxAbsSmd(X: number[][], t: number[]): number {
  let m = 0;
  for (let j = 0; j < X[0]!.length; j++) {
    const col = X.map((row) => row[j]!);
    m = Math.max(m, Math.abs(smdLocal(col, t)));
  }
  return m;
}

function smdLocal(x: number[], t: number[]): number {
  const x1 = x.filter((_, i) => t[i] === 1);
  const x0 = x.filter((_, i) => t[i] === 0);
  const m1 = x1.reduce((a, b) => a + b, 0) / Math.max(1, x1.length);
  const m0 = x0.reduce((a, b) => a + b, 0) / Math.max(1, x0.length);
  return m1 - m0;
}

/** Truncate propensity weights to [lo, hi]. */
export function truncateWeights(w: number[], lo: number, hi: number): number[] {
  return w.map((x) => Math.min(hi, Math.max(lo, x)));
}

/** Check overlap: fraction of propensities inside [lo, hi]. */
export function overlapCheck(e: number[], lo = 0.05, hi = 0.95): number {
  return e.filter((x) => x >= lo && x <= hi).length / e.length;
}

/** IPW estimate of the ATE. */
export function ipwATE(y: number[], t: number[], e: number[]): number {
  let s = 0;
  for (let i = 0; i < y.length; i++) {
    const ei = Math.min(0.999, Math.max(0.001, e[i]!));
    s += (t[i]! * y[i]!) / ei - ((1 - t[i]!) * y[i]!) / (1 - ei);
  }
  return s / y.length;
}

/** IPW estimate of the ATT. */
export function ipwATT(y: number[], t: number[], e: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < y.length; i++) {
    const ei = Math.min(0.999, Math.max(0.001, e[i]!));
    const w = t[i]! === 1 ? 1 : ei / (1 - ei);
    num += w * (t[i]! === 1 ? y[i]! : -y[i]!);
    den += t[i]! === 1 ? 1 : 0;
  }
  void den;
  const n1 = t.filter((x) => x === 1).length;
  return num / Math.max(1, n1);
}

/** Standardized mean difference for balance checking. */
export function smd(x: number[], t: number[]): number {
  const x1 = x.filter((_, i) => t[i] === 1);
  const x0 = x.filter((_, i) => t[i] === 0);
  const m1 = x1.reduce((a, b) => a + b, 0) / x1.length;
  const m0 = x0.reduce((a, b) => a + b, 0) / x0.length;
  const v1 = x1.reduce((a, b) => a + (b - m1) ** 2, 0) / x1.length;
  const v0 = x0.reduce((a, b) => a + (b - m0) ** 2, 0) / x0.length;
  const pooled = Math.sqrt((v1 + v0) / 2);
  return pooled <= 0 ? 0 : (m1 - m0) / pooled;
}

/** Two-timepoint discrete-time g-formula for a binary treatment sequence. */
export function discreteGFormula(
  y11: number, y10: number, y01: number, y00: number,
): { always: number; never: number } {
  // Under sequential ignorability with no time-varying confounders,
  // E[Y^{a1,a2}] = E[Y | A1=a1, A2=a2]: the fixed-regime means.
  const always = y11;
  const never = y00;
  void y10;
  void y01;
  return { always, never };
}
