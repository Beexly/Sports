/**
 * Temperature scaling — the mandatory calibration recipe for every
 * probability GSE emits.
 *
 * For each pick model: reserve a held-out calibration set (recent games,
 * time-ordered), fit temperature T on validation NLL over model
 * logits/probabilities, apply q̂ = softmax(z/T) before any confidence
 * display or Kelly sizing; track ECE (M=15) weekly per market and re-fit T
 * on a rolling window. Temperature scaling is accuracy-invariant (the pick
 * stays the same, only its price changes) — the NLL-vs-accuracy disconnect
 * explains why good pick accuracy can still produce terrible Kelly sizing.
 *
 * @see arXiv:1706.04599v2 — "On Calibration of Modern Neural Networks"
 *
 * ACCEPTANCE GATE: ADOPT iff calibrated probabilities improve realized
 * Kelly-growth or reduce abstention-gate false-positives on 2024–25 NFL
 * logs. REJECT if GSE's probabilities are already calibrated — measure ECE
 * first; if < 1%, skip. The gate is a backtest concern; this module is the
 * pure calibration kernel, not wired into any live path.
 */

/** Softmax with temperature. */
export function softmaxTemp(logits: readonly number[], temperature: number): number[] {
  if (!(temperature > 0)) throw new Error("softmaxTemp: T > 0");
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp((z - max) / temperature));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

/** Binary probability from a single logit at temperature T. */
export function scaledProb(logit: number, temperature: number): number {
  if (!(temperature > 0)) throw new Error("scaledProb: T > 0");
  return 1 / (1 + Math.exp(-logit / temperature));
}

/**
 * Fit T by minimizing validation NLL (golden-section search on log T).
 * Returns the best temperature and its NLL.
 */
export function fitTemperature(
  logits: readonly number[],
  labels: ReadonlyArray<0 | 1>,
  lo = 0.05,
  hi = 10,
): { temperature: number; nll: number } {
  if (logits.length !== labels.length || logits.length === 0) {
    throw new Error("fitTemperature: length mismatch/empty");
  }
  const nll = (t: number): number => {
    let s = 0;
    for (let i = 0; i < logits.length; i++) {
      const p = Math.min(Math.max(scaledProb(logits[i] ?? 0, t), 1e-12), 1 - 1e-12);
      s += -((labels[i] ?? 0) * Math.log(p) + (1 - (labels[i] ?? 0)) * Math.log(1 - p));
    }
    return s / logits.length;
  };
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = Math.log(lo);
  let b = Math.log(hi);
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  for (let i = 0; i < 60; i++) {
    if (nll(Math.exp(c)) < nll(Math.exp(d))) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  const t = Math.exp((a + b) / 2);
  return { temperature: t, nll: nll(t) };
}

/**
 * Expected Calibration Error with M equal-width bins.
 */
export function expectedCalibrationError(
  probs: readonly number[],
  labels: ReadonlyArray<0 | 1>,
  bins = 15,
): number {
  if (probs.length !== labels.length || probs.length === 0) {
    throw new Error("expectedCalibrationError: length mismatch/empty");
  }
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let n = 0;
    let pSum = 0;
    let ySum = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i] ?? 0;
      if (p > lo && (p <= hi || (b === bins - 1 && p === 1))) {
        n++;
        pSum += p;
        ySum += labels[i] ?? 0;
      }
    }
    if (n > 0) ece += (n / probs.length) * Math.abs(pSum / n - ySum / n);
  }
  return ece;
}

/**
 * Accuracy-invariance check: temperature scaling never changes the argmax
 * pick — only the price. Returns true iff every scaled pick matches the
 * unscaled pick.
 */
export function preservesPicks(logits: readonly number[], temperature: number): boolean {
  const argmax = (v: readonly number[]): number =>
    v.reduce((bi, x, i) => (x > (v[bi] ?? -Infinity) ? i : bi), 0);
  // Softmax is monotone in each logit, so argmax is temperature-invariant.
  return argmax(logits) === argmax(softmaxTemp(logits, temperature));
}
