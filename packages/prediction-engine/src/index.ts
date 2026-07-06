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
export { calculatePickResult, selectGradingLine } from "./settlement.js";
export type { SettlementResult } from "./settlement.js";
// Historical backfill settlement engine — re-run the FROZEN model on past games
// using ONLY pre-game data, then settle vs the known result (no-lookahead by design).
export {
  assemblePreGameFeatures,
  extractSettlementFacts,
  buildHistoricalOddsInput,
  scoreHistoricalGame,
  settleHistoricalPick,
  replayAndSettleGame,
  backfillPickKey,
  LookaheadLeakError,
  POST_KICKOFF_FIELDS,
} from "./historical-replay.js";
export type {
  RawScheduleRow,
  PreGameFeatures,
  SettlementFacts,
  SettledHistoricalPick,
  PostKickoffField,
} from "./historical-replay.js";
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
  merkleRootFromLeafHashes,
  inclusionProof,
  verifyInclusion,
  canonicalPickPayload,
  parseCanonicalPayload,
} from "./proof-of-record.js";
export type { HashFn, PickRecord, MerkleSibling, MerkleProof } from "./proof-of-record.js";
// Pre-result proof receipt — freeze + verify a tamper-evident per-pick claim.
export { buildPickProofReceipt, verifyPickProofReceipt } from "./pick-proof-receipt.js";
export type { PickProofInput, PickProofReceipt } from "./pick-proof-receipt.js";
// Slate commitment (commit-reveal) — pre-register the whole population; kills cherry-picking.
export {
  buildSlateCommitment,
  provePickInSlate,
  verifyPickInSlate,
  planSlateCommitment,
  dailySlateKey,
} from "./slate-commitment.js";
export type { SlateCommitment, SlateVerification, SlatePlan, SlatePlanInput, SlateLeaf } from "./slate-commitment.js";
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
  reliabilityCurve,
} from "./probability-calibration.js";
export type {
  CalibrationSample,
  IsotonicModel,
  BrierDecomposition,
  ReliabilityBin,
} from "./probability-calibration.js";

// R&D — parametric calibration maps (Platt, Beta) + cross-validated selection
// across calibrator families (the honest fix for "isotonic by fiat"). Composes
// the isotonic/ECE toolkit above; equal-mass ECE for robust small-fold scoring.
export {
  plattScaling,
  betaCalibration,
  equalMassEce,
  selectCalibrator,
} from "./calibration-map.js";
export type {
  CalibrationMethod,
  CalibratorFit,
  PlattModel,
  BetaModel,
  CalibratorScore,
  CalibratorSelection,
} from "./calibration-map.js";

// R&D — linear Thompson sampling contextual bandit (2026-07-02 ZK/ML dump,
// extraction ledger Cluster B). Dark, NOT wired: the future explore/exploit
// primitive for allocation decisions (content variants, estimator trials).
// Must NEVER gate a real-money action without its own founder-approved policy.
export {
  createLinTsState,
  selectAction,
  updateLinTs,
  thetaEstimate,
  MAX_LIN_TS_DIM,
} from "./linear-thompson.js";
export type {
  LinTsOptions,
  LinTsState,
  LinTsDecision,
} from "./linear-thompson.js";

// R&D — tamper-evident pre-registration of the calibration MAP itself (composes
// proof-of-record). NOT zero-knowledge; CommitmentEnvelope is a documented
// future seam only, proof always null. See ZK-ML-DUMP-EXTRACTION-LEDGER.md.
export {
  buildCalibrationCommitment,
  verifyCalibrationCommitment,
  toCommitmentEnvelope,
} from "./calibration-commitment.js";
export type {
  CalibrationCommitmentInput,
  CalibrationCommitment,
  CommitmentEnvelope,
} from "./calibration-commitment.js";

// R&D — anytime-valid CALIBRATION monitoring (the profit ledger's sibling):
// a Ville e-process testing "the stated probabilities are honest" continuously,
// two-sided (over/under-confidence) with a per-region bin layer. Dark, unwired;
// order-sensitive (settlement order required). Proven by adversarial-peeking MC.
export { anytimeCalibrationMonitor } from "./calibration-sequence.js";
export type {
  CalibrationSequenceSample,
  CalibrationSequencePoint,
  CalibrationSequenceResult,
  CalibrationSequenceOptions,
  CalibrationBinDiagnostic,
} from "./calibration-sequence.js";

