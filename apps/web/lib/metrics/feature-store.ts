import {
  METRIC_COVERAGE,
  metricClearance,
  metricCoverageById,
  type MetricCoverageEntry,
} from "./coverage-map";
import {
  opponentAdjustedEpa,
  type OpponentAdjustedEpaResult,
  type Play,
  type StatProvenance,
  type TeamEpaRating,
} from "./opponent-adjusted-epa";

export type FeatureMetricId = "opponent-adjusted-epa";
export type FeatureEntityType = "team";
export type FeatureStoreStatus = "READY" | "EMPTY_INPUT" | "BLOCKED_BY_RIGHTS";

export interface FeatureValue {
  readonly key: "offAdj" | "defAdj" | "offPlays" | "defPlays";
  readonly value: number;
  readonly unit: "epa_per_play" | "plays";
}

export interface FeatureRecord {
  readonly metricId: FeatureMetricId;
  readonly entityType: FeatureEntityType;
  readonly entityId: string;
  readonly generatedAt: string;
  readonly values: readonly FeatureValue[];
  readonly sampleSize: number;
  readonly provenance: StatProvenance;
}

export interface FeatureStorePersistenceTarget {
  readonly kind: "r2-duckdb";
  readonly status: "INFRA";
  readonly bucketBinding: "R2_FEATURE_STORE";
  readonly relation: "feature_store.metric_snapshots";
  readonly partitionKeys: readonly ["metric_id", "generated_at"];
}

export interface FeatureStoreSnapshot {
  readonly metricId: FeatureMetricId;
  readonly status: FeatureStoreStatus;
  readonly generatedAt: string;
  readonly coverage: MetricCoverageEntry | null;
  readonly persistence: FeatureStorePersistenceTarget;
  readonly rows: readonly FeatureRecord[];
}

export interface FeatureStorePersistence {
  writeSnapshot(snapshot: FeatureStoreSnapshot): Promise<void>;
  readLatest(metricId: FeatureMetricId): Promise<FeatureStoreSnapshot | null>;
}

export interface FeatureMetricDefinition {
  readonly id: FeatureMetricId;
  readonly name: string;
  readonly coverageId: string;
  readonly entityType: FeatureEntityType;
  readonly sourceModule: "opponent-adjusted-epa";
  readonly persistence: FeatureStorePersistenceTarget;
}

export interface OpponentAdjustedEpaFeatureOptions {
  readonly now?: Date;
  readonly coverageEntries?: readonly MetricCoverageEntry[];
  readonly iterations?: number;
}

export const FEATURE_STORE_PERSISTENCE_TARGET: FeatureStorePersistenceTarget = {
  kind: "r2-duckdb",
  status: "INFRA",
  bucketBinding: "R2_FEATURE_STORE",
  relation: "feature_store.metric_snapshots",
  partitionKeys: ["metric_id", "generated_at"],
};

export const FEATURE_METRIC_DEFINITIONS: readonly FeatureMetricDefinition[] = [
  {
    id: "opponent-adjusted-epa",
    name: "Opponent-adjusted EPA/play feature rows",
    coverageId: "opponent-adjusted-epa",
    entityType: "team",
    sourceModule: "opponent-adjusted-epa",
    persistence: FEATURE_STORE_PERSISTENCE_TARGET,
  },
];

export function featureMetricCoverageIntegrity(
  definitions: readonly FeatureMetricDefinition[] = FEATURE_METRIC_DEFINITIONS,
  coverageEntries: readonly MetricCoverageEntry[] = METRIC_COVERAGE,
): readonly FeatureMetricDefinition[] {
  return definitions.filter((definition) => metricCoverageById(definition.coverageId, coverageEntries) === null);
}

export function buildOpponentAdjustedEpaFeatureSnapshot(
  plays: readonly Play[],
  options: OpponentAdjustedEpaFeatureOptions = {},
): FeatureStoreSnapshot {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const coverageEntries = options.coverageEntries ?? METRIC_COVERAGE;
  const definition = FEATURE_METRIC_DEFINITIONS[0];
  const coverage = definition === undefined ? null : metricCoverageById(definition.coverageId, coverageEntries);

  if (definition === undefined || coverage === null || !metricClearance(coverage, options.now).allowed) {
    return snapshot("opponent-adjusted-epa", "BLOCKED_BY_RIGHTS", generatedAt, coverage, []);
  }

  if (plays.length === 0) {
    const emptyResult = opponentAdjustedEpa([], { iterations: options.iterations, now: options.now });
    return snapshot(definition.id, "EMPTY_INPUT", generatedAt, coverage, toFeatureRows(definition, emptyResult));
  }

  const result = opponentAdjustedEpa(plays, { iterations: options.iterations, now: options.now });
  return snapshot(definition.id, "READY", generatedAt, coverage, toFeatureRows(definition, result));
}

function snapshot(
  metricId: FeatureMetricId,
  status: FeatureStoreStatus,
  generatedAt: string,
  coverage: MetricCoverageEntry | null,
  rows: readonly FeatureRecord[],
): FeatureStoreSnapshot {
  return {
    metricId,
    status,
    generatedAt,
    coverage,
    persistence: FEATURE_STORE_PERSISTENCE_TARGET,
    rows,
  };
}

function toFeatureRows(
  definition: FeatureMetricDefinition,
  result: OpponentAdjustedEpaResult,
): readonly FeatureRecord[] {
  return result.ratings.map((rating) => ratingToFeatureRecord(definition, result, rating));
}

function ratingToFeatureRecord(
  definition: FeatureMetricDefinition,
  result: OpponentAdjustedEpaResult,
  rating: TeamEpaRating,
): FeatureRecord {
  return {
    metricId: definition.id,
    entityType: definition.entityType,
    entityId: rating.team,
    generatedAt: result.provenance.computedAt,
    sampleSize: result.sampleSize,
    provenance: result.provenance,
    values: [
      { key: "offAdj", value: rating.offAdj, unit: "epa_per_play" },
      { key: "defAdj", value: rating.defAdj, unit: "epa_per_play" },
      { key: "offPlays", value: rating.offPlays, unit: "plays" },
      { key: "defPlays", value: rating.defPlays, unit: "plays" },
    ],
  };
}
