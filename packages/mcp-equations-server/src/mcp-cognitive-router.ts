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

export type Premise = {
  id: string;
  premise: string;
  cluster: string;
  similarity: number;
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
    return {
      ...p,
      clusterRank: rank,
      spectralScore,
    };
  });

  return scored.sort((a, b) => b.spectralScore - a.spectralScore).slice(0, limit);
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

  const selectedPremises = spectralPremises.map((p, idx) => ({
    ...p,
    shrunkLogOddsDelta: Number((rawDeltas[idx]! * jsFactor).toFixed(6)),
  }));

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
