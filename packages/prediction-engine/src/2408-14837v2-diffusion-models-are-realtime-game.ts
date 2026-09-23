/**
 * arXiv:2408.14837v2 — Diffusion Models Are Real-Time Game Engines
 *
 * Conditioning noise augmentation as a mandatory stabilizer for autoregressive game simulators:
 * hierarchical conditioning (short play window + compressed drive-level summary) with injected conditioning
 * noise; judged by the 64-play divergence curve. Needs simulator weights, so the mechanism (augmentation +
 *
 * Improvement: Make conditioning noise augmentation a mandatory training stabilizer for all GSE autoregressive game simulators, with hierarchical conditioning (short play window plus a compressed drive-level summary vector) so score/timeout/field-position state persists without lengthening the attention window.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT conditioning noise augmentation as a mandatory training stabilizer for ALL GSE autoregressive simulators if it flattens the 64-play divergence curve by ≥30% vs baseline on 2024 held-out games.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Hierarchical conditioning state: play window + drive summary. */
export interface SimState {
  /** Recent play embeddings (short window). */
  playWindow: number[];
  /** Compressed drive-level summary vector. */
  driveSummary: number[];
}

/**
 * Conditioning noise augmentation: add Gaussian noise to the conditioning
 * vectors during training so the simulator cannot memorize exact states.
 */
export function augmentConditioning(
  state: SimState,
  noiseScale: number,
  rand: () => number,
): SimState {
  const gauss = () => {
    const u1 = Math.max(1e-12, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  return {
    playWindow: state.playWindow.map((v) => v + noiseScale * gauss()),
    driveSummary: state.driveSummary.map((v) => v + noiseScale * gauss()),
  };
}

/**
 * 64-play divergence curve: mean L2 distance between simulated and reference
 * trajectories at each rollout step; flattening vs baseline is the gate.
 */
export function divergenceCurve(
  simulated: readonly number[][],
  reference: readonly number[][],
): number[] {
  if (simulated.length !== reference.length) throw new Error("divergenceCurve: length mismatch");
  return simulated.map((simStep, t) => {
    const refStep = reference[t] ?? [];
    const d = simStep.reduce((s, v, i) => s + ((v - (refStep[i] ?? 0)) ** 2), 0);
    return Math.sqrt(d);
  });
}

/** Relative flattening of the augmented curve vs baseline at the final step. */
export function divergenceImprovement(augmented: readonly number[], baseline: readonly number[]): number {
  const a = augmented[augmented.length - 1] ?? 0;
  const b = baseline[baseline.length - 1] ?? 0;
  if (b <= 0) throw new Error("divergenceImprovement: baseline > 0");
  return (b - a) / b;
}
