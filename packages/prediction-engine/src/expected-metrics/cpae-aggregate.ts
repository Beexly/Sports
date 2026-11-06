/**
 * CPAE discrete aggregation — cells, shrinkage, and the group-level metric.
 *
 * The second half of the arXiv:1906.03339 port (see cpae-surface.ts for the
 * surface and the full provenance/gating discussion):
 *
 *  - The paper's attempt-location KDE becomes discrete CELL MASSES on an
 *    8-depth-bin × 3-location grid (24 cells) — the spec's grain-honest
 *    replacement for a 2-D KDE the public data cannot support.
 *  - The paper's §3.2 "2-D Naive Bayes" shrinkage is applied cell-exactly:
 *      P̂*_g(c) = [n_g(c)·P̂_g(c) + w·n_L(c)·P̂_L(c)] / [n_g(c) + w·n_L(c)]
 *    with w = N_median / N_league — N_median (median attempts across the
 *    group class) is the paper's single shrinkage knob.
 *  - The paper's Eq. 1 becomes the discrete mass-weighted sum:
 *      GSE-CPAE_g = Σ_c (n_g(c)/N_g) · (P̂*_g(c) − P̂_L(c)) × 100 pp
 *    computed at QB grain (passer) and DEFENSE grain (cpaeAllowed — the
 *    coverage-quality direction GSE lacks). CPAE is GROUP-level only; the
 *    paper defines no per-pass version and neither does this module.
 *  - Amendment from the 2603.17866 extraction: distributional companions —
 *    successRateAboveBaseline (share of the group's attempt mass in cells
 *    where the shrunk rate beats the league) and tailExceedanceRate (share
 *    of mass in cells whose shrunk rate exceeds the league's 95th-percentile
 *    cell rate) — ceiling signals the mean hides. Discretization choices are
 *    documented on each field.
 *
 * P̂_g(c) here is the group's EMPIRICAL completion rate in the cell; each
 * cell also carries the surface model's mean expectation (modelExpectedRate)
 * so callers can compute context-adjusted (over-expected) variants — the
 * shrinkage/Eq.-1 math itself is deliberately self-contained arithmetic on
 * cell counts, hand-checkable without a fitted model.
 *
 * VALIDATION-GATE SEPARATION (CodeRabbit finding on the spec): the ρ ≥ 0.75
 * NGS-correlation gate applies to the QB grain ONLY — the NGS contract has
 * no defense-level CPAE ground truth, so `cpaeAllowed` needs its own,
 * separately defined validation target before admission. Nothing in this
 * module may be used to ride the defense metric through the QB gate.
 *
 * Pure. No I/O. priced:false throughout the lane.
 */

import type { DropbackPlay } from "./expected-completion.js";
import { predictCpaeCompletionProbability, type CpaeSurfaceModel, type PassLocationBin } from "./cpae-surface.js";

/** Depth bin edges (yards past LOS): 9 edges → 8 half-open bins [e_i, e_{i+1}), last bin closed at 60. */
export const CPAE_DEPTH_BIN_EDGES: readonly number[] = [-10, -2, 2, 6, 10, 15, 20, 30, 60];

export const CPAE_CELL_COUNT = (CPAE_DEPTH_BIN_EDGES.length - 1) * 3; // 24

const LOCATION_ORDER: readonly PassLocationBin[] = ["left", "middle", "right"];

/**
 * Deterministic cell index for a pass: depth clamped to the grid's range,
 * half-open bins [e_i, e_{i+1}) with the final bin closed — so depths
 * exactly at −2 / 30 / 60 land deterministically (−2 opens bin 1, 30 opens
 * bin 7, 60 closes bin 7).
 */
