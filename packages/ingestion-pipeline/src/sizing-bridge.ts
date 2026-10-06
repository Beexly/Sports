/**
 * Sizing bridge — decides how much of the bankroll a slate may risk, and fails
 * closed the moment a sizing kernel cannot be trusted to respect the caller's
 * stated cap, produce a non-negative stake, or answer at all.
 *
 * Every `eval*` here is a thin, fail-closed shell over a real pure kernel in
 * `@sports/prediction-engine/src/sizing/*`. The kernel does the mathematics;
 * this layer does the three jobs the kernels deliberately do not:
 *
 *   1. INPUT VALIDATION the kernels themselves skip. Several of them silently
 *      clamp out-of-range probabilities (`constrained-kelly` clamps p to
 *      [1e-9, 1-1e-9]; `volatility-regime-scaler.scaleStake` lets a NaN
 *      multiplier propagate straight through `Math.min`/`Math.max`). A kernel
 *      that silently repairs a bad input is a kernel that will one day be fed a
 *      bad input and report success.
 *   2. CAP ENFORCEMENT the kernels do not implement. Several take no cap at
 *      all (`sizeSlate`, `shrinkageKellyStakes`' inner stake, `simultaneous-
 *      Kelly`'s budget), and one (`solveSlateMpc`) will happily accept a
 *      correlation matrix whose rows are the wrong length, reading the missing
 *      entries as 0 correlation. A stake above the caller's cap is a refusal,
 *      not a clamp — clamping to the cap would launder a kernel bug into a
 *      plausible-looking number.
 *   3. NO-BET vs COULD-NOT-COMPUTE. These are different answers and the return
 *      shape keeps them apart: a legitimate "stake nothing" comes back
 *      `ok: true` with `bet: false` and a stated reason; a kernel that threw,
 *      returned a non-finite value, or violated its own contract comes back
 *      `ok: false` with a reason naming the offending value.
 */

import {
  sizeSlate,
  laplaceSmoothed,
  kellyGrowthRate,
  lMinGatePasses,
} from "@sports/prediction-engine/src/sizing/0803-1364v2-generalized-kelly-solver.js";
import type {
  KellyPick,
  SizedSlate,
} from "@sports/prediction-engine/src/sizing/0803-1364v2-generalized-kelly-solver.js";
import {
  projectKellySimplex,
  kellyLogGrowth,
  constrainedKellyWeights,
} from "@sports/prediction-engine/src/sizing/constrained-kelly.js";
import {
  riskAversionLambda,
  solveRiskConstrainedKelly,
  plainKelly,
} from "@sports/prediction-engine/src/sizing/risk-constrained-kelly.js";
import {
  makeRng,
  sampleTrueProbs,
  emcKellyStake,
  pluginKelly,
} from "@sports/prediction-engine/src/sizing/emc-kelly.js";
import { shrinkEdges, shrinkageKellyStakes } from "@sports/prediction-engine/src/sizing/shrinkage-kelly.js";
import {
  conformalKellyStake,
  capBindingFrequency,
} from "@sports/prediction-engine/src/sizing/conformal-kelly.js";
import type { ConformalKellyResult } from "@sports/prediction-engine/src/sizing/conformal-kelly.js";
import {
  kellyStake as bayesianKellyStake,
  newCategory,
  updatePosterior,
  posteriorMean,
  posteriorVar,
  maxDrawdown as equityMaxDrawdown,
} from "@sports/prediction-engine/src/sizing/drawdown-kelly.js";
import type { CategoryPosterior } from "@sports/prediction-engine/src/sizing/drawdown-kelly.js";
import {
  eulerDrawdownAttribution,
  conditionalExpectedDrawdown,
  drawdownTriggerStakeScale,
} from "@sports/prediction-engine/src/sizing/ced-drawdown.js";
import type { CategoryPnl } from "@sports/prediction-engine/src/sizing/ced-drawdown.js";
import {
  decoupledSlateKelly,
  decoupledObjective,
  independentKelly,
} from "@sports/prediction-engine/src/sizing/decoupled-kelly.js";
import type { SlatePick as DecoupledSlatePick } from "@sports/prediction-engine/src/sizing/decoupled-kelly.js";
import {
  simultaneousKelly,
  adaptiveKellyScale,
  simulateWealth,
} from "@sports/prediction-engine/src/sizing/multivariate-kelly.js";
import type { Edge as MultivariateEdge } from "@sports/prediction-engine/src/sizing/multivariate-kelly.js";
import { esGovernor, meanEsFrontier } from "@sports/prediction-engine/src/sizing/es-governor.js";
import type { SlatePick as EsSlatePick } from "@sports/prediction-engine/src/sizing/es-governor.js";
import {
  kellyTournament,
  simulateKellyFraction,
} from "@sports/prediction-engine/src/sizing/kelly-tournament.js";
import type { BetResolution } from "@sports/prediction-engine/src/sizing/kelly-tournament.js";
import {
  constrainedMaxDrawdownWeights,
  drawdownAdaptiveBounds,
} from "@sports/prediction-engine/src/sizing/max-drawdown-portfolio.js";
import { modulateStake, isCoinFlip } from "@sports/prediction-engine/src/sizing/coin-flip-modulator.js";
import {
  selectiveFeasibilityCeiling,
  breakevenKeepRate,
  ceilingVolume,
} from "@sports/prediction-engine/src/sizing/selective-feasibility-ceiling.js";
import { solveSlateMpc } from "@sports/prediction-engine/src/sizing/slate-mpc-staker.js";
import type { SlatePick as MpcSlatePick } from "@sports/prediction-engine/src/sizing/slate-mpc-staker.js";
import {
  rollingVolatility,
  classifyRegime,
  stakeMultiplier,
  scaleStake,
} from "@sports/prediction-engine/src/sizing/volatility-regime-scaler.js";
import type { VolRegime } from "@sports/prediction-engine/src/sizing/volatility-regime-scaler.js";
import {
  decomposePath,
  pathQualityScore,
  bankrollRegimeAllowsRamp,
} from "@sports/prediction-engine/src/sizing/path-form-features.js";
import {
  qrLoss,
  cqlPenalty,
  greedyStake,
  cvarStake,
  interQuantileRange,
  STAKE_ACTIONS,
} from "@sports/prediction-engine/src/sizing/qr-dqn.js";

/**
 * Fail-closed result envelope. `ok: false` means the answer could not be
 * computed at all; `ok: true` means the kernel answered, and whether that
 * answer was "stake nothing" is carried inside `data.bet`.
 */
export type SizingEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): SizingEval<never> {
  return { ok: false, reason };
}

/** Float slack. Kernels use 1e-9..1e-12 internally; anything past 1e-9 is a real violation. */
const EPS = 1e-9;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function describe(v: unknown): string {
  if (typeof v === "number") {
    return Number.isNaN(v) ? "NaN" : Number.isFinite(v) ? String(v) : `${v}`;
  }
  return String(v);
}

function threw(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** All values finite, and strictly inside (lo, hi). */
function allFinite(numbers: readonly number[]): boolean {
  return numbers.every(isFiniteNumber);
}

// ---------------------------------------------------------------------------
// 1. Generalized Kelly slate solver (arXiv 0803.1364v2)
// ---------------------------------------------------------------------------

export interface GeneralizedSlatePickInput {
  /** Model win probability. Must be strictly inside (0, 1). */
  readonly p: number;
  /** Decimal odds, e.g. 2.10. Must exceed 1. */
  readonly decimalOdds: number;
  /** Backtest sample size; when present the L_min gate can refuse the pick. */
  readonly backtestN?: number;
}

export interface GeneralizedKellyInput {
  readonly picks: readonly GeneralizedSlatePickInput[];
  /** Optional n x n correlation matrix. Must be square, finite and symmetric. */
  readonly corr?: readonly (readonly number[])[];
  /** Laplace-smoothing win counts, aligned with `picks`. */
  readonly wins?: readonly number[];
  /** Laplace-smoothing trial counts, aligned with `picks`. */
  readonly trials?: readonly number[];
  /** Hard cap on a single pick's stake as a bankroll fraction. */
  readonly cap: number;
  /** Hard cap on the summed stake across the slate. */
  readonly maxTotal: number;
}

export interface GeneralizedKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly fractions: readonly number[];
  readonly totalStake: number;
  readonly cap: number;
  readonly maxTotal: number;
  readonly haircut: number;
  readonly expectedLogGrowth: number;
  readonly kernelSizing: boolean;
  readonly kernelReason: string;
  readonly independentFractions: readonly number[];
  readonly lMinPasses: readonly boolean[];
}

/**
 * `sizeSlate` applies NO stake cap of its own: the L_min gate and the
 * correlation haircut are the only reductions. A caller cap that the kernel
 * ignores is exactly the failure this eval exists to catch, so the returned
 * fractions are checked against `cap` and the sum against `maxTotal` and a
 * breach is a refusal naming both numbers.
 */
export function evalGeneralizedKellySlate(
  input: GeneralizedKellyInput,
): SizingEval<GeneralizedKellyData> {
  const { picks, corr, wins, trials, cap, maxTotal } = input;
  if (picks.length === 0) return fail("generalized-kelly: need at least 1 pick");
  if (!isFiniteNumber(cap) || !(cap > 0)) return fail(`generalized-kelly: cap must be a finite number > 0, got ${describe(cap)}`);
  if (!isFiniteNumber(maxTotal) || !(maxTotal > 0)) return fail(`generalized-kelly: maxTotal must be a finite number > 0, got ${describe(maxTotal)}`);
  if (maxTotal < cap) return fail(`generalized-kelly: maxTotal ${maxTotal} is below the single-pick cap ${cap}`);

  const built: KellyPick[] = [];
  for (let i = 0; i < picks.length; i++) {
    const k = picks[i];
    if (k === undefined) return fail(`generalized-kelly: pick ${i} is missing`);
    if (!isFiniteNumber(k.p) || !(k.p > 0) || !(k.p < 1)) {
      return fail(`generalized-kelly: pick ${i} probability must be a finite number in (0, 1), got ${describe(k.p)}`);
    }
    if (!isFiniteNumber(k.decimalOdds) || !(k.decimalOdds > 1)) {
      return fail(`generalized-kelly: pick ${i} decimal odds must be a finite number > 1, got ${describe(k.decimalOdds)}`);
    }
    if (k.backtestN !== undefined) {
      if (!isFiniteNumber(k.backtestN) || k.backtestN < 0) {
        return fail(`generalized-kelly: pick ${i} backtestN must be a finite number >= 0, got ${describe(k.backtestN)}`);
      }
      built.push({ p: k.p, decimalOdds: k.decimalOdds, backtestN: k.backtestN });
    } else {
      built.push({ p: k.p, decimalOdds: k.decimalOdds });
    }
  }

  const n = built.length;
  let corrMatrix: number[][] | undefined;
  if (corr !== undefined) {
    if (corr.length !== n) return fail(`generalized-kelly: corr has ${corr.length} rows, expected ${n}`);
    corrMatrix = [];
    for (let i = 0; i < n; i++) {
      const row = corr[i];
      if (row === undefined || row.length !== n) {
        return fail(`generalized-kelly: corr row ${i} must have ${n} entries, got ${row === undefined ? "undefined" : row.length}`);
      }
      if (!allFinite(row)) return fail(`generalized-kelly: corr row ${i} has a non-finite entry`);
      for (let j = 0; j < n; j++) {
        const cij = row[j] as number;
        const cji = (corr[j] as number[])[i] as number;
        if (Math.abs(cij - cji) > 1e-6) {
          return fail(`generalized-kelly: corr is not symmetric at (${i}, ${j}): ${cij} vs ${cji}`);
        }
      }
      corrMatrix.push([...row]);
    }
  }

  let w: number[] | undefined;
  let t: number[] | undefined;
  if (wins !== undefined || trials !== undefined) {
    if (wins === undefined || trials === undefined) {
      return fail("generalized-kelly: wins and trials must be supplied together");
    }
    if (wins.length !== n || trials.length !== n) {
      return fail(`generalized-kelly: wins/trials must align with the ${n} picks (got ${wins.length}/${trials.length})`);
    }
    w = [];
    t = [];
    for (let i = 0; i < n; i++) {
      const wi = wins[i] as number;
      const ti = trials[i] as number;
      if (!isFiniteNumber(wi) || !isFiniteNumber(ti)) {
        return fail(`generalized-kelly: wins/trials entry ${i} is not a finite number`);
      }
      // The kernel throws on (wins > trials) or negatives; pre-empt it so the
      // refusal names the offending pair instead of the generic kernel message.
      if (wi < 0 || ti < 0 || wi > ti) {
        return fail(`generalized-kelly: wins/trials pair ${i} = (${wi}, ${ti}) is not a valid binomial count`);
      }
      w.push(wi);
      t.push(ti);
    }
  }

  let out: SizedSlate;
  let independent: number[];
  try {
    out = sizeSlate(built, corrMatrix, w, t);
    independent = independentFractionBaseline(built);
  } catch (e) {
    return fail(`generalized-kelly: sizeSlate threw: ${threw(e)}`);
  }

  if (out.fractions.length !== n) {
    return fail(`generalized-kelly: sizeSlate returned ${out.fractions.length} fractions for ${n} picks`);
  }
  if (!allFinite(out.fractions)) return fail("generalized-kelly: sizeSlate returned a non-finite fraction");
  if (!isFiniteNumber(out.haircut) || !isFiniteNumber(out.expectedLogGrowth)) {
    return fail("generalized-kelly: sizeSlate returned a non-finite haircut or expectedLogGrowth");
  }
  if (!(out.haircut > 0) || out.haircut > 1 + EPS) {
    return fail(`generalized-kelly: correlation haircut must lie in (0, 1], got ${describe(out.haircut)}`);
  }

  for (let i = 0; i < n; i++) {
    const f = out.fractions[i] as number;
    if (f < 0) {
      return fail(`generalized-kelly: pick ${i} stake ${f} is negative; a stake below zero is a kernel defect, not a pass`);
    }
    if (f > cap + EPS) {
      return fail(
        `generalized-kelly: pick ${i} stake ${f} exceeds the caller cap ${cap}; the kernel applies no per-pick cap of its own`,
      );
    }
  }
  const total = out.fractions.reduce((s, v) => s + v, 0);
  if (total > maxTotal + EPS) {
    return fail(`generalized-kelly: slate stake ${total} exceeds the caller maxTotal ${maxTotal}`);
  }

  const lMinPasses = built.map((k) =>
    k.backtestN === undefined ? true : lMinGatePasses(k.backtestN, k.p, k.decimalOdds),
  );
  // BUG CLASS CAUGHT HERE: a singular correlation matrix makes the kernel's
  // internal linear solve throw, and the active-set loop swallows the throw and
  // returns all-zero fractions while still reporting `sized: true`. An all-zero
  // slate with a strictly positive independent baseline means the solve failed
  // silently, not that there is no edge — so it is refused, not passed through.
  if (out.sized && total === 0 && independent.some((f) => f > EPS)) {
    return fail(
      `generalized-kelly: the kernel reports sized with every fraction at 0 while independent Kelly would stake ${independent
        .map((f) => f.toFixed(6))
        .join(", ")}; a singular correlation matrix makes the internal solve fail silently`,
    );
  }
  const bet = out.sized && total > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : out.reason,
      fractions: [...out.fractions],
      totalStake: total,
      cap,
      maxTotal,
      haircut: out.haircut,
      expectedLogGrowth: out.expectedLogGrowth,
      kernelSizing: out.sized,
      kernelReason: out.reason,
      independentFractions: independent,
      lMinPasses,
    },
  };
}

