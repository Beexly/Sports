/**
 * Class A Coach-First simulation modules.
 * No OddsInput. No market tokens. The fence rejects any book import.
 *
 * Entry point: lockCoachProjection. Call this first. The market is not an argument.
 */
export { simulateCoachGame, runSimulations } from "./markov-simulator.js";
export type { CoachSimInput, CoachProjection, SchemeSample } from "./markov-simulator.js";

export { lockCoachProjection } from "./locked-projection.js";
export type { LockedCoachProjection } from "./locked-projection.js";

export { evaluateFourthDown, STAFF_AGGRESSION } from "./fourth-down-policy.js";
export type { FourthDownState, FourthDownDecision } from "./fourth-down-policy.js";

export { allocateTargets, applyShadowHaircut } from "./sinkhorn-targets.js";
export type { EligibleTarget, TargetAllocation } from "./sinkhorn-targets.js";

export {
  YBC_PER_RUSH_32,
  AT_OR_BEHIND_LOS_RATE_32,
  EPA_VS_BLITZ_32,
  MEASURED_CELL_PRIORS,
  shrinkPublishedCell,
  getTeamShrunkTrenchAndBlitzCell,
  pitNoYbcCell,
} from "../nfl/published-cells-shrinkage.js";
export type {
  NflTeamCode,
  ShrunkCell,
  PitNoYbcCellResult,
  TeamTrenchAndBlitzCell,
} from "../nfl/published-cells-shrinkage.js";

export {
  estimateStudentTEpaAbility,
  evaluateQbGiniVolatilityMultiplier,
  computeDefensiveWr1SplitAdjustment,
  decomposePenaltyEpaShrinkage,
  computeShrunkIndividualHfa,
  computeNeutralPassTendencyOverExpected,
  computeRerunPuntFieldPositionDelta,
  buildReceiverPropQuantileDistribution,
  evaluateRbHighValueTouchTrap,
  applyQuarterbackAndRoomAttritionToReceiver,
  applySingleGameVarianceCompressionToRatingEdge,
} from "./oct24-intel-master-kernels.js";
export type {
  QbVolatilityAdjustment,
  Wr1SplitDefensiveProfile,
  ReceiverPropQuantileDistribution,
  ReceiverAttritionInput,
  ReceiverAttritionResult,
} from "./oct24-intel-master-kernels.js";

export { drawSchemePlay, schemeReasoningLine, centerEpa, flagRate } from "./scheme-state.js";
export type { SchemePlay, SchemeFlagDraw, SchemeFamily, SchemeFlagId } from "./scheme-state.js";
export { SCHEME_FLAGS, SCHEME_YARDS_PER_EPA, QB_DECISION_DISCLOSED, SEPARATION_DISCLOSED } from "./scheme-state.js";

export { effectiveN, loadMultiplier, scaleDropoff } from "./load-scaling.js";
export { LEAGUE_HHI, LOAD_FLOOR, LOAD_CEIL } from "./load-scaling.js";
export { sinkhornLogDomain } from "./sinkhorn-targets.js";
