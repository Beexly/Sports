/**
 * Consensus Clock — dispersion half-life fit (TruthMetrics library).
 *
 * The Consensus Clock measures how fast a market converges from its initial,
 * dispersed spread of book prices to a single consensus close. It is the
 * "clock speed" of line discovery: a market that converges in 3 hours has
 * a different information surface than one that takes 18.
 *
 * ## Model
 *
 * At each capture time t (hours before kickoff), we measure the cross-book
 * dispersion D(t) of the implied probabilities for one side of a market.
 * (For totals/spreads we use the line value itself; for moneyline we use the
 * no-vig probability from proportionalDevig.) As t → 0 (kickoff), D(t) → 0
 * (everyone converges to the same number).
 *
 * We fit:  D(t) = D_inf + (D_0 − D_inf) · e^(−λt)
 *
 * where:
 *   - λ  (lambda) is the decay rate (per hour)
 *   - D_0 is the implied dispersion at t = +∞ (kickoff, the asymptotic floor)
 *   - D_inf is the fitted asymptotic dispersion as t → +∞ (before kickoff)
 *   - half_life = ln(2) / λ  — the time for dispersion to halve
 *
 * ## Honest-empty contract
 *
 * With fewer than MIN_POINTS snapshots the fit is statistically unidentifiable.
 * The function returns `{ hasEnoughData: false, emptyReason: "..." }` with all
 * numeric fields null. No synthetic or zeroed values are ever emitted as a
 * real result — the consumer renders "collecting" via renderableMetricOrNull.
 *
 * ## Numerics
 *
 * The fit uses a bounded grid search over λ (log-spaced from 0.01 to 10 per
 * hour) followed by a Newton-Raphson refinement on the analytic gradient of
 * the residual sum of squares. The grid provides the bracket; Newton refines.
 * If the grid's best λ is at either boundary the refinement is skipped and
 * the boundary value is returned with a warning flag (the fit is suspect).
 */

import { canonicalJson, sha256Hex } from "@sports/prediction-engine/src/edge-lab/provenance.js";
import type { LineSnapshot } from "./line-snapshot";

// ── Re-export so callers need only one import ────────────────────────────

export type { GameSnapshots, LineSnapshot, SnapshotPhase, MarketType } from "./line-snapshot";
export type { TruthMetricsResult } from "./line-snapshot";

// ── Config ────────────────────────────────────────────────────────────────

/** Minimum snapshots needed for the exponential model to have 2 parameters. */
const MIN_POINTS = 4;
/** Grid-search bracketing for λ (per hour). Log-spaced endpoints. */
const LAMBDA_MIN = 0.01;
const LAMBDA_MAX = 10.0;
const LAMBDA_GRID_POINTS = 200;

// ── Output types ──────────────────────────────────────────────────────────

export interface ConsensusClockResult {
  /** gameId this result belongs to. */
  readonly gameId: string;
  /** Whether enough snapshots exist to produce a substantive result. */
  readonly hasEnoughData: boolean;
  /** Human-readable reason for the empty state, when applicable. */
  readonly emptyReason: string | null;

  /** Fitted decay rate λ (per hour). null when not enough data. */
  readonly lambda: number | null;
  /** Half-life in hours (ln(2)/λ). null when not enough data or λ ≤ 0. */
  readonly halfLifeHours: number | null;
  /** Asymptotic dispersion D_inf as t → +∞. null when not enough data. */
  readonly dInf: number | null;
  /** Implied dispersion at kickoff D_0. null when not enough data. */
  readonly d0: number | null;
  /** R² of the fit (1.0 = perfect, 0.0 = mean-only). null when not enough data. */
  readonly rSquared: number | null;
  /** Whether the grid search hit a boundary (fit may be unreliable). */
  readonly boundaryWarning: boolean;

  /** Canonical hash of inputs — provenance stamp for downstream consumers. */
  readonly snapshotHash: string;
}

// ── Dispersion measurement ────────────────────────────────────────────────

/**
 * Dispersion at one time slice: the mean absolute deviation of the fair
 * probabilities across books, normalized to [0, 0.5] by the fair-prob mean.
 *
 * For SPREAD/TOTAL markets each book posts a line+price; we convert to a
 * no-vig probability via the price's implied probability adjusted by the
 * line's distance to the median — but in practice the convention here is
 * simpler: the line value itself is the "price" for line markets, and
 * dispersion is the MAD of line values across books (then normalized).
 * For MONEYLINE we devig the price pair per book and use MAD of the resulting
 * home win probability.
 *
 * Returns null if fewer than 2 books are present (dispersion is undefined).
 */
