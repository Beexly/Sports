/**
 * arXiv:2602.23233v1 — The Counterfactual Combine: A Causal Framework for Player Evaluation
 *
 * Do-calculus engine for 'what if player X is out' queries: adjustment, front-door, and back-door estimands
 * compiled from the causal graph, with an identification check that refuses unidentified queries.
 *
 * Improvement: GSE evaluates kickers with TMLE causal standardization (direct standardization + above-random-replacement contrasts, 10-fold crossfit, 95% CIs), pricing kicker props and situational edges off the causal rate instead of raw FG%.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if the TMLE standardized kicker rate predicts held-out next-season FG% with RMSE >=10% lower than the raw empirical rate on the 2020-2024 -> 2025 window, AND >=80% of kickers' 95% CIs are well-behaved.
 */

/** Which identification strategy applies. */
export type IdentStrategy = "adjustment" | "frontdoor" | "backdoor" | "unidentified";

/**
 * Choose the identification strategy: adjustment if a valid adjustment set
 * exists (given), else front-door if a mediator chain exists (given), else
 * back-door, else unidentified.
 */
export function identifyStrategy(
  hasAdjustmentSet: boolean,
  hasMediator: boolean,
  hasBackdoorSet: boolean,
): IdentStrategy {
  if (hasAdjustmentSet) return "adjustment";
  if (hasMediator) return "frontdoor";
  if (hasBackdoorSet) return "backdoor";
  return "unidentified";
}

/**
 * Adjustment estimand: E[Y | do(T=t)] = sum_z E[Y | T=t, Z=z] P(Z=z).
 * condMeans[z][t] = E[Y|T=t,Z=z], pZ[z] = P(Z=z).
 */
export function adjustmentEstimand(
  condMeans: number[][],
  pZ: readonly number[],
  t: number,
): number {
  if (condMeans.length !== pZ.length) throw new Error("adjustmentEstimand: length mismatch");
  if (t < 0 || t >= (condMeans[0]?.length ?? 0)) throw new Error("adjustmentEstimand: t out of range");
  return condMeans.reduce((s, row, z) => s + (row[t] ?? 0) * (pZ[z] ?? 0), 0);
}

/**
 * Front-door estimand: sum_m P(M=m|T=t) sum_t' E[Y|M=m,T=t'] P(T=t').
 */
export function frontdoorEstimand(
  pMgivenT: number[][],
  condMeans: number[][],
  pT: readonly number[],
  t: number,
): number {
  if (pMgivenT.length === 0) throw new Error("frontdoorEstimand: empty");
  let total = 0;
  for (let m = 0; m < pMgivenT.length; m++) {
    let inner = 0;
    for (let tp = 0; tp < pT.length; tp++) {
      inner += (condMeans[m]?.[tp] ?? 0) * (pT[tp] ?? 0);
    }
    total += (pMgivenT[m]?.[t] ?? 0) * inner;
  }
  return total;
}

/** Refuse unidentified queries: throws unless the strategy is identified. */
export function requireIdentified(strategy: IdentStrategy): void {
  if (strategy === "unidentified") {
    throw new Error("requireIdentified: query is not identified from the graph — refusing estimate");
  }
}
