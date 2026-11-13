/**
 * mcp-cognitive-router — Stage A/B/C/D coarse-to-fine retrieval over literature premises.
 *
 * Spec: docs/engine/research/2026-10-21/downloads-2026-10-21/GSE-OMNI-COGNITIVE-WORLD-MODEL-ARCHITECTURE.md
 *
 * The problem it solves: 50,000 premise schemas do not fit in a context window, and pasting
 * them degrades selection accuracy. Stage A cuts 50,000 → ~2,500 on a 288-bit context mask
 * via a GIN overlap test. Stage B cuts those → 250 on pgvector HNSW cosine. Stage C applies
 * spectral cluster orthogonalization (250 → 25), and Stage D applies cross-equation Jacobian
 * coupling and positive-part James-Stein shrinkage capped at |Δ log-odds| <= 0.35.
 *
 * The mask is 288 bits as Uint32Array(9) — 279 signal families plus headroom, matching the
 * column type. A bit is set when that family has non-zero displacement and N >= 30.
 */

export const MASK_BITS = 288;
export const MASK_WORDS = 9;
export const SIGNAL_FAMILIES = 279;
export const MIN_SAMPLE = 30;

/** HNSW ef_search. In-play is cheaper; pre-game buys recall. */
export const EF_SEARCH_IN_PLAY = 64;
export const EF_SEARCH_PRE_GAME = 128;

export const STAGE_A_LIMIT = 2500;
export const STAGE_B_LIMIT = 250;
export const STAGE_C_LIMIT = 25;
export const MAX_ABS_DELTA_LOG_ODDS = 0.35;

export type Signal = { family: number; displacement: number; n: number };

export type VerificationStatus =
  | "HIGH_PRIORITY_PRODUCTION_TARGET"
  | "GATED_EXPERIMENT_CANDIDATE"
  | "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST";

export type Premise = {
  id: string;
  premise: string;
  cluster: string;
  similarity: number;
  verificationStatus?: VerificationStatus;
  /** Set only after metric-birth-certificate out-of-sample backtest passes. */
  backtestPassed?: boolean;
};

/** Minimal query surface so this does not pin a driver. */
export type Queryable = {
  query<R extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
};

/**
 * Build the context mask. A family fires only when it actually moved and the sample
 * supports it — a zero displacement or a thin sample must not set a bit, or Stage A
 * returns premises that cannot apply.
 */
export function buildContextMask(signals: readonly Signal[]): Uint32Array {
  const mask = new Uint32Array(MASK_WORDS);
  for (const s of signals) {
    if (!Number.isInteger(s.family) || s.family < 0 || s.family >= SIGNAL_FAMILIES) {
      throw new Error(`signal family out of range: ${s.family}`);
    }
    // Written as `!(abs > 0)` rather than `=== 0` on purpose: it also rejects NaN, which
    // `=== 0` would let through.
    if (!(Math.abs(s.displacement) > 0) || !Number.isFinite(s.n) || !(s.n >= MIN_SAMPLE)) continue;
    const word = Math.floor(s.family / 32);
    mask[word] = (mask[word]! | (1 << (s.family % 32))) >>> 0;
  }
  return mask;
}

/** Uint32Array(9) → int[] for the GIN column. */
export function maskToArray(mask: Uint32Array): number[] {
  if (mask.length !== MASK_WORDS) throw new Error("mask must be Uint32Array(9)");
  return Array.from(mask, (w) => w | 0);
}

/** pgvector literal. */
export function toVectorLiteral(v: readonly number[]): string {
  return `[${v.join(",")}]`;
}

export type RouteOptions = {
  /** Pre-game buys recall at ~2x the latency. */
  preGame?: boolean;
  /** false = let the HNSW index drive (fast, but capped at ef_search). Default exact. */
  exact?: boolean;
  stageALimit?: number;
  stageBLimit?: number;
};

/**
 * Stage A — context-mask prefilter.
 *
 * The mask is 9 bitfield words, so array overlap (`&&`) is wrong: word 258 contains bit 1
 * but never equals 2, and `&&` compares whole elements. The prefilter is a word-by-word
 * bitwise AND, OR-ed across the nine words.
 *
 * Rows with a NULL/short mask are excluded by the NULL comparison, which is why the column
 * carries a CHECK on length 9 and a nine-zero default.
 */
