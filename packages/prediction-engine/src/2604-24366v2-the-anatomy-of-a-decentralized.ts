/**
 * arXiv:2604.24366v2 — The Anatomy of a Decentralized Prediction Market: Microstructure Evidence from the Polymarket Order Book
 *
 * One-pass covariate-shift detection for the production feature pipeline: an online MMD witness built from
 * random Fourier features flags drift between training and live features and triggers a model refresh.
 *
 * Improvement: Port the CLOB-to-on-chain join pipeline to replicate the eight stylized facts on NFL/CFB Polymarket markets; build a longshot spread-premium curve by sport to downweight wide-spread market prices in GSE's signal fusion; adopt the wash-share lower-bound detector as a market-quality filter before trusting any venue's volume figures.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the sports-only replication and the spread-premium signal-weighting if direction-agreement and stylized facts replicate within sampling noise.
 */

/** Random Fourier feature map (deterministic via the provided rng). */
export function rffMap(
  x: readonly number[],
  W: readonly (readonly number[])[],
  b: readonly number[],
): number[] {
  if (W.length !== b.length) throw new Error("rffMap: W/b mismatch");
  return W.map((w, i) => {
    if (w.length !== x.length) throw new Error("rffMap: dim mismatch");
    const z = w.reduce((s, wij, j) => s + wij * (x[j] ?? 0), 0) + (b[i] ?? 0);
    return Math.SQRT2 * Math.cos(z);
  });
}

/** Draw a random Fourier matrix (Gaussian) deterministically. */
export function drawRffParams(
  dim: number,
  nFeatures: number,
  rng: () => number,
  gamma = 1,
): { W: number[][]; b: number[] } {
  // Box-Muller from the uniform rng
  const gauss = (): number => {
    const u1 = Math.max(1e-12, rng());
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const W = Array.from({ length: nFeatures }, () =>
    Array.from({ length: dim }, () => gauss() * Math.sqrt(2 * gamma)),
  );
  const b = Array.from({ length: nFeatures }, () => rng() * 2 * Math.PI);
  return { W, b };
}

/** Online mean embeddings for train and live streams. */
export function updateMeanEmbedding(
  mean: readonly number[],
  n: number,
  phi: readonly number[],
): { mean: number[]; n: number } {
  if (mean.length !== phi.length) throw new Error("updateMeanEmbedding: dim mismatch");
  const n2 = n + 1;
  return { mean: mean.map((m, i) => m + ((phi[i] ?? 0) - m) / n2), n: n2 };
}

/**
 * MMD witness statistic: squared distance between mean embeddings.
 * Drift fires when it exceeds the threshold.
 */
export function mmdWitness(
  meanTrain: readonly number[],
  meanLive: readonly number[],
  threshold: number,
): { stat: number; drift: boolean } {
  if (meanTrain.length !== meanLive.length) throw new Error("mmdWitness: dim mismatch");
  const stat = meanTrain.reduce((s, m, i) => s + ((meanLive[i] ?? 0) - m) ** 2, 0);
  return { stat, drift: stat > threshold };
}
