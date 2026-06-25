/**
 * FANTASY DISCOVERY LAYER — Trade MRI (Invention F8).
 *
 * Diagnoses a trade target: buy-low, sell-high, or hold — and WHY, separating role truth from the
 * market's perception. It names the distortion (name-value clinging, box-score overreaction, injury
 * panic) and quantifies the dislocation. It never guarantees an outcome and executes nothing. Pure
 * + deterministic.
 */

export interface TradeInputs {
  readonly roleTruth: number;          // 0..1 our role-grounded value
  readonly marketPerception: number;   // 0..1 the league/market's value
  readonly restOfSeasonRoleValue: number;
  readonly playoffScheduleValue: number;
  readonly positionalScarcity: number;
  readonly rosterFit: number;
  readonly outgoingAssetValue: number; // 0..1 what you'd give up
  readonly liquidityRisk: number;
  readonly injuryRisk: number;
  readonly timingRisk: number;
  /** Recent box-score swing driving perception, signed [-1,1] (neg = recent decline). */
  readonly recentBoxScoreSwing: number;
  readonly nameValue: number;          // 0..1
}

export type TradeDirection = "BUY_LOW" | "SELL_HIGH" | "HOLD";

export interface TradeDiagnosis {
  readonly tradeEdge: number;
  readonly perceptionGap: number; // roleTruth − marketPerception
  readonly direction: TradeDirection;
  readonly distortions: readonly string[];
  readonly note: string;
}

/** Diagnose a trade as buy-low / sell-high / hold and surface the perception distortions. */
export function diagnoseTrade(i: TradeInputs): TradeDiagnosis {
  const perceptionGap = Number((i.roleTruth - i.marketPerception).toFixed(4));
  const gross = i.restOfSeasonRoleValue + 0.5 * i.playoffScheduleValue + 0.5 * i.positionalScarcity + 0.5 * i.rosterFit + perceptionGap;
  const cost = i.outgoingAssetValue + 0.5 * i.liquidityRisk + 0.5 * i.injuryRisk + 0.5 * i.timingRisk;
  const tradeEdge = Number((gross - cost).toFixed(4));

  const direction: TradeDirection = perceptionGap >= 0.15 ? "BUY_LOW" : perceptionGap <= -0.15 ? "SELL_HIGH" : "HOLD";

  const distortions: string[] = [];
  if (i.nameValue >= 0.6 && perceptionGap <= -0.15) distortions.push("name_value_distortion: market clings to name above role");
  if (i.recentBoxScoreSwing <= -0.4 && perceptionGap >= 0.15) distortions.push("box_score_distortion: a recent down game depressed perception below role");
  if (i.recentBoxScoreSwing <= -0.4 && i.injuryRisk >= 0.5 && i.roleTruth >= 0.5) distortions.push("injury_panic: perception fell on injury fear while role remains strong");
  if (perceptionGap >= 0.15 && i.playoffScheduleValue >= 0.6) distortions.push("playoff_schedule_leverage: undervalued AND a strong playoff slate");

  return {
    tradeEdge,
    perceptionGap,
    direction,
    distortions,
    note: direction === "BUY_LOW"
      ? "Role exceeds market perception — buy-low candidate (no outcome guaranteed)."
      : direction === "SELL_HIGH"
        ? "Perception exceeds role — sell-high candidate (no outcome guaranteed)."
        : "Role and perception aligned — hold.",
  };
}
