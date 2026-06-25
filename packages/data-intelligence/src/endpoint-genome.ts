/**
 * DATA INTELLIGENCE MESH — Endpoint Genome.
 *
 * Below the source level, each endpoint has its own fact types, grain, latency, point-in-time
 * safety, entity-resolution difficulty, and replay vs live value. This turns API strategy into
 * intelligence strategy: the same source can have one bulk-release endpoint (great for replay) and
 * one live endpoint (great for in-the-moment decisions). Pure types + a small helper. No I/O.
 */

import type { FactType, Grain, LatencyClass } from "./fact-type.js";

export type IngestionMode = "LIVE_API" | "BULK_RELEASE" | "WEBHOOK" | "USER_AUTH" | "MANUAL_UPLOAD" | "FIXTURE_ONLY";

export interface EndpointGenome {
  readonly endpointId: string;
  readonly sourceId: string;
  readonly factTypes: readonly FactType[];
  readonly grain: Grain;
  readonly updateFrequency: string;
  readonly latencyClass: LatencyClass;
  readonly pointInTimeSafe: boolean;
  readonly entityResolutionDifficulty: number; // 0..1
  readonly freshnessSlaMinutes: number | null;
  readonly historicalReplayValue: number;      // 0..1
  readonly liveDecisionValue: number;          // 0..1
  readonly costWeight: number;                 // 0..1
  readonly ingestionMode: IngestionMode;
}

/** Does this endpoint cover any of the needed fact types? (coverage match for acquisition ranking) */
export function endpointCovers(endpoint: EndpointGenome, needed: readonly FactType[]): number {
  if (needed.length === 0) return 0;
  const set = new Set<FactType>(endpoint.factTypes);
  const hits = needed.filter((f) => set.has(f)).length;
  return Number((hits / needed.length).toFixed(4));
}
