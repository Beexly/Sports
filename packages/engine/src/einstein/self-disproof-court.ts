/**
 * EINSTEIN LAYER — Recursive Self-Disproof Court (Invention 23).
 *
 * Every engine gets a prosecutor whose job is to DESTROY its output. A candidate must survive all
 * of them before it can graduate: the winning agent is not the one that finds the most edges, but
 * the one that kills the most false edges before they embarrass the platform. One FAIL caps the
 * candidate at WATCHLIST (or lower if existing ledger rules are stricter).
 *
 * Pure + deterministic. Each prosecutor examines the belief-transition evidence and asks its
 * destroying question. This composes with the galileo Edge Immune System (which guards the
 * statistical gates); this court guards the Einstein-layer structural claims.
 */

import type { TradabilityStatus } from "./tradability-filter.js";
import type { LightConeStatus } from "./information-light-cone.js";

export type CourtVerdict = "PASS" | "WARNING" | "FAIL";

export type CourtProsecutor =
  | "BookDnaProsecutor"
  | "ShockProsecutor"
  | "ConservationProsecutor"
  | "LightConeProsecutor"
  | "TradabilityProsecutor"
  | "CLVProsecutor"
  | "ModelProsecutor"
  | "DataRightsProsecutor"
  | "RevenueTrustProsecutor";

export interface CourtCharge {
  readonly prosecutor: CourtProsecutor;
  readonly verdict: CourtVerdict;
  readonly reason: string;
  readonly requiredNextTest: string | null;
}

export interface BeliefTransitionEvidence {
  /** Book-DNA: is the lead/lag just noisy ordering rather than a real lag? */
  readonly bookDnaNoisyOrdering?: boolean;
  /** Shock: was the shock already priced before our decision? */
  readonly shockAlreadyPriced?: boolean;
  /** Conservation: is the violation real, or just low-liquidity curvature? */
  readonly conservationLowLiquidity?: boolean;
  readonly conservationViolationReal?: boolean;
  readonly lightConeStatus: LightConeStatus;
  readonly tradabilityStatus: TradabilityStatus;
  /** CLV: did we beat a genuinely sharp close, or merely a bad one? */
  readonly clvBeatSharpClose?: boolean;
  /** Model: does it survive season/sport/book/market-family separation? */
  readonly survivesSeparation?: boolean;
  readonly dataRightsCleared?: boolean;
  /** Would publishing this degrade trust even if it sells? */
  readonly publishingErodesTrust?: boolean;
}

function charge(prosecutor: CourtProsecutor, verdict: CourtVerdict, reason: string, requiredNextTest: string | null): CourtCharge {
  return { prosecutor, verdict, reason, requiredNextTest };
}

export interface CourtResult {
  readonly charges: readonly CourtCharge[];
  readonly fails: readonly CourtProsecutor[];
  readonly warnings: readonly CourtProsecutor[];
  readonly survives: boolean;
  readonly cappedStatus: "WATCHLIST" | null;
}

/** Convene the full court over one belief-transition's evidence. One FAIL caps at WATCHLIST. */
export function convene(e: BeliefTransitionEvidence): CourtResult {
  const charges: CourtCharge[] = [
    e.bookDnaNoisyOrdering
      ? charge("BookDnaProsecutor", "FAIL", "Lead/lag is consistent with noisy book ordering, not a real lag.", "Show lead/lag stable across many games/markets.")
      : charge("BookDnaProsecutor", "PASS", "Lead/lag structure is non-noise.", null),
    e.shockAlreadyPriced
      ? charge("ShockProsecutor", "FAIL", "The shock was already priced before the decision.", "Prove the decision sits inside the un-absorbed window.")
      : charge("ShockProsecutor", "PASS", "Shock not yet absorbed at decision time.", null),
    e.conservationLowLiquidity && !e.conservationViolationReal
      ? charge("ConservationProsecutor", "WARNING", "Conservation violation may be low-liquidity curvature, not real incoherence.", "Confirm the violation on deeper-liquidity books.")
      : charge("ConservationProsecutor", "PASS", "Conservation violation is structural, not a liquidity artifact.", null),
    e.lightConeStatus === "outside" || e.lightConeStatus === "contaminated"
      ? charge("LightConeProsecutor", "FAIL", `Outside the information light cone (${e.lightConeStatus}).`, "Re-time with strictly pre-decision, knowable data.")
      : e.lightConeStatus === "inside_absorbed"
        ? charge("LightConeProsecutor", "WARNING", "Knowable but the family already absorbed it — no window.", "Find an earlier decision point or a slower family.")
        : charge("LightConeProsecutor", "PASS", "Inside the cone with an open window.", null),
    e.tradabilityStatus === "FRICTION_KILLED" || e.tradabilityStatus === "DATA_QUALITY_FAIL"
      ? charge("TradabilityProsecutor", "FAIL", `Edge does not survive friction (${e.tradabilityStatus}).`, "Re-quote after vig/spread/latency/limits.")
      : e.tradabilityStatus === "THEORETICAL_ONLY"
        ? charge("TradabilityProsecutor", "WARNING", "Theoretical only — limits make it non-executable.", "Check real limits / line-shop.")
        : charge("TradabilityProsecutor", "PASS", "Survives the friction cascade.", null),
    e.clvBeatSharpClose === false
      ? charge("CLVProsecutor", "WARNING", "May have beaten a bad close rather than a sharp one.", "Validate the close against a sharp reference.")
      : charge("CLVProsecutor", "PASS", "CLV against a credible close (or not the sole basis).", null),
    e.survivesSeparation === false
      ? charge("ModelProsecutor", "FAIL", "Does not survive season/sport/book/market-family separation.", "Re-test out-of-sample across separations.")
      : charge("ModelProsecutor", "PASS", "Survives separation.", null),
    e.dataRightsCleared === false
      ? charge("DataRightsProsecutor", "FAIL", "Data rights not cleared.", "Clear source rights before any use.")
      : charge("DataRightsProsecutor", "PASS", "Data rights cleared.", null),
    e.publishingErodesTrust
      ? charge("RevenueTrustProsecutor", "FAIL", "Publishing would erode trust even if it sells.", "Do not publish; integrity over revenue.")
      : charge("RevenueTrustProsecutor", "PASS", "Publishing is trust-safe.", null),
  ];

  const fails = charges.filter((c) => c.verdict === "FAIL").map((c) => c.prosecutor);
  const warnings = charges.filter((c) => c.verdict === "WARNING").map((c) => c.prosecutor);
  const survives = fails.length === 0;
  return { charges, fails, warnings, survives, cappedStatus: survives ? null : "WATCHLIST" };
}
