/**
 * EINSTEIN LAYER — Belief-State Transition (the core object).
 *
 * The unit of intelligence is no longer "pick", "edge", or even "residual". It is a TIME-LOCKED,
 * CAUSAL, ADVERSARIALLY-TESTED BELIEF-STATE TRANSITION: what was believed, by whom, when, why;
 * what changed; what SHOULD have changed; what FAILED to change; whether the gap survived friction;
 * and whether the system deserved confidence BEFORE the result was known.
 *
 * This assembles the outputs of every layer into one record carrying provenance, knowability/
 * light-cone status, data-quality, rights, immune-system + court results, tradability, and the
 * negative-ledger check — then computes a single, conservative disposition. Pure + deterministic.
 */

import type { LightConeVerdict } from "./information-light-cone.js";
import type { TradabilityResult } from "./tradability-filter.js";
import type { CourtResult } from "./self-disproof-court.js";
import type { GraveyardMatch } from "./negative-discovery-ledger.js";
import type { ConservationViolationResidual } from "./conservation-law.js";
import type { ShockResidual } from "./shock-calculus.js";

export type Disposition =
  | "REJECTED"
  | "DATA_QUALITY_FAIL"
  | "FRICTION_KILLED"
  | "WATCHLIST"
  | "THEORETICAL_ONLY"
  | "EXECUTABLE_SHADOW";

export interface BeliefTransitionInput {
  readonly id: string;
  readonly marketKey: string;
  readonly book?: string;
  readonly line?: number;
  readonly decisionTime: string;
  /** What changed in reality / the market (plain statement). */
  readonly whatChanged: string;
  /** What a coherent market should have done. */
  readonly whatShouldHaveChanged: string;
  /** What failed to change (the lag/contradiction). */
  readonly whatFailedToChange: string;
  readonly fleshStateTrigger?: string;
  readonly marketStateTrigger?: string;
  readonly attentionStateTrigger?: string;
  readonly shockDiagnoses?: readonly ShockResidual[];
  readonly conservationViolations?: readonly ConservationViolationResidual[];
  readonly provenance: { readonly discoveredBy: string; readonly reportPath?: string; readonly commitHash?: string };
  readonly lightCone: LightConeVerdict;
  readonly dataQualityStatus: "ok" | "warn" | "fail";
  readonly rightsStatus: "cleared" | "needs_review" | "blocked";
  readonly tradability: TradabilityResult;
  readonly court: CourtResult;
  readonly graveyard: GraveyardMatch;
  /** Optional immune-system summary (galileo edge-immune-system); true = survived. */
  readonly immuneSurvived?: boolean;
}

export interface BeliefTransition extends BeliefTransitionInput {
  readonly disposition: Disposition;
  readonly dispositionReasons: readonly string[];
}

/**
 * Assemble the transition and compute a conservative disposition. Precedence is strict: any hard
 * failure (data quality, leakage/not-knowable, rights blocked, court fail, friction kill) caps or
 * rejects before any executable status is considered. Nothing here flips a live gate.
 */
export function assembleBeliefTransition(input: BeliefTransitionInput): BeliefTransition {
  const reasons: string[] = [];
  let disposition: Disposition;

  if (input.dataQualityStatus === "fail" || input.tradability.status === "DATA_QUALITY_FAIL") {
    disposition = "DATA_QUALITY_FAIL";
    reasons.push("Data-quality failure — fix and re-run before any read.");
  } else if (input.lightCone.status === "outside" || input.lightCone.status === "contaminated") {
    disposition = "REJECTED";
    reasons.push(`Outside the information light cone (${input.lightCone.status}) — not knowable / leakage.`);
  } else if (input.rightsStatus === "blocked") {
    disposition = "REJECTED";
    reasons.push("Source rights blocked — cannot use the data.");
  } else if (input.tradability.status === "FRICTION_KILLED") {
    // Friction death is physics — a more specific, informative outcome than a generic court cap,
    // so it is resolved before the court-survival check (which also fails via its tradability prosecutor).
    disposition = "FRICTION_KILLED";
    reasons.push(`Edge died at the ${input.tradability.killStage} stage of the friction cascade.`);
  } else if (!input.court.survives) {
    disposition = "WATCHLIST";
    reasons.push(`Failed the self-disproof court: ${input.court.fails.join(", ")} — capped at WATCHLIST.`);
  } else if (input.immuneSurvived === false) {
    disposition = "WATCHLIST";
    reasons.push("Failed the edge immune system — capped at WATCHLIST.");
  } else if (input.graveyard.matched) {
    disposition = "WATCHLIST";
    reasons.push(input.graveyard.suppressionNote ?? "Matches a known dead edge — suppressed to WATCHLIST.");
  } else if (input.tradability.status === "THEORETICAL_ONLY") {
    disposition = "THEORETICAL_ONLY";
    reasons.push("Survives the court but limits make it non-executable — theoretical only.");
  } else if (input.tradability.status === "EXECUTABLE_SHADOW") {
    disposition = "EXECUTABLE_SHADOW";
    reasons.push("Knowable, coherent, court-cleared, and survives friction — executable in shadow.");
    if (input.lightCone.status === "inside_absorbed") {
      disposition = "WATCHLIST";
      reasons.push("…but the market family already absorbed it — no window; WATCHLIST.");
    }
  } else {
    disposition = "WATCHLIST";
    reasons.push("Insufficiently resolved — WATCHLIST.");
  }

  return { ...input, disposition, dispositionReasons: reasons };
}
