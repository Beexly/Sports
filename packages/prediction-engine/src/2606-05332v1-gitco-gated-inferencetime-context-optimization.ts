/**
 * arXiv:2606.05332v1 — GITCO: Gated Inference-Time Context Optimization in TSFMs
 *
 * Gate->Router->Critic->SMA serving wrapper around the frozen sports TSFM: the gate is trained on
 * leave-one-game-out influence labels, a regime-shift probe forces abstention on coaching/QB changes, and
 * the wrapper defaults to abstention (precision over recall).
 *
 * Improvement: Wrap GSE's frozen sports TSFM in a Gate->Router->Critic->SMA serving module: train the gate on leave-one-game-out influence labels (did removing game X improve the forecast?), add a regime-shift detector probe (coaching/QB change) that forces gate abstention so genuine regime changes are never smoothed, and default to abstention since gate precision > recall is the safe direction.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT as a default-on serving wrapper if the sports gate achieves ≥70% precision on 2022–2024 AND mean MASE reduction ≥1.5% with no season worse than baseline; keep it default-off if precision is 60–70%; REJECT if precision <60% or any season degrades.
 */

/** Serving decision for one forecast request. */
export type ServingDecision =
  | { action: "serve"; forecast: number; confidence: number }
  | { action: "abstain"; reason: string };

/** Gate inputs for one request. */
export interface GateInput {
  /** Gate score in [0,1]: P(this forecast helps). */
  gateScore: number;
  /** Regime-shift probe: true on coaching/QB change. */
  regimeShift: boolean;
  /** Base TSFM forecast. */
  forecast: number;
}

/**
 * Gate->Router->Critic->SMA: regime probe forces abstention; otherwise the
 * gate must clear the precision-first threshold (default 0.7).
 */
export function serveOrAbstain(inp: GateInput, threshold = 0.7): ServingDecision {
  if (inp.regimeShift) return { action: "abstain", reason: "regime-shift probe fired" };
  if (inp.gateScore < 0 || inp.gateScore > 1) throw new Error("serveOrAbstain: gateScore in [0,1]");
  if (inp.gateScore >= threshold) {
    return { action: "serve", forecast: inp.forecast, confidence: inp.gateScore };
  }
  return { action: "abstain", reason: "gate below precision threshold" };
}

/**
 * Leave-one-game-out influence label: did removing game x improve the
 * forecast? positive influence = helpful game (gate training label = 1).
 */
export function influenceLabel(errorWith: number, errorWithout: number): 0 | 1 {
  return errorWithout < errorWith ? 1 : 0;
}
