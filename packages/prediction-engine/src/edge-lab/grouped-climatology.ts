/**
 * Grouped climatology scoring for the props specialist.
 *
 * Soybean Kaggle + GSE honesty: a pooled base rate (the receptions-over
 * dummy 0.3533 across WR/TE/RB) is a weak naive. The honest climatology
 * is the location×month analog — (positionGroup × week) empirical hit
 * rate, fit on the training window only, with backoff when a cell is
 * thin: group → parent → pooled.
 *
 *   BSS_pooled  = 1 − BS_model / BS_pooled     // necessary, not sufficient
 *   BSS_grouped = 1 − BS_model / BS_grouped    // skill beyond the cell mean
 *
 * Beating pooled climatology while losing to grouped climatology is
 * grouping-loss: the specialist recovered the cell mean the dummy
 * averaged away. That is not priced edge. This module never sees a
 * book q and never writes into independent p.
 *
 * Walk-forward contract: fit on season N−1, score season N. Fitting
 * on the same outcomes being scored is the Murphy UNC term (in-sample
 * pooled climatology), which is a different, weaker claim.
 *
 * Pure, deterministic, no I/O.
 */

export const GROUPED_CLIMATOLOGY_METHOD_TAG = "grouped_climatology_v1" as const;

/** Default cell size before backing off. Sparse week×position cells must not invent a rate. */
export const DEFAULT_MIN_CELL_N = 20;

export type BinaryOutcome = 0 | 1;

export type ClimatologySource = "group" | "parent" | "pooled";

export interface ClimTrainRow {
  /** Fine key, e.g. "WR|8" (position × week). */
  readonly group: string;
  /** Coarse key, e.g. "WR". Optional backoff. */
  readonly parent?: string;
  readonly y: BinaryOutcome;
}

export interface CellRate {
  readonly hits: number;
  readonly n: number;
  readonly rate: number;
}

export interface GroupedClimatology {
  readonly rates: ReadonlyMap<string, CellRate>;
  readonly parentRates: ReadonlyMap<string, CellRate>;
  readonly pooled: CellRate;
  readonly n: number;
}

export interface GroupedPrediction {
  readonly p: number;
  readonly source: ClimatologySource;
  readonly n: number;
}

export interface ScoredCase {
  readonly pModel: number;
  readonly y: BinaryOutcome;
  readonly group: string;
  readonly parent?: string;
}

export interface ClimatologyScorecard {
  readonly n: number;
  readonly modelBrier: number;
  readonly pooledClimBrier: number;
  readonly groupedClimBrier: number;
  readonly bssPooled: number | null;
  readonly bssGrouped: number | null;
  /**
   * True when the model beats the pooled dummy but not the grouped
   * naive. The dummy was too weak; this is not skill.
   */
  readonly groupingLoss: boolean;
}

function assertUnitInclusive(p: number, label: string): void {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new RangeError(`${label} must be in [0, 1] (got ${p})`);
  }
}

function assertBinary(y: number, label: string): void {
  if (y !== 0 && y !== 1) {
    throw new RangeError(`${label} must be 0 or 1 (got ${y})`);
  }
}

function cell(hits: number, n: number): CellRate {
  return { hits, n, rate: n === 0 ? 0.5 : hits / n };
}

function bump(map: Map<string, { hits: number; n: number }>, key: string, y: BinaryOutcome): void {
  const cur = map.get(key);
  if (cur) {
    cur.hits += y;
    cur.n += 1;
  } else {
    map.set(key, { hits: y, n: 1 });
  }
}

function freeze(raw: Map<string, { hits: number; n: number }>): Map<string, CellRate> {
  const out = new Map<string, CellRate>();
  for (const [k, v] of raw) out.set(k, cell(v.hits, v.n));
  return out;
}

/** Mean Brier of (p, y) pairs. Empty sample throws rather than publish 0. */
export function brierMean(pairs: readonly { readonly p: number; readonly y: BinaryOutcome }[]): number {
  if (pairs.length === 0) {
    throw new RangeError("brierMean: empty sample");
  }
  let s = 0;
  for (const row of pairs) {
    assertUnitInclusive(row.p, "p");
    assertBinary(row.y, "y");
    const d = row.p - row.y;
    s += d * d;
  }
  return s / pairs.length;
}

