/**
 * Experimental models bridge — a fail-closed adapter that makes a slice of the
 * prediction engine's `experimental` pure-computation family callable from the
 * ingestion pipeline, and publishes on every result whether the source module's
 * own acceptance gate has actually been evaluated.
 *
 * The `experimental` family is, by construction, NOT part of any live model
 * path. Four of the six modules carry `export const ENABLED = false` plus a
 * docstring saying that wiring them "changes predictions and is a NEEDS HUMAN
 * CALL", and two of those four state outright that their acceptance gate is
 * "NOT EVALUATED". This bridge flips no flag and edits no source file. It makes
 * the functions reachable so a human can call them deliberately, and it refuses
 * to hand back a number it cannot stand behind.
 *
 * Honesty rules this file obeys:
 *  - it never invents, imputes, smooths, or substitutes a value;
 *  - every ok:true result carries `gate` (ExpGateStatus) so a caller cannot
 *    mistake a gated, unevaluated diagnostic for a validated production signal;
 *  - every number coming back from a module is re-checked for finiteness and
 *    its documented bound before the eval is allowed to report success;
 *  - a degenerate input (no spread, no prior rows, fewer than the minimum
 *    sample, a regression with a singular design) fails closed with a specific
 *    reason rather than returning a plausible-looking null or zero.
 */

import {
  effectiveBreadth,
  entropyBreadth,
  isTopHeavy,
  normalize,
} from "@sports/prediction-engine/src/experimental/effective-breadth.js";
import {
  aggregateShap,
  ashapStability,
  topKFeatures,
  type GroupContribution,
} from "@sports/prediction-engine/src/experimental/ashap-aggregate.js";
import {
  fitITSPoisson,
  itsGate,
  normalCdf,
  scanBreaks,
  ENABLED as ITS_ENABLED,
  type BreakScan,
  type ITSFit,
} from "@sports/prediction-engine/src/experimental/1805-01271v1-its-break-harness.js";
import {
  cmpPmf,
  ingarchFilter,
  ingarchLogLik,
  nestedScoreSim,
  poissonLogLik,
  poissonMle,
  ENABLED as POISSON_ENABLED,
} from "@sports/prediction-engine/src/experimental/1905-03628v1-nested-poisson-totals.js";
import {
  cfovFeatures,
  timeOrderedEval,
  ENABLED as CFOV_ENABLED,
  type CFOV,
  type PlayerGame,
} from "@sports/prediction-engine/src/experimental/1804-04226v1-cfov-decomposition.js";
import {
  resiliencyRegression,
  scarceLiquidityFlag,
  steamSignal,
  volumeBuckets,
  ENABLED as ORDER_FLOW_ENABLED,
  type FlowBucket,
  type ResiliencyFit,
  type Trade,
} from "@sports/prediction-engine/src/experimental/1708-02715v1-order-flow-resiliency.js";

export type ExpEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ExpEval<never> {
  return { ok: false, reason };
}

/**
 * Provenance of a result with respect to its source module's own gate.
 *
 * `gateEvaluated: false` means the source module carries an acceptance gate
 * that has NOT been run on real data. Such a result is a diagnostic reading,
 * never an accepted production signal, and callers must not persist it as one.
 */
export interface ExpGateStatus {
  /** The source module's own `ENABLED` constant, read at call time. Never written here. */
  readonly moduleEnabled: boolean;
  /** True only when the source module carries no unevaluated acceptance gate. */
  readonly gateEvaluated: boolean;
  /** Why this is the status, quoting the module's own documented gate. */
  readonly note: string;
}

/** 1805-01271v1-its-break-harness — acceptance gate NOT run here. */
export const ITS_GATE: ExpGateStatus = {
  moduleEnabled: ITS_ENABLED,
  gateEvaluated: false,
  note:
    "1805-01271v1-its-break-harness exports ENABLED=false. Its acceptance gate " +
    "(detect the 2011 CBA regime break at p<0.05 on the trend term without " +
    "flagging spurious breaks in 2012-2019) has not been run on real backtest " +
    "residuals here. Diagnostic only.",
};

/** 1905-03628v1-nested-poisson-totals — docstring says gate NOT EVALUATED. */
export const POISSON_GATE: ExpGateStatus = {
  moduleEnabled: POISSON_ENABLED,
  gateEvaluated: false,
  note:
    "1905-03628v1-nested-poisson-totals exports ENABLED=false and states " +
    "'Gate status: NOT EVALUATED' — it needs historical walk-forward data not " +
    "available here. Diagnostic only.",
};

/** 1804-04226v1-cfov-decomposition — acceptance gate NOT run here. */
export const CFOV_GATE: ExpGateStatus = {
  moduleEnabled: CFOV_ENABLED,
  gateEvaluated: false,
  note:
    "1804-04226v1-cfov-decomposition exports ENABLED=false. Its acceptance gate " +
    "(>=3pp accuracy or >=0.01 log-loss gain over the career-average baseline " +
    "under strictly time-ordered evaluation) has not been run on real prop data " +
    "here. Diagnostic only.",
};

/** 1708-02715v1-order-flow-resiliency — docstring says gate NOT EVALUATED. */
export const ORDER_FLOW_GATE: ExpGateStatus = {
  moduleEnabled: ORDER_FLOW_ENABLED,
  gateEvaluated: false,
  note:
    "1708-02715v1-order-flow-resiliency exports ENABLED=false and states " +
    "'Gate status: NOT EVALUATED' — the ADAPT gate needs historical " +
    "prediction-market order-flow data not available here. Diagnostic only.",
};

