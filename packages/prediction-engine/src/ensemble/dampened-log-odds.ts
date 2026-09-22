
function logit(p: number): number {
  const pc = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  return Math.log(pc / (1 - pc));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Dampened log-odds combination. */
export function dampenedLogOddsCombine(probs: readonly number[], damping = 0.8): number {
  if (probs.length === 0) throw new Error("dampened-log-odds: need >= 1 probability");
  if (!(damping > 0 && damping <= 1)) throw new Error("dampened-log-odds: damping in (0,1] required");
  const meanLogit = probs.reduce((s, p) => s + logit(p), 0) / probs.length;
  return sigmoid(damping * meanLogit);
}

/** Sweep damping on validation log-loss; returns the best damping. */
export function tuneDamping(
  memberProbs: ReadonlyArray<readonly number[]>,
  outcomes: readonly number[],
  candidates: readonly number[],
): number {
  if (memberProbs.length !== outcomes.length || memberProbs.length === 0) {
    throw new Error("dampened-log-odds: aligned non-empty validation data required");
  }
  if (candidates.length === 0) throw new Error("dampened-log-odds: need >= 1 candidate");
  const logLoss = (d: number): number => {
    let total = 0;
    for (let i = 0; i < memberProbs.length; i++) {
      const p = dampenedLogOddsCombine(memberProbs[i] ?? [], d);
      const y = outcomes[i] ?? 0;
      total -= y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12));
    }
    return total / memberProbs.length;
  };
  return candidates.reduce((best, d) => (logLoss(d) < logLoss(best) ? d : best));
}
