/**
 * Venn-Abers Interval Width Census (VENN-DP-STRATIFIED)
 *
 * Measures the empirical distribution of Venn-Abers multiprobability interval
 * widths (Δp = p1 − p0) over settled picks, to ground a future
 * `maxWidthForFire` threshold in OUR rows rather than an unsourced number.
 * The gate that would consume it (`edge-lab/selective-gate.ts`) stays
 * caller-supplied and OFF; this module only measures. Nothing here wires a
 * gate or flips a flag.
 *
 * Method (documented, reproducible):
 *  - A row is width-scored only when it carries a model probability
 *    (`predictedProb`). Rows without one are counted (`noModelProbability`)
 *    and never scored: `confidence` is a weighted score, not a probability
 *    claim, and this census does not lend it one.
 *  - A row is calibrated against the OTHER model-probability rows of its own
 *    sport, leave-one-out. A row is never inside its own calibration set —
 *    the same disjointness discipline the gate enforces
 *    (`GateSetOverlapError` in selective-gate.ts).
 *  - A row whose sport has no other model-probability rows has an EMPTY
 *    calibration set. It is counted (`emptyCalibration`) and excluded from
 *    every width distribution. Under the engine's fail-close contract an
 *    empty set returns [0, 1] (width 1) — that is a refusal STATE, not a
 *    measured width, and folding it into the distribution would read as a
 *    genuine wide interval. The census keeps the two apart on purpose.
 *  - `stratumCalibrationFloor` is REQUIRED, never defaulted: widths are also
 *    aggregated over rows whose calibration n clears the floor. The gate's
 *    own business floor is MIN_STRATUM_CALIBRATION = 100
 *    (selective-gate.ts) — pass 100 to reproduce the gate-eligible view.
 *
 * Veto thresholds: the width W above which the top X% of scored rows sit
 * (W = the (100 − X)th percentile, linearly interpolated; ties make it
 * approximate). `shareAbove020` is the share of scored rows strictly above
 * 0.20 — the paper's unsourced candidate, kept visible for comparison.
 */

import { ivapPredict, type IvapCalibrationPoint } from "./ivap.js";
import { cvapPredict } from "./cvap.js";

/** Deterministic CVAP fold seed: an unseeded stochastic output is not auditable. */
export const VENN_CENSUS_SEED = 20260918;

