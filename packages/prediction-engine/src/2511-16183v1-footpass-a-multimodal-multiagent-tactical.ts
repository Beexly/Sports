/**
 * arXiv:2511.16183v1 — FOOTPASS: A Multi-Modal Multi-Agent Tactical Context Dataset for Play-by-Play Action Spotting in Soccer Broadcast Videos
 *
 * Transfer entropy between team performance time series: TE(X->Y) via kNN-style binning detects directional
 * influence (does defensive pressure drive offensive output or vice versa) for the causal feature graph.
 *
 * Improvement: GSE builds a two-stage highlight pipeline for the clip workflow: off-the-shelf action detector producing noisy per-play event candidates from broadcast frames, denoised by a sequence model conditioned on nflverse play context.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the two-stage pipeline for the clip workflow only if on the 10-game test set the denoised pipeline achieves >=80% recall at >=60% precision on highlight plays AND beats the detector-alone baseline by >=20pp precision at matched recall.
 */

/** Discretize a series into nBins equal-width bins. */
export function discretize(s: readonly number[], nBins: number): number[] {
  if (nBins < 2) throw new Error("discretize: nBins >= 2");
  const mn = Math.min(...s);
  const mx = Math.max(...s);
  if (mx - mn < 1e-12) return s.map(() => 0);
  return s.map((v) => Math.min(nBins - 1, Math.floor(((v - mn) / (mx - mn)) * nBins)));
}

/**
 * Transfer entropy TE(X->Y) = sum p(y+, y, x) log [p(y+|y,x) / p(y+|y)]
 * on discretized series (natural log, nats).
 */
export function transferEntropy(
  x: readonly number[],
  y: readonly number[],
  nBins = 4,
): number {
  if (x.length !== y.length || x.length < 8) throw new Error("transferEntropy: need >= 8 points");
  const xd = discretize(x, nBins);
  const yd = discretize(y, nBins);
  const n = x.length - 1;
  const counts = new Map<string, number>();
  const key = (a: number, b: number, c: number) => `${a},${b},${c}`;
  for (let t = 0; t < n; t++) {
    const k = key(yd[t + 1]!, yd[t]!, xd[t]!);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  // Marginals
  const cYpY = new Map<string, number>();
  const cY = new Map<number, number>();
  const cYX = new Map<string, number>();
  for (const [k, c] of counts) {
    const [yp, yy, xx] = k.split(",").map(Number);
    const k1 = `${yp},${yy}`;
    const k2 = `${yy},${xx}`;
    cYpY.set(k1, (cYpY.get(k1) ?? 0) + c);
    cY.set(yy!, (cY.get(yy!) ?? 0) + c);
    cYX.set(k2, (cYX.get(k2) ?? 0) + c);
  }
  let te = 0;
  for (const [k, c] of counts) {
    const [yp, yy, xx] = k.split(",").map(Number);
    const pJoint = c / n;
    const pYpY = (counts.get(k) ?? 0) / (cYX.get(`${yy},${xx}`) ?? 1); // p(yp|y,x)
    void xx;
    const pYpYx = pJoint / ((cYX.get(`${yy},${xx}`) ?? 0) / n); // p(yp | y, x)
    const pYpY_ = ((cYpY.get(`${yp},${yy}`) ?? 0) / n) / ((cY.get(yy!) ?? 0) / n); // p(yp | y)
    void pYpY;
    if (pYpYx > 0 && pYpY_ > 0) te += pJoint * Math.log(pYpYx / pYpY_);
  }
  return Math.max(0, te);
}