/**
 * Independent per-pick exact Kelly, computed here rather than imported so the
 * comparison baseline is visible in the audit trail next to the numbers it
 * is being compared against. Same closed form as
 * `0803-1364v2-generalized-kelly-solver.independentKellyFractions`.
 */
function independentFractionBaseline(picks: readonly KellyPick[]): number[] {
  return picks.map((k) => {
    const b = k.decimalOdds - 1;
    if (!(b > 0)) return 0;
    const f = (k.p * k.decimalOdds - 1) / b;
    return f > 0 ? f : 0;
  });
}

/**
 * Laplace-smoothed posterior (w+1)/(N+2) and the L_min sample-size gate, the
 * two scalar pre-checks the slate solver applies per pick. Exposed directly so
 * a caller can screen a pick without running the whole solver.
 */
export function evalKellyPosteriorGate(input: {
  readonly wins: number;
  readonly trials: number;
  readonly pHat: number;
  readonly decimalOdds: number;
}): SizingEval<{ smoothedP: number; growthRate: number; lMin: number; passes: boolean }> {
  const { wins, trials, pHat, decimalOdds } = input;
  if (!isFiniteNumber(wins) || !isFiniteNumber(trials) || wins < 0 || trials < 0 || wins > trials) {
    return fail(`kelly-gate: (wins, trials) = (${describe(wins)}, ${describe(trials)}) is not a valid binomial count`);
  }
  if (!isFiniteNumber(pHat) || !(pHat > 0) || !(pHat < 1)) {
    return fail(`kelly-gate: pHat must be a finite number in (0, 1), got ${describe(pHat)}`);
  }
  if (!isFiniteNumber(decimalOdds) || !(decimalOdds > 1)) {
    return fail(`kelly-gate: decimalOdds must be a finite number > 1, got ${describe(decimalOdds)}`);
  }
  try {
    const smoothedP = laplaceSmoothed(wins, trials);
    const growthRate = kellyGrowthRate(pHat, decimalOdds);
    if (!isFiniteNumber(smoothedP) || !isFiniteNumber(growthRate)) {
      return fail("kelly-gate: kernel returned a non-finite smoothed probability or growth rate");
    }
    if (!(smoothedP > 0) || !(smoothedP < 1)) {
      return fail(`kelly-gate: smoothed probability must lie in (0, 1), got ${describe(smoothedP)}`);
    }
    const lMin = growthRate > 0 ? 1 / (2 * growthRate) : Number.POSITIVE_INFINITY;
    return { ok: true, data: { smoothedP, growthRate, lMin, passes: lMinGatePasses(trials, pHat, decimalOdds) } };
  } catch (e) {
    return fail(`kelly-gate: threw: ${threw(e)}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Constrained Kelly (capped simplex, projected gradient ascent)
// ---------------------------------------------------------------------------

export interface ConstrainedKellyInput {
  /** Win probabilities, strictly inside (0, 1). */
  readonly p: readonly number[];
  /** Net odds (decimalOdds - 1), each strictly > 0. */
  readonly b: readonly number[];
  /** Max weight per pick. Must lie in (0, 1]. */
  readonly maxW: number;
  readonly iters?: number;
  readonly lr?: number;
}

export interface ConstrainedKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly weights: readonly number[];
  readonly totalWeight: number;
  readonly logGrowth: number;
  readonly maxW: number;
}

/**
 * The kernel internally clamps p into [1e-9, 1-1e-9] rather than refusing, so
 * a p of exactly 0 or 1 would be silently repaired into a tiny stake that
 * reads as a deliberate pass. This eval refuses p outside (0, 1) first.
 */
export function evalConstrainedKelly(input: ConstrainedKellyInput): SizingEval<ConstrainedKellyData> {
  const { p, b, maxW } = input;
  if (p.length === 0) return fail("constrained-kelly: need at least 1 pick");
  if (p.length !== b.length) return fail(`constrained-kelly: p has ${p.length} entries, b has ${b.length}`);
  if (!allFinite(p) || !allFinite(b)) return fail("constrained-kelly: p/b contain a non-finite entry");
  for (let k = 0; k < p.length; k++) {
    const pk = p[k] as number;
    if (!(pk > 0) || !(pk < 1)) {
      return fail(`constrained-kelly: p[${k}] must lie in (0, 1); the kernel would silently clamp ${describe(pk)} to a small positive stake`);
    }
    const bk = b[k] as number;
    if (!(bk > 0)) return fail(`constrained-kelly: b[${k}] (net odds) must be > 0, got ${describe(bk)}`);
  }
  if (!isFiniteNumber(maxW) || !(maxW > 0) || maxW > 1) {
    return fail(`constrained-kelly: maxW must be a finite number in (0, 1], got ${describe(maxW)}`);
  }
  if (maxW * p.length < 1) {
    return fail(
      `constrained-kelly: infeasible cap — maxW ${maxW} across ${p.length} picks cannot reach total weight 1 (max ${maxW * p.length})`,
    );
  }

  let weights: number[];
  let growth: number;
  try {
    weights = constrainedKellyWeights(p, b, {
      maxW,
      ...(input.iters === undefined ? {} : { iters: input.iters }),
      ...(input.lr === undefined ? {} : { lr: input.lr }),
    });
    if (weights.length !== p.length) {
      return fail(`constrained-kelly: kernel returned ${weights.length} weights for ${p.length} picks`);
    }
    if (!allFinite(weights)) return fail("constrained-kelly: kernel returned a non-finite weight");
    for (let k = 0; k < weights.length; k++) {
      const w = weights[k] as number;
      if (w < 0) return fail(`constrained-kelly: weight ${k} = ${w} is negative`);
      if (w > maxW + EPS) return fail(`constrained-kelly: weight ${k} = ${w} exceeds the caller cap ${maxW}`);
    }
    const total = weights.reduce((s, v) => s + v, 0);
    if (total > 1 + EPS) return fail(`constrained-kelly: total weight ${total} exceeds the 1.0 bankroll budget`);
    growth = kellyLogGrowth(p, b, weights);
    if (!isFiniteNumber(growth)) return fail("constrained-kelly: log-growth is not finite");
  } catch (e) {
    return fail(`constrained-kelly: kernel threw: ${threw(e)}`);
  }

  const totalWeight = weights.reduce((s, v) => s + v, 0);
  const bet = totalWeight > 0 && growth > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : "constrained-kelly: solved to zero weight or non-positive log-growth — a pass, not a failure",
      weights: [...weights],
      totalWeight,
      logGrowth: growth,
      maxW,
    },
  };
}

/** Projection onto {0 <= w <= maxW, sum w <= 1}, exposed for a caller that sizes by hand. */
export function evalProjectKellySimplex(input: {
  readonly w: readonly number[];
  readonly maxW: number;
}): SizingEval<{ weights: readonly number[]; totalWeight: number }> {
  const { w, maxW } = input;
  if (w.length === 0) return fail("constrained-kelly: need at least 1 weight to project");
  if (!allFinite(w)) return fail("constrained-kelly: weights contain a non-finite entry");
  if (!isFiniteNumber(maxW) || !(maxW > 0)) {
    return fail(`constrained-kelly: maxW must be a finite number > 0, got ${describe(maxW)}`);
  }
  try {
    const out = projectKellySimplex(w, maxW);
    if (!allFinite(out)) return fail("constrained-kelly: projection returned a non-finite weight");
    for (let k = 0; k < out.length; k++) {
      const wk = out[k] as number;
      if (wk < 0) return fail(`constrained-kelly: projected weight ${k} = ${wk} is negative`);
      if (wk > maxW + EPS) return fail(`constrained-kelly: projected weight ${k} = ${wk} exceeds maxW ${maxW}`);
    }
    return { ok: true, data: { weights: [...out], totalWeight: out.reduce((s, v) => s + v, 0) } };
  } catch (e) {
    return fail(`constrained-kelly: projection threw: ${threw(e)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Risk-constrained Kelly (drawdown-tolerance lambda)
// ---------------------------------------------------------------------------

export interface RiskConstrainedKellyInput {
  readonly p: number;
  readonly decimalOdds: number;
  /** Tolerated drawdown fraction, strictly inside (0, 1). */
  readonly alpha: number;
  /** Tolerated probability of exceeding it, strictly inside (0, 1). */
  readonly beta: number;
  readonly cap: number;
}

export interface RiskConstrainedKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly lambda: number;
  readonly stake: number;
  readonly plainKelly: number;
  readonly cap: number;
}

/**
 * `solveRiskConstrainedKelly` returns 0 for both "no positive edge" and
 * "the drawdown constraint binds before any stake", and it never tells the two
 * apart. Both are legitimate no-bet answers, so both return ok with bet:false —
 * but the plain-Kelly comparison is reported alongside so a caller can see
 * whether the constraint or the edge is what zeroed the position.
 */
export function evalRiskConstrainedKelly(
  input: RiskConstrainedKellyInput,
): SizingEval<RiskConstrainedKellyData> {
  const { p, decimalOdds, alpha, beta, cap } = input;
  if (!isFiniteNumber(p) || !(p > 0) || !(p < 1)) {
    return fail(`risk-constrained-kelly: p must lie in (0, 1), got ${describe(p)}`);
  }
  if (!isFiniteNumber(decimalOdds) || !(decimalOdds > 1)) {
    return fail(`risk-constrained-kelly: decimalOdds must be > 1, got ${describe(decimalOdds)}`);
  }
  if (!isFiniteNumber(alpha) || !(alpha > 0) || !(alpha < 1)) {
    return fail(`risk-constrained-kelly: alpha must lie in (0, 1), got ${describe(alpha)}`);
  }
  if (!isFiniteNumber(beta) || !(beta > 0) || !(beta < 1)) {
    return fail(`risk-constrained-kelly: beta must lie in (0, 1), got ${describe(beta)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`risk-constrained-kelly: cap must lie in (0, 1), got ${describe(cap)}`);
  }

  let lambda: number;
  let stake: number;
  let unconstrained: number;
  try {
    lambda = riskAversionLambda(alpha, beta);
    if (!isFiniteNumber(lambda)) return fail(`risk-constrained-kelly: lambda is not finite (${describe(lambda)})`);
    if (!(lambda > 0)) {
      return fail(
        `risk-constrained-kelly: alpha ${alpha} and beta ${beta} produced lambda ${lambda}; lambda must be > 0 for a risk-averse stake`,
      );
    }
    unconstrained = plainKelly(p, decimalOdds);
    stake = solveRiskConstrainedKelly(p, decimalOdds, lambda, cap);
  } catch (e) {
    return fail(`risk-constrained-kelly: kernel threw: ${threw(e)}`);
  }

  if (!isFiniteNumber(stake) || !isFiniteNumber(unconstrained)) {
    return fail("risk-constrained-kelly: kernel returned a non-finite stake");
  }
  if (stake < 0) return fail(`risk-constrained-kelly: stake ${stake} is negative; a stake below zero is a kernel defect`);
  if (stake > cap + EPS) {
    return fail(`risk-constrained-kelly: stake ${stake} exceeds the caller cap ${cap}`);
  }
  if (stake > unconstrained + EPS) {
    return fail(
      `risk-constrained-kelly: risk-constrained stake ${stake} exceeds full Kelly ${unconstrained}; the constraint is supposed to only shrink`,
    );
  }

  const bet = stake > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : unconstrained > 0
          ? "risk-constrained-kelly: the drawdown constraint binds at every feasible stake — a pass, not a failure"
          : "risk-constrained-kelly: no positive edge at these odds — a pass, not a failure",
      lambda,
      stake,
      plainKelly: unconstrained,
      cap,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Emc Kelly (uncertainty-aware staking over a logit-noise posterior)
// ---------------------------------------------------------------------------

export interface EmcKellyInput {
  readonly modelProb: number;
  readonly decimalOdds: number;
  /** Calibrated sigma on the logit scale. Must be >= 0 and finite. */
  readonly sigma: number;
  /** Chance-constraint failure tolerance, strictly inside (0, 1). */
  readonly alpha: number;
  readonly m: number;
  readonly cap: number;
  readonly seed: number;
}

export interface EmcKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stake: number;
  readonly pluginKelly: number;
  readonly shrinkage: number;
  readonly cap: number;
  readonly sampledProbMean: number;
}

/**
 * The kernel's grid search returns the best of 200 points on [0, cap], so the
 * stake is grid-quantised to cap/200. That is reported honestly as the step
 * rather than presented as a continuous optimum.
 */
export function evalEmcKelly(input: EmcKellyInput): SizingEval<EmcKellyData> {
  const { modelProb, decimalOdds, sigma, alpha, m, cap, seed } = input;
  if (!isFiniteNumber(modelProb) || !(modelProb > 0) || !(modelProb < 1)) {
    return fail(`emc-kelly: modelProb must lie in (0, 1), got ${describe(modelProb)}`);
  }
  if (!isFiniteNumber(decimalOdds) || !(decimalOdds > 1)) {
    return fail(`emc-kelly: decimalOdds must be > 1, got ${describe(decimalOdds)}`);
  }
  if (!isFiniteNumber(sigma) || sigma < 0) {
    return fail(`emc-kelly: sigma must be a finite number >= 0; a non-finite edge is fail-closed, not zero, got ${describe(sigma)}`);
  }
  if (!isFiniteNumber(alpha) || !(alpha > 0) || !(alpha < 1)) {
    return fail(`emc-kelly: alpha must lie in (0, 1), got ${describe(alpha)}`);
  }
  if (!isFiniteNumber(m) || m < 1 || !Number.isInteger(m)) {
    return fail(`emc-kelly: m (sample count) must be an integer >= 1, got ${describe(m)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`emc-kelly: cap must lie in (0, 1), got ${describe(cap)}`);
  }
  if (!isFiniteNumber(seed)) return fail(`emc-kelly: seed must be a finite number, got ${describe(seed)}`);

  let stake: number;
  let plug: number;
  let sampled: number[];
  try {
    sampled = sampleTrueProbs(modelProb, sigma, m, makeRng(seed));
    if (sampled.length !== m) return fail(`emc-kelly: sampled ${sampled.length} probabilities for m = ${m}`);
    if (!allFinite(sampled)) return fail("emc-kelly: sampled a non-finite true probability");
    for (const s of sampled) {
      if (!(s > 0) || !(s < 1)) return fail(`emc-kelly: sampled probability ${s} escaped (0, 1)`);
    }
    stake = emcKellyStake(modelProb, decimalOdds, sigma, alpha, m, cap, seed);
    plug = pluginKelly(modelProb, decimalOdds);
  } catch (e) {
    return fail(`emc-kelly: kernel threw: ${threw(e)}`);
  }

  if (!isFiniteNumber(stake) || !isFiniteNumber(plug)) return fail("emc-kelly: kernel returned a non-finite stake");
  if (stake < 0) return fail(`emc-kelly: stake ${stake} is negative`);
  if (stake > cap + EPS) return fail(`emc-kelly: stake ${stake} exceeds the caller cap ${cap}`);
  // At sigma = 0 every sample equals modelProb, so the kernel's objective IS the
  // plug-in log-growth and the grid optimum may not exceed it by more than one
  // grid step (cap/200). At sigma > 0 the objective is a Monte-Carlo mean over
  // M draws, so it legitimately sits above the plug-in value by sampling noise;
  // the cap is then the only real bound and `shrinkage` is reported, not asserted.
  if (sigma === 0 && stake > plug + cap / 200 + EPS) {
    return fail(
      `emc-kelly: with no probability noise the stake ${stake} exceeds plug-in Kelly ${plug}; uncertainty can only shrink the stake`,
    );
  }

  const mean = sampled.reduce((s, v) => s + v, 0) / sampled.length;
  const bet = stake > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : "emc-kelly: the chance constraint admits no positive stake — a pass, not a failure",
      stake,
      pluginKelly: plug,
      shrinkage: plug > 0 ? stake / plug : 0,
      cap,
      sampledProbMean: mean,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Shrinkage Kelly (James-Stein edges then fractional stake)
// ---------------------------------------------------------------------------

export interface ShrinkageKellyInput {
  readonly edges: readonly number[];
  /** Standard errors of each edge. Each must be finite and > 0. */
  readonly ses: readonly number[];
  readonly odds: readonly number[];
  readonly kellyMultiple: number;
  readonly cap: number;
}

export interface ShrinkageKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly shrunkEdges: readonly number[];
  readonly stakes: readonly number[];
  readonly totalStake: number;
  readonly cap: number;
  readonly zeroEdgeStaked: boolean;
}

/**
 * A zero edge is a pass. `edgeToProb` turns a zero edge into the break-even
 * probability 1/odds, whose Kelly fraction is algebraically exactly zero, so a
 * zero-edge pick stakes zero rather than a nominal amount. That identity is
 * asserted, not assumed: the eval refuses a zero-edge pick that came back
 * positive.
 */
export function evalShrinkageKelly(input: ShrinkageKellyInput): SizingEval<ShrinkageKellyData> {
  const { edges, ses, odds, kellyMultiple, cap } = input;
  if (edges.length < 4) {
    return fail(`shrinkage-kelly: James-Stein shrinkage needs >= 4 aligned edges, got ${edges.length}`);
  }
  if (edges.length !== ses.length) {
    return fail(`shrinkage-kelly: ${edges.length} edges against ${ses.length} standard errors`);
  }
  if (edges.length !== odds.length) {
    return fail(`shrinkage-kelly: ${edges.length} edges against ${odds.length} odds`);
  }
  if (!allFinite(edges)) return fail("shrinkage-kelly: edges contain a non-finite value; an undefined edge is fail-closed, not 0");
  for (let i = 0; i < ses.length; i++) {
    const se = ses[i] as number;
    if (!isFiniteNumber(se) || !(se > 0)) {
      return fail(`shrinkage-kelly: se[${i}] must be a finite number > 0, got ${describe(se)}; a zero or infinite se is fail-closed, not 0`);
    }
  }
  for (let i = 0; i < odds.length; i++) {
    const o = odds[i] as number;
    if (!isFiniteNumber(o) || !(o > 1)) {
      return fail(`shrinkage-kelly: odds[${i}] must be a finite number > 1, got ${describe(o)}`);
    }
  }
  if (!isFiniteNumber(kellyMultiple) || !(kellyMultiple > 0) || kellyMultiple > 1) {
    return fail(`shrinkage-kelly: kellyMultiple must lie in (0, 1], got ${describe(kellyMultiple)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`shrinkage-kelly: cap must lie in (0, 1), got ${describe(cap)}`);
  }

  let shrunk: number[];
  let stakes: number[];
  try {
    shrunk = shrinkEdges(edges, ses);
    if (shrunk.length !== edges.length) {
      return fail(`shrinkage-kelly: shrinkEdges returned ${shrunk.length} values for ${edges.length} edges`);
    }
    if (!allFinite(shrunk)) return fail("shrinkage-kelly: shrinkEdges returned a non-finite edge");
    stakes = shrinkageKellyStakes(edges, ses, odds, kellyMultiple);
    if (stakes.length !== edges.length) {
      return fail(`shrinkage-kelly: kernel returned ${stakes.length} stakes for ${edges.length} edges`);
    }
  } catch (e) {
    return fail(`shrinkage-kelly: kernel threw: ${threw(e)}`);
  }

  for (let i = 0; i < stakes.length; i++) {
    const s = stakes[i] as number;
    if (!isFiniteNumber(s)) return fail(`shrinkage-kelly: stake ${i} is not finite`);
    if (s < 0) return fail(`shrinkage-kelly: stake ${i} = ${s} is negative; the kernel floors at zero, so a negative is a defect`);
    if (s > cap + EPS) {
      return fail(`shrinkage-kelly: stake ${i} = ${s} exceeds the caller cap ${cap}; the kernel's own 0.05 cap is not the caller's cap`);
    }
  }

  const total = stakes.reduce((s, v) => s + v, 0);
  const bet = total > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : "shrinkage-kelly: every shrunk edge is non-positive — a pass, not a failure",
      shrunkEdges: [...shrunk],
      stakes: [...stakes],
      totalStake: total,
      cap,
      zeroEdgeStaked: false,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Conformal Kelly (interval-width-scaled stake under two caps)
// ---------------------------------------------------------------------------

export interface ConformalKellyInput {
  /** Model edge as a decimal (model prob - market prob). May be negative. */
  readonly edge: number;
  /** Conformal interval width. Must be >= 0; 0 means no usable signal. */
  readonly intervalWidth: number;
  /** Fractional multiplier, strictly > 0. */
  readonly fraction: number;
  readonly perPickCap: number;
  readonly grossCap: number;
  /** Gross exposure already deployed, in the same units. Must be >= 0. */
  readonly grossUsed: number;
  /** Reject when the cap binds on more than this fraction of the slate. */
  readonly maxCapBindingRate: number;
  /** Existing per-pick results on the same slate, for the cap-binding rate. */
  readonly slateResults?: readonly ConformalKellyResult[];
}

export interface ConformalKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stake: number;
  readonly rawStake: number;
  readonly capBound: boolean;
  readonly perPickCap: number;
  readonly grossCap: number;
  readonly capBindingRate: number | null;
}

export function evalConformalKelly(input: ConformalKellyInput): SizingEval<ConformalKellyData> {
  const { edge, intervalWidth, fraction, perPickCap, grossCap, grossUsed, maxCapBindingRate } = input;
  if (!isFiniteNumber(edge)) {
    return fail(`conformal-kelly: edge must be a finite number; a fractional or unparsed edge is fail-closed, not 0, got ${describe(edge)}`);
  }
  if (!isFiniteNumber(intervalWidth) || intervalWidth < 0) {
    return fail(`conformal-kelly: intervalWidth must be a finite number >= 0, got ${describe(intervalWidth)}`);
  }
  if (!isFiniteNumber(fraction) || !(fraction > 0)) {
    return fail(`conformal-kelly: fraction must be a finite number > 0, got ${describe(fraction)}`);
  }
  if (!isFiniteNumber(perPickCap) || !(perPickCap > 0)) {
    return fail(`conformal-kelly: perPickCap must be a finite number > 0, got ${describe(perPickCap)}`);
  }
  if (!isFiniteNumber(grossCap) || !(grossCap > 0)) {
    return fail(`conformal-kelly: grossCap must be a finite number > 0, got ${describe(grossCap)}`);
  }
  if (!isFiniteNumber(grossUsed) || grossUsed < 0) {
    return fail(`conformal-kelly: grossUsed must be a finite number >= 0, got ${describe(grossUsed)}`);
  }
  if (!isFiniteNumber(maxCapBindingRate) || !(maxCapBindingRate >= 0) || maxCapBindingRate > 1) {
    return fail(`conformal-kelly: maxCapBindingRate must lie in [0, 1], got ${describe(maxCapBindingRate)}`);
  }

  let result: ConformalKellyResult;
  try {
    result = conformalKellyStake(
      { edge, intervalWidth },
      { fraction, perPickCap, grossCap },
      grossUsed,
    );
  } catch (e) {
    return fail(`conformal-kelly: kernel threw: ${threw(e)}`);
  }

  const { stake, rawStake, capBound } = result;
  if (!isFiniteNumber(stake) || !isFiniteNumber(rawStake)) {
    return fail("conformal-kelly: kernel returned a non-finite stake");
  }
  if (stake < 0) return fail(`conformal-kelly: stake ${stake} is negative`);
  if (stake > perPickCap + EPS) {
    return fail(`conformal-kelly: stake ${stake} exceeds the per-pick cap ${perPickCap}`);
  }
  if (stake > grossCap + EPS) {
    return fail(`conformal-kelly: stake ${stake} exceeds the gross cap ${grossCap}`);
  }
  if (stake > grossCap - grossUsed + EPS) {
    return fail(
      `conformal-kelly: stake ${stake} exceeds the remaining gross room ${grossCap - grossUsed} (grossUsed ${grossUsed} of grossCap ${grossCap})`,
    );
  }
  if (stake > rawStake + EPS) {
    return fail(`conformal-kelly: stake ${stake} exceeds the uncapped raw stake ${rawStake}`);
  }
  // A negative edge is a pass, never a negative stake and never a max bet.
  if (edge <= 0 && stake > EPS) {
    return fail(`conformal-kelly: edge ${edge} is non-positive but the kernel produced stake ${stake}; a non-positive edge is a pass`);
  }

  let capBindingRate: number | null = null;
  if (input.slateResults !== undefined) {
    const slate = input.slateResults;
    if (slate.length === 0) return fail("conformal-kelly: slateResults was supplied but is empty");
    for (let i = 0; i < slate.length; i++) {
      const row = slate[i] as ConformalKellyResult;
      if (!isFiniteNumber(row.stake) || !isFiniteNumber(row.rawStake) || row.stake < 0) {
        return fail(`conformal-kelly: slateResults[${i}] carries an invalid stake`);
      }
    }
    try {
      capBindingRate = capBindingFrequency(slate);
    } catch (e) {
      return fail(`conformal-kelly: capBindingFrequency threw: ${threw(e)}`);
    }
    if (!isFiniteNumber(capBindingRate) || capBindingRate < 0 || capBindingRate > 1) {
      return fail(`conformal-kelly: cap-binding rate ${describe(capBindingRate)} is outside [0, 1]`);
    }
    if (capBindingRate > maxCapBindingRate + EPS) {
      return fail(
        `conformal-kelly: cap binds on ${(capBindingRate * 100).toFixed(1)}% of the slate, above the ${(maxCapBindingRate * 100).toFixed(1)}% gate — the sizing model is not discriminating`,
      );
    }
  }

  const bet = stake > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : edge <= 0
          ? "conformal-kelly: non-positive edge — a pass, not a failure"
          : intervalWidth <= 0
            ? "conformal-kelly: zero-width interval carries no measurable uncertainty, so no scale is defined — a pass"
            : "conformal-kelly: no gross room remains under the cap — a pass",
      stake,
      rawStake,
      capBound,
      perPickCap,
      grossCap,
      capBindingRate,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Drawdown-constrained Bayesian Kelly (Beta-Binomial posterior per category)
// ---------------------------------------------------------------------------

export interface DrawdownKellyInput {
  readonly category: string;
  /** Prior alpha/beta; both must be > 0. */
  readonly priorAlpha: number;
  readonly priorBeta: number;
  /** Settled observations folded into the posterior. Wins + losses. */
  readonly settledWins: number;
  readonly settledLosses: number;
  readonly decimalOdds: number;
  readonly bankroll: number;
  readonly peakBankroll: number;
  /** Drawdown fraction past which stakes collapse to minimum-viable. */
  readonly drawdownQ: number;
  readonly minStakeFrac: number;
  readonly uncertaintyZ: number;
  readonly warmupPicks: number;
  readonly newCatFrac: number;
  readonly cap: number;
}

export interface DrawdownKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly frac: number;
  readonly kellyRaw: number;
  readonly shrinkage: number;
  readonly posteriorMean: number;
  readonly posteriorVar: number;
  readonly observations: number;
  readonly drawdown: number;
  readonly drawdownScaled: boolean;
  readonly warmupApplied: boolean;
  readonly cap: number;
  readonly stakeUnits: number;
}

/**
 * A fresh uniform Beta(1,1) posterior has mean 0.5 and CV 1, so an
 * un-warmed category stakes nothing. That is the correct behaviour — but the
 * caller must be told it is the WARM-UP refusing, not the drawdown cap, so both
 * flags are reported separately.
 */
export function evalDrawdownKelly(input: DrawdownKellyInput): SizingEval<DrawdownKellyData> {
  const { category, priorAlpha, priorBeta, settledWins, settledLosses, decimalOdds } = input;
  const { bankroll, peakBankroll, drawdownQ, minStakeFrac, uncertaintyZ, warmupPicks, newCatFrac, cap } = input;
  if (category.length === 0) return fail("drawdown-kelly: category must be a non-empty string");
  for (const [name, v] of [
    ["priorAlpha", priorAlpha],
    ["priorBeta", priorBeta],
    ["settledWins", settledWins],
    ["settledLosses", settledLosses],
    ["bankroll", bankroll],
    ["peakBankroll", peakBankroll],
    ["drawdownQ", drawdownQ],
    ["minStakeFrac", minStakeFrac],
    ["uncertaintyZ", uncertaintyZ],
    ["warmupPicks", warmupPicks],
    ["newCatFrac", newCatFrac],
    ["cap", cap],
  ] as const) {
    if (!isFiniteNumber(v)) return fail(`drawdown-kelly: ${name} must be a finite number, got ${describe(v)}`);
  }
  if (!(priorAlpha > 0) || !(priorBeta > 0)) {
    return fail(`drawdown-kelly: prior alpha/beta must be > 0, got (${priorAlpha}, ${priorBeta})`);
  }
  if (settledWins < 0 || settledLosses < 0) {
    return fail(`drawdown-kelly: settled counts must be >= 0, got (${settledWins}, ${settledLosses})`);
  }
  if (!(decimalOdds > 1)) return fail(`drawdown-kelly: decimalOdds must be > 1, got ${describe(decimalOdds)}`);
  if (!(bankroll > 0)) return fail(`drawdown-kelly: bankroll must be > 0, got ${describe(bankroll)}`);
  if (peakBankroll < 0) return fail(`drawdown-kelly: peakBankroll must be >= 0, got ${describe(peakBankroll)}`);
  if (!(drawdownQ > 0) || drawdownQ >= 1) return fail(`drawdown-kelly: drawdownQ must lie in (0, 1), got ${describe(drawdownQ)}`);
  if (minStakeFrac < 0 || minStakeFrac > 1) return fail(`drawdown-kelly: minStakeFrac must lie in [0, 1], got ${describe(minStakeFrac)}`);
  if (uncertaintyZ < 0) return fail(`drawdown-kelly: uncertaintyZ must be >= 0, got ${describe(uncertaintyZ)}`);
  if (warmupPicks < 0 || !Number.isInteger(warmupPicks)) {
    return fail(`drawdown-kelly: warmupPicks must be an integer >= 0, got ${describe(warmupPicks)}`);
  }
  if (newCatFrac <= 0 || newCatFrac > 1) return fail(`drawdown-kelly: newCatFrac must lie in (0, 1], got ${describe(newCatFrac)}`);
  if (!(cap > 0) || cap >= 1) return fail(`drawdown-kelly: cap must lie in (0, 1), got ${describe(cap)}`);

  let post: CategoryPosterior;
  let quote: { frac: number; kellyRaw: number; shrinkage: number; drawdownScaled: boolean };
  let pMean: number;
  let pVar: number;
  try {
    post = newCategory(category, priorAlpha, priorBeta);
    for (let i = 0; i < settledWins; i++) post = updatePosterior(post, true);
    for (let i = 0; i < settledLosses; i++) post = updatePosterior(post, false);
    pMean = posteriorMean(post);
    pVar = posteriorVar(post);
    if (!isFiniteNumber(pMean) || !(pMean > 0) || !(pMean < 1)) {
      return fail(`drawdown-kelly: posterior mean escaped (0, 1): ${describe(pMean)}`);
    }
    if (!isFiniteNumber(pVar) || pVar < 0) return fail(`drawdown-kelly: posterior variance ${describe(pVar)} is invalid`);
    quote = bayesianKellyStake(post, decimalOdds, {
      bankroll,
      peakBankroll,
      drawdownQ,
      minStakeFrac,
      uncertaintyZ,
      warmupPicks,
      newCatFrac,
    });
  } catch (e) {
    return fail(`drawdown-kelly: kernel threw: ${threw(e)}`);
  }

  const { frac, kellyRaw, shrinkage, drawdownScaled } = quote;
  if (!isFiniteNumber(frac) || !isFiniteNumber(kellyRaw) || !isFiniteNumber(shrinkage)) {
    return fail("drawdown-kelly: kernel returned a non-finite stake component");
  }
  if (frac < 0) return fail(`drawdown-kelly: frac ${frac} is negative; the drawdown cap collapses to ${minStakeFrac}, never below zero`);
  if (frac >= 1) return fail(`drawdown-kelly: frac ${frac} reaches the whole bankroll; no sizing kernel may stake 100%`);
  if (frac > cap + EPS) {
    return fail(`drawdown-kelly: frac ${frac} exceeds the caller cap ${cap}; the kernel applies no cap of its own`);
  }
  if (drawdownScaled && frac > minStakeFrac + EPS) {
    return fail(`drawdown-kelly: the drawdown cap fired but frac ${frac} exceeds minStakeFrac ${minStakeFrac}`);
  }
  if (kellyRaw > 0 && frac > kellyRaw + EPS) {
    return fail(`drawdown-kelly: frac ${frac} exceeds the raw Kelly fraction ${kellyRaw}; shrinkage and the cap only reduce`);
  }

  const peak = Math.max(peakBankroll, bankroll);
  const drawdown = 1 - bankroll / peak;
  const warmupApplied = post.n < warmupPicks;
  const bet = frac > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : shrinkReason(shrinkage, kellyRaw, post.n, warmupPicks),
      frac,
      kellyRaw,
      shrinkage,
      posteriorMean: pMean,
      posteriorVar: pVar,
      observations: post.n,
      drawdown,
      drawdownScaled,
      warmupApplied,
      cap,
      stakeUnits: (frac * bankroll) / 100,
    },
  };
}

function shrinkReason(shrinkage: number, kellyRaw: number, n: number, warmupPicks: number): string {
  if (kellyRaw <= 0) return "drawdown-kelly: posterior mean carries no edge at these odds — a pass, not a failure";
  if (shrinkage <= 0) {
    return n < warmupPicks
      ? `drawdown-kelly: only ${n} observations (< warmup ${warmupPicks}); the posterior is too wide to stake`
      : "drawdown-kelly: posterior uncertainty exceeds the uncertainty multiple — a pass, not a failure";
  }
  return `drawdown-kelly: warm-up cut (${n} < ${warmupPicks} observations) drove the stake to zero — a pass`;
}

/** Worst peak-to-trough of an equity curve, as a fraction. */
export function evalEquityMaxDrawdown(input: {
  readonly equity: readonly number[];
}): SizingEval<{ maxDrawdown: number }> {
  const { equity } = input;
  if (equity.length === 0) return fail("drawdown-kelly: equity curve is empty; there is no drawdown to measure");
  if (!allFinite(equity)) return fail("drawdown-kelly: equity curve contains a non-finite point");
  const e0 = equity[0] as number;
  if (!(e0 > 0)) return fail(`drawdown-kelly: equity must start positive, got ${describe(e0)}`);
  for (const e of equity) {
    if (e <= 0) return fail(`drawdown-kelly: equity hit ${e}; a bankroll that reaches zero has no growth path to size against`);
  }
  try {
    const dd = equityMaxDrawdown(equity);
    if (!isFiniteNumber(dd) || dd < 0 || dd >= 1) {
      return fail(`drawdown-kelly: max drawdown ${describe(dd)} is outside [0, 1)`);
    }
    return { ok: true, data: { maxDrawdown: dd } };
  } catch (e) {
    return fail(`drawdown-kelly: maxDrawdown threw: ${threw(e)}`);
  }
}

// ---------------------------------------------------------------------------
// 8. Coherent drawdown attribution (CED_0.9 + Euler decomposition)
// ---------------------------------------------------------------------------

export interface CedDrawdownInput {
  /** Per-category P&L series. Every series must be the same length. */
  readonly categories: readonly { readonly category: string; readonly pnl: readonly number[] }[];
  /** CED level, strictly inside (0, 1). */
  readonly alpha: number;
  /** Rolling window in periods. */
  readonly window: number;
  /** Realized drawdown fraction, must be >= 0. */
  readonly currentDrawdown: number;
  /** Trigger threshold, must be >= 0. */
  readonly thresholdDt: number;
  /** Cut multiplier applied while the trigger is active, in (0, 1]. */
  readonly cutFraction: number;
}

export interface CedDrawdownData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly ced: number;
  readonly attribution: readonly { readonly category: string; readonly contribution: number; readonly share: number }[];
  /**
   * FALSE when the leave-one-out marginals sum to zero or less. The kernel
   * normalises shares by that sum, so a non-positive sum makes every share read
   * 0 — which looks like "no category dominates" when the truth is "the
   * decomposition is not identifying a source at all". A caller must read
   * `contribution` when this is false, never `share`.
   */
  readonly sharesInformative: boolean;
  readonly marginalSum: number;
  readonly stakeScale: number;
  readonly triggered: boolean;
  readonly periods: number;
}

/**
 * `eulerDrawdownAttribution` returns all-zero contributions (and therefore
 * meaningless shares) whenever the leave-one-out marginals sum to zero, which
 * happens whenever every category is non-negative or perfectly correlated. The
 * eval surfaces `concentrated: false` so a caller reading `share` never mistakes
 * a flat decomposition for a concentrated risk source.
 */
export function evalCedDrawdown(input: CedDrawdownInput): SizingEval<CedDrawdownData> {
  const { categories, alpha, window, currentDrawdown, thresholdDt, cutFraction } = input;
  if (categories.length === 0) return fail("ced-drawdown: need at least one category");
  if (!isFiniteNumber(alpha) || !(alpha > 0) || !(alpha < 1)) {
    return fail(`ced-drawdown: alpha must lie in (0, 1), got ${describe(alpha)}`);
  }
  if (!isFiniteNumber(window) || window < 1 || !Number.isInteger(window)) {
    return fail(`ced-drawdown: window must be an integer >= 1, got ${describe(window)}`);
  }
  if (!isFiniteNumber(currentDrawdown) || currentDrawdown < 0) {
    return fail(`ced-drawdown: currentDrawdown must be a finite number >= 0, got ${describe(currentDrawdown)}`);
  }
  if (!isFiniteNumber(thresholdDt) || thresholdDt < 0) {
    return fail(`ced-drawdown: thresholdDt must be a finite number >= 0, got ${describe(thresholdDt)}`);
  }
  if (!isFiniteNumber(cutFraction) || !(cutFraction > 0) || cutFraction > 1) {
    return fail(`ced-drawdown: cutFraction must lie in (0, 1], got ${describe(cutFraction)}`);
  }

  const built: CategoryPnl[] = [];
  const len = categories[0]?.pnl.length ?? 0;
  if (len < 2) return fail(`ced-drawdown: each category needs >= 2 periods of P&L, got ${len}`);
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    if (c === undefined) return fail(`ced-drawdown: category ${i} is missing`);
    if (c.category.length === 0) return fail(`ced-drawdown: category ${i} has an empty name`);
    if (c.pnl.length !== len) {
      return fail(`ced-drawdown: category "${c.category}" has ${c.pnl.length} periods, expected ${len}`);
    }
    if (!allFinite(c.pnl)) return fail(`ced-drawdown: category "${c.category}" has a non-finite P&L period`);
    built.push({ category: c.category, pnl: [...c.pnl] });
  }

  let attribution: ReturnType<typeof eulerDrawdownAttribution>;
  let ced: number;
  let scale: number;
  try {
    attribution = eulerDrawdownAttribution(built, alpha);
    if (attribution.length !== built.length) {
      return fail(`ced-drawdown: attribution returned ${attribution.length} rows for ${built.length} categories`);
    }
    for (const row of attribution) {
      if (!isFiniteNumber(row.contribution) || !isFiniteNumber(row.share)) {
        return fail(`ced-drawdown: category "${row.category}" has a non-finite attribution`);
      }
      if (row.share < -EPS || row.share > 1 + EPS) {
        return fail(`ced-drawdown: category "${row.category}" share ${row.share} is outside [0, 1]`);
      }
    }
    const fullPnl = new Array<number>(len).fill(0);
    for (const c of built) {
      for (let t = 0; t < len; t++) fullPnl[t] = (fullPnl[t] as number) + (c.pnl[t] as number);
    }
    ced = conditionalExpectedDrawdown(rollingDrawdownsLocal(fullPnl, window), alpha);
    if (!isFiniteNumber(ced) || ced < 0) {
      return fail(`ced-drawdown: CED came back as ${describe(ced)}; a drawdown cannot be negative`);
    }
    scale = drawdownTriggerStakeScale(currentDrawdown, thresholdDt, cutFraction);
    if (!isFiniteNumber(scale) || !(scale > 0) || scale > 1) {
      return fail(`ced-drawdown: trigger scale ${describe(scale)} is outside (0, 1]`);
    }
  } catch (e) {
    return fail(`ced-drawdown: kernel threw: ${threw(e)}`);
  }

  const triggered = scale < 1;
  const marginalSum = attribution.reduce((s, r) => s + r.contribution, 0);
  return {
    ok: true,
    data: {
      bet: scale > 0,
      noBetReason: triggered
        ? `ced-drawdown: realized drawdown ${currentDrawdown} is past the ${thresholdDt} trigger; stakes cut to ${(scale * 100).toFixed(1)}%`
        : null,
      ced,
      attribution: attribution.map((r) => ({
        category: r.category,
        contribution: r.contribution,
        share: r.share,
      })),
      sharesInformative: marginalSum > 0,
      marginalSum,
      stakeScale: scale,
      triggered,
      periods: len,
    },
  };
}

/** Rolling-window max drawdowns, mirroring `ced-drawdown.rollingDrawdowns`. */
function rollingDrawdownsLocal(pnl: readonly number[], window: number): number[] {
  const out: number[] = [];
  for (let start = 0; start < pnl.length; start++) {
    let peak = 0;
    let mdd = 0;
    let run = 0;
    const stop = Math.min(start + window, pnl.length);
    for (let t = start; t < stop; t++) {
      run += pnl[t] as number;
      if (run > peak) peak = run;
      mdd = Math.max(mdd, peak - run);
    }
    out.push(mdd);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 9. Decoupled slate Kelly (portfolio objective with a shared risk penalty)
// ---------------------------------------------------------------------------

export interface DecoupledKellyInput {
  readonly picks: readonly { readonly p: number; readonly odds: number }[];
  /** Optional k x k covariance matrix. Must be square, finite and k-long. */
  readonly cov?: readonly (readonly number[])[];
  readonly maxExposure: number;
  readonly cap: number;
  readonly iters?: number;
}

export interface DecoupledKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stakes: readonly number[];
  readonly totalStake: number;
  readonly objective: number;
  readonly independentFractions: readonly number[];
  readonly maxExposure: number;
  readonly cap: number;
}

export function evalDecoupledKelly(input: DecoupledKellyInput): SizingEval<DecoupledKellyData> {
  const { picks, cov, maxExposure, cap } = input;
  if (picks.length === 0) return fail("decoupled-kelly: need at least 1 pick");
  for (let i = 0; i < picks.length; i++) {
    const pk = picks[i];
    if (pk === undefined) return fail(`decoupled-kelly: pick ${i} is missing`);
    if (!isFiniteNumber(pk.p) || !(pk.p > 0) || !(pk.p < 1)) {
      return fail(`decoupled-kelly: pick ${i} probability must lie in (0, 1), got ${describe(pk.p)}`);
    }
    if (!isFiniteNumber(pk.odds) || !(pk.odds > 1)) {
      return fail(`decoupled-kelly: pick ${i} odds must be > 1, got ${describe(pk.odds)}`);
    }
  }
  if (!isFiniteNumber(maxExposure) || !(maxExposure > 0)) {
    return fail(`decoupled-kelly: maxExposure must be a finite number > 0, got ${describe(maxExposure)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`decoupled-kelly: cap must lie in (0, 1), got ${describe(cap)}`);
  }
  if (input.iters !== undefined && (!Number.isInteger(input.iters) || input.iters < 1)) {
    return fail(`decoupled-kelly: iters must be an integer >= 1, got ${describe(input.iters)}`);
  }

  const k = picks.length;
  const built: DecoupledSlatePick[] = picks.map((q) => ({ p: q.p, odds: q.odds }));
  let covMatrix: number[][] = built.map(() => new Array<number>(k).fill(0));
  if (cov !== undefined) {
    if (cov.length !== k) return fail(`decoupled-kelly: cov has ${cov.length} rows, expected ${k}`);
    covMatrix = [];
    for (let i = 0; i < k; i++) {
      const row = cov[i];
      if (row === undefined || row.length !== k) {
        return fail(`decoupled-kelly: cov row ${i} must have ${k} entries, got ${row === undefined ? "undefined" : row.length}`);
      }
      if (!allFinite(row)) return fail(`decoupled-kelly: cov row ${i} has a non-finite entry`);
      covMatrix.push([...row]);
    }
  }

  let stakes: number[];
  let objective: number;
  try {
    stakes = decoupledSlateKelly(
      built,
      covMatrix,
      maxExposure,
      cap,
      input.iters === undefined ? 40 : input.iters,
    );
    if (stakes.length !== k) return fail(`decoupled-kelly: kernel returned ${stakes.length} stakes for ${k} picks`);
    if (!allFinite(stakes)) return fail("decoupled-kelly: kernel returned a non-finite stake");
    for (let i = 0; i < stakes.length; i++) {
      const s = stakes[i] as number;
      if (s < 0) return fail(`decoupled-kelly: stake ${i} = ${s} is negative`);
      if (s > cap + EPS) return fail(`decoupled-kelly: stake ${i} = ${s} exceeds the caller cap ${cap}`);
    }
    const total = stakes.reduce((s, v) => s + v, 0);
    if (total > maxExposure + EPS) {
      return fail(`decoupled-kelly: slate stake ${total} exceeds the caller maxExposure ${maxExposure}`);
    }
    objective = decoupledObjective(built, stakes, covMatrix);
    if (!isFiniteNumber(objective)) return fail("decoupled-kelly: objective is not finite");
  } catch (e) {
    return fail(`decoupled-kelly: kernel threw: ${threw(e)}`);
  }

  const total = stakes.reduce((s, v) => s + v, 0);
  const bet = total > 0 && objective > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : "decoupled-kelly: every pick has no positive independent edge, or the risk penalty outweighs growth — a pass",
      stakes: [...stakes],
      totalStake: total,
      objective,
      independentFractions: built.map((q) => independentKelly(q, cap)),
      maxExposure,
      cap,
    },
  };
}

// ---------------------------------------------------------------------------
// 10. Multivariate simultaneous Kelly (Gaussian-copula Monte Carlo)
// ---------------------------------------------------------------------------

export interface MultivariateKellyInput {
  readonly edges: readonly { readonly p: number; readonly odds: number; readonly corr?: readonly number[] }[];
  /** Caller cap on any single leg. The kernel's own budget is 1.0 total. */
  readonly cap: number;
  readonly iters?: number;
  readonly lr?: number;
  readonly sims?: number;
  readonly kellyScale?: number;
  /** Calibration error in [0, 1]; drives the adaptive scale when supplied. */
  readonly ece?: number;
  readonly seed: number;
}

export interface MultivariateKellyData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stakes: readonly number[];
  readonly totalStake: number;
  readonly kellyScale: number;
  readonly cap: number;
}

/**
 * `simultaneousKelly` is stochastic. It is driven here with a deterministic
 * LCG seeded by the caller, so the same input always produces the same stakes
 * and the tests can assert real numbers rather than "it did not throw".
 */
export function evalMultivariateKelly(input: MultivariateKellyInput): SizingEval<MultivariateKellyData> {
  const { edges, cap, seed } = input;
  if (edges.length === 0) return fail("multivariate-kelly: need at least 1 edge");
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e === undefined) return fail(`multivariate-kelly: edge ${i} is missing`);
    if (!isFiniteNumber(e.p) || !(e.p > 0) || !(e.p < 1)) {
      return fail(`multivariate-kelly: edge ${i} probability must lie in (0, 1), got ${describe(e.p)}`);
    }
    if (!isFiniteNumber(e.odds) || !(e.odds > 1)) {
      return fail(`multivariate-kelly: edge ${i} odds must be > 1, got ${describe(e.odds)}`);
    }
    if (e.corr !== undefined) {
      if (e.corr.length !== edges.length) {
        return fail(`multivariate-kelly: edge ${i} corr has ${e.corr.length} entries, expected ${edges.length}`);
      }
      if (!allFinite(e.corr)) return fail(`multivariate-kelly: edge ${i} corr has a non-finite entry`);
    }
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`multivariate-kelly: cap must lie in (0, 1), got ${describe(cap)}`);
  }
  if (!isFiniteNumber(seed)) return fail(`multivariate-kelly: seed must be a finite number, got ${describe(seed)}`);
  for (const [name, v] of [
    ["iters", input.iters],
    ["lr", input.lr],
    ["sims", input.sims],
    ["kellyScale", input.kellyScale],
  ] as const) {
    if (v !== undefined && (!isFiniteNumber(v) || !(v > 0))) {
      return fail(`multivariate-kelly: ${name} must be a finite number > 0, got ${describe(v)}`);
    }
  }

  let scale = 1;
  if (input.ece !== undefined) {
    if (!isFiniteNumber(input.ece) || input.ece < 0 || input.ece > 1) {
      return fail(`multivariate-kelly: ece must lie in [0, 1], got ${describe(input.ece)}`);
    }
    try {
      scale = adaptiveKellyScale(input.ece);
    } catch (e) {
      return fail(`multivariate-kelly: adaptiveKellyScale threw: ${threw(e)}`);
    }
    if (!isFiniteNumber(scale) || !(scale > 0) || scale > 1) {
      return fail(`multivariate-kelly: adaptive scale ${describe(scale)} is outside (0, 1]`);
    }
  }
  const effectiveScale = (input.kellyScale ?? 1) * scale;
  if (!(effectiveScale > 0) || effectiveScale > 1 + EPS) {
    return fail(`multivariate-kelly: combined kellyScale ${effectiveScale} is outside (0, 1]`);
  }

  const built: MultivariateEdge[] = edges.map((e) =>
    e.corr === undefined ? { p: e.p, odds: e.odds } : { p: e.p, odds: e.odds, corr: [...e.corr] },
  );

  let stakes: number[];
  try {
    stakes = simultaneousKelly(built, makeRng(seed), {
      kellyScale: effectiveScale,
      ...(input.iters === undefined ? {} : { iters: input.iters }),
      ...(input.lr === undefined ? {} : { lr: input.lr }),
      ...(input.sims === undefined ? {} : { sims: input.sims }),
    });
    if (stakes.length !== built.length) {
      return fail(`multivariate-kelly: kernel returned ${stakes.length} stakes for ${built.length} edges`);
    }
    if (!allFinite(stakes)) return fail("multivariate-kelly: kernel returned a non-finite stake");
    for (let i = 0; i < stakes.length; i++) {
      const s = stakes[i] as number;
      if (s < 0) return fail(`multivariate-kelly: stake ${i} = ${s} is negative`);
      if (s >= 1) return fail(`multivariate-kelly: stake ${i} = ${s} would consume the whole bankroll in one leg`);
      if (s > cap + EPS) return fail(`multivariate-kelly: stake ${i} = ${s} exceeds the caller cap ${cap}`);
    }
    const total = stakes.reduce((s, v) => s + v, 0);
    if (total > 1 + EPS) {
      return fail(`multivariate-kelly: total stake ${total} exceeds the no-leverage budget of 1.0`);
    }
  } catch (e) {
    return fail(`multivariate-kelly: kernel threw: ${threw(e)}`);
  }

  const total = stakes.reduce((s, v) => s + v, 0);
  const bet = total > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : "multivariate-kelly: the copula program converged to zero on every leg — a pass, not a failure",
      stakes: [...stakes],
      totalStake: total,
      kellyScale: effectiveScale,
      cap,
    },
  };
}

