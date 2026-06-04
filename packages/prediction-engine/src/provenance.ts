/**
 * Per-prediction provenance — stamps every prediction with the exact data
 * snapshots that produced it (source, snapshot id, fetch time, tier) plus a
 * freshness verdict. This is the "missing trust primitive": a prediction you can
 * trace to its inputs, and that refuses to look fresh when its data is stale.
 *
 * Two jobs:
 *   1. Trace + freshness — surface to users, and gate publishing.
 *   2. A canonical payload that feeds straight into proof-of-record.ts, so the
 *      committed Merkle leaf binds the prediction AND its provenance (can't quietly
 *      swap inputs after the fact).
 *
 * Pure, no I/O — timestamps are passed in (no clock), so it is fully deterministic.
 */

export type ProvenanceTier = "A" | "B";

export interface SourceSnapshot {
  /** Source name, e.g. "kalshi", "odds-api-io", "espn". */
  readonly source: string;
  /** Opaque id of the exact data pull this prediction used. */
  readonly snapshotId: string;
  /** ISO timestamp the data was fetched. */
  readonly fetchedAt: string;
  /** A = citable/licensed/official; B = internal signal only (never cited). */
  readonly tier: ProvenanceTier;
}

export type FreshnessVerdict = "fresh" | "aging" | "stale";

export interface PredictionProvenance {
  readonly predictionId: string;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly sources: readonly SourceSnapshot[];
  /** Age in minutes of the OLDEST source vs generatedAt (0 if none parseable). */
  readonly maxStalenessMinutes: number;
  readonly freshness: FreshnessVerdict;
  /** True only if every source is Tier-A — the prediction is publishable as sourced. */
  readonly fullyCitable: boolean;
}

export interface ProvenanceOptions {
  /** Older than this (minutes) → "aging". Default 60. */
  readonly agingMinutes?: number;
  /** Older than this (minutes) → "stale". Default 180. */
  readonly staleMinutes?: number;
}

export interface ProvenanceInput {
  readonly predictionId: string;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly sources: readonly SourceSnapshot[];
}

function ageMinutes(generatedAt: string, fetchedAt: string): number {
  const g = Date.parse(generatedAt);
  const f = Date.parse(fetchedAt);
  if (Number.isNaN(g) || Number.isNaN(f)) return 0;
  return Math.max(0, (g - f) / 60000);
}

export function buildProvenance(input: ProvenanceInput, options: ProvenanceOptions = {}): PredictionProvenance {
  const aging = options.agingMinutes ?? 60;
  const stale = options.staleMinutes ?? 180;

  const maxStalenessMinutes = input.sources.reduce(
    (max, s) => Math.max(max, ageMinutes(input.generatedAt, s.fetchedAt)),
    0,
  );
  const freshness: FreshnessVerdict =
    maxStalenessMinutes >= stale ? "stale" : maxStalenessMinutes >= aging ? "aging" : "fresh";

  return {
    predictionId: input.predictionId,
    modelVersion: input.modelVersion,
    generatedAt: input.generatedAt,
    sources: input.sources,
    maxStalenessMinutes: round2(maxStalenessMinutes),
    freshness,
    fullyCitable: input.sources.length > 0 && input.sources.every((s) => s.tier === "A"),
  };
}

/**
 * Canonical, deterministic serialization for hashing into proof-of-record. Sources
 * are sorted so the same provenance always yields the same payload.
 */
export function provenancePayload(p: PredictionProvenance): string {
  const sources = [...p.sources]
    .map((s) => `${s.source}@${s.snapshotId}@${s.fetchedAt}@${s.tier}`)
    .sort()
    .join(",");
  return `${p.predictionId}|${p.modelVersion}|${p.generatedAt}|${sources}`;
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
