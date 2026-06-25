/**
 * EINSTEIN LAYER — Shock Calculus (Invention 14).
 *
 * The Counterfactual Oracle asks "if X changed, what should move?" This makes it FORMAL: every
 * shock type carries a causal operator — expected affected markets, expected NULL markets,
 * direction, magnitude band, half-life prior, source obligations, sibling propagation — and an
 * ASSUMPTION CARD (causal discovery in markets has no ground truth, so every causal claim must
 * name its assumptions). Diagnosing observed vs expected turns "edge" into a structured verdict:
 *   expected move but didn't  → stale-book candidate
 *   expected null but moved    → attention-contaminated candidate
 *   right direction, short     → absorption candidate
 *   overshoot                  → reversion candidate
 *
 * Pure + deterministic. The market-class labels are families (e.g. "qb_pass_yds", "receiver_yds")
 * the caller maps onto concrete instance keys.
 */

export type ShockKind =
  | "injury" | "inactive" | "role_change" | "depth_chart" | "weather" | "scheme" | "pace"
  | "referee" | "travel" | "motivation" | "market_steam" | "public_attention"
  | "liquidity_vacuum" | "false_rumor" | "correction";

export interface CausalOperator {
  readonly affectedMarkets: readonly string[];
  readonly nullMarkets: readonly string[];
  readonly direction: "up" | "down" | "mixed";
  readonly magnitudeBand: readonly [number, number];
  readonly halfLifePriorMin: number;
  readonly confidence: number;
  /** Source confirmation required before this causal claim may be acted on. */
  readonly sourceObligations: readonly string[];
  readonly siblingPropagation: readonly string[];
  /** The assumptions this causal claim depends on (no ground truth — name them). */
  readonly assumptionCard: readonly string[];
}

const ASSUME_REPORTING = "reporting is timely and not a false rumor";
const ASSUME_NO_OFFSET = "no offsetting simultaneous shock";
const ASSUME_USAGE = "depth chart / usage redistribution behaves as historically observed";

export const SHOCK_OPERATORS: Record<ShockKind, CausalOperator> = {
  inactive: {
    affectedMarkets: ["that_player_props", "team_total", "spread", "sibling_receiver_props", "qb_pass_yds"],
    nullMarkets: ["opponent_unrelated_props"],
    direction: "mixed", magnitudeBand: [0.3, 1.0], halfLifePriorMin: 20, confidence: 0.8,
    sourceObligations: ["official inactives list or beat-writer confirmation"],
    siblingPropagation: ["target/route redistribution", "alt-tail reshape", "DFS salary lag"],
    assumptionCard: [ASSUME_REPORTING, ASSUME_USAGE, ASSUME_NO_OFFSET],
  },
  injury: {
    affectedMarkets: ["that_player_props", "sibling_props", "team_total"],
    nullMarkets: ["opponent_unrelated_props"],
    direction: "mixed", magnitudeBand: [0.1, 0.7], halfLifePriorMin: 30, confidence: 0.6,
    sourceObligations: ["practice report / injury designation"],
    siblingPropagation: ["partial usage redistribution"],
    assumptionCard: [ASSUME_REPORTING, ASSUME_USAGE, "severity is as designated (questionable ≠ out)"],
  },
  role_change: {
    affectedMarkets: ["that_player_props", "displaced_player_props"],
    nullMarkets: [], direction: "mixed", magnitudeBand: [0.2, 0.8], halfLifePriorMin: 25, confidence: 0.6,
    sourceObligations: ["depth chart / coach presser"], siblingPropagation: ["snap/route reallocation"],
    assumptionCard: [ASSUME_USAGE, "coaching follows the stated plan"],
  },
  depth_chart: {
    affectedMarkets: ["promoted_player_props", "demoted_player_props"], nullMarkets: [],
    direction: "mixed", magnitudeBand: [0.2, 0.7], halfLifePriorMin: 30, confidence: 0.5,
    sourceObligations: ["official depth chart"], siblingPropagation: ["usage reallocation"],
    assumptionCard: [ASSUME_USAGE, "depth chart reflects real usage (not boilerplate)"],
  },
  weather: {
    affectedMarkets: ["total", "qb_pass_yds", "deep_receiver_yds", "kicker_props"],
    nullMarkets: ["rush_yds_indoor"], direction: "down", magnitudeBand: [0.1, 0.6], halfLifePriorMin: 60, confidence: 0.6,
    sourceObligations: ["forecast at/near kickoff"], siblingPropagation: ["pass→rush script shift"],
    assumptionCard: ["forecast holds through kickoff", ASSUME_NO_OFFSET],
  },
  scheme: { affectedMarkets: ["pace_dependent_props"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.1, 0.5], halfLifePriorMin: 90, confidence: 0.4, sourceObligations: ["coordinator change / tendency"], siblingPropagation: [], assumptionCard: ["scheme change manifests on field"] },
  pace: { affectedMarkets: ["total", "both_team_props"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.1, 0.5], halfLifePriorMin: 90, confidence: 0.4, sourceObligations: ["pace projection"], siblingPropagation: [], assumptionCard: ["pace estimate is reliable"] },
  referee: { affectedMarkets: ["total", "penalty_props"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.05, 0.3], halfLifePriorMin: 120, confidence: 0.3, sourceObligations: ["crew assignment"], siblingPropagation: [], assumptionCard: ["crew tendency is predictive"] },
  travel: { affectedMarkets: ["team_total", "spread"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.05, 0.25], halfLifePriorMin: 120, confidence: 0.3, sourceObligations: ["schedule"], siblingPropagation: [], assumptionCard: ["travel effect is real and not already priced"] },
  motivation: { affectedMarkets: ["spread", "total"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.05, 0.3], halfLifePriorMin: 120, confidence: 0.25, sourceObligations: ["standings/context"], siblingPropagation: [], assumptionCard: ["motivation narrative reflects effort, not just story"] },
  market_steam: { affectedMarkets: ["followed_market"], nullMarkets: ["unrelated_props"], direction: "mixed", magnitudeBand: [0.2, 1.0], halfLifePriorMin: 10, confidence: 0.5, sourceObligations: ["originating sharp book move"], siblingPropagation: ["copycat books follow"], assumptionCard: ["steam is informed, not a head-fake"] },
  public_attention: { affectedMarkets: ["public_side"], nullMarkets: ["sharp_side_fair_value"], direction: "mixed", magnitudeBand: [0.1, 0.6], halfLifePriorMin: 30, confidence: 0.4, sourceObligations: ["ticket/handle proxy"], siblingPropagation: ["soft books shade public side"], assumptionCard: ["attention, not information, drives the move"] },
  liquidity_vacuum: { affectedMarkets: ["thin_market"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.2, 1.0], halfLifePriorMin: 15, confidence: 0.3, sourceObligations: ["low-limit window"], siblingPropagation: [], assumptionCard: ["the move is a liquidity artifact, not signal"] },
  false_rumor: { affectedMarkets: ["rumored_player_props"], nullMarkets: ["everything_else"], direction: "mixed", magnitudeBand: [0.0, 0.5], halfLifePriorMin: 20, confidence: 0.2, sourceObligations: ["UNVERIFIED — quarantine"], siblingPropagation: ["correction reverses it"], assumptionCard: ["rumor is FALSE until confirmed — quarantine, do not act"] },
  correction: { affectedMarkets: ["previously_moved_market"], nullMarkets: [], direction: "mixed", magnitudeBand: [0.1, 1.0], halfLifePriorMin: 10, confidence: 0.7, sourceObligations: ["official walk-back"], siblingPropagation: ["reverts the prior move"], assumptionCard: ["the correction is the truth, not the rumor"] },
};

