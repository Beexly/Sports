/**
 * @file corpus-grounding.ts
 * Stage-2 corpus grounding over the PROSE corpus.
 *
 * Why this exists: until 2026-11-12 the engine's only literature path was
 * `retrieveForEvent`, which reads `lit.premise` (~1.1k rows). The corpus
 * Hermes loaded — 277k+ embedded chunks across ~2.5k documents, 72.8k book
 * statements and 1.4k evidence-quoted football situations — was not wired to
 * anything. 86.5% of that corpus is prose, not equations, so a grounding path
 * that only reads equations reads almost none of it.
 *
 * What it does, per situational facet of a game:
 *   1. lit.situation        — full-text match on situation/decision/lesson.
 *   2. lit.corpus_statement — full-text match, sports-tagged rows boosted.
 *   3. lit.corpus_chunk     — HNSW nearest neighbours. Query vector comes from
 *                             a bge-m3 embedder when one is supplied; otherwise
 *                             it is SEEDED from the chunk behind the best
 *                             situation hit (same embedding space, no model
 *                             mismatch). Mode is reported, never hidden.
 *
 * Laws:
 *   - READ-ONLY. No writes. No probability is changed here. The output is
 *     evidence + a support score for the Stage-2 overlay to consume; moving a
 *     number still goes through the activation path (literature-retrieval.ts
 *     law 2) and Stage 5's gate.
 *   - Every evidence item carries its citation (corpus key + chunk/page) and
 *     the quoted text. No quote, no evidence.
 *   - A failed layer is reported in `layerErrors`, never silently zero.
 *   - Embedding model must match the index (baai/bge-m3, 1024-d). A
 *     mismatched embedder is refused rather than queried.
 *   - A seed key must EXIST in lit.corpus_chunk with an embedding before it
 *     seeds a scan (md5 keys never do); otherwise the facet falls back to a
 *     cached bge-m3 query embedding or reports no chunk evidence.
 *   - Chunks/titles self-identifying as synthetic-data or prototype are
 *     downweighted 0.25x: scaffolding is not evidence about real games.
 */

import { LITERATURE_EMBEDDING_DIM, LITERATURE_EMBEDDING_MODEL, type Embedder } from "./literature-embeddings.js";
import { vectorLiteral } from "./literature-index-builder.js";
import type { SqlClient } from "./literature-retrieval.js";
import { slateCorpusCache, type SlateCorpusCache } from "./slate-corpus-cache.js";
import { runSeededInTransaction } from "./sql-batch.js";

/** The six situational families from the Stage-2 doctrine, plus open-ended. */
export type SituationalFamily =
  | "pressure"
  | "weather"
  | "restFatigue"
  | "coveragePersonnel"
  | "qbSkillScript"
  | "marketMicrostructure"
  | "other";

export interface GroundingFacet {
  readonly family: SituationalFamily;
  /** Plain-language description of the spot, e.g. "short week road team, 4th down short yardage". */
  readonly query: string;
  /** Prior importance of this facet for the game (0..1). Defaults to 1. */
  readonly weight?: number;
  /**
   * Words that make a hit ABOUT this facet (e.g. weather: wind, cold, rain).
   * When given, every hit must contain at least one, and full-text search runs
   * on the anchors only. Added after the v3 live smoke: generic football words
   * ("passing", "kicking", "game") let 1890s line-play passages ground the
   * weather facet at 0.63.
   */
  readonly anchors?: readonly string[];
}

export type EvidenceLayer = "situation" | "statement" | "chunk";

export interface GroundingEvidence {
  readonly layer: EvidenceLayer;
  readonly citation: string;
  readonly title: string | null;
  readonly text: string;
  readonly domain: string | null;
  /** Raw relevance from the layer (ts_rank_cd or cosine similarity). */
  readonly relevance: number;
  /** Final evidence weight in [0,1] after normalisation and layer trust. */
  readonly weight: number;
  /** True when the source self-identifies as synthetic-data/prototype (0.25x weight). */
  readonly synthetic?: boolean;
}

export interface FacetGrounding {
  readonly family: SituationalFamily;
  readonly query: string;
  readonly facetWeight: number;
  /** Noisy-OR of evidence weights, in [0,1]. 0 = the corpus says nothing. */
  readonly support: number;
  readonly evidence: readonly GroundingEvidence[];
  readonly chunkMode: "embedded" | "seeded" | "none";
  readonly layerErrors: readonly string[];
}

