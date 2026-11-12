/**
 * Pure tests for corpus-grounding (no network). A fake SqlClient routes by SQL
 * text so every layer, the seeded-chunk path, refusals and the weight math are
 * exercised. Live behaviour: scripts/literature/corpus-grounding-smoke.mjs.
 */
import { describe, it, expect } from "vitest";
import {
  groundFacet,
  groundGame,
  noisyOr,
  saturateRank,
  normaliseSimilarity,
  evidenceWeight,
  toOrQuery,
  MAX_EVIDENCE_WEIGHT,
} from "../corpus-grounding.js";
import type { SqlClient } from "../literature-retrieval.js";

function fakeDb(opts: { situations?: unknown[]; statements?: unknown[]; chunks?: unknown[]; failStatement?: boolean }): SqlClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async query(text: string) {
      if (text.includes("FROM lit.situation")) { calls.push("situation"); return { rows: opts.situations ?? [], rowCount: 0 }; }
      if (text.includes("FROM lit.corpus_statement")) {
        calls.push("statement");
        if (opts.failStatement) throw new Error("boom");
        return { rows: opts.statements ?? [], rowCount: 0 };
      }
      if (text.includes("WITH seed")) { calls.push("chunk-seeded"); return { rows: opts.chunks ?? [], rowCount: 0 }; }
      if (text.includes("FROM lit.corpus_chunk")) { calls.push("chunk-vector"); return { rows: opts.chunks ?? [], rowCount: 0 }; }
      throw new Error(`unexpected sql ${text.slice(0, 40)}`);
    },
  };
}

const SIT = { corpus_key: "a".repeat(64), chunk_index: 7, domain: "situational", situation: "short week road team", decision: "simplify script", lesson: "fatigue shows late in the game", evidence_quote: "teams on short rest faded", rank: 0.3 };

describe("weight math", () => {
  it("noisyOr combines without exceeding 1 and is 0 on empty", () => {
    expect(noisyOr([])).toBe(0);
    expect(noisyOr([0.5, 0.5])).toBeCloseTo(0.75, 6);
    expect(noisyOr([1, 1, 1])).toBe(1);
  });
  it("saturateRank and normaliseSimilarity are bounded and floor correctly", () => {
    expect(saturateRank(0)).toBe(0);
    expect(saturateRank(1e9)).toBeLessThanOrEqual(1);
    expect(normaliseSimilarity(0.3)).toBe(0);
    expect(normaliseSimilarity(1)).toBe(1);
  });
  it("no single evidence item can exceed the cap", () => {
    expect(evidenceWeight("situation", 1, 10)).toBe(MAX_EVIDENCE_WEIGHT);
  });
  it("toOrQuery drops stopwords and syntax", () => {
    expect(toOrQuery("Short week, the road team & 4th-down!")).toBe("short or week or road or team or 4th-down");
  });
});

describe("groundFacet", () => {
  it("reads all three layers and seeds chunks from the best situation", async () => {
    const db = fakeDb({
      situations: [SIT],
      statements: [{ book: "Camp 1893", page: 12, md5: "b".repeat(32), statement: "a road team on a short week shows fatigue", domain_tags: ["sports"], rank: 0.2 }],
      chunks: [{ corpus_key: "c".repeat(64), chunk_index: 3, title: "Fatigue", chunk_text: "short week road team fatigue late", similarity: 0.8 }],
    });
    const g = await groundFacet(db, { family: "restFatigue", query: "short week road team fatigue" });
    expect(db.calls).toEqual(["situation", "statement", "chunk-seeded"]);
    expect(g.chunkMode).toBe("seeded");
    expect(g.evidence.map((e) => e.layer).sort()).toEqual(["chunk", "situation", "statement"]);
    expect(g.support).toBeGreaterThan(0);
    expect(g.support).toBeLessThan(1);
    for (const e of g.evidence) expect(e.citation).toMatch(/^lit\./);
  });

  it("drops situations without an evidence quote", async () => {
    const g = await groundFacet(fakeDb({ situations: [{ ...SIT, evidence_quote: "  " }] }), { family: "weather", query: "wind rain" });
    expect(g.evidence).toHaveLength(0);
    expect(g.support).toBe(0);
    expect(g.chunkMode).toBe("none");
  });

  it("reports a failed layer instead of silently zeroing it", async () => {
    const g = await groundFacet(fakeDb({ situations: [SIT], failStatement: true }), { family: "restFatigue", query: "short week fatigue" });
    expect(g.layerErrors.some((e) => e.startsWith("statement:"))).toBe(true);
    expect(g.evidence.some((e) => e.layer === "situation")).toBe(true);
  });

  it("refuses an embedder whose model does not match the index", async () => {
    const embedder = async () => ({ ok: true as const, embedding: new Array(1024).fill(0) });
    const g = await groundFacet(fakeDb({ situations: [SIT] }), { family: "other", query: "short week fatigue" }, { embedder, embedderModel: "bge-large-en" });
    expect(g.layerErrors.some((e) => e.includes("refused embedder"))).toBe(true);
    expect(g.chunkMode).toBe("seeded");
  });

  it("uses the vector path when a matching embedder is supplied", async () => {
    const db = fakeDb({ chunks: [{ corpus_key: "d".repeat(64), chunk_index: 1, title: null, chunk_text: "x", similarity: 0.9 }] });
    const embedder = async () => ({ ok: true as const, embedding: new Array(1024).fill(0.01) });
    const g = await groundFacet(db, { family: "other", query: "red zone play calling" }, { embedder });
    expect(g.chunkMode).toBe("embedded");
    expect(db.calls).toContain("chunk-vector");
  });

  it("drops chunks below the similarity floor", async () => {
    const g = await groundFacet(fakeDb({ situations: [SIT], chunks: [{ corpus_key: "e".repeat(64), chunk_index: 2, title: null, chunk_text: "noise", similarity: 0.2 }] }), { family: "other", query: "short week" });
    expect(g.evidence.some((e) => e.layer === "chunk")).toBe(false);
  });
});

describe("relevance filter (live-smoke regressions)", () => {
  it("drops a hit that shares one word with the facet (betting line vs goal line)", async () => {
    const goalLine = { ...SIT, situation: "Wesleyan was on top of the Yale goal line", decision: "ran back across the line", lesson: "trick play", evidence_quote: "broke through the line" };
    const g = await groundFacet(fakeDb({ situations: [goalLine] }), { family: "marketMicrostructure", query: "betting line movement public money closing line" });
    expect(g.evidence).toHaveLength(0);
  });
  it("support does not saturate from volume: 15 weak hits stay below 0.75", async () => {
    const weak = Array.from({ length: 15 }, (_, i) => ({ ...SIT, chunk_index: i, rank: 0.02 }));
    const g = await groundFacet(fakeDb({ situations: weak }), { family: "restFatigue", query: "short week road team fatigue" });
    expect(g.support).toBeLessThan(0.75);
  });
  it("termCoverage uses stems", async () => {
    const { termCoverage } = await import("../corpus-grounding.js");
    expect(termCoverage("fatigue rushing", "fatigued players rush late")).toBe(1);
  });
});

describe("groundGame", () => {
  it("weights facets and reports coverage", async () => {
    const db = fakeDb({ situations: [SIT] });
    const g = await groundGame(db, "g1", [
      { family: "restFatigue", query: "short week", weight: 1 },
      { family: "weather", query: "", weight: 1 },
    ]);
    expect(g.coverage).toBe(0.5);
    expect(g.overallSupport).toBeCloseTo(g.facets[0]!.support / 2, 6);
  });
});