export interface CausalShockExpectation {
  readonly shockKind: ShockKind;
  readonly operator: CausalOperator;
  readonly expectedMoves: readonly string[];
  readonly expectedNulls: readonly string[];
  readonly assumptionCard: readonly string[];
}

export function expectShock(shockKind: ShockKind): CausalShockExpectation {
  const operator = SHOCK_OPERATORS[shockKind];
  return { shockKind, operator, expectedMoves: operator.affectedMarkets, expectedNulls: operator.nullMarkets, assumptionCard: operator.assumptionCard };
}

export interface ObservedMarketMove {
  readonly market: string;
  readonly moved: boolean;
  /** Did the realized direction match the expected direction? */
  readonly directionMatches?: boolean;
  /** Realized magnitude normalized 0..1. */
  readonly magnitudeNorm?: number;
  /** Did it overshoot the expected band before settling? */
  readonly overshoot?: boolean;
}

export type ShockDiagnosis =
  | "stale_book"
  | "attention_contaminated"
  | "absorption"
  | "reversion"
  | "coherent"
  | "unmapped";

export interface ShockResidual {
  readonly market: string;
  readonly expectation: "move" | "null" | "unmapped";
  readonly observedMoved: boolean;
  readonly diagnosis: ShockDiagnosis;
  readonly note: string;
}

/** Diagnose observed market behavior against a shock's causal expectation. */
export function diagnoseShock(
  expectation: CausalShockExpectation,
  observed: readonly ObservedMarketMove[],
): ShockResidual[] {
  const expectMove = new Set(expectation.expectedMoves);
  const expectNull = new Set(expectation.expectedNulls);
  const [, hi] = expectation.operator.magnitudeBand;

  return observed.map((o) => {
    const expectation_: ShockResidual["expectation"] = expectMove.has(o.market) ? "move" : expectNull.has(o.market) ? "null" : "unmapped";
    let diagnosis: ShockDiagnosis = "coherent";
    let note = "Behaves as the causal operator expects.";

    if (expectation_ === "move") {
      if (!o.moved) { diagnosis = "stale_book"; note = "Expected to move but did not — stale-book candidate."; }
      else if (o.overshoot) { diagnosis = "reversion"; note = "Overshot the expected band — reversion candidate."; }
      else if (o.directionMatches && (o.magnitudeNorm ?? 0) < hi * 0.5) { diagnosis = "absorption"; note = "Right direction, under-moved — absorption candidate."; }
      else if (o.directionMatches === false) { diagnosis = "attention_contaminated"; note = "Moved against the causal direction — contamination candidate."; }
    } else if (expectation_ === "null") {
      if (o.moved) { diagnosis = "attention_contaminated"; note = "Moved without causal justification — attention-contaminated candidate."; }
    } else {
      diagnosis = o.moved ? "unmapped" : "coherent";
      note = "Market not in this shock's causal map.";
    }
    return { market: o.market, expectation: expectation_, observedMoved: o.moved, diagnosis, note };
  });
}
