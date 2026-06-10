export {
  scoreGame,
  scoreGames,
  americanToImpliedProbability,
  removeVig,
  clamp,
} from "./scoring.js";
export {
  computeGameContext,
  computeLineMovementScore,
  computeRestAdvantageScore,
  computeHistoricalFormScore,
  computeDataQuality,
  // v4
  computeHeadToHeadScore,
  computeVenueFormScore,
  computeCrossMarketScore,
  computeUncertaintyPenalty,
  // v5
  computeScheduleStressScore,
} from "./game-context.js";
export type { GameContextInput, GameContextScores, AtsFormBucket } from "./game-context.js";
export { calculatePickResult } from "./settlement.js";
export type { SettlementResult } from "./settlement.js";
// v6 — Closing-Line Value (CLV): pure shadow proof, never feeds the published
// confidence/tier/grade/result or MODEL_VERSION.
export {
  computeClv,
  computeClvPositiveRate,
  clvBetSideFor,
} from "./clv.js";
export type {
  ClvBetSide,
  ComputeClvInput,
  ClvResult,
  ClvRateInput,
  ClvRate,
} from "./clv.js";
export * from "./constants.js";
export { getPlatformConfig } from "./platform-config.js";
export type { PlatformConfig, ConfidenceDisplayMode } from "./platform-config.js";
export { getReadinessGates, bootstrapGateResponse } from "./readiness.js";
export type { ReadinessGates } from "./readiness.js";
export { buildPickSignalSnapshot } from "./signal-snapshot.js";
export type { PickSignalSnapshotData } from "./signal-snapshot.js";
export {
  EVIDENCE_FACTOR_DEFINITIONS,
  buildEvidenceReadinessMatrix,
  getEvidenceFactorDefinition,
} from "./evidence-readiness-matrix.js";
export type {
  EvidenceFactorDefinition,
  EvidenceFactorKey,
  EvidenceMatrixRow,
  EvidenceMatrixStatus,
  EvidenceReadinessMatrix,
  FailureHorizon,
} from "./evidence-readiness-matrix.js";
// v6 — bankroll math helpers. Exported for future model work; not wired to
// the public API until price provenance and policy review are complete.
export {
  recommendStake,
  fullKellyFraction,
  unitsFromKelly,
  americanToDecimalOdds,
  KELLY_FRACTION,
  MAX_UNITS_PER_PICK,
  MIN_CONFIDENCE_FOR_STAKE,
  MIN_EDGE_FOR_STAKE,
} from "./kelly.js";
export type { KellyStake, StakeInput } from "./kelly.js";
// v6 — Poisson model (helper module, not yet wired into scoring)
export {
  factorial,
  poissonPmf,
  poissonCdf,
  jointScoreMatrix,
  moneylineProbabilities,
  overUnderProbabilities,
  poissonConsistencyScore,
  assertTeamRatesAvailable,
} from "./poisson.js";
