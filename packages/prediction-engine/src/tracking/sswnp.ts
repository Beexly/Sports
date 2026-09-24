
export interface SswnpBatch {
  readonly clean: number[][][];
  readonly noisy: number[][][];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Duplicate a batch into clean + noise-augmented views (Gaussian noise, scale omega). */
export function noiseAugmentedViews(traj: readonly (readonly (readonly number[])[])[], omega: number, seed = 0x9e3779b9): SswnpBatch {
  if (!(omega >= 0)) throw new Error("sswnp: omega must be nonnegative");
  const rng = mulberry32(seed || 12345);
  const gauss = (): number => {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const noisy = traj.map((seq) => seq.map((frame) => frame.map((v) => v + omega * gauss())));
  return {
    clean: traj.map((seq) => seq.map((frame) => [...frame])),
    noisy,
  };
}

/** L_total = L_sup + lambda * L_ss. */
export function sswnpTotalLoss(lSup: number, lSs: number, lambda: number): number {
  if (!(lambda >= 0)) throw new Error("sswnp: lambda must be nonnegative");
  return lSup + lambda * lSs;
}

export interface OmegaTrial {
  readonly omega: number;
  readonly fdeClean: number;
  readonly fdeJitter: number;
}

/**
 * Validate omega in {0.01, 0.05, 0.1}: pick the omega with the smallest jitter
 * degradation (fdeJitter - fdeClean), tie-broken by clean FDE.
 */
export function selectOmega(trials: readonly OmegaTrial[]): number {
  if (trials.length === 0) throw new Error("sswnp: need >= 1 omega trial");
  const ranked = [...trials].sort(
    (a, b) => a.fdeJitter - a.fdeClean - (b.fdeJitter - b.fdeClean) || a.fdeClean - b.fdeClean,
  );
  return ranked[0]?.omega ?? 0.05;
}
