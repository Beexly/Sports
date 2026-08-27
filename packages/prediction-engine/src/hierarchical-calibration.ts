/**
 * Hierarchical (partial-pooling) calibration shrinkage — R&D, offline only.
 *
 * Ported from arXiv:2608.18430 (Kapusuzoglu & Mahadevan, "Multi-Level
 * Bayesian Calibration of a Multi-Component Dynamic System Model," JCISE
 * 2023). Its FEM-surrogate machinery does not port; its structure does — a
 * multi-component system with LOCAL parameters (unique per component) and a
 * GLOBAL parameter (shared prior), fit by an EM-like alternation: fix the
 * global at its current value and calibrate every component locally; fix the
 * locals and re-estimate the global from them; repeat to convergence (their
 * Algorithm 1, §3.2). See
 * docs/ops/edge/extraction/2026-08-26-group-batch3.md §2 for the full
 * derivation and GSE's adaptation.
 *
 * GSE's calibration problem has exactly this shape: sport x market cells
 * with wildly unequal, asynchronously-growing settled counts (MONEYLINE 483
 * and honest; SPREAD/TOTAL ~990 and miscalibrated; per-sport slices thinner
 * still — many cells never individually reach the ~250-settled re-fit
 * threshold). This module operates purely at the PARAMETER level: it takes
 * per-cell Beta-calibration params (a, b) — `applyOnlineBeta`'s
 * g_{a,b}(p) = sigma(a . logit(p) + b) parameterization from
 * `online-beta-recalibration.ts` — already fit per cell (by
 * `fitResAwareBeta` or an equivalent), and shrinks each cell's params toward
 * a jointly-estimated global prior, weighted by the cell's own sample count.
 * It does not re-derive per-cell fitting; composing with an existing fitter
 * is the caller's job, exactly like `empirical-rate-teacher.ts` composes
 * with whatever forecaster it is scoring.
 *
 * Shrinkage uses the same pseudocount convention as
 * `empirical-rate-teacher.ts` (their hierarchical-EB math, here applied to
 * (a, b) instead of a scalar rate): shrunk = (n . raw + M . parent) / (n + M).
 * The EM-like loop is a linear fixed-point iteration in the global value and
 * converges geometrically for any positive strength M (see the module's
 * test suite for a closed-form check).
 *
 * Honesty rule ported from the source paper's own finding (their Figs. 13,
 * 16 + Conclusion: online posteriors are measurably wider/less sharp than
 * offline ones): this hierarchical layer is an OFFLINE refit-time tool. It
 * does not flip any live gate; the existing C6 rule
 * (calibratedEce <= rawEce re-confirmed on held-out data) still governs
 * whether any shrunk cell's map actually ships.
 */

function round(value: number, digits = 6): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

export interface CellBetaFit {
  readonly cell: string;
  readonly a: number;
  readonly b: number;
  /** Sample count this cell's (a, b) was fit from — the shrinkage weight. */
  readonly n: number;
}

export interface ShrunkCellBeta {
  readonly cell: string;
  readonly a: number;
  readonly b: number;
  readonly n: number;
  readonly rawA: number;
  readonly rawB: number;
}

export interface HierarchicalCalibrationResult {
  readonly cells: readonly ShrunkCellBeta[];
  readonly globalA: number;
  readonly globalB: number;
  readonly strength: number;
  readonly iterations: number;
  readonly converged: boolean;
}

/**
 * Fix the global at `global`, shrink every cell toward it by its own sample
 * weight. Exported for the module's own convergence check and for a caller
 * that wants a single shrinkage pass against an externally-supplied global
 * (e.g. a hand-set prior) without running the full alternation. Returns full
 * (unrounded) precision — rounding happens once, at the top level, on the
 * FINAL reported result, not on intermediate values a re-shrink or an
 * iterative loop will compute further with (rounding every step would
 * quantize the fixed-point iteration to the rounding grid instead of letting
 * it converge to the true fixed point).
 */
export function shrinkCellsTowardGlobal(
  cellFits: readonly CellBetaFit[],
  globalA: number,
  globalB: number,
  strength: number,
): readonly ShrunkCellBeta[] {
  return cellFits.map((c) => ({
    cell: c.cell,
    a: (c.n * c.a + strength * globalA) / (c.n + strength),
    b: (c.n * c.b + strength * globalB) / (c.n + strength),
    n: c.n,
    rawA: c.a,
    rawB: c.b,
  }));
}

/**
 * Sample-weighted mean — the "re-estimate the global from the locals" half
 * of the alternation (their Algorithm 1 step (b)).
 */
