/**
 * CLV decomposition (Phase 5) — how much of realized Closing-Line Value is
 * associated with the INFORMATION CONTENT the pick actually had at lock, how
 * much with market LIQUIDITY conditions, and how much remains honestly
 * unexplained.
 *
 * THE CONFOUND, NAMED. Closing-line movement blends (at least) genuine
 * information edge, public betting pressure, and noise — but this platform
 * holds NO sourced bet-percentage/handle split, and the codebase already
 * refuses to say "sharp money" without one (see market-memory.ts's
 * sharpSplitSourced gate). Any decomposition that labels a component "public
 * pressure" without that data is curve-fitting a story onto noise. So this
 * module decomposes ASSOCIATION, not causation, into:
 *   - an information coefficient: the OLS slope of clvValue on an
 *     information-content score fixed BEFORE the close is known (evidence
 *     category count, derived-history usage, hours-to-kickoff at lock) — no
 *     leakage by construction;
 *   - a liquidity coefficient: the slope on book disagreement at lock (thin,
 *     disagreeing markets produce noisier CLV);
 *   - a residual share: 1 - R², reported as "unexplained by available
 *     controls" and NEVER labeled public/sharp/square money.
 *
 * FALSIFIABLE, NOT DECORATIVE. Each coefficient is bootstrapped through the
 * existing general bcaCi machinery (paired bootstrap via the index-encoding
 * trick: the resampled "data" are row indices; the statistic closes over the
 * rows). A coefficient whose CI straddles zero is honestly "not
 * distinguishable from no effect" — the machinery cannot be forced to find a
 * story. Units discipline: callers must pass items of a SINGLE ClvKind
 * (points vs probability must never share a regression), mirroring
 * clv-segments.ts's MIXED -> null rule.
 *
 * Deterministic/seeded via bcaCi's own fixed-seed convention.
 */

import { bcaCi, type PerformanceCi } from "./performance-ci.js";

export interface ClvDecompositionItem {
  /** Realized CLV for the pick (single unit kind per call). */
  readonly clvValue: number;
  /** Count of non-shadow, non-blocked evidence categories active at lock. */
  readonly evidenceCategoryCount: number;
  /** Whether canonical derived history informed the pick. */
  readonly usedDerivedHistory: boolean;
  /** Hours between lock and kickoff (>= 0). */
  readonly hoursToKickoffAtLock: number;
  /** Max-minus-min line spread across books at lock (same unit family as kind). */
  readonly bookDisagreementAtLock: number;
}

export interface ClvDecompositionResult {
  readonly n: number;
  /** Unit kind label the caller segmented by (e.g. "POINTS" | "PROBABILITY"). */
  readonly kind: string;
  readonly realizedClvMean: number;
  /**
   * Bootstrapped OLS slope of clvValue on the information score (evidence
   * count + derived-history + a time-to-kickoff term). CI straddling zero =
   * no detectable information association on this ledger.
   */
  readonly informationCoefficient: PerformanceCi | null;
  /** Bootstrapped OLS slope of clvValue on book disagreement at lock. */
  readonly liquidityCoefficient: PerformanceCi | null;
  /**
   * Sample-size-adjusted R^2 of the two-control OLS, in [0, 1]. Null when the
   * residual degrees of freedom are inadequate (n - 3 <= 0), where a raw
   * in-sample R^2 is mechanically ~1.0 and would overstate explained variance.
   */
  readonly varianceExplained: number | null;
  /**
   * 1 - adjusted R^2 — unexplained by available controls. Never causally
   * labeled. Null whenever varianceExplained is null (inadequate residual df).
   */
  readonly residualShare: number | null;
  readonly note: string;
}

/**
 * Information-content score for one item. Fixed at lock time (logically prior
 * to the close), so regressing CLV on it carries no outcome leakage. The
 * weights are DOCUMENTED CONVENTIONS, not fitted parameters: one point per
 * evidence category, one for derived history, and hours-to-kickoff scaled to
 * days so an overnight lock (~24h) contributes ~1 point — the same order of
 * magnitude as one evidence category, keeping no single proxy dominant by
 * unit accident.
 */
export function informationScore(item: ClvDecompositionItem): number {
  return (
    item.evidenceCategoryCount +
    (item.usedDerivedHistory ? 1 : 0) +
    Math.max(0, item.hoursToKickoffAtLock) / 24
  );
}

/** Two-regressor OLS with a tiny ridge for numerical stability; returns
 * [intercept, bInfo, bLiquidity] plus R^2. Ridge (1e-9 on the diagonal) only
 * matters when a resample degenerates to constant regressors — the honest
 * limit of "no variation to learn from", where slopes shrink to ~0. */
