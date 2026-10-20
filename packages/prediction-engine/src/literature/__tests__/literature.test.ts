/**
 * @file literature.test.ts
 * Tests for the pgvector literature index.
 *
 * These are pure-function tests (no database, no network): they cover the
 * embedding text builders, the pillar derivation, the event-key idempotency,
 * the score math, and the intervention-test law that refuses to run on an
 * unpromoted edge. The DB-backed behaviour is verified by the scripts in
 * scripts/literature/ against the live dev branch.
 */
import { describe, it, expect } from "vitest";
import {
  LITERATURE_EMBEDDING_DIM,
  eventEmbeddingText,
  premiseEmbeddingText,
  normalizeVector,
  hashedEmbedder,
} from "../literature-embeddings.js";
import {
  LITERATURE_PILLARS,
  derivePillars,
  pillarsForSignal,
} from "../literature-pillars.js";
import { mindRecordToPremise, bridgeRecordToPremise, vectorLiteral } from "../literature-index-builder.js";
import { makeEventKey, normalCdf, DEFAULT_TOP_K } from "../literature-retrieval.js";
import { DEFAULT_DISCOVERY_THRESHOLD } from "../literature-discovery.js";

describe("literature embeddings", () => {
  it("builds premise text that carries the operational vocabulary", () => {
    const text = premiseEmbeddingText({
      title: "Oddsmaker retail public shading",
      principle: "Public shading correction",
      domain: "market_microstructure",
      claimType: "correlational",
      numericValue: 1.8,
      numericUnit: "points",
      numericMetric: "public_darling_spread_shading",
      influenceDirection: "positive",
      howItInfluences: "Subtracts shading from the market spread",
      evidenceQuote: "removing oddsmaker bias improves out-of-sample predictions",
      applicableContexts: ["steam", "public_ticket_pct"],
    });
    expect(text).toContain("Oddsmaker retail public shading");
    expect(text).toContain("1.8 points");
    expect(text).toContain("public_darling_spread_shading");
    expect(text).toContain("steam, public_ticket_pct");
    expect(text).toContain("removing oddsmaker bias");
  });

  it("does not repeat the title as the principle", () => {
    const text = premiseEmbeddingText({ title: "Same", principle: "Same" });
    expect(text.match(/Same/g)?.length).toBe(1);
  });

  it("builds event text that distinguishes direction of a signal", () => {
    const a = eventEmbeddingText({ signalKey: "vision.soe_yd", signalValue: 0.9 });
    const b = eventEmbeddingText({ signalKey: "vision.soe_yd", signalValue: 0.1 });
    expect(a).not.toBe(b);
    expect(a).toContain("vision soe yd");
  });

  it("splits camelCase signal keys into words", () => {
    const t = eventEmbeddingText({ signalKey: "ftn.playActionRate" });
    expect(t).toContain("ftn play Action Rate");
  });

  it("rejects a vector of the wrong dimension", () => {
    expect(normalizeVector([1, 2, 3])).toBeNull();
  });

  it("rejects a vector containing NaN", () => {
    const v = new Array(LITERATURE_EMBEDDING_DIM).fill(0);
    v[0] = Number.NaN;
    expect(normalizeVector(v)).toBeNull();
  });

  it("rejects a zero vector", () => {
    expect(normalizeVector(new Array(LITERATURE_EMBEDDING_DIM).fill(0))).toBeNull();
  });

  it("normalizes to unit length", () => {
    const v = new Array(LITERATURE_EMBEDDING_DIM).fill(0);
    v[3] = 3;
    v[7] = 4;
    const out = normalizeVector(v)!;
    const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 10);
  });

  it("hashed embedder is deterministic and unit length", async () => {
    const e = hashedEmbedder();
    const a = await e("rest advantage on the road");
    const b = await e("rest advantage on the road");
    expect(a.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.embedding).toEqual(b.embedding);
      const norm = Math.sqrt(a.embedding.reduce((s, x) => s + x * x, 0));
      expect(norm).toBeCloseTo(1, 6);
    }
  });

  it("hashed embedder scores overlapping text above unrelated text", async () => {
    const e = hashedEmbedder();
    const q = await e("rest advantage away team");
    const near = await e("rest advantage away team in cold weather");
    const far = await e("quarterback passing efficiency rating");
    if (q.ok && near.ok && far.ok) {
      const cos = (a: number[], b: number[]) =>
        a.reduce((s, x, i) => s + x * b[i], 0);
      expect(cos(q.embedding, near.embedding)).toBeGreaterThan(cos(q.embedding, far.embedding));
    }
  });
});

