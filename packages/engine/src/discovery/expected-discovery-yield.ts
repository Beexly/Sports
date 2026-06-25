/**
 * DISCOVERY LAYER — Expected Discovery Yield Governor (Invention 26).
 *
 * The autonomy layer. The system does not ask "what data can we get?" — it asks "what data would
 * change a decision, unlock a gate, or kill a false theory?" Information is valuable only if it
 * changes what the system can responsibly know, refuse, price, or publish (a prediction-oriented
 * active-learning stance, not parameter-uncertainty reduction).
 *
 *   EDY = E(Δpredictive_information + Δcausal_certainty + Δcompression + Δtradability_certainty
 *         + Δgate_unlock_probability − Δfalse_confidence_risk)
 *         ÷ (data_cost + rights_risk + engineering_time + operational_complexity)
 *
 * This is the research governor — autonomous without being reckless. Pure + deterministic.
 */

export interface DiscoveryYieldInputs {
  readonly id: string;
  readonly deltaPredictiveInformation: number;
  readonly deltaCausalCertainty: number;
  readonly deltaCompression: number;
  readonly deltaTradabilityCertainty: number;
  readonly deltaGateUnlockProbability: number;
  readonly deltaFalseConfidenceRisk: number;
  readonly dataCost: number; // normalized
  readonly rightsRisk: number;
  readonly engineeringTime: number; // normalized
  readonly operationalComplexity: number;
}

export interface DiscoveryYieldResult {
  readonly id: string;
  readonly edy: number;
  readonly note: string;
}

export function computeEDY(i: DiscoveryYieldInputs): DiscoveryYieldResult {
  const gain =
    i.deltaPredictiveInformation + i.deltaCausalCertainty + i.deltaCompression +
    i.deltaTradabilityCertainty + i.deltaGateUnlockProbability - i.deltaFalseConfidenceRisk;
  const denom = 1 + i.dataCost + i.rightsRisk + i.engineeringTime + i.operationalComplexity;
  const edy = gain / denom;
  return {
    id: i.id,
    edy: Number(edy.toFixed(4)),
    note: edy <= 0 ? "Net-negative discovery yield — do not spend." : `Positive yield: buys knowledge per unit cost (${edy.toFixed(3)}).`,
  };
}

/** Rank experiments by Expected Discovery Yield, best-first. */
export function rankByEDY(items: readonly DiscoveryYieldInputs[]): DiscoveryYieldResult[] {
  return items.map(computeEDY).sort((a, b) => b.edy - a.edy);
}
