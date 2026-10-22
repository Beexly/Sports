/**
 * @file literature-embeddings.ts
 * Embedding provider for the GSE literature index.
 *
 * One place that knows how to turn text into a vector, so the index builder,
 * the event-driven retriever, and the discovery expander all agree.
 *
 * Model: baai/bge-m3 via OpenRouter (1024-dim, cosine). Chosen because it is
 * the only dimension that fits pgvector 0.8.0's HNSW build time at corpus
 * scale while keeping the "long document" encoding the corpus needs.
 *
 * HARD RULES
 *   - A failed embed returns null. It never throws into a retrieval path and
 *     never silently produces a zero vector (a zero vector matches everything
 *     at distance 1.0 and would poison the top-k).
 *   - The model name and dimension are exported so the schema, the builder,
 *     and the tests all assert the same constants.
 */

import {
  BGE_M3_CONTEXT_TOKENS,
  clampPromptToContext,
} from "../inference/deepseek-recipe-budget.js";

/** The embedding model id. */
export const LITERATURE_EMBEDDING_MODEL = "baai/bge-m3";

/** The vector width the pgvector column must be. */
export const LITERATURE_EMBEDDING_DIM = 1024;

export type EmbeddingResult =
  | { readonly ok: true; readonly embedding: number[] }
  | { readonly ok: false; readonly error: string };

export type Embedder = (text: string) => Promise<EmbeddingResult>;

/**
 * Build the text that gets embedded for a premise.
 *
 * The retrieved text is what a live signal will be compared against, so the
 * embedded text must contain the operational vocabulary (metric names,
 * context field names, influence direction) and not just the title.
 */
export function premiseEmbeddingText(p: {
  readonly title: string;
  readonly principle?: string | null;
  readonly domain?: string | null;
  readonly claimType?: string | null;
  readonly numericValue?: number | null;
  readonly numericUnit?: string | null;
  readonly numericMetric?: string | null;
  readonly influenceDirection?: string | null;
  readonly howItInfluences?: string | null;
  readonly evidenceQuote?: string | null;
  readonly applicableContexts?: readonly string[];
}): string {
  const parts: string[] = [];
  parts.push(p.title ?? "");
  if (p.principle && p.principle !== p.title) parts.push(p.principle);
  if (p.domain) parts.push(`domain: ${p.domain}`);
  if (p.claimType) parts.push(`claim type: ${p.claimType}`);
  if (typeof p.numericValue === "number" && Number.isFinite(p.numericValue)) {
    parts.push(
      `numeric claim: ${p.numericValue} ${p.numericUnit ?? ""}`.trim() +
        (p.numericMetric ? ` (${p.numericMetric})` : ""),
    );
  }
  if (p.influenceDirection) parts.push(`influence: ${p.influenceDirection}`);
  if (p.howItInfluences) parts.push(p.howItInfluences);
  if (p.applicableContexts?.length) {
    parts.push(`applies when: ${p.applicableContexts.join(", ")}`);
  }
  if (p.evidenceQuote) parts.push(p.evidenceQuote.slice(0, 600));
  return parts.filter(Boolean).join("\n").trim();
}

/**
 * Build the text that gets embedded for a live event (a signal).
 *
 * A signal arrives as a key plus a value. The key carries the semantics
 * ("vision.soe_yd"), so it must be split into readable words, and the value
 * must be stated in words, not just a number, so a "high soe_yd" event and a
 * "low soe_yd" event do not embed to the same point.
 */