/** effective-breadth and ashap-aggregate carry no ENABLED gate and no acceptance gate. */
export const UNGATED: ExpGateStatus = {
  moduleEnabled: true,
  gateEvaluated: true,
  note:
    "Source module exports no ENABLED constant and documents no acceptance gate; " +
    "the functions are closed-form arithmetic over the caller's own rows.",
};

// ─── small validation helpers ────────────────────────────────────────────────

function finiteAll(xs: readonly number[]): boolean {
  for (const v of xs) if (!Number.isFinite(v)) return false;
  return true;
}

function integerAll(xs: readonly number[]): boolean {
  for (const v of xs) if (!Number.isInteger(v)) return false;
  return true;
}

function distinctCount(xs: readonly number[]): number {
  return new Set(xs).size;
}

function flatten(rows: readonly (readonly number[])[]): number[] {
  const out: number[] = [];
  for (const r of rows) for (const v of r) out.push(v);
  return out;
}

// ─── effective-breadth ───────────────────────────────────────────────────────

export interface EffectiveBreadthResult {
  readonly normalized: readonly number[];
  readonly effectiveBreadth: number;
  readonly entropyBreadth: number;
  readonly isTopHeavy: boolean;
  readonly nominalSize: number;
  readonly topHeavyFrac: number;
  readonly gate: ExpGateStatus;
}

/**
 * Effective breadth (1 / sum p^2) and entropy breadth (exp(H)) of a weight
 * vector, plus the top-heaviness flag. Both breadths are documented to live in
 * [1, n]; anything outside that band is a bug upstream, not a result to return.
 */
