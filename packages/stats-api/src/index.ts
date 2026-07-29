export * from "./rights.js";
export type { MetricDef, MetricFamily, MetricStatus, SportCode } from "./catalog-types.js";
export {
  getMetricCatalog,
  getMetricById,
  listMetrics,
  catalogStats,
} from "./catalog.js";
export * from "./handlers.js";
export * from "./values.js";
export { buildStatsOpenApi } from "./openapi.js";
export { expandAll } from "./catalog-expand.js";
export * from "./providers/registry.js";
export * from "./sources/external-registry.js";

export {
  createOpenMeteoProvider,
  liveOpenMeteoClient,
  parseLatLon,
  type OpenMeteoClient,
} from "./providers/open-meteo.js";
export {
  NflverseMemoryStore,
  createNflverseMemoryProvider,
  type NflverseRow,
} from "./providers/nflverse-memory.js";

export * from "./entitlements.js";

export * from "./hydration/index.js";

export * from "./pit-validate.js";
export {
  expandPrismaPlayerGameStat,
  writeThroughPlayerGameStats,
  applyPutsToStore,
  hydratePlayerGameStatsToMemory,
  summarizeCronDelta,
  DEFAULT_WRITE_THROUGH,
} from "./hydration/write-through.js";
export type {
  PlayerGameStatRow,
  PrismaPlayerGameStat,
  MemoryPut,
  WriteThroughResult,
  WriteThroughPolicy,
  CronDeltaTick,
} from "./hydration/write-through.js";

export {
  restDays,
  rollingMean,
  successRateRoll,
  selfClvFromArchive,
  rollingSum,
  cpoeRoll,
  yardsPerPlay,
  shareOfTeam,
  type FormulaResult,
} from "./formulas/derived.js";

export {
  MemoryOnlineStore,
  onlineKey,
  assertNotPublicApiPath,
  ONLINE_PIPELINE_GUIDANCE,
  type OnlineRow,
  type OnlineStore,
} from "./online/redis-store.js";

export {
  makeMemoryClosingArchive,
  selfClvFromClosingArchive,
  type QuoteTouch,
  type ClosingArchiveEntry,
  type ClosingArchive,
} from "./archive/closing-archive.js";

export {
  impliedToDecimal,
  parseGammaMarketsPayload,
  fetchGammaMarkets,
  type GammaMarketQuote,
  type GammaFetchResult,
  type GammaHttp,
} from "./providers/gamma-markets.js";

export {
  runGammaCronDelta,
  summarizeGammaTicks,
  type GammaCronDeltaResult,
} from "./hydration/gamma-cron-delta.js";

export {
  classifyExport,
  requireSpdx,
  type ExportClass,
  type ExportClassification,
} from "./rights-export.js";

export * from "./own/index.js";

export {
  hydrateContextToMemory,
  expandContractRows,
  expandOfficialRows,
  parseSimpleCsv,
  NFLVERSE_CONTEXT_LICENSE,
  NFLVERSE_CONTEXT_ATTRIBUTION,
  type ContractRowIn,
  type OfficialRowIn,
  type ContextHydrateResult,
} from "./providers/nflverse-context.js";

export {
  reportSelfClvFromArchive,
  buildDemoSelfClvReport,
  type SelfClvRow,
  type SelfClvCohortReport,
} from "./archive/self-clv-report.js";
