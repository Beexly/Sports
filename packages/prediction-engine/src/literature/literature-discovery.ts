/**
 * @file literature-discovery.ts
 * Discovery over the broader raw corpus.
 *
 * The structured premise index holds 5,434 records (5,149 MIND + 285 model
 * premises). The broader raw corpus holds the arXiv / OpenAlex / Kaggle
 * dumps — tens of thousands of papers that were ingested as research but
 * never structured into a premise.
 *
 * The rule this module enforces: a raw item becomes a structured premise
 * only when retrieval surfaces it REPEATEDLY. A paper that appears once in
 * the top-k is noise. A paper that keeps appearing across many distinct
 * events is a premise the literature is pointing at.
 *
 * That is the difference between indexing everything and evaluating
 * everything. The index is cheap and broad; evaluation is expensive and
 * narrow, and it is spent only where the retrieval evidence justifies it.
 */

import { vectorLiteral, type SqlClient } from "./literature-index-builder.js";
import type { Embedder } from "./literature-embeddings.js";

/** How many distinct retrieval events must surface an item before it is structured. */
export const DEFAULT_DISCOVERY_THRESHOLD = 3;

/** How many distinct events must have fired on an item. */
export interface DiscoveryCandidate {
  readonly corpus_id: string;
  readonly corpus_key: string;
  readonly title: string | null;
  readonly source: string;
  readonly abstract: string | null;
  readonly url: string | null;
  readonly hit_count: number;
  readonly distinct_events: number;
  readonly max_similarity: number;
}

/**
 * Find raw corpus items that retrieval keeps surfacing.
 *
 * `hit_count` is incremented on every retrieval hit, so a single event that
 * returns the same item twenty times does not look like twenty independent
 * confirmations. `distinct_events` counts the DISTINCT retrieval events, which
 * is the honest measure of "retrieval keeps pointing here".
 */
export async function findDiscoveryCandidates(
  db: SqlClient,
  opts?: {
    readonly minDistinctEvents?: number;
    readonly minHits?: number;
    readonly limit?: number;
    readonly since?: Date;
  },
): Promise<DiscoveryCandidate[]> {
  const minDistinctEvents = opts?.minDistinctEvents ?? DEFAULT_DISCOVERY_THRESHOLD;
  const minHits = opts?.minHits ?? minDistinctEvents;
  const limit = opts?.limit ?? 200;

  const res = await db.query(
    `SELECT c.id::text        AS corpus_id,
            c.corpus_key,
            c.title,
            c.source,
            c.abstract,
            c.url,
            c.hit_count,
            COUNT(DISTINCT e.retrieval_event_id)::int AS distinct_events,
            MAX(e.max_similarity)                   AS max_similarity
       FROM lit.corpus_item c
       LEFT JOIN lit.discovery_hit e ON e.corpus_id = c.id
       ${opts?.since ? `WHERE e.triggered_at >= $4` : ""}
      GROUP BY c.id, c.corpus_key, c.title, c.source, c.abstract, c.url, c.hit_count
     HAVING COUNT(DISTINCT e.retrieval_event_id) >= $1
        AND c.hit_count >= $2
        AND c.structured_at IS NULL
      ORDER BY COUNT(DISTINCT e.retrieval_event_id) DESC, c.hit_count DESC
      LIMIT $3`,
    opts?.since
      ? [minDistinctEvents, minHits, limit, opts.since]
      : [minDistinctEvents, minHits, limit],
  );

  return res.rows as DiscoveryCandidate[];
}

/**
 * Record that a corpus item was surfaced by a retrieval event.
 *
 * The `lit.discovery_hit` table is the evidence trail: it is what makes
 * "surfaced repeatedly" a measured fact rather than a claim.
 */
