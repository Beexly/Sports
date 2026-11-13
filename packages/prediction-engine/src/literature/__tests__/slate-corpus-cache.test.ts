/**
 * Pure tests for the slate query-embedding cache (no network).
 */
import { describe, it, expect } from "vitest";
import {
  SlateCorpusCache,
  SLATE_QUERY_EMBED_BATCH_SIZE,
} from "../slate-corpus-cache.js";
import { LITERATURE_EMBEDDING_DIM } from "../literature-embeddings.js";

const vec = (fill: number) => new Array(LITERATURE_EMBEDDING_DIM).fill(fill);
const okEmbedder = (fill = 0.01) => async () => ({ ok: true as const, embedding: vec(fill) });

describe("SlateCorpusCache", () => {
  it("caches by text and serves hits without a provider call", async () => {
    const cache = new SlateCorpusCache();
    let calls = 0;
    const embedder = async () => {
      calls += 1;
      return { ok: true as const, embedding: vec(0.01) };
    };
    const a = await cache.embedQueries(["short week fatigue", "short week fatigue"], embedder);
    expect(a[0]).toEqual(a[1]);
    expect(calls).toBe(1); // deduped
    const b = await cache.embedQueries(["short week fatigue"], embedder);
    expect(b[0]).toEqual(a[0]);
    expect(calls).toBe(1); // cached
    expect(cache.stats().hits).toBeGreaterThan(0);
  });

  it("batches misses: 40 texts at batch size 16 => ceil(40/16) waves, one call each", async () => {
    const cache = new SlateCorpusCache();
    let calls = 0;
    const embedder = async () => {
      calls += 1;
      return { ok: true as const, embedding: vec(0.01) };
    };
    const texts = Array.from({ length: 40 }, (_, i) => `query number ${i}`);
    const out = await cache.embedQueries(texts, embedder, { batchSize: 16, concurrency: 16 });
    expect(out.every((v) => v !== null && v.length === LITERATURE_EMBEDDING_DIM)).toBe(true);
    expect(calls).toBe(40);
    expect(cache.stats().size).toBe(40);
    expect(SLATE_QUERY_EMBED_BATCH_SIZE).toBe(16);
  });

  it("a failed embed is null, never a zero vector and never a throw", async () => {
    const cache = new SlateCorpusCache();
    const fail = async () => ({ ok: false as const, error: "provider down" });
    const thrower = async () => {
      throw new Error("socket hang up");
    };
    expect(await cache.embedQueries(["a"], fail)).toEqual([null]);
    expect(await cache.embedQueries(["b"], thrower)).toEqual([null]);
    expect(cache.stats().size).toBe(0);
  });

  it("refuses wrong-dim, non-finite and zero vectors", async () => {
    const cache = new SlateCorpusCache();
    const badDim = async () => ({ ok: true as const, embedding: new Array(768).fill(0.01) });
    const nan = async () => ({ ok: true as const, embedding: vec(Number.NaN) });
    const zero = async () => ({ ok: true as const, embedding: vec(0) });
    expect(await cache.embedQueries(["x"], badDim)).toEqual([null]);
    expect(await cache.embedQueries(["y"], nan)).toEqual([null]);
    expect(await cache.embedQueries(["z"], zero)).toEqual([null]);
    expect(cache.set("w", vec(0))).toBe(false);
    expect(cache.set("v", new Array(10).fill(1))).toBe(false);
    expect(cache.set("u", vec(0.01))).toBe(true);
  });

  it("empty/whitespace texts stay null without a provider call", async () => {
    const cache = new SlateCorpusCache();
    let calls = 0;
    const embedder = async () => {
      calls += 1;
      return { ok: true as const, embedding: vec(0.01) };
    };
    expect(await cache.embedQueries(["", "   "], embedder)).toEqual([null, null]);
    expect(calls).toBe(0);
  });

  it("LRU-evicts beyond maxEntries", async () => {
    const cache = new SlateCorpusCache({ maxEntries: 2 });
    await cache.embedQueries(["one", "two", "three"], okEmbedder(), { concurrency: 1 });
    expect(cache.stats().size).toBe(2);
    expect(cache.stats().evictions).toBe(1);
    expect(cache.get("one")).toBeNull();
    expect(cache.get("three")).not.toBeNull();
  });

  it("model id is part of the key: a model swap cannot serve stale vectors", async () => {
    const a = new SlateCorpusCache({ model: "baai/bge-m3" });
    const b = new SlateCorpusCache({ model: "other/model" });
    a.set("same text", vec(0.01));
    expect(a.get("same text")).not.toBeNull();
    expect(b.get("same text")).toBeNull();
  });
});