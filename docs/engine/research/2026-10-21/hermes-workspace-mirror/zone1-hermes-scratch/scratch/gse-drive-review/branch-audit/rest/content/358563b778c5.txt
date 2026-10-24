export {
  scoreGame,
  scoreGames,
  americanToImpliedProbability,
  removeVig,
  clamp,
} from "./scoring";
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
} from "./game-context";
export type { GameContextInput, GameContextScores, AtsFormBucket } from "./game-context";
export { calculatePickResult } from "./settlement";
export type { SettlementResult } from "./settlement";
export * from "./constants";
export { getPlatformConfig } from "./platform-config";
export type { PlatformConfig, ConfidenceDisplayMode } from "./platform-config";
export { getReadinessGates, bootstrapGateResponse } from "./readiness";
export type { ReadinessGates } from "./readiness";
export { buildPickSignalSnapshot } from "./signal-snapshot";
export type { PickSignalSnapshotData } from "./signal-snapshot";
export {
  EVIDENCE_FACTOR_DEFINITIONS,
  buildEvidenceReadinessMatrix,
  getEvidenceFactorDefinition,
} from "./evidence-readiness-matrix";
export type {
  EvidenceFactorDefinition,
  EvidenceFactorKey,
  EvidenceMatrixRow,
  EvidenceMatrixStatus,
  EvidenceReadinessMatrix,
  FailureHorizon,
} from "./evidence-readiness-matrix";
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
} from "./kelly";
export type { KellyStake, StakeInput } from "./kelly";
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
} from "./poisson";
