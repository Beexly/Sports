/**
 * FANTASY DISCOVERY LAYER — Fantasy Experiment Governor (Invention F19).
 *
 * Ranks which fantasy study to run next by Expected Discovery Yield — value = decisions changed +
 * causal certainty + compression + gates unlocked − false-confidence risk, per unit of data cost,
 * rights risk, engineering time, and operational complexity. The autonomy layer: it asks "what
 * study most changes what we can responsibly decide?", not "what data can we get?" Pure + deterministic.
 */

export type FantasyStudy =
  | "waiver_lag" | "dfs_salary_lag" | "route_rate_breakout" | "box_score_fraud" | "dynasty_sentiment_gap"
  | "bestball_adp_lag" | "platform_projection_lag" | "analyst_ranking_inertia" | "manager_dna" | "injury_role_mass_transfer";

export interface FantasyExperimentInputs {
  readonly id: string;
  readonly study?: FantasyStudy;
  readonly deltaDecisionsChanged: number;
  readonly deltaCausalCertainty: number;
  readonly deltaCompression: number;
  readonly deltaGateUnlockProbability: number;
  readonly deltaFalseConfidenceRisk: number;
  readonly dataCost: number;
  readonly rightsRisk: number;
  readonly engineeringTime: number;
  readonly operationalComplexity: number;
}

export interface FantasyExperimentResult {
  readonly id: string;
  readonly yield: number;
  readonly note: string;
}

export function computeFantasyExperimentYield(i: FantasyExperimentInputs): FantasyExperimentResult {
  const gain = i.deltaDecisionsChanged + i.deltaCausalCertainty + i.deltaCompression + i.deltaGateUnlockProbability - i.deltaFalseConfidenceRisk;
  const denom = 1 + i.dataCost + i.rightsRisk + i.engineeringTime + i.operationalComplexity;
  const y = gain / denom;
  return {
    id: i.id,
    yield: Number(y.toFixed(4)),
    note: y <= 0 ? "Net-negative discovery yield — do not spend." : `Positive yield: buys decision-relevant knowledge per unit cost (${y.toFixed(3)}).`,
  };
}

/** Rank fantasy experiments by Expected Discovery Yield, best-first. */
export function rankFantasyExperiments(items: readonly FantasyExperimentInputs[]): FantasyExperimentResult[] {
  return items.map(computeFantasyExperimentYield).sort((a, b) => b.yield - a.yield);
}
