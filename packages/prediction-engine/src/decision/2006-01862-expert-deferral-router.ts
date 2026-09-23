// ============================================================
// Model/expert/abstain deferral router (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the classifier-rejector is
 * trained on logged (x, y, m) triples (a training-system call), and
 * activation requires the gate (beats always-model and threshold routing
 * walk-forward, no biased under-deferral) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2006.01862 — "Consistent Estimators for Learning to Defer to an Expert"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: learning-to-defer trains a classifier and a rejector
 * jointly with a consistent surrogate loss (cost-sensitive generalized
 * cross-entropy): the rejector learns when the expert's prediction is more
 * reliable than the model's, minimizing system-level cost rather than
 * 0/1 error.
 *
 * IMPROVEMENT (from ledger): Build the GSE router: log triples (game
 * features x, graded outcome y, Garrett's lean / market-implied pick m) for
 * 1-2 seasons, train the classifier-rejector with the cost-sensitive
 * generalized cross-entropy surrogate in units (not 0/1), and deploy as a
 * pre-card routing step (model-pick, expert-pick, route decision; post the
 * routed pick), with a third route (abstain entirely) making it
 * model/expert/abstain.
 *
 * ACCEPTANCE GATE: ADAPT accepted if the router's system units beat both
 * always-model and confidence-threshold routing on walk-forward seasons AND
 * the per-subpopulation audit shows no biased under-deferral; else REJECT.
 */

export type Route = "model" | "expert" | "abstain";

export interface DeferralTriple {
  /** Model pick's realized unit P&L. */
  modelUnits: number;
  /** Expert (Garrett lean / market-implied) pick's realized unit P&L. */
  expertUnits: number;
}

/**
 * Cost-sensitive generalized cross-entropy surrogate in UNITS (not 0/1):
 * for the chosen route r with system cost c_r (negative units), the
 * surrogate is -(c_best - c_r) weighted by the rejector confidence.
 * Lower is better; the model route is the default (zero deferral cost).
 */
export function gceDeferralSurrogate(
  triple: DeferralTriple,
  route: Route,
  deferCostUnits = 0.02,
): number {
  const costs: Record<Route, number> = {
    model: -triple.modelUnits,
    expert: -triple.expertUnits + deferCostUnits, // deferral carries a small operating cost
    abstain: 0, // abstain banks 0 units
  };
  const best = Math.min(costs.model, costs.expert, costs.abstain);
  return costs[route] - best; // regret vs the oracle route, in units
}

/**
 * Pre-card routing step: given the rejector's scores, route to
 * model / expert / abstain. Abstain wins outright when its score clears
 * the abstain threshold; otherwise the higher of model/expert scores wins.
 */
export function routerDecision(
  modelScore: number,
  expertScore: number,
  abstainScore: number,
  abstainThreshold: number,
): Route {
  if (abstainScore >= abstainThreshold) return "abstain";
  return expertScore > modelScore ? "expert" : "model";
}

/** System units of a routed slate (what the gate compares walk-forward). */
export function routedSystemUnits(
  triples: DeferralTriple[],
  routes: Route[],
  deferCostUnits = 0.02,
): number {
  let acc = 0;
  for (let i = 0; i < triples.length; i++) {
    const r = routes[i]!;
    const t = triples[i]!;
    if (r === "model") acc += t.modelUnits;
    else if (r === "expert") acc += t.expertUnits - deferCostUnits;
  }
  return acc;
}

export interface SubpopulationAudit {
  group: string;
  deferralRate: number;
  expertWinRateWhenDeferred: number;
  n: number;
}

/**
 * Per-subpopulation audit: flag biased under-deferral — a group where the
 * router defers less often than average AND the expert was right more often
 * than average when it did defer (the router is under-using the expert
 * there). Returns flagged group names.
 */
export function deferralBiasAudit(
  audits: SubpopulationAudit[],
  rateTolerance = 0.05,
): string[] {
  if (audits.length === 0) return [];
  const avgRate = audits.reduce((a, x) => a + x.deferralRate, 0) / audits.length;
  const avgExpertWin = audits.reduce((a, x) => a + x.expertWinRateWhenDeferred, 0) / audits.length;
  return audits
    .filter(
      (x) =>
        x.deferralRate < avgRate - rateTolerance && x.expertWinRateWhenDeferred > avgExpertWin,
    )
    .map((x) => x.group);
}

/** Gate helper: beats always-model AND threshold routing, with a clean audit. */
export function deferralRouterGatePasses(
  routerUnits: number,
  alwaysModelUnits: number,
  thresholdUnits: number,
  biasedGroups: string[],
): boolean {
  return routerUnits > alwaysModelUnits && routerUnits > thresholdUnits && biasedGroups.length === 0;
}
