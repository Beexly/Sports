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
// Conviction tier — the honest "70% tier" selector (additive, gated off; see
// docs/path-to-70.md). Classifies a pick on calibrated P + edge + CLV history.
export {
  convictionTier,
  summarizeConviction,
  BREAK_EVEN_PROBABILITY,
  CONVICTION_MIN_PROBABILITY,
  CONVICTION_MIN_CLV_BEAT_RATE,
} from "./conviction-tier.js";
export type {
  ConvictionTier,
  ConvictionInput,
  ConvictionResult,
} from "./conviction-tier.js";
// Calibration application — confidence → calibrated win probability (self-suppressing
// until a settled sample exists; activation is an audited MODEL_VERSION step). See
// docs/path-to-70.md. Additive: does not touch the live scoring path or the freeze.
export {
  buildCalibrator,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
} from "./calibration-apply.js";
export type { Calibrator, CalibratedProbability } from "./calibration-apply.js";
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
  // Dixon–Coles (1997) low-score dependence correction — the τ adjustment the
  // module header cites but previously omitted (was pure independent Maher 1982).
  // Pure + tested; ρ must be fit from real scorelines before wiring (gated like λ).
  dixonColesTau,
  dixonColesJointMatrix,
  moneylineProbabilitiesDC,
  overUnderProbabilitiesDC,
  DIXON_COLES_REFERENCE_RHO,
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
  reliabilityCurve,
} from "./probability-calibration.js";
export type {
  CalibrationSample,
  IsotonicModel,
  BrierDecomposition,
  ReliabilityBin,
} from "./probability-calibration.js";

// Player season projection (recency+games-weighted, regressed) and its
// honest backtest vs a carry-forward baseline. Forecasts; surfaced with their
// measured error, not auto-published.
export { projectPlayerSeason, backtestProjections } from "./player-projection.js";
export type { PlayerSeasonLine, PlayerProjection, ProjectionBacktest } from "./player-projection.js";

// Elo independent-model backtest: results-only win probabilities, calibrated and
// comparable to the market baseline. Measurement only; not wired into scoring.
export { eloBacktest } from "./elo-backtest.js";
export type { EloBacktestGame, EloBacktestReport, EloBacktestOptions } from "./elo-backtest.js";

// Opponent-adjusted efficiency (DVOA/SRS-family) over public play-by-play.
export { opponentAdjustedRatings } from "./opponent-adjusted.js";
export type { TeamGameEfficiency, TeamRating, OpponentAdjustOptions } from "./opponent-adjusted.js";

// Weighted composite score — the "weight everything" matrix that blends hard
// metrics + soft signals (with confidence + freshness valves) into one number
// plus attributed contributions for interpretation/narration.
export { compositeScore } from "./composite-score.js";
export type { WeightedSignal, SignalContribution, CompositeScore, CompositeScoreOptions } from "./composite-score.js";
// Universal signal ledger — the persistent "weight everything" accumulation layer
// that bridges stored ledger rows to the composer (NOT wired into the live score).
export { composeLedger, ledgerAgeDays } from "./signal-ledger.js";
export type { LedgerSignalRow, ComposeLedgerOptions } from "./signal-ledger.js";

// Player usage archetype (receiving lean / workload) from rushing/receiving usage.
export { classifyUsageProfile } from "./player-archetype.js";
export type { UsageProfileInput, UsageProfile, WorkloadTier } from "./player-archetype.js";

// Run-scheme lean (gap/power vs outside/zone) from PBP run direction.
export { classifyRushScheme } from "./player-rush-scheme.js";
export type { RushDirectionCounts, RushSchemeProfile } from "./player-rush-scheme.js";

export {
  assessUncertainty,
  wilsonInterval,
  type UncertaintyInput,
  type UncertaintyDisclosure,
  type ReliabilityTier,
  type LimitationFlag,
} from "./model-limitations.js";

export {
  noVigFromAmericanPrices,
  consensusNoVig,
  marketDisagreementPct,
  marketGravityIndex,
  type MarketRead,
  type ConsensusMarketRead,
  type MarketGravity,
  type GravityBand,
} from "./market-read.js";
export {
  shinDevig,
  gotoConversion,
  impliedFromDecimalOdds,
  type ShinResult,
} from "./shin-devig.js";
// Build-queue #4 — ML independent estimator scaffold (kyleskom concept).
// Gradient-boosted stumps inference + honesty gate. Fed into independentFairValues
// ONLY after calibration proves it (same law as Poisson / Elo estimators).
// Reference: repo-firehose-review.md build-queue item #4; edge-engine.ts.
export {
  predictWinProb,
  toMlFairValue,
  fitReferenceModel,
  computeFeatureSchemaHash,
  FEATURE_SCHEMA_HASH,
  MIN_SAMPLE_SIZE,
  MODEL_MAX_AGE_DAYS,
} from "./ml-estimator.js";
export type {
  MlFeatureVector,
  MlModelObject,
  MlModelProvenance,
  DecisionStump,
  TrainingSample,
} from "./ml-estimator.js";
