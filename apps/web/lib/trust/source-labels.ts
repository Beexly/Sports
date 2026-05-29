/**
 * Source labels — the canonical source attribution strings.
 * Re-exports the same vocabulary used by the EvidenceCard primitive so
 * the registry has one source of truth.
 */

export const SOURCE_LABELS = {
  provider: "Provider",
  "galaxy-model": "Galaxy model",
  aggregate: "Aggregate",
  "public-record": "Public record",
  editorial: "Editorial",
  illustrative: "Illustrative",
} as const;

export type SourceKey = keyof typeof SOURCE_LABELS;

export const FRESHNESS_LABELS = {
  live: "Live",
  fresh: "Fresh",
  today: "Today",
  stale: "Stale",
  sample: "Sample",
  unknown: "Unknown",
} as const;

export type FreshnessKey = keyof typeof FRESHNESS_LABELS;

/**
 * Map raw provider attributions to the public-safe source label.
 * Server-only — the provider id never reaches the client bundle as-is.
 */
export function publicSourceFor(providerId: string): SourceKey {
  if (providerId === "the-odds-api") return "provider";
  if (providerId === "galaxy-prediction-engine") return "galaxy-model";
  if (providerId === "espn-public" || providerId === "league-public") return "public-record";
  if (providerId === "editorial-team") return "editorial";
  if (providerId === "fixtures") return "illustrative";
  return "aggregate";
}

/**
 * The source labels that may be shown on a public surface. The internal
 * mapping above is the *only* place that translates internal provider
 * ids to these public labels.
 */
export const PUBLIC_SOURCE_KEYS: ReadonlySet<SourceKey> = new Set([
  "provider",
  "galaxy-model",
  "aggregate",
  "public-record",
  "editorial",
  "illustrative",
]);
