export {
  scoreGame,
  scoreGames,
  americanToImpliedProbability,
  removeVig,
  clamp,
  toEdgeIndex,
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
// Closing-Line Value — sharp-grade credibility metric (pure; not yet surfaced publicly)
export {
  computeSpreadClv,
  computeTotalClv,
  computeMoneylineClv,
  summarizeClv,
} from "./clv.js";
export type {
  ClvVerdict,
  SpreadSide,
  TotalSide,
  PointsClvResult,
  MoneylineClvResult,
  ClvSummary,
} from "./clv.js";
// CLV capture — derive the closing line from the timestamped odds history and
// grade a pick's lock-time line/price against it. Pure; the settlement pipeline
// supplies real rows and persists the graded result.
export {
  deriveClosingSnapshotFromOdds,
  gradePickClv,
} from "./clv-capture.js";
export type {
  PickKind,
  ClosingOddsRow,
  ClosingSnapshot,
  ClvKind,
  ClvGrade,
} from "./clv-capture.js";
// Edge engine — surfaces a pick only where INDEPENDENT estimators (Poisson model,
// Kalshi exchange) diverge from the sportsbook fair value AND agree with each
// other. The fix for "the market grading itself." Pure; not yet wired into live
// scoring (a deliberate MODEL_VERSION step, founder-gated).
export {
  assessEdge,
  SPEAK_EDGE,
  LEAN_EDGE,
} from "./edge-engine.js";
export type {
  IndependentEstimate,
  EdgeInput,
  EdgeDecision,
  AnchorAgreement,
  EdgeAssessment,
} from "./edge-engine.js";
export * from "./constants.js";
export * from "./trend-discovery.js";
export { getPlatformConfig } from "./platform-config.js";
export type { PlatformConfig, ConfidenceDisplayMode } from "./platform-config.js";
export { getReadinessGates, bootstrapGateResponse } from "./readiness.js";
export type { ReadinessGates } from "./readiness.js";
// Proof-of-record — tamper-evident Merkle commitment over published picks.
export {
  hashLeaf,
  merkleRoot,
  inclusionProof,
  verifyInclusion,
  canonicalPickPayload,
} from "./proof-of-record.js";
export type { HashFn, PickRecord, MerkleSibling, MerkleProof } from "./proof-of-record.js";
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
// #11 — team scoring rates computed from REAL stored final scores (no new
// provider, no fabricated λ) → an INDEPENDENT Poisson fair value that slots into
// the edge engine as a 2nd estimator. Pure; the ingestion-cron wiring +
// TEAM_RATES_AVAILABLE=true + MODEL_VERSION bump are founder-gated.
export {
  computeTeamScoringRates,
  estimateMatchupLambdas,
  poissonIndependentFairValue,
  isPoissonValidSport,
  MIN_GAMES_FOR_RATES,
  DEFAULT_HOME_ADVANTAGE,
} from "./team-rates.js";
export type {
  TeamGameRecord,
  TeamScoringRates,
  MatchupLambdas,
  PoissonFairValueInput,
  PoissonFairValue,
} from "./team-rates.js";
// R&D — probability calibration toolkit (isotonic/PAVA, Brier decomposition, ECE).
// NOT wired into live scoring; built for the future human-gated MODEL_VERSION
// calibration that turns the confidence score into a calibrated win probability.
export {
  isotonicCalibration,
  brierDecomposition,
  expectedCalibrationError,
} from "./probability-calibration.js";
export type {
  CalibrationSample,
  IsotonicModel,
  BrierDecomposition,
} from "./probability-calibration.js";

export {
  assessUncertainty,
  wilsonInterval,
  type UncertaintyInput,
  type UncertaintyDisclosure,
  type ReliabilityTier,
  type LimitationFlag,
} from "./model-limitations.js";
