/**
 * SymReg + Conformal + Promotion + Metalearning-kernel + Certificate residue bridge.
 *
 * Wires the remaining pure computation modules into the live evaluation surface:
 *   - AI Feynman Pareto pruning + hypothesis-testing rejection + vertical SR filters
 *   - DGSR-lite staged/hill-climb numeric refinement
 *   - SINDy-SI sparse dynamics + side-information verification
 *   - Sports taxonomy Mondrian categories
 *   - LWT/MCPS greedy partition sketch
 *   - Acklam normal quantile / alpha-aware z critical value
 *   - MetaVRF kernel helpers (RBF GP, RFF features, KRR)
 *   - Gate-candidate -> DecisionCertificate bridge
 *
 * Fail-closed on missing inputs. Never invents a frontier, a partition,
 * a quantile, or a certificate.
 */

import {
  paretoFrontier,
  skeletonJaccard,
  pairedPvalue,
  hypothesisReject,
  verticalFilter,
  type ParetoPoint,
} from "@sports/prediction-engine";
import {
  nmse,
  hillClimbRefine,
  stagedRefine,
} from "@sports/prediction-engine";
import {
  leastSquaresActive,
  stlsq,
  verifySideInfo,
  dropIntercept,
} from "@sports/prediction-engine";
import {
  restBucket,
  tier1Categories,
  tier2Intersections,
  assignMondrianCategory,
  parentCategory,
  summarizeCategoryDiagnostics,
  type SportsGameContext,
  type RestBucket,
} from "@sports/prediction-engine";
import {
  bestSplit,
  assignLeafId,
  greedyPartition,
  ROOT_LEAF_ID,
  UNMATCHED_LEAF_ID,
  type PartitionSample,
  type LeafDefinition,
  type LeafPathStep,
  type SplitCandidate,
} from "@sports/prediction-engine";
import {
  standardNormalQuantile,
  zCritOneSided,
} from "@sports/prediction-engine";
import {
  rbfKernelGp,
  rffFeatures,
  krrFit,
} from "@sports/prediction-engine";
import {
  certificateFromGateCandidate,
  type GateCandidateView,
} from "@sports/prediction-engine";

export type ResidueEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ResidueEval<never> {
  return { ok: false, reason };
}

// ─── AI Feynman Pareto pruning + hypothesis rejection ─────────────────────────

export interface ParetoPruneResult {
  readonly frontier: readonly ParetoPoint[];
  readonly rejected: readonly string[];
}

/**
 * Prune a hall-of-fame to its Pareto frontier (min error, min complexity)
 * and reject candidates that are not significantly better than baseline
 * under a paired test. Fail-closed on empty/mismatched arrays.
 */
