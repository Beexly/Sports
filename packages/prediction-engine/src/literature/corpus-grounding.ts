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
 */

import { LITERATURE_EMBEDDING_DIM, LITERATURE_EMBEDDING_MODEL, type Embedder } from "./literature-embeddings.js";
import { vectorLiteral } from "./literature-index-builder.js";
import type { SqlClient } from "./literature-retrieval.js";

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
export function termCoverage(query: string, text: string): number {
  const terms = contentTerms(query);
  if (!terms.length) return 0;
  const words = new Set(sanitiseQuery(text).toLowerCase().split(" ").map(stem));
  const hit = terms.filter((t) => words.has(stem(t))).length;
  return Number((hit / terms.length).toFixed(6));
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
   ORDER BY ('sports' = ANY(domain_tags)) DESC, rank DESC
   LIMIT $2`;

const CHUNK_BY_VECTOR_SQL = `
  SELECT corpus_key, chunk_index, title, chunk_text,
         (1 - (embedding <=> $1::vector))::float8 AS similarity
    FROM lit.corpus_chunk
   WHERE embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector
   LIMIT $2`;

const CHUNK_SEEDED_SQL = `
  WITH seed AS (
    SELECT embedding FROM lit.corpus_chunk
     WHERE corpus_key = $1 AND chunk_index = $2 AND embedding IS NOT NULL
     LIMIT 1)
  SELECT c.corpus_key, c.chunk_index, c.title, c.chunk_text,
         (1 - (c.embedding <=> seed.embedding))::float8 AS similarity
    FROM lit.corpus_chunk c, seed
   WHERE c.embedding IS NOT NULL
     AND NOT (c.corpus_key = $1 AND c.chunk_index = $2)
   ORDER BY c.embedding <=> seed.embedding
   LIMIT $3`;

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
  opts?: { readonly embedder?: Embedder | null; readonly embedderModel?: string; readonly perLayerK?: number },
): Promise<FacetGrounding> {
  const k = opts?.perLayerK ?? DEFAULT_PER_LAYER_K;
  const facetWeight = Math.max(0, Math.min(1, facet.weight ?? 1));
  const q = toOrQuery(facet.query);
  const evidence: GroundingEvidence[] = [];
  const layerErrors: string[] = [];
  let chunkMode: FacetGrounding["chunkMode"] = "none";
  let seed: { corpus_key: string; chunk_index: number } | null = null;

  if (!q) {
    return { family: facet.family, query: facet.query, facetWeight, support: 0, evidence, chunkMode, layerErrors: ["empty query"] };
  }

  try {
    const res = await db.query(SITUATION_SQL, [q, k]);
    for (const r of res.rows as SituationRow[]) {
      if (!r.evidence_quote || !r.evidence_quote.trim()) continue; // no quote, no evidence
      const cov = termCoverage(facet.query, `${r.situation} ${r.decision} ${r.lesson}`);
      if (cov < MIN_TERM_COVERAGE) continue;
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
    const res = await db.query(STATEMENT_SQL, [q, k]);
    for (const r of res.rows as StatementRow[]) {
      const sports = Array.isArray(r.domain_tags) && r.domain_tags.includes("sports");
      const cov = termCoverage(facet.query, r.statement);
      if (cov < MIN_TERM_COVERAGE) continue;
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
    if (embedder && model !== LITERATURE_EMBEDDING_MODEL) {
      layerErrors.push(`chunk: refused embedder model ${model}; index is ${LITERATURE_EMBEDDING_MODEL}`);
    } else if (embedder) {
      const emb = await embedder(facet.query);
      if (emb.ok && emb.embedding.length === LITERATURE_EMBEDDING_DIM) {
        rows = (await db.query(CHUNK_BY_VECTOR_SQL, [vectorLiteral(emb.embedding), k])).rows as ChunkRow[];
        chunkMode = "embedded";
      } else {
        layerErrors.push(`chunk: embedding failed: ${emb.ok ? "bad dim" : emb.error}`);
      }
    }
    if (chunkMode === "none" && seed) {
      rows = (await db.query(CHUNK_SEEDED_SQL, [seed.corpus_key, seed.chunk_index, k])).rows as ChunkRow[];
      chunkMode = "seeded";
    }
    for (const r of rows) {
      const n = normaliseSimilarity(Number(r.similarity));
      if (n <= 0) continue;
      // Seeded neighbours inherit the seed's topic; require they still speak to the facet.
      const cov = termCoverage(facet.query, r.chunk_text);
      if (chunkMode === "seeded" && cov < MIN_TERM_COVERAGE) continue;
      evidence.push({
        layer: "chunk",
        citation: `lit.corpus_chunk:${r.corpus_key.slice(0, 12)}#${r.chunk_index}`,
        title: r.title,
        text: clip(r.chunk_text),
        domain: null,
        relevance: Number(r.similarity),
        weight: evidenceWeight("chunk", n),
      });
    }
  } catch (e) {
    layerErrors.push(`chunk: ${e instanceof Error ? e.message : String(e)}`);
  }

  evidence.sort((a, b) => b.weight - a.weight);
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
  const out: FacetGrounding[] = [];
  for (const f of facets) out.push(await groundFacet(db, f, opts));
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
