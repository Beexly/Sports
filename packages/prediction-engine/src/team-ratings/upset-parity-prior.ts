
/** Logistic upset prior: 0.5 at pick'em, decaying with eloDiff. */
export function upsetParityPrior(eloDiff: number, scale = 120): number {
  if (!(scale > 0)) throw new Error("upset-parity-prior: scale must be positive");
  return 1 / (1 + Math.exp(Math.max(eloDiff, 0) / scale));
}

/** Shrink a model's upset probability toward the parity prior. */
export function shrinkToParity(modelUpsetProb: number, eloDiff: number, weight = 0.25, scale = 120): number {
  if (!(weight >= 0 && weight <= 1)) throw new Error("upset-parity-prior: weight in [0,1] required");
  const prior = upsetParityPrior(eloDiff, scale);
  const m = Math.min(Math.max(modelUpsetProb, 0), 1);
  return (1 - weight) * m + weight * prior;
}

/** Expected upsets on a slate under the parity prior. */
export function expectedUpsets(eloDiffs: readonly number[], scale = 120): number {
  return eloDiffs.reduce((s, d) => s + upsetParityPrior(d, scale), 0);
}