export function evalEffectiveBreadth(input: {
  readonly probs: readonly number[];
  readonly topHeavyFrac?: number;
}): ExpEval<EffectiveBreadthResult> {
  const { probs, topHeavyFrac } = input;
  if (!Array.isArray(probs) || probs.length === 0) return fail("probs must be non-empty");
  if (!finiteAll(probs)) return fail("probs must all be finite");
  // normalize() clamps negatives to 0 but sums the RAW values, so a negative
  // entry silently produces a normalized vector that does not sum to 1. Refuse.
  if (probs.some((v) => v < 0)) return fail("probs must be non-negative (normalize() clamps negatives but sums raw values)");
  if (!probs.some((v) => v > 0)) return fail("probs must carry positive total mass");
  const n = probs.length;
  if (n > 4096) return fail("probs length must be <= 4096");
  const frac = topHeavyFrac ?? 0.4;
  if (!Number.isFinite(frac) || frac <= 0 || frac >= 1) {
    return fail("topHeavyFrac must be a finite number in (0, 1)");
  }
  try {
    const normalized = normalize([...probs]);
    if (normalized.length !== n || !finiteAll(normalized)) {
      return fail("normalize produced a non-finite or wrong-length vector");
    }
    const sum = normalized.reduce((s, v) => s + v, 0);
    if (Math.abs(sum - 1) > 1e-9) {
      return fail(`normalize did not produce a unit-sum vector (sum=${sum})`);
    }
    const eb = effectiveBreadth([...probs]);
    const hb = entropyBreadth([...probs]);
    if (!Number.isFinite(eb) || !Number.isFinite(hb)) {
      return fail("breadth produced a non-finite value");
    }
    if (eb < 1 - 1e-9 || eb > n + 1e-9) {
      return fail(`effectiveBreadth ${eb} outside its documented bound [1, ${n}]`);
    }
    if (hb < 1 - 1e-9 || hb > n + 1e-9) {
      return fail(`entropyBreadth ${hb} outside its documented bound [1, ${n}]`);
    }
    return {
      ok: true,
      data: {
        normalized,
        effectiveBreadth: eb,
        entropyBreadth: hb,
        isTopHeavy: isTopHeavy([...probs], frac),
        nominalSize: n,
        topHeavyFrac: frac,
        gate: UNGATED,
      },
    };
  } catch (e) {
    return fail(`effective breadth threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── ashap-aggregate ─────────────────────────────────────────────────────────

export interface AshapResult {
  readonly groups: readonly GroupContribution[];
  readonly topK: readonly number[];
  readonly k: number;
  readonly nRows: number;
  readonly nFeatures: number;
  readonly gate: ExpGateStatus;
}

/**
 * Aggregate per-play SHAP rows into per-group aSHAP contributions and take the
 * top-k feature indices by mean |SHAP| for the whole matrix.
 */
export function evalAshapAggregate(input: {
  readonly shap: readonly (readonly number[])[];
  readonly groupOf: readonly number[];
  readonly k?: number;
}): ExpEval<AshapResult> {
  const { shap, groupOf, k } = input;
  if (!Array.isArray(shap) || shap.length === 0) return fail("shap must be non-empty");
  if (!Array.isArray(groupOf) || groupOf.length !== shap.length) {
    return fail("shap rows and group labels must align");
  }
  if (shap.length > 100000) return fail("shap row count must be <= 100000");
  const cols = shap[0]?.length ?? 0;
  if (cols === 0) return fail("shap rows must have at least one feature column");
  for (const row of shap) {
    if (!Array.isArray(row) || row.length !== cols) return fail("shap rows must be rectangular");
  }
  if (!finiteAll(flatten(shap))) return fail("shap values must be finite");
  if (!integerAll(groupOf)) return fail("group labels must be integers");
  const kk = k ?? 3;
  if (!Number.isInteger(kk) || kk < 0 || kk > cols) {
    return fail(`k must be an integer in [0, ${cols}]`);
  }
  try {
    const groups = aggregateShap(
      shap.map((r) => [...r]),
      [...groupOf],
    );
    if (groups.length === 0) return fail("aggregateShap produced no groups");
    for (const g of groups) {
      if (!Number.isFinite(g.meanAbs) || !Number.isFinite(g.meanSigned) || g.n <= 0) {
        return fail("aggregateShap produced a non-finite or empty group row");
      }
    }
    const topK = topKFeatures(
      shap.map((r) => [...r]),
      kk,
    );
    if (topK.length !== kk) return fail(`topKFeatures returned ${topK.length} of ${kk} indices`);
    for (const j of topK) {
      if (!Number.isInteger(j) || j < 0 || j >= cols) {
        return fail("topKFeatures returned an out-of-range feature index");
      }
    }
    return {
      ok: true,
      data: { groups, topK, k: kk, nRows: shap.length, nFeatures: cols, gate: UNGATED },
    };
  } catch (e) {
    return fail(`ashap aggregate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface AshapStabilityResult {
  readonly stability: number;
  readonly teams: number;
  readonly bootstrapsPerTeam: readonly number[];
  readonly gate: ExpGateStatus;
}

/**
 * aSHAP stability gate input: the fraction of teams whose top-k feature set is
 * unchanged in >=80% of their bootstraps. The module's own adoption threshold is
 * 0.80; it is reported here, never applied.
 */
export function evalAshapStability(input: {
  readonly topKPerTeamPerBootstrap: ReadonlyArray<ReadonlyArray<readonly number[]>>;
}): ExpEval<AshapStabilityResult> {
  const { topKPerTeamPerBootstrap } = input;
  if (!Array.isArray(topKPerTeamPerBootstrap) || topKPerTeamPerBootstrap.length === 0) {
    return fail("topKPerTeamPerBootstrap must be non-empty");
  }
  const perTeam: number[] = [];
  for (const boots of topKPerTeamPerBootstrap) {
    if (!Array.isArray(boots)) return fail("each team entry must be an array of bootstrap top-k sets");
    perTeam.push(boots.length);
    for (const set of boots) {
      if (!Array.isArray(set) || !integerAll(set)) {
        return fail("each bootstrap top-k set must be an array of integers");
      }
    }
  }
  try {
    const stability = ashapStability(
      topKPerTeamPerBootstrap.map((boots) => boots.map((s: readonly number[]) => [...s])),
    );
    if (!Number.isFinite(stability) || stability < 0 || stability > 1) {
      return fail(`stability ${stability} outside [0, 1]`);
    }
    return {
      ok: true,
      data: {
        stability,
        teams: topKPerTeamPerBootstrap.length,
        bootstrapsPerTeam: perTeam,
        gate: UNGATED,
      },
    };
  } catch (e) {
    return fail(`ashap stability threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 1805-01271v1 interrupted-time-series break harness ──────────────────────

export interface ItsFitResult {
  readonly fit: ITSFit;
  readonly breakPoint: number;
  readonly levelShiftBeta: number;
  readonly trendBreakBeta: number;
  readonly gate: ExpGateStatus;
}

function validateCounts(counts: readonly number[], min: number): string | null {
  if (!Array.isArray(counts) || counts.length < min) {
    return `counts must be an array of at least ${min} observations`;
  }
  if (!finiteAll(counts)) return "counts must all be finite";
  if (!integerAll(counts)) return "counts must be integers";
  if (counts.some((v) => v < 0)) return "counts must be non-negative";
  if (new Set(counts).size < 2) return "counts carry no spread (a single repeated value cannot be fitted)";
  return null;
}

function validateFit(fit: ITSFit): string | null {
  if (!Array.isArray(fit.beta) || fit.beta.length !== 4) return "ITS fit returned a wrong-length beta vector";
  if (!finiteAll(fit.beta)) return "ITS fit returned non-finite coefficients";
  if (!Array.isArray(fit.se) || fit.se.length !== 4 || !finiteAll(fit.se)) {
    return "ITS fit returned a non-finite standard error vector";
  }
  if (fit.se.some((v) => v < 0)) return "ITS fit returned a negative standard error";
  if (!(fit.pLevel >= 0 && fit.pLevel <= 1)) return "ITS level p-value outside [0, 1]";
  if (!(fit.pTrend >= 0 && fit.pTrend <= 1)) return "ITS trend p-value outside [0, 1]";
  return null;
}

/** Standard normal CDF exposed through the harness's own erf implementation. */
export function evalNormalCdf(input: { readonly x: number }): ExpEval<{ readonly cdf: number }> {
  const { x } = input;
  if (typeof x !== "number" || !Number.isFinite(x)) return fail("x must be a finite number");
  try {
    const cdf = normalCdf(x);
    if (!Number.isFinite(cdf) || cdf < 0 || cdf > 1) return fail(`normalCdf returned ${cdf}, outside [0, 1]`);
    return { ok: true, data: { cdf } };
  } catch (e) {
    return fail(`normalCdf threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Fit the interrupted time-series Poisson model
 * log(mu_t) = b0 + b1*t + b2*D + b3*(t - t0) at one break point and read the two
 * Wald tests (level shift, trend break).
 */
export function evalItsFit(input: {
  readonly counts: readonly number[];
  readonly breakPoint: number;
}): ExpEval<ItsFitResult> {
  const { counts, breakPoint } = input;
  const bad = validateCounts(counts, 8);
  if (bad) return fail(bad);
  if (!Number.isInteger(breakPoint)) return fail("breakPoint must be an integer index");
  if (breakPoint < 2 || breakPoint > counts.length - 2) {
    return fail("breakPoint must leave at least two observations on each side");
  }
  try {
    const fit = fitITSPoisson([...counts], breakPoint);
    const badFit = validateFit(fit);
    if (badFit) return fail(badFit);
    return {
      ok: true,
      data: {
        fit,
        breakPoint,
        levelShiftBeta: fit.beta[2] ?? Number.NaN,
        trendBreakBeta: fit.beta[3] ?? Number.NaN,
        gate: ITS_GATE,
      },
    };
  } catch (e) {
    return fail(`fitITSPoisson threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface ItsScanResult {
  readonly scans: readonly BreakScan[];
  readonly trueBreak: number;
  readonly trueBreakTrendP: number;
  readonly trueBreakLevelP: number;
  readonly placeboTrendPs: readonly number[];
  readonly placeboLevelPs: readonly number[];
  readonly minTrendPScanPoint: number;
  /** Verbatim module gate: ADOPT only if the true break rejects and no placebo does. */
  readonly verdict: "ADOPT" | "REJECT";
  readonly gate: ExpGateStatus;
}

/**
 * Scan candidate break points and apply the module's own adoption gate: the true
 * intervention's TREND test must reject at p<0.05 while every placebo break fails
 * to reject. The verdict is reported, never acted on.
 */
export function evalItsBreakScan(input: {
  readonly counts: readonly number[];
  readonly candidates: readonly number[];
  readonly trueBreak: number;
}): ExpEval<ItsScanResult> {
  const { counts, candidates, trueBreak } = input;
  const bad = validateCounts(counts, 8);
  if (bad) return fail(bad);
  if (!Array.isArray(candidates) || candidates.length === 0) return fail("candidates must be non-empty");
  if (candidates.length > 512) return fail("candidates must be <= 512 (each one is a full IRLS fit)");
  if (!integerAll(candidates)) return fail("candidates must be integers");
  for (const c of candidates) {
    if (c < 2 || c > counts.length - 2) {
      return fail("every candidate must leave at least two observations on each side");
    }
  }
  if (new Set(candidates).size !== candidates.length) return fail("candidates must be unique");
  if (!candidates.includes(trueBreak)) return fail("trueBreak must be one of the candidates");
  try {
    const scans = scanBreaks([...counts], [...candidates]);
    if (scans.length !== candidates.length) return fail("scanBreaks returned a different number of rows than candidates");
    for (const s of scans) {
      if (!(s.pLevel >= 0 && s.pLevel <= 1) || !(s.pTrend >= 0 && s.pTrend <= 1)) {
        return fail("scanBreaks returned a p-value outside [0, 1]");
      }
    }
    const at = scans.find((s) => s.point === trueBreak);
    if (!at) return fail("true break is missing from the scan output");
    const placebos = scans.filter((s) => s.point !== trueBreak);
    const placeboTrendPs = placebos.map((s) => s.pTrend);
    const placeboLevelPs = placebos.map((s) => s.pLevel);
    let minTrendPScanPoint = scans[0]?.point ?? trueBreak;
    let minTrendP = scans[0]?.pTrend ?? 1;
    for (const s of scans) {
      if (s.pTrend < minTrendP) {
        minTrendP = s.pTrend;
        minTrendPScanPoint = s.point;
      }
    }
    const verdict = itsGate(at.pTrend, placeboTrendPs);
    return {
      ok: true,
      data: {
        scans,
        trueBreak,
        trueBreakTrendP: at.pTrend,
        trueBreakLevelP: at.pLevel,
        placeboTrendPs,
        placeboLevelPs,
        minTrendPScanPoint,
        verdict,
        gate: ITS_GATE,
      },
    };
  } catch (e) {
    return fail(`scanBreaks threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 1905-03628v1 nested Poisson totals ──────────────────────────────────────

export interface PoissonTotalsResult {
  readonly mle: number;
  readonly dispersionRatio: number;
  readonly logLikAtMle: number;
  readonly n: number;
  readonly gate: ExpGateStatus;
}

/**
 * Poisson MLE rate, the variance/mean dispersion ratio, and the log-likelihood
 * at the fitted rate. Dispersion > 1 means the plain Poisson is under-dispersed
 * for these counts; the module's own answer to that is the INGARCH and CMP
 * forms, both reachable below.
 */
export function evalPoissonTotals(input: {
  readonly counts: readonly number[];
}): ExpEval<PoissonTotalsResult> {
  const { counts } = input;
  const bad = validateCounts(counts, 4);
  if (bad) return fail(bad);
  try {
    const ks = [...counts];
    const mle = poissonMle(ks);
    if (!Number.isFinite(mle) || mle <= 0) return fail(`Poisson MLE ${mle} is not a positive finite rate`);
    const mean = mle;
    const variance = ks.reduce((s, v) => s + (v - mean) ** 2, 0) / ks.length;
    const dispersionRatio = variance / mean;
    const logLikAtMle = poissonLogLik(ks, ks.map(() => mle));
    if (!Number.isFinite(dispersionRatio) || dispersionRatio < 0) {
      return fail("dispersion ratio is not a finite non-negative number");
    }
    if (!Number.isFinite(logLikAtMle)) return fail("Poisson log-likelihood at the MLE is not finite");
    return {
      ok: true,
      data: { mle, dispersionRatio, logLikAtMle, n: ks.length, gate: POISSON_GATE },
    };
  } catch (e) {
    return fail(`poisson totals threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface IngarchResult {
  readonly lambdas: readonly number[];
  readonly logLik: number;
  readonly omega: number;
  readonly alpha: number;
  readonly beta: number;
  readonly gate: ExpGateStatus;
}

/**
 * INGARCH(1,1) conditional-mean filter and its Poisson log-likelihood. Stationarity
 * is the caller's responsibility and is enforced here: alpha + beta must be < 1,
 * otherwise the filter diverges and the likelihood is meaningless.
 */
export function evalIngarchTotals(input: {
  readonly counts: readonly number[];
  readonly omega: number;
  readonly alpha: number;
  readonly beta: number;
  readonly lam0?: number;
}): ExpEval<IngarchResult> {
  const { counts, omega, alpha, beta, lam0 } = input;
  const bad = validateCounts(counts, 4);
  if (bad) return fail(bad);
  if (!finiteAll([omega, alpha, beta])) return fail("omega/alpha/beta must be finite");
  if (omega < 0) return fail("omega must be non-negative");
  if (alpha < 0 || beta < 0) return fail("alpha and beta must be non-negative for a count filter");
  if (alpha + beta >= 1) return fail("alpha + beta must be < 1 for the INGARCH filter to be stationary");
  if (lam0 !== undefined && (!Number.isFinite(lam0) || lam0 <= 0)) return fail("lam0 must be finite > 0");
  try {
    const ks = [...counts];
    const lambdas = ingarchFilter(ks, omega, alpha, beta, lam0);
    if (lambdas.length !== ks.length || !finiteAll(lambdas)) {
      return fail("INGARCH filter produced a non-finite or wrong-length mean path");
    }
    if (lambdas.some((l) => l < 0)) return fail("INGARCH filter produced a negative conditional mean");
    const logLik = ingarchLogLik(ks, omega, alpha, beta);
    if (!Number.isFinite(logLik)) return fail("INGARCH log-likelihood is not finite");
    return { ok: true, data: { lambdas, logLik, omega, alpha, beta, gate: POISSON_GATE } };
  } catch (e) {
    return fail(`ingarch totals threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface CmpPmfResult {
  readonly pmf: number;
  readonly k: number;
  readonly lambda: number;
  readonly nu: number;
  readonly gate: ExpGateStatus;
}

/**
 * Conway-Maxwell-Poisson PMF at one count. nu < 1 over-disperses, nu > 1
 * under-disperses, and nu = 1 must reproduce the plain Poisson exactly.
 */
export function evalCmpPmf(input: {
  readonly k: number;
  readonly lambda: number;
  readonly nu: number;
  readonly kmax?: number;
}): ExpEval<CmpPmfResult> {
  const { k, lambda, nu, kmax } = input;
  if (!Number.isInteger(k) || k < 0) return fail("k must be a non-negative integer");
  if (!Number.isFinite(lambda) || lambda <= 0) return fail("lambda must be finite > 0");
  if (!Number.isFinite(nu) || nu <= 0) return fail("nu must be finite > 0");
  if (kmax !== undefined && (!Number.isInteger(kmax) || kmax < k)) {
    return fail("kmax must be an integer >= k");
  }
  try {
    const pmf = cmpPmf(k, lambda, nu, kmax ?? 300);
    if (!Number.isFinite(pmf)) return fail("cmpPmf returned a non-finite probability");
    if (pmf < 0 || pmf > 1 + 1e-9) return fail(`cmpPmf returned ${pmf}, outside [0, 1]`);
    return { ok: true, data: { pmf, k, lambda, nu, gate: POISSON_GATE } };
  } catch (e) {
    return fail(`cmpPmf threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface NestedScoreSimResult {
  readonly fav: readonly number[];
  readonly dog: readonly number[];
  readonly favMean: number;
  readonly dogMean: number;
  readonly combinedMean: number;
  readonly n: number;
  readonly gate: ExpGateStatus;
}

/** A generous upper bound on a favorite's points, used only to bound exp(). */
const FAV_SCORE_CAP = 60;

/**
 * Nested conditional score simulation: draw the favorite's points, then draw the
 * underdog's points conditional on that realized score (garbage-time /
 * protect-the-lead mechanism). `rand` is a deterministic caller-supplied RNG in
 * [0, 1) — the sampler multiplies uniforms, so a `rand` that never returns a
 * value below 1 will not terminate.
 */
export function evalNestedScoreSim(input: {
  readonly rand: () => number;
  readonly n: number;
  readonly favLambda: number;
  readonly coef: { readonly b0: number; readonly b1: number; readonly b2: number; readonly b3: number };
  readonly oppStrength: number;
  readonly loc: number;
}): ExpEval<NestedScoreSimResult> {
  const { rand, n, favLambda, coef, oppStrength, loc } = input;
  if (typeof rand !== "function") return fail("rand must be a deterministic () => number in [0, 1)");
  if (!Number.isInteger(n)) return fail("n must be an integer");
  if (n < 100) return fail("n must be >= 100 for the simulated means to be interpretable");
  if (n > 200000) return fail("n must be <= 200000");
  if (!Number.isFinite(favLambda) || favLambda <= 0) return fail("favLambda must be finite > 0");
  if (!coef || !finiteAll([coef.b0, coef.b1, coef.b2, coef.b3])) {
    return fail("coef must carry finite b0/b1/b2/b3");
  }
  if (!Number.isFinite(oppStrength) || !Number.isFinite(loc)) {
    return fail("oppStrength and loc must be finite");
  }
  const minLogLambda = coef.b0 + coef.b1 * oppStrength + coef.b2 * loc;
  const maxLogLambda = minLogLambda + coef.b3 * FAV_SCORE_CAP;
  if (!Number.isFinite(minLogLambda) || minLogLambda <= -700) {
    return fail("exp(b0 + b1*s + b2*loc) underflows to zero; the conditional rate is not representable");
  }
  if (!Number.isFinite(maxLogLambda) || maxLogLambda > 700) {
    return fail(
      `conditional log-rate would exceed 700 even at a ${FAV_SCORE_CAP}-point favorite score; exp() overflows`,
    );
  }
  try {
    const sim = nestedScoreSim(
      rand,
      n,
      favLambda,
      { b0: coef.b0, b1: coef.b1, b2: coef.b2, b3: coef.b3 },
      oppStrength,
      loc,
    );
    if (sim.fav.length !== n || sim.dog.length !== n) {
      return fail("nestedScoreSim returned the wrong number of draws");
    }
    if (!integerAll(sim.fav) || !integerAll(sim.dog)) {
      return fail("nestedScoreSim returned a non-integer score");
    }
    if (sim.fav.some((v) => v < 0) || sim.dog.some((v) => v < 0)) {
      return fail("nestedScoreSim returned a negative score");
    }
    const favMean = sim.fav.reduce((s, v) => s + v, 0) / n;
    const dogMean = sim.dog.reduce((s, v) => s + v, 0) / n;
    if (!Number.isFinite(favMean) || !Number.isFinite(dogMean)) {
      return fail("nestedScoreSim produced a non-finite mean");
    }
    return {
      ok: true,
      data: {
        fav: sim.fav,
        dog: sim.dog,
        favMean,
        dogMean,
        combinedMean: favMean + dogMean,
        n,
        gate: POISSON_GATE,
      },
    };
  } catch (e) {
    return fail(`nestedScoreSim threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 1804-04226v1 consistency/form/opposition/venue decomposition ────────────

function validatePlayerGames(games: readonly PlayerGame[]): string | null {
  if (!Array.isArray(games) || games.length === 0) return "games must be non-empty";
  if (games.length > 2000) return "games must be <= 2000 rows";
  for (const g of games) {
    if (!g || typeof g !== "object") return "each game must be an object";
    if (typeof g.playerId !== "string" || !g.playerId) return "each game needs a non-empty playerId";
    if (typeof g.opp !== "string" || !g.opp) return "each game needs a non-empty opponent";
    if (g.venue !== "home" && g.venue !== "away" && g.venue !== "neutral") {
      return "each game needs venue home|away|neutral";
    }
    if (typeof g.success !== "boolean") return "each game needs a boolean success flag";
  }
  return null;
}

function validateCfov(f: CFOV): string | null {
  for (const [k, v] of [
    ["consistency", f.consistency],
    ["form", f.form],
    ["opposition", f.opposition],
    ["venue", f.venue],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0 || v >= 1) {
      return `cfov ${k} (${v}) is not inside the open interval (0, 1)`;
    }
  }
  return null;
}

export interface CfovFeaturesResult {
  readonly features: CFOV;
  readonly gameIdx: number;
  readonly nPrior: number;
  readonly nForm: number;
  readonly nOpposition: number;
  readonly nVenue: number;
  readonly opponent: string;
  readonly venue: "home" | "away" | "neutral";
  readonly gate: ExpGateStatus;
}

/**
 * Consistency / Form / Opposition / Venue rates for one player at one game index,
 * computed strictly from games BEFORE that index. The module falls back to the
 * career rate when the opposition or venue slice is empty; this adapter refuses
 * that silent substitution by reporting the slice sizes it actually used.
 */
export function evalCfovFeatures(input: {
  readonly games: readonly PlayerGame[];
  readonly playerId: string;
  readonly gameIdx: number;
}): ExpEval<CfovFeaturesResult> {
  const { games, playerId, gameIdx } = input;
  const bad = validatePlayerGames(games);
  if (bad) return fail(bad);
  if (typeof playerId !== "string" || !playerId) return fail("playerId must be a non-empty string");
  if (!Number.isInteger(gameIdx) || gameIdx < 1 || gameIdx >= games.length) {
    return fail("gameIdx must be an integer index inside the series (at least one prior game)");
  }
  const prior = games.filter((g, i) => i < gameIdx && g.playerId === playerId);
  if (prior.length === 0) {
    return fail("no prior games for this player before gameIdx; every C/F/O/V rate would be the bare 0.5 prior");
  }
  const cur = games[gameIdx];
  if (!cur) return fail("gameIdx is out of range");
  if (cur.playerId !== playerId) {
    return fail("the game at gameIdx does not belong to playerId");
  }
  try {
    const features = cfovFeatures(games.map((g) => ({ ...g })), playerId, gameIdx);
    const badCfov = validateCfov(features);
    if (badCfov) return fail(badCfov);
    const nOpposition = prior.filter((g) => g.opp === cur.opp).length;
    const nVenue = prior.filter((g) => g.venue === cur.venue).length;
    return {
      ok: true,
      data: {
        features,
        gameIdx,
        nPrior: prior.length,
        nForm: Math.min(4, prior.length),
        nOpposition,
        nVenue,
        opponent: cur.opp,
        venue: cur.venue,
        gate: CFOV_GATE,
      },
    };
  } catch (e) {
    return fail(`cfovFeatures threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface CfovTimeOrderedResult {
  readonly cfovLogLoss: number;
  readonly baselineLogLoss: number;
  /** baseline - cfov: positive means the C/F/O/V model beat the career-rate baseline. */
  readonly logLossImprovement: number;
  readonly weights: readonly number[];
  readonly evaluatedRows: number;
  readonly burnIn: number;
  readonly gate: ExpGateStatus;
}

/**
 * Strictly time-ordered C/F/O/V evaluation: at each t the weights are refit on
 * games < t and game t is predicted; the baseline is the smoothed career rate.
 * The module's adoption gate is a >=0.01 log-loss gain; the gain is reported, the
 * gate is never applied.
 */
export function evalCfovTimeOrdered(input: {
  readonly games: readonly PlayerGame[];
  readonly burnIn?: number;
}): ExpEval<CfovTimeOrderedResult> {
  const { games, burnIn } = input;
  const bad = validatePlayerGames(games);
  if (bad) return fail(bad);
  // The evaluation refits a logistic model at every step; a long series is
  // quadratic work, so the adapter bounds the input rather than hanging a worker.
  if (games.length > 400) return fail("games must be <= 400 rows (time-ordered eval refits at every step)");
  const b = burnIn ?? 12;
  if (!Number.isInteger(b) || b < 4) return fail("burnIn must be an integer >= 4");
  if (b >= games.length - 7) {
    return fail("burnIn must leave at least 8 evaluated games after the warm-up");
  }
  const successes = games.filter((g) => g.success).length;
  if (successes < 2 || successes > games.length - 2) {
    return fail("games must contain at least 2 successes and 2 failures or the fit is degenerate");
  }
  try {
    const ev = timeOrderedEval(games.map((g) => ({ ...g })), b);
    if (!Number.isFinite(ev.cfovLogLoss) || ev.cfovLogLoss <= 0) {
      return fail("C/F/O/V log-loss is not a finite positive number");
    }
    if (!Number.isFinite(ev.baselineLogLoss) || ev.baselineLogLoss <= 0) {
      return fail("baseline log-loss is not a finite positive number");
    }
    if (!Array.isArray(ev.weights) || ev.weights.length !== 5 || !finiteAll(ev.weights)) {
      return fail("C/F/O/V fit returned a malformed weight vector (expected intercept + 4 coefficients)");
    }
    return {
      ok: true,
      data: {
        cfovLogLoss: ev.cfovLogLoss,
        baselineLogLoss: ev.baselineLogLoss,
        logLossImprovement: ev.baselineLogLoss - ev.cfovLogLoss,
        weights: ev.weights,
        evaluatedRows: games.length - b,
        burnIn: b,
        gate: CFOV_GATE,
      },
    };
  } catch (e) {
    return fail(`timeOrderedEval threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 1708-02715v1 order-flow resiliency ──────────────────────────────────────

function validateTrades(trades: readonly Trade[]): string | null {
  if (!Array.isArray(trades) || trades.length === 0) return "trades must be non-empty";
  if (trades.length > 200000) return "trades must be <= 200000 rows";
  for (const t of trades) {
    if (!t || typeof t !== "object") return "each trade must be an object";
    if (t.side !== "buy" && t.side !== "sell") return "each trade side must be buy|sell";
    if (t.kind !== "taker" && t.kind !== "maker-add" && t.kind !== "maker-cancel") {
      return "each trade kind must be taker|maker-add|maker-cancel";
    }
    if (!Number.isFinite(t.size) || t.size <= 0) return "each trade size must be finite > 0";
    if (!Number.isFinite(t.price) || t.price <= 0 || t.price > 1) {
      return "each trade price must be a probability in (0, 1]";
    }
  }
  return null;
}

function validateBuckets(buckets: readonly FlowBucket[], min: number): string | null {
  if (!Array.isArray(buckets) || buckets.length < min) {
    return `flow buckets must be an array of at least ${min} entries`;
  }
  for (const b of buckets) {
    if (!b || typeof b !== "object") return "each flow bucket must be an object";
    if (!finiteAll([b.takerImbalance, b.makerNetFlow, b.priceChange, b.volume])) {
      return "each flow bucket needs finite takerImbalance/makerNetFlow/priceChange/volume";
    }
    if (b.volume <= 0) return "each flow bucket must carry positive volume";
  }
  return null;
}

export interface VolumeBucketsResult {
  readonly buckets: readonly FlowBucket[];
  readonly totalVolume: number;
  readonly totalTrades: number;
  readonly gate: ExpGateStatus;
}

/** Meso-scale volume buckets: fixed contracts-traded, not time bars. */
export function evalVolumeBuckets(input: {
  readonly trades: readonly Trade[];
  readonly contractsPerBucket: number;
}): ExpEval<VolumeBucketsResult> {
  const { trades, contractsPerBucket } = input;
  const bad = validateTrades(trades);
  if (bad) return fail(bad);
  if (!Number.isInteger(contractsPerBucket) || contractsPerBucket <= 0) {
    return fail("contractsPerBucket must be a positive integer");
  }
  const totalVolume = trades.reduce((s, t) => s + t.size, 0);
  if (totalVolume < contractsPerBucket) {
    return fail(
      `total volume ${totalVolume} never reaches contractsPerBucket ${contractsPerBucket}; no bucket forms`,
    );
  }
  try {
    const buckets = volumeBuckets(trades.map((t) => ({ ...t })), contractsPerBucket);
    const badBuckets = validateBuckets(buckets, 1);
    if (badBuckets) return fail(badBuckets);
    const bucketed = buckets.reduce((s, b) => s + b.volume, 0);
    if (bucketed > totalVolume + 1e-9) return fail("bucketed volume exceeds total traded volume");
    return {
      ok: true,
      data: { buckets, totalVolume, totalTrades: trades.length, gate: ORDER_FLOW_GATE },
    };
  } catch (e) {
    return fail(`volumeBuckets threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function validateResiliencyFit(fit: ResiliencyFit): string | null {
  if (!finiteAll([fit.intercept, fit.betaTaker, fit.betaMaker, fit.rSquared, fit.residSd])) {
    return "resiliency fit returned a non-finite coefficient or statistic";
  }
  if (fit.rSquared < -1 - 1e-9 || fit.rSquared > 1 + 1e-9) {
    return `resiliency rSquared ${fit.rSquared} outside [-1, 1]`;
  }
  if (fit.residSd < 0) return "resiliency residual SD is negative";
  return null;
}

export interface ResiliencyResult {
  readonly fit: ResiliencyFit;
  readonly gate: ExpGateStatus;
}

/**
 * OLS of per-bucket price change on taker imbalance + maker net flow, i.e. how
 * much of the move maker flow explains against taker flow. A design with no
 * spread in either regressor is singular and is refused before it can return
 * infinite betas.
 */
export function evalResiliencyRegression(input: {
  readonly buckets: readonly FlowBucket[];
}): ExpEval<ResiliencyResult> {
  const { buckets } = input;
  const bad = validateBuckets(buckets, 4);
  if (bad) return fail(bad);
  if (distinctCount(buckets.map((b) => b.takerImbalance)) < 2) {
    return fail("taker imbalance carries no spread; the regression design is singular");
  }
  if (distinctCount(buckets.map((b) => b.makerNetFlow)) < 2) {
    return fail("maker net flow carries no spread; the regression design is singular");
  }
  if (distinctCount(buckets.map((b) => b.priceChange)) < 2) {
    return fail("price change carries no spread; r-squared is undefined");
  }
  try {
    const fit = resiliencyRegression(buckets.map((b) => ({ ...b })));
    const badFit = validateResiliencyFit(fit);
    if (badFit) return fail(badFit);
    if (fit.n !== buckets.length) return fail("resiliency fit reported a different row count than the buckets");
    return { ok: true, data: { fit, gate: ORDER_FLOW_GATE } };
  } catch (e) {
    return fail(`resiliencyRegression threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface SteamResult {
  readonly steam: boolean;
  readonly lookback: number;
  readonly gate: ExpGateStatus;
}

/**
 * Hockey-stick steam detector: one-sided taker flow over the lookback while maker
 * net flow on the active side is negative (cancellations dominate).
 */
export function evalSteamSignal(input: {
  readonly buckets: readonly FlowBucket[];
  readonly lookback?: number;
}): ExpEval<SteamResult> {
  const { buckets, lookback } = input;
  const bad = validateBuckets(buckets, 1);
  if (bad) return fail(bad);
  const lb = lookback ?? 3;
  if (!Number.isInteger(lb) || lb < 1) return fail("lookback must be an integer >= 1");
  if (lb > buckets.length) return fail("lookback cannot exceed the number of flow buckets");
  try {
    const steam = steamSignal(buckets.map((b) => ({ ...b })), lb);
    return { ok: true, data: { steam, lookback: lb, gate: ORDER_FLOW_GATE } };
  } catch (e) {
    return fail(`steamSignal threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface ScarceLiquidityResult {
  readonly flag: boolean;
  readonly index: number;
  readonly predicted: number;
  readonly residual: number;
  readonly residSd: number;
  readonly thresholdSd: number;
  readonly gate: ExpGateStatus;
}

/**
 * Residual-based scarce-liquidity flag at one bucket: a price move more than
 * `thresholdSd` residual standard deviations away from what the order flow
 * explains marks a do-not-bet-into regime. The fit is recomputed here on the same
 * buckets so the reported threshold is the one that was actually applied.
 */
export function evalScarceLiquidity(input: {
  readonly buckets: readonly FlowBucket[];
  readonly index: number;
  readonly thresholdSd?: number;
}): ExpEval<ScarceLiquidityResult> {
  const { buckets, index, thresholdSd } = input;
  const bad = validateBuckets(buckets, 4);
  if (bad) return fail(bad);
  if (distinctCount(buckets.map((b) => b.takerImbalance)) < 2) {
    return fail("taker imbalance carries no spread; the regression design is singular");
  }
  if (distinctCount(buckets.map((b) => b.makerNetFlow)) < 2) {
    return fail("maker net flow carries no spread; the regression design is singular");
  }
  if (!Number.isInteger(index) || index < 0 || index >= buckets.length) {
    return fail("index must be an integer position inside the bucket array");
  }
  const sd = thresholdSd ?? 1.5;
  if (!Number.isFinite(sd) || sd <= 0) return fail("thresholdSd must be finite > 0");
  const target = buckets[index];
  if (!target) return fail("index is out of range");
  try {
    const fit = resiliencyRegression(buckets.map((b) => ({ ...b })));
    const badFit = validateResiliencyFit(fit);
    if (badFit) return fail(badFit);
    const predicted = fit.intercept + fit.betaTaker * target.takerImbalance + fit.betaMaker * target.makerNetFlow;
    if (!Number.isFinite(predicted)) return fail("predicted price change is not finite");
    const residual = Math.abs(target.priceChange - predicted);
    const flag = scarceLiquidityFlag(buckets.map((b) => ({ ...b })), index, fit, sd);
    return {
      ok: true,
      data: { flag, index, predicted, residual, residSd: fit.residSd, thresholdSd: sd, gate: ORDER_FLOW_GATE },
    };
  } catch (e) {
    return fail(`scarceLiquidityFlag threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}
