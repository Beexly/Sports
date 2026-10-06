// ============================================================
// Structured-output abstention: parlay leg-drop + injury-news nodes
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the
 * gate backtests (parlay ROI +5pp over >=300 slips; injury F1 >= 0.60 and
 * spread MAE -0.15) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1803.08355v2 — "Structured Output Learning with Abstention: Application to Accurate Opinion Prediction"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: structured outputs (trees/graphs) get a per-node
 * abstention option with learned costs (K_A for abstaining on a node,
 * K_{A_c} for its children); the greedy pre-image drops low-value nodes
 * before decoding, and the excess-risk bound (Thm. 1) says downstream
 * risk — not the fixed costs — is the real objective.
 *
 * IMPROVEMENT (from ledger): Two adaptations of structured output
 * learning with abstention: (A) Parlay/DFS leg-level abstention -- treat
 * a parlay slip or DFS lineup as a structured output (legs = nodes, slip
 * = root); per-leg calibrated edge estimates as g-hat, then a greedy
 * pre-image dropping legs with edge < K_A.stake-cost (v1, no kernel
 * machinery); a reject head per leg voids legs at cost c_A (modeled as
 * reduced-stake singles). (B) NLP injury-news pipeline -- sentence-level
 * classifier over beat-writer articles outputting (entity=player,
 * aspect=injury/practice-status, polarity=severity) with per-node
 * abstention; the abstention-aware sentence representation feeds the
 * weekly injury adjustment to the engine (v1: fine-tune small classifier
 * with reject head per node, tune K_A on 2025 articles vs official
 * injury reports). Improvement over the paper: learn the abstention
 * costs (K_A, K_{A_c}) end-to-end via Bayesian optimization against the
 * downstream objective (parlay ROI / downstream metric) instead of
 * hand-tuning -- the paper fixes costs a priori, but its own excess-risk
 * bound (Thm. 1) says downstream risk is the real objective.
 *
 * ACCEPTANCE GATE: ADOPT (A) leg-level abstention only if parlay backtest
 * ROI improves by >=5.0 pp per dollar staked vs all-legs baseline over >=300
 * settled slips (bootstrap p<0.05). ADOPT (B) the text pipeline only if
 * injury-signal F1 >= 0.60 vs official reports AND engine spread MAE
 * improves >=0.15 points on the covered games. Otherwise REJECT.
 */

// ---------------------------------------------------------------- (A) legs
export interface ParlayLeg {
  id: string;
  /** Calibrated per-leg edge estimate (g-hat), in units per unit staked. */
  edge: number;
  /** Stake cost of including the leg. */
  stakeCost: number;
}

export interface LegAbstentionCosts {
  /** K_A: abstention cost multiplier on the stake cost. */
  kA: number;
  /** c_A: cost of voiding a leg via the reject head (reduced-stake single). */
  cA: number;
}

/**
 * Greedy pre-image: drop legs with edge < K_A · stakeCost (v1, no kernel
 * machinery). Returns kept and dropped legs.
 */
export function greedyLegAbstention(
  legs: ParlayLeg[],
  costs: LegAbstentionCosts,
): { kept: ParlayLeg[]; dropped: ParlayLeg[] } {
  const kept: ParlayLeg[] = [];
  const dropped: ParlayLeg[] = [];
  for (const leg of legs) {
    if (leg.edge < costs.kA * leg.stakeCost) dropped.push(leg);
    else kept.push(leg);
  }
  return { kept, dropped };
}

/**
 * Per-leg reject head: void a leg at cost c_A (modeled as a reduced-stake
 * single) when the void improves the slip's expected value vs keeping it.
 */
export function rejectHeadVoids(
  legs: ParlayLeg[],
  costs: LegAbstentionCosts,
): { voided: ParlayLeg[]; kept: ParlayLeg[] } {
  const voided: ParlayLeg[] = [];
  const kept: ParlayLeg[] = [];
  for (const leg of legs) {
    // Void when the leg's edge is below the reject-head operating cost.
    if (leg.edge < costs.cA) voided.push(leg);
    else kept.push(leg);
  }
  return { voided, kept };
}

/**
 * Learn (K_A, c_A) end-to-end against the downstream objective: v1 uses
 * randomized search over a cost grid maximizing the caller-supplied
 * objective (e.g. parlay ROI on a validation slip set). The paper fixes
 * costs a priori; this learns them from downstream risk (Thm. 1).
 */
export function tuneAbstentionCosts(
  legs: ParlayLeg[],
  objective: (kept: ParlayLeg[], dropped: ParlayLeg[], costs: LegAbstentionCosts) => number,
  rand: () => number,
  trials = 64,
): { costs: LegAbstentionCosts; objective: number } {
  let best: { costs: LegAbstentionCosts; objective: number } = {
    costs: { kA: 0, cA: 0 },
    objective: -Infinity,
  };
  for (let t = 0; t < trials; t++) {
    const costs: LegAbstentionCosts = { kA: rand() * 2, cA: rand() * 0.5 };
    const { kept, dropped } = greedyLegAbstention(legs, costs);
    const obj = objective(kept, dropped, costs);
    if (obj > best.objective) best = { costs, objective: obj };
  }
  return best;
}

// ---------------------------------------------------------------- (B) nodes
export interface InjuryNode {
  player: string;
  aspect: "injury" | "practice-status";
  /** Severity polarity in [0,1] (0 = no concern, 1 = severe). */
  polarity: number;
  /** Classifier confidence in this node prediction. */
  confidence: number;
}

/**
 * Per-node abstention for the injury-news sentence classifier: abstain on
 * nodes whose confidence falls below the learned K_A threshold; the
 * abstention-aware sentence weight down-weights (not drops) abstained
 * nodes so the weekly injury adjustment degrades gracefully.
 */
export function injuryNodeAbstention(
  nodes: InjuryNode[],
  kA: number,
): { accepted: InjuryNode[]; abstained: InjuryNode[] } {
  const accepted: InjuryNode[] = [];
  const abstained: InjuryNode[] = [];
  for (const n of nodes) {
    if (n.confidence < kA) abstained.push(n);
    else accepted.push(n);
  }
  return { accepted, abstained };
}

/**
 * Abstention-aware sentence representation: mean severity over accepted
 * nodes plus a discounted (weight wAbstain) contribution from abstained
 * nodes. Feeds the weekly injury adjustment (v1).
 */
export function abstentionAwareInjurySignal(
  accepted: InjuryNode[],
  abstained: InjuryNode[],
  wAbstain = 0.25,
): number {
  const num =
    accepted.reduce((a, n) => a + n.polarity, 0) + wAbstain * abstained.reduce((a, n) => a + n.polarity, 0);
  const den = accepted.length + wAbstain * abstained.length;
  return den > 0 ? num / den : 0;
}

/** Gate (A) helper: ROI lift >= 5.0pp per dollar staked over >= 300 slips. */
export function legAbstentionGatePasses(roiLiftPp: number, nSlips: number, bootstrapP: number): boolean {
  return roiLiftPp >= 5.0 && nSlips >= 300 && bootstrapP < 0.05;
}

/** Gate (B) helper: injury F1 >= 0.60 AND spread MAE improves >= 0.15. */
export function injuryPipelineGatePasses(injuryF1: number, spreadMaeImprovement: number): boolean {
  return injuryF1 >= 0.6 && spreadMaeImprovement >= 0.15;
}