export function cpaeCellIndex(airYards: number, location: PassLocationBin): number {
  if (!Number.isFinite(airYards)) throw new RangeError(`cpaeCellIndex: airYards must be finite, got ${airYards}`);
  const locIdx = LOCATION_ORDER.indexOf(location);
  if (locIdx < 0) throw new RangeError(`cpaeCellIndex: unknown location "${location}"`);
  const lo = CPAE_DEPTH_BIN_EDGES[0]!;
  const hi = CPAE_DEPTH_BIN_EDGES[CPAE_DEPTH_BIN_EDGES.length - 1]!;
  const x = Math.min(Math.max(airYards, lo), hi);
  let bin = CPAE_DEPTH_BIN_EDGES.length - 2; // final bin catches x === hi
  for (let i = 0; i < CPAE_DEPTH_BIN_EDGES.length - 1; i++) {
    if (x >= CPAE_DEPTH_BIN_EDGES[i]! && x < CPAE_DEPTH_BIN_EDGES[i + 1]!) {
      bin = i;
      break;
    }
  }
  return locIdx * (CPAE_DEPTH_BIN_EDGES.length - 1) + bin;
}

export interface CpaeCell {
  /** Attempts landing in this cell. */
  readonly n: number;
  /** Empirical completion rate in the cell (0 when n = 0). */
  readonly completionRate: number;
  /** Mean surface-model expected completion probability over the cell's attempts (0 when n = 0). */
  readonly modelExpectedRate: number;
}

export interface CpaeGroupCells {
  readonly groupId: string;
  readonly attempts: number;
  /** Exactly CPAE_CELL_COUNT cells, indexed by cpaeCellIndex. */
  readonly cells: readonly CpaeCell[];
}

/**
 * Bucket caller-supplied plays (the caller owns the as-of cutoff) into
 * per-group 24-cell grids. Plays with a null passLocation or non-finite
 * airYards are excluded (fail closed, never imputed). `groupBy` picks the
 * grain: passer id for QB CPAE, defensive team for cpaeAllowed.
 */
export function buildGroupCells(
  plays: readonly DropbackPlay[],
  model: CpaeSurfaceModel | null,
  groupBy: (p: DropbackPlay) => string,
): CpaeGroupCells[] {
  const acc = new Map<string, { n: number[]; comp: number[]; exp: number[]; attempts: number }>();
  for (const p of plays) {
    if (p.passLocation === null) continue;
    if (!Number.isFinite(p.airYards)) continue;
    if (p.complete !== 0 && p.complete !== 1) continue;
    const g = groupBy(p);
    if (g.length === 0) continue;
    let a = acc.get(g);
    if (!a) {
      a = {
        n: new Array<number>(CPAE_CELL_COUNT).fill(0),
        comp: new Array<number>(CPAE_CELL_COUNT).fill(0),
        exp: new Array<number>(CPAE_CELL_COUNT).fill(0),
        attempts: 0,
      };
      acc.set(g, a);
    }
    const c = cpaeCellIndex(p.airYards, p.passLocation);
    a.n[c]!++;
    a.comp[c]! += p.complete;
    a.exp[c]! += model === null ? 0 : predictCpaeCompletionProbability(model, p);
    a.attempts++;
  }
  const out: CpaeGroupCells[] = [];
  for (const [groupId, a] of acc) {
    out.push({
      groupId,
      attempts: a.attempts,
      cells: a.n.map((n, c) => ({
        n,
        completionRate: n === 0 ? 0 : a.comp[c]! / n,
        modelExpectedRate: n === 0 ? 0 : a.exp[c]! / n,
      })),
    });
  }
  out.sort((x, y) => (x.groupId < y.groupId ? -1 : x.groupId > y.groupId ? 1 : 0));
  return out;
}

/**
 * The paper's §3.2 shrinkage, cell-exact. Returns the 24 shrunk rates
 * P̂*_g(c). Limits (all covered by tests): n_g → ∞ recovers the group's own
 * rate; n_g = 0 gives the league rate; nMedian = 0 gives the raw group rate
 * where the group has data. A cell empty on BOTH sides yields the league's
 * (zero-n) rate with no NaN division.
 */