/** Bankroll path and worst drawdown of a fixed stake vector over settled outcomes. */
export function evalSimulateWealth(input: {
  readonly stakes: readonly number[];
  readonly edges: readonly { readonly p: number; readonly odds: number }[];
  readonly outcomes: readonly boolean[];
  readonly bankroll?: number;
}): SizingEval<{ wealth: number; maxDrawdown: number }> {
  const { stakes, edges, outcomes } = input;
  const bankroll = input.bankroll ?? 1;
  if (stakes.length === 0) return fail("multivariate-kelly: need at least 1 stake");
  if (stakes.length !== edges.length || edges.length !== outcomes.length) {
    return fail(
      `multivariate-kelly: length mismatch — ${stakes.length} stakes, ${edges.length} edges, ${outcomes.length} outcomes`,
    );
  }
  if (!allFinite(stakes)) return fail("multivariate-kelly: stakes contain a non-finite value");
  for (let i = 0; i < stakes.length; i++) {
    const s = stakes[i] as number;
    if (s < 0) return fail(`multivariate-kelly: stake ${i} = ${s} is negative`);
    if (s >= 1) return fail(`multivariate-kelly: stake ${i} = ${s} reaches 100% of the bankroll`);
    const e = edges[i];
    if (e === undefined || !isFiniteNumber(e.odds) || !(e.odds > 1)) {
      return fail(`multivariate-kelly: edge ${i} odds must be > 1, got ${describe(e?.odds)}`);
    }
  }
  if (!isFiniteNumber(bankroll) || !(bankroll > 0)) {
    return fail(`multivariate-kelly: bankroll must be > 0, got ${describe(bankroll)}`);
  }
  try {
    const r = simulateWealth(stakes, edges, outcomes, bankroll);
    if (!isFiniteNumber(r.wealth)) return fail("multivariate-kelly: terminal wealth is not finite");
    if (r.wealth <= 0) return fail(`multivariate-kelly: bankroll was wiped out (terminal wealth ${r.wealth})`);
    if (!isFiniteNumber(r.maxDrawdown) || r.maxDrawdown < 0 || r.maxDrawdown >= 1) {
      return fail(`multivariate-kelly: max drawdown ${describe(r.maxDrawdown)} is outside [0, 1)`);
    }
    return { ok: true, data: r };
  } catch (e) {
    return fail(`multivariate-kelly: simulateWealth threw: ${threw(e)}`);
  }
}

