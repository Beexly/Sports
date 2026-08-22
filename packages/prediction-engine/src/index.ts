// allow: SIZE_OK - package-root export barrel kept stable for downstream imports.
export {
  scoreGame,
  scoreGames,
  americanToImpliedProbability,
  removeVig,
  averageAmericanPrices,
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
export { calculatePickResult, selectGradingLine, selectionIsHomeSide } from "./settlement.js";
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
// Kalshi exchange, FPI, ClubElo, Dixon–Coles, …) diverge from the sportsbook fair
// value AND are not contradicted by a referee. Wired into moneyline scoring via
// context.independentFairValues + deriveRankingProbability (MODEL_VERSION ≥ v5.2.0).
// Pure functions; no I/O. Founder-gated only for map activation / floors, not assessEdge.
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
  CONVICTION_MIN_CLV_SAMPLE,
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
  BuildEvidenceReadinessMatrixInput,
  EdgeLabVerdictInput,
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
// Skellam margin / cover — hockey/baseball/soccer (same sport gate as Poisson).
// Live: source "skellam_cover" on SPREAD rankingP only. NFL key-numbers are separate.
export {
  skellamPmf,
  skellamCdf,
  skellamPmfGrid,
  skellamCoverProbabilities,
  skellamCoverFairValue,
  isSkellamValidSport,
  DEFAULT_SKELLAM_MAX_GOALS,
  SKELLAM_SPORT_PREFIXES,
  SKELLAM_COVER_SOURCE,
} from "./skellam.js";
export type {
  SkellamCoverInput,
  SkellamCoverProbabilities,
  SkellamCoverFairValue,
  SkellamPmfPoint,
} from "./skellam.js";
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
// Dixon–Coles τ(ρ) soccer independent (market-free; TeamGameLog λ + low-score corr).
export {
  dixonColesTau,
  jointScoreMatrixDixonColes,
  dixonColesMoneylineProbabilities,
  dixonColesIndependentFairValue,
  isDixonColesValidSport,
  clampDixonColesRho,
  DEFAULT_DIXON_COLES_RHO,
} from "./dixon-coles.js";
export type {
  DixonColesFairValueInput,
  DixonColesFairValue,
} from "./dixon-coles.js";
export {
  deriveRankingProbability,
} from "./ranking-prob.js";
export type {
  RankingProbSource,
  RankingProbResult,
} from "./ranking-prob.js";
export {
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
  eloHomeWinFromRatings,
} from "./elo-from-results.js";
export type { EloResultGame } from "./elo-from-results.js";
// ESPN PowerIndex → independent win probability (logistic). Model-fair only.
export {
  powerIndexToWinProbs,
  powerIndexToIndependentFairValue,
  sigmoidMargin,
  resolvePowerIndexSport,
  POWERINDEX_MARGIN_SCALE,
  POWERINDEX_HFA,
} from "./espn-powerindex.js";
export type {
  PowerIndexSport,
  PowerIndexLogisticInput,
  PowerIndexLogisticResult,
} from "./espn-powerindex.js";
// MLB / general standings win% → independent ML fair value.
export {
  standingsWinPctToWinProbs,
  standingsWinPctToIndependentFairValue,
} from "./standings-strength.js";
export type { StandingsStrengthInput } from "./standings-strength.js";
// NFL opponent-adjusted EPA → independent ML fair value.
export {
  nflEpaToWinProbs,
  nflEpaToIndependentFairValue,
  NFL_EPA_MARGIN_SCALE,
  NFL_EPA_HFA,
  NFL_EPA_MIN_GAMES,
} from "./nfl-epa-fair-value.js";
export type { NflEpaFairValueInput } from "./nfl-epa-fair-value.js";
// R&D — probability calibration toolkit (isotonic/PAVA, Brier decomposition, ECE).
// NOT wired into live scoring; built for the future human-gated MODEL_VERSION
// calibration that turns the confidence score into a calibrated win probability.
export {
  isotonicCalibration,
  centeredIsotonicCalibration,
  countDistinctPredictions,
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  timeHoldoutSplit,
  selectedSliceEce,
} from "./probability-calibration.js";
export type {
  CalibrationSample,
  IsotonicModel,
  BrierDecomposition,
  ReliabilityBin,
  TimestampedCalibrationSample,
  TimeHoldoutSplit,
  SelectedSliceEceArgs,
  SelectedSliceEceResult,
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

// R&D — temperature scaling (one-parameter overconfidence softener). Not live.
export { fitTemperature, applyTemperature } from "./temperature-scaling.js";
export type { TemperatureModel } from "./temperature-scaling.js";

// R&D — log-loss optimization + isotonic diagnostics (offline; apply OFF).
export {
  meanLogLossAtTemperature,
  temperatureLogLossGradient,
  fitTemperatureNewton,
  diagnoseLogLoss,
  holdoutLogLoss,
  logLoss,
  meanLogLoss,
} from "./log-loss-optimize.js";
export type { LogLossSliceReport } from "./log-loss-optimize.js";
export { debugIsotonicCalibration } from "./isotonic-debug.js";
export type { IsotonicDebugReport } from "./isotonic-debug.js";
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
  GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES as GSE_PROPRIETARY_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES,
  evaluateMetricGraduation,
  evaluateMetricPayloadRights as evaluateProprietaryMetricPayloadRights,
  evaluateMetricSourceRights as evaluateProprietaryMetricSourceRights,
  filterMetricPayloadEnvelope as filterProprietaryMetricPayloadEnvelope,
  buildMetricResidualRollup as buildProprietaryMetricResidualRollup,
  buildMetricResidualRollups as buildProprietaryMetricResidualRollups,
  metricAsset as proprietaryMetricAsset,
  metricResidualRollupKey as proprietaryMetricResidualRollupKey,
  metricSourceRightsPolicy as proprietaryMetricSourceRightsPolicy,
  generateMetricDriftCard as generateProprietaryMetricDriftCard,
  generateMetricModelCard as generateProprietaryMetricModelCard,
  generateAllShadowMetricEvidenceFixtureCards as generateAllProprietaryShadowMetricEvidenceFixtureCards,
  generateShadowMetricEvidenceFixtureCards as generateProprietaryShadowMetricEvidenceFixtureCards,
  renderAllShadowMetricEvidenceReportsMarkdown as renderAllProprietaryShadowMetricEvidenceReportsMarkdown,
  renderShadowMetricEvidenceReportIndexMarkdown as renderProprietaryShadowMetricEvidenceReportIndexMarkdown,
  renderShadowMetricEvidenceReportMarkdown as renderProprietaryShadowMetricEvidenceReportMarkdown,
  adaptHistoricalValidationRecord as adaptProprietaryHistoricalValidationRecord,
  adaptHistoricalDistributionRecord as adaptProprietaryHistoricalDistributionRecord,
  conformalUncertaintyWidth as proprietaryConformalUncertaintyWidth,
  conformalUncertaintyWidthFromReport as proprietaryConformalUncertaintyWidthFromReport,
  reviewHistoricalValidationSources as reviewProprietaryHistoricalValidationSources,
  reviewHistoricalDistributionPayload as reviewProprietaryHistoricalDistributionPayload,
  runHistoricalDistributionAdapterFixtures as runProprietaryHistoricalDistributionAdapterFixtures,
  runHistoricalDistributionAdapterRecords as runProprietaryHistoricalDistributionAdapterRecords,
  runHistoricalValidationAdapterFixtures as runProprietaryHistoricalValidationAdapterFixtures,
  runHistoricalValidationAdapterRecords as runProprietaryHistoricalValidationAdapterRecords,
  summarizeHistoricalDistributionAdapterResults as summarizeProprietaryHistoricalDistributionAdapterResults,
  summarizeHistoricalValidationAdapterResults as summarizeProprietaryHistoricalValidationAdapterResults,
  runComposedDecisionMetricPayloadFixtures as runProprietaryComposedDecisionMetricPayloadFixtures,
  runDecisionWindowValidationSplits as runProprietaryDecisionWindowValidationSplits,
  runMetricValidationSplitFixtures as runProprietaryMetricValidationSplitFixtures,
  runRoleStabilityValidationSplits as runProprietaryRoleStabilityValidationSplits,
  summarizeComposedDecisionMetricPayloadFixtures as summarizeProprietaryComposedDecisionMetricPayloadFixtures,
  summarizeMetricValidationSplitResults as summarizeProprietaryMetricValidationSplitResults,
  COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES as PROPRIETARY_COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
  DECISION_WINDOW_VALIDATION_SPLITS as PROPRIETARY_DECISION_WINDOW_VALIDATION_SPLITS,
  HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES as PROPRIETARY_HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES,
  HISTORICAL_VALIDATION_ADAPTER_FIXTURES as PROPRIETARY_HISTORICAL_VALIDATION_ADAPTER_FIXTURES,
  metricSourceRightsPoliciesFromRegistry as proprietaryMetricSourceRightsPoliciesFromRegistry,
  metricSourceRightsPolicyFromRegistryEntry as proprietaryMetricSourceRightsPolicyFromRegistryEntry,
  ROLE_STABILITY_VALIDATION_SPLITS as PROPRIETARY_ROLE_STABILITY_VALIDATION_SPLITS,
  requireMetricAsset as requireProprietaryMetricAsset,
  SHADOW_METRIC_EVIDENCE_FIXTURES as PROPRIETARY_SHADOW_METRIC_EVIDENCE_FIXTURES,
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
  MetricDriftCardInput as ProprietaryMetricDriftCardInput,
  MetricDriftCheck as ProprietaryMetricDriftCheck,
  MetricDriftDirection as ProprietaryMetricDriftDirection,
  MetricModelCardInput as ProprietaryMetricModelCardInput,
  ComposedDecisionMetricPayloadFixture as ProprietaryComposedDecisionMetricPayloadFixture,
  ComposedDecisionMetricPayloadFixtureId as ProprietaryComposedDecisionMetricPayloadFixtureId,
  ComposedDecisionMetricPayloadFixtureResult as ProprietaryComposedDecisionMetricPayloadFixtureResult,
  ComposedDecisionMetricPayloadFixtureSummary as ProprietaryComposedDecisionMetricPayloadFixtureSummary,
  DecisionWindowValidationSplit as ProprietaryDecisionWindowValidationSplit,
  MetricValidationSplitResult as ProprietaryMetricValidationSplitResult,
  MetricValidationSplitSummary as ProprietaryMetricValidationSplitSummary,
  RoleStabilityValidationSplit as ProprietaryRoleStabilityValidationSplit,
  ShadowEvidenceMetricId as ProprietaryShadowEvidenceMetricId,
  ShadowMetricEvidenceMarkdownReport as ProprietaryShadowMetricEvidenceMarkdownReport,
  HistoricalDecisionWindowRecord as ProprietaryHistoricalDecisionWindowRecord,
  HistoricalCalibrationDistributionRecord as ProprietaryHistoricalCalibrationDistributionRecord,
  HistoricalConformalUncertaintyDistributionRecord as ProprietaryHistoricalConformalUncertaintyDistributionRecord,
  HistoricalDriftPressureDistributionRecord as ProprietaryHistoricalDriftPressureDistributionRecord,
  HistoricalDistributionAdapterResult as ProprietaryHistoricalDistributionAdapterResult,
  HistoricalDistributionAdapterStatus as ProprietaryHistoricalDistributionAdapterStatus,
  HistoricalDistributionAdapterSummary as ProprietaryHistoricalDistributionAdapterSummary,
  HistoricalDistributionMetricId as ProprietaryHistoricalDistributionMetricId,
  HistoricalDistributionPayloadProfile as ProprietaryHistoricalDistributionPayloadProfile,
  HistoricalDistributionRecord as ProprietaryHistoricalDistributionRecord,
  ConformalUncertaintyIntervalInput as ProprietaryConformalUncertaintyIntervalInput,
  ConformalUncertaintyWidthBand as ProprietaryConformalUncertaintyWidthBand,
  ConformalUncertaintyWidthInput as ProprietaryConformalUncertaintyWidthInput,
  ConformalUncertaintyWidthMetric as ProprietaryConformalUncertaintyWidthMetric,
  ConformalUncertaintyWidthSourcePosture as ProprietaryConformalUncertaintyWidthSourcePosture,
  HistoricalMarketMirageRecord as ProprietaryHistoricalMarketMirageRecord,
  HistoricalPortfolioDistributionRecord as ProprietaryHistoricalPortfolioDistributionRecord,
  HistoricalRoleStabilityRecord as ProprietaryHistoricalRoleStabilityRecord,
  HistoricalValidationAdapterResult as ProprietaryHistoricalValidationAdapterResult,
  HistoricalValidationAdapterStatus as ProprietaryHistoricalValidationAdapterStatus,
  HistoricalValidationAdapterSummary as ProprietaryHistoricalValidationAdapterSummary,
  HistoricalValidationMetricId as ProprietaryHistoricalValidationMetricId,
  HistoricalValidationRecord as ProprietaryHistoricalValidationRecord,
  HistoricalValidationSourceReview as ProprietaryHistoricalValidationSourceReview,
  ShadowMetricEvidenceFixture as ProprietaryShadowMetricEvidenceFixture,
  ShadowMetricEvidenceFixtureCards as ProprietaryShadowMetricEvidenceFixtureCards,
  ValidationSplitMetricId as ProprietaryValidationSplitMetricId,
  ValidationSplitStatus as ProprietaryValidationSplitStatus,
  MetricResidualConfidenceMeaning as ProprietaryMetricResidualConfidenceMeaning,
  MetricResidualMetricId as ProprietaryMetricResidualMetricId,
  MetricResidualPlayInput as ProprietaryMetricResidualPlayInput,
  MetricResidualRollup as ProprietaryMetricResidualRollup,
  MetricResidualRollupExposure as ProprietaryMetricResidualRollupExposure,
  MetricResidualRollupKind as ProprietaryMetricResidualRollupKind,
  MetricPayloadEnvelope as ProprietaryMetricPayloadEnvelope,
  MetricPayloadEnvelopeField as ProprietaryMetricPayloadEnvelopeField,
  MetricPayloadEnvelopeInput as ProprietaryMetricPayloadEnvelopeInput,
  MetricPayloadEnvelopeMeta as ProprietaryMetricPayloadEnvelopeMeta,
  MetricPayloadExposure as ProprietaryMetricPayloadExposure,
  MetricPayloadField as ProprietaryMetricPayloadField,
  MetricPayloadFieldKind as ProprietaryMetricPayloadFieldKind,
  MetricPayloadRightsDecision as ProprietaryMetricPayloadRightsDecision,
  MetricPayloadRightsInput as ProprietaryMetricPayloadRightsInput,
  MetricSourceRightsDecision as ProprietaryMetricSourceRightsDecision,
  MetricSourceRightsInput as ProprietaryMetricSourceRightsInput,
  MetricSourceRightsPolicy as ProprietaryMetricSourceRightsPolicy,
  MetricSourceRightsRegistryEntry as ProprietaryMetricSourceRightsRegistryEntry,
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
export { staleLineRiskScore as gseStaleLineRiskScore } from "./metrics/market/stale-line-risk-score.js";
export type {
  StaleLineRiskBand as GseStaleLineRiskBand,
  StaleLineRiskInput as GseStaleLineRiskInput,
  StaleLineRiskScore as GseStaleLineRiskScore,
} from "./metrics/market/stale-line-risk-score.js";
export { marketMirageScore as gseMarketMirageScore } from "./metrics/market/market-mirage-score.js";
export type {
  MarketMirageBand as GseMarketMirageBand,
  MarketMirageScore as GseMarketMirageScore,
  MarketMirageScoreInput as GseMarketMirageScoreInput,
  MarketMirageSourcePosture as GseMarketMirageSourcePosture,
} from "./metrics/market/market-mirage-score.js";
export { expectedCompletionGse } from "./metrics/passing/expected-completion.js";
export type {
  ExpectedCompletionInput,
  ExpectedCompletionMetric,
} from "./metrics/passing/expected-completion.js";
export { qbBurdenIndex } from "./metrics/passing/qb-burden-index.js";
export type {
  QbBurdenBand,
  QbBurdenIndexInput,
  QbBurdenIndexMetric,
  QbBurdenSourcePosture,
} from "./metrics/passing/qb-burden-index.js";
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
export { roleVolatilityIndex } from "./metrics/role/role-volatility-index.js";
export type {
  RoleVolatilityBand,
  RoleVolatilityIndexInput,
  RoleVolatilityIndexMetric,
  RoleVolatilitySourcePosture,
} from "./metrics/role/role-volatility-index.js";
export { calibrationIntegrityGrade } from "./metrics/calibration/calibration-integrity-grade.js";
export type {
  CalibrationIntegrityGradeInput,
  CalibrationIntegrityGradeMetric,
  CalibrationIntegrityLetter,
  CalibrationIntegritySourcePosture,
} from "./metrics/calibration/calibration-integrity-grade.js";
export { driftPressureIndex } from "./metrics/calibration/drift-pressure-index.js";
export type {
  DriftPressureBand,
  DriftPressureIndexInput,
  DriftPressureIndexMetric,
  DriftPressureSourcePosture,
} from "./metrics/calibration/drift-pressure-index.js";
export {
  conformalUncertaintyWidth,
  conformalUncertaintyWidthFromReport,
} from "./metrics/calibration/conformal-uncertainty-width.js";
export type {
  ConformalUncertaintyIntervalInput,
  ConformalUncertaintyWidthBand,
  ConformalUncertaintyWidthInput,
  ConformalUncertaintyWidthMetric,
  ConformalUncertaintyWidthSourcePosture,
} from "./metrics/calibration/conformal-uncertainty-width.js";
export { noBetPressureMetric } from "./metrics/decision/no-bet-pressure.js";
export type {
  NoBetPressureBand,
  NoBetPressureInput,
  NoBetPressureMetric,
  NoBetPressureSourcePosture,
} from "./metrics/decision/no-bet-pressure.js";
export { playableWindowScore } from "./metrics/decision/playable-window-score.js";
export type {
  PlayableWindowBand,
  PlayableWindowScoreInput,
  PlayableWindowScoreMetric,
  PlayableWindowSourcePosture,
} from "./metrics/decision/playable-window-score.js";
export { portfolioFitScore } from "./metrics/decision/portfolio-fit-score.js";
export type {
  PortfolioFitBand,
  PortfolioFitScoreInput,
  PortfolioFitScoreMetric,
  PortfolioFitSourcePosture,
} from "./metrics/decision/portfolio-fit-score.js";
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
export {
  NFL_KEY_NUMBERS,
  NFL_SIGNED_KEY_NUMBERS,
  MIN_SAMPLES_FOR_MARGIN_MIXTURE,
  continuousDensity,
  coverProbability,
  fitNflMarginMixture,
  homeCoverProbability,
  keyMassAt,
  marginsFromTeamGameRecords,
  mixtureCdf,
} from "./nfl/margin-mixture-model.js";
export type {
  CoverProbability,
  KeyNumberMass,
  MarginMixtureVerdict,
  NflMarginMixtureFit,
} from "./nfl/margin-mixture-model.js";
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

// Exact binomial interval — conservative counterpart to Wilson. Used by the
// public performance / calibration CI layer so a headline rate is never a
// bare point estimate.
export {
  clopperPearsonLowerBound,
  clopperPearsonInterval,
} from "./edge-lab/stats.js";
export type { ClopperPearsonInterval } from "./edge-lab/stats.js";

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
  powerDevig,
  impliedFromDecimalOdds,
  type ShinResult,
  type PowerDevigResult,
} from "./shin-devig.js";
export {
  conformalMarginSet,
  marginSetCovers,
  splitConformalQuantile,
  MIN_SAMPLES_MARGIN_SET,
  DEFAULT_MARGIN_SET_ALPHA,
} from "./conformal-margin-set.js";
export type { MarginCalibrationRow, MarginPredictionSet } from "./conformal-margin-set.js";
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

// Expected-metrics engine — our OWN expected-value metrics (CPOE / RYOE / xYAC)
// computed from public play-by-play, proven against Next Gen Stats. Pure,
// deterministic, fit-on-load; additive and dark. See docs/math/GSE_EXPECTED_METRICS.md.
export {
  fitRidge,
  predictRidge,
  fitLogistic,
  predictLogistic,
  computeExpectedMetricSchemaHash,
  rollupByPlayer,
  fitExpectedCompletionModel,
  predictCompletionProbability,
  computeCpoe,
  EXPECTED_COMPLETION_FEATURE_KEYS,
  EXPECTED_COMPLETION_MODEL_VERSION,
  MIN_DROPBACKS_TO_FIT,
  DEFAULT_MIN_PASSER_ATTEMPTS,
  fitExpectedRushModel,
  predictExpectedRushYards,
  computeRyoe,
  EXPECTED_RUSH_FEATURE_KEYS,
  EXPECTED_RUSH_MODEL_VERSION,
  MIN_RUSHES_TO_FIT,
  DEFAULT_MIN_RUSHER_ATTEMPTS,
  fitExpectedYacModel,
  predictExpectedYac,
  computeYacOverExpected,
  EXPECTED_YAC_FEATURE_KEYS,
  EXPECTED_YAC_MODEL_VERSION,
  MIN_CATCHES_TO_FIT,
  DEFAULT_MIN_RECEIVER_CATCHES,
  buildCalibrationReport,
  graduationVerdict,
  DEFAULT_GRADUATION_THRESHOLDS,
  fitExpectedPointsModel,
  predictScoreDistribution,
  predictExpectedPoints,
  expectedPointsAdded,
  deriveNextScore,
  EXPECTED_POINTS_FEATURE_KEYS,
  EXPECTED_POINTS_MODEL_VERSION,
  EP_OUTCOMES,
  EP_OUTCOME_VALUES,
  EP_REQUIRED_OUTCOMES,
  MIN_EP_PLAYS_TO_FIT,
  EP_DEFAULT_HALF_SECONDS,
  fitWinProbabilityModel,
  predictWinProbability,
  winProbabilityAdded,
  WIN_PROBABILITY_FEATURE_KEYS,
  WIN_PROBABILITY_MODEL_VERSION,
  MIN_WP_PLAYS_TO_FIT,
  isSuccessfulPlay,
  successRateByTeam,
  successRateByPlayer,
  successRateByDown,
  successRateBySituation,
  SUCCESS_RATE_MODEL_VERSION,
  SUCCESS_YARDAGE_FRACTION,
  buildDrives,
  DRIVES_MODEL_VERSION,
  buildEpCalibration,
  buildWpCalibration,
} from "./expected-metrics/index.js";
export type {
  LinearModel,
  LogisticModel,
  LogisticFitOptions,
  FeatureScaler,
  ExpectedMetricProvenance,
  PlayerExpectedMetric,
  PlayerPlayOutcome,
  RollupOptions,
  DropbackPlay,
  ExpectedCompletionModel,
  RushPlay,
  ExpectedRushModel,
  CatchPlay,
  ExpectedYacModel,
  GroundTruthPoint,
  CalibrationReport,
  GraduationVerdict,
  GraduationThresholds,
  GraduationResult,
  EpPlay,
  NextScoreOutcome,
  ExpectedPointsModel,
  RawScoringContext,
  WpPlay,
  WinProbabilityModel,
  SuccessPlay,
  SuccessRateSplit,
  DrivePlay,
  Drive,
  DriveResult,
} from "./expected-metrics/index.js";

// Model Promotion Gate — pure eligibility evaluator (paired-Brier EB-LCB +
// CLV non-inferiority + walk-forward integrity). DARK, and deliberately NOT
// re-exported from this barrel: window-hash.ts uses node:crypto, and this
// barrel is imported by CLIENT components (e.g. simulation-cloud.tsx ->
// lib/sim/score-distribution.ts), so a barrel export drags node:crypto into
// the browser bundle and breaks the Next build (verified on Vercel deploy
// dpl_CgarwjnVmeV7). The future server-side consumer (the founder-registered
// trial harness) imports the submodule path directly:
//   import { evaluatePromotion } from "@sports/prediction-engine/src/promotion/index.js"
// See docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md.

// Honesty surface — product No-Bet codes, Phase 0 placebo, Glass Ledger receipts
// (namespaced Product* to avoid colliding with gse-score NoBetDecision)
export {
  evaluateProductNoBet,
  PRODUCT_NO_BET_COPY,
  type ProductNoBetCode,
  type ProductNoBetEvidence,
  type ProductNoBetResult,
} from "./honesty/no-bet-gate.js";
export {
  runShuffledTimePlacebo,
  shuffleInPlace,
  mulberry32,
  type PlaceboReport,
  type PlaceboTrial,
  type PlaceboPair,
} from "./honesty/placebo-leak.js";

export {
  fingerprintPayload,
  buildReceipt,
  chainReceipts,
  recomputeChain,
  ledgerHead,
  type PickReceipt,
  type LedgerHead,
} from "./honesty/glass-receipts.js";
export { compareDevigMethods } from "./honesty/devig-method-compare.js";
export type {
  DevigMethodCompare,
  DevigMethodName,
  MethodFair,
  TwoWayBook,
} from "./honesty/devig-method-compare.js";
export {
  commitPick,
  revealPick,
  publicCommitPick,
  isPublicPicksEnabled,
} from "./honesty/commit-reveal.js";
export type { PickCommitment, PickCommitmentBody } from "./honesty/commit-reveal.js";

// Fire authority — dual-asOf + cal + LIVE_BOARD + selective composition (pure)
export {
  evaluateFireAuthority,
  topologyScore,
  FIRE_DEMO_SCENARIOS,
  type FireAuthorityInput,
  type FireAuthorityDecision,
  type FireRefuseReason,
} from "./edge-lab/fire-authority.js";

// Multiple-testing honesty — BH-FDR + append-only trials registry (Phase-3 gate)
export {
  TRIALS_GENESIS_HASH,
  createTrialsRegistry,
  verifyTrialEntries,
  benjaminiHochberg,
  TrialsRegistryError,
} from "./edge-lab/trials-registry.js";
export type {
  TrialKind,
  TrialOutcome,
  TrialInput,
  TrialEntry,
  TrialsRegistry,
  BhResult,
} from "./edge-lab/trials-registry.js";

// Unified prefire — run BEFORE selective FIRE (cheap topology refuse)
export {
  evaluateUnifiedPrefire,
  composePrefireWithSelective,
  type UnifiedPrefireInput,
  type UnifiedPrefireDecision,
  type PrefireRefuseReason,
} from "./edge-lab/unified-prefire.js";

// Fair Skill Brier (Wang et al.): BrS − (B−1)/B so binary ATD and K-way
// yards ladders are comparable. Not Murphy BSS vs grouped climatology.
export {
  FAIR_SKILL_BRIER_METHOD_TAG,
  indifferenceBrier,
  originalBrier,
  originalBrierFromBinaryUnit,
  fairSkillBrier,
  meanFairSkillBrier,
} from "./edge-lab/fair-skill-brier.js";

// Grouped climatology — score the props specialist against position×week
// naive rates, not the pooled dummy. Positive BSS vs grouped is skill;
// beating pooled while losing to grouped is grouping-loss, not edge.
export {
  GROUPED_CLIMATOLOGY_METHOD_TAG,
  DEFAULT_MIN_CELL_N,
  brierMean,
  brierSkillScore,
  fitGroupedClimatology,
  predictGrouped,
  scoreAgainstClimatology,
} from "./edge-lab/grouped-climatology.js";
export type {
  BinaryOutcome,
  ClimatologySource,
  ClimTrainRow,
  CellRate,
  GroupedClimatology,
  GroupedPrediction,
  ScoredCase,
  ClimatologyScorecard,
} from "./edge-lab/grouped-climatology.js";

// Market consensus q (Bradley-Terry futures + logit blend). q only — never
// re-anchor independent p toward the market (Mania 3rd-place α=0.90 is a
// Brier win, not an edge).
export {
  bradleyTerryPair,
  consensusMarketQ,
  marketReanchorResidual,
} from "./edge-lab/market-consensus-q.js";
export type { LabeledQ, ConsensusQ, ReanchorResidual } from "./edge-lab/market-consensus-q.js";

// Hierarchical-Bayes props specialist (one-level Gamma-Poisson) plus nested
// player → position → league EB with empirical 1/n observation-noise
// calibration, market-priced e = p − q (never κ = |2p−1|), and the
// observation-process layer: mean-dependent φ(μ), shrunken QL, idcap,
// recency discount, regime-shift band, expected surplus.
export {
  fitGroupPrior,
  posteriorRate,
  probOver as propsHbProbOver,
  probOverContinuous,
  shrinkageReport,
} from "./edge-lab/props-hb.js";
export type {
  RateSample,
  GammaPrior,
  GammaPosterior,
  ShrinkageRow,
} from "./edge-lab/props-hb.js";
export {
  gammaFromMoments,
  fitVarianceDecomposition,
  fitGroupPriorCalibrated,
  scaleObservation,
  posteriorRateCalibrated,
  fitNestedPriors,
  fitNestedPriorsLeaveOneOut,
  priorForGroup,
  scoreNestedPlayer,
  shrinkageReportNested,
  fitNestedByStat,
} from "./edge-lab/props-hb-nested.js";
export type {
  GroupedRateSample,
  VarianceMethod,
  VarianceDecomposition,
  NestedGroupPrior,
  NestedFit,
  NestedShrinkageRow,
} from "./edge-lab/props-hb-nested.js";
export {
  PROPS_HB_SOURCE,
  pricePropAgainstMarket,
  confidenceFromPOver,
} from "./edge-lab/props-priced-edge.js";
export type {
  PropBookQuote,
  PricedPropEdge,
  UnpricedPropEdge,
  PropEdgeResult,
} from "./edge-lab/props-priced-edge.js";
export {
  fitMeanVariance,
  fitMeanVarianceFromGameLogs,
  phiForMean,
  shrinkQuasiLikelihood,
  // scaleObservation is NOT re-exported here — props-hb-nested.js already
  // exports a function of that name with identical semantics (divide
  // total/games by clamped φ). Both modules keep their own local copy for
  // internal use; the barrel surfaces exactly one to avoid a duplicate-export
  // compile error.
  posteriorRateObs,
  posteriorRateMeanVar,
  capGameLog,
  discountGameLog,
  aggregateGameLog,
  regimeShift,
  expectedExcess,
} from "./edge-lab/props-hb-obs.js";
export type {
  CountFamily,
  MeanVarianceFit,
  GameCount,
  PlayerGameLog,
  GameLogOptions,
  RegimeDirection,
  RegimeShift,
} from "./edge-lab/props-hb-obs.js";
export {
  CATCH_HB_METHOD_TAG,
  fitCatchPrior,
  posteriorCatch,
  betaBinomialProbOver,
  probOverReceptions,
  scoreReceptionsOver,
} from "./edge-lab/props-hb-catch.js";
export type { CatchSample, BetaPrior, BetaPosterior } from "./edge-lab/props-hb-catch.js";

// Kaunitz X1 math — named-book Shin q ≥ τ below the cross-book median.
// Log-only; priced:false. Not wired into process-sport (ox-alpha owns q ingest).
export {
  KAUNITZ_METHOD_TAG,
  DEFAULT_KAUNITZ_TAU,
  MIN_KAUNITZ_BOOKS,
  scanKaunitzOutliers,
} from "./edge-lab/kaunitz-outlier.js";
export type {
  KaunitzBookQuote,
  KaunitzBookRead,
  KaunitzFlag,
  KaunitzScan,
} from "./edge-lab/kaunitz-outlier.js";

// Rushing yards given attempts, not calendar games. Independent p.
export {
  RUSH_HB_METHOD_TAG,
  fitYardsPerAttemptPrior,
  posteriorYardsPerAttempt,
  probOverRushYardsGivenAttempts,
  probOverRushYards,
} from "./edge-lab/props-hb-rush.js";
export type { RushSample } from "./edge-lab/props-hb-rush.js";

// Anytime TD given touches (rush att + rec), not calendar games. Independent p.
export {
  ATD_HB_METHOD_TAG,
  fitTdPerTouchPrior,
  pooledTdPerTouch,
  posteriorTdPerTouch,
  tdProbZero,
  tdProbZeroPoisson,
  probAnytimeTdGivenTouches,
  probAnytimeTd,
} from "./edge-lab/props-hb-atd.js";
export type { TouchTdSample } from "./edge-lab/props-hb-atd.js";

// X4 math — Kalshi two-way vs Shin book. Log-only; priced:false.
export {
  KALSHI_BOOK_METHOD_TAG,
  DEFAULT_KALSHI_BOOK_TAU,
  scanKalshiVsBooks,
} from "./edge-lab/kalshi-book-divergence.js";
export type {
  KalshiTwoWay,
  NamedBookTwoWay,
  KalshiBookFlag,
  KalshiBookResult,
} from "./edge-lab/kalshi-book-divergence.js";

// Catch rate by aDOT bucket. Independent p. Not a new Odds market.
export {
  ADOT_CATCH_METHOD_TAG,
  SHORT_ADOT_MAX,
  INTERMEDIATE_ADOT_MAX,
  adotOf,
  bucketAdot,
  fitAdotCatchPriors,
  posteriorAdotCatch,
  probOverReceptionsByAdot,
} from "./edge-lab/props-hb-adot-catch.js";
export type { AdotBucket, AdotCatchSample, BucketedCatchFit } from "./edge-lab/props-hb-adot-catch.js";

// Receiving yards as air-caught + YAC convolution. Independent p only.
// Does not ingest a new Odds market and does not touch ox-alpha ingest files.
export {
  AIR_YAC_METHOD_TAG,
  fitAirYacPriors,
  posteriorAirYac,
  nbPredictiveCdf,
  nbPredictivePmf,
  convolveSurvival,
  probOverYardsGivenReceptions,
  probOverReceivingYards,
} from "./edge-lab/props-hb-air-yac.js";
export type {
  AirYacSample,
  AirYacPriors,
  AirYacPosteriors,
} from "./edge-lab/props-hb-air-yac.js";

// Posted-price juice floor. e = p − q is not +EV at −110.
export {
  JUICE_FLOOR_METHOD_TAG,
  BREAK_EVEN_MINUS_110,
  postedBreakEven,
  edgeClearsPosted,
} from "./edge-lab/props-juice-floor.js";
export type { JuiceFloorResult, JuiceFloorDenied } from "./edge-lab/props-juice-floor.js";

// Receiving TDs given targets, not ATD-given-touches. Independent p.
export {
  REC_TD_HB_METHOD_TAG,
  fitRecTdPerTargetPrior,
  pooledRecTdPerTarget,
  posteriorRecTdPerTarget,
  recTdProbZero,
  recTdProbZeroPoisson,
  probRecTdGivenTargets,
  probRecTd,
} from "./edge-lab/props-hb-rec-td.js";
export type { RecTdSample } from "./edge-lab/props-hb-rec-td.js";

// Portfolio Kelly layer (Session 2) — size for survival. R&D / operator sizing
// surfaces only; never report stakes as CLV. CLV deflator self-disarms until
// ~50 settled samples. Do not invert Σ (no Markowitz).
export {
  fractionalKellyStake,
  jamesSteinShrink,
  ledoitWolfShrinkCovariance,
  clvDeflator,
  portfolioKellyStakes,
} from "./edge-lab/kelly.js";
export type {
  LedoitWolfResult,
  PortfolioKellyArgs,
  PortfolioKellyDiagnostics,
  PortfolioKellyResult,
} from "./edge-lab/kelly.js";

// CIR → Kelly bridge: fit calibrator on hold-out train, size on calibrated p.
export {
  applyCalibrator,
  sizeAfterCalibration,
  type TimedCalibrationSample,
  type SizeAfterCalibrationArgs,
  type SizeAfterCalibrationResult,
} from "./calibration-kelly-bridge.js";

// R&D — online Brier OGD convex ensemble (binary probs). Shadow only; no live gate flips.
export {
  runBrierOgdEnsemble,
  equalWeightBlend,
  projectProbabilitySimplex,
  equalSimplexWeights,
} from "./brier-ogd-ensemble.js";
export type {
  BrierOgdMemberProbs,
  BrierOgdSample,
  BrierOgdOptions,
  BrierOgdStep,
  BrierOgdReport,
} from "./brier-ogd-ensemble.js";

// R&D — RES-aware Beta + OCO (online Beta log-loss, Hedge adaptive-δ, full pipeline). Shadow only.
export {
  applyOnlineBeta,
  runOnlineBetaRecalibration,
  fitResAwareBeta,
} from "./online-beta-recalibration.js";
export type {
  OnlineBetaParams,
  OnlineBetaOptions,
  OnlineBetaStep,
  OnlineBetaReport,
  ResCalibratorOptions,
  ResCalibratorReport,
} from "./online-beta-recalibration.js";
export {
  expertLossAtDelta,
  runAdaptiveDeltaHedge,
} from "./adaptive-delta-hedge.js";
export type {
  DeltaExpertSample,
  AdaptiveDeltaOptions,
  AdaptiveDeltaStep,
  AdaptiveDeltaReport,
} from "./adaptive-delta-hedge.js";
export {
  runOcoPipeline,
  runOcoPipelineFromSingleP,
} from "./oco-pipeline.js";
export type {
  OcoMemberSample,
  OcoPipelineOptions,
  OcoPipelineStep,
  OcoPipelineReport,
} from "./oco-pipeline.js";

// R&D — sliding-window Online Beta OGD + Hedge adaptive-δ analysis (shadow).
export {
  runOnlineBetaSlidingWindow,
  analyzeSlidingWindowOgd,
} from "./online-beta-sliding-window.js";
export type {
  SlidingWindowBetaOptions,
  SlidingWindowOgdMetrics,
} from "./online-beta-sliding-window.js";
export { analyzeAdaptiveDeltaHedge } from "./adaptive-delta-analysis.js";
export type { HedgeAdaptiveDeltaAnalysis } from "./adaptive-delta-analysis.js";

// ── R&D shadow modules (2026-08-10 research spec) ────────────────────────────
// Pure, deterministic, seeded. None reads a gate, env var, DB or network, and
// none is wired into live scoring — they exist to be measured in shadow first.

// Sequential Monte Carlo latent team strength — a direct Murphy-RES
// (resolution/discrimination) lever: time-evolving independent probabilities
// with genuine posterior uncertainty instead of point estimates.
export {
  TeamStrengthFilter,
  stableSigmoid,
  softplus,
  // Serialization: lets the filter survive a serverless cold start instead of being
  // reconstructed empty (and stuck at ~0.5, unable to learn) on every invocation.
  FILTER_SNAPSHOT_VERSION,
} from "./team-strength-filter.js";
export type {
  ResamplingScheme,
  TeamStrengthFilterOptions,
  TeamIntervention,
  TeamPosterior,
  StrengthUpdateReport,
  FilterDiagnostics,
  FilterStateSnapshot,
} from "./team-strength-filter.js";

// Information-theoretic selective-publication gate, in bits. The closed-form
// counterpart of the spec's VIB bit-threshold gate — no neural network needed.
// NOTE the realised-vs-prior distinction: the prior-only measure rewards
// confidence regardless of accuracy, so only the realised form is anti-gaming.
export {
  binaryEntropyBits,
  binaryCrossEntropyBits,
  priorOnlyEdgeBits,
  realisedEdgeBits,
  priorOnlyInformationGainBits,
  realisedInformationGainBits,
  empiricalBaseRate,
  gateInformationEdge,
  permutationNullBandBits,
  DEFAULT_INFORMATION_EDGE_THRESHOLD_BITS,
} from "./information-edge-bits.js";
export type {
  EdgeCandidate,
  InformationEdgeBasis,
  InformationEdgeOptions,
  InformationEdgeVerdict,
  InformationEdgeNullBand,
  PermutationNullBandOptions,
} from "./information-edge-bits.js";

// Kelly staking robust to Knightian uncertainty in p: worst-case log-growth
// over a Beta confidence set. Includes a self-contained exact regularised
// incomplete beta + quantile (no scipy).
export {
  betaCdf,
  betaPdf,
  betaQuantile,
  betaConfidenceSet,
  robustKellyFraction,
  sweepEffectiveSampleSize,
  DEFAULT_ROBUST_ALPHA,
} from "./robust-kelly.js";
export type {
  BetaConfidenceSet,
  RobustKellyInput,
  RobustKellyResult,
} from "./robust-kelly.js";

// Anytime-valid forecast-SKILL test vs the market (likelihood-ratio E-process).
// Complements anytime-ledger.ts, which tests betting PROFITABILITY: this one
// needs no odds/stake model and speaks directly to calibration + resolution.
// High evidence here is skill vs the market's probabilities only — NOT proof of
// profitability and NOT a licence to claim PROVEN.
export {
  forecastSkillEProcess,
  initForecastSkillFold,
  foldForecastSkillPick,
  summarizeForecastSkillFold,
  DEFAULT_FORECAST_SKILL_ALPHA,
  DEFAULT_FORECAST_SKILL_EPSILON,
  DEFAULT_FORECAST_SKILL_MIN_PICKS,
  CONSERVATIVE_EVIDENCE_THRESHOLD,
} from "./forecast-skill-eprocess.js";
export type {
  ForecastSkillPoint,
  ForecastSkillOptions,
  ForecastSkillVerdict,
  ForecastSkillResult,
  ForecastSkillFoldState,
} from "./forecast-skill-eprocess.js";

// Shadow ensemble orchestrator — see the module header for the full "why". Not
// wired into any live/publishing path; SHADOW ONLY.
export {
  LiveOrchestrator,
} from "./pipeline/live-orchestrator.js";
export type {
  OrchestratorOptions,
  OrchestratorGameContext,
  ShadowSignalObservation,
  OrchestratorSettlementResult,
} from "./pipeline/live-orchestrator.js";

// BAEE — shadow-mode-only ensemble weight learner. Not wired for blending.
export { BAEEEnsemble } from "./ensemble/baee-ensemble.js";

// Stable team-name -> filter-index mapping. Append-only ON PURPOSE: reusing an
// index silently transfers one team's learned posterior to another, and nothing
// downstream can detect it. See the module header.
export {
  createTeamIndexRegistry,
  assignTeamIndex,
  lookupTeamIndex,
  normalizeTeamKey,
  teamCount,
  isValidTeamIndexRegistry,
  DEFAULT_TEAM_CAPACITY,
} from "./team-index-registry.js";
export type { TeamIndexRegistry, AssignTeamIndexResult } from "./team-index-registry.js";

// Consecutive-day Brier health check. Pure/DB-agnostic — see
// apps/web/lib/ops/calibration-regression-snapshot.ts for the DB-backed series builder.
export { checkCalibrationHealth } from "./calibration-monitor.js";
export type { CalibrationHealthResult } from "./calibration-monitor.js";

// Calibration-snapshot regression comparison. Pure/DB-agnostic — reuses
// brierDecomposition rather than a second Brier/RES calculator.
export {
  buildCalibrationSnapshot,
  checkForRegression,
} from "./regression-detector.js";
export type {
  CalibrationSnapshot,
  RegressionCheckOptions,
  RegressionVerdict,
} from "./regression-detector.js";

// De-vig oracle — seven-method reference (penaltyblog MIT). Fair probabilities
// feed the pick pipeline as calibration *inputs* only; they never bypass scoring.
export { devig, bisectRoot } from "./devig/oracle.js";
export type { DevigMethod, DevigResult } from "./devig/oracle.js";

// Parlay MRI v1 — same-match bivariate Poisson correlation. priced:false until
// correlated survivability beats naive on a walk-forward against book SGP quotes.
export {
  PARLAY_MRI_PRICED,
  PARLAY_MRI_SCOPE,
  poissonPmf as bivariatePoissonComponentPmf,
  bivariatePoissonPmf,
  buildScoreGrid,
  evaluateParlay,
  lambdasFromAttackDefense,
} from "./parlay/correlationAdjuster.js";
export type { SameMatchLeg, ParlayEvaluation } from "./parlay/correlationAdjuster.js";

// Per-sport NB2 dispersion estimation — OFFLINE/research evidence only.
// Deliberately not wired into live scoring: changing a constant a priced path
// uses is MODEL_VERSION-affecting and is the founder's call. Consume from a
// runner or report. Returns a VERDICT first ("poisson" for NHL-like data) so a
// caller cannot mistake a noise-fit for a real dispersion.
export {
  estimatePhi,
  impliedVmr,
  MIN_SAMPLES_FOR_DISPERSION,
} from "./dispersion/estimate-phi.js";
export type { PhiEstimate, DispersionVerdict } from "./dispersion/estimate-phi.js";