export async function recordDiscoveryHit(
  db: SqlClient,
  input: {
    readonly corpus_id: string;
    readonly retrieval_event_id: string;
    readonly similarity: number;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO lit.discovery_hit (corpus_id, retrieval_event_id, similarity)
     VALUES ($1, $2, $3)
     ON CONFLICT (corpus_id, retrieval_event_id) DO UPDATE
       SET similarity = GREATEST(lit.discovery_hit.similarity, EXCLUDED.similarity)`,
    [input.corpus_id, input.retrieval_event_id, input.similarity],
  );
  await db.query(
    `UPDATE lit.corpus_item
        SET hit_count = hit_count + 1, last_hit_at = now()
      WHERE id = $1`,
    [input.corpus_id],
  );
}

/**
 * Promote a raw corpus item into a structured premise.
 *
 * The premise inherits the corpus item's title/abstract as its evidence
 * quote. It does NOT get a numeric claim: the raw corpus has not been
 * parsed for one, and inventing one would be the exact failure the whole
 * project has been fighting. A promoted discovery premise therefore starts
 * with activation_score 0 and earns its weight only through residual
 * feedback after it has been activated and settled.
 */
export async function promoteDiscoveryToPremise(
  db: SqlClient,
  corpusKey: string,
): Promise<{ premise_key: string; id: string } | null> {
  const cRes = await db.query(
    `SELECT id::text, corpus_key, source, title, abstract, url, authors, published_date
       FROM lit.corpus_item WHERE corpus_key = $1`,
    [corpusKey],
  );
  const c = cRes.rows[0] as
    | { id: string; corpus_key: string; source: string; title: string | null; abstract: string | null; url: string | null; authors: string | null; published_date: string | null }
    | undefined;
  if (!c) return null;

  const premiseKey = `discovered:${c.corpus_key}`;
  const res = await db.query(
    `INSERT INTO lit.premise (
        premise_key, source, source_ref, title, principle, domain, claim_type,
        evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
        source_file, structure_state, content_hash, updated_at
     ) VALUES ($1,$2,$3,$4,$5,'discovered',$6,$7,$8,'{}','{}',$9,'structured',$10, now())
     ON CONFLICT (premise_key) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [
      premiseKey,
      `discovered_${c.source}`,
      c.corpus_key,
      c.title ?? c.corpus_key,
      c.title,
      "discovered",
      c.abstract ?? null,
      "Surfaced by repeated retrieval from the raw corpus. Not yet parsed for a numeric claim; "
        + "it earns activation weight only through residual feedback after it is graded.",
      c.url ?? c.corpus_key,
      `corpus:${c.corpus_key}`,
    ],
  );
  const id = (res.rows[0] as { id: string }).id;

  // Copy the vector over so the newly structured premise is immediately
  // retrievable on the same index.
  await db.query(
    `INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
     SELECT $1, embedding, embedding_model FROM lit.corpus_item WHERE id = $2
     ON CONFLICT (premise_id) DO UPDATE
       SET embedding = EXCLUDED.embedding, embedded_at = now()`,
    [id, c.id],
  );

  await db.query(
    `UPDATE lit.corpus_item SET structured_at = now() WHERE id = $1`,
    [c.id],
  );

  return { premise_key: premiseKey, id };
}

/**
 * Run one discovery sweep: find repeatedly-surfaced raw items and structure
 * them.
 */
export async function runDiscoverySweep(
  db: SqlClient,
  embedder: Embedder,
  opts?: {
    readonly minDistinctEvents?: number;
    readonly limit?: number;
    readonly onProgress?: (done: number, total: number) => void;
  },
): Promise<{
  candidates: number;
  promoted: number;
  promotedKeys: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const candidates = await findDiscoveryCandidates(db, {
    minDistinctEvents: opts?.minDistinctEvents,
    limit: opts?.limit,
  });

  const promotedKeys: string[] = [];
  let promoted = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!candidate) continue;
    try {
      const out = await promoteDiscoveryToPremise(db, candidate.corpus_key);
      if (out) {
        promoted += 1;
        promotedKeys.push(out.premise_key);
      }
    } catch (err) {
      errors.push(
        `${candidate.corpus_key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    opts?.onProgress?.(i + 1, candidates.length);
  }

  return { candidates: candidates.length, promoted, promotedKeys, errors };
}

export { vectorLiteral };
