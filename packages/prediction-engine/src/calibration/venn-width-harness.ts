/**
 * Venn-Abers Interval Width Measurement Harness
 *
 * Evaluates the empirical distribution of Venn-Abers multiprobability interval
 * widths (Δp = p1 - p0) across settled picks to provide empirical grounding
 * for epistemic uncertainty gating (e.g. `maxWidthForFire` in selective-gate.ts).
 *
 * Stratifies metrics by:
 *   1. Overall population & published-only subset
 *   2. Sport (NFL, NCAAF, MLB, NBA, Soccer, etc.)
 *   3. Bookmaker density tiers (0-book model-signal, 1-2 books, 3-5 books, 6+ books)
 *
 * Implements K-fold Cross Venn-Abers (CVAP) and Inductive Venn-Abers (IVAP)
 * with fail-closed empty-calibration semantics (width = 1.0 when uncalibrated).
 */

import { ivapPredict, type IvapCalibrationPoint, type IvapPrediction } from "./ivap.js";
import { cvapPredict, type CvapPrediction, type CvapOptions } from "./cvap.js";

export interface SettledPickRecord {
  readonly rowId: string;
  readonly sport: string;
  readonly bookCount: number;
  readonly predictedProb: number;
  readonly actualOutcome: 0 | 1;
  readonly isPublished: boolean;
  readonly settledAt?: string | Date;
}

export type BookCountTier =
  | "0_books_model_signal"
  | "1_to_2_books"
  | "3_to_5_books"
  | "6_plus_books";

export function categorizeBookCountTier(bookCount: number): BookCountTier {
  if (bookCount <= 0) return "0_books_model_signal";
  if (bookCount <= 2) return "1_to_2_books";
  if (bookCount <= 5) return "3_to_5_books";
  return "6_plus_books";
}

export interface VennWidthDistribution {
  readonly count: number;
  readonly min: number;
  readonly p10: number;
  readonly p25: number;
  readonly p50: number; // median
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly max: number;
  readonly mean: number;
  readonly shareAbove020: number;
  readonly thresholdForVeto5Pct: number;
  readonly thresholdForVeto10Pct: number;
  readonly thresholdForVeto20Pct: number;
}

export interface ScoredPickWidth {
  readonly rowId: string;
  readonly sport: string;
  readonly bookCount: number;
  readonly bookTier: BookCountTier;
  readonly predictedProb: number;
  readonly actualOutcome: 0 | 1;
  readonly isPublished: boolean;
  readonly p0: number;
  readonly p1: number;
  readonly width: number;
}

export interface StratifiedVennWidthReport {
  readonly totalSettled: number;
  readonly mode: "ivap" | "cvap";
  readonly overall: VennWidthDistribution;
  readonly publishedOnly: VennWidthDistribution;
  readonly bySport: Readonly<Record<string, VennWidthDistribution>>;
  readonly byBookTier: Readonly<Record<BookCountTier, VennWidthDistribution>>;
  readonly scoredRows: readonly ScoredPickWidth[];
}

function quantileSorted(sortedValues: readonly number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0]!;
  const clampedQ = Math.min(1, Math.max(0, q));
  const pos = clampedQ * (sortedValues.length - 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base]! + rest * (sortedValues[base + 1]! - sortedValues[base]!);
  }
  return sortedValues[base]!;
}

export function computeWidthDistribution(widths: readonly number[]): VennWidthDistribution {
  if (widths.length === 0) {
    return {
      count: 0,
      min: 0,
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      max: 0,
      mean: 0,
      shareAbove020: 0,
      thresholdForVeto5Pct: 0,
      thresholdForVeto10Pct: 0,
      thresholdForVeto20Pct: 0,
    };
  }

  const sorted = [...widths].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const countAbove020 = sorted.filter((w) => w > 0.20).length;

  return {
    count: sorted.length,
    min: sorted[0]!,
    p10: quantileSorted(sorted, 0.10),
    p25: quantileSorted(sorted, 0.25),
    p50: quantileSorted(sorted, 0.50),
    p75: quantileSorted(sorted, 0.75),
    p90: quantileSorted(sorted, 0.90),
    p95: quantileSorted(sorted, 0.95),
    max: sorted[sorted.length - 1]!,
    mean,
    shareAbove020: countAbove020 / sorted.length,
    // Veto top X% means selecting the width threshold at the (100 - X)th percentile
    thresholdForVeto5Pct: quantileSorted(sorted, 0.95),
    thresholdForVeto10Pct: quantileSorted(sorted, 0.90),
    thresholdForVeto20Pct: quantileSorted(sorted, 0.80),
  };
}

