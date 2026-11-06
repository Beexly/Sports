/**
 * NFL advanced metrics inventoried in AGENTS.md 2026-09-17 X-feed / Gridiron
 * notes. Pure, fail-closed, zero I/O. Lab conventions live in lab-filters.ts.
 */

export {
  inLabSample,
  isDesignedRush,
  isDropback,
  isExplosive,
  isGarbageTime,
  isLabSuccess,
  type LabPlay,
} from "./lab-filters.js";

export { leaguePercentile } from "./percentile.js";

export {
  COMPOSITE_QB_COMPONENTS,
  COMPOSITE_QB_METHOD_TAG,
  rankCompositeQbs,
  type CompositeQbResult,
  type QbCompositeInput,
  type QbCompositeRow,
} from "./composite-qb.js";

export {
  FORMATION_USAGE_METHOD_TAG,
  formationUsage,
  type FormationPlay,
  type FormationUsageResult,
} from "./formation-usage.js";

export {
  PRESSURE_TO_SACK_METHOD_TAG,
  pressureToSack,
  type PressureToSackInput,
  type PressureToSackResult,
} from "./pressure-to-sack.js";

export {
  EPA_RUSH_GAP_METHOD_TAG,
  PALAZZOLO_RUN_GAP_CAVEAT,
  epaRushByGap,
  type EpaRushByGapResult,
  type RunGap,
  type RushGapPlay,
} from "./epa-rush-gap.js";

export {
  DFS_LEVERAGE_METHOD_TAG,
  dfsOwnershipLeverage,
  type DfsLeverageInput,
  type DfsLeverageResult,
} from "./dfs-leverage.js";

export {
  SURVIVOR_EV_METHOD_TAG,
  rankSurvivorPicks,
  type SurvivorPickResult,
  type SurvivorTeamWeek,
} from "./survivor-ev.js";

export {
  CHARTING_REFUSED_METHOD_TAG,
  refuseChartingMetric,
  type ChartingMetric,
  type ChartingRefused,
} from "./charting-refused.js";

export {
  FIRST_DOWN_QUADRANT_METHOD_TAG,
  firstDownQuadrants,
  type FirstDownPlayer,
  type FirstDownQuadrantResult,
} from "./first-down-quadrants.js";