export interface GameGrounding {
  readonly gameId: string | null;
  readonly facets: readonly FacetGrounding[];
  /** Facet-weighted mean support. */
  readonly overallSupport: number;
  /** Share of facets with at least one evidence item. */
  readonly coverage: number;
  readonly latencyMs: number;
}

/**
 * Trust per layer. Situations are model-extracted but each carries a verbatim
 * evidence quote; book statements are verbatim text; chunks are raw passages
 * matched by vector only.
 */
export const LAYER_TRUST: Readonly<Record<EvidenceLayer, number>> = {
  situation: 1.0,
  statement: 0.7,
  chunk: 0.6,
};

/** Sports-tagged statements are directly on-topic. */
export const SPORTS_STATEMENT_BOOST = 1.25;

/** Chunk cosine similarity below this is not evidence. */
export const MIN_CHUNK_SIMILARITY = 0.45;

/** ts_rank_cd saturates; this maps rank r to r/(r+k). */
export const RANK_HALF_SATURATION = 0.1;

export const DEFAULT_PER_LAYER_K = 5;

/**
 * A hit must share at least this share of the facet's content words.
 * Measured on the 2026-11-12 live smoke: without it "betting line movement"
 * matched "goal line" stories (1 of 6 terms) at full weight.
 */
export const MIN_TERM_COVERAGE = 0.4;

/**
 * ...or share at least this many distinct content terms. Added after the v2
 * live smoke: long facet queries (7 terms) dropped genuine fatigue hits that
 * matched 2 terms (29% < 40%). A single shared word still never qualifies.
 */
export const MIN_TERMS_MATCHED = 2;

/** Support combines only the strongest items, so volume alone cannot saturate it. */
export const SUPPORT_TOP_N = 3;

const STOPWORDS = new Set(["the", "a", "an", "of", "and", "or", "in", "on", "to", "for", "with", "vs", "at", "by", "is"]);

export function contentTerms(q: string): string[] {
  return Array.from(new Set(sanitiseQuery(q).toLowerCase().split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w))));
}

/** Crude stem: first 4 chars, so "fatigue"/"fatigued", "rushing"/"rush" align. */
function stem(w: string): string {
  return w.slice(0, Math.min(4, w.length));
}

/** Share of the query's content terms that appear (by stem) in `text`. */
export function termMatch(query: string, text: string): { matched: number; coverage: number } {
  const terms = contentTerms(query);
  if (!terms.length) return { matched: 0, coverage: 0 };
  const words = new Set(sanitiseQuery(text).toLowerCase().split(" ").map(stem));
  const matched = new Set(terms.map(stem).filter((t) => words.has(t))).size;
  const total = new Set(terms.map(stem)).size;
  return { matched, coverage: Number((matched / total).toFixed(6)) };
}

export function termCoverage(query: string, text: string): number {
  return termMatch(query, text).coverage;
}

/** Relevance gate: >=40% of facet terms, or >=2 distinct terms. One word never passes. */
export function isRelevant(query: string, text: string): boolean {
  const m = termMatch(query, text);
  return m.matched >= MIN_TERMS_MATCHED || (m.matched >= 1 && m.coverage >= MIN_TERM_COVERAGE && contentTerms(query).length <= 2);
}

/** Cap on any single evidence weight, so one hit cannot claim certainty. */
export const MAX_EVIDENCE_WEIGHT = 0.6;

export function saturateRank(rank: number): number {
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  return rank / (rank + RANK_HALF_SATURATION);
}

/** Map cosine similarity above the floor onto [0,1]. */
export function normaliseSimilarity(sim: number): number {
  if (!Number.isFinite(sim) || sim < MIN_CHUNK_SIMILARITY) return 0;
  return Math.min(1, (sim - MIN_CHUNK_SIMILARITY) / (1 - MIN_CHUNK_SIMILARITY));
}

export function evidenceWeight(layer: EvidenceLayer, normalisedRelevance: number, boost = 1): number {
  const w = normalisedRelevance * LAYER_TRUST[layer] * boost;
  return Number(Math.max(0, Math.min(MAX_EVIDENCE_WEIGHT, w)).toFixed(6));
}

/** Noisy-OR: independent pieces of support combine without exceeding 1. */
export function noisyOr(weights: readonly number[]): number {
  let miss = 1;
  for (const w of weights) miss *= 1 - Math.max(0, Math.min(1, w));
  return Number((1 - miss).toFixed(6));
}

