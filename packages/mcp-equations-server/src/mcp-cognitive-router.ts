/**
 * mcp-cognitive-router — Stage A/B coarse-to-fine retrieval over literature premises.
 *
 * Spec: docs/engine/research/2026-10-21/downloads-2026-10-21/GSE-OMNI-COGNITIVE-WORLD-MODEL-ARCHITECTURE.md
 *
 * The problem it solves: 50,000 premise schemas do not fit in a context window, and pasting
 * them degrades selection accuracy. Stage A cuts 50,000 → ~2,500 on a 288-bit context mask
 * via a GIN overlap test. Stage B cuts those → 250 on pgvector HNSW cosine. Stages C/D
 * (spectral routing, symbolic Jacobians) rank on top of what this returns and are not built
 * here.
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
    if (s.displacement === 0 || !(s.n >= MIN_SAMPLE)) continue;
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
  stageALimit?: number;
  stageBLimit?: number;
};

/**
 * Stage A — context-mask prefilter.
 *
 * The mask is 9 bitfield words, so array overlap (`&&`) is wrong: word 258 contains bit 1
 * but never equals 2, and `&&` compares whole elements. The prefilter is therefore a
 * word-by-word bitwise AND, OR-ed across the nine words.
 *
 * An empty mask matches everything, which is correct — no signal fired, so nothing narrows.
 */
export async function stageA(
  db: Queryable,
  mask: Uint32Array,
  limit = STAGE_A_LIMIT,
): Promise<string[]> {
  const arr = maskToArray(mask);
  const empty = arr.every((w) => w === 0);
  if (empty) {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM v_class_a_literature_premises LIMIT $1`,
      [limit],
    );
    return res.rows.map((r) => r.id);
  }
  const terms = arr
    .map((w, i) => (w === 0 ? null : `(context_mask[${i + 1}] & ${w}) <> 0`))
    .filter(Boolean)
    .join(" OR ");
  const res = await db.query<{ id: string }>(
    `SELECT id FROM v_class_a_literature_premises WHERE ${terms} LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => r.id);
}

/**
 * Stage B — HNSW cosine over the Stage A set. ef_search is set per call; it is a session
 * GUC, so it is restored to its default afterwards rather than leaking into the pool.
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
  await db.query(`SET LOCAL hnsw.ef_search = ${ef}`);
  const res = await db.query<{
    id: string;
    premise: string;
    cluster: string;
    similarity: number;
  }>(
    `SELECT id, premise, cluster, 1 - (embedding <=> $1::vector) AS similarity
     FROM v_class_a_literature_premises
     WHERE id = ANY($2::text[]) AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [toVectorLiteral(embedding), [...candidateIds], limit],
  );
  return res.rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
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