// ---------------------------------------------------------------------------
// 11. ES governor (expected-shortfall tail control on a slate)
// ---------------------------------------------------------------------------

export interface EsGovernorInput {
  /** Full-Kelly fraction per pick. Each must be >= 0. */
  readonly picks: readonly { readonly kellyFrac: number; readonly decimalOdds: number; readonly winProb: number }[];
  /** ES level, strictly inside (0, 1). */
  readonly alpha: number;
  /** ES budget in log-return units. Must be >= 0 and finite. */
  readonly esBudget: number;
  readonly nSims: number;
  readonly seed: number;
  /** Hard cap on the final governed stake per pick. */
  readonly cap: number;
}

export interface EsGovernorData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly s: number;
  readonly governed: boolean;
  readonly mean: number;
  readonly var: number;
  readonly es: number;
  readonly finalFractions: readonly number[];
  readonly cap: number;
}

export function evalEsGovernor(input: EsGovernorInput): SizingEval<EsGovernorData> {
  const { picks, alpha, esBudget, nSims, seed, cap } = input;
  if (picks.length === 0) return fail("es-governor: need at least 1 pick");
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    if (p === undefined) return fail(`es-governor: pick ${i} is missing`);
    if (!isFiniteNumber(p.kellyFrac) || p.kellyFrac < 0) {
      return fail(`es-governor: pick ${i} kellyFrac must be a finite number >= 0, got ${describe(p.kellyFrac)}`);
    }
    if (!isFiniteNumber(p.decimalOdds) || !(p.decimalOdds > 1)) {
      return fail(`es-governor: pick ${i} odds must be > 1, got ${describe(p.decimalOdds)}`);
    }
    if (!isFiniteNumber(p.winProb) || p.winProb < 0 || p.winProb > 1) {
      return fail(`es-governor: pick ${i} winProb must lie in [0, 1], got ${describe(p.winProb)}`);
    }
  }
  if (!isFiniteNumber(alpha) || !(alpha > 0) || !(alpha < 1)) {
    return fail(`es-governor: alpha must lie in (0, 1), got ${describe(alpha)}`);
  }
  if (!isFiniteNumber(esBudget) || esBudget < 0) {
    return fail(`es-governor: esBudget must be a finite number >= 0, got ${describe(esBudget)}`);
  }
  if (!Number.isInteger(nSims) || nSims < 1) return fail(`es-governor: nSims must be an integer >= 1, got ${describe(nSims)}`);
  if (!isFiniteNumber(seed)) return fail(`es-governor: seed must be a finite number, got ${describe(seed)}`);
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`es-governor: cap must lie in (0, 1), got ${describe(cap)}`);
  }

  const built: EsSlatePick[] = picks.map((p) => ({
    kellyFrac: p.kellyFrac,
    decimalOdds: p.decimalOdds,
    winProb: p.winProb,
  }));
  // The kernel rejects a kellyFrac of 0 only indirectly (a zero fraction is a
  // valid no-bet leg), so the caller-side cap check below is the real guard.
  for (let i = 0; i < built.length; i++) {
    if ((built[i] as EsSlatePick).kellyFrac > cap + EPS) {
      return fail(
        `es-governor: pick ${i} input kellyFrac ${(built[i] as EsSlatePick).kellyFrac} already exceeds the caller cap ${cap}`,
      );
    }
  }

  let result: ReturnType<typeof esGovernor>;
  try {
    result = esGovernor(built, alpha, esBudget, nSims, seed);
  } catch (e) {
    return fail(`es-governor: kernel threw: ${threw(e)}`);
  }

  const { s, governed, stats } = result;
  if (!isFiniteNumber(s) || !(s > 0) || s > 1 + EPS) {
    return fail(`es-governor: shrink scalar ${describe(s)} is outside (0, 1]`);
  }
  if (!isFiniteNumber(stats.mean) || !isFiniteNumber(stats.var) || !isFiniteNumber(stats.es)) {
    return fail("es-governor: tail statistics are not finite");
  }
  if (stats.es < stats.var - EPS) {
    return fail(`es-governor: ES ${stats.es} is below VaR ${stats.var}; ES >= VaR is an identity, so one of them is wrong`);
  }
  if (stats.es > esBudget + EPS && !governed) {
    return fail(
      `es-governor: ES ${stats.es} exceeds the budget ${esBudget} but the kernel reports no governance applied`,
    );
  }

  const finalFractions = built.map((p) => p.kellyFrac * s);
  for (let i = 0; i < finalFractions.length; i++) {
    const f = finalFractions[i] as number;
    if (!isFiniteNumber(f)) return fail(`es-governor: governed fraction ${i} is not finite`);
    if (f < 0) return fail(`es-governor: governed fraction ${i} = ${f} is negative`);
    if (f > cap + EPS) return fail(`es-governor: governed fraction ${i} = ${f} exceeds the caller cap ${cap}`);
  }

  const total = finalFractions.reduce((a, v) => a + v, 0);
  const bet = total > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : governed
          ? `es-governor: the ES budget ${esBudget} can only be met at a ${s} shrink, leaving nothing to stake — a pass`
          : "es-governor: every input pick carries a zero full-Kelly fraction — a pass, not a failure",
      s,
      governed,
      mean: stats.mean,
      var: stats.var,
      es: stats.es,
      finalFractions,
      cap,
    },
  };
}

