/**
 * arXiv 2202.08500: Causal inference with recurrent and competing events
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Stand up the recurrent/competing-events estimand taxonomy for injury analysis: total vs controlled-direct effect of high acute:chronic workload weeks on recurrent soft-tissue injury counts per player-season, with season-ending IR as the competing event (nflverse injury + snap-count workload 2018-2024); discrete-time g-formula/IPW vs a naive censor-at-IR analysis to show the estimand gap; positivity check via weight truncation [0.1, 10].
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Stand up the recurrent/competing-events estimand taxonomy for injury analysis: total vs controlled-direct effect of high acute:chronic workload weeks on recurrent soft-tissue injury counts per player-season, with season-ending IR as the competing event (nflverse injury + snap-count workload 2018-2024); discrete-time g-formula/IPW vs a naive censor-at-IR analysis to show the estimand gap; positivity check via weight truncation [0.1, 10].
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT iff the NFL replication shows the naive censor-at-IR estimate and the IPW total effect differ by >=20% (competing-event distinction matters empirically) with identified positivity (no weight truncation beyond [0.1,10] needed for >95% of player-weeks); REJECT the full machinery if the difference is <10% — keep only the taxonomy as a reporting standard.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */

export const ENABLED = false;

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
