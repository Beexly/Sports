import { detectMaterialChanges } from "./change-detection";
import { fetchOpportunitySourceSnapshot, type OpportunitySourceCheckpoint, type OpportunitySourceFetchOptions, type OpportunitySourceFetchResult } from "./source-fetch";
import { DEFAULT_SCHEDULE_POLICY, scheduleOpportunitySources, type OpportunitySchedulePolicy } from "./source-schedule";
import { DEFAULT_OPPORTUNITY_SOURCES } from "./source-registry";
import type { MaterialChange, OpportunityObservation, OpportunitySource } from "./types";

export interface NovaSourceMonitorInput {
  readonly sources?: readonly OpportunitySource[];
  readonly checkpoints?: readonly OpportunitySourceCheckpoint[];
  readonly now?: Date;
  readonly schedulePolicy?: OpportunitySchedulePolicy;
  readonly fetchOptions?: Omit<OpportunitySourceFetchOptions, "now">;
}

export interface NovaSourceMonitorResult {
  readonly generatedAt: string;
  readonly dueSourceIds: readonly string[];
  readonly fetchResults: readonly OpportunitySourceFetchResult[];
  readonly checkpoints: readonly OpportunitySourceCheckpoint[];
  readonly previousObservations: readonly OpportunityObservation[];
  readonly currentObservations: readonly OpportunityObservation[];
  readonly changes: readonly MaterialChange[];
  readonly materialChanges: readonly MaterialChange[];
  readonly summary: {
    readonly sourcesConsidered: number;
    readonly sourcesDue: number;
    readonly fetched: number;
    readonly notModified: number;
    readonly held: number;
    readonly failed: number;
    readonly observations: number;
    readonly materialChanges: number;
    readonly credentialsSent: 0;
    readonly rawBodiesRetained: 0;
  };
}

export async function runNovaSourceMonitor(
  input: NovaSourceMonitorInput = {},
): Promise<NovaSourceMonitorResult> {
  const now = input.now ?? new Date();
  const sources = input.sources ?? DEFAULT_OPPORTUNITY_SOURCES;
  const checkpoints = input.checkpoints ?? [];
  const checkpointById = new Map(checkpoints.map((checkpoint) => [checkpoint.sourceId, checkpoint]));
  const previousObservations = checkpoints.flatMap((checkpoint) => checkpoint.observations);
  const schedule = scheduleOpportunitySources(
    sources,
    checkpoints.map((checkpoint) => ({
      sourceId: checkpoint.sourceId,
      lastCheckedAt: checkpoint.checkedAt,
      lastSuccessAt: checkpoint.succeededAt,
      consecutiveFailures: checkpoint.consecutiveFailures,
      etag: checkpoint.etag,
      lastModified: checkpoint.lastModified,
    })),
    now,
    input.schedulePolicy ?? DEFAULT_SCHEDULE_POLICY,
  );
  const dueSources = schedule.filter((item) => item.due).map((item) => item.source);

  const fetchResults: OpportunitySourceFetchResult[] = [];
  // Deliberately sequential. This honors rate limits and keeps one source failure
  // from producing an unbounded concurrent retry storm.
  for (const source of dueSources) {
    fetchResults.push(await fetchOpportunitySourceSnapshot(
      source,
      checkpointById.get(source.id),
      { ...input.fetchOptions, now },
    ));
  }

  const nextCheckpointById = new Map(checkpoints.map((checkpoint) => [checkpoint.sourceId, checkpoint]));
  for (const result of fetchResults) nextCheckpointById.set(result.sourceId, result.nextCheckpoint);
  const nextCheckpoints = [...nextCheckpointById.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const currentObservations = nextCheckpoints.flatMap((checkpoint) => checkpoint.observations);
  const changes = detectMaterialChanges(previousObservations, currentObservations);
  const materialChanges = changes.filter((change) => change.kind !== "UNCHANGED");

  const count = (status: OpportunitySourceFetchResult["status"]): number =>
    fetchResults.filter((result) => result.status === status).length;

  return {
    generatedAt: now.toISOString(),
    dueSourceIds: dueSources.map((source) => source.id),
    fetchResults,
    checkpoints: nextCheckpoints,
    previousObservations,
    currentObservations,
    changes,
    materialChanges,
    summary: {
      sourcesConsidered: sources.length,
      sourcesDue: dueSources.length,
      fetched: count("FETCHED"),
      notModified: count("NOT_MODIFIED"),
      held: count("HELD"),
      failed: count("FAILED"),
      observations: currentObservations.length,
      materialChanges: materialChanges.length,
      credentialsSent: 0,
      rawBodiesRetained: 0,
    },
  };
}
