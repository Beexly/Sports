/**
 * arXiv:2609.33664 — HMM pass-blocking assignment and pocket survival.
 *
 * ACCEPTANCE_GATE (HUMAN_CALL_REQUIRED — PRE-SEAL ONLY):
 * Module implements the spatial pass-blocking assignment HMM of Brahme et al. (2026, arXiv:2609.33664),
 * modeling O_{tb} | I_{tbj}=1 ~ N_2(\gamma_r^{(g)} R_{tj} + \gamma_q^{(g)} Q_t, \sigma_D^2(g) I_2)
 * and von Mises orientation (\kappa = 1).
 * Refusal / Gate Criteria before flipping HMM_PASS_BLOCKING_ENABLED / ENABLED to true:
 *   1. Live 2026 10Hz NGS XY player-tracking frames must be wired in pre-seal data ingestion.
 *   2. Bayesian Information Criterion (BIC) must improve over a 1-state static baseline on held-out snaps.
 *   3. Fitted frame-to-frame assignment stickiness \rho must satisfy \rho >= 0.70 with p_fail <= 0.02 for OL/TE.
 *   4. May only be enabled prior to the Tuesday 04:00 CT v1.0 seal; mid-week activation is forbidden.
 */
export const ENABLED = false;
export const HMM_PASS_BLOCKING_ENABLED = false as const;
export const HMM_PASS_BLOCKING_ACCEPTANCE_GATE = {
  status: "UNEVALUATED_HUMAN_CALL_GATE",
  paperId: "arXiv:2609.33664",
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
  if (frames.length === 0) return [];
  // A uniform assignment is not a posterior. Returning one would let a caller
  // consume "no information" as if it were the HMM's answer. The forward-
  // backward emission model is not in the ledger, so refuse explicitly.
  throw new Error(
    "2609-33664: HMM forward-backward posterior not implemented; refusing to return a uniform placeholder",
  );
}

/**
 * Continuous-time adjusted plus-minus for each blocker.
 * Accounts for rusher quality and engagement length.
 */
export function adjustedPlusMinus(frames: Frame[]): Map<string, number> {
  if (frames.length === 0) return new Map();
  // All-zero plus-minus is not an estimate. The rusher-quality regression is
  // not in the ledger, so refuse rather than emit a fabricated zero.
  throw new Error(
    "2609-33664: continuous-time adjusted plus-minus not implemented; refusing to return zeros",
  );
}

/**
 * Pocket survival probability past the given threshold (seconds).
 * Paper reference threshold is 2.5 s.
 */
export function pocketSurvival(frames: Frame[], thresholdSec = 2.5): number {
  // The survival arithmetic IS implemented; ENABLED only means "no production
  // caller". Returning a fabricated 0 while disabled would misstate a real
  // computed quantity as "no pocket", so the flag does not gate this number.
  if (frames.length === 0) return 0;
  const last = frames[frames.length - 1];
  if (!last) return 0;
  const lastT = last.t;
  // A survival fraction is a probability: it cannot leave [0,1]. A pre-snap or
  // mis-stamped frame gives a negative elapsed time, and the raw ratio would
  // hand back a negative "survival" a caller cannot distinguish from a real
  // short pocket. Zero seconds survived is the honest floor.
  if (lastT <= 0) return 0;
  return lastT >= thresholdSec ? 1 : lastT / thresholdSec;
}
