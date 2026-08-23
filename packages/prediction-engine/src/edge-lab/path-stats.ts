/**
 * CL3 · path-stats — pure line-path summaries (PUBLIC lane).
 *
 * Doctrine C6.2 (docs/data/CARDS_CLOSING_LINE.md §CL3): textbook time-series
 * summaries over a market's line path. Zero repo semantics — safe for any free
 * model per FREE_WINDOW_BLITZ §3b, hence PUBLIC lane.
 *
 * Pure math: no I/O, no imports, no Math.random. Strict TS, noUncheckedIndexedAccess-clean.
 * Deterministic given inputs. Never mutate inputs.
 *
 * Feature keys emitted here may NEVER match the closing-line pattern /clos|final_line|settle/i
 * (enforced by asof-store.ts ingest + close-distillation.ts train); this module emits no
 * feature keys at all — it only computes path statistics over (t, v) points.
 */

export interface PathPoint {
  /** Epoch milliseconds — snapshot capture time. */
  readonly t: number;
  /** The observed value at that time (line, price-as-decimal, etc.). */
  readonly v: number;
}

const RANGE_ERROR_PREFIX = "path-stats";

/**
 * Coerce and validate a single PathPoint's components. Throws RangeError on
 * non-finite t or v — fail closed (I8: fail on bad data, never divide by zero).
 */
function validatePoint(p: PathPoint, context: string): void {
  if (!Number.isFinite(p.t)) {
    throw new RangeError(`${RANGE_ERROR_PREFIX}: non-finite t in ${context} (${p.t})`);
  }
  if (!Number.isFinite(p.v)) {
    throw new RangeError(`${RANGE_ERROR_PREFIX}: non-finite v in ${context} (${p.v})`);
  }
}

/**
 * Latest point with point.t <= t; ties on t → the LAST one in ascending-(t, input-index)
 * order. Null when no point has t <= T.
 */
export function latestAtOrBefore(points: readonly PathPoint[], t: number): PathPoint | null {
  if (!Number.isFinite(t)) {
    throw new RangeError(`${RANGE_ERROR_PREFIX}: non-finite cutoff t (${t})`);
  }
  const sorted = stableSortAscending(points);
  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const pt = sorted[mid]!;
    validatePoint(pt, "latestAtOrBefore");
    if (pt.t <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found < 0) return null;
  return sorted[found]!;
}

/**
 * OLS slope of v regressed on t expressed in HOURS (v-units per hour).
 * Returns null when < 2 points or all t identical (zero variance — refuse, never divide by 0).
 */
export function slopePerHour(points: readonly PathPoint[]): number | null {
  const valid = filterFinite(points);
  if (valid.length < 2) return null;

  const ts = valid.map((p) => p.t);
  const vs = valid.map((p) => p.v);

  // Check for zero variance in t — all timestamps identical.
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  if (tMin === tMax) return null; // zero variance → refuse

  const n = valid.length;
  let sumT = 0;
  let sumV = 0;
  let sumTT = 0;
  let sumTV = 0;
  for (let i = 0; i < n; i++) {
    const ti = ts[i]!;
    const vi = vs[i]!;
    sumT += ti;
    sumV += vi;
    sumTT += ti * ti;
    sumTV += ti * vi;
  }

  const denom = n * sumTT - sumT * sumT;
  // With tMin !== tMax, denom should be > 0, but guard against float edge cases.
  if (denom === 0) return null;

  const slopePerMs = (n * sumTV - sumT * sumV) / denom;
  // Convert from per-ms to per-hour (1 hour = 3,600,000 ms).
  return (slopePerMs * 3_600_000) / 1;
}

/**
 * Max |v[i+1] − v[i]| over consecutive points in ascending-t order.
 * Returns null when < 2 points.
 */
export function maxAbsStep(points: readonly PathPoint[]): number | null {
  const valid = filterFinite(points);
  if (valid.length < 2) return null;

  let maxStep = 0;
  for (let i = 1; i < valid.length; i++) {
    const step = Math.abs((valid[i]!.v ?? 0) - (valid[i - 1]!.v ?? 0));
    if (step > maxStep) maxStep = step;
  }
  return maxStep;
}

/**
 * Range (max − min) of a list of values. Returns null when < 2 values.
 */
export function rangeSpread(values: readonly number[]): number | null {
  const valid: number[] = [];
  for (const v of values) {
    if (!Number.isFinite(v)) {
      throw new RangeError(`${RANGE_ERROR_PREFIX}: non-finite value in rangeSpread (${v})`);
    }
    valid.push(v);
  }
  if (valid.length < 2) return null;
  return Math.max(...valid) - Math.min(...valid);
}

// ── internal helpers ────────────────────────────────────────────────────────

/**
 * Stable sort ascending by (t, then input index). Never mutates the input array.
 * Equal-t points preserve their original relative order (stable sort).
 */
function stableSortAscending(points: readonly PathPoint[]): PathPoint[] {
  // Check all points are finite first.
  for (let i = 0; i < points.length; i++) {
    validatePoint(points[i]!, `stableSortAscending[${i}]`);
  }
  // Decorate with original index to preserve input order on ties.
  const decorated = points.map((p, i) => ({ t: p.t, v: p.v, idx: i }));
  decorated.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    return a.idx - b.idx;
  });
  return decorated.map((d) => ({ t: d.t, v: d.v }));
}

/**
 * Filter to finite-valued points (both t and v must be finite).
 * Throws RangeError on non-finite values — fail closed (never silently skip bad data).
 */
function filterFinite(points: readonly PathPoint[]): PathPoint[] {
  for (let i = 0; i < points.length; i++) {
    validatePoint(points[i]!, `filterFinite[${i}]`);
  }
  // After validation, all are finite. Return sorted copy.
  return stableSortAscending(points);
}