function olsTwo(
  y: readonly number[],
  x1: readonly number[],
  x2: readonly number[],
): { b0: number; b1: number; b2: number; r2: number } {
  const n = y.length;
  // Normal equations for X = [1, x1, x2].
  let s1 = 0, s2 = 0, sy = 0, s11 = 0, s22 = 0, s12 = 0, s1y = 0, s2y = 0;
  for (let i = 0; i < n; i++) {
    s1 += x1[i]!; s2 += x2[i]!; sy += y[i]!;
    s11 += x1[i]! * x1[i]!; s22 += x2[i]! * x2[i]!; s12 += x1[i]! * x2[i]!;
    s1y += x1[i]! * y[i]!; s2y += x2[i]! * y[i]!;
  }
  const R = 1e-9;
  // Solve the 3x3 system (X'X + ridge) b = X'y via Cramer-style elimination.
  const a11 = n + R, a12 = s1, a13 = s2;
  const a22 = s11 + R, a23 = s12;
  const a33 = s22 + R;
  // Symmetric matrix [[a11,a12,a13],[a12,a22,a23],[a13,a23,a33]] * [b0,b1,b2] = [sy,s1y,s2y]
  const det =
    a11 * (a22 * a33 - a23 * a23) -
    a12 * (a12 * a33 - a23 * a13) +
    a13 * (a12 * a23 - a22 * a13);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-30) return { b0: 0, b1: 0, b2: 0, r2: 0 };
  const d0 =
    sy * (a22 * a33 - a23 * a23) -
    a12 * (s1y * a33 - a23 * s2y) +
    a13 * (s1y * a23 - a22 * s2y);
  const d1 =
    a11 * (s1y * a33 - s2y * a23) -
    sy * (a12 * a33 - a23 * a13) +
    a13 * (a12 * s2y - s1y * a13);
  const d2 =
    a11 * (a22 * s2y - a23 * s1y) -
    a12 * (a12 * s2y - s1y * a13) +
    sy * (a12 * a23 - a22 * a13);
  const b0 = d0 / det, b1 = d1 / det, b2 = d2 / det;
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const fit = b0 + b1 * x1[i]! + b2 * x2[i]!;
    ssTot += (y[i]! - meanY) ** 2;
    ssRes += (y[i]! - fit) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  return { b0, b1, b2, r2 };
}

export function decomposeClv(
  items: readonly ClvDecompositionItem[],
  kind: string,
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): ClvDecompositionResult | null {
  const n = items.length;
  if (n < 3) return null;
  for (const it of items) {
    if (
      !Number.isFinite(it.clvValue) ||
      !Number.isFinite(it.evidenceCategoryCount) ||
      !Number.isFinite(it.hoursToKickoffAtLock) ||
      !Number.isFinite(it.bookDisagreementAtLock)
    ) {
      return null;
    }
  }

  const y = items.map((it) => it.clvValue);
  const info = items.map(informationScore);
  const liq = items.map((it) => it.bookDisagreementAtLock);
  const full = olsTwo(y, info, liq);
  const realizedClvMean = y.reduce((s, v) => s + v, 0) / n;

  // Paired bootstrap via index encoding: bcaCi resamples the INDEX array; each
  // statistic closure rebuilds the OLS on the resampled (y, info, liq) rows.
  // This reuses the engine's deterministic seeded machinery unchanged — the
  // composition the general Statistic type exists for.
  const indices = Array.from({ length: n }, (_, i) => i);
  const coefStatistic = (which: 1 | 2) => (idxSample: readonly number[]): number => {
    const ys = idxSample.map((i) => y[i]!);
    const is = idxSample.map((i) => info[i]!);
    const ls = idxSample.map((i) => liq[i]!);
    const fit = olsTwo(ys, is, ls);
    return which === 1 ? fit.b1 : fit.b2;
  };
  const informationCoefficient = bcaCi(indices, coefStatistic(1), opts);
  const liquidityCoefficient = bcaCi(indices, coefStatistic(2), opts);

  // Adequate residual degrees of freedom guard. With 3 OLS parameters
  // (intercept + bInfo + bLiquidity), residual df = n - 3; at n = 3 the fit is
  // exact for ANY data (r2 === 1) and just beyond that a raw in-sample R^2 is
  // upward-biased. Report a sample-size-adjusted R^2 when df permits, and
  // honestly WITHHOLD a variance share (null) when it does not, rather than
  // publishing a fabricated "controls explain ~100% of CLV" story on a handful
  // of picks. The bootstrapped coefficient CIs remain honest and are unchanged.
  const residualDf = n - 3;
  const varianceExplained =
    residualDf <= 0
      ? null
      : Math.max(0, Math.min(1, 1 - (1 - full.r2) * ((n - 1) / residualDf)));
  const residualShare = varianceExplained === null ? null : 1 - varianceExplained;

  const note =
    varianceExplained === null
      ? `Association decomposition over ${n} settled ${kind} picks: insufficient sample to ` +
        `attribute variance (residual degrees of freedom too low for a reliable R^2), so the ` +
        `variance share is withheld; bootstrapped coefficient intervals are still reported. ` +
        `No bet-split data exists on this platform, so no component is attributed to bettor ` +
        `behavior — this is association under stated controls, not a causal story.`
      : `Association decomposition over ${n} settled ${kind} picks: the information-content ` +
        `and liquidity controls jointly explain ${(varianceExplained * 100).toFixed(1)}% of CLV ` +
        `variance (adjusted for sample size); the remaining ${((1 - varianceExplained) * 100).toFixed(1)}% ` +
        `is unexplained by available controls. No bet-split data exists on this platform, so no ` +
        `component is attributed to bettor behavior — this is association under stated controls, ` +
        `not a causal story.`;

  return {
    n,
    kind,
    realizedClvMean,
    informationCoefficient,
    liquidityCoefficient,
    varianceExplained,
    residualShare,
    note,
  };
}