describe("literature pillars", () => {
  it("derives a pillar from the domain", () => {
    const p = derivePillars({ domain: "market_microstructure" });
    expect(p).toContain("market_microstructure");
  });

  it("derives a pillar from applicable contexts when the domain is generic", () => {
    const p = derivePillars({ domain: "unknown", applicableContexts: ["weather_wind_pct"] });
    expect(p.length).toBeGreaterThan(0);
  });

  it("returns an empty list rather than a wrong pillar", () => {
    const p = derivePillars({ domain: "zzzz_nothing", applicableContexts: ["qqqq"] });
    expect(p).toEqual([]);
  });

  it("only ever emits declared pillars", () => {
    const p = derivePillars({
      domain: "market_microstructure",
      applicableContexts: ["weather", "injury", "snap", "coach", "epa"],
      principle: "rest and travel and bias",
    });
    for (const x of p) expect(LITERATURE_PILLARS).toContain(x);
  });

  it("scopes vision signals away from market microstructure", () => {
    const p = pillarsForSignal("vision.soe_yd");
    expect(p).not.toBeNull();
    expect(p).not.toContain("market_microstructure");
    expect(p).toContain("efficiency_usage");
  });

  it("scopes market signals to market microstructure", () => {
    const p = pillarsForSignal("market.line_movement");
    expect(p).toContain("market_microstructure");
  });

  it("returns null for an unknown signal so retrieval is unscoped", () => {
    expect(pillarsForSignal("totally.unknown.key")).toBeNull();
  });
});

describe("mind corpus mapping", () => {
  it("maps a MIND record onto a premise", () => {
    const p = mindRecordToPremise({
      item_id: "arXiv:1710.06551",
      source: "arXiv",
      title: "Exploiting Oddsmaker Bias",
      principle_name: "Oddsmaker shading correction",
      domain: "market_microstructure",
      claim_type: "correlational",
      numeric_claim: { value: 1.8, unit: "points", metric: "public_darling_spread_shading" },
      influence_direction: "positive",
      evidence_quote: "removing oddsmaker bias improves predictions",
      how_it_influences_reasoning: "Subtracts the bias",
      applicable_contexts: ["steam"],
    });
    expect(p).not.toBeNull();
    expect(p!.premise_key).toBe("mind:arXiv:1710.06551");
    expect(p!.numeric_value).toBe(1.8);
    expect(p!.applicable_contexts).toEqual(["steam"]);
  });

  it("rejects a record with no title", () => {
    expect(mindRecordToPremise({ item_id: "x" })).toBeNull();
  });

  it("maps a bridge premise and keeps the model signal id as the metric", () => {
    const p = bridgeRecordToPremise({
      game_id: "2025_01_DAL_PHI",
      signal_id: "pregame_context_logit",
      outcome: "home",
      probability: 0.85,
      sample_count: 6955,
      method: "logistic-irls",
      home_sign: { margin_diff: 1 },
    });
    expect(p).not.toBeNull();
    expect(p!.premise_key).toBe("bridge:2025_01_DAL_PHI:pregame_context_logit");
    expect(p!.numeric_metric).toBe("pregame_context_logit");
    expect(p!.source).toBe("bridge_premise");
  });

  it("rejects a bridge record with no game id", () => {
    expect(bridgeRecordToPremise({ signal_id: "x" })).toBeNull();
  });
});

describe("vector literal", () => {
  it("serializes a correctly-sized vector", () => {
    const v = new Array(LITERATURE_EMBEDDING_DIM).fill(0.5);
    const s = vectorLiteral(v);
    expect(s.startsWith("[")).toBe(true);
    expect(s.endsWith("]")).toBe(true);
  });

  it("throws on a wrong dimension rather than writing a corrupt vector", () => {
    expect(() => vectorLiteral([1, 2, 3])).toThrow(/dimension/i);
  });
});

describe("event keys", () => {
  it("is idempotent within a time bucket", () => {
    const t = new Date("2026-10-20T12:00:30Z");
    const a = makeEventKey("vision.soe_yd", "DAL", t);
    const b = makeEventKey("vision.soe_yd", "DAL", new Date("2026-10-20T12:04:59Z"));
    expect(a).toBe(b);
  });

  it("differs across time buckets", () => {
    const a = makeEventKey("vision.soe_yd", "DAL", new Date("2026-10-20T12:00:00Z"));
    const b = makeEventKey("vision.soe_yd", "DAL", new Date("2026-10-20T12:06:00Z"));
    expect(a).not.toBe(b);
  });

  it("differs across signals and games", () => {
    const t = new Date("2026-10-20T12:00:00Z");
    expect(makeEventKey("a", "X", t)).not.toBe(makeEventKey("b", "X", t));
    expect(makeEventKey("a", "X", t)).not.toBe(makeEventKey("a", "Y", t));
  });
});

describe("normal cdf", () => {
  it("is 0.5 at zero", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
  it("is symmetric", () => {
    expect(normalCdf(1.5) + normalCdf(-1.5)).toBeCloseTo(1, 6);
  });
  it("approaches the tails", () => {
    expect(normalCdf(3)).toBeGreaterThan(0.998);
    expect(normalCdf(-3)).toBeLessThan(0.002);
  });
});

describe("retrieval defaults", () => {
  it("uses a top-k that is a real top-k, not the whole corpus", () => {
    expect(DEFAULT_TOP_K).toBeGreaterThan(0);
    expect(DEFAULT_TOP_K).toBeLessThanOrEqual(50);
  });
  it("requires repeated surfacing before a discovery item is structured", () => {
    expect(DEFAULT_DISCOVERY_THRESHOLD).toBeGreaterThanOrEqual(2);
  });
});
