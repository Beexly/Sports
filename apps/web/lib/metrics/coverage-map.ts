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
      "play-by-play, re-centred each pass: a transparent, reproducible opponent adjustment.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "trench-pocket-collapse-rate",
    name: "Trench Pocket Collapse & Stunt Disruption Rate",
    shortLabel: "Trench Pocket Collapse Rate",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Pass-rush win rate and offensive line protection grades are locked behind enterprise scouting subscriptions.",
    weCompute:
      "Combine play-by-play pressure, sack, and quarterback hit events with offensive line snap continuity and blitz-stunt tendencies.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "vacated-injury-target-redistribution",
    name: "Injury Vacated Target & Carry Redistribution",
    shortLabel: "Vacated Volume Redistribution",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Static projection sites divide season totals by team games played, under-projecting players returning from injury or stepping into vacated roles.",
    weCompute:
      "Reallocate vacated targets, air yards, and red-zone carries across active personnel groupings using per-player active participation splits.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "fourth-down-double-dqn-aggressiveness",
    name: "Fourth-Down Go-For-It Decision Value",
    shortLabel: "4th-Down Decision Value",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Standard fourth-down bots use single-network max-value estimates that overstate conversion value in high-pressure spots.",
    weCompute:
      "Decouple play selection from value estimation across go-for-it, field-goal, and punt options conditioned on trench pass-protection and red-zone efficiency.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "coverage-shell-yprr-matchup",
    name: "Receiver Route Efficiency vs Man & Zone Coverage Shells",
    shortLabel: "Man/Zone Route Matchup",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Receiver yards-per-route-run splits against specific coverage shells (Cover-1, Cover-3, Quarters) are hidden behind tiered charting paywalls.",
    weCompute:
      "Cross-reference receiver alignment, depth of target, and formation participation against opponent defensive coverage and blitz tendencies.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "script-elasticity-proe-pace",
    name: "Pass Rate Over Expected (PROE) & Game-Script Pace Elasticity",
    shortLabel: "PROE & Script Elasticity",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Public pace tables show full-game averages that mask how coordinators change tempo when leading or trailing by a touchdown.",
    weCompute:
      "Measure neutral-script seconds per snap alongside pass-rate shifts when leading or trailing by 8+ points across first-half and second-half regimes.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "weather-aerodynamic-ball-flight",
    name: "Wind, Temperature & Precipitation Passing Penalty",
    shortLabel: "Weather Ball-Flight Impact",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Generic weather tags ignore stadium orientation, crosswind turbulence, and deep-throw air-yard compression.",
    weCompute:
      "Model wind speed, gust turbulence, temperature density, and wet-ball handling impact on deep completion rates and field-goal make probabilities.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "correlated-sgp-joint-tail-pricing",
    name: "Correlated Same-Game Parlay Joint Script Pricing",
    shortLabel: "Correlated SGP Fair Pricing",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Sportsbooks apply a 15-30% hidden hold on Same-Game Parlays by mispricing how game scripts link quarterback, receiver, and running back outcomes.",
    weCompute:
      "Evaluate connected drive-by-drive game scripts to price true multi-leg joint probabilities and expose bookmaker correlation markups.",
    attribution: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  },
  {
    id: "two-sided-devig-clv-gate",
    name: "Two-Sided Market De-Vig & Closing Line Value Gate",
    shortLabel: "Two-Sided De-Vig & CLV Gate",
    tier: 1,
    sourceId: "nflverse",
    clearance: {
      mode: "open_dataset_ingest",
      toolId: "fetch-native",
      intents: ["derived_analytics", "storage", "commercial_display"],
    },
    theyWithhold:
      "Tout services compare projections against juiced -110 lines without stripping bookmaker hold or accounting for calibration uncertainty.",
    weCompute:
      "Strip two-sided bookmaker vig using Shin and power de-vigging and require clear post-calibration edge before any market clears the pass gate.",
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
 * that does not clear is omitted, never shown. (`metrics` is injectable for testing the
 * fail-closed path; defaults to the live registry.)
 */
export function clearedMetrics(
  now = new Date(),
  metrics: readonly MetricCoverageEntry[] = METRIC_COVERAGE,
): readonly MetricCoverageEntry[] {
  return metrics.filter((m) => metricClearance(m, now).allowed);
}

export function metricCoverageById(
  id: string,
  metrics: readonly MetricCoverageEntry[] = METRIC_COVERAGE,
): MetricCoverageEntry | null {
  return metrics.find((metric) => metric.id === id) ?? null;
}

export interface CoverageMapRow {
  readonly id: string;
  readonly metric: string;
  readonly tier: MetricTier;
  readonly sourceId: string;
  readonly theyWithhold: string;
  readonly weCompute: string;
  readonly attribution: string;
}

export type CoverageMapUiRow = {
  readonly id: string;
  readonly metric: string;
  readonly tier: MetricTier;
  readonly tierLabel: string;
  readonly sourceId: string;
  readonly claimStatus: "cleared";
  readonly competitorGap: string;
  readonly transparentEquivalent: string;
  readonly attribution: string;
  readonly priced: false;
};

export type CoverageMapUiData = {
  readonly headline: "Stats we have that closed-box products do not show";
  readonly generatedAt: string;
  readonly summary: {
    readonly clearedRows: number;
    readonly withheldRows: number;
    readonly tierOneRows: number;
    readonly sourceCount: number;
    readonly priced: false;
  };
  readonly rows: readonly CoverageMapUiRow[];
};

class UnexpectedMetricTierError extends Error {
  readonly name = "UnexpectedMetricTierError";

  constructor(readonly tier: never) {
    super(`Unexpected metric tier: ${tier}`);
  }
}

function assertNeverMetricTier(tier: never): never {
  throw new UnexpectedMetricTierError(tier);
}

function tierLabel(tier: MetricTier): string {
  switch (tier) {
    case 1:
      return "Tier 1: open play-by-play derived";
    case 2:
      return "Tier 2: cleared public aggregate";
    case 3:
      return "Tier 3: attribution-segregated input";
    case 4:
      return "Tier 4: transparent proxy only";
    default:
      return assertNeverMetricTier(tier);
  }
}

/**
 * The "stats we have that they don't" rows for the marketing/coverage UI — derived from
 * the cleared set only, so the public claim never outruns the rights posture.
 */
export function coverageMapRows(
  now = new Date(),
  metrics: readonly MetricCoverageEntry[] = METRIC_COVERAGE,
): readonly CoverageMapRow[] {
  return clearedMetrics(now, metrics).map((m) => ({
    id: m.id,
    metric: m.shortLabel,
    sourceId: m.sourceId,
    tier: m.tier,
    theyWithhold: m.theyWithhold,
    weCompute: m.weCompute,
    attribution: m.attribution,
  }));
}

export function coverageMapUiData(
  now = new Date(),
  metrics: readonly MetricCoverageEntry[] = METRIC_COVERAGE,
): CoverageMapUiData {
  const rows: readonly CoverageMapUiRow[] = coverageMapRows(now, metrics).map((row) => ({
    attribution: row.attribution,
    claimStatus: "cleared",
    competitorGap: row.theyWithhold,
    id: row.id,
    metric: row.metric,
    priced: false,
    sourceId: row.sourceId,
    tier: row.tier,
    tierLabel: tierLabel(row.tier),
    transparentEquivalent: row.weCompute,
  }));
  const withheldRows = metrics.length - rows.length;
  const sources = new Set(rows.map((row) => row.sourceId));

  return {
    generatedAt: now.toISOString(),
    headline: "Stats we have that closed-box products do not show",
    rows,
    summary: {
      clearedRows: rows.length,
      priced: false,
      sourceCount: sources.size,
      tierOneRows: rows.filter((row) => row.tier === 1).length,
      withheldRows,
    },
  };
}