interface SituationRow {
  corpus_key: string;
  chunk_index: number;
  domain: string | null;
  situation: string;
  decision: string;
  lesson: string;
  evidence_quote: string;
  rank: number;
}

interface StatementRow {
  book: string | null;
  page: number | null;
  md5: string | null;
  statement: string;
  domain_tags: string[] | null;
  rank: number;
}

interface ChunkRow {
  corpus_key: string;
  chunk_index: number;
  title: string | null;
  chunk_text: string;
  similarity: number;
}

const SITUATION_SQL = `
  SELECT corpus_key, chunk_index, domain, situation, decision, lesson, evidence_quote,
         ts_rank_cd(to_tsvector('english', situation || ' ' || decision || ' ' || lesson),
                    websearch_to_tsquery('english', $1)) AS rank
    FROM lit.situation
   WHERE to_tsvector('english', situation || ' ' || decision || ' ' || lesson)
         @@ websearch_to_tsquery('english', $1)
   ORDER BY rank DESC
   LIMIT $2`;

const STATEMENT_SQL = `
  SELECT book, page, md5, statement, domain_tags,
         ts_rank_cd(to_tsvector('english', statement), websearch_to_tsquery('english', $1)) AS rank
    FROM lit.corpus_statement
   WHERE to_tsvector('english', statement) @@ websearch_to_tsquery('english', $1)
   ORDER BY rank DESC
   LIMIT $2`;

const CHUNK_BY_VECTOR_SQL = `
  SELECT corpus_key, chunk_index, title, chunk_text,
         (1 - (embedding <=> $1::vector))::float8 AS similarity
    FROM lit.corpus_chunk
   WHERE embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector
   LIMIT $2`;

/**
 * Seeded nearest-neighbour search (T-02 fix).
 *
 * The seed is an UNCORRELATED scalar subquery repeated inside ORDER BY, which
 * the planner lifts into a single InitPlan: `Index Scan using
 * corpus_chunk_hnsw_idx ... Order By (embedding <=> (InitPlan))`. The earlier
 * CTE form (`WITH seed AS ... (SELECT embedding FROM seed)`) could not be
 * lifted — the CTE scan made the ordering expression a per-row SubPlan, which
 * defeated the HNSW index (reported cost 68496.65, 60s timeout). Measured live
 * on Neon after this rewrite: EXPLAIN total cost ~3.2k, sub-second latency.
 *
 * Guards:
 *   - `(SELECT s.embedding ...) IS NOT NULL` short-circuits a missing/NULL
 *     seed to ZERO rows fast (a NULL seed would otherwise order the whole
 *     table arbitrarily). Callers also existence-check the key first
 *     (SEED_EXISTS_SQL) so an md5-shaped key never even reaches this query.
 *   - `set_config('hnsw.ef_search','128',true)` runs as an InitPlan inside the
 *     statement's own transaction, BEFORE the HNSW scan starts: higher recall
 *     than the default 40, and `is_local => true` means it cannot leak onto a
 *     pooled connection. TCP clients may instead wrap this in an explicit
 *     BEGIN/COMMIT batch via runSeededInTransaction (sql-batch.ts).
 */
export const CHUNK_SEEDED_SQL = `
  SELECT c.corpus_key, c.chunk_index, c.title, c.chunk_text,
         (1 - (c.embedding <=> (SELECT s.embedding FROM lit.corpus_chunk s
                                 WHERE s.corpus_key = $1 AND s.chunk_index = $2
                                   AND s.embedding IS NOT NULL LIMIT 1)))::float8 AS similarity
    FROM lit.corpus_chunk c
   WHERE c.embedding IS NOT NULL
     AND (SELECT set_config('hnsw.ef_search', '128', true)) IS NOT NULL
     AND (SELECT s.embedding FROM lit.corpus_chunk s
           WHERE s.corpus_key = $1 AND s.chunk_index = $2
             AND s.embedding IS NOT NULL LIMIT 1) IS NOT NULL
     AND NOT (c.corpus_key = $1 AND c.chunk_index = $2)
   ORDER BY c.embedding <=> (SELECT s.embedding FROM lit.corpus_chunk s
                              WHERE s.corpus_key = $1 AND s.chunk_index = $2
                                AND s.embedding IS NOT NULL LIMIT 1)
   LIMIT $3`;