/** Mean-ES frontier, the paper's concavity/anchoring diagnostic. */
export function evalMeanEsFrontier(input: {
  readonly picks: readonly { readonly kellyFrac: number; readonly decimalOdds: number; readonly winProb: number }[];
  readonly alpha: number;
  readonly nPoints: number;
  readonly nSims: number;
  readonly seed: number;
}): SizingEval<{ frontier: readonly { s: number; mean: number; es: number }[] }> {
  const { picks, alpha, nPoints, nSims, seed } = input;
  if (picks.length === 0) return fail("es-governor: need at least 1 pick");
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    if (p === undefined) return fail(`es-governor: pick ${i} is missing`);
    if (!isFiniteNumber(p.kellyFrac) || p.kellyFrac < 0) {
      return fail(`es-governor: pick ${i} kellyFrac must be a finite number >= 0, got ${describe(p.kellyFrac)}`);
    }
    if (!isFiniteNumber(p.decimalOdds) || !(p.decimalOdds > 1)) {
      return fail(`es-governor: pick ${i} odds must be > 1, got ${describe(p.decimalOdds)}`);
    }
    if (!isFiniteNumber(p.winProb) || p.winProb < 0 || p.winProb > 1) {
      return fail(`es-governor: pick ${i} winProb must lie in [0, 1], got ${describe(p.winProb)}`);
    }
  }
  if (!isFiniteNumber(alpha) || !(alpha > 0) || !(alpha < 1)) {
    return fail(`es-governor: alpha must lie in (0, 1), got ${describe(alpha)}`);
  }
  if (!Number.isInteger(nPoints) || nPoints < 2) return fail(`es-governor: nPoints must be an integer >= 2, got ${describe(nPoints)}`);
  if (!Number.isInteger(nSims) || nSims < 1) return fail(`es-governor: nSims must be an integer >= 1, got ${describe(nSims)}`);
  if (!isFiniteNumber(seed)) return fail(`es-governor: seed must be a finite number, got ${describe(seed)}`);

  const built: EsSlatePick[] = picks.map((p) => ({
    kellyFrac: p.kellyFrac,
    decimalOdds: p.decimalOdds,
    winProb: p.winProb,
  }));
  let frontier: ReturnType<typeof meanEsFrontier>;
  try {
    frontier = meanEsFrontier(built, alpha, nPoints, nSims, seed);
  } catch (e) {
    return fail(`es-governor: meanEsFrontier threw: ${threw(e)}`);
  }
  if (frontier.length !== nPoints) {
    return fail(`es-governor: frontier returned ${frontier.length} points, expected ${nPoints}`);
  }
  for (const pt of frontier) {
    if (!isFiniteNumber(pt.s) || !isFiniteNumber(pt.mean) || !isFiniteNumber(pt.es)) {
      return fail("es-governor: frontier contains a non-finite point");
    }
    if (pt.s <= 0 || pt.s > 1 + EPS) return fail(`es-governor: frontier shrink ${pt.s} is outside (0, 1]`);
  }
  // The frontier must be monotone in the shrink scalar: less risk, less growth.
  for (let i = 1; i < frontier.length; i++) {
    const prev = frontier[i - 1] as { s: number; mean: number; es: number };
    const cur = frontier[i] as { s: number; mean: number; es: number };
    if (!(prev.s > cur.s)) return fail(`es-governor: frontier is not ordered by shrink scalar at index ${i} (${prev.s} then ${cur.s})`);
    if (cur.mean > prev.mean + 1e-3) {
      return fail(
        `es-governor: mean log-return rises as exposure falls (${prev.mean} at s=${prev.s}, ${cur.mean} at s=${cur.s})`,
      );
    }
  }
  return { ok: true, data: { frontier: frontier.map((pt) => ({ s: pt.s, mean: pt.mean, es: pt.es })) } };
}