// R&D — Pedersen homomorphic commitments (the ADDITIVE layer Merkle lacks:
// verify a published aggregate against per-pick commitments without opening the
// picks). Dark, unwired; ADDITIVE to the SHA-256 Merkle layer, never a
// replacement (classical DLOG only, NOT post-quantum). Group verified by
// execution. See ZK-ML-DUMP-EXTRACTION-LEDGER.md wave 7.
export {
  commit,
  openCommitment,
  addCommitments,
  aggregateCommitments,
  commitLedger,
  verifyLedgerAggregate,
  verifyGroup,
  encodeFixedPoint,
  DEFAULT_PEDERSEN_GROUP,
  PEDERSEN_P,
  PEDERSEN_Q,
  PEDERSEN_G,
  PEDERSEN_H,
} from "./pedersen-ledger.js";
export type { PedersenGroup, PedersenCommitment, LedgerCommitmentResult } from "./pedersen-ledger.js";

// Performance CIs for CONTINUOUS returns (ROI/units) — the BCa bootstrap
// counterpart to the Wilson interval (which only covers binomial win rate).
// Deterministic/seeded so a public performance band is reproducible from the
// sealed ledger by anyone. Honest uncertainty for the public loss ledger.
export { bcaCi, percentileCi, bcaMeanCi, percentileMeanCi, studentizedCi, studentizedMeanCi, empiricalBernsteinMeanCi, jackknifeStandardError, meanStandardError, meanStatistic, normalCdf, normalQuantile } from "./performance-ci.js";
export type { PerformanceCi, CiMethod, Statistic } from "./performance-ci.js";
export { bcaCoverageSelfAudit, studentizedCoverageSelfAudit } from "./coverage-self-audit.js";
export type { CoverageSelfAuditResult, CoverageSelfAuditOptions, CoverageVerdict } from "./coverage-self-audit.js";
export { anytimeValidLedger, initAnytimeFold, foldAnytimePick } from "./anytime-ledger.js";
export type {
  AnytimeLedgerResult,
  AnytimeLedgerPoint,
  AnytimeLedgerOptions,
  AnytimeFoldState,
  AnytimeFoldOptions,
} from "./anytime-ledger.js";
export { decomposeClv, informationScore } from "./clv-decomposition.js";
export type { ClvDecompositionItem, ClvDecompositionResult } from "./clv-decomposition.js";

// Player season projection (recency+games-weighted, regressed) and its
// honest backtest vs a carry-forward baseline. Forecasts; surfaced with their
// measured error, not auto-published.
export { projectPlayerSeason, backtestProjections } from "./player-projection.js";
export type { PlayerSeasonLine, PlayerProjection, ProjectionBacktest } from "./player-projection.js";

