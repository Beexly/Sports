/**
 * Metalearning + Conformal bridge — wires ALPACA online regression (BLR),
 * the meta-metric librarian, and Levene/Welch split-quality tests into the
 * live adaptation + evaluation surface.
 *
 * This is the "learn across tasks, test whether the split is honest" layer:
 * recursive Bayesian linear regression that updates per observation, a
 * metric librarian that retrieves and scales across tasks, and variance/
 * mean tests that flag a dishonest train/test split.
 *
 * Fail-closed on missing inputs. Never invents a posterior or a p-value.
 */

import {
  blrInit,
  blrUpdate,
  blrPredictive,
  blrNLL,
  alpacaGate,
  type BLRPosterior,
} from "@sports/prediction-engine";
import {
  prototypePredict,
  librarianGate,
  learnMetricScales,
  retrieveTopS,
} from "@sports/prediction-engine";
import {
  levene,
  brownForsythe,
  welchT,
  splitQuality,
  type VarianceTestResult,
  type WelchTResult,
} from "@sports/prediction-engine";

export type MetaEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── ALPACA online Bayesian linear regression ───────────────────────────────

/**
 * Online BLR: init a prior, then update on each observation. Returns the
 * final posterior and the last predictive. Fail-closed on shape mismatch.
 */
export function evalOnlineBlr(input: {
  readonly dim: number;
  readonly priorVar: number;
  readonly observations: readonly { readonly phi: readonly number[]; readonly y: number }[];
  readonly noiseVar: number;
}): MetaEval<{
  readonly posterior: BLRPosterior;
  readonly lastPredictive: { mean: number; variance: number } | null;
}> {
  const { dim, priorVar, observations, noiseVar } = input;
  if (!Number.isInteger(dim) || dim <= 0) {
    return { ok: false, reason: "dim must be a positive integer" };
  }
  if (!Number.isFinite(priorVar) || priorVar <= 0) {
    return { ok: false, reason: "priorVar must be finite and > 0" };
  }
  if (!Number.isFinite(noiseVar) || noiseVar <= 0) {
    return { ok: false, reason: "noiseVar must be finite and > 0" };
  }
  if (!Array.isArray(observations)) {
    return { ok: false, reason: "observations must be an array" };
  }
  try {
    let post = blrInit(dim, priorVar);
    let lastPredictive: { mean: number; variance: number } | null = null;
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i]!;
      if (!Array.isArray(obs.phi) || obs.phi.length !== dim) {
        return {
          ok: false,
          reason: `observation ${i}: phi must have length ${dim} — not imputed`,
        };
      }
      if (!Number.isFinite(obs.y)) {
        return { ok: false, reason: `observation ${i}: y must be finite — not imputed` };
      }
      post = blrUpdate(post, obs.phi as number[], obs.y, noiseVar);
      lastPredictive = blrPredictive(post, obs.phi as number[], noiseVar);
    }
    return {
      ok: true,
      data: {
        posterior: post,
        lastPredictive,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * ALPACA gate: ADAPT only when the Brier gain clears the bar AND the
 * per-week cost is acceptable AND it beats the ridge prior.
 */
export function evalAlpacaGate(input: {
  readonly brierGain: number;
  readonly msPerWeek: number;
  readonly beatsRidgePrior: boolean;
}): MetaEval<string> {
  const { brierGain, msPerWeek, beatsRidgePrior } = input;
  if (!Number.isFinite(brierGain) || !Number.isFinite(msPerWeek)) {
    return { ok: false, reason: "brierGain and msPerWeek must be finite" };
  }
  if (typeof beatsRidgePrior !== "boolean") {
    return { ok: false, reason: "beatsRidgePrior must be a boolean" };
  }
  const verdict = alpacaGate(brierGain, msPerWeek, beatsRidgePrior);
  return { ok: true, data: verdict };
}

/**
 * Predictive negative log-likelihood under the BLR posterior.
 */
export function evalBlrNll(input: {
  readonly posterior: BLRPosterior | null;
  readonly phi: readonly number[];
  readonly y: number;
  readonly noiseVar: number;
}): MetaEval<number> {
  const { posterior, phi, y, noiseVar } = input;
  if (!posterior || !Array.isArray(phi) || phi.length === 0) {
    return { ok: false, reason: "posterior and non-empty phi required" };
  }
  if (!Number.isFinite(y) || !Number.isFinite(noiseVar) || noiseVar <= 0) {
    return { ok: false, reason: "y finite and noiseVar > 0 required" };
  }
  try {
    const nll = blrNLL(posterior, phi as number[], y, noiseVar);
    return { ok: true, data: Number(nll.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Meta-metric librarian ──────────────────────────────────────────────────

export interface LibrarianResult {
  readonly prediction: number;
  readonly scales: readonly number[];
  readonly verdict: string;
}

/**
 * Learn metric scales across tasks, then prototype-predict the query.
 * The librarian gate decides ADAPT/REJECT on retrieval-vs-matching evidence.
 */
export function evalLibrarian(input: {
  readonly tasks: readonly { readonly X: readonly (readonly number[])[]; readonly y: readonly number[] }[];
  readonly supportX: readonly (readonly number[])[];
  readonly supportY: readonly number[];
  readonly query: readonly number[];
  readonly metaMetricAcc: number;
  readonly matchingNetAcc: number;
  readonly randomRetrievalAcc: number;
}): MetaEval<LibrarianResult> {
  const {
    tasks,
    supportX,
    supportY,
    query,
    metaMetricAcc,
    matchingNetAcc,
    randomRetrievalAcc,
  } = input;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { ok: false, reason: "tasks must be non-empty to learn metric scales" };
  }
  if (
    !Array.isArray(supportX) ||
    !Array.isArray(supportY) ||
    supportX.length === 0 ||
    supportX.length !== supportY.length
  ) {
    return { ok: false, reason: "supportX/supportY must be non-empty and aligned" };
  }
  if (!Array.isArray(query) || query.length === 0) {
    return { ok: false, reason: "query must be non-empty" };
  }
  try {
    const scales = learnMetricScales(tasks as never);
    const prediction = prototypePredict(
      supportX as number[][],
      supportY as number[],
      query as number[],
      scales as number[],
    );
    const verdict = librarianGate(metaMetricAcc, matchingNetAcc, randomRetrievalAcc);
    return {
      ok: true,
      data: {
        prediction: Number(prediction.toFixed(6)),
        scales: scales as number[],
        verdict,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Retrieve top-S nearest library seasons by cosine similarity of embeddings.
 * Returns their ids — never a fabricated match.
 */
export function evalRetrieveTopS(input: {
  readonly query: readonly number[];
  readonly library: readonly { readonly id: string; readonly embedding: readonly number[] }[];
  readonly s: number;
}): MetaEval<readonly string[]> {
  const { query, library, s } = input;
  if (!Array.isArray(query) || query.length === 0) {
    return { ok: false, reason: "query must be non-empty" };
  }
  if (!Array.isArray(library) || library.length === 0) {
    return { ok: false, reason: "library must be non-empty" };
  }
  if (!Number.isInteger(s) || s <= 0 || s > library.length) {
    return { ok: false, reason: "s must be in (0, library.length]" };
  }
  try {
    const ids = retrieveTopS(
      query as number[],
      library as never,
      s,
    );
    return { ok: true, data: ids as string[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Conformal: Levene / Welch split quality ────────────────────────────────

export interface SplitQualityResult {
  readonly levene: VarianceTestResult;
  readonly brownForsythe: VarianceTestResult;
  readonly welch: WelchTResult;
}

/**
 * Test whether a train/test split is honest: variance homogeneity
 * (Brown-Forsythe, preferred) and mean equality (Welch t). A flagged
 * split means the holdout is not exchangeable with the train set.
 */
export function evalSplitQuality(input: {
  readonly train: readonly number[];
  readonly test: readonly number[];
}): MetaEval<SplitQualityResult> {
  const { train, test } = input;
  if (
    !Array.isArray(train) ||
    !Array.isArray(test) ||
    train.length < 2 ||
    test.length < 2
  ) {
    return { ok: false, reason: "train/test must each have at least 2 samples" };
  }
  try {
    const groups = [train as number[], test as number[]];
    const leveneR = levene(groups);
    const bf = brownForsythe(groups);
    const welch = welchT(train as number[], test as number[]);
    return {
      ok: true,
      data: {
        levene: leveneR,
        brownForsythe: bf,
        welch,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Full split-quality scoring: combines the variance and mean tests into
 * one verdict via the module's own `splitQuality` helper.
 */
export function evalSplitQualityScore(input: {
  readonly train: readonly number[];
  readonly test: readonly number[];
}): MetaEval<ReturnType<typeof splitQuality>> {
  const { train, test } = input;
  if (!Array.isArray(train) || !Array.isArray(test) || train.length < 2 || test.length < 2) {
    return { ok: false, reason: "train/test must each have at least 2 samples" };
  }
  try {
    const score = splitQuality(train as number[], test as number[]);
    return { ok: true, data: score };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}


// ---- Metalearning residue: GP posterior, uncertainty meta-loss, EWA/BOA, fixed-support pools ----

import {
  gpPosterior1d,
  uncertaintyMetaLoss,
  ewaUpdate,
  boaUpdate,
  smoothWeights,
  canonicalPool,
  designedPool,
  sampleEpisode,
  archetypeCoverage,
  type Game,
  type Episode,
} from "@sports/prediction-engine";

/**
 * 1D GP posterior at a query point. Returns mean and variance.
 */
export function evalGpPosterior(input: {
  readonly X: readonly number[];
  readonly y: readonly number[];
  readonly xstar: number;
  readonly lengthscale: number;
  readonly sigmaF: number;
  readonly sigmaN: number;
}): MetaEval<{ mean: number; variance: number }> {
  const { X, y, xstar, lengthscale, sigmaF, sigmaN } = input;
  if (!Array.isArray(X) || !Array.isArray(y) || X.length === 0 || X.length !== y.length) {
    return { ok: false, reason: "X/y must be non-empty and aligned" };
  }
  if (!Number.isFinite(xstar) || !Number.isFinite(lengthscale) || lengthscale <= 0 ||
      !Number.isFinite(sigmaF) || sigmaF <= 0 || !Number.isFinite(sigmaN) || sigmaN <= 0) {
    return { ok: false, reason: "xstar finite, lengthscale/sigmaF/sigmaN > 0 required" };
  }
  try {
    const r = gpPosterior1d(X as number[], y as number[], xstar, lengthscale, sigmaF, sigmaN);
    return { ok: true, data: { mean: Number(r.mean.toFixed(6)), variance: Number(r.variance.toFixed(6)) } };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Uncertainty-weighted meta-loss: sum of loss/sigma^2 + log(sigma).
 */
export function evalUncertaintyMetaLoss(input: {
  readonly losses: readonly number[];
  readonly sigmas: readonly number[];
}): MetaEval<number> {
  const { losses, sigmas } = input;
  if (!Array.isArray(losses) || !Array.isArray(sigmas) || losses.length === 0 || losses.length !== sigmas.length) {
    return { ok: false, reason: "losses/sigmas must be non-empty and aligned" };
  }
  for (let i = 0; i < losses.length; i++) {
    if (!Number.isFinite(losses[i]) || !Number.isFinite(sigmas[i])) {
      return { ok: false, reason: `row ${i}: loss/sigma must be finite - not imputed` };
    }
  }
  try {
    const v = uncertaintyMetaLoss(losses as number[], sigmas as number[]);
    return { ok: true, data: Number(v.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * EWA (Hedge) update on the simplex, optionally smoothed.
 */
export function evalEwaUpdate(input: {
  readonly w: readonly number[];
  readonly losses: readonly number[];
  readonly eta: number;
  readonly lambda?: number;
}): MetaEval<readonly number[]> {
  const { w, losses, eta, lambda } = input;
  if (!Array.isArray(w) || !Array.isArray(losses) || w.length === 0 || w.length !== losses.length) {
    return { ok: false, reason: "w/losses must be non-empty and aligned" };
  }
  if (!Number.isFinite(eta) || eta <= 0) {
    return { ok: false, reason: "eta must be finite and > 0" };
  }
  try {
    let updated = ewaUpdate(w as number[], losses as number[], eta);
    if (lambda !== undefined) {
      updated = smoothWeights(updated, lambda);
    }
    return { ok: true, data: updated as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * BOA (Bernstein Online Aggregation) update with second-order correction.
 */
export function evalBoaUpdate(input: {
  readonly w: readonly number[];
  readonly losses: readonly number[];
  readonly V: readonly number[];
  readonly eta: number;
}): MetaEval<{ w: readonly number[]; V: readonly number[] }> {
  const { w, losses, V, eta } = input;
  if (!Array.isArray(w) || !Array.isArray(losses) || !Array.isArray(V) ||
      w.length === 0 || w.length !== losses.length || w.length !== V.length) {
    return { ok: false, reason: "w/losses/V must be non-empty and aligned" };
  }
  if (!Number.isFinite(eta) || eta <= 0) {
    return { ok: false, reason: "eta must be finite and > 0" };
  }
  try {
    const r = boaUpdate(w as number[], losses as number[], V as number[], eta);
    return { ok: true, data: { w: r.w as number[], V: r.V as number[] } };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fixed-support pools: canonical pool by week, designed pool by archetype
 * coverage, episode sampling. Fail-closed on missing team-season.
 */
export function evalFixedSupportPools(input: {
  readonly games: readonly Game[];
  readonly team: string;
  readonly season: number;
  readonly k?: number;
  readonly archetypes?: readonly string[];
}): MetaEval<{
  canonical: readonly Game[];
  designed: readonly Game[];
  coverage: number;
}> {
  const { games, team, season, k, archetypes } = input;
  if (!Array.isArray(games) || games.length === 0) {
    return { ok: false, reason: "games must be non-empty" };
  }
  if (!team || !Number.isInteger(season)) {
    return { ok: false, reason: "team and integer season required" };
  }
  try {
    const canonical = canonicalPool(games as Game[], team, season);
    const archs = archetypes && archetypes.length > 0 ? archetypes : [...new Set(canonical.map((g) => g.archetype))];
    const designed = designedPool(games as Game[], team, season, k ?? 4, archs);
    const coverage = archetypeCoverage(designed, archs);
    return {
      ok: true,
      data: {
        canonical: canonical as Game[],
        designed: designed as Game[],
        coverage: Number(coverage.toFixed(4)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  blrInit,
  blrUpdate,
  blrPredictive,
  blrNLL,
  alpacaGate,
  prototypePredict,
  librarianGate,
  learnMetricScales,
  retrieveTopS,
  levene,
  brownForsythe,
  welchT,
  splitQuality,
};
export type { BLRPosterior, VarianceTestResult, WelchTResult };
