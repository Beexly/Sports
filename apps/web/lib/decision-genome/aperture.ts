/**
 * ApertureStateMachine — Signal / Shadow / Wait / Pass / Quarantine.
 *
 * Decision Genome build step E. The aperture does not create reality; it narrows noise
 * until signal is visible. Raw chaos enters wide (odds, injuries, rumors, models, user
 * behaviour) and is constricted through truth, time, market, decision, proof, and
 * protection gates. The output is one of five honest states — and refusal (Pass /
 * Quarantine) is a product advantage, not a lack of picks.
 *
 * Deterministic and pure. Given the same genome layers it always returns the same state,
 * the deciding gate, and human-readable reasons. Thresholds are explicit and overridable.
 */

import type { ComplianceState, EvidenceState, MarketState, ModelState } from "./decision-genome";

export type ApertureState = "signal" | "shadow" | "wait" | "pass" | "quarantine";

export interface ApertureThresholds {
  /** Min calibration health (0–1) to allow a Signal. */
  readonly minCalibrationHealth: number;
  /** Max uncertainty-band width (high−low) to allow a Signal. */
  readonly maxUncertaintyWidth: number;
  /** Min edge (modeled prob − devig fair prob) to be actionable. */
  readonly minEdge: number;
  /** Min independent sources to allow a Signal. */
  readonly minIndependentSources: number;
  /** Max evidence age (minutes) to allow a Signal. */
  readonly maxFreshnessMinutes: number;
}

export const DEFAULT_APERTURE_THRESHOLDS: ApertureThresholds = {
  minCalibrationHealth: 0.5,
  maxUncertaintyWidth: 0.35,
  minEdge: 0.02,
  minIndependentSources: 2,
  maxFreshnessMinutes: 120,
};

/** The genome layers the aperture reasons over (computed before the genome is assembled). */
export interface ApertureInput {
  readonly market: MarketState;
  readonly evidence: EvidenceState;
  readonly model: ModelState;
  readonly compliance: ComplianceState;
}

export interface ApertureEvaluation {
  readonly state: ApertureState;
  /** The gate that decided the (most restrictive) state. */
  readonly decidedBy: string;
  readonly reasons: readonly string[];
  /** The modeled edge over the devigged market (when computable). */
  readonly edge: number | null;
}

/** Restrictiveness ordering — higher index = more restrictive. */
const ORDER: readonly ApertureState[] = ["signal", "shadow", "wait", "pass", "quarantine"];
const rank = (s: ApertureState): number => ORDER.indexOf(s);

/**
 * Evaluate the aperture. Hard safety failures quarantine terminally; otherwise the
 * machine downgrades from an optimistic Signal through the truth/time/market/uncertainty
 * /availability gates and reports the most restrictive verdict with reasons.
 */
export function evaluateAperture(
  input: ApertureInput,
  thresholds: ApertureThresholds = DEFAULT_APERTURE_THRESHOLDS,
): ApertureEvaluation {
  const { market, evidence, model, compliance } = input;
  const reasons: string[] = [];

  // ── Hard safety gate → QUARANTINE (terminal). ──
  const unsafe: string[] = [];
  if (!compliance.rightsCleared) unsafe.push("rights not cleared");
  if (!compliance.languageClean) unsafe.push("banned language present");
  if (!compliance.contestBoundaryRespected) unsafe.push("contest/sweepstakes boundary breached");
  if (!evidence.rightsCleared) unsafe.push("evidence rights not cleared");
  if (evidence.rumorQuarantined) unsafe.push("evidence is rumor-quarantined");
  if (!evidence.permissions.decisionUse) unsafe.push("evidence not cleared for decision use");
  if (unsafe.length > 0) {
    return {
      state: "quarantine",
      decidedBy: "safety-gate",
      reasons: unsafe.map((u) => `Quarantined: ${u}.`),
      edge: computeEdge(model, market),
    };
  }

  let state: ApertureState = "signal";
  let decidedBy = "edge-gate";
  const downgrade = (to: ApertureState, by: string, why: string) => {
    reasons.push(why);
    if (rank(to) > rank(state)) {
      state = to;
      decidedBy = by;
    }
  };

  // ── Model refusal → PASS (restraint is the decision). ──
  if (model.refused) {
    downgrade("pass", "refusal-gate", "Model abstained (conformal refusal). No action is the edge.");
  }

  const edge = computeEdge(model, market);

  // ── Edge gate: is there a reachable edge at all? ──
  if (edge == null) {
    downgrade("shadow", "edge-gate", "No devigged fair probability to measure edge against.");
  } else if (edge < thresholds.minEdge) {
    downgrade("pass", "edge-gate", `Edge ${(edge * 100).toFixed(1)}pp below the ${(thresholds.minEdge * 100).toFixed(1)}pp action floor.`);
  }

  // ── Availability gate: theatrical edge → WAIT (may become reachable). ──
  if (!market.userAvailable) {
    downgrade("wait", "availability-gate", "Number is not user-reachable (limits/jurisdiction/delay). Edge is theatrical for now.");
  }

  // ── Truth gate: thin/stale/conflicting evidence → SHADOW. ──
  if (evidence.conflict) {
    downgrade("shadow", "truth-gate", "Sources materially conflict. Not clean enough to act.");
  }
  if (evidence.independentSources < thresholds.minIndependentSources) {
    downgrade("shadow", "truth-gate", `Only ${evidence.independentSources} independent source(s); need ${thresholds.minIndependentSources}.`);
  }
  if (evidence.freshnessAgeMinutes != null && evidence.freshnessAgeMinutes > thresholds.maxFreshnessMinutes) {
    downgrade("wait", "time-gate", `Evidence is ${evidence.freshnessAgeMinutes}m old (max ${thresholds.maxFreshnessMinutes}m). Refresh before acting.`);
  }

  // ── Uncertainty gate: low calibration / wide band → SHADOW. ──
  const bandWidth = model.uncertaintyBand.high - model.uncertaintyBand.low;
  if (model.calibrationHealth < thresholds.minCalibrationHealth) {
    downgrade("shadow", "uncertainty-gate", `Calibration health ${model.calibrationHealth.toFixed(2)} below ${thresholds.minCalibrationHealth}. Confidence not yet trustworthy.`);
  }
  if (bandWidth > thresholds.maxUncertaintyWidth) {
    downgrade("shadow", "uncertainty-gate", `Uncertainty band width ${bandWidth.toFixed(2)} exceeds ${thresholds.maxUncertaintyWidth}. Too wide to act.`);
  }

  // ── Protection gate: RG risk blocks a public-actionable Signal (still allowed as Shadow). ──
  if (compliance.responsibleGamingRisk) {
    downgrade("shadow", "protection-gate", "Responsible-gaming risk flag: held to shadow, not surfaced as action.");
  }

  if (state === "signal") {
    reasons.push("Edge survives truth, time, market, uncertainty, availability, and compliance gates.");
  }
  return { state, decidedBy, reasons, edge };
}

/** Modeled edge over the devigged market: model probability − market fair probability. */
function computeEdge(model: ModelState, market: MarketState): number | null {
  if (!Number.isFinite(model.probability)) return null;
  if (market.devigFairProb == null || !Number.isFinite(market.devigFairProb)) return null;
  return model.probability - market.devigFairProb;
}