function weightedMean(values: readonly { readonly v: number; readonly w: number }[]): number {
  const totalW = values.reduce((s, x) => s + x.w, 0);
  if (totalW === 0) return 0;
  return values.reduce((s, x) => s + x.v * x.w, 0) / totalW;
}

/**
 * Run the EM-like alternation to convergence: fix the global, shrink every
 * cell toward it (weighted by the cell's own sample count `n`); fix the
 * shrunk cells, re-estimate the global as their n-weighted mean; repeat
 * until the global stops moving (by `tolerance`) or `maxIterations` is hit.
 *
 * `strength` (paper's shrinkage weight; default 25, matching
 * `empirical-rate-teacher.ts`'s pseudocount default) controls how hard a
 * thin cell is pulled toward the pooled map: a cell with `n << strength` is
 * shrunk almost entirely to the global; `n >> strength` stays close to its
 * own raw fit. Identity params (a=1, b=0 — no stretch, no shift) are the
 * sane default global when `cellFits` is empty.
 */
export function fitHierarchicalBetaShrinkage(
  cellFits: readonly CellBetaFit[],
  strength = 25,
  maxIterations = 100,
  tolerance = 1e-9,
): HierarchicalCalibrationResult {
  if (!Number.isFinite(strength) || strength <= 0) {
    throw new RangeError(`fitHierarchicalBetaShrinkage: strength must be > 0, got ${strength}`);
  }
  if (!Number.isInteger(maxIterations) || maxIterations <= 0 || !Number.isFinite(maxIterations)) {
    throw new RangeError(`fitHierarchicalBetaShrinkage: maxIterations must be a finite positive integer, got ${maxIterations}`);
  }
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new RangeError(`fitHierarchicalBetaShrinkage: tolerance must be finite and > 0, got ${tolerance}`);
  }
  if (cellFits.length === 0) {
    return { cells: [], globalA: 1, globalB: 0, strength, iterations: 0, converged: true };
  }

  // Initial global: the raw n-weighted mean, before any shrinkage — a
  // reasonable starting prior (their Algorithm 1 does not prescribe one).
  // Identity params (a=1, b=0) when every cell's n is 0 too — weightedMean's
  // own zero-total-weight fallback is 0 for BOTH params, which for this
  // module's g_{a,b}(p) = sigma(a.logit(p)+b) parameterization is NOT an
  // identity map (a=0 flattens every input to the constant sigma(b)); it is
  // a degenerate map that must never be the silent default for "no evidence
  // yet."
  const totalN = cellFits.reduce((s, c) => s + c.n, 0);
  let globalA = totalN === 0 ? 1 : weightedMean(cellFits.map((c) => ({ v: c.a, w: c.n })));
  let globalB = totalN === 0 ? 0 : weightedMean(cellFits.map((c) => ({ v: c.b, w: c.n })));

  let iterations = 0;
  let converged = false;
  let shrunk: readonly ShrunkCellBeta[] = [];

  for (; iterations < maxIterations; iterations++) {
    shrunk = shrinkCellsTowardGlobal(cellFits, globalA, globalB, strength);
    // Every shrunk cell's `n` is unchanged from cellFits (shrinkCellsTowardGlobal
    // never rewrites it), so totalN is invariant across iterations: with zero
    // total evidence, re-estimating via weightedMean would collapse back to
    // its own zero-weight fallback (0, 0) every time, undoing the identity
    // fallback above on the very first iteration. Hold the global fixed at
    // its current (identity) value instead -- there is no evidence to ever
    // move it away from that.
    const nextGlobalA = totalN === 0 ? globalA : weightedMean(shrunk.map((c) => ({ v: c.a, w: c.n })));
    const nextGlobalB = totalN === 0 ? globalB : weightedMean(shrunk.map((c) => ({ v: c.b, w: c.n })));
    const moved = Math.abs(nextGlobalA - globalA) + Math.abs(nextGlobalB - globalB);
    globalA = nextGlobalA;
    globalB = nextGlobalB;
    if (moved < tolerance) {
      converged = true;
      iterations += 1;
      break;
    }
  }

  // Final pass: cells must reflect the CONVERGED (or final) global, not the
  // one from the iteration before it moved for the last time. Round here —
  // once, on the reported output — not inside the loop.
  shrunk = shrinkCellsTowardGlobal(cellFits, globalA, globalB, strength).map((c) => ({
    ...c,
    a: round(c.a),
    b: round(c.b),
  }));

  return { cells: shrunk, globalA: round(globalA), globalB: round(globalB), strength, iterations, converged };
}
