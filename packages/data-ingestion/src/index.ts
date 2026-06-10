export {
  OddsApiClient,
  OddsApiError,
  providerStatusFromError,
} from "./odds-api-client.js";
export {
  classifyProviderError,
  isProviderFailureStatus,
  PROVIDER_JOB_STATUS,
  PROVIDER_FAILURE_STATUSES,
} from "./provider-status.js";
export type {
  ProviderJobStatus,
  ClassifyProviderErrorInput,
  HeaderLike,
} from "./provider-status.js";
export {
  ODDS_PROVIDER_REGISTRY,
  THE_ODDS_API_PROVIDER,
  ODDS_API_IO_FALLBACK,
  API_SPORTS_FALLBACK,
  PRIMARY_PROVIDER_ENV_VAR,
  FALLBACK_STUB_STATUS,
  isEnvVarPresent,
  fallbackStubStatus,
  resolveProviderOrder,
  resolvePrimaryProvider,
} from "./provider-registry.js";
export type {
  EnvLike,
  ProviderRole,
  OddsProviderId,
  OddsProviderDescriptor,
  ResolveProviderOrderOptions,
} from "./provider-registry.js";
export { DataNormalizer } from "./normalizer.js";
export {
  enrichGameContext,
  trackOpeningLines,
  computeRestDays,
  computeScheduleDensity,
  getAtsForm,
  getHeadToHeadForm,
  settleGameLogs,
} from "./context-enrichment.js";
// CLV scaffold (WIN-01): closing-line capture + per-pick projection helpers.
// Fail-closed, stub-safe, additive — never feeds the published pick number.
export {
  captureClosingLine,
  deriveClosingConsensus,
  pickClosingValues,
  marketForPickType,
  DEFAULT_CLOSING_REF,
  MIN_CLOSING_BOOKMAKER_COUNT,
} from "./closing-line.js";
export type {
  CaptureClosingLineInput,
  CaptureClosingLineResult,
  ClosingLineRowLike,
  PickClosingValues,
} from "./closing-line.js";
export * from "./config.js";