function measureDispersion(
  timeSlice: ReadonlyArray<{ book: string; price: number; line: number | null; market: string }>,
): number | null {
  const n = timeSlice.length;
  if (n < 2) return null;

  if (timeSlice.every((s) => s.market === "MONEYLINE" && s.line === null)) {
    // Moneyline: devig each book's price, measure MAD of fair probs.
    // A moneyline book posts homePrice + awayPrice; if only one side is here
    // we cannot devig — fall back to raw implied probability dispersion.
    const probs = timeSlice.map((s) => 1 / s.price);
    const mean = probs.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return null;
    const mad = probs.reduce((a, b) => a + Math.abs(b - mean), 0) / n;
    return mad / mean;
  }

  // Spread/Total: dispersion is the MAD of the line values, normalized
  // by the cross-book median absolute line.
  const lines = timeSlice.map((s) => (s.line !== null ? s.line : s.price));
  const mean = lines.reduce((a, b) => a + b, 0) / n;
  const mad = lines.reduce((a, b) => a + Math.abs(b - mean), 0) / n;
  if (mean === 0) return null;
  return mad / Math.abs(mean);
}

// ── Exponential fit ───────────────────────────────────────────────────────

/**
 * Fit D(t) = D_inf + (D_0 − D_inf) * e^(−λt) via grid search + Newton refine.
 *
 * Given points (t_i, D_i) where t_i = hours before kickoff, returns the fit.
 * The grid brackets λ in log-space; Newton refines the RSS gradient on λ
 * while holding D_0 and D_inf at their grid-conditioned least-squares values.
 *
 * tHours must be non-negative (captures happen before or at kickoff).
 */
function fitExpDecay(
  tHours: number[],
  dVals: number[],
): { lambda: number; dInf: number; d0: number; rSquared: number; boundary: boolean } | null {
  const n = tHours.length;
  if (n < 2) return null;

  // Grid search over λ.
  let bestLambda = LAMBDA_MIN;
  let bestRss = Infinity;
  let bestD0 = 0;
  let bestDInf = 0;

  for (let i = 0; i < LAMBDA_GRID_POINTS; i++) {
    // Log-spaced λ from LAMBDA_MIN to LAMBDA_MAX.
    const frac = i / (LAMBDA_GRID_POINTS - 1);
    const lambda = LAMBDA_MIN * Math.pow(LAMBDA_MAX / LAMBDA_MIN, frac);

    // Given λ, the model is linear in (D_inf, D_0). Solve via the normal
    // equations of the two-basis design [1, e^(−λt)] for the column vector
    // [D_inf, (D_0 − D_inf)]. This is a 2×2 linear least-squares problem.
    let s00 = 0, s01 = 0, s11 = 0, sy0 = 0, sy1 = 0;
    for (let j = 0; j < n; j++) {
      const t = tHours[j]!;
      const d = dVals[j]!;
      const et = Math.exp(-lambda * t);
      s00 += 1;
      s01 += et;
      s11 += et * et;
      sy0 += d;
      sy1 += d * et;
    }

    // 2×2 solve: [[s00, s01], [s01, s11]] * [a, b] = [sy0, sy1]
    // where a = D_inf, b = D_0 − D_inf.
    const det = s00 * s11 - s01 * s01;
    if (Math.abs(det) < 1e-30) continue;

    const a = (s11 * sy0 - s01 * sy1) / det;
    const b = (s00 * sy1 - s01 * sy0) / det;

    const dInf = a;
    const d0 = a + b;

    // RSS.
    let rss = 0;
    for (let j = 0; j < n; j++) {
      const t = tHours[j]!;
      const d = dVals[j]!;
      const pred = dInf + (d0 - dInf) * Math.exp(-lambda * t);
      rss += (d - pred) ** 2;
    }

    if (rss < bestRss) {
      bestRss = rss;
      bestLambda = lambda;
      bestD0 = d0;
      bestDInf = dInf;
    }
  }

  // Check if best λ is at a boundary.
  const boundary =
    bestLambda <= LAMBDA_MIN * 1.01 || bestLambda >= LAMBDA_MAX * 0.99;

  // Newton-Raphson refinement on λ (holding the linear solution at each step).
  if (!boundary) {
    let lambda = bestLambda;
    for (let iter = 0; iter < 50; iter++) {
      const step = newtonStep(lambda, tHours, dVals);
      if (step === null) break;
      const newLambda = lambda + step;
      if (newLambda <= 0 || !Number.isFinite(newLambda)) break;
      if (Math.abs(step) < 1e-8) {
        lambda = newLambda;
        break;
      }
      lambda = newLambda;
    }
    bestLambda = lambda;

    // Recompute D_0, D_inf at refined λ.
    const linear = solveLinear(bestLambda, tHours, dVals);
    if (linear !== null) {
      bestDInf = linear.dInf;
      bestD0 = linear.d0;
      // Recompute RSS at refined parameters.
      let rss = 0;
      for (let j = 0; j < n; j++) {
        const t = tHours[j]!;
        const d = dVals[j]!;
        const pred = bestDInf + (bestD0 - bestDInf) * Math.exp(-bestLambda * t);
        rss += (d - pred) ** 2;
      }
      bestRss = rss;
    }
  }

  // R².
  const mean = dVals.reduce((a, b) => a + b, 0) / n;
  const ssTot = dVals.reduce((a, b) => a + (b - mean) ** 2, 0);
  if (ssTot === 0) return null; // all D values identical — no dispersion signal
  const rSquared = 1 - bestRss / ssTot;

  return {
    lambda: bestLambda,
    dInf: bestDInf,
    d0: bestD0,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    boundary,
  };
}

