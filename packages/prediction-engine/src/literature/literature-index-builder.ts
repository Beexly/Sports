/**
 * @file literature-index-builder.ts
 * Build the pgvector literature index from the repo's corpus files.
 *
 * Three corpora feed the index:
 *   1. MIND_CORPUS_3000.jsonl  -- 5,148 structured literature records
 *   2. bridge-premises.jsonl   -- 285 structured model premises (game_id x signal_id)
 *   3. the broader raw corpus  -- arXiv/OPENALEX/Kaggle JSON dumps, indexed for
 *      DISCOVERY only; a raw item becomes a structured premise only when
 *      retrieval surfaces it repeatedly.
 *
 * The builder is idempotent: premise_key / corpus_key are unique, and the
 * writer upserts. Re-running after a corpus refresh updates embeddings in
 * place rather than duplicating.
 *
 * It writes to the `lit` schema on a Neon branch. It never touches `public`.
 */

import { createHash } from "node:crypto";
import {
  LITERATURE_EMBEDDING_DIM,
  LITERATURE_EMBEDDING_MODEL,
  eventEmbeddingText,
  premiseEmbeddingText,
  type Embedder,
} from "./literature-embeddings.js";
import { derivePillars, pillarsForSignal, type LiteraturePillar } from "./literature-pillars.js";