// ---------------------------------------------------------------------------
// 12. Kelly tournament (fraction chosen by realised outcomes)
// ---------------------------------------------------------------------------

export interface KellyTournamentInput {
  readonly bets: readonly { readonly p: number; readonly odds: number; readonly won: boolean }[];
  /** Candidate Kelly multiples. Each must be >= 0. */
  readonly candidates: readonly number[];
  /** Survivors must stay under this drawdown. Must lie in (0, 1). */
  readonly maxDrawdownCap: number;
  /** Hard cap on the winning fraction of bankroll. */
  readonly stakeCap: number;
}

export interface KellyTournamentData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly fraction: number;
  readonly terminalWealth: number;
  readonly logGrowth: number;
  readonly maxDrawdown: number;
  readonly stakeCap: number;
}

export function evalKellyTournament(input: KellyTournamentInput): SizingEval<KellyTournamentData> {
  const { bets, candidates, maxDrawdownCap, stakeCap } = input;
  if (bets.length === 0) return fail("kelly-tournament: need at least 1 resolved bet");
  for (let i = 0; i < bets.length; i++) {
    const b = bets[i];
    if (b === undefined) return fail(`kelly-tournament: bet ${i} is missing`);
    if (!isFiniteNumber(b.p) || b.p < 0 || b.p > 1) {
      return fail(`kelly-tournament: bet ${i} probability must lie in [0, 1], got ${describe(b.p)}`);
    }
    if (!isFiniteNumber(b.odds) || !(b.odds > 1)) {
      return fail(`kelly-tournament: bet ${i} odds must be > 1, got ${describe(b.odds)}`);
    }
  }
  if (candidates.length === 0) return fail("kelly-tournament: need at least 1 candidate fraction");
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i] as number;
    if (!isFiniteNumber(c) || c < 0) {
      return fail(`kelly-tournament: candidate ${i} must be a finite number >= 0, got ${describe(c)}`);
    }
  }
  if (!isFiniteNumber(maxDrawdownCap) || !(maxDrawdownCap > 0) || maxDrawdownCap >= 1) {
    return fail(`kelly-tournament: maxDrawdownCap must lie in (0, 1), got ${describe(maxDrawdownCap)}`);
  }
  // A fraction of exactly 1 is a legal tournament candidate (the full-bankroll
  // multiple); the eval's job is to check the WINNER against the cap, not to
  // forbid a candidate list that contains 1.
  if (!isFiniteNumber(stakeCap) || !(stakeCap > 0) || stakeCap > 1) {
    return fail(`kelly-tournament: stakeCap must lie in (0, 1], got ${describe(stakeCap)}`);
  }

  const built: BetResolution[] = bets.map((b) => ({ p: b.p, odds: b.odds, won: b.won }));
  let result: ReturnType<typeof kellyTournament>;
  try {
    result = kellyTournament(built, candidates, maxDrawdownCap);
  } catch (e) {
    return fail(`kelly-tournament: kernel threw: ${threw(e)}`);
  }

  const { fraction, terminalWealth, logGrowth, maxDrawdown } = result;
  if (!isFiniteNumber(fraction) || fraction < 0) {
    return fail(`kelly-tournament: fraction ${describe(fraction)} is not a usable Kelly multiple`);
  }
  if (fraction > stakeCap + EPS) {
    return fail(`kelly-tournament: winning fraction ${fraction} exceeds the caller stakeCap ${stakeCap}`);
  }
  if (!isFiniteNumber(terminalWealth) || !(terminalWealth > 0)) {
    return fail(`kelly-tournament: terminal wealth ${describe(terminalWealth)} is not a positive number`);
  }
  if (!isFiniteNumber(logGrowth)) return fail("kelly-tournament: log growth is not finite");
  if (!isFiniteNumber(maxDrawdown) || maxDrawdown < 0 || maxDrawdown >= 1) {
    return fail(`kelly-tournament: max drawdown ${describe(maxDrawdown)} is outside [0, 1)`);
  }

  const bet = fraction > 0 && logGrowth > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : "kelly-tournament: no candidate fraction produced positive log-growth on these resolutions — a pass",
      fraction,
      terminalWealth,
      logGrowth,
      maxDrawdown,
      stakeCap,
    },
  };
}

// ---------------------------------------------------------------------------
// 13. Max-drawdown portfolio (maximin weights over session returns)
// ---------------------------------------------------------------------------

export interface MaxDrawdownPortfolioInput {
  /** sessionReturns[s][b] — the return multiple of bet b in session s. */
  readonly sessionReturns: readonly (readonly number[])[];
  readonly minW: number;
  readonly maxW: number;
  readonly iters?: number;
  readonly lr?: number;
  /** Recent realized drawdown fraction, must be >= 0. */
  readonly recentDrawdown: number;
}

export interface MaxDrawdownPortfolioData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly weights: readonly number[];
  readonly totalWeight: number;
  readonly minW: number;
  readonly maxW: number;
  readonly worstSessionReturn: number;
  readonly adaptedBounds: { readonly minW: number; readonly maxW: number };
}

/**
 * The maximin solver is a longest-step ascent on the worst session, so it can
 * converge to a local point. That is a real property, not a defect, so the eval
 * reports `worstSessionReturn` and checks the contract (weights in [minW, maxW],
 * summing to 1) rather than pretending the solution is globally optimal.
 */