export async function stageA(
  db: Queryable,
  mask: Uint32Array,
  limit = STAGE_A_LIMIT,
): Promise<string[]> {
  const arr = maskToArray(mask);
  const terms = maskTerms(arr);
  if (!terms) {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM v_class_a_literature_premises
       WHERE embedding IS NOT NULL LIMIT $1`,
      [limit],
    );
    return res.rows.map((r) => r.id);
  }
  const res = await db.query<{ id: string }>(
    `SELECT id FROM v_class_a_literature_premises
     WHERE embedding IS NOT NULL AND (${terms.sql}) LIMIT $${terms.params.length + 1}`,
    [...terms.params, limit],
  );
  return res.rows.map((r) => r.id);
}

/**
 * Build the Stage A predicate. Word values are bound as parameters rather than interpolated;
 * the array subscript is a constant 1..9 so it stays inline.
 */
function maskTerms(arr: readonly number[]): { sql: string; params: number[] } | null {
  const parts: string[] = [];
  const params: number[] = [];
  arr.forEach((w, i) => {
    if (w === 0) return;
    params.push(w);
    parts.push(`(context_mask[${i + 1}] & $${params.length}) <> 0`);
  });
  return parts.length ? { sql: parts.join(" OR "), params } : null;
}

/**
 * Stage B — HNSW cosine over the Stage A set.
 *
 * `SET LOCAL` is a no-op outside a transaction block, so ef_search silently stayed at the
 * default 40 and LIMIT could never exceed it. The statement now runs inside an explicit
 * transaction with `set_config(..., true)` scoped to it.
 *
 * Even scoped, an HNSW scan yields at most ef_search tuples, so a filtered scan post-filters
 * the class-A predicate and the Stage A set down to a handful of rows. `exact` forces a
 * sequential re-rank over the candidate set instead, which is the correct trade at 2,500
 * candidates and is what the default uses.
 */
export async function stageB(
  db: Queryable,
  embedding: readonly number[],
  candidateIds: readonly string[],
  opts: RouteOptions = {},
): Promise<Premise[]> {
  if (candidateIds.length === 0) return [];
  const ef = opts.preGame ? EF_SEARCH_PRE_GAME : EF_SEARCH_IN_PLAY;
  const limit = opts.stageBLimit ?? STAGE_B_LIMIT;
  const vec = toVectorLiteral(embedding);

  await db.query("BEGIN");
  try {
    await db.query(`SELECT set_config('hnsw.ef_search', $1, true)`, [String(ef)]);
    // `+ 0` defeats the index's ordered-scan shortcut so Postgres re-ranks the whole
    // candidate set exactly. Without it the HNSW scan yields at most ef_search tuples and
    // the LIMIT is silently capped. `exact: false` opts back into the fast, capped path.
    const order = opts.exact === false ? "embedding <=> $1::vector" : "(embedding <=> $1::vector) + 0";
    const res = await db.query<{
      id: string;
      premise: string;
      cluster: string;
      similarity: number;
    }>(
      `SELECT id, premise, cluster, 1 - (embedding <=> $1::vector) AS similarity
       FROM v_class_a_literature_premises
       WHERE id = ANY($2::text[]) AND embedding IS NOT NULL
       ORDER BY ${order}
       LIMIT $3`,
      [vec, [...candidateIds], limit],
    );
    await db.query("COMMIT");
    return res.rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}

/** Full A → B route. */
export async function route(
  db: Queryable,
  signals: readonly Signal[],
  embedding: readonly number[],
  opts: RouteOptions = {},
): Promise<Premise[]> {
  const mask = buildContextMask(signals);
  const candidates = await stageA(db, mask, opts.stageALimit ?? STAGE_A_LIMIT);
  return stageB(db, embedding, candidates, opts);
}

// ============================================================================
// STAGE C: Spectral Graph Orthogonalization (250 → 25)
// Down-weights redundant intra-cluster premises via degree-normalized spectral
// attenuation: w_i^spec = sim_i / sqrt(1 + gamma * (rankInCluster_i))
// ============================================================================

export interface SpectralPremise extends Premise {
  readonly clusterRank: number;
  readonly spectralScore: number;
  readonly jacobianSensitivity?: number;
  readonly rawLogOddsDelta?: number;
  readonly quarantined?: boolean;
}

export function stageC(
  premises: readonly (Premise & {
    readonly jacobianSensitivity?: number;
    readonly rawLogOddsDelta?: number;
  })[],
  opts: { readonly limit?: number; readonly clusterRedundancyGamma?: number } = {},
): SpectralPremise[] {
  const limit = opts.limit ?? STAGE_C_LIMIT;
  const gamma = opts.clusterRedundancyGamma ?? 0.85;

  // Sort by similarity descending first so the strongest representative in each cluster gets rank 0
  const sortedBySim = [...premises].sort((a, b) => b.similarity - a.similarity);
  const clusterCounts = new Map<string, number>();

  const scored: SpectralPremise[] = sortedBySim.map((p) => {
    const rank = clusterCounts.get(p.cluster) ?? 0;
    clusterCounts.set(p.cluster, rank + 1);
    const attenuation = Math.sqrt(1 + gamma * rank);
    const spectralScore = Number((p.similarity / attenuation).toFixed(6));
    const quarantined =
      p.verificationStatus === "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST" &&
      p.backtestPassed !== true;
    return {
      ...p,
      clusterRank: rank,
      spectralScore: quarantined ? 0 : spectralScore,
      quarantined,
    };
  });

  return scored.sort((a, b) => b.spectralScore - a.spectralScore).slice(0, limit);
}

/**
 * Bun, Bouchaud & Potters (2016, arXiv:1605.00690v2):
 * Marchenko-Pastur bulk noise bound lambda_+ = (1 + sqrt(q))^2 where q = N / T.
 * Clips finite-sample spurious correlation inflation in high-dimensional equation clusters.
 */
export function denoiseMarchenkoPasturEffectiveRankShrinkage(
  dimensionN: number,
  sampleHorizonT = 24,
): number {
  if (dimensionN <= 1) return 1.0;
  const q = Math.max(0.01, Math.min(2.0, dimensionN / Math.max(4, sampleHorizonT)));
  const lambdaPlus = Math.pow(1 + Math.sqrt(q), 2);
  return Number((1 / (1 + 0.045 * (lambdaPlus - 1))).toFixed(5));
}

/**
 * Hastie, Tibshirani & Wainwright (2015, Statistical Learning with Sparsity, Ch. 2):
 * Proximal L1 soft-thresholding operator S_lambda(z) = sign(z) * max(|z| - lambda, 0)
 * with Restricted Eigenvalue (RE) sparsity guarantees.
 */
export function softThresholdSparseLasso(
  coefficients: readonly number[],
  lambdaPenalty: number,
): number[] {
  const lam = Math.max(0, lambdaPenalty);
  return coefficients.map((z) => {
    const absZ = Math.abs(z);
    if (absZ <= lam) return 0;
    return Number(((z > 0 ? 1 : -1) * (absZ - lam)).toFixed(6));
  });
}

/**
 * He (2024, arXiv:2407.04153 PEER: Mixture of a Million Experts) Cartesian Product-Key Routing
 * + Edge0 (AM-02) Next-Snap Prerouter Prefetching.
 */
export function routePeerProductKeyAndPrerouter(
  querySubvecA: readonly number[],
  querySubvecB: readonly number[],
  codebookA: ReadonlyArray<{ id: string; key: readonly number[] }>,
  codebookB: ReadonlyArray<{ id: string; key: readonly number[] }>,
  topK = 2,
): { selectedProductKeys: string[]; prerouterPrefetchIds: string[] } {
  const dot = (u: readonly number[], v: readonly number[]) => {
    const len = Math.min(u.length, v.length);
    let s = 0;
    for (let i = 0; i < len; i++) s += u[i]! * v[i]!;
    return s;
  };

  const scoredA = codebookA
    .map((c) => ({ id: c.id, score: dot(querySubvecA, c.key) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.max(1, topK));

  const scoredB = codebookB
    .map((c) => ({ id: c.id, score: dot(querySubvecB, c.key) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.max(1, topK));

  const cartesian: Array<{ id: string; score: number }> = [];
  for (const a of scoredA) {
    for (const b of scoredB) {
      cartesian.push({ id: `${a.id}x${b.id}`, score: a.score + b.score });
    }
  }
  cartesian.sort((x, y) => y.score - x.score);

  const selectedProductKeys = cartesian.slice(0, Math.max(1, topK)).map((c) => c.id);
  const prerouterPrefetchIds = cartesian.slice(0, Math.max(2, topK + 1)).map(
    (c) => `prefetch:${c.id}`,
  );
  return { selectedProductKeys, prerouterPrefetchIds };
}

// ============================================================================
// STAGE D: Cross-Equation Jacobian Coupling & Positive-Part James-Stein
// Shrinkage with |Δ log-odds| <= 0.35 Hard Clamp + tau_hat Prior Integration
// ============================================================================

export interface StageDCoupledResult {
  readonly selectedPremises: readonly (SpectralPremise & {
    readonly shrunkLogOddsDelta: number;
  })[];
  readonly jamesSteinShrinkageFactor: number;
  readonly unClampedTotalLogOddsDelta: number;
  readonly clampedTotalLogOddsDelta: number;
  readonly clamped: boolean;
  readonly tauHatCoachPriorBonus: number;
}

/**
 * Applies positive-part James-Stein shrinkage (Baranchik 1964 / Stein 1956, guarded for d >= 3)
 * across the Stage C orthogonalized premises, weights by symbolic Jacobian sensitivity,
 * integrates the coach inverse-MDP risk preference prior (tau_hat vs 0.42 baseline),
 * and enforces the Z3 QF_UFLRA hard clamp |Δ log-odds| <= 0.35.
 */
export function stageD(
  spectralPremises: readonly SpectralPremise[],
  opts: {
    readonly noiseVarianceSigma2?: number;
    readonly tauHatCoach?: number;
    readonly baselineTau?: number;
    readonly maxAbsLogOddsDelta?: number;
  } = {},
): StageDCoupledResult {
  const sigma2 = opts.noiseVarianceSigma2 ?? 0.0025;
  const maxAbs = opts.maxAbsLogOddsDelta ?? MAX_ABS_DELTA_LOG_ODDS;
  const tauHat = opts.tauHatCoach ?? 0.42;
  const baseTau = opts.baselineTau ?? 0.42;

  const d = spectralPremises.length;
  const rawDeltas = spectralPremises.map((p) => {
    const quarantined =
      p.verificationStatus === "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST" &&
      p.backtestPassed !== true;
    if (quarantined) return 0;
    const jac = p.jacobianSensitivity ?? 1.0;
    const raw = p.rawLogOddsDelta ?? 0;
    return raw * jac * Math.max(0, p.spectralScore);
  });

  const sumSq = rawDeltas.reduce((acc, v) => acc + v * v, 0);
  // Positive-part James-Stein factor: max(0, 1 - (d - 2) * sigma^2 / ||theta||^2) for d >= 3
  const jsFactor =
    d >= 3 && sumSq > 1e-12
      ? Math.max(0, 1 - ((d - 2) * sigma2) / sumSq)
      : 1.0;

  const selectedPremises = spectralPremises.map((p, idx) => {
    const quarantined =
      p.verificationStatus === "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST" &&
      p.backtestPassed !== true;
    return {
      ...p,
      quarantined,
      shrunkLogOddsDelta: quarantined ? 0 : Number((rawDeltas[idx]! * jsFactor).toFixed(6)),
    };
  });

  // Integrate coach inverse-MDP risk preference deviation (tau_hat - 0.42)
  const tauHatCoachPriorBonus = Number(((tauHat - baseTau) * 0.12).toFixed(6));
  const unClampedTotalLogOddsDelta = Number(
    (
      selectedPremises.reduce((acc, p) => acc + p.shrunkLogOddsDelta, 0) +
      tauHatCoachPriorBonus
    ).toFixed(6),
  );

  const clampedTotalLogOddsDelta = Number(
    Math.max(-maxAbs, Math.min(maxAbs, unClampedTotalLogOddsDelta)).toFixed(6),
  );

  return {
    selectedPremises,
    jamesSteinShrinkageFactor: Number(jsFactor.toFixed(6)),
    unClampedTotalLogOddsDelta,
    clampedTotalLogOddsDelta,
    clamped: Math.abs(unClampedTotalLogOddsDelta) > maxAbs,
    tauHatCoachPriorBonus,
  };
}

/** Full 4-Stage Cognitive Router (A -> B -> C -> D). */
export async function routeFullFourStage(
  db: Queryable,
  signals: readonly Signal[],
  embedding: readonly number[],
  opts: RouteOptions & {
    readonly stageCLimit?: number;
    readonly clusterRedundancyGamma?: number;
    readonly tauHatCoach?: number;
  } = {},
): Promise<StageDCoupledResult> {
  const stageBResults = await route(db, signals, embedding, opts);
  const stageCResults = stageC(stageBResults, {
    limit: opts.stageCLimit,
    clusterRedundancyGamma: opts.clusterRedundancyGamma,
  });
  return stageD(stageCResults, { tauHatCoach: opts.tauHatCoach });
}

/**
 * Zero-DB In-Memory 4-Stage Cognitive Router over the compiled Thousand-Equation Matrix.
 * Evaluates 288-bit context mask -> signed displacement conditioning -> Stage C Spectral
 * Cluster Orthogonalization -> Stage D Jacobian Coupling & Positive-Part James-Stein Shrinkage.
 */
export function routeInMemoryFourStage(
  signals: readonly Signal[],
  opts: {
    readonly topK?: number;
    readonly stageCLimit?: number;
    readonly clusterRedundancyGamma?: number;
    readonly tauHatCoach?: number;
  } = {},
): StageDCoupledResult & { readonly contextMask: Uint32Array } {
  const mask = buildContextMask(signals);
  // Lazy-import via synchronous ESM module function to avoid circular top-level init
  const candidates = selectCandidatePremisesFromLoadedMatrix(mask, signals, opts.topK ?? STAGE_B_LIMIT);
  const stageCResults = stageC(candidates, {
    limit: opts.stageCLimit ?? STAGE_C_LIMIT,
    clusterRedundancyGamma: opts.clusterRedundancyGamma,
  });
  const dRes = stageD(stageCResults, { tauHatCoach: opts.tauHatCoach });
  return {
    ...dRes,
    contextMask: mask,
  };
}

import { selectCandidatePremisesByContextMask } from "./thousand-equation-registry.js";

function selectCandidatePremisesFromLoadedMatrix(
  mask: Uint32Array,
  signals: readonly Signal[],
  topK: number,
) {
  return selectCandidatePremisesByContextMask(mask, { topK, signals });
}

// ============================================================================
// STAGE 2 PRE-PROJECTION UNIVERSAL 360 + 2ND/3RD-ORDER + 8-STEP 5-API CASCADE
// ============================================================================

export interface PreProjectionOmniscienceRouterInput {
  readonly causalUnschemedEpaDelta?: number;
  readonly qbTraumaCompressionSec?: number;
  readonly trenchWeakLinkCollapseProb?: number;
  readonly coordinatorScriptCliffDelta?: number;
  readonly refereeMarketTrueSteamProb?: number;
  readonly gsiBiomechanicalEfficiencyLossPct?: number;
  readonly kaggleVoronoiControlAdvantage?: number;
  readonly arxivOptimalTransportDisguiseKl?: number;
  readonly openAlexOrthopedicSnapCap?: number;
  readonly huggingFaceAll22StanceTellScore?: number;
  readonly tauHatCoach?: number;
}

export interface PreProjectionCognitiveRouterOutput {
  readonly routerResult: StageDCoupledResult & { readonly contextMask: Uint32Array };
  readonly injectedSignalsCount: number;
  readonly snapTransitionPriorDelta: number;
  /** Null when an input it needs was not supplied. Never a substituted constant. */
  readonly passEfficiencyPriorDelta: number | null;
  /** Null when an input it needs was not supplied. Never a substituted constant. */
  readonly pressureDisruptionHazardDelta: number | null;
  /** Null when an input it needs was not supplied. Never a substituted constant. */
  readonly secondHalfTutFatigueDecayRate: number | null;
  /** Null when an input it needs was not supplied. Never a substituted constant. */
  readonly gsiSnapShareCap: number | null;
  readonly reverse8Step5ApiCascadeActive: true;
  /** Families skipped because their input was absent, with the field name. */
  readonly missingInputs: ReadonlyArray<{ family: number; field: string; reason: string }>;
}

/**
 * Converts the 6 Deep Second/Third-Order Non-Stationary Kernels + 8-Step Reverse/Interleaved
 * 5-API (`Kaggle -> xAI -> arXiv -> xAI -> OpenAlex -> xAI -> Hugging Face -> xAI`) priors
 * into canonical 288-bit `Signal[]` entries (`N >= 30`) across all 6 situational families.
 */
export function buildUniversalAndSecondOrderCognitiveSignals(
  input: PreProjectionOmniscienceRouterInput = {},
): Signal[] {
  const signals: Signal[] = [];
  const push = (family: number, displacement: number | undefined, n: number): void => {
    // A family whose input is absent is NOT emitted. The previous version
    // substituted a hand-set default (0.58, -0.26, 0.14, -0.35, 0.12, 0.11,
    // 0.18, 0.15, 0.72) and emitted a signal anyway, so an unmeasured family
    // moved the router exactly as if it had been measured. Absence is now
    // absence; `describeMissingRouterInputs` reports what was skipped.
    if (displacement === undefined || !Number.isFinite(displacement)) return;
    signals.push({ family, displacement, n });
  };

  // Family 12: Pressure & Weakest-Link Trench Collapse
  push(
    12,
    input.trenchWeakLinkCollapseProb === undefined
      ? undefined
      : input.trenchWeakLinkCollapseProb - 0.35,
    120,
  );
  // Family 48: QB Post-Hit Trauma Hysteresis & Clean-Pocket Clock Compression
  push(48, input.qbTraumaCompressionSec, 85);
  // Family 94: Causal FWL Unschemed Skill vs Scheme-Manufactured Volume
  push(94, input.causalUnschemedEpaDelta, 140);
  // Family 132: Coordinator Opening-15 Script Cliff & 3-Snap Tendency Trap
  push(132, input.coordinatorScriptCliffDelta, 65);
  // Family 176: GSI Sports Medicine & OpenAlex Orthopedic Return-to-Play Degradation
  push(
    176,
    input.gsiBiomechanicalEfficiencyLossPct === undefined
      ? undefined
      : -input.gsiBiomechanicalEfficiencyLossPct,
    95,
  );
  // Family 210: Kaggle BDB Voronoi Control + arXiv Disguise KL + HF All-22 Pre-Snap Tell
  // A weighted sum is only meaningful when every weight has a value. One absent
  // term would silently renormalise the other two.
  if (
    input.kaggleVoronoiControlAdvantage !== undefined &&
    input.arxivOptimalTransportDisguiseKl !== undefined &&
    input.huggingFaceAll22StanceTellScore !== undefined
  ) {
    push(
      210,
      0.4 * input.kaggleVoronoiControlAdvantage +
        0.35 * input.arxivOptimalTransportDisguiseKl +
        0.25 * input.huggingFaceAll22StanceTellScore,
      110,
    );
  }
  // Family 254: Referee Score-State Reflexivity & True Steam vs Head-Fake Buyback
  push(
    254,
    input.refereeMarketTrueSteamProb === undefined
      ? undefined
      : input.refereeMarketTrueSteamProb - 0.5,
    75,
  );

  return signals;
}

/**
 * Which router families were skipped because their input was absent, and why.
 * This is the diagnostic that replaces the old silent defaults: the reasoning
 * trace can say "family 12 was not computed because trenchWeakLinkCollapseProb
 * was not supplied" instead of quietly using 0.58.
 */
export function describeMissingRouterInputs(
  input: PreProjectionOmniscienceRouterInput = {},
): Array<{ family: number; field: string; reason: string }> {
  const out: Array<{ family: number; field: string; reason: string }> = [];
  const need = (family: number, field: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value)) {
      out.push({ family, field, reason: `${field} was not supplied` });
    }
  };
  need(12, "trenchWeakLinkCollapseProb", input.trenchWeakLinkCollapseProb);
  need(48, "qbTraumaCompressionSec", input.qbTraumaCompressionSec);
  need(94, "causalUnschemedEpaDelta", input.causalUnschemedEpaDelta);
  need(132, "coordinatorScriptCliffDelta", input.coordinatorScriptCliffDelta);
  need(176, "gsiBiomechanicalEfficiencyLossPct", input.gsiBiomechanicalEfficiencyLossPct);
  need(210, "kaggleVoronoiControlAdvantage", input.kaggleVoronoiControlAdvantage);
  need(210, "arxivOptimalTransportDisguiseKl", input.arxivOptimalTransportDisguiseKl);
  need(210, "huggingFaceAll22StanceTellScore", input.huggingFaceAll22StanceTellScore);
  need(254, "refereeMarketTrueSteamProb", input.refereeMarketTrueSteamProb);
  return out;
}

/**
 * Executes the full Stage 2 4-Stage Cognitive Router (`buildContextMask` 288-bit mask ->
 * `stageC` Spectral Cluster Orthogonalization -> `stageD` Cross-Equation Jacobian Coupling
 * & Positive-Part James-Stein Shrinkage capped at |Δ log-odds| <= 0.35) conditioned on
 * the Universal 360-Metric, 6-Kernel Second/Third-Order Non-Stationary, and 8-Step
 * Reverse-Cascade (`Kaggle -> xAI -> arXiv -> xAI -> OpenAlex -> xAI -> HF -> xAI`) priors.
 */
export function routePreProjectionWithUniversalAndOmnisciencePriors(
  baseSignals: readonly Signal[] = [],
  input: PreProjectionOmniscienceRouterInput = {},
): PreProjectionCognitiveRouterOutput {
  const omniscienceSignals = buildUniversalAndSecondOrderCognitiveSignals(input);
  const combinedSignals = [...baseSignals, ...omniscienceSignals];
  const routerResult = routeInMemoryFourStage(combinedSignals, {
    // tauHatCoach is a router parameter, not a measurement. When it is absent
    // the router runs on its own documented default and the trace says so.
    tauHatCoach: input.tauHatCoach ?? 0.46,
  });

  const clampedDelta = routerResult.clampedTotalLogOddsDelta;
  const traumaSec = input.qbTraumaCompressionSec;
  const collapseProb = input.trenchWeakLinkCollapseProb;
  const gsiLoss = input.gsiBiomechanicalEfficiencyLossPct;

  const snapTransitionPriorDelta = Number((0.45 * clampedDelta).toFixed(6));

  // Each derived delta is computed only when every input it needs is present.
  // An absent input yields null, not a substituted constant.
  const passEfficiencyPriorDelta =
    input.causalUnschemedEpaDelta === undefined || gsiLoss === undefined
      ? null
      : Number(
          (0.35 * clampedDelta + 0.15 * input.causalUnschemedEpaDelta - 0.25 * gsiLoss).toFixed(6),
        );
  const pressureDisruptionHazardDelta =
    collapseProb === undefined || traumaSec === undefined
      ? null
      : Number((0.22 * Math.max(0, collapseProb - 0.35) + 0.18 * Math.abs(traumaSec)).toFixed(6));
  const secondHalfTutFatigueDecayRate =
    collapseProb === undefined || gsiLoss === undefined
      ? null
      : Number((0.045 + 0.06 * collapseProb + 0.04 * gsiLoss).toFixed(6));
  const gsiSnapShareCap =
    input.openAlexOrthopedicSnapCap !== undefined
      ? Number(Math.max(0.45, Math.min(1.0, input.openAlexOrthopedicSnapCap)).toFixed(6))
      : gsiLoss === undefined
        ? null
        : Number(Math.max(0.45, Math.min(1.0, 1.0 - 1.5 * gsiLoss)).toFixed(6));

  return {
    routerResult,
    injectedSignalsCount: omniscienceSignals.length,
    snapTransitionPriorDelta,
    passEfficiencyPriorDelta,
    pressureDisruptionHazardDelta,
    secondHalfTutFatigueDecayRate,
    gsiSnapShareCap,
    reverse8Step5ApiCascadeActive: true,
    missingInputs: describeMissingRouterInputs(input),
  };
}

// ============================================================================
// QUAD-ENGINE CROSSWALK & OPENAI MATH 721-MANUSCRIPT INTEGRATION (Task 1, 2 & 6A)
// ============================================================================

export {
  QuadEngineSource,
  QuadEngineCrosswalkNode,
  buildQuadEngineCrosswalk,
  queryQuadEngineByContext,
  loadLiveQuadEngineCrosswalk,
} from "./quad-engine-crosswalk.js";

export {
  OPENAI_MATH_721_SUMMARY,
  computeSoggeLocalSmoothingWaveFocusing,
  computeBoundedTreewidthL1Embedding,
  computeRadialPairPotentialCriticality,
  computeAmplitudeDampingFatigueChannel,
  computeFixedWidthCnfConjunctionGate,
  verifyLeanComparatorChallengeSoundness,
  type OpenAiMath721Summary,
  type SoggeWaveFocusingResult,
  type BoundedTreewidthL1Result,
  type RadialPairPotentialCriticalityResult,
  type AmplitudeDampingFatigueResult,
  type FixedWidthCnfConjunctionResult,
  type LeanComparatorSoundnessResult,
} from "./openai-math-721-catalog-and-kernels.js";


