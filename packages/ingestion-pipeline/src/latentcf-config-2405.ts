/**
 * LatentCF counterfactual config: trajectory classifier + trajectory generator
 *
 * Research port: arXiv:2405.11802
 * Normalized lane: causal_injury | Doctrine: SITUATIONAL
 *
 * Config for the LatentCF port: (1) a Transformer classifier on NGS tracking predicting play success (route -> target & catch, or ball-carrier -> broken tackle) from joint/position trajectories; (2) a trajectory generator for counterfactuals. DTW-closeness and FMD evaluation helpers included.
 *
 * ACCEPTANCE GATE: Reproduce the paper's Table II on MultiSenseBadminton (public): LatentCF must beat 1NN-DTW on DTW-closeness and FMD by >=25% relative before the NGS port. Live-data gate -> GSE_LATENTCF_ENABLED flag (default false).
 */

export type PlaySuccessTask = "route_target_catch" | "broken_tackle";

export interface LatentCfConfig {
  task: PlaySuccessTask;
  trajectoryDim: number; // entities x coords per frame
  latentDim: number;
  sequenceLength: number;
}

export const DEFAULT_LATENTCF: LatentCfConfig = {
  task: "route_target_catch",
  trajectoryDim: 46, // 23 entities x 2 coords
  latentDim: 32,
  sequenceLength: 50, // 5s at 10 Hz
};

/** DTW distance between two 1-D sequences (dynamic programming). */
export function dtwDistance(a: number[], b: number[]): number {
  const n = a.length, m = b.length;
  if (n === 0 || m === 0) return Infinity;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const row0 = dp[0];
  if (row0 !== undefined) row0[0] = 0;
  for (let i = 1; i <= n; i++) {
    const dpi = dp[i];
    const dpi1 = dp[i - 1];
    if (dpi === undefined || dpi1 === undefined) continue;
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs((a[i - 1] ?? 0) - (b[j - 1] ?? 0));
      dpi[j] = cost + Math.min(dpi1[j] ?? Infinity, dpi[j - 1] ?? Infinity, dpi1[j - 1] ?? Infinity);
    }
  }
  return dp[n]?.[m] ?? Infinity;
}

/** Relative improvement of candidate over baseline (positive = better). */
export function relativeImprovement(baseline: number, candidate: number): number {
  if (baseline === 0) return candidate === 0 ? 0 : Infinity;
  return (baseline - candidate) / baseline;
}

/** Gate: >=25% relative improvement on BOTH DTW-closeness and FMD. */
export function latentcfGatePasses(
  dtwBaseline: number, dtwCandidate: number,
  fmdBaseline: number, fmdCandidate: number,
): boolean {
  return relativeImprovement(dtwBaseline, dtwCandidate) >= 0.25
    && relativeImprovement(fmdBaseline, fmdCandidate) >= 0.25;
}

/** Live-data gate: Table II reproduction before the NGS port. */
export const GSE_LATENTCF_ENABLED = false;