export function evalMaxDrawdownPortfolio(
  input: MaxDrawdownPortfolioInput,
): SizingEval<MaxDrawdownPortfolioData> {
  const { sessionReturns, minW, maxW, recentDrawdown } = input;
  if (sessionReturns.length === 0) return fail("max-drawdown-portfolio: need at least 1 session");
  const nBets = sessionReturns[0]?.length ?? 0;
  if (nBets === 0) return fail("max-drawdown-portfolio: need at least 1 bet per session");
  for (let s = 0; s < sessionReturns.length; s++) {
    const row = sessionReturns[s];
    if (row === undefined || row.length !== nBets) {
      return fail(`max-drawdown-portfolio: session ${s} has ${row === undefined ? "undefined" : row.length} bets, expected ${nBets}`);
    }
    if (!allFinite(row)) return fail(`max-drawdown-portfolio: session ${s} has a non-finite return`);
  }
  if (!isFiniteNumber(minW) || minW < 0) return fail(`max-drawdown-portfolio: minW must be >= 0, got ${describe(minW)}`);
  if (!isFiniteNumber(maxW) || !(maxW > 0)) return fail(`max-drawdown-portfolio: maxW must be > 0, got ${describe(maxW)}`);
  if (minW > maxW) return fail(`max-drawdown-portfolio: minW ${minW} exceeds maxW ${maxW}`);
  if (nBets * minW > 1 + EPS) {
    return fail(
      `max-drawdown-portfolio: infeasible — ${nBets} bets at minW ${minW} already sum to ${nBets * minW} > 1, so the capped simplex is empty`,
    );
  }
  if (nBets * maxW < 1 - EPS) {
    return fail(
      `max-drawdown-portfolio: infeasible — ${nBets} bets at maxW ${maxW} cannot reach total weight 1 (max ${nBets * maxW})`,
    );
  }
  if (!isFiniteNumber(recentDrawdown) || recentDrawdown < 0) {
    return fail(`max-drawdown-portfolio: recentDrawdown must be a finite number >= 0, got ${describe(recentDrawdown)}`);
  }

  let weights: number[];
  let adapted: { minW: number; maxW: number };
  try {
    weights = constrainedMaxDrawdownWeights(sessionReturns, {
      minW,
      maxW,
      ...(input.iters === undefined ? {} : { iters: input.iters }),
      ...(input.lr === undefined ? {} : { lr: input.lr }),
    });
    if (weights.length !== nBets) {
      return fail(`max-drawdown-portfolio: kernel returned ${weights.length} weights for ${nBets} bets`);
    }
    adapted = drawdownAdaptiveBounds(recentDrawdown, maxW, minW);
  } catch (e) {
    return fail(`max-drawdown-portfolio: kernel threw: ${threw(e)}`);
  }

  if (!allFinite(weights)) return fail("max-drawdown-portfolio: kernel returned a non-finite weight");
  for (let b = 0; b < weights.length; b++) {
    const w = weights[b] as number;
    if (w < 0) return fail(`max-drawdown-portfolio: weight ${b} = ${w} is negative`);
    if (w < minW - EPS || w > maxW + EPS) {
      return fail(`max-drawdown-portfolio: weight ${b} = ${w} escapes the [${minW}, ${maxW}] box`);
    }
  }
  const total = weights.reduce((a, v) => a + v, 0);
  if (Math.abs(total - 1) > 1e-6) {
    return fail(`max-drawdown-portfolio: weights sum to ${total}, not 1; the projection failed to reach the simplex`);
  }
  if (!isFiniteNumber(adapted.maxW) || adapted.maxW < minW) {
    return fail(`max-drawdown-portfolio: adaptive bounds inverted — maxW ${describe(adapted.maxW)} below minW ${minW}`);
  }

  let worst = Number.POSITIVE_INFINITY;
  for (const row of sessionReturns) {
    let r = 0;
    for (let b = 0; b < nBets; b++) r += (weights[b] as number) * ((row as number[])[b] as number);
    if (r < worst) worst = r;
  }
  if (!isFiniteNumber(worst)) return fail("max-drawdown-portfolio: worst session return is not finite");

  const bet = worst > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : `max-drawdown-portfolio: the worst session returns ${worst}; this weighting cannot absorb a loss in any single session`,
      weights: [...weights],
      totalWeight: total,
      minW,
      maxW,
      worstSessionReturn: worst,
      adaptedBounds: { minW: adapted.minW, maxW: adapted.maxW },
    },
  };
}

// ---------------------------------------------------------------------------
// 14. Coin-flip modulator (abstain on near-pick'em spreads)
// ---------------------------------------------------------------------------

export interface CoinFlipModulatorInput {
  /** Upstream Kelly stake. Must be finite and >= 0. */
  readonly kellyStake: number;
  /** Line spread, e.g. -2.5. Must be finite. */
  readonly spread: number;
  readonly threshold: number;
  /** Multiplier on coin-flip games, in [0, 1]. */
  readonly factor: number;
  readonly cap: number;
}

export interface CoinFlipModulatorData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stake: number;
  readonly isCoinFlip: boolean;
  readonly factor: number;
  readonly cap: number;
}