/** Minimal structural type for a Postgres client (pg's Pool/Client both fit). */
export interface SqlClient {
  query(text: string, values?: readonly unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

/** A structured premise ready for indexing. */
export interface PremiseInput {
  readonly premise_key: string;
  readonly source: string;
  readonly source_ref?: string | null;
  readonly title: string;
  readonly principle?: string | null;
  readonly domain?: string | null;
  readonly claim_type?: string | null;
  readonly numeric_value?: number | null;
  readonly numeric_unit?: string | null;
  readonly numeric_metric?: string | null;
  readonly influence_direction?: string | null;
  readonly evidence_quote?: string | null;
  readonly how_it_influences?: string | null;
  readonly applicable_contexts?: readonly string[];
  readonly source_file?: string | null;
  readonly source_doc_hash?: string | null;
}

/** A raw corpus item for the discovery surface. */
export interface CorpusItemInput {
  readonly corpus_key: string;
  readonly source: string;
  readonly title?: string | null;
  readonly abstract?: string | null;
  readonly url?: string | null;
  readonly authors?: string | null;
  readonly published_date?: string | null;
}

/** A premise that was written, with its assigned id. */
export interface IndexedPremise {
  readonly premise_key: string;
  readonly id: string;
  readonly pillar_tags: readonly LiteraturePillar[];
  readonly embedded: boolean;
}

export interface BuildReport {
  readonly premises_seen: number;
  readonly premises_written: number;
  readonly premises_embedded: number;
  readonly premises_failed: number;
  readonly corpus_seen: number;
  readonly corpus_written: number;
  readonly corpus_embedded: number;
  readonly corpus_failed: number;
  readonly failures: readonly { readonly key: string; readonly error: string }[];
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Stable content hash used to detect a changed premise on re-index. */
export function premiseContentHash(p: PremiseInput): string {
  return sha256(
    JSON.stringify([
      p.title, p.principle, p.domain, p.claim_type, p.numeric_value,
      p.numeric_unit, p.numeric_metric, p.influence_direction,
      p.how_it_influences, p.evidence_quote, p.applicable_contexts,
    ]),
  );
}

/**
 * Map a MIND_CORPUS_3000 record onto a PremiseInput.
 *
 * The MIND corpus field names are snake_case and slightly inconsistent
 * (`principle_or_feature` vs `principle_name`), so the mapping is explicit
 * rather than a spread.
 */
export function mindRecordToPremise(rec: Record<string, unknown>): PremiseInput | null {
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return null;
  const itemId = typeof rec.item_id === "string" ? rec.item_id : "";
  const source = typeof rec.source === "string" ? rec.source : "unknown";
  const numeric = (rec.numeric_claim ?? null) as
    | { value?: number; unit?: string; metric?: string }
    | null;
  const principle =
    (typeof rec.principle_or_feature === "string" && rec.principle_or_feature) ||
    (typeof rec.principle_name === "string" && rec.principle_name) ||
    null;
  const contexts = Array.isArray(rec.applicable_contexts)
    ? rec.applicable_contexts.filter((x): x is string => typeof x === "string")
    : [];
  const howIt = (typeof rec.how_it_influences_reasoning === "string" && rec.how_it_influences_reasoning) ||
    (typeof rec.influence_description === "string" && rec.influence_description) ||
    null;

  return {
    premise_key: `mind:${itemId || sha256(title).slice(0, 16)}`,
    source,
    source_ref: itemId || null,
    title,
    principle,
    domain: typeof rec.domain === "string" ? rec.domain : null,
    claim_type: typeof rec.claim_type === "string" ? rec.claim_type : null,
    numeric_value: typeof numeric?.value === "number" ? numeric.value : null,
    numeric_unit: typeof numeric?.unit === "string" ? numeric.unit : null,
    numeric_metric: typeof numeric?.metric === "string" ? numeric.metric : null,
    influence_direction: typeof rec.influence_direction === "string" ? rec.influence_direction : null,
    evidence_quote: typeof rec.evidence_quote === "string" ? rec.evidence_quote : null,
    how_it_influences: howIt,
    applicable_contexts: contexts,
    source_file: typeof rec.source_file === "string" ? rec.source_file : null,
    source_doc_hash: typeof rec.source_doc_hash === "string" ? rec.source_doc_hash : null,
  };
}

/**
 * Map a bridge-premises record onto a PremiseInput.
 *
 * These are model premises, not literature: they are (game_id, signal_id)
 * -> (outcome, probability, sample_count) fits. They still belong in the
 * index because they are the things a signal must be checked against, but
 * they are tagged `source: 'bridge_premise'` so coverage can separate
 * literature from model premises.
 */
export function bridgeRecordToPremise(rec: Record<string, unknown>): PremiseInput | null {
  const gameId = typeof rec.game_id === "string" ? rec.game_id : "";
  const signalId = typeof rec.signal_id === "string" ? rec.signal_id : "";
  if (!gameId || !signalId) return null;
  const prob = typeof rec.probability === "number" ? rec.probability : null;
  const sampleCount = typeof rec.sample_count === "number" ? rec.sample_count : null;
  const method = typeof rec.method === "string" ? rec.method : "unknown";
  const outcome = typeof rec.outcome === "string" ? rec.outcome : "home";
  const sign = rec.home_sign && typeof rec.home_sign === "object" ? rec.home_sign : {};

  return {
    premise_key: `bridge:${gameId}:${signalId}`,
    source: "bridge_premise",
    source_ref: gameId,
    title: `${signalId} -> ${outcome} (${gameId})`,
    principle: `Model premise: ${signalId} predicts ${outcome}`,
    domain: "model_premise",
    claim_type: "model_fit",
    numeric_value: prob,
    numeric_unit: "probability",
    numeric_metric: signalId,
    influence_direction: outcome === "home" ? "positive" : "negative",
    evidence_quote: `Fitted by ${method} on n=${sampleCount ?? "?"}; logistic feature signs: ${JSON.stringify(sign)}`,
    how_it_influences:
      `Prior probability ${prob ?? "?"} for ${outcome}; sample count ${sampleCount ?? "?"}; method ${method}.`,
    applicable_contexts: [signalId],
    source_file: "data/gse-dataset/bridge-premises.jsonl",
    source_doc_hash: null,
  };
}

/**
 * The pillars for a bridge premise.
 *
 * A bridge premise is keyed on a SIGNAL (its metric is the signal id), so its
 * pillars are the pillars of that signal -- the same mapping the live
 * retrieval uses to scope an event. Deriving them from the signal id is
 * what makes a bridge premise retrievable by the signal it is about.
 *
 * Without this, a bridge premise gets NO pillars (its domain is
 * "model_premise" and its title is a game id), and a pillar-scoped
 * retrieval can never surface it. Measured on the first full build: 285
 * probability-claim premises, 0 ever activated.
 */
export function bridgePremisePillars(signalId: string): LiteraturePillar[] {
  return pillarsForSignal(signalId) ?? [];
}

/** Write one premise + its vector. Returns the premise id. */
async function upsertPremise(
  db: SqlClient,
  p: PremiseInput,
  embedding: number[] | null,
  pillarOverride?: readonly LiteraturePillar[],
): Promise<{ id: string; pillar_tags: LiteraturePillar[] }> {
  const pillars =
    pillarOverride && pillarOverride.length > 0
      ? [...pillarOverride]
      : derivePillars({
          domain: p.domain ?? null,
          applicableContexts: p.applicable_contexts ?? [],
          numericMetric: p.numeric_metric ?? null,
          principle: p.principle ?? null,
          title: p.title,
        });

  const res = await db.query(
    `INSERT INTO lit.premise (
        premise_key, source, source_ref, title, principle, domain, claim_type,
        numeric_value, numeric_unit, numeric_metric, influence_direction,
        evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
        source_file, source_doc_hash, structure_state, content_hash, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'structured',$18, now())
     ON CONFLICT (premise_key) DO UPDATE SET
        title=EXCLUDED.title, principle=EXCLUDED.principle, domain=EXCLUDED.domain,
        claim_type=EXCLUDED.claim_type, numeric_value=EXCLUDED.numeric_value,
        numeric_unit=EXCLUDED.numeric_unit, numeric_metric=EXCLUDED.numeric_metric,
        influence_direction=EXCLUDED.influence_direction,
        evidence_quote=EXCLUDED.evidence_quote,
        how_it_influences=EXCLUDED.how_it_influences,
        applicable_contexts=EXCLUDED.applicable_contexts,
        pillar_tags=EXCLUDED.pillar_tags, source_file=EXCLUDED.source_file,
        source_doc_hash=EXCLUDED.source_doc_hash, content_hash=EXCLUDED.content_hash,
        updated_at=now()
     RETURNING id`,
    [
      p.premise_key, p.source, p.source_ref ?? null, p.title, p.principle ?? null,
      p.domain ?? null, p.claim_type ?? null, p.numeric_value ?? null,
      p.numeric_unit ?? null, p.numeric_metric ?? null, p.influence_direction ?? null,
      p.evidence_quote ?? null, p.how_it_influences ?? null,
      p.applicable_contexts ?? [], pillars, p.source_file ?? null,
      p.source_doc_hash ?? null, premiseContentHash(p),
    ],
  );

  const id = (res.rows[0] as { id: string }).id;
  if (embedding) {
    await db.query(
      `INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
       VALUES ($1, $2::vector, $3)
       ON CONFLICT (premise_id) DO UPDATE
         SET embedding=EXCLUDED.embedding,
             embedding_model=EXCLUDED.embedding_model,
             embedded_at=now()`,
      [id, vectorLiteral(embedding), LITERATURE_EMBEDDING_MODEL],
    );
  }
  return { id, pillar_tags: pillars };
}

/** Serialize a numeric array as a pgvector literal. */
export function vectorLiteral(v: readonly number[]): string {
  if (v.length !== LITERATURE_EMBEDDING_DIM) {
    throw new Error(`vector dimension mismatch: got ${v.length}, expected ${LITERATURE_EMBEDDING_DIM}`);
  }
  return `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(",")}]`;
}

export interface BuildOptions {
  readonly db: SqlClient;
  readonly embedder: Embedder;
  /** Batch size for embedding calls. */
  readonly batchSize?: number;
  /** Cap on premises to embed (for a fast first pass). */
  readonly limit?: number | undefined;
  /** Also index the raw corpus for discovery. */
  readonly includeCorpus?: boolean;
  /** Cap on raw corpus items to embed. */
  readonly corpusLimit?: number | undefined;
  readonly onProgress?: (done: number, total: number, label: string) => void;
}

/**
 * Index a batch of premises.
 *
 * Embeddings are computed in batches but written one row at a time so a
 * single bad record cannot roll back the whole batch.
 */
export async function indexPremises(
  opts: BuildOptions,
  premises: readonly PremiseInput[],
): Promise<{ report: BuildReport; written: IndexedPremise[] }> {
  const { db, embedder } = opts;
  const batchSize = opts.batchSize ?? 16;
  const failures: { key: string; error: string }[] = [];
  const written: IndexedPremise[] = [];
  let embeddedCount = 0;

  const limited = opts.limit != null ? premises.slice(0, opts.limit) : premises;

  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const texts = batch.map((p) =>
      premiseEmbeddingText({
        title: p.title,
        principle: p.principle ?? null,
        domain: p.domain ?? null,
        claimType: p.claim_type ?? null,
        numericValue: p.numeric_value ?? null,
        numericUnit: p.numeric_unit ?? null,
        numericMetric: p.numeric_metric ?? null,
        influenceDirection: p.influence_direction ?? null,
        howItInfluences: p.how_it_influences ?? null,
        evidenceQuote: p.evidence_quote ?? null,
        applicableContexts: p.applicable_contexts ?? [],
      }),
    );

    const results = await Promise.all(texts.map((t) => embedder(t)));

    for (let j = 0; j < batch.length; j += 1) {
      const p = batch[j];
      const r = results[j];
      let embedding: number[] | null = null;
      if (r.ok) {
        embedding = r.embedding;
        embeddedCount += 1;
      } else {
        failures.push({ key: p.premise_key, error: r.error });
      }
      try {
        // A bridge premise is keyed on a signal, so its pillars come from
        // that signal -- not from its (game-id-shaped) title.
        const override =
          p.source === "bridge_premise" && p.numeric_metric
            ? bridgePremisePillars(p.numeric_metric)
            : undefined;
        const { id, pillar_tags } = await upsertPremise(db, p, embedding, override);
        written.push({ premise_key: p.premise_key, id, pillar_tags, embedded: r.ok });
      } catch (err) {
        failures.push({ key: p.premise_key, error: err instanceof Error ? err.message : "write failed" });
      }
    }
    opts.onProgress?.(Math.min(i + batchSize, limited.length), limited.length, "premises");
  }

  return {
    written,
    report: {
      premises_seen: premises.length,
      premises_written: written.length,
      premises_embedded: embeddedCount,
      premises_failed: failures.length,
      corpus_seen: 0,
      corpus_written: 0,
      corpus_embedded: 0,
      corpus_failed: 0,
      failures,
    },
  };
}

/** Index raw corpus items for the discovery surface. */
export async function indexCorpusItems(
  opts: BuildOptions,
  items: readonly CorpusItemInput[],
): Promise<{ written: number; embedded: number; failures: { key: string; error: string }[] }> {
  const { db, embedder } = opts;
  const batchSize = opts.batchSize ?? 16;
  const failures: { key: string; error: string }[] = [];
  let written = 0;
  let embedded = 0;

  const limited = opts.corpusLimit != null ? items.slice(0, opts.corpusLimit) : items;

  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const texts = batch.map((c) =>
      [c.title ?? "", c.abstract ?? ""].filter(Boolean).join("\n").trim() || c.corpus_key,
    );
    const results = await Promise.all(texts.map((t) => embedder(t)));

    for (let j = 0; j < batch.length; j += 1) {
      const c = batch[j];
      const r = results[j];
      let emb: number[] | null = null;
      if (r.ok) {
        emb = r.embedding;
        embedded += 1;
      } else {
        failures.push({ key: c.corpus_key, error: r.error });
      }
      try {
        await db.query(
          `INSERT INTO lit.corpus_item (
              corpus_key, source, title, abstract, url, authors, published_date,
              embedding, embedding_model
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9)
           ON CONFLICT (corpus_key) DO UPDATE SET
              title=EXCLUDED.title, abstract=EXCLUDED.abstract, url=EXCLUDED.url,
              authors=EXCLUDED.authors, published_date=EXCLUDED.published_date,
              embedding=EXCLUDED.embedding, embedding_model=EXCLUDED.embedding_model`,
          [
            c.corpus_key, c.source, c.title ?? null, c.abstract ?? null, c.url ?? null,
            c.authors ?? null, c.published_date ?? null,
            emb ? vectorLiteral(emb) : null, LITERATURE_EMBEDDING_MODEL,
          ],
        );
        written += 1;
      } catch (err) {
        failures.push({ key: c.corpus_key, error: err instanceof Error ? err.message : "write failed" });
      }
    }
    opts.onProgress?.(Math.min(i + batchSize, limited.length), limited.length, "corpus");
  }

  return { written, embedded, failures };
}

/** Build the event query text for a live signal. Re-exported for callers. */
export { eventEmbeddingText };