export function shrinkGroupSurface(
  group: CpaeGroupCells,
  league: CpaeGroupCells,
  nMedian: number,
): readonly number[] {
  if (group.cells.length !== CPAE_CELL_COUNT || league.cells.length !== CPAE_CELL_COUNT) {
    throw new RangeError("shrinkGroupSurface: group and league must carry exactly CPAE_CELL_COUNT cells");
  }
  if (!Number.isFinite(nMedian) || nMedian < 0) {
    throw new RangeError(`shrinkGroupSurface: nMedian must be finite and >= 0, got ${nMedian}`);
  }
  const w = league.attempts === 0 ? 0 : nMedian / league.attempts;
  return group.cells.map((gc, c) => {
    const lc = league.cells[c]!;
    const gWeight = gc.n;
    const lWeight = w * lc.n;
    const denom = gWeight + lWeight;
    if (denom === 0) return lc.completionRate;
    return (gWeight * gc.completionRate + lWeight * lc.completionRate) / denom;
  });
}

export interface CpaeGroupMetric {
  readonly groupId: string;
  readonly attempts: number;
  /** Discrete Eq. 1: Σ_c (n_g(c)/N_g)·(P̂*_g(c) − P̂_league(c)), in percentage points. */
  readonly cpae: number;
  /** Share of the group's attempt mass in cells where the shrunk rate beats the league's rate. */
  readonly successRateAboveBaseline: number;
  /** Share of the group's attempt mass in cells whose shrunk rate exceeds the league's 95th-percentile occupied-cell rate (the 2603.17866 ceiling signal). */
  readonly tailExceedanceRate: number;
  /** Label only — the as-of cutoff itself is the CALLER's row filter (see cpae-surface.ts's as-of discipline). */
  readonly asOfWeek: number;
}

/** Unweighted 95th-percentile (nearest-rank) of the league's occupied-cell rates. */
function leagueTailThreshold(league: CpaeGroupCells): number {
  const occupied = league.cells.filter((c) => c.n > 0).map((c) => c.completionRate);
  if (occupied.length === 0) return Number.POSITIVE_INFINITY; // no occupied cells — nothing can exceed the tail
  occupied.sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(0.95 * occupied.length) - 1);
  return occupied[idx]!;
}

/**
 * The group-level CPAE metric for every qualifying group (min attempts:
 * the paper's 100-attempt qualifier by default), against one league grid.
 * A league passed as its own single group yields cpae exactly 0 — the
 * identity the test file pins to 12 decimals.
 */
export function computeCpaeMetrics(
  groups: readonly CpaeGroupCells[],
  league: CpaeGroupCells,
  options: { readonly nMedian: number; readonly minAttempts?: number; readonly asOfWeek: number },
): CpaeGroupMetric[] {
  const minAttempts = options.minAttempts ?? 100;
  if (!Number.isInteger(options.asOfWeek)) throw new RangeError("computeCpaeMetrics: asOfWeek must be an integer label");
  const tail = leagueTailThreshold(league);
  const out: CpaeGroupMetric[] = [];
  for (const g of groups) {
    if (g.attempts < minAttempts) continue;
    const shrunk = shrinkGroupSurface(g, league, options.nMedian);
    let cpae = 0;
    let above = 0;
    let tailMass = 0;
    for (let c = 0; c < CPAE_CELL_COUNT; c++) {
      const mass = g.attempts === 0 ? 0 : g.cells[c]!.n / g.attempts;
      if (mass === 0) continue;
      const diff = shrunk[c]! - league.cells[c]!.completionRate;
      cpae += mass * diff;
      if (diff > 0) above += mass;
      if (shrunk[c]! > tail) tailMass += mass;
    }
    out.push({
      groupId: g.groupId,
      attempts: g.attempts,
      cpae: cpae * 100,
      successRateAboveBaseline: above,
      tailExceedanceRate: tailMass,
      asOfWeek: options.asOfWeek,
    });
  }
  return out;
}
