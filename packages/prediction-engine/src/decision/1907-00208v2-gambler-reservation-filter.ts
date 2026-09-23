// ============================================================
// Deep Gamblers reservation head (post-hoc publish filter)
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the reservation head is
 * trained with the gambler loss below (a training-system call), and
 * activation requires the gate (>=2pp ROI, >=60% retention) to pass, plus
 * a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1907.00208v2 — "Deep Gamblers: Learning to Abstain with Portfolio Theory"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: add one extra "reservation" output neuron m+1 and train
 * with the gambler loss -log(p_true · o + p_reserve): the network learns to
 * shift mass to the reservation when it cannot confidently name the true
 * class, where o is the payoff odds for a correct prediction. At decision
 * time, withhold (abstain) when p_reserve dominates the class outputs.
 *
 * IMPROVEMENT (from ledger): Add a reservation head to the pick classifier
 * (one extra output neuron, gambler loss log(p_true*o + p_reserve)) as a
 * post-hoc publish filter: withhold any pick where p_reserve >= max class
 * probability, sweeping the reward o by ROI on retained picks.
 *
 * ACCEPTANCE GATE: ADOPT the filter iff, on the time-ordered test window,
 * retained-picks ROI exceeds the all-picks baseline ROI by >= 2 percentage
 * points AND retention >= 60% (it must not achieve ROI by abstaining on
 * nearly everything).
 */

export interface GamblerOutputs {
  /** Class probabilities (cover / no-cover / push, etc.). */
  classProbs: number[];
  /** Reservation output p_reserve. */
  pReserve: number;
}

/**
 * Gambler loss: -log(p_true · o + p_reserve). Higher reward o makes the
 * reservation relatively more attractive (the paper's risk dial).
 */
export function gamblerLoss(pTrue: number, pReserve: number, reward: number): number {
  const pT = Math.min(Math.max(pTrue, 1e-12), 1);
  const pR = Math.min(Math.max(pReserve, 0), 1 - 1e-12);
  return -Math.log(pT * reward + pR);
}

/** Publish filter: withhold the pick when p_reserve >= max class probability. */
export function gamblerWithhold(outputs: GamblerOutputs): boolean {
  const best = Math.max(...outputs.classProbs, 0);
  return outputs.pReserve >= best;
}

/** Apply the reservation filter over a slate of picks. */
export function gamblerFilterSlates(
  slates: GamblerOutputs[],
): { retainedIdx: number[]; withheldIdx: number[]; retention: number } {
  const retainedIdx: number[] = [];
  const withheldIdx: number[] = [];
  slates.forEach((o, i) => {
    if (gamblerWithhold(o)) withheldIdx.push(i);
    else retainedIdx.push(i);
  });
  return {
    retainedIdx,
    withheldIdx,
    retention: slates.length > 0 ? retainedIdx.length / slates.length : 0,
  };
}

/**
 * Sweep the reward o by retained-picks ROI: for each candidate reward,
 * simulate reservation mass p_reserve(o) via the loss-optimal response
 * (reservation grows as reward falls) on synthetic head outputs, and pick
 * the reward maximizing retained ROI subject to retention >= 0.6.
 *
 * NOTE: this is the post-hoc sweep harness. The reservation head itself is
 * trained by the training system; here we model its response curve so the
 * sweep logic is testable without a trained network.
 */
export function sweepReward(
  baseOutputs: { classProbs: number[]; trueClassProb: number }[],
  rewards: number[],
  minRetention = 0.6,
): { reward: number; retainedRoi: number; retention: number } {
  let best = { reward: rewards[0] ?? 1, retainedRoi: -Infinity, retention: 0 };
  for (const o of rewards) {
    // Model of the trained head's response: p_reserve = clip(1 - p_true·o, 0, 1)·0.5.
    const outs: GamblerOutputs[] = baseOutputs.map((b) => ({
      classProbs: b.classProbs,
      pReserve: Math.min(Math.max(1 - b.trueClassProb * o, 0), 1) * 0.5,
    }));
    const { retainedIdx, retention } = gamblerFilterSlates(outs);
    if (retention < minRetention || retainedIdx.length === 0) continue;
    // Retained ROI proxy: mean (trueClassProb·2 - 1) at -110-ish pricing.
    const roi =
      retainedIdx.reduce((a, i) => a + (baseOutputs[i]!.trueClassProb * 2 - 1), 0) / retainedIdx.length;
    if (roi > best.retainedRoi) best = { reward: o, retainedRoi: roi, retention };
  }
  return best;
}

/** Gate helper: retained ROI beats all-picks ROI by >= 2pp AND retention >= 60%. */
export function gamblerGatePasses(
  retainedRoi: number,
  allPicksRoi: number,
  retention: number,
): boolean {
  return retainedRoi - allPicksRoi >= 0.02 && retention >= 0.6;
}