export {
  DEFAULT_PLAYER_RATE_SHRINKAGE_K,
  playerRateShrinkageWeight,
  buildEmpiricalBayesRatePrior,
  estimateBetaBinomialRatePosterior,
  estimateNormalNormalRatePosterior,
} from "./player-rate-posteriors.js";
export type {
  PlayerRatePosteriorFamily,
  PlayerRatePrior,
  EmpiricalBayesRateObservation,
  EmpiricalBayesPriorOptions,
  BetaBinomialPosteriorInput,
  NormalNormalPosteriorInput,
  PlayerRatePosterior,
} from "./player-rate-posteriors.js";
export {
  DEFAULT_MARKET_ANCHOR_ASSUMPTIONS,
  decomposeMarketAnchor,
  reconcileMarketAnchoredPlayers,
} from "./market-anchored-reconciliation.js";
export type {
  MarketAnchorTeamSide,
  MarketAnchorAssumptions,
  MarketAnchorInput,
  TeamVolumeAnchor,
  MarketAnchoredPlayerInput,
  MarketAnchoredPlayerProjection,
  MarketAnchorConservationCheck,
  MarketAnchoredReconciliation,
} from "./market-anchored-reconciliation.js";
export {
  DEFAULT_GAME_SCRIPT_ASSUMPTIONS,
  buildVegasWinProbabilityPath,
  projectGameScript,
} from "./game-script.js";
export type {
  GameScriptSide,
  GameScriptCheckpoint,
  PaceLabel,
  ScriptLabel,
  GameScriptAssumptions,
  TeamScriptInput,
  GameScriptInput,
  WinProbabilityPathPoint,
  TeamGameScriptProjection,
  GameScriptProjection,
} from "./game-script.js";
export {
  DEFAULT_AVAILABILITY_COX_COEFFICIENTS,
  buildKaplanMeierReturnCurve,
  coxAvailabilityMultiplier,
  projectAvailabilityRole,
} from "./availability-role-tenure.js";
export type {
  AvailabilityStatus,
  PracticeStatus,
  ReturnSpellObservation,
  KaplanMeierReturnPoint,
  RoleTenureObservation,
  AvailabilityCoxCoefficients,
  AvailabilityRoleInput,
  RoleTenureProjection,
  AvailabilityRoleProjection,
} from "./availability-role-tenure.js";
export {
  tweedieDeviance,
  fitTweedieBaseline,
  predictTweedieFantasyPoints,
  buildTemporalProjectionSplits,
  clarkWestTest,
  runTweedieBaselineBacktest,
  adaptiveConformalIntervals,
} from "./tweedie-baseline.js";
export type {
  TweedieProjectionSample,
  TweedieBaselineOptions,
  TweedieStump,
  TweedieBaselineModel,
  TemporalProjectionSplit,
  ProjectionSplitOptions,
  ClarkWestSample,
  ClarkWestReport,
  TweedieBacktestReport,
  AciObservation,
  AciInterval,
} from "./tweedie-baseline.js";
export {
  boundedAbsoluteLoss,
  updateHedgeWeights,
  runEarnedWeightEnsembleBacktest,
} from "./earned-weight-ensemble.js";
export type {
  EnsemblePredictionSample,
  EarnedWeightEnsembleOptions,
  EarnedWeightPrediction,
  EarnedWeightPromotionGate,
  EarnedWeightEnsembleReport,
} from "./earned-weight-ensemble.js";
export {
  buildRollingConformalWindows,
  runRollingMondrianConformal,
} from "./conformal-intervals.js";
export type {
  ConformalProjectionSample,
  RollingConformalOptions,
  RollingConformalWindow,
  MondrianConformalInterval,
  PositionCoverage,
  RollingConformalReport,
} from "./conformal-intervals.js";

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
export { assessCalibrationContract } from "./gse-score/calibration-contract.js";
export type {
  CalibrationContractInput,
  CalibrationContractResult,
  CalibrationContractStatus,
} from "./gse-score/calibration-contract.js";
export { evaluateFeatureContract } from "./gse-score/feature-contract.js";
export type {
  FeatureContractDriver,
  FeatureContractInput,
  FeatureContractResult,
  FeatureContractStatus,
  FeatureSourcePolicy,
  FeatureSourceStatus,
  GseFeatureValue,
} from "./gse-score/feature-contract.js";
export { computeGseActionScore } from "./gse-score/gse-action-score.js";
export type {
  GseActionDecision,
  GseActionDriver,
  GseActionScoreInput,
  GseActionScoreResult,
} from "./gse-score/gse-action-score.js";
export { aggregateModelParliament } from "./gse-score/model-parliament.js";
export type {
  ModelParliamentDriver,
  ModelParliamentInput,
  ModelParliamentResult,
  ModelParliamentStatus,
  ModelVote,
} from "./gse-score/model-parliament.js";
export { computeNoBetStrength } from "./gse-score/no-bet-strength.js";
export type {
  NoBetDecision,
  NoBetDriver,
  NoBetRiskFactor,
  NoBetRiskInput,
  NoBetStrengthInput,
  NoBetStrengthResult,
} from "./gse-score/no-bet-strength.js";
export {
  GSE_METRIC_BIRTH_CERTIFICATES as GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES,
  metricBirthCertificate as proprietaryMetricBirthCertificate,
  requireMetricBirthCertificate as requireProprietaryMetricBirthCertificate,
} from "./metrics/core/metric-birth-certificate.js";
export type {
  GseFormulaClass as ProprietaryFormulaClass,
  GseMetricBirthCertificate as ProprietaryMetricBirthCertificate,
  GseMetricFamily as ProprietaryMetricFamily,
  MetricPublicExposure as ProprietaryMetricPublicExposure,
  MetricValidationMethod as ProprietaryMetricValidationMethod,
} from "./metrics/core/metric-birth-certificate.js";
export {
  GSE_METRIC_ASSETS as GSE_PROPRIETARY_METRIC_ASSETS,
  GSE_METRIC_SOURCE_RIGHTS_POLICIES as GSE_PROPRIETARY_METRIC_SOURCE_RIGHTS_POLICIES,
  evaluateMetricGraduation,
  evaluateMetricPayloadRights as evaluateProprietaryMetricPayloadRights,
  evaluateMetricSourceRights as evaluateProprietaryMetricSourceRights,
  buildMetricResidualRollup as buildProprietaryMetricResidualRollup,
  buildMetricResidualRollups as buildProprietaryMetricResidualRollups,
  metricAsset as proprietaryMetricAsset,
  metricResidualRollupKey as proprietaryMetricResidualRollupKey,
  metricSourceRightsPolicy as proprietaryMetricSourceRightsPolicy,
  requireMetricAsset as requireProprietaryMetricAsset,
  sourceRightsEnvelopeFromPolicy as proprietarySourceRightsEnvelopeFromPolicy,
} from "./metrics/core/index.js";
export type {
  GseMetricAsset as ProprietaryMetricAsset,
  GseModelCard as ProprietaryModelCard,
  MetricApiExposure as ProprietaryMetricApiExposure,
  MetricDriftCard as ProprietaryMetricDriftCard,
  MetricGraduationDecision as ProprietaryMetricGraduationDecision,
  MetricGraduationInput as ProprietaryMetricGraduationInput,
  MetricGraduationStatus as ProprietaryMetricGraduationStatus,
  MetricLicensingStatus as ProprietaryMetricLicensingStatus,
  MetricResidualConfidenceMeaning as ProprietaryMetricResidualConfidenceMeaning,
  MetricResidualMetricId as ProprietaryMetricResidualMetricId,
  MetricResidualPlayInput as ProprietaryMetricResidualPlayInput,
  MetricResidualRollup as ProprietaryMetricResidualRollup,
  MetricResidualRollupExposure as ProprietaryMetricResidualRollupExposure,
  MetricResidualRollupKind as ProprietaryMetricResidualRollupKind,
  MetricPayloadExposure as ProprietaryMetricPayloadExposure,
  MetricPayloadField as ProprietaryMetricPayloadField,
  MetricPayloadFieldKind as ProprietaryMetricPayloadFieldKind,
  MetricPayloadRightsDecision as ProprietaryMetricPayloadRightsDecision,
  MetricPayloadRightsInput as ProprietaryMetricPayloadRightsInput,
  MetricSourceRightsDecision as ProprietaryMetricSourceRightsDecision,
  MetricSourceRightsInput as ProprietaryMetricSourceRightsInput,
  MetricSourceRightsPolicy as ProprietaryMetricSourceRightsPolicy,
  MetricSourceRightsStatus as ProprietaryMetricSourceRightsStatus,
  MetricSourceRightsUse as ProprietaryMetricSourceRightsUse,
  MetricValidationReport as ProprietaryMetricValidationReport,
  SourceRightsEnvelope as ProprietarySourceRightsEnvelope,
} from "./metrics/core/index.js";
export { dataReliabilityIndex } from "./metrics/source/data-reliability-index.js";
export type {
  DataReliabilityGrade,
  DataReliabilityIndex,
  DataReliabilityInput,
} from "./metrics/source/data-reliability-index.js";
export { marketGravityIndex as gseMarketGravityIndex } from "./metrics/market/market-gravity-index.js";
export type {
  MarketGravityIndex as GseMarketGravityIndex,
  MarketGravityInput as GseMarketGravityInput,
  MarketGravitySignal as GseMarketGravitySignal,
} from "./metrics/market/market-gravity-index.js";
export { expectedCompletionGse } from "./metrics/passing/expected-completion.js";
export type {
  ExpectedCompletionInput,
  ExpectedCompletionMetric,
} from "./metrics/passing/expected-completion.js";
export { receiverDifficultyIndex } from "./metrics/receiving/receiver-difficulty.js";
export type {
  ReceiverDifficultyInput,
  ReceiverDifficultyMetric,
} from "./metrics/receiving/receiver-difficulty.js";
export { expectedYacGse } from "./metrics/receiving/expected-yac.js";
export type {
  ExpectedYacInput,
  ExpectedYacMetric,
} from "./metrics/receiving/expected-yac.js";
export { yacCreationGse } from "./metrics/receiving/yac-creation.js";
export type {
  YacCreationInput,
  YacCreationMetric,
} from "./metrics/receiving/yac-creation.js";
export { rushEnvironmentIndex } from "./metrics/rushing/rush-environment-index.js";
export type {
  RushEnvironmentIndex,
  RushEnvironmentInput,
} from "./metrics/rushing/rush-environment-index.js";
export { expectedRushYardsGse } from "./metrics/rushing/expected-rush-yards.js";
export type {
  ExpectedRushYardsInput,
  ExpectedRushYardsMetric,
} from "./metrics/rushing/expected-rush-yards.js";
export { rushOverExpectedGse } from "./metrics/rushing/rush-over-expected.js";
export type {
  RushOverExpectedInput,
  RushOverExpectedMetric,
} from "./metrics/rushing/rush-over-expected.js";
export { gseSignalScore } from "./metrics/decision/gse-signal-score.js";
export type {
  GseSignalGrade,
  GseSignalScore,
  GseSignalScoreInput,
} from "./metrics/decision/gse-signal-score.js";
export {
  GSE_NFL_METRIC_BIRTH_CERTIFICATES,
  metricBirthCertificate,
} from "./nfl/metric-birth-certificate.js";
export type {
  GseMetricBirthCertificate,
  GseMetricFamily,
  MetricPublicExposure,
} from "./nfl/metric-birth-certificate.js";
export {
  clamp as metricClamp,
  clamp01 as metricClamp01,
  normalizeClamped as metricNormalizeClamped,
  sigmoid as metricSigmoid,
  sortedDrivers as metricSortedDrivers,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  weightedMean as metricWeightedMean,
} from "./nfl/metric-core.js";
export type {
  MetricDirection,
  MetricDriver,
  MetricLifecycleStatus,
  MetricSourcePolicy,
  MetricSourceStatus,
  MetricUncertaintyBand,
} from "./nfl/metric-core.js";
export { gseExpectedCompletion } from "./nfl/expected-completion.js";
export type { GseExpectedCompletion, GseExpectedCompletionInput } from "./nfl/expected-completion.js";
export { gseReceiverDifficulty } from "./nfl/receiver-difficulty.js";
export type { GseReceiverDifficulty, GseReceiverDifficultyInput } from "./nfl/receiver-difficulty.js";
export { gseExpectedYac } from "./nfl/expected-yac.js";
export type { GseExpectedYac, GseExpectedYacInput } from "./nfl/expected-yac.js";
export { gseRushEnvironment } from "./nfl/rush-environment.js";
export type { GseRushEnvironment, GseRushEnvironmentInput } from "./nfl/rush-environment.js";
export { gseQbBurden } from "./nfl/qb-burden.js";
export type { GseQbBurden, GseQbBurdenInput } from "./nfl/qb-burden.js";
export { gseRoleVolatility } from "./nfl/role-volatility.js";
export type { GseRoleVolatility, GseRoleVolatilityInput } from "./nfl/role-volatility.js";
export {
  populationStabilityIndex,
  evaluateMetricDrift,
} from "./nfl/metric-drift.js";
export type { MetricDriftInput, MetricDriftResult, MetricDriftStatus } from "./nfl/metric-drift.js";
export { validateGseMetric } from "./nfl/metric-validation.js";
export type {
  GseMetricValidationInput,
  GseMetricValidationResult,
  GseMetricValidationStatus,
} from "./nfl/metric-validation.js";
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

