/**
 * Walk-forward taxonomy diagnostics harness.
 *
 * `summarizeCategoryDiagnostics` in sports-taxonomy.ts is a pure aggregator
 * with no production call site. This module is that call site: given a batch
 * of per-row outcomes (each carrying its own SportsGameContext), it assigns a
 * Mondrian category per row, aggregates coverage / width / residual, and
 * returns an inspectable report.
 *
 * Deliberately does NOT reshape selective-gate.ts. The gate stamps a single
 * taxonomyCtx across every decision in one call (correct for its one-game
 * consumer). Replay / walk-forward needs per-row context; that lives here.
 *
 * Pure functions. No mutable module state. Safe for concurrent use.
 */

import {
  assignMondrianCategory,
  summarizeCategoryDiagnostics,
  type CategoryDiagnostics,
  type SportsGameContext,
  type TaxonomyCategory,
} from "../conformal/sports-taxonomy.js";

/** One evaluated row from a walk-forward or historical-replay pass. */
export interface WalkForwardTaxonomyRow {
  /** Stable row identity (game id, pick id, etc.) — diagnostic only. */
  readonly rowId?: string;
  /** Game context used to assign the Mondrian category. */
  readonly context: SportsGameContext;
  /**
   * Whether the conformal / multiprob interval covered the realized outcome
   * for this row. Undefined when coverage was not measured.
   */
  readonly covered?: boolean;
  /** Calibrated interval width (upper − lower). Undefined when unknown. */
  readonly width?: number;
  /** Residual (e.g. |score − label| or signed residual). Undefined when unknown. */
  readonly residual?: number;
}

export interface WalkForwardTaxonomyOptions {
  /** Mondrian level: 1 = home|fav, 2 = home|fav|rest. Default 1. */
  readonly level?: 1 | 2;
  /**
   * Minimum sample size before a category is flagged as under-powered.
   * Default 30 — a conservative floor for group-conditional claims; not a
   * statistical theorem, just an operational alert threshold.
   */
  readonly minSamplesForTrust?: number;
  /**
   * Target coverage rate used only for the under-coverage flag.
   * Default 0.9. Categories whose empirical coverage falls more than
   * `coverageSlack` below this are flagged.
   */
  readonly targetCoverage?: number;
  /** Slack below targetCoverage before flagging. Default 0.05. */
  readonly coverageSlack?: number;
}

export interface CategoryAlert {
  readonly category: TaxonomyCategory;
  readonly kind: "underpowered" | "under_coverage" | "wide_intervals";
  readonly detail: string;
}

export interface WalkForwardTaxonomyReport {
  readonly totalRows: number;
  readonly level: 1 | 2;
  readonly perCategory: readonly CategoryDiagnostics[];
  /** Categories with sampleSize < minSamplesForTrust. */
  readonly underpowered: readonly TaxonomyCategory[];
  /** Categories whose empirical coverage is materially below target. */
  readonly underCoverage: readonly TaxonomyCategory[];
  /** Free-text alerts combining the above (and width concerns). */
  readonly alerts: readonly CategoryAlert[];
  /** Overall empirical coverage across all rows that reported covered. */
  readonly overallCoverage: number | null;
  /** Overall mean width across all rows that reported width. */
  readonly overallMeanWidth: number | null;
}

/**
 * Assign Mondrian categories per row and aggregate diagnostics.
 *
 * Pure: identical input → identical report. Never invents coverage or width;
 * rows that omit those fields simply do not contribute to those aggregates.
 */
export function runWalkForwardTaxonomy(
  rows: readonly WalkForwardTaxonomyRow[],
  options: WalkForwardTaxonomyOptions = {},
): WalkForwardTaxonomyReport {
  const level = options.level ?? 1;
  const minSamples = options.minSamplesForTrust ?? 30;
  const targetCoverage = options.targetCoverage ?? 0.9;
  const coverageSlack = options.coverageSlack ?? 0.05;

  const entries = rows.map((row) => ({
    category: assignMondrianCategory(row.context, level),
    covered: row.covered,
    width: row.width,
    residual: row.residual,
  }));

  const perCategory = summarizeCategoryDiagnostics(entries);

  const underpowered: TaxonomyCategory[] = [];
  const underCoverage: TaxonomyCategory[] = [];
  const alerts: CategoryAlert[] = [];

  for (const cat of perCategory) {
    if (cat.sampleSize < minSamples) {
      underpowered.push(cat.category);
      alerts.push({
        category: cat.category,
        kind: "underpowered",
        detail: `n=${cat.sampleSize} < minSamplesForTrust=${minSamples} — group-conditional claims under-powered`,
      });
    }
    if (
      cat.coverage !== undefined &&
      cat.sampleSize >= minSamples &&
      cat.coverage < targetCoverage - coverageSlack
    ) {
      underCoverage.push(cat.category);
      alerts.push({
        category: cat.category,
        kind: "under_coverage",
        detail: `empirical coverage ${cat.coverage.toFixed(3)} is below target ${targetCoverage} − slack ${coverageSlack}`,
      });
    }
    // Wide-interval alert: mean width > 0.25 on a well-populated category is a
    // soft honesty flag — the calibration set is not pinning probabilities down.
    if (
      cat.meanWidth !== undefined &&
      cat.sampleSize >= minSamples &&
      cat.meanWidth > 0.25
    ) {
      alerts.push({
        category: cat.category,
        kind: "wide_intervals",
        detail: `mean width ${cat.meanWidth.toFixed(3)} > 0.25 on n=${cat.sampleSize} — intervals are loose for this stratum`,
      });
    }
  }

  let coveredCount = 0;
  let coveredDenom = 0;
  let widthSum = 0;
  let widthDenom = 0;
  for (const e of entries) {
    if (e.covered !== undefined) {
      coveredDenom += 1;
      if (e.covered) coveredCount += 1;
    }
    if (e.width !== undefined && Number.isFinite(e.width)) {
      widthSum += e.width;
      widthDenom += 1;
    }
  }

  return {
    totalRows: rows.length,
    level,
    perCategory,
    underpowered,
    underCoverage,
    alerts,
    overallCoverage: coveredDenom > 0 ? coveredCount / coveredDenom : null,
    overallMeanWidth: widthDenom > 0 ? widthSum / widthDenom : null,
  };
}

/**
 * Convenience: build WalkForwardTaxonomyRow[] from FiredDecision-like objects
 * that already carry taxonomyCategory + width, when the original context is
 * no longer available. Falls back to parsing a level-1 category string of the
 * form "home|favorite" / "away|underdog". Returns null context fields that
 * cannot be recovered honestly — never invents restDays or optional tags.
 */
export function contextFromLevel1Category(
  category: TaxonomyCategory,
): SportsGameContext | null {
  const parts = category.split("|");
  if (parts.length < 2) return null;
  const home = parts[0];
  const fav = parts[1];
  if (
    (home !== "home" && home !== "away") ||
    (fav !== "favorite" && fav !== "underdog")
  ) {
    return null;
  }
  return {
    isHome: home === "home",
    isFavorite: fav === "favorite",
    // Rest is unknown when recovering from a level-1 stamp; use the neutral
    // bucket so assignMondrianCategory(level=1) round-trips. Level-2 recovery
    // is intentionally unsupported here — inventing restDays would be a lie.
    restDays: 5,
  };
}
