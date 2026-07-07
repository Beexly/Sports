// allow: SIZE_OK - package export barrel kept stable for existing metric imports.
export type { MetricDirection, MetricDriver, MetricDriverInput } from "./driver.js";
export { metricDriver, sortedDrivers } from "./driver.js";
export type {
  GseFormulaClass,
  GseMetricBirthCertificate,
  GseMetricFamily,
  MetricPublicExposure,
  MetricValidationMethod,
} from "./metric-birth-certificate.js";
export {
  GSE_METRIC_BIRTH_CERTIFICATES,
  metricBirthCertificate,
  requireMetricBirthCertificate,
} from "./metric-birth-certificate.js";
export type {
  GseMetricAsset,
  GseModelCard,
  MetricApiExposure,
  MetricDriftCard,
  MetricDriftCardStatus,
  MetricEvidenceStatus,
  MetricLicensingStatus,
  MetricValidationMeasure,
  MetricValidationReport,
  MetricValidationReportStatus,
  SourceRightsEnvelope,
} from "./metric-asset.js";
export {
  GSE_METRIC_ASSETS,
  metricAsset,
  requireMetricAsset,
} from "./metric-asset.js";
export type {
  MetricDriftCardInput,
  MetricDriftCheck,
  MetricDriftDirection,
  MetricModelCardInput,
} from "./metric-evidence-cards.js";
export {
  generateMetricDriftCard,
  generateMetricModelCard,
} from "./metric-evidence-cards.js";
export type {
  ShadowEvidenceMetricId,
  ShadowMetricEvidenceFixture,
  ShadowMetricEvidenceFixtureCards,
} from "./metric-evidence-card-fixtures.js";
export {
  generateAllShadowMetricEvidenceFixtureCards,
  generateShadowMetricEvidenceFixtureCards,
  SHADOW_METRIC_EVIDENCE_FIXTURES,
} from "./metric-evidence-card-fixtures.js";
export type { ShadowMetricEvidenceMarkdownReport } from "./metric-evidence-report-markdown.js";
export {
  renderAllShadowMetricEvidenceReportsMarkdown,
  renderShadowMetricEvidenceReportIndexMarkdown,
  renderShadowMetricEvidenceReportMarkdown,
} from "./metric-evidence-report-markdown.js";
export type {
  HistoricalDecisionWindowRecord,
  HistoricalMarketMirageRecord,
  HistoricalNoBetPressureRecord,
  HistoricalRoleStabilityRecord,
  HistoricalValidationAdapterResult,
  HistoricalValidationAdapterStatus,
  HistoricalValidationMetricId,
  HistoricalValidationPayloadProfile,
  HistoricalValidationRecord,
  HistoricalValidationSourceReview,
} from "./metric-historical-validation-adapter.js";
export {
  adaptHistoricalValidationRecord,
  reviewHistoricalValidationSources,
  runHistoricalValidationAdapterRecords,
} from "./metric-historical-validation-adapter.js";
export { reviewHistoricalValidationPayload } from "./metric-historical-validation-payload.js";
export type { HistoricalValidationAdapterSummary } from "./metric-historical-validation-adapter-fixtures.js";
export {
  HISTORICAL_VALIDATION_ADAPTER_FIXTURES,
  runHistoricalValidationAdapterFixtures,
  summarizeHistoricalValidationAdapterResults,
} from "./metric-historical-validation-adapter-fixtures.js";
export type {
  HistoricalCalibrationDistributionRecord,
  HistoricalDriftPressureDistributionRecord,
  HistoricalDistributionAdapterResult,
  HistoricalDistributionAdapterStatus,
  HistoricalDistributionMetricId,
  HistoricalDistributionPayloadProfile,
  HistoricalDistributionRecord,
  HistoricalPortfolioDistributionRecord,
} from "./metric-historical-distribution-adapter.js";
export {
  adaptHistoricalDistributionRecord,
  runHistoricalDistributionAdapterRecords,
} from "./metric-historical-distribution-adapter.js";
export { reviewHistoricalDistributionPayload } from "./metric-historical-distribution-payload.js";
export type { HistoricalDistributionAdapterSummary } from "./metric-historical-distribution-fixtures.js";
export {
  HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES,
  runHistoricalDistributionAdapterFixtures,
  summarizeHistoricalDistributionAdapterResults,
} from "./metric-historical-distribution-fixtures.js";
export type {
  DecisionWindowValidationSplit,
  MetricValidationSplitResult,
  MetricValidationSplitSummary,
  RoleStabilityValidationSplit,
  ValidationSplitMetricId,
  ValidationSplitStatus,
} from "./metric-validation-split-fixtures.js";
export {
  DECISION_WINDOW_VALIDATION_SPLITS,
  ROLE_STABILITY_VALIDATION_SPLITS,
  runDecisionWindowValidationSplits,
  runMetricValidationSplitFixtures,
  runRoleStabilityValidationSplits,
  summarizeMetricValidationSplitResults,
} from "./metric-validation-split-fixtures.js";
export type {
  MetricResidualConfidenceMeaning,
  MetricResidualMetricId,
  MetricResidualPlayInput,
  MetricResidualRollup,
  MetricResidualRollupExposure,
  MetricResidualRollupKind,
} from "./residual-rollup.js";
export {
  buildMetricResidualRollup,
  buildMetricResidualRollups,
  metricResidualRollupKey,
} from "./residual-rollup.js";
export type {
  MetricPayloadEnvelope,
  MetricPayloadEnvelopeField,
  MetricPayloadEnvelopeInput,
  MetricPayloadEnvelopeMeta,
} from "./payload-envelope.js";
export { filterMetricPayloadEnvelope } from "./payload-envelope.js";
export type {
  ComposedDecisionMetricPayloadFixture,
  ComposedDecisionMetricPayloadFixtureId,
  ComposedDecisionMetricPayloadFixtureResult,
  ComposedDecisionMetricPayloadFixtureSummary,
} from "./metric-payload-envelope-fixtures.js";
export {
  COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
  runComposedDecisionMetricPayloadFixtures,
  summarizeComposedDecisionMetricPayloadFixtures,
} from "./metric-payload-envelope-fixtures.js";
export type {
  MetricPayloadExposure,
  MetricPayloadField,
  MetricPayloadFieldKind,
  MetricPayloadRightsDecision,
  MetricPayloadRightsInput,
} from "./payload-rights.js";
export { evaluateMetricPayloadRights } from "./payload-rights.js";
export type {
  MetricSourceAttributionPolicy,
  MetricSourceRightsRegistryEntry,
  MetricSourceRightsDecision,
  MetricSourceRightsInput,
  MetricSourceRightsPermissionSet,
  MetricSourceRightsPolicy,
  MetricSourceRightsStatus,
  MetricSourceRightsUse,
} from "./source-rights.js";
export {
  evaluateMetricSourceRights,
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES,
  metricSourceRightsPoliciesFromRegistry,
  metricSourceRightsPolicyFromRegistryEntry,
  metricSourceRightsPolicy,
  sourceRightsEnvelopeFromPolicy,
} from "./source-rights.js";
export type {
  MetricGraduationDecision,
  MetricGraduationInput,
  MetricGraduationStatus,
} from "./metric-graduation.js";
export { evaluateMetricGraduation } from "./metric-graduation.js";
export {
  clamp,
  clamp01,
  clampScore,
  logit,
  normalizeClamped,
  protectedBasis,
  round,
  sigmoid,
  softplus,
  weightedMean,
  zScore,
} from "./math.js";
export type { EmpiricalBayesShrinkageInput, ProbabilityShrinkageInput } from "./shrinkage.js";
export { empiricalBayesShrink, shrinkProbability, shrinkWeightedMean } from "./shrinkage.js";
export type {
  MetricLifecycleStatus,
  MetricSourcePolicy,
  MetricSourceStatus,
  MetricUncertaintyBand,
  MetricValidationIssue,
  MetricValidationResult,
} from "./validation.js";
export {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  validateSourcePolicies,
} from "./validation.js";
export { staleLineRiskScore } from "../market/stale-line-risk-score.js";
export type {
  StaleLineRiskBand,
  StaleLineRiskInput,
  StaleLineRiskScore,
} from "../market/stale-line-risk-score.js";
export { qbBurdenIndex } from "../passing/qb-burden-index.js";
export type {
  QbBurdenBand,
  QbBurdenIndexInput,
  QbBurdenIndexMetric,
  QbBurdenSourcePosture,
} from "../passing/qb-burden-index.js";
export { receiverDifficultyIndex } from "../receiving/receiver-difficulty.js";
export type {
  ReceiverDifficultyInput,
  ReceiverDifficultyMetric,
} from "../receiving/receiver-difficulty.js";
export { expectedYacGse } from "../receiving/expected-yac.js";
export type {
  ExpectedYacInput,
  ExpectedYacMetric,
} from "../receiving/expected-yac.js";
export { yacCreationGse } from "../receiving/yac-creation.js";
export type {
  YacCreationInput,
  YacCreationMetric,
} from "../receiving/yac-creation.js";
export { rushEnvironmentIndex } from "../rushing/rush-environment-index.js";
export type {
  RushEnvironmentIndex,
  RushEnvironmentInput,
} from "../rushing/rush-environment-index.js";
export { expectedRushYardsGse } from "../rushing/expected-rush-yards.js";
export type {
  ExpectedRushYardsInput,
  ExpectedRushYardsMetric,
} from "../rushing/expected-rush-yards.js";
export { rushOverExpectedGse } from "../rushing/rush-over-expected.js";
export type {
  RushOverExpectedInput,
  RushOverExpectedMetric,
} from "../rushing/rush-over-expected.js";
export { roleVolatilityIndex } from "../role/role-volatility-index.js";
export type {
  RoleVolatilityBand,
  RoleVolatilityIndexInput,
  RoleVolatilityIndexMetric,
  RoleVolatilitySourcePosture,
} from "../role/role-volatility-index.js";
export { calibrationIntegrityGrade } from "../calibration/calibration-integrity-grade.js";
export type {
  CalibrationIntegrityGradeInput,
  CalibrationIntegrityGradeMetric,
  CalibrationIntegrityLetter,
  CalibrationIntegritySourcePosture,
} from "../calibration/calibration-integrity-grade.js";
export { driftPressureIndex } from "../calibration/drift-pressure-index.js";
export type {
  DriftPressureBand,
  DriftPressureIndexInput,
  DriftPressureIndexMetric,
  DriftPressureSourcePosture,
} from "../calibration/drift-pressure-index.js";
export { noBetPressureMetric } from "../decision/no-bet-pressure.js";
export type {
  NoBetPressureBand,
  NoBetPressureInput,
  NoBetPressureMetric,
  NoBetPressureSourcePosture,
} from "../decision/no-bet-pressure.js";
export { playableWindowScore } from "../decision/playable-window-score.js";
export type {
  PlayableWindowBand,
  PlayableWindowScoreInput,
  PlayableWindowScoreMetric,
  PlayableWindowSourcePosture,
} from "../decision/playable-window-score.js";
export { portfolioFitScore } from "../decision/portfolio-fit-score.js";
export type {
  PortfolioFitBand,
  PortfolioFitScoreInput,
  PortfolioFitScoreMetric,
  PortfolioFitSourcePosture,
} from "../decision/portfolio-fit-score.js";