/**
 * Seed-key existence guard. lit.corpus_chunk stores sha256 corpus keys; some
 * callers (statement-derived situations) carry md5 keys that can never match.
 * This is a btree-only probe on corpus_chunk_unique — sub-millisecond — and it
 * also requires a non-NULL embedding, so a NULL-embedding seed is rejected
 * here instead of scanning. No row => do NOT run the seeded query.
 */
export const SEED_EXISTS_SQL = `
  SELECT 1 AS ok
    FROM lit.corpus_chunk
   WHERE corpus_key = $1 AND chunk_index = $2 AND embedding IS NOT NULL
   LIMIT 1`;

/** Shape of a corpus key. The chunk index is keyed by sha256 hex (64 chars). */
export function corpusKeyShape(key: string): "sha256" | "md5" | "other" {
  if (/^[0-9a-f]{64}$/i.test(key)) return "sha256";
  if (/^[0-9a-f]{32}$/i.test(key)) return "md5";
  return "other";
}

/** True when the seed key exists in lit.corpus_chunk WITH an embedding. */
export async function seedKeyExists(
  db: SqlClient,
  seed: { readonly corpus_key: string; readonly chunk_index: number },
): Promise<boolean> {
  const res = await db.query(SEED_EXISTS_SQL, [seed.corpus_key, seed.chunk_index]);
  return res.rows.length > 0;
}

/**
 * Chunks/titles that self-identify as synthetic or prototype content are
 * downweighted 0.25x in scoring: they are scaffolding, not evidence about
 * real games. The label must be self-applied (in the title or the text).
 */
export const SYNTHETIC_DOWNWEIGHT = 0.25;
const SYNTHETIC_SELF_LABEL = /\bsynthetic[-_ ]?data\b|\bprototypes?\b/i;
export function isSyntheticSelfLabel(title: string | null | undefined, text?: string | null): boolean {
  return SYNTHETIC_SELF_LABEL.test(title ?? "") || SYNTHETIC_SELF_LABEL.test(text ?? "");
}

function clip(text: string, n = 600): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Strip characters websearch_to_tsquery would treat as syntax noise. */
export function sanitiseQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Websearch syntax ANDs every term, which over-constrains a descriptive facet
 * query. OR the content words instead; ranking still rewards matching more.
 */
export function toOrQuery(q: string): string {
  return contentTerms(q).join(" or ");
}