export function eventEmbeddingText(e: {
  readonly signalKey: string;
  readonly signalValue?: number | null;
  readonly signalFamily?: string | null;
  readonly gameId?: string | null;
  readonly contextFields?: readonly string[];
}): string {
  const parts: string[] = [];
  const readable = e.signalKey.replace(/[._]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  parts.push(`signal: ${readable}`);
  if (e.signalFamily) parts.push(`family: ${e.signalFamily}`);
  if (typeof e.signalValue === "number" && Number.isFinite(e.signalValue)) {
    parts.push(`value: ${e.signalValue}`);
  }
  if (e.contextFields?.length) parts.push(`context: ${e.contextFields.join(", ")}`);
  if (e.gameId) parts.push(`game: ${e.gameId}`);
  return parts.join("\n").trim();
}

/** Normalize a raw vector: finite values only, exact L2 unit length. */
export function normalizeVector(raw: readonly number[]): number[] | null {
  if (!Array.isArray(raw) || raw.length !== LITERATURE_EMBEDDING_DIM) return null;
  const out = new Array<number>(LITERATURE_EMBEDDING_DIM);
  let sumSq = 0;
  for (let i = 0; i < LITERATURE_EMBEDDING_DIM; i += 1) {
    const v = raw[i];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[i] = v;
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq);
  if (!(norm > 1e-12)) return null;
  for (let i = 0; i < LITERATURE_EMBEDDING_DIM; i += 1) {
    const v = out[i];
    if (v === undefined) return null;
    out[i] = v / norm;
  }
  return out;
}

/**
 * An embedder backed by OpenRouter.
 *
 * Reads the key from the supplied env (or process.env). If no key is present
 * the embedder reports a failure rather than throwing, so a missing key
 * degrades retrieval to "no premises" instead of taking down a publish path.
 */
export function openRouterEmbedder(opts?: {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
}): Embedder {
  const model = opts?.model ?? LITERATURE_EMBEDDING_MODEL;
  const doFetch = opts?.fetchImpl ?? fetch;
  return async (text: string): Promise<EmbeddingResult> => {
    const key = opts?.apiKey ?? process.env.OPENROUTER_API_KEY2 ?? process.env.OPENROUTER_API_KEY3 ?? process.env.OPENROUTER_API_KEY;
    if (!key) return { ok: false, error: "no OpenRouter API key" };
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: "empty text" };
    const capped = clampPromptToContext(trimmed, BGE_M3_CONTEXT_TOKENS);
    try {
      const res = await doFetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://github.com/Beexly/Sports",
          "X-Title": "GSE literature index",
        },
        body: JSON.stringify({ model, input: capped.text }),
      });
      if (!res.ok) {
        return { ok: false, error: `embedding HTTP ${res.status}` };
      }
      const json = (await res.json()) as { data?: { embedding?: number[] }[] };
      const raw = json?.data?.[0]?.embedding;
      if (!Array.isArray(raw)) return { ok: false, error: "embedding response missing vector" };
      const embedding = normalizeVector(raw);
      if (!embedding) return { ok: false, error: "embedding vector invalid or wrong dimension" };
      return { ok: true, embedding };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "embedding failed" };
    }
  };
}

/**
 * Deterministic fallback embedder used by tests and by any environment with
 * no embedding provider available.
 *
 * It is a hashed bag-of-words projection: stable across runs, unit length,
 * and it makes semantically-overlapping text score higher than unrelated text.
 * It is NOT a semantic model — it exists so the retrieval path, the HNSW
 * index, and the residual loop can be exercised end to end without a
 * network call, and so a provider outage degrades to "weak retrieval"
 * rather than "no retrieval".
 */
export function hashedEmbedder(dim: number = LITERATURE_EMBEDDING_DIM): Embedder {
  return async (text: string): Promise<EmbeddingResult> => {
    const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
    const vec = new Array<number>(dim).fill(0);
    for (const tok of tokens) {
      // FNV-1a over the token, then scatter into two buckets with a sign.
      let h = 0x811c9dc5;
      for (let i = 0; i < tok.length; i += 1) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      const a = h % dim;
      const b = (h >>> 8) % dim;
      const sign = (h & 0x100) === 0 ? 1 : -1;
      const curA = vec[a] ?? 0;
      const curB = vec[b] ?? 0;
      vec[a] = curA + sign * 1;
      vec[b] = curB + sign * 0.5;
    }
    const normalized = normalizeVector(vec);
    if (!normalized) return { ok: false, error: "hashed embedder produced a degenerate vector" };
    return { ok: true, embedding: normalized };
  };
}