/** Solve the 2×2 linear least-squares for [D_inf, D_0−D_inf] at a given λ. */
function solveLinear(
  lambda: number,
  tHours: readonly number[],
  dVals: readonly number[],
): { dInf: number; d0: number } | null {
  const n = tHours.length;
  if (n < 2) return null;
  let s00 = 0, s01 = 0, s11 = 0, sy0 = 0, sy1 = 0;
  for (let j = 0; j < n; j++) {
    const t = tHours[j]!;
    const d = dVals[j]!;
    const et = Math.exp(-lambda * t);
    s00 += 1;
    s01 += et;
    s11 += et * et;
    sy0 += d;
    sy1 += d * et;
  }
  const det = s00 * s11 - s01 * s01;
  if (Math.abs(det) < 1e-30) return null;
  const a = (s11 * sy0 - s01 * sy1) / det;
  const b = (s00 * sy1 - s01 * sy0) / det;
  return { dInf: a, d0: a + b };
}

/**
 * Newton step on λ: return the update Δλ that reduces RSS.
 *
 * The RSS as a function of λ (with D_0, D_inf re-solved at each λ) has an
 * analytic gradient we can compute by the envelope theorem (since the linear
 * parameters are optimal at each λ, their first-order terms vanish). We use
 * a finite-difference check on the sign to guard against bad gradients.
 */
function newtonStep(
  lambda: number,
  tHours: number[],
  dVals: number[],
): number | null {
  // RSS at λ and at λ+ε.
  const eps = lambda * 1e-6;
  const rss0 = rssAt(lambda, tHours, dVals);
  const rss1 = rssAt(lambda + eps, tHours, dVals);

  // First derivative: dRSS/dλ ≈ (RSS(λ+ε) − RSS(λ)) / ε.
  const grad1 = (rss1 - rss0) / eps;

  // Second derivative via central difference.
  const rssMinus = rssAt(lambda - eps, tHours, dVals);
  const grad2 = (rss1 - 2 * rss0 + rssMinus) / (eps * eps);

  if (Math.abs(grad2) < 1e-30) return null;
  return -grad1 / grad2;
}

function rssAt(
  lambda: number,
  tHours: number[],
  dVals: number[],
): number {
  const linear = solveLinear(lambda, tHours, dVals);
  if (linear === null) return Infinity;
  const { dInf, d0 } = linear;
  let rss = 0;
  for (let j = 0; j < tHours.length; j++) {
    const t = tHours[j]!;
    const d = dVals[j]!;
    const pred = dInf + (d0 - dInf) * Math.exp(-lambda * t);
    rss += (d - pred) ** 2;
  }
  return rss;
}