export { reduceLadder, RUNG_REQUIREMENTS } from "./ladder/reduce.js";
export { fanoutGameSettledHeartbeat } from "./ladder/heartbeat.js";
export type { GameSettledFanoutInput, GameSettledFanoutResult } from "./ladder/heartbeat.js";
export {
  nflverseSchedulesToReplayGames,
  replayHistoricalWeek,
  buildPurgedEmbargoedSplits,
  runMarketTotalReplayBacktest,
} from "./replay-harness.js";
export type {
  NflverseScheduleRow,
  ReplayGame,
  HistoricalWeekTarget,
  HistoricalWeekReplay,
  ReplaySplitOptions,
  WalkForwardSplit,
  ReplayBacktestReport,
} from "./replay-harness.js";

// R&D — SimHash (random-hyperplane LSH, Charikar) angular-similarity signatures
// with inverse-magnitude multi-probe querying. Dark, NOT wired into live scoring:
// the approximate-nearest-neighbor primitive for future "closest historical comp /
// games like this one" surfaces. See ZK-ML-DUMP-EXTRACTION-LEDGER.md, Cluster B.
export {
  buildSimhashModel,
  signature,
  hammingDistance,
  estimatedCosine,
  multiProbeSignatures,
  buildSimhashIndex,
  querySimhashIndex,
} from "./simhash.js";
export type {
  SimhashModel,
  SimhashSignature,
  SimhashIndex,
  SimhashQueryOptions,
} from "./simhash.js";
