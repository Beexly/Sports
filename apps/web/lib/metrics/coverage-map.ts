/**
 * Derived-metrics coverage map — the "stats we have that they don't" registry.
 *
 * Each entry is a derived metric in the Data Dominance factory: what proprietary
 * signal a competitor (NGS / PFF / ESPN) withholds, and how we compute a transparent
 * equivalent from a CLEARED open source. Every entry names the source + clearance
 * request it depends on, so the map is **surfaced behind `checkClearance()`** — a metric
 * only appears as live coverage if its underlying source is actually cleared for the
 * commercial/derived use we put it to. No clearance, no row. That keeps the marketing
 * coverage map and the rights posture in lock-step (no "we have X" claim without rights).
 */

import {
  checkClearance,
  type ClearanceResult,
} from "../scraping/clearance-engine";
import type { ExtractionMode, ExtractionIntent } from "../scraping/extraction-modes";
import type { ToolId } from "../scraping/tool-registry";

/**
 * Tier mirrors the Data Dominance pillar:
 *  1 = computed from open pbp, real-time, zero rights risk (our highest-value lane)
 *  2 = consume + cite free NGS/PFR aggregates
 *  3 = CC-BY-SA inputs (segregate + caveat)
 *  4 = tracking-only — ship clearly-labeled proxies, never copy
 */
export type MetricTier = 1 | 2 | 3 | 4;

export interface MetricCoverageEntry {
  readonly id: string;
  readonly name: string;
  /** Short marketing label for the coverage map UI. */
  readonly shortLabel: string;
  readonly tier: MetricTier;
  /** The cleared source the metric is derived from (must exist in the rights registry). */
  readonly sourceId: string;
  /** Clearance request this metric's data dependency implies. */
  readonly clearance: {
    readonly mode: ExtractionMode;
    readonly toolId: ToolId;
    readonly intents: readonly ExtractionIntent[];
  };
  /** What the proprietary provider withholds (the gap we fill). */
  readonly theyWithhold: string;
  /** How we compute a transparent equivalent. */
  readonly weCompute: string;
  /** Attribution string that must propagate to any output surfacing this metric. */
  readonly attribution: string;
}

/**
 * The live registry. Grows one verified row per metric slice (each carrying its own
 * clearance + stat-commandment envelope). Opponent-adjusted EPA is the first Tier-1 row.
 */
export const METRIC_COVERAGE: readonly MetricCoverageEntry[] = [
  {
    id: "opponent-adjusted-epa",
    name: "Opponent-adjusted EPA/play",
    shortLabel: "Opp-adjusted EPA (our DVOA)",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      // We derive a signal (derived_analytics), store it (storage), and show it to
      // subscribers (commercial_display) — nflverse (CC-BY-4.0) clears all three.
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Proprietary efficiency ratings (DVOA-style, opponent-adjusted) are paywalled and " +
      "their methodology is closed.",
    weCompute:
      "Solve epa ≈ leagueMean + offense + defense by iterative coordinate descent over open " +
      "play-by-play, re-centred each pass — a transparent, reproducible opponent adjustment.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
];

/** Run the clearance check for a single metric's data dependency. Pure (now-injectable). */
export function metricClearance(entry: MetricCoverageEntry, now = new Date()): ClearanceResult {
  return checkClearance(
    {
      source_id: entry.sourceId,
      mode: entry.clearance.mode,
      tool_id: entry.clearance.toolId,
      intents: entry.clearance.intents,
    },
    now,
  );
}

/**
 * The metrics we may surface as live coverage: only those whose underlying source
 * clears for the commercial/derived use the metric puts it to. Fail-closed — anything
 * that does not clear is omitted, never shown.
 */
export function clearedMetrics(now = new Date()): readonly MetricCoverageEntry[] {
  return METRIC_COVERAGE.filter((m) => metricClearance(m, now).allowed);
}

export interface CoverageMapRow {
  readonly metric: string;
  readonly tier: MetricTier;
  readonly theyWithhold: string;
  readonly weCompute: string;
  readonly attribution: string;
}

/**
 * The "stats we have that they don't" rows for the marketing/coverage UI — derived from
 * the cleared set only, so the public claim never outruns the rights posture.
 */
export function coverageMapRows(now = new Date()): readonly CoverageMapRow[] {
  return clearedMetrics(now).map((m) => ({
    metric: m.shortLabel,
    tier: m.tier,
    theyWithhold: m.theyWithhold,
    weCompute: m.weCompute,
    attribution: m.attribution,
  }));
}