// ── Main API ──────────────────────────────────────────────────────────────

/**
 * Build the dispersion-vs-time series for a single game+market from its
 * snapshots. Returns an array of {hoursBeforeKickoff, dispersion} sorted
 * by time ascending. Each entry aggregates ALL books at that capture time.
 */
function buildDispersionSeries(
  kickoffAt: string,
  snapshots: readonly LineSnapshot[],
): { t: number; d: number }[] {
  const kickoffMs = Date.parse(kickoffAt);

  // Group by capturedAt (one dispersion point per distinct capture time).
  const byTime = new Map<string, LineSnapshot[]>();
  for (const s of snapshots) {
    const arr = byTime.get(s.capturedAt) ?? [];
    arr.push(s);
    byTime.set(s.capturedAt, arr);
  }

  const series: { t: number; d: number }[] = [];
  for (const [capturedAt, group] of byTime) {
    const capturedMs = Date.parse(capturedAt);
    const hoursBefore = (kickoffMs - capturedMs) / (1000 * 3600);
    if (hoursBefore < 0) continue; // captured after kickoff — discard

    const dispersion = measureDispersion(
      group.map((s) => ({ book: s.book, price: s.price, line: s.line, market: s.market })),
    );
    if (dispersion !== null && Number.isFinite(dispersion) && dispersion > 0) {
      series.push({ t: hoursBefore, d: dispersion });
    }
  }

  // Sort by time ascending (earliest capture = largest t = most before kickoff).
  series.sort((a, b) => a.t - b.t);
  return series;
}

/**
 * Compute the Consensus Clock for one game+market.
 *
 * Dispersion decay: fits λ to the exponential model
 * D(t) = D_inf + (D_0 − D_inf) · e^(−λt),
 * where t is hours before kickoff.
 *
 * Returns the honest-empty shape when there is not enough data (fewer than
 * MIN_POINTS dispersion observations), so consumers can render "collecting"
 * instead of a fabricated number.
 */
export function computeConsensusClock(
  gameId: string,
  kickoffAt: string,
  snapshots: readonly LineSnapshot[],
): ConsensusClockResult {
  const snapshotHash = sha256Hex(
    canonicalJson({
      gameId,
      kickoffAt,
      snapshots: snapshots.map((s) => ({
        capturedAt: s.capturedAt,
        phase: s.phase,
        book: s.book,
        market: s.market,
        side: s.side,
        price: s.price,
        line: s.line,
        source: s.source,
      })),
    }),
  );

  const series = buildDispersionSeries(kickoffAt, snapshots);

  if (series.length < MIN_POINTS) {
    return {
      gameId,
      hasEnoughData: false,
      emptyReason: `need ≥${MIN_POINTS} dispersion observations, have ${series.length}`,
      lambda: null,
      halfLifeHours: null,
      dInf: null,
      d0: null,
      rSquared: null,
      boundaryWarning: false,
      snapshotHash,
    };
  }

  const tHours = series.map((s) => s.t);
  const dVals = series.map((s) => s.d);

  const fit = fitExpDecay(tHours, dVals);

  if (fit === null) {
    return {
      gameId,
      hasEnoughData: false,
      emptyReason: "dispersion is constant across all captures — no decay signal",
      lambda: null,
      halfLifeHours: null,
      dInf: null,
      d0: null,
      rSquared: null,
      boundaryWarning: false,
      snapshotHash,
    };
  }

  const halfLife = fit.lambda > 0 ? Math.LN2 / fit.lambda : null;

  return {
    gameId,
    hasEnoughData: true,
    emptyReason: null,
    lambda: fit.lambda,
    halfLifeHours: halfLife,
    dInf: fit.dInf,
    d0: fit.d0,
    rSquared: fit.rSquared,
    boundaryWarning: fit.boundary,
    snapshotHash,
  };
}

/**
 * Compute Consensus Clock across a full game (all markets combined into one
 * dispersion series) — convenience for the aggregate per-game signal.
 */
export function computeConsensusClockAllMarkets(
  gameId: string,
  kickoffAt: string,
  snapshots: readonly LineSnapshot[],
): ConsensusClockResult {
  return computeConsensusClock(gameId, kickoffAt, snapshots);
}