export interface SettledPickRecord {
  readonly rowId: string;
  readonly sport: string;
  readonly bookCount: number;
  /**
   * Model probability for the pick side. null when the row carries none —
   * such rows are counted (`noModelProbability`), never width-scored.
   */
  readonly predictedProb: number | null;
  readonly actualOutcome: 0 | 1;
  readonly isPublished: boolean;
  readonly settledAt?: string | Date;
  /** Pick market (SPREAD / TOTAL / MONEYLINE), when known. */
  readonly market?: string | null;
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

/** Exact-count stratum key: "0".."10", "11+" (11 and above share the tail). */
export function bookCountKey(bookCount: number): string {
  if (!Number.isFinite(bookCount) || bookCount <= 0) return "0";
  if (bookCount >= 11) return "11+";
  return String(Math.trunc(bookCount));
}

export interface VennWidthDistribution {
  readonly count: number;
  readonly min: number;
  readonly p10: number;
  readonly p20: number;
  readonly p30: number;
  readonly p40: number;
  readonly p50: number;
  readonly p60: number;
  readonly p70: number;
  readonly p80: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
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
  readonly market: string | null;
  readonly predictedProb: number;
  readonly actualOutcome: 0 | 1;
  readonly isPublished: boolean;
  /** Calibration points used (leave-one-out within the sport). */
  readonly calibrationN: number;
  readonly p0: number;
  readonly p1: number;
  readonly width: number;
}

export interface WidthCensusCard {
  readonly stratum: string;
  /** Every row in the stratum. */
  readonly rows: number;
  /** Rows without a model probability — counted, never scored. */
  readonly noModelProbability: number;
  /** Model probability present, calibration set empty — refusal state, not a width. */
  readonly emptyCalibration: number;
  /** Rows that received a width. */
  readonly scored: number;
  /** Width-scored rows whose calibration n clears stratumCalibrationFloor. */
  readonly scoredAboveFloor: number;
  /** Width distribution over `scored` rows. */
  readonly width: VennWidthDistribution;
  /** Width distribution over `scoredAboveFloor` rows. */
  readonly widthAboveFloor: VennWidthDistribution;
}

export interface VennWidthCensusReport {
  readonly mode: "ivap" | "cvap";
  readonly cvapFolds: number | null;
  readonly cvapSeed: number | null;
  readonly stratumCalibrationFloor: number;
  readonly totalRows: number;
  readonly overall: WidthCensusCard;
  readonly bySport: Readonly<Record<string, WidthCensusCard>>;
  readonly byBookCount: Readonly<Record<string, WidthCensusCard>>;
  readonly bySportBookCount: Readonly<Record<string, WidthCensusCard>>;
  /** Only rows carrying a market key; rows without one are absent here. */
  readonly bySportMarket: Readonly<Record<string, WidthCensusCard>>;
  readonly scoredRows: readonly ScoredPickWidth[];
}

export interface VennWidthCensusOptions {
  readonly mode?: "ivap" | "cvap";
  readonly cvapFolds?: number;
  readonly cvapSeed?: number;
  /**
   * REQUIRED. No invented default: the caller states the floor its use case
   * needs (100 reproduces the gate's MIN_STRATUM_CALIBRATION view).
   */
  readonly stratumCalibrationFloor: number;
}

function quantileSorted(sortedValues: readonly number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0]!;
  const clampedQ = Math.min(1, Math.max(0, q));
  const pos = clampedQ * (sortedValues.length - 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedValues[base + 1];
  if (next !== undefined) {
    return sortedValues[base]! + rest * (next - sortedValues[base]!);
  }
  return sortedValues[base]!;
}

const EMPTY_DISTRIBUTION: VennWidthDistribution = {
  count: 0,
  min: 0,
  p10: 0,
  p20: 0,
  p30: 0,
  p40: 0,
  p50: 0,
  p60: 0,
  p70: 0,
  p80: 0,
  p90: 0,
  p95: 0,
  p99: 0,
  max: 0,
  mean: 0,
  shareAbove020: 0,
  thresholdForVeto5Pct: 0,
  thresholdForVeto10Pct: 0,
  thresholdForVeto20Pct: 0,
};

export function computeWidthDistribution(widths: readonly number[]): VennWidthDistribution {
  if (widths.length === 0) return EMPTY_DISTRIBUTION;

  const sorted = [...widths].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const countAbove020 = sorted.filter((w) => w > 0.2).length;

  return {
    count: sorted.length,
    min: sorted[0]!,
    p10: quantileSorted(sorted, 0.1),
    p20: quantileSorted(sorted, 0.2),
    p30: quantileSorted(sorted, 0.3),
    p40: quantileSorted(sorted, 0.4),
    p50: quantileSorted(sorted, 0.5),
    p60: quantileSorted(sorted, 0.6),
    p70: quantileSorted(sorted, 0.7),
    p80: quantileSorted(sorted, 0.8),
    p90: quantileSorted(sorted, 0.9),
    p95: quantileSorted(sorted, 0.95),
    p99: quantileSorted(sorted, 0.99),
    max: sorted[sorted.length - 1]!,
    mean: sum / sorted.length,
    shareAbove020: countAbove020 / sorted.length,
    // Veto top X% ⇒ threshold at the (100 − X)th percentile.
    thresholdForVeto5Pct: quantileSorted(sorted, 0.95),
    thresholdForVeto10Pct: quantileSorted(sorted, 0.9),
    thresholdForVeto20Pct: quantileSorted(sorted, 0.8),
  };
}

type RowCensus =
  | { readonly kind: "no_model"; readonly row: SettledPickRecord }
  | { readonly kind: "empty"; readonly row: SettledPickRecord }
  | { readonly kind: "scored"; readonly row: SettledPickRecord; readonly scored: ScoredPickWidth };

function buildCard(
  stratum: string,
  rows: readonly RowCensus[],
  floor: number,
): WidthCensusCard {
  const scored = rows.filter((r): r is Extract<RowCensus, { kind: "scored" }> => r.kind === "scored");
  const above = scored.filter((r) => r.scored.calibrationN >= floor);
  return {
    stratum,
    rows: rows.length,
    noModelProbability: rows.filter((r) => r.kind === "no_model").length,
    emptyCalibration: rows.filter((r) => r.kind === "empty").length,
    scored: scored.length,
    scoredAboveFloor: above.length,
    width: computeWidthDistribution(scored.map((r) => r.scored.width)),
    widthAboveFloor: computeWidthDistribution(above.map((r) => r.scored.width)),
  };
}

/**
 * Score a dataset of settled picks with Venn-Abers and return the census.
 * The caller supplies rows; filtering (published / all) is the caller's
 * decision and should be stated where the numbers are reported.
 */
export function evaluateVennWidths(
  picks: readonly SettledPickRecord[],
  opts: VennWidthCensusOptions,
): VennWidthCensusReport {
  const mode = opts.mode ?? "cvap";
  const folds = opts.cvapFolds ?? 5;
  const seed = opts.cvapSeed ?? VENN_CENSUS_SEED;
  const floor = opts.stratumCalibrationFloor;
  if (!Number.isFinite(floor) || floor < 1) {
    throw new RangeError(
      "evaluateVennWidths: stratumCalibrationFloor is required (finite, >= 1) — no invented default",
    );
  }

  const census: RowCensus[] = [];
  const scoredRows: ScoredPickWidth[] = [];

  const sports = Array.from(new Set(picks.map((p) => p.sport))).sort();
  for (const sport of sports) {
    const sportRows = picks.filter((p) => p.sport === sport);
    const covered = sportRows.filter((p) => p.predictedProb != null);
    const calAll: IvapCalibrationPoint[] = covered.map((p) => ({
      score: p.predictedProb as number,
      label: p.actualOutcome,
    }));
    const coveredIndexByRowId = new Map<string, number>();
    covered.forEach((p, i) => coveredIndexByRowId.set(p.rowId, i));

    for (const row of sportRows) {
      if (row.predictedProb == null) {
        census.push({ kind: "no_model", row });
        continue;
      }
      const selfIdx = coveredIndexByRowId.get(row.rowId);
      const calPoints = calAll.filter((_, i) => i !== selfIdx);
      if (calPoints.length === 0) {
        // Empty calibration: a refusal state, not a width. Counted, never
        // folded into any distribution (under fail-close it would be [0,1]).
        census.push({ kind: "empty", row });
        continue;
      }

      const pred =
        mode === "cvap"
          ? cvapPredict(calPoints, row.predictedProb, { folds, seed })
          : ivapPredict(calPoints, row.predictedProb);
      const p0 = Math.min(pred.p0, pred.p1);
      const p1 = Math.max(pred.p0, pred.p1);
      const scored: ScoredPickWidth = {
        rowId: row.rowId,
        sport: row.sport,
        bookCount: row.bookCount,
        market: row.market ?? null,
        predictedProb: row.predictedProb,
        actualOutcome: row.actualOutcome,
        isPublished: row.isPublished,
        calibrationN: calPoints.length,
        p0,
        p1,
        width: p1 - p0,
      };
      scoredRows.push(scored);
      census.push({ kind: "scored", row, scored });
    }
  }

  const byKey = (keyFn: (r: RowCensus) => string | null): Record<string, WidthCensusCard> => {
    const map = new Map<string, RowCensus[]>();
    for (const r of census) {
      const k = keyFn(r);
      if (k == null) continue;
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const out: Record<string, WidthCensusCard> = {};
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [k, list] of entries) {
      out[k] = buildCard(k, list, floor);
    }
    return out;
  };

  return {
    mode,
    cvapFolds: mode === "cvap" ? folds : null,
    cvapSeed: mode === "cvap" ? seed : null,
    stratumCalibrationFloor: floor,
    totalRows: picks.length,
    overall: buildCard("ALL", census, floor),
    bySport: byKey((r) => r.row.sport),
    byBookCount: byKey((r) => bookCountKey(r.row.bookCount)),
    bySportBookCount: byKey((r) => `${r.row.sport}|${bookCountKey(r.row.bookCount)}`),
    bySportMarket: byKey((r) => (r.row.market ? `${r.row.sport}|${r.row.market}` : null)),
    scoredRows,
  };
}
