
export const STAKE_MENU = [0, 0.25, 0.5, 1, 2] as const;

/**
 * Counterfactual penalty (paper Eq. 4): penalize agent i's deviation from the
 * historical stake, holding all other agents' stakes at their historical values.
 */
export function counterfactualPenalty(qDeviate: number, qHistorical: number, lambda: number): number {
  if (!(lambda >= 0)) throw new Error("cfcql-penalty: lambda must be nonnegative");
  return lambda * Math.max(0, qDeviate - qHistorical);
}

/** Per-agent CFCQL objective: squared TD error plus the counterfactual penalty. */
export function cfcqlAgentLoss(tdError: number, qDeviate: number, qHistorical: number, lambda: number): number {
  return tdError * tdError + counterfactualPenalty(qDeviate, qHistorical, lambda);
}

/** lambda_i proportional to 1/(number of bets), per the paper's scaling rule. */
export function lambdaPerAgent(nBets: number, baseLambda: number): number {
  if (!(nBets >= 1)) throw new Error("cfcql-penalty: nBets >= 1 required");
  return baseLambda / nBets;
}

/** Lower-bound diagnostic: penalized value must stay below the historical return. */
export function lowerBoundHolds(penalizedValue: number, historicalReturn: number): boolean {
  return penalizedValue <= historicalReturn;
}