/**
 * BSS = 1 − BS_model / BS_reference. Null when the reference is not a
 * usable baseline (non-finite or ≤ 0). A perfect reference (Brier 0)
 * would make the ratio undefined; we refuse it rather than inf.
 */
export function brierSkillScore(modelBrier: number, referenceBrier: number): number | null {
  if (!Number.isFinite(modelBrier) || !Number.isFinite(referenceBrier) || referenceBrier <= 0) {
    return null;
  }
  return 1 - modelBrier / referenceBrier;
}

/** Fit grouped rates on TRAIN only. Never pass the scored outcomes in here. */
export function fitGroupedClimatology(rows: readonly ClimTrainRow[]): GroupedClimatology {
  const groups = new Map<string, { hits: number; n: number }>();
  const parents = new Map<string, { hits: number; n: number }>();
  let hits = 0;
  let n = 0;
  for (const row of rows) {
    assertBinary(row.y, "y");
    if (row.group === "") {
      throw new RangeError("fitGroupedClimatology: group must be non-empty");
    }
    bump(groups, row.group, row.y);
    if (row.parent !== undefined && row.parent !== "") {
      bump(parents, row.parent, row.y);
    }
    hits += row.y;
    n += 1;
  }
  return {
    rates: freeze(groups),
    parentRates: freeze(parents),
    pooled: cell(hits, n),
    n,
  };
}

/**
 * Predict the grouped-climatology probability with backoff.
 * Cells with n < minCellN fall through. Empty table uses 0.5 (no evidence).
 */
export function predictGrouped(
  group: string,
  parent: string | undefined,
  table: GroupedClimatology,
  minCellN: number = DEFAULT_MIN_CELL_N,
): GroupedPrediction {
  if (minCellN < 1 || !Number.isInteger(minCellN)) {
    throw new RangeError(`minCellN must be an integer ≥ 1 (got ${minCellN})`);
  }
  const g = table.rates.get(group);
  if (g && g.n >= minCellN) {
    return { p: g.rate, source: "group", n: g.n };
  }
  if (parent !== undefined && parent !== "") {
    const par = table.parentRates.get(parent);
    if (par && par.n >= minCellN) {
      return { p: par.rate, source: "parent", n: par.n };
    }
  }
  return {
    p: table.n === 0 ? 0.5 : table.pooled.rate,
    source: "pooled",
    n: table.n,
  };
}

/**
 * Score a model against walk-forward grouped climatology AND the pooled
 * dummy. `train` must be fit on a strictly earlier window.
 */
export function scoreAgainstClimatology(
  cases: readonly ScoredCase[],
  train: GroupedClimatology,
  minCellN: number = DEFAULT_MIN_CELL_N,
): ClimatologyScorecard {
  if (cases.length === 0) {
    throw new RangeError("scoreAgainstClimatology: empty sample");
  }
  const modelPairs: { p: number; y: BinaryOutcome }[] = [];
  const pooledPairs: { p: number; y: BinaryOutcome }[] = [];
  const groupedPairs: { p: number; y: BinaryOutcome }[] = [];
  const pooledP = train.n === 0 ? 0.5 : train.pooled.rate;
  for (const row of cases) {
    assertUnitInclusive(row.pModel, "pModel");
    assertBinary(row.y, "y");
    const g = predictGrouped(row.group, row.parent, train, minCellN);
    modelPairs.push({ p: row.pModel, y: row.y });
    pooledPairs.push({ p: pooledP, y: row.y });
    groupedPairs.push({ p: g.p, y: row.y });
  }
  const modelBrier = brierMean(modelPairs);
  const pooledClimBrier = brierMean(pooledPairs);
  const groupedClimBrier = brierMean(groupedPairs);
  const bssPooled = brierSkillScore(modelBrier, pooledClimBrier);
  const bssGrouped = brierSkillScore(modelBrier, groupedClimBrier);
  const groupingLoss =
    bssPooled !== null &&
    bssGrouped !== null &&
    bssPooled > 0 &&
    bssGrouped <= 0;
  return {
    n: cases.length,
    modelBrier,
    pooledClimBrier,
    groupedClimBrier,
    bssPooled,
    bssGrouped,
    groupingLoss,
  };
}
