/**
 * arXiv:2609.33664 — HMM pass-blocking assignment and pocket survival.
 *
 * Frame-level hidden Markov model that assigns blockers to rushers.
 * ENABLED = false until tracking data and the Tuesday seal are wired.
 */
export const ENABLED = false;

export const ACCEPTANCE_GATE = {
  status: "UNEVALUATED_HUMAN_CALL_GATE",
  paperId: "arXiv:2609.33664",
  title: "HMM pass-blocking assignment and pocket survival",
  requiresLiveTracking2026: true,
  minStatePersistenceRho: 0.70,
  requiresBicImprovementOver1State: true,
  sealBoundary: "PRE_SEAL_TUESDAY_0400_CT_ONLY",
} as const;

export type PlayerFrame = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type Frame = {
  t: number;
  blockers: PlayerFrame[];
  rushers: PlayerFrame[];
};

/**
 * Posterior assignment probability gamma_it(j).
 * Shape: [numBlockers][numRushers].
 * Production implementation runs the forward-backward algorithm.
 */
export function gammaIt(frames: Frame[]): number[][] {
  if (!ENABLED || frames.length === 0) return [];
  const nB = frames[0].blockers.length;
  const nR = frames[0].rushers.length;
  // Placeholder: uniform assignment until the real HMM is trained
  const uniform = 1 / Math.max(nR, 1);
  return Array.from({ length: nB }, () => Array(nR).fill(uniform));
}

/**
 * Continuous-time adjusted plus-minus for each blocker.
 * Accounts for rusher quality and engagement length.
 */
export function adjustedPlusMinus(frames: Frame[]): Map<string, number> {
  const result = new Map<string, number>();
  if (!ENABLED || frames.length === 0) return result;
  for (const b of frames[0].blockers) {
    result.set(b.id, 0);
  }
  return result;
}

/**
 * Pocket survival probability past the given threshold (seconds).
 * Paper reference threshold is 2.5 s.
 */
export function pocketSurvival(frames: Frame[], thresholdSec = 2.5): number {
  if (!ENABLED || frames.length === 0) return 0;
  const lastT = frames[frames.length - 1].t;
  return lastT >= thresholdSec ? 1 : lastT / thresholdSec;
}
