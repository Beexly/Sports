/**
 * @file slate-corpus-cache.ts
 * Batched, cached bge-m3 query embeddings for the slate's corpus lookups.
 *
 * WHY THIS EXISTS
 * ---------------
 * The seeded-chunk path can only seed from a corpus_key that actually exists
 * in lit.corpus_chunk (sha256 keys). Callers that hand us an md5 key — or a
 * chunk whose embedding is NULL — get NO seed, and the grounding must not die
 * there: it falls back to embedding the facet query itself and asking HNSW
 * directly. That fallback is a bge-m3 call per facet per game, and a slate
 * repeats the same facet queries across many games. This cache makes the
 * fallback cheap and batched instead of a per-game provider storm.
 *
 * LAWS (same as literature-embeddings.ts)
 * ---------------------------------------
 * - A failed embed is null. Never a zero vector (it matches everything at
 *   distance 1.0 and would poison the top-k), never a throw into retrieval.
 * - Only 1024-dim finite vectors are cached: the width the HNSW index was
 *   built with. A wrong-width vector is a refusal, not a silent coerce.
 * - The cache key includes the model id, so a model swap can never serve a
 *   stale vector from the old model.
 */
import {
  LITERATURE_EMBEDDING_DIM,
  LITERATURE_EMBEDDING_MODEL,
  type Embedder,
} from "./literature-embeddings.js";

/** Default number of query texts embedded per batch. */
export const SLATE_QUERY_EMBED_BATCH_SIZE = 16;

/** Default parallel embed calls inside one batch. */
export const SLATE_QUERY_EMBED_CONCURRENCY = 4;

/** Default cache capacity (entries). LRU-evicted beyond this. */
export const SLATE_CACHE_MAX_ENTRIES = 512;

export interface SlateCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly embedCalls: number;
  readonly evictions: number;
  readonly size: number;
}

function validVector(v: readonly number[] | null | undefined): v is number[] {
  if (!Array.isArray(v) || v.length !== LITERATURE_EMBEDDING_DIM) return false;
  let sumSq = 0;
  for (const x of v) {
    if (typeof x !== "number" || !Number.isFinite(x)) return false;
    sumSq += x * x;
  }
  // A zero (or near-zero) vector is degenerate: refuse it like the embedder does.
  return sumSq > 1e-24;
}

export class SlateCorpusCache {
  private readonly map = new Map<string, number[]>();
  private readonly maxEntries: number;
  private readonly model: string;
  private hits = 0;
  private misses = 0;
  private embedCalls = 0;
  private evictions = 0;

  constructor(opts?: { readonly maxEntries?: number; readonly model?: string }) {
    this.maxEntries = Math.max(1, opts?.maxEntries ?? SLATE_CACHE_MAX_ENTRIES);
    this.model = opts?.model ?? LITERATURE_EMBEDDING_MODEL;
  }

  private key(text: string): string {
    return `${this.model}\u0000${text.trim()}`;
  }

  /** Cached vector for the text, or null. LRU-touches on hit. */
  get(text: string): number[] | null {
    const k = this.key(text);
    const v = this.map.get(k);
    if (!v) {
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    // Refresh recency.
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }

  /** Store a vector. Invalid vectors are refused (returns false). */
  set(text: string, vector: readonly number[]): boolean {
    if (!validVector(vector)) return false;
    const k = this.key(text);
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, [...vector]);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
      this.evictions += 1;
    }
    return true;
  }

  /**
   * Embed many query texts with dedupe + cache + batching.
   *
   * Returns one slot per input text, aligned by index: a 1024-dim vector on
   * success, null on failure (empty text, provider error, bad vector). Never
   * throws. Duplicate texts are embedded once; cached texts cost no call.
   */
  async embedQueries(
    texts: readonly string[],
    embedder: Embedder,
    opts?: { readonly batchSize?: number; readonly concurrency?: number },
  ): Promise<(number[] | null)[]> {
    const batchSize = Math.max(1, opts?.batchSize ?? SLATE_QUERY_EMBED_BATCH_SIZE);
    const concurrency = Math.max(1, opts?.concurrency ?? SLATE_QUERY_EMBED_CONCURRENCY);
    const out: (number[] | null)[] = texts.map(() => null);

    // Dedupe by cache key; remember the text and every input slot it fills.
    const uniqueByKey = new Map<string, { text: string; slots: number[] }>();
    texts.forEach((t, i) => {
      const trimmed = (t ?? "").trim();
      if (!trimmed) return; // empty text stays null, no provider call
      const k = this.key(trimmed);
      const entry = uniqueByKey.get(k);
      if (entry) entry.slots.push(i);
      else uniqueByKey.set(k, { text: trimmed, slots: [i] });
    });

    const pending: { text: string; slots: number[] }[] = [];
    for (const { text, slots } of uniqueByKey.values()) {
      const cached = this.get(text);
      if (cached) {
        for (const i of slots) out[i] = cached;
      } else {
        pending.push({ text, slots });
      }
    }

    // Batch the misses; inside a batch, limited concurrency.
    for (let start = 0; start < pending.length; start += batchSize) {
      const batch = pending.slice(start, start + batchSize);
      for (let c = 0; c < batch.length; c += concurrency) {
        const wave = batch.slice(c, c + concurrency);
        await Promise.all(
          wave.map(async (item) => {
            this.embedCalls += 1;
            let vec: number[] | null = null;
            try {
              const res = await embedder(item.text);
              if (res.ok && validVector(res.embedding)) {
                vec = res.embedding;
                this.set(item.text, res.embedding);
              }
            } catch {
              vec = null; // a provider throw is a refusal, never a crash
            }
            for (const i of item.slots) out[i] = vec;
          }),
        );
      }
    }
    return out;
  }

  stats(): SlateCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      embedCalls: this.embedCalls,
      evictions: this.evictions,
      size: this.map.size,
    };
  }

  clear(): void {
    this.map.clear();
  }
}

/**
 * Process-wide default cache for the slate fallback path. Callers that need
 * isolation (tests, multi-tenant runs) construct their own SlateCorpusCache.
 */
export const slateCorpusCache = new SlateCorpusCache();