export interface RunVennWidthEvaluationOptions {
  readonly mode?: "ivap" | "cvap";
  readonly cvapFolds?: number;
  readonly minCalibrationSize?: number;
}

/**
 * Score a dataset of settled picks using Venn-Abers in K-fold cross-validation
 * or leave-one-out to produce an empirical Δp width distribution report.
 */
export function evaluateVennWidths(
  picks: readonly SettledPickRecord[],
  opts: RunVennWidthEvaluationOptions = {},
): StratifiedVennWidthReport {
  const mode = opts.mode ?? "cvap";
  const folds = opts.cvapFolds ?? 5;
  const minCal = opts.minCalibrationSize ?? 5;

  if (picks.length === 0) {
    const emptyDist = computeWidthDistribution([]);
    return {
      totalSettled: 0,
      mode,
      overall: emptyDist,
      publishedOnly: emptyDist,
      bySport: {},
      byBookTier: {
        "0_books_model_signal": emptyDist,
        "1_to_2_books": emptyDist,
        "3_to_5_books": emptyDist,
        "6_plus_books": emptyDist,
      },
      scoredRows: [],
    };
  }

  // Cross-validation scoring: for each row i, use other rows in the same stratum (or all rows if sport-specific)
  // To avoid small-sample collapse, we evaluate per-sport or globally
  const scoredRows: ScoredPickWidth[] = [];

  // Group by sport for sport-stratified calibration if sample allows, otherwise pool
  const sports = Array.from(new Set(picks.map((p) => p.sport)));

  for (const sport of sports) {
    const sportPicks = picks.filter((p) => p.sport === sport);
    const useSportSpecific = sportPicks.length >= minCal * 2;
    const pool = useSportSpecific ? sportPicks : picks;

    for (let i = 0; i < sportPicks.length; i++) {
      const target = sportPicks[i]!;
      // Calibration set is all OTHER picks in the pool (leave-one-out / holdout)
      const calPoints: IvapCalibrationPoint[] = pool
        .filter((p) => p.rowId !== target.rowId)
        .map((p) => ({ score: p.predictedProb, label: p.actualOutcome }));

      let p0 = 0.5;
      let p1 = 0.5;
      let width = 0;

      if (calPoints.length < minCal) {
        // Fail-closed uncalibrated width = 1.0
        p0 = 0;
        p1 = 1;
        width = 1.0;
      } else if (mode === "cvap") {
        const pred: CvapPrediction = cvapPredict(calPoints, target.predictedProb, { folds });
        p0 = pred.p0;
        p1 = pred.p1;
        width = Math.abs(pred.p1 - pred.p0);
      } else {
        const pred: IvapPrediction = ivapPredict(calPoints, target.predictedProb);
        p0 = pred.p0;
        p1 = pred.p1;
        width = Math.abs(pred.p1 - pred.p0);
      }

      scoredRows.push({
        rowId: target.rowId,
        sport: target.sport,
        bookCount: target.bookCount,
        bookTier: categorizeBookCountTier(target.bookCount),
        predictedProb: target.predictedProb,
        actualOutcome: target.actualOutcome,
        isPublished: target.isPublished,
        p0,
        p1,
        width,
      });
    }
  }

  // Aggregate overall
  const allWidths = scoredRows.map((r) => r.width);
  const overall = computeWidthDistribution(allWidths);

  // Published only
  const pubWidths = scoredRows.filter((r) => r.isPublished).map((r) => r.width);
  const publishedOnly = computeWidthDistribution(pubWidths);

  // By sport
  const bySport: Record<string, VennWidthDistribution> = {};
  for (const sport of sports) {
    const sWidths = scoredRows.filter((r) => r.sport === sport).map((r) => r.width);
    bySport[sport] = computeWidthDistribution(sWidths);
  }

  // By book count tier
  const tiers: BookCountTier[] = [
    "0_books_model_signal",
    "1_to_2_books",
    "3_to_5_books",
    "6_plus_books",
  ];
  const byBookTier: Record<BookCountTier, VennWidthDistribution> = {} as any;
  for (const tier of tiers) {
    const tWidths = scoredRows.filter((r) => r.bookTier === tier).map((r) => r.width);
    byBookTier[tier] = computeWidthDistribution(tWidths);
  }

  return {
    totalSettled: scoredRows.length,
    mode,
    overall,
    publishedOnly,
    bySport,
    byBookTier,
    scoredRows,
  };
}