export async function groundFacet(
  db: SqlClient,
  facet: GroundingFacet,
  opts?: {
    readonly embedder?: Embedder | null;
    readonly embedderModel?: string;
    readonly perLayerK?: number;
    /** Query-embedding cache for the bge-m3 fallback. Defaults to the shared slate cache. */
    readonly cache?: SlateCorpusCache;
  },
): Promise<FacetGrounding> {
  const k = opts?.perLayerK ?? DEFAULT_PER_LAYER_K;
  const facetWeight = Math.max(0, Math.min(1, facet.weight ?? 1));
  const anchors = (facet.anchors ?? []).map((a) => a.toLowerCase()).filter(Boolean);
  const q = anchors.length ? toOrQuery(anchors.join(" ")) : toOrQuery(facet.query);
  const anchored = (text: string): boolean => {
    if (!anchors.length) return true;
    const words = new Set(sanitiseQuery(text).toLowerCase().split(" ").map(stem));
    return anchors.some((a) => words.has(stem(a)));
  };
  const evidence: GroundingEvidence[] = [];
  const layerErrors: string[] = [];
  let chunkMode: FacetGrounding["chunkMode"] = "none";
  let seed: { corpus_key: string; chunk_index: number } | null = null;

  if (!q) {
    return { family: facet.family, query: facet.query, facetWeight, support: 0, evidence, chunkMode, layerErrors: ["empty query"] };
  }

  const [sitRes, stmtRes] = await Promise.allSettled([
    db.query(SITUATION_SQL, [q, k * 2]),
    db.query(STATEMENT_SQL, [q, k * 2]),
  ]);

  try {
    if (sitRes.status === "rejected") throw sitRes.reason;
    const res = sitRes.value;
    for (const r of res.rows as SituationRow[]) {
      if (!r.evidence_quote || !r.evidence_quote.trim()) continue; // no quote, no evidence
      const sitText = `${r.situation} ${r.decision} ${r.lesson}`;
      if (!anchored(sitText) || !isRelevant(facet.query, sitText)) continue;
      const cov = Math.max(0.4, termCoverage(facet.query, sitText));
      seed ??= { corpus_key: r.corpus_key, chunk_index: r.chunk_index };
      evidence.push({
        layer: "situation",
        citation: `lit.situation:${r.corpus_key.slice(0, 12)}#${r.chunk_index}`,
        title: null,
        text: clip(`${r.situation} -> ${r.decision}. Lesson: ${r.lesson} Quote: "${r.evidence_quote}"`),
        domain: r.domain,
        relevance: Number(r.rank),
        weight: evidenceWeight("situation", cov * saturateRank(Number(r.rank))),
      });
    }
  } catch (e) {
    layerErrors.push(`situation: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    if (stmtRes.status === "rejected") throw stmtRes.reason;
    const res = stmtRes.value;
    for (const r of res.rows as StatementRow[]) {
      const sports = Array.isArray(r.domain_tags) && r.domain_tags.includes("sports");
      if (!anchored(r.statement) || !isRelevant(facet.query, r.statement)) continue;
      const cov = Math.max(0.4, termCoverage(facet.query, r.statement));
      evidence.push({
        layer: "statement",
        citation: `lit.corpus_statement:${(r.md5 ?? "?").slice(0, 12)}p${r.page ?? "?"}`,
        title: r.book,
        text: clip(r.statement),
        domain: sports ? "sports" : (r.domain_tags?.[0] ?? null),
        relevance: Number(r.rank),
        weight: evidenceWeight("statement", cov * saturateRank(Number(r.rank)), sports ? SPORTS_STATEMENT_BOOST : 1),
      });
    }
  } catch (e) {
    layerErrors.push(`statement: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    let rows: ChunkRow[] = [];
    const embedder = opts?.embedder ?? null;
    const model = opts?.embedderModel ?? LITERATURE_EMBEDDING_MODEL;
    const cache = opts?.cache ?? slateCorpusCache;
    let vector: number[] | null = null;
    if (embedder && model !== LITERATURE_EMBEDDING_MODEL) {
      layerErrors.push(`chunk: refused embedder model ${model}; index is ${LITERATURE_EMBEDDING_MODEL}`);
    } else if (embedder) {
      // Batched/cached bge-m3 query embedding (slate-corpus-cache). A failed
      // embed is null, never a zero vector; the seeded path below is the fallback.
      const [v] = await cache.embedQueries([facet.query], embedder);
      if (v && v.length === LITERATURE_EMBEDDING_DIM) {
        vector = v;
      } else {
        layerErrors.push("chunk: embedding failed (provider error, empty text, or non-1024-dim vector)");
      }
    }
    if (vector) {
      rows = (await db.query(CHUNK_BY_VECTOR_SQL, [vectorLiteral(vector), k])).rows as ChunkRow[];
      chunkMode = "embedded";
    } else if (seed) {
      // SEED GUARD: only seed from a key that actually exists in lit.corpus_chunk
      // with an embedding. md5-shaped keys (statement-derived situations) are not
      // in the sha256-keyed chunk table; seeding from them is a wasted scan at best.
      let seedUsable = false;
      try {
        seedUsable = await seedKeyExists(db, seed);
        if (!seedUsable) {
          layerErrors.push(
            `chunk: seed key ${seed.corpus_key.slice(0, 12)}… (${corpusKeyShape(seed.corpus_key)}) not in lit.corpus_chunk with an embedding; seeded scan skipped`,
          );
        }
      } catch (e) {
        layerErrors.push(`chunk: seed existence check failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (seedUsable) {
        rows = (await runSeededInTransaction(db, CHUNK_SEEDED_SQL, [seed.corpus_key, seed.chunk_index, k])).rows as ChunkRow[];
        chunkMode = "seeded";
      }
    }
    for (const r of rows) {
      const n = normaliseSimilarity(Number(r.similarity));
      if (n <= 0) continue;
      // Seeded neighbours inherit the seed's topic; require they still speak to the facet.
      if (!anchored(r.chunk_text)) continue;
      if (chunkMode === "seeded" && !isRelevant(facet.query, r.chunk_text)) continue;
      const synthetic = isSyntheticSelfLabel(r.title, r.chunk_text);
      evidence.push({
        layer: "chunk",
        citation: `lit.corpus_chunk:${r.corpus_key.slice(0, 12)}#${r.chunk_index}`,
        title: r.title,
        text: clip(r.chunk_text),
        domain: null,
        relevance: Number(r.similarity),
        weight: evidenceWeight("chunk", n) * (synthetic ? SYNTHETIC_DOWNWEIGHT : 1),
        ...(synthetic ? { synthetic: true } : {}),
      });
    }
  } catch (e) {
    layerErrors.push(`chunk: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Keep at most k per layer after relevance filtering.
  const perLayer: Record<EvidenceLayer, number> = { situation: 0, statement: 0, chunk: 0 };
  evidence.sort((a, b) => b.weight - a.weight);
  const kept = evidence.filter((e) => (perLayer[e.layer] += 1) <= k);
  evidence.length = 0;
  evidence.push(...kept);
  return {
    family: facet.family,
    query: facet.query,
    facetWeight,
    support: noisyOr(evidence.slice(0, SUPPORT_TOP_N).map((e) => e.weight)),
    evidence,
    chunkMode,
    layerErrors,
  };
}

export async function groundGame(
  db: SqlClient,
  gameId: string | null,
  facets: readonly GroundingFacet[],
  opts?: { readonly embedder?: Embedder | null; readonly embedderModel?: string; readonly perLayerK?: number },
): Promise<GameGrounding> {
  const started = Date.now();
  const out = await Promise.all(facets.map((f) => groundFacet(db, f, opts)));
  const wSum = out.reduce((s, f) => s + f.facetWeight, 0);
  const overall = wSum > 0 ? out.reduce((s, f) => s + f.support * f.facetWeight, 0) / wSum : 0;
  const covered = out.filter((f) => f.evidence.length > 0).length;
  return {
    gameId,
    facets: out,
    overallSupport: Number(overall.toFixed(6)),
    coverage: out.length ? Number((covered / out.length).toFixed(6)) : 0,
    latencyMs: Date.now() - started,
  };
}

/** Floor on the delta multiplier: a family with zero corpus support keeps half its delta. */
export const UNSUPPORTED_FAMILY_FLOOR = 0.5;

export interface FamilyGroundingAdjustment {
  readonly family: string;
  readonly support: number;
  readonly multiplier: number;
  readonly before: number;
  readonly after: number;
}

/**
 * Scale situational family deltas by corpus support.
 *
 * multiplier = FLOOR + (1 - FLOOR) * support, in [0.5, 1].
 *
 * The corpus says whether a situational mechanism is documented, not which
 * way tonight's number should move. So support may only SHRINK an
 * undocumented family toward zero; it never grows, flips or creates a delta.
 * Families without a grounding facet are left untouched (absence is not
 * evidence against). Multiple facets of the same family: strongest support.
 */
export function applyCorpusGroundingToFamilyDeltas<K extends string>(
  deltas: Partial<Record<K, number | readonly number[]>>,
  grounding: GameGrounding | null | undefined,
): { deltas: Partial<Record<K, number | readonly number[]>>; adjustments: FamilyGroundingAdjustment[] } {
  if (!grounding) return { deltas, adjustments: [] };
  const best = new Map<string, number>();
  for (const f of grounding.facets) {
    if (f.layerErrors.length && f.evidence.length === 0) continue; // a failed lookup is not "no support"
    best.set(f.family, Math.max(best.get(f.family) ?? 0, f.support));
  }
  const out: Partial<Record<K, number | readonly number[]>> = { ...deltas };
  const adjustments: FamilyGroundingAdjustment[] = [];
  for (const key of Object.keys(deltas) as K[]) {
    const support = best.get(key);
    const d = deltas[key];
    if (support === undefined || d === undefined) continue;
    const m = Number((UNSUPPORTED_FAMILY_FLOOR + (1 - UNSUPPORTED_FAMILY_FLOOR) * Math.max(0, Math.min(1, support))).toFixed(6));
    const scaled = Array.isArray(d) ? (d as readonly number[]).map((v) => v * m) : (d as number) * m;
    const sum = (x: number | readonly number[]) => (Array.isArray(x) ? (x as readonly number[]).reduce((a, b) => a + b, 0) : (x as number));
    out[key] = scaled;
    adjustments.push({ family: key, support, multiplier: m, before: sum(d), after: sum(scaled) });
  }
  return { deltas: out, adjustments };
}