export function evalCoinFlipModulator(input: CoinFlipModulatorInput): SizingEval<CoinFlipModulatorData> {
  const { kellyStake, spread, threshold, factor, cap } = input;
  if (!isFiniteNumber(kellyStake) || kellyStake < 0) {
    return fail(`coin-flip: upstream kellyStake must be a finite number >= 0, got ${describe(kellyStake)}`);
  }
  if (!isFiniteNumber(spread)) {
    return fail(`coin-flip: spread must be a finite number; an unparsed line is fail-closed, not 0, got ${describe(spread)}`);
  }
  if (!isFiniteNumber(threshold) || threshold < 0) {
    return fail(`coin-flip: threshold must be a finite number >= 0, got ${describe(threshold)}`);
  }
  if (!isFiniteNumber(factor) || factor < 0 || factor > 1) {
    return fail(`coin-flip: factor must lie in [0, 1], got ${describe(factor)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`coin-flip: cap must lie in (0, 1), got ${describe(cap)}`);
  }
  if (kellyStake > cap + EPS) {
    return fail(`coin-flip: upstream stake ${kellyStake} already exceeds the caller cap ${cap}`);
  }

  let stake: number;
  let coin: boolean;
  try {
    coin = isCoinFlip(spread, threshold);
    stake = modulateStake(kellyStake, spread, { threshold, factor });
  } catch (e) {
    return fail(`coin-flip: kernel threw: ${threw(e)}`);
  }
  if (!isFiniteNumber(stake)) return fail("coin-flip: modulated stake is not finite");
  if (stake < 0) return fail(`coin-flip: modulated stake ${stake} is negative`);
  if (stake > cap + EPS) return fail(`coin-flip: modulated stake ${stake} exceeds the caller cap ${cap}`);
  if (stake > kellyStake + EPS) {
    return fail(`coin-flip: modulation RAISED the stake from ${kellyStake} to ${stake}; a modulator may only reduce`);
  }
  if (factor < 1 && !coin && Math.abs(stake - kellyStake) > EPS) {
    return fail(`coin-flip: a non-coin-flip game (spread ${spread}) was still scaled from ${kellyStake} to ${stake}`);
  }
  if (factor === 0 && coin && Math.abs(stake) > EPS) {
    return fail(`coin-flip: factor 0 means full abstention on a coin-flip game, yet the stake is ${stake}`);
  }

  const bet = stake > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : kellyStake === 0
          ? "coin-flip: upstream Kelly produced no stake — a pass, not a failure"
          : `coin-flip: spread ${spread} is inside the ${threshold} coin-flip band and factor 0 abstains — a pass`,
      stake,
      isCoinFlip: coin,
      factor,
      cap,
    },
  };
}

// ---------------------------------------------------------------------------
// 15. Selective feasibility ceiling (perfect-selector benchmark)
// ---------------------------------------------------------------------------

export interface SelectiveFeasibilityInput {
  readonly edges: readonly number[];
  /** Fraction of the slate a perfect selector keeps, in (0, 1]. */
  readonly keepFrac: number;
  /** Mean edge a real strategy must clear. */
  readonly hurdle: number;
}

export interface SelectiveFeasibilityData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly ceiling: number;
  readonly breakevenKeepRate: number;
  readonly volume: number;
  readonly keepFrac: number;
  readonly hurdle: number;
}

export function evalSelectiveFeasibility(
  input: SelectiveFeasibilityInput,
): SizingEval<SelectiveFeasibilityData> {
  const { edges, keepFrac, hurdle } = input;
  if (edges.length === 0) return fail("selective-feasibility: need at least 1 edge");
  if (!allFinite(edges)) return fail("selective-feasibility: edges contain a non-finite value; an undefined edge is fail-closed, not 0");
  if (!isFiniteNumber(keepFrac) || !(keepFrac > 0) || keepFrac > 1) {
    return fail(`selective-feasibility: keepFrac must lie in (0, 1], got ${describe(keepFrac)}`);
  }
  if (!isFiniteNumber(hurdle)) return fail(`selective-feasibility: hurdle must be a finite number, got ${describe(hurdle)}`);

  let ceiling: number;
  let breakeven: number;
  let volume: number;
  try {
    ceiling = selectiveFeasibilityCeiling(edges, keepFrac);
    breakeven = breakevenKeepRate(edges, hurdle);
    volume = ceilingVolume(edges.length, keepFrac);
  } catch (e) {
    return fail(`selective-feasibility: kernel threw: ${threw(e)}`);
  }
  if (!isFiniteNumber(ceiling)) return fail("selective-feasibility: ceiling is not finite");
  if (!isFiniteNumber(breakeven) || breakeven < 0 || breakeven > 1) {
    return fail(`selective-feasibility: breakeven keep rate ${describe(breakeven)} is outside [0, 1]`);
  }
  if (!Number.isInteger(volume) || volume < 1) {
    return fail(`selective-feasibility: volume ${describe(volume)} is not a positive integer`);
  }
  if (volume > edges.length) {
    return fail(`selective-feasibility: volume ${volume} exceeds the ${edges.length} edges available`);
  }
  // A ceiling below the hurdle is a real answer: the strategy cannot work.
  const feasible = ceiling >= hurdle;
  return {
    ok: true,
    data: {
      bet: feasible,
      noBetReason: feasible
        ? null
        : `selective-feasibility: the perfect-selector ceiling ${ceiling} is below the ${hurdle} hurdle, so no selector can reach it`,
      ceiling,
      breakevenKeepRate: breakeven,
      volume,
      keepFrac,
      hurdle,
    },
  };
}

// ---------------------------------------------------------------------------
// 16. Slate-MPC staker (correlation-penalised projected gradient)
// ---------------------------------------------------------------------------

export interface SlateMpcInput {
  readonly picks: readonly { readonly p: number; readonly odds: number }[];
  /** Optional k x k covariance. Must be square with k-long rows. */
  readonly cov?: readonly (readonly number[])[];
  readonly cap: number;
  readonly maxExposure: number;
  readonly lambda: number;
  readonly iterations?: number;
}

export interface SlateMpcData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly stakes: readonly number[];
  readonly totalStake: number;
  readonly cap: number;
  readonly maxExposure: number;
}

export function evalSlateMpc(input: SlateMpcInput): SizingEval<SlateMpcData> {
  const { picks, cov, cap, maxExposure, lambda } = input;
  if (picks.length === 0) return fail("slate-mpc: need at least 1 pick");
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    if (p === undefined) return fail(`slate-mpc: pick ${i} is missing`);
    if (!isFiniteNumber(p.p) || !(p.p > 0) || !(p.p < 1)) {
      return fail(`slate-mpc: pick ${i} probability must lie in (0, 1), got ${describe(p.p)}`);
    }
    if (!isFiniteNumber(p.odds) || !(p.odds > 1)) {
      return fail(`slate-mpc: pick ${i} odds must be > 1, got ${describe(p.odds)}`);
    }
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`slate-mpc: cap must lie in (0, 1), got ${describe(cap)}`);
  }
  if (!isFiniteNumber(maxExposure) || !(maxExposure > 0) || maxExposure > 1 + EPS) {
    return fail(`slate-mpc: maxExposure must lie in (0, 1], got ${describe(maxExposure)}`);
  }
  if (maxExposure < cap) return fail(`slate-mpc: maxExposure ${maxExposure} is below the single-pick cap ${cap}`);
  if (!isFiniteNumber(lambda) || lambda < 0) {
    return fail(`slate-mpc: lambda must be a finite number >= 0, got ${describe(lambda)}`);
  }
  if (input.iterations !== undefined && (!Number.isInteger(input.iterations) || input.iterations < 1)) {
    return fail(`slate-mpc: iterations must be an integer >= 1, got ${describe(input.iterations)}`);
  }

  const k = picks.length;
  const built: MpcSlatePick[] = picks.map((p) => ({ p: p.p, odds: p.odds }));
  let covMatrix: number[][] | undefined;
  if (cov !== undefined) {
    if (cov.length !== k) return fail(`slate-mpc: cov has ${cov.length} rows, expected ${k}`);
    covMatrix = [];
    for (let i = 0; i < k; i++) {
      const row = cov[i];
      if (row === undefined || row.length !== k) {
        return fail(`slate-mpc: cov row ${i} must have ${k} entries, got ${row === undefined ? "undefined" : row.length}`);
      }
      if (!allFinite(row)) return fail(`slate-mpc: cov row ${i} has a non-finite entry`);
      covMatrix.push([...row]);
    }
  }

  let stakes: number[];
  try {
    stakes = solveSlateMpc(built, covMatrix, {
      cap,
      maxExposure,
      lambda,
      ...(input.iterations === undefined ? {} : { iterations: input.iterations }),
    });
    if (stakes.length !== k) return fail(`slate-mpc: kernel returned ${stakes.length} stakes for ${k} picks`);
    if (!allFinite(stakes)) return fail("slate-mpc: kernel returned a non-finite stake");
    for (let i = 0; i < stakes.length; i++) {
      const s = stakes[i] as number;
      if (s < 0) return fail(`slate-mpc: stake ${i} = ${s} is negative`);
      if (s > cap + EPS) return fail(`slate-mpc: stake ${i} = ${s} exceeds the caller cap ${cap}`);
    }
    const total = stakes.reduce((a, v) => a + v, 0);
    if (total > maxExposure + EPS) {
      return fail(`slate-mpc: slate stake ${total} exceeds the caller maxExposure ${maxExposure}`);
    }
  } catch (e) {
    return fail(`slate-mpc: kernel threw: ${threw(e)}`);
  }

  const total = stakes.reduce((a, v) => a + v, 0);
  const bet = total > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet ? null : "slate-mpc: the correlation penalty zeroed every leg — a pass, not a failure",
      stakes: [...stakes],
      totalStake: total,
      cap,
      maxExposure,
    },
  };
}

// ---------------------------------------------------------------------------
// 17. Volatility-regime scaler (regime multiplier with a drawdown haircut)
// ---------------------------------------------------------------------------

export interface VolatilityRegimeInput {
  /** Realised return series, at least 2 observations. */
  readonly returns: readonly number[];
  /** Trailing window in observations, >= 2. */
  readonly window: number;
  /** Trailing volatility history for the regime classifier. */
  readonly volHistory: readonly number[];
  /** Realized drawdown fraction, must lie in [0, 1). */
  readonly drawdown: number;
  readonly bankroll: number;
  /** Max fraction of bankroll any single pick may consume, in (0, 1]. */
  readonly maxBankrollFrac: number;
  /** Upstream stake in bankroll units, must be finite and >= 0. */
  readonly baseStake: number;
  readonly lowMult?: number;
  readonly normalMult?: number;
  readonly highMult?: number;
}

export interface VolatilityRegimeData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly regime: VolRegime;
  readonly currentVol: number;
  readonly multiplier: number;
  readonly stake: number;
  readonly maxStake: number;
  readonly volSeries: readonly number[];
}

export function evalVolatilityRegime(
  input: VolatilityRegimeInput,
): SizingEval<VolatilityRegimeData> {
  const { returns, window, volHistory, drawdown, bankroll, maxBankrollFrac, baseStake } = input;
  if (returns.length < 2) {
    return fail(`volatility-regime: need >= 2 returns to measure volatility, got ${returns.length}`);
  }
  if (!allFinite(returns)) return fail("volatility-regime: returns contain a non-finite value");
  if (!Number.isInteger(window) || window < 2) {
    return fail(`volatility-regime: window must be an integer >= 2, got ${describe(window)}`);
  }
  if (!allFinite(volHistory)) return fail("volatility-regime: volHistory contains a non-finite value");
  for (let i = 0; i < volHistory.length; i++) {
    if ((volHistory[i] as number) < 0) {
      return fail(`volatility-regime: volHistory[${i}] = ${volHistory[i]} is negative; volatility cannot be negative`);
    }
  }
  if (!isFiniteNumber(drawdown) || drawdown < 0 || drawdown >= 1) {
    return fail(`volatility-regime: drawdown must lie in [0, 1), got ${describe(drawdown)}`);
  }
  if (!isFiniteNumber(bankroll) || !(bankroll > 0)) {
    return fail(`volatility-regime: bankroll must be > 0, got ${describe(bankroll)}`);
  }
  if (!isFiniteNumber(maxBankrollFrac) || !(maxBankrollFrac > 0) || maxBankrollFrac > 1) {
    return fail(`volatility-regime: maxBankrollFrac must lie in (0, 1], got ${describe(maxBankrollFrac)}`);
  }
  if (!isFiniteNumber(baseStake) || baseStake < 0) {
    return fail(`volatility-regime: baseStake must be a finite number >= 0, got ${describe(baseStake)}`);
  }
  for (const [name, v] of [
    ["lowMult", input.lowMult],
    ["normalMult", input.normalMult],
    ["highMult", input.highMult],
  ] as const) {
    if (v !== undefined && (!isFiniteNumber(v) || v < 0 || v > 1)) {
      return fail(`volatility-regime: ${name} must lie in [0, 1], got ${describe(v)}`);
    }
  }

  let vol: number[];
  let regime: VolRegime;
  let multiplier: number;
  let stake: number;
  try {
    vol = rollingVolatility(returns, window);
    if (vol.length !== returns.length) {
      return fail(`volatility-regime: rollingVolatility returned ${vol.length} points for ${returns.length} returns`);
    }
    if (!allFinite(vol)) return fail("volatility-regime: rolling volatility produced a non-finite value");
    regime = classifyRegime(vol[vol.length - 1] as number, volHistory);
    multiplier = stakeMultiplier(regime, drawdown, {
      ...(input.lowMult === undefined ? {} : { lowMult: input.lowMult }),
      ...(input.normalMult === undefined ? {} : { normalMult: input.normalMult }),
      ...(input.highMult === undefined ? {} : { highMult: input.highMult }),
    });
    if (!isFiniteNumber(multiplier) || multiplier < 0 || multiplier > 1 + EPS) {
      return fail(`volatility-regime: regime multiplier ${describe(multiplier)} is outside [0, 1]`);
    }
    stake = scaleStake(baseStake, multiplier, bankroll, maxBankrollFrac);
  } catch (e) {
    return fail(`volatility-regime: kernel threw: ${threw(e)}`);
  }

  if (!isFiniteNumber(stake)) return fail("volatility-regime: scaled stake is not finite");
  if (stake < 0) return fail(`volatility-regime: scaled stake ${stake} is negative`);
  const maxStake = maxBankrollFrac * bankroll;
  if (stake > maxStake + EPS) {
    return fail(`volatility-regime: scaled stake ${stake} exceeds the cap of ${maxStake} (${maxBankrollFrac} of bankroll ${bankroll})`);
  }
  if (stake > baseStake + EPS) {
    return fail(`volatility-regime: scaling RAISED the stake from ${baseStake} to ${stake}; a scaler may only reduce`);
  }

  const bet = stake > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : multiplier === 0
          ? `volatility-regime: the ${drawdown} drawdown haircut zeroed the stake — a pass, not a failure`
          : "volatility-regime: upstream base stake was zero — a pass, not a failure",
      regime,
      currentVol: vol[vol.length - 1] as number,
      multiplier,
      stake,
      maxStake,
      volSeries: [...vol],
    },
  };
}

// ---------------------------------------------------------------------------
// 18. Path-form features (PP / MDD / R decomposition)
// ---------------------------------------------------------------------------

export interface PathFormInput {
  /** Per-game margins (EPA margin, cover margin, or daily P&L). */
  readonly perGameMargins: readonly number[];
  /** Slump aversion weight in the quality score. */
  readonly slumpAversion: number;
  /** Recovery fraction required before a stake ramp-up is allowed. */
  readonly recoveryFraction: number;
  /** Hard cap on any ramp implied by the gate. */
  readonly cap: number;
}

export interface PathFormData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly cumulative: number;
  readonly maxDrawdown: number;
  readonly recovery: number;
  readonly troughIndex: number;
  readonly pathQuality: number;
  readonly rampAllowed: boolean;
  readonly games: number;
  readonly cap: number;
}

/**
 * `decomposePath` returns all zeros for an empty path rather than signalling
 * that there is nothing to decompose. That is indistinguishable from a real
 * flat path, so the bridge refuses an empty series outright.
 */
export function evalPathForm(input: PathFormInput): SizingEval<PathFormData> {
  const { perGameMargins, slumpAversion, recoveryFraction, cap } = input;
  if (perGameMargins.length === 0) {
    return fail("path-form: perGameMargins is empty; the kernel returns all zeros here, which is indistinguishable from a flat path");
  }
  if (!allFinite(perGameMargins)) return fail("path-form: perGameMargins contains a non-finite margin");
  if (!isFiniteNumber(slumpAversion) || slumpAversion < 0) {
    return fail(`path-form: slumpAversion must be a finite number >= 0, got ${describe(slumpAversion)}`);
  }
  if (!isFiniteNumber(recoveryFraction) || recoveryFraction < 0) {
    return fail(`path-form: recoveryFraction must be a finite number >= 0, got ${describe(recoveryFraction)}`);
  }
  if (!isFiniteNumber(cap) || !(cap > 0) || cap >= 1) {
    return fail(`path-form: cap must lie in (0, 1), got ${describe(cap)}`);
  }

  let dec: ReturnType<typeof decomposePath>;
  let quality: number;
  let ramp: boolean;
  try {
    dec = decomposePath(perGameMargins);
    quality = pathQualityScore(dec, slumpAversion);
    ramp = bankrollRegimeAllowsRamp(perGameMargins, recoveryFraction);
  } catch (e) {
    return fail(`path-form: kernel threw: ${threw(e)}`);
  }

  const { cumulative, maxDrawdown, recovery, troughIndex } = dec;
  for (const [name, v] of [
    ["cumulative", cumulative],
    ["maxDrawdown", maxDrawdown],
    ["recovery", recovery],
    ["pathQuality", quality],
  ] as const) {
    if (!isFiniteNumber(v)) return fail(`path-form: ${name} is not finite`);
  }
  if (maxDrawdown < 0) return fail(`path-form: maxDrawdown ${maxDrawdown} is negative; a drawdown cannot be negative`);
  if (recovery < 0) return fail(`path-form: recovery ${recovery} is negative`);
  if (!Number.isInteger(troughIndex) || troughIndex < -1 || troughIndex >= perGameMargins.length) {
    return fail(`path-form: troughIndex ${troughIndex} is outside [-1, ${perGameMargins.length - 1}]`);
  }
  if (maxDrawdown > 0 && troughIndex < 0) {
    return fail("path-form: a real slump was reported but troughIndex is -1");
  }
  if (maxDrawdown === 0 && troughIndex !== -1) {
    return fail(`path-form: no slump was reported but troughIndex is ${troughIndex}`);
  }
  if (maxDrawdown === 0 && recovery !== 0) {
    return fail(`path-form: no slump but recovery is ${recovery}`);
  }
  // `recovery` is measured from the trough's cumulative value, not from zero,
  // so it may legitimately exceed the endpoint. The derivable identity is that
  // the trough sits at `cumulative - recovery` and the path's peak is >= 0, so
  // the trough can never fall below -maxDrawdown.
  const troughCumulative = cumulative - recovery;
  if (troughCumulative < -maxDrawdown - EPS) {
    return fail(
      `path-form: trough value ${troughCumulative} is below -maxDrawdown ${-maxDrawdown}; the decomposition is inconsistent`,
    );
  }

  const bet = ramp;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: ramp
        ? null
        : `path-form: recovery ${recovery} has not covered ${(recoveryFraction * 100).toFixed(0)}% of the ${maxDrawdown} slump — ramp-up is held`,
      cumulative,
      maxDrawdown,
      recovery,
      troughIndex,
      pathQuality: quality,
      rampAllowed: ramp,
      games: perGameMargins.length,
      cap,
    },
  };
}

// ---------------------------------------------------------------------------
// 19. QR-DQN distributional head (quantile loss + stake policy)
// ---------------------------------------------------------------------------

export interface QrDqnInput {
  /** Current quantiles for (s, a). Must be non-empty and all finite. */
  readonly theta: readonly number[];
  /** Target quantiles for (s', a*). Same length as `theta`. */
  readonly thetaTarget: readonly number[];
  readonly reward: number;
  readonly gamma: number;
  readonly kappa: number;
  /** Quantile-mean return per stake action. Must be non-empty. */
  readonly quantileMeans: readonly number[];
  /** Index of the action actually taken in the offline batch. */
  readonly takenAction: number;
  /** CVaR level for the drawdown-aware policy, in (0, 1]. */
  readonly cvarAlpha: number;
  /** Hard cap on the emitted stake, in units. */
  readonly capUnits: number;
}

export interface QrDqnData {
  readonly bet: boolean;
  readonly noBetReason: string | null;
  readonly qrLoss: number;
  readonly cqlPenalty: number;
  readonly greedyStake: number;
  readonly cvarStake: number;
  readonly interQuantileRange: number;
  readonly capUnits: number;
}

export function evalQrDqn(input: QrDqnInput): SizingEval<QrDqnData> {
  const { theta, thetaTarget, reward, gamma, kappa, quantileMeans, takenAction, cvarAlpha, capUnits } = input;
  if (theta.length === 0) return fail("qr-dqn: theta must contain at least one quantile");
  if (thetaTarget.length !== theta.length) {
    return fail(`qr-dqn: thetaTarget has ${thetaTarget.length} quantiles, theta has ${theta.length}`);
  }
  if (!allFinite(theta) || !allFinite(thetaTarget)) return fail("qr-dqn: quantiles contain a non-finite value");
  for (let i = 0; i < theta.length; i++) {
    if (!Number.isInteger(i + 1)) return fail("qr-dqn: quantile index overflow");
  }
  for (const [name, v] of [
    ["reward", reward],
    ["gamma", gamma],
    ["kappa", kappa],
    ["cvarAlpha", cvarAlpha],
    ["capUnits", capUnits],
  ] as const) {
    if (!isFiniteNumber(v)) return fail(`qr-dqn: ${name} must be a finite number, got ${describe(v)}`);
  }
  if (!(gamma >= 0) || gamma > 1) return fail(`qr-dqn: gamma must lie in [0, 1], got ${describe(gamma)}`);
  if (!(kappa > 0)) return fail(`qr-dqn: kappa must be > 0, got ${describe(kappa)}`);
  if (!(cvarAlpha > 0) || cvarAlpha > 1) return fail(`qr-dqn: cvarAlpha must lie in (0, 1], got ${describe(cvarAlpha)}`);
  if (quantileMeans.length === 0) return fail("qr-dqn: quantileMeans must contain at least one action mean");
  if (!allFinite(quantileMeans)) return fail("qr-dqn: quantileMeans contains a non-finite value");
  if (quantileMeans.length !== STAKE_ACTIONS.length) {
    return fail(`qr-dqn: quantileMeans has ${quantileMeans.length} actions, expected ${STAKE_ACTIONS.length}`);
  }
  if (!Number.isInteger(takenAction) || takenAction < 0 || takenAction >= quantileMeans.length) {
    return fail(`qr-dqn: takenAction ${describe(takenAction)} is outside [0, ${quantileMeans.length - 1}]`);
  }
  if (!isFiniteNumber(capUnits) || !(capUnits > 0)) {
    return fail(`qr-dqn: capUnits must be a finite number > 0, got ${describe(capUnits)}`);
  }

  let loss: number;
  let penalty: number;
  let greedy: number;
  let cvar: number;
  let iqr: number;
  try {
    loss = qrLoss(theta, thetaTarget, reward, gamma, kappa);
    penalty = cqlPenalty(quantileMeans, takenAction);
    greedy = greedyStake(quantileMeans.map((m) => [m]));
    cvar = cvarStake(quantileMeans.map((m) => [m]), cvarAlpha);
    iqr = interQuantileRange(theta);
  } catch (e) {
    return fail(`qr-dqn: kernel threw: ${threw(e)}`);
  }

  for (const [name, v] of [
    ["qrLoss", loss],
    ["cqlPenalty", penalty],
    ["greedyStake", greedy],
    ["cvarStake", cvar],
    ["interQuantileRange", iqr],
  ] as const) {
    if (!isFiniteNumber(v)) return fail(`qr-dqn: ${name} is not finite`);
  }
  if (loss < 0) return fail(`qr-dqn: loss ${loss} is negative; a quantile-Huber loss cannot be negative`);
  if (iqr < 0) return fail(`qr-dqn: inter-quantile range ${iqr} is negative`);
  if (greedy < 0) return fail(`qr-dqn: greedy stake ${greedy} is negative`);
  if (greedy > capUnits + EPS) {
    return fail(`qr-dqn: greedy stake ${greedy}u exceeds the caller cap ${capUnits}u`);
  }
  if (cvar < 0) return fail(`qr-dqn: CVaR stake ${cvar} is negative`);
  if (cvar > capUnits + EPS) {
    return fail(`qr-dqn: CVaR stake ${cvar}u exceeds the caller cap ${capUnits}u`);
  }
  // The drawdown-aware policy must never be more aggressive than the mean policy.
  if (cvar > greedy + EPS) {
    return fail(
      `qr-dqn: the CVaR policy stakes ${cvar}u against the greedy policy's ${greedy}u; a tail-aware policy may only reduce`,
    );
  }

  const chosen = cvar;
  const bet = chosen > 0;
  return {
    ok: true,
    data: {
      bet,
      noBetReason: bet
        ? null
        : "qr-dqn: the tail-aware policy selects the zero-stake action — a pass, not a failure",
      qrLoss: loss,
      cqlPenalty: penalty,
      greedyStake: greedy,
      cvarStake: cvar,
      interQuantileRange: iqr,
      capUnits,
    },
  };
}