export function evalParetoPrune(input: {
  readonly points: readonly ParetoPoint[];
  readonly candidateErr: readonly number[];
  readonly baselineErr: readonly number[];
  readonly alpha?: number;
}): ResidueEval<ParetoPruneResult> {
  const { points, candidateErr, baselineErr, alpha } = input;
  if (!Array.isArray(points) || points.length === 0) {
    return fail("points must be non-empty");
  }
  if (!Array.isArray(candidateErr) || !Array.isArray(baselineErr)) {
    return fail("candidateErr/baselineErr must be arrays");
  }
  if (candidateErr.length === 0 || candidateErr.length !== baselineErr.length) {
    return fail("candidateErr and baselineErr must be non-empty and equal length");
  }
  for (const p of points) {
    if (!Number.isFinite(p.error) || !Number.isFinite(p.complexity) || !p.id) {
      return fail("every point needs finite error/complexity and an id");
    }
  }
  for (const v of [...candidateErr, ...baselineErr]) {
    if (!Number.isFinite(v)) return fail("errors must be finite");
  }
  try {
    const frontier = paretoFrontier([...points]);
    const rejected = points
      .filter((p) => !frontier.some((f) => f.id === p.id))
      .map((p) => p.id);
    // Hypothesis-testing rejection of the candidate set vs baseline
    const rejectAll = hypothesisReject([...candidateErr], [...baselineErr], alpha ?? 0.05);
    return {
      ok: true,
      data: {
        frontier,
        rejected: rejectAll ? [...rejected, "*"] : rejected,
      },
    };
  } catch (e) {
    return fail(`pareto prune threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Jaccard similarity of two equation-skeleton sets (clean vs noise-corrupted).
 * The AI Feynman acceptance gate is Jaccard >= 0.5.
 */
export function evalSkeletonJaccard(input: {
  readonly clean: readonly string[];
  readonly noisy: readonly string[];
}): ResidueEval<{ readonly jaccard: number; readonly passesGate: boolean }> {
  const { clean, noisy } = input;
  if (!Array.isArray(clean) || !Array.isArray(noisy)) {
    return fail("clean/noisy must be arrays");
  }
  if (clean.length === 0 || noisy.length === 0) {
    return fail("clean/noisy must be non-empty");
  }
  try {
    const jaccard = skeletonJaccard(new Set(clean), new Set(noisy));
    return { ok: true, data: { jaccard, passesGate: jaccard >= 0.5 } };
  } catch (e) {
    return fail(`skeleton jaccard threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Paired p-value for candidate vs baseline error vectors.
 */
export function evalPairedPvalue(input: {
  readonly a: readonly number[];
  readonly b: readonly number[];
}): ResidueEval<{ readonly pvalue: number }> {
  const { a, b } = input;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return fail("a/b must be non-empty equal-length arrays");
  }
  for (const v of [...a, ...b]) {
    if (!Number.isFinite(v)) return fail("values must be finite");
  }
  try {
    return { ok: true, data: { pvalue: pairedPvalue([...a], [...b]) } };
  } catch (e) {
    return fail(`paired pvalue threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Vertical SR staging: keep only hall-of-fame entries whose features
 * are inside the allowed subset for this round.
 */
export function evalVerticalFilter(input: {
  readonly hof: readonly { expr: string; features: readonly string[]; error: number }[];
  readonly allowed: readonly string[];
}): ResidueEval<{ readonly kept: readonly { expr: string; features: string[]; error: number }[]; readonly dropped: number }> {
  const { hof, allowed } = input;
  if (!Array.isArray(hof) || hof.length === 0) return fail("hof must be non-empty");
  if (!Array.isArray(allowed) || allowed.length === 0) return fail("allowed must be non-empty");
  for (const e of hof) {
    if (!e.expr || !Array.isArray(e.features) || !Number.isFinite(e.error)) {
      return fail("each hof entry needs expr, features[], finite error");
    }
  }
  try {
    const kept = verticalFilter(
      hof.map((e) => ({ expr: e.expr, features: [...e.features], error: e.error })),
      new Set(allowed),
    );
    return { ok: true, data: { kept, dropped: hof.length - kept.length } };
  } catch (e) {
    return fail(`vertical filter threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── DGSR-lite staged refinement ──────────────────────────────────────────────

export interface RefineResult {
  readonly params: readonly number[];
  readonly loss: number;
}

/**
 * Normalized MSE of a prediction against targets.
 */
export function evalNmse(input: {
  readonly y: readonly number[];
  readonly pred: readonly number[];
}): ResidueEval<{ readonly nmse: number }> {
  const { y, pred } = input;
  if (!Array.isArray(y) || !Array.isArray(pred) || y.length === 0 || y.length !== pred.length) {
    return fail("y/pred must be non-empty equal-length arrays");
  }
  for (const v of [...y, ...pred]) {
    if (!Number.isFinite(v)) return fail("values must be finite");
  }
  try {
    return { ok: true, data: { nmse: nmse([...y], [...pred]) } };
  } catch (e) {
    return fail(`nmse threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Staged refinement: hill-climb on denoised loss, then raw loss.
 * Deterministic seedable RNG via caller-provided `rand`.
 */
export function evalStagedRefine(input: {
  readonly lossDenoised: (p: number[]) => number;
  readonly lossRaw: (p: number[]) => number;
  readonly init: readonly number[];
  readonly rand: () => number;
}): ResidueEval<RefineResult> {
  const { lossDenoised, lossRaw, init, rand } = input;
  if (typeof lossDenoised !== "function" || typeof lossRaw !== "function") {
    return fail("lossDenoised/lossRaw must be functions");
  }
  if (!Array.isArray(init) || init.length === 0) return fail("init must be non-empty");
  if (typeof rand !== "function") return fail("rand must be a function");
  for (const v of init) {
    if (!Number.isFinite(v)) return fail("init must be finite");
  }
  try {
    const r = stagedRefine(lossDenoised, lossRaw, [...init], rand);
    if (!Number.isFinite(r.loss)) return fail("refine produced non-finite loss");
    return { ok: true, data: { params: r.params, loss: r.loss } };
  } catch (e) {
    return fail(`staged refine threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Single-landscape hill climb (no staging).
 */
export function evalHillClimb(input: {
  readonly loss: (p: number[]) => number;
  readonly init: readonly number[];
  readonly rand: () => number;
  readonly steps?: number;
  readonly stepSize?: number;
  readonly restarts?: number;
}): ResidueEval<RefineResult> {
  const { loss, init, rand, steps, stepSize, restarts } = input;
  if (typeof loss !== "function") return fail("loss must be a function");
  if (!Array.isArray(init) || init.length === 0) return fail("init must be non-empty");
  if (typeof rand !== "function") return fail("rand must be a function");
  for (const v of init) {
    if (!Number.isFinite(v)) return fail("init must be finite");
  }
  try {
    const r = hillClimbRefine(
      loss,
      [...init],
      rand,
      steps ?? 40,
      stepSize ?? 0.2,
      restarts ?? 3,
    );
    if (!Number.isFinite(r.loss)) return fail("hill climb produced non-finite loss");
    return { ok: true, data: { params: r.params, loss: r.loss } };
  } catch (e) {
    return fail(`hill climb threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── SINDy-SI sparse dynamics + side information ──────────────────────────────

/**
 * Sequentially thresholded least squares over a library Theta.
 */
export function evalStlsq(input: {
  readonly theta: readonly (readonly number[])[];
  readonly dxdt: readonly number[];
  readonly lambda: number;
  readonly iters?: number;
}): ResidueEval<{ readonly xi: readonly number[]; readonly activeCount: number }> {
  const { theta, dxdt, lambda, iters } = input;
  if (!Array.isArray(theta) || theta.length === 0) return fail("theta must be non-empty");
  if (!Array.isArray(dxdt) || dxdt.length !== theta.length) {
    return fail("dxdt length must match theta rows");
  }
  if (!Number.isFinite(lambda) || lambda < 0) return fail("lambda must be finite >= 0");
  const cols = theta[0]?.length ?? 0;
  if (cols === 0) return fail("theta rows must be non-empty");
  for (const row of theta) {
    if (row.length !== cols) return fail("theta rows must be rectangular");
    for (const v of row) {
      if (!Number.isFinite(v)) return fail("theta must be finite");
    }
  }
  for (const v of dxdt) {
    if (!Number.isFinite(v)) return fail("dxdt must be finite");
  }
  try {
    const xi = stlsq(
      theta.map((r) => [...r]),
      [...dxdt],
      lambda,
      iters ?? 10,
    );
    const activeCount = xi.filter((v) => Math.abs(v) > 0).length;
    return { ok: true, data: { xi, activeCount } };
  } catch (e) {
    return fail(`stlsq threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Verify side information (bounded, equilibrium, monotone) on a sample grid.
 */
export function evalVerifySideInfo(input: {
  readonly f: (x: readonly number[]) => number;
  readonly dfdScore: (x: readonly number[]) => number;
  readonly grid: readonly (readonly number[])[];
}): ResidueEval<{ readonly bounded: boolean; readonly equilibrium: boolean; readonly monotone: boolean }> {
  const { f, dfdScore, grid } = input;
  if (typeof f !== "function" || typeof dfdScore !== "function") {
    return fail("f/dfdScore must be functions");
  }
  if (!Array.isArray(grid) || grid.length === 0) return fail("grid must be non-empty");
  try {
    const r = verifySideInfo(f, dfdScore, grid);
    return { ok: true, data: r };
  } catch (e) {
    return fail(`verifySideInfo threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Drop the intercept column (index 0) to enforce t=0 equilibrium.
 */
export function evalDropIntercept(input: {
  readonly xi: readonly number[];
}): ResidueEval<{ readonly xi: readonly number[] }> {
  const { xi } = input;
  if (!Array.isArray(xi) || xi.length === 0) return fail("xi must be non-empty");
  for (const v of xi) {
    if (!Number.isFinite(v)) return fail("xi must be finite");
  }
  try {
    return { ok: true, data: { xi: dropIntercept([...xi]) } };
  } catch (e) {
    return fail(`dropIntercept threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Sports taxonomy Mondrian categories ──────────────────────────────────────

export interface TaxonomyAssignment {
  readonly rest: RestBucket;
  readonly tier1: readonly string[];
  readonly tier2: readonly string[];
  readonly mondrian: string;
  readonly parent: string | null;
}

/**
 * Assign Mondrian categories for a game context at level 1 or 2.
 */
export function evalTaxonomy(input: {
  readonly ctx: SportsGameContext;
  readonly level?: 1 | 2;
}): ResidueEval<TaxonomyAssignment> {
  const { ctx, level } = input;
  if (!ctx || typeof ctx.isHome !== "boolean" || typeof ctx.isFavorite !== "boolean") {
    return fail("ctx requires isHome and isFavorite booleans");
  }
  if (!Number.isFinite(ctx.restDays)) return fail("ctx.restDays must be finite");
  try {
    const rest = restBucket(ctx.restDays);
    const tier1 = tier1Categories(ctx);
    const tier2 = tier2Intersections(ctx);
    const mondrian = assignMondrianCategory(ctx, level ?? 1);
    const parent = parentCategory(mondrian);
    return { ok: true, data: { rest, tier1, tier2, mondrian, parent } };
  } catch (e) {
    return fail(`taxonomy threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Summarize per-category diagnostics (size, coverage, width, residual).
 */
export function evalCategoryDiagnostics(input: {
  readonly entries: readonly {
    category: string;
    covered?: boolean;
    width?: number;
    residual?: number;
  }[];
}): ResidueEval<{ readonly diagnostics: readonly { category: string; sampleSize: number; coverage?: number; meanWidth?: number; meanResidual?: number }[] }> {
  const { entries } = input;
  if (!Array.isArray(entries) || entries.length === 0) return fail("entries must be non-empty");
  for (const e of entries) {
    if (!e.category) return fail("each entry needs a category");
  }
  try {
    return { ok: true, data: { diagnostics: summarizeCategoryDiagnostics(entries) } };
  } catch (e) {
    return fail(`category diagnostics threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── LWT/MCPS greedy partition sketch ────────────────────────────────────────

export interface PartitionResult {
  readonly leaves: readonly LeafDefinition[];
  readonly leafIds: readonly string[];
}

/**
 * Grow a greedy axis-aligned partition over residual samples.
 */
export function evalGreedyPartition(input: {
  readonly samples: readonly PartitionSample[];
  readonly featureKeys: readonly string[];
  readonly maxDepth?: number;
  readonly minLeafSize?: number;
}): ResidueEval<PartitionResult> {
  const { samples, featureKeys, maxDepth, minLeafSize } = input;
  if (!Array.isArray(samples) || samples.length === 0) return fail("samples must be non-empty");
  if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
    return fail("featureKeys must be non-empty");
  }
  for (const s of samples) {
    if (!s || typeof s.residual !== "number" || !Number.isFinite(s.residual)) {
      return fail("each sample needs a finite residual");
    }
    if (!s.features || typeof s.features !== "object") {
      return fail("each sample needs a features record");
    }
  }
  try {
    const leaves = greedyPartition(samples, featureKeys, { maxDepth, minLeafSize });
    return {
      ok: true,
      data: { leaves, leafIds: leaves.map((l) => l.leafId) },
    };
  } catch (e) {
    return fail(`greedyPartition threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Score the best single axis-aligned split, or null if none is valid.
 */
export function evalBestSplit(input: {
  readonly samples: readonly PartitionSample[];
  readonly featureKeys: readonly string[];
  readonly minLeafSize?: number;
}): ResidueEval<{ readonly split: SplitCandidate | null }> {
  const { samples, featureKeys, minLeafSize } = input;
  if (!Array.isArray(samples) || samples.length === 0) return fail("samples must be non-empty");
  if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
    return fail("featureKeys must be non-empty");
  }
  for (const s of samples) {
    if (!s || typeof s.residual !== "number" || !Number.isFinite(s.residual)) {
      return fail("each sample needs a finite residual");
    }
  }
  try {
    const split = bestSplit(samples, featureKeys, minLeafSize ?? 10);
    return { ok: true, data: { split } };
  } catch (e) {
    return fail(`bestSplit threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Assign a leaf id by walking a frozen decision path. Returns
 * UNMATCHED_LEAF_ID when the features do not satisfy the path.
 */
export function evalAssignLeafId(input: {
  readonly features: Readonly<Record<string, number>>;
  readonly path: readonly LeafPathStep[];
}): ResidueEval<{ readonly leafId: string; readonly matched: boolean }> {
  const { features, path } = input;
  if (!features || typeof features !== "object") return fail("features must be a record");
  if (!Array.isArray(path)) return fail("path must be an array");
  try {
    const leafId = assignLeafId(features, path);
    return {
      ok: true,
      data: { leafId, matched: leafId !== UNMATCHED_LEAF_ID },
    };
  } catch (e) {
    return fail(`assignLeafId threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const ROOT_LEAF = ROOT_LEAF_ID;

// ─── Promotion: Acklam normal quantile / z critical value ─────────────────────

/**
 * Inverse standard normal CDF. Fail-closed outside (0, 1).
 */
export function evalStandardNormalQuantile(input: {
  readonly p: number;
}): ResidueEval<{ readonly x: number }> {
  const { p } = input;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p >= 1) {
    return fail("p must be a finite number in (0, 1)");
  }
  try {
    return { ok: true, data: { x: standardNormalQuantile(p) } };
  } catch (e) {
    return fail(`standardNormalQuantile threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * One-sided critical z for alpha: Phi^{-1}(1 - alpha).
 */
export function evalZCritOneSided(input: {
  readonly alpha: number;
}): ResidueEval<{ readonly z: number }> {
  const { alpha } = input;
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return fail("alpha must be a finite number in (0, 1)");
  }
  try {
    return { ok: true, data: { z: zCritOneSided(alpha) } };
  } catch (e) {
    return fail(`zCritOneSided threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── MetaVRF kernel helpers ──────────────────────────────────────────────────

/**
 * Evaluate the RBF kernel between two equal-length vectors.
 */
export function evalRbfKernel(input: {
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly lengthscale: number;
}): ResidueEval<{ readonly k: number }> {
  const { x, y, lengthscale } = input;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || x.length !== y.length) {
    return fail("x/y must be non-empty equal-length arrays");
  }
  if (!Number.isFinite(lengthscale) || lengthscale <= 0) {
    return fail("lengthscale > 0 required");
  }
  for (const v of [...x, ...y]) {
    if (!Number.isFinite(v)) return fail("x/y must be finite");
  }
  try {
    return { ok: true, data: { k: rbfKernelGp([...x], [...y], lengthscale) } };
  } catch (e) {
    return fail(`rbfKernelGp threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Random Fourier features for the RBF kernel, then KRR fit.
 * `rand` is a deterministic caller-supplied RNG (0..1).
 */
export function evalRffKrr(input: {
  readonly x: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly numFeatures: number;
  readonly gamma: number;
  readonly lambda: number;
  readonly rand: () => number;
}): ResidueEval<{ readonly weights: readonly number[]; readonly dim: number }> {
  const { x, y, numFeatures, gamma, lambda, rand } = input;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || x.length !== y.length) {
    return fail("x/y must be non-empty equal-length arrays");
  }
  if (!Number.isFinite(numFeatures) || numFeatures < 1) return fail("numFeatures must be >= 1");
  if (!Number.isFinite(gamma) || gamma <= 0) return fail("gamma must be finite > 0");
  if (!Number.isFinite(lambda) || lambda < 0) return fail("lambda must be finite >= 0");
  if (typeof rand !== "function") return fail("rand must be a function");
  for (const row of x) {
    if (!Array.isArray(row) || row.length === 0) return fail("x rows must be non-empty");
    for (const v of row) {
      if (!Number.isFinite(v)) return fail("x must be finite");
    }
  }
  for (const v of y) {
    if (!Number.isFinite(v)) return fail("y must be finite");
  }
  try {
    const { Phi } = rffFeatures(
      x.map((r) => [...r]),
      numFeatures,
      gamma,
      rand,
    );
    const weights = krrFit(Phi, [...y], lambda);
    return { ok: true, data: { weights, dim: weights.length } };
  } catch (e) {
    return fail(`rff/krr threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Certificate: gate candidate -> DecisionCertificate ──────────────────────

/**
 * Build a DecisionCertificate from a selective-gate candidate view.
 * Async because the certificate path may hash content.
 */
export async function evalGateCertificate(input: {
  readonly candidate: GateCandidateView;
  readonly hash?: boolean;
}): Promise<ResidueEval<{ readonly certificate: unknown }>> {
  const { candidate, hash } = input;
  if (!candidate || typeof candidate.eventId !== "string" || !candidate.eventId) {
    return fail("candidate.eventId required");
  }
  if (typeof candidate.market !== "string" || !candidate.market) {
    return fail("candidate.market required");
  }
  if (typeof candidate.stratumKey !== "string" || !candidate.stratumKey) {
    return fail("candidate.stratumKey required");
  }
  if (typeof candidate.modelVersion !== "string" || !candidate.modelVersion) {
    return fail("candidate.modelVersion required");
  }
  if (typeof candidate.admitted !== "boolean") {
    return fail("candidate.admitted must be boolean");
  }
  try {
    const certificate = await certificateFromGateCandidate(candidate, { hash: hash ?? false });
    return { ok: true, data: { certificate } };
  } catch (e) {
    return fail(`certificateFromGateCandidate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}
