/**
 * FANTASY DISCOVERY LAYER — Best Ball Draft Twin (Invention F10/F20).
 *
 * Best ball is won on ceiling distribution, spike-week probability, roster correlation, playoff-week
 * fit, and ADP discount — not on projected points. A volatile spike player the draft room fades is
 * a target; a safe-floor player at full ADP is not. Pure + deterministic.
 */

export interface BestBallInputs {
  readonly ceiling: number;                   // 0..1
  readonly spikeWeekProbability: number;      // 0..1
  readonly rosterCorrelation: number;         // 0..1 (stack with your QB/offense)
  readonly playoffWeekFit: number;            // 0..1 (weeks 15–17 schedule)
  readonly adpDiscount: number;               // 0..1 (value past fair ADP)
  readonly fragility: number;                 // 0..1
  readonly roleUncertainty: number;           // 0..1
  readonly rosterConstructionPenalty: number; // 0..1 (over-exposure / positional imbalance)
  readonly byeWeekConflict: number;           // 0..1
}

export type BestBallAction = "BEST_BALL_TARGET" | "VALUE_PICK" | "NEUTRAL" | "AVOID";

export interface BestBallResult {
  readonly edge: number;
  readonly action: BestBallAction;
  readonly note: string;
}

/** Evaluate a best-ball draft target. */
export function evaluateBestBall(i: BestBallInputs): BestBallResult {
  const gross = i.ceiling
    * (0.5 + 0.5 * i.spikeWeekProbability)
    * (0.7 + 0.3 * i.rosterCorrelation)
    * (0.7 + 0.3 * i.playoffWeekFit)
    * (0.5 + 0.5 * i.adpDiscount);
  const edge = Number((gross - 0.3 * i.fragility - 0.3 * i.roleUncertainty - 0.3 * i.rosterConstructionPenalty - 0.1 * i.byeWeekConflict).toFixed(4));

  let action: BestBallAction;
  if (edge <= 0) action = "AVOID";
  else if (edge >= 0.3) action = "BEST_BALL_TARGET";
  else if (i.adpDiscount > 0.5 && edge > 0.2) action = "VALUE_PICK";
  else action = "NEUTRAL";

  return {
    edge,
    action,
    note: action === "BEST_BALL_TARGET"
      ? "Ceiling + spike weeks + playoff fit at an ADP discount — target."
      : action === "VALUE_PICK"
        ? "Falls past fair ADP with positive edge — value pick."
        : action === "AVOID"
          ? "Fragility / role uncertainty / construction penalty outweigh the ceiling — avoid."
          : "Fairly priced — neutral.",
  };
}
