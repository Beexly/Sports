/**
 * FANTASY DISCOVERY LAYER — Dynasty Asset Physics (Invention F13/F19).
 *
 * Dynasty prices a long-horizon asset: future role probability, talent durability, team/contract
 * context, an age curve, market-sentiment gap, and liquidity — minus injury decay, opportunity
 * uncertainty, and narrative overpricing. The buy/sell signal is the gap between our intrinsic
 * value and the market's sentiment, conditioned on the owner's competitive window. Pure +
 * deterministic.
 */

export type DynastyPosition = "QB" | "RB" | "WR" | "TE";

export interface DynastyInputs {
  readonly futureRoleProbability: number; // 0..1
  readonly talentDurability: number;      // 0..1
  readonly teamContext: number;           // 0..1
  readonly age: number;
  readonly position: DynastyPosition;
  readonly marketSentiment: number;       // 0..1 current market price
  readonly intrinsicValue: number;        // 0..1 our model value
  readonly liquidity: number;             // 0..1
  readonly injuryDecay: number;           // 0..1
  readonly opportunityUncertainty: number;// 0..1
  readonly narrativeOverpricing: number;  // 0..1
  readonly teamWindow: "rebuild" | "contender" | "neutral";
}

export type DynastyAction = "BUY" | "SELL" | "HOLD" | "REBUILD_BUY" | "CONTENDER_BUY" | "LIQUIDATE" | "WATCHLIST";

export interface DynastyResult {
  readonly dynastyEdge: number;
  readonly sentimentGap: number; // intrinsicValue − marketSentiment
  readonly ageCurve: number;
  readonly action: DynastyAction;
  readonly note: string;
}

function ageCurveFor(position: DynastyPosition, age: number): number {
  const peak = position === "RB" ? 25 : position === "WR" ? 26 : position === "TE" ? 27 : 28;
  const decay = position === "RB" ? 0.06 : 0.035;
  return Math.max(0.4, 1 - decay * Math.abs(age - peak));
}

/** Evaluate a dynasty asset and recommend a window-aware buy/sell/hold. */
export function evaluateDynasty(i: DynastyInputs): DynastyResult {
  const ac = ageCurveFor(i.position, i.age);
  const sentimentGap = Number((i.intrinsicValue - i.marketSentiment).toFixed(4));
  const core = i.futureRoleProbability * i.talentDurability * (0.6 + 0.4 * i.teamContext) * ac * (0.5 + 0.5 * i.liquidity);
  const dynastyEdge = Number((core + sentimentGap - 0.3 * i.injuryDecay - 0.3 * i.opportunityUncertainty - 0.3 * i.narrativeOverpricing).toFixed(4));

  const young = i.age <= 24;
  const old = i.age >= 29 || (i.position === "RB" && i.age >= 27);

  let action: DynastyAction;
  if (sentimentGap >= 0.15 && dynastyEdge > 0) {
    action = i.teamWindow === "rebuild" && young ? "REBUILD_BUY" : i.teamWindow === "contender" ? "CONTENDER_BUY" : "BUY";
  } else if (sentimentGap <= -0.15) {
    action = i.narrativeOverpricing >= 0.5 && old ? "LIQUIDATE" : "SELL";
  } else if (dynastyEdge > 0.2) {
    action = "HOLD";
  } else {
    action = "WATCHLIST";
  }

  return {
    dynastyEdge, sentimentGap, ageCurve: Number(ac.toFixed(3)), action,
    note: action.includes("BUY")
      ? "Intrinsic value exceeds market sentiment — accumulate (window-aware)."
      : action === "SELL" || action === "LIQUIDATE"
        ? "Market sentiment exceeds intrinsic value — sell into the narrative."
        : action === "HOLD" ? "Fairly priced with positive asset physics — hold." : "Unclear edge — watchlist.",
  };
}
