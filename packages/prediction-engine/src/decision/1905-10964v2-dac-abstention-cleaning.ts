// ============================================================
// DAC abstention: abstain-to-clean training + unreliable-game detector
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the DAC-variant training is a
 * training-system call, and activation requires the gate (Brier -0.003 at
 * <=25% abstention, no sample destruction) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1905.10964v2 — "Combating Label Noise in Deep Learning Using Abstention"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: add a (k+1)-th abstention output to the classifier and
 * train with the DAC loss, which lets the network abstain on noisy/ambiguous
 * samples instead of fitting their (possibly wrong) labels; dropping the
 * abstained samples and retraining on the cleaner set improves the final
 * model, and the abstained set itself is an interpretable "unreliable
 * sample" detector.
 *
 * IMPROVEMENT (from ledger): Train a DAC-style variant of the GSE pick
 * model with a k+1 abstention head on noisy-ish targets, drop the games it
 * abstains on at the best clean-validation checkpoint, retrain the
 * production model on the cleaner set, and reuse the abstained set as an
 * interpretable 'unreliable game' detector for the write-up pipeline.
 *
 * ACCEPTANCE GATE: ADAPT if the post-cleaning retrained model beats the
 * all-data baseline on test Brier by >=0.003 with the abstained fraction
 * <=25% of training games; reject if the gain is <0.003 or cleaning removes
 * >40% of games (sample destruction).
 */

export interface DacOutputs {
  /** P(class) for the k real classes. */
  classProbs: number[];
  /** P(abstain): the (k+1)-th head. */
  pAbstain: number;
}

/**
 * DAC loss for one sample: -log(p_true + p_abstain) + alpha * p_abstain-ish
 * penalty. The paper's form: L = -log(p_y + p_{k+1}) - alpha·log(1 - p_{k+1})
 * is used in the 2104.08281v1 module; here the canonical DAC form from the
 * paper: -log(p_true + p_abstain) + alpha · p_abstain (linear abstention
 * penalty encouraging abstention only when it helps).
 */
export function dacLoss(pTrue: number, pAbstain: number, alpha: number): number {
  const pT = Math.min(Math.max(pTrue, 1e-12), 1);
  const pA = Math.min(Math.max(pAbstain, 0), 1 - 1e-12);
  return -Math.log(pT + pA) + alpha * pA;
}

/** Abstention rule: abstain when the abstention head dominates the best class (ties abstain: the safe default for a cleaning pipeline). */
export function dacAbstain(outputs: DacOutputs): boolean {
  const bestClass = Math.max(...outputs.classProbs, 0);
  return outputs.pAbstain >= bestClass;
}

export interface DacCleanResult {
  cleanIdx: number[];
  abstainedIdx: number[];
  abstentionRate: number;
}

/**
 * Abstain-to-clean: run the abstention rule over the training games,
 * returning clean/abstained index sets for the retrain step.
 */
export function dacCleanDataset(outputs: DacOutputs[]): DacCleanResult {
  const cleanIdx: number[] = [];
  const abstainedIdx: number[] = [];
  outputs.forEach((o, i) => {
    if (dacAbstain(o)) abstainedIdx.push(i);
    else cleanIdx.push(i);
  });
  return {
    cleanIdx,
    abstainedIdx,
    abstentionRate: outputs.length > 0 ? abstainedIdx.length / outputs.length : 0,
  };
}

/** Brier score of probability forecasts against binary outcomes. */
export function brierScore(probs: number[], outcomes: boolean[]): number {
  const n = Math.min(probs.length, outcomes.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const y = outcomes[i]! ? 1 : 0;
    acc += (probs[i]! - y) * (probs[i]! - y);
  }
  return acc / n;
}

/**
 * Interpretable 'unreliable game' detector for the write-up pipeline:
 * abstained games annotated with the abstention confidence and the top
 * competing class (why the model found the game unreliable).
 */
export function unreliableGameReport(
  gameIds: string[],
  outputs: DacOutputs[],
  classNames: string[],
): { gameId: string; pAbstain: number; topClass: string; topClassProb: number }[] {
  const report: { gameId: string; pAbstain: number; topClass: string; topClassProb: number }[] = [];
  outputs.forEach((o, i) => {
    if (!dacAbstain(o)) return;
    let top = 0;
    o.classProbs.forEach((p, c) => {
      if (p > (o.classProbs[top] ?? 0)) top = c;
    });
    report.push({
      gameId: gameIds[i] ?? `game-${i}`,
      pAbstain: o.pAbstain,
      topClass: classNames[top] ?? `class-${top}`,
      topClassProb: o.classProbs[top] ?? 0,
    });
  });
  return report;
}

/**
 * Gate helper: Brier gain >= 0.003 with abstention <= 25%; hard reject when
 * cleaning removes > 40% (sample destruction).
 */
export function dacGatePasses(brierGain: number, abstentionRate: number): boolean {
  if (abstentionRate > 0.4) return false; // sample destruction: hard reject
  return brierGain >= 0.003 && abstentionRate <= 0.25;
}
