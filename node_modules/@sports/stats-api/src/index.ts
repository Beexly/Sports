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
export {
  expandContractRows,
  expandOfficialRows,
  hydrateContextToMemory,
  stableNumericHash,
  type ContextHydrationResult,
} from "./providers/nflverse-context.js";

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
  type FormulaResult,
} from "./formulas/derived.js";

export * from "./own/index.js";
export * from "./rights-export.js";
