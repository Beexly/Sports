/**
 * Pure tests for situation-tactical-priors: bounds, shrink, trust weights,
 * quote enforcement, seed-free zero-prior law. No network.
 */
import { describe, it, expect } from "vitest";
import {
  PRIOR_BOUND,
  LAYER_TRUST,
  SHRINK_FLOOR,
  SUPPORT_TARGET,
  MIN_EVIDENCE_QUOTE_CHARS,
  shrinkFactor,
  supportFromCount,
  boundPrior,
  directionOf,
  situationQueryTerms,
  tacticalSituationKey,
  computeTacticalPrior,
  situationTacticalPriors,
  applyPriorsPreFwl,
  type PriorEvidence,
} from "../situation-tactical-priors.js";
import type { SqlClient } from "../literature-retrieval.js";

const QUOTE = "On fourth and short near the goal line, going for it converted more often than punting.";

function ev(layer: PriorEvidence["layer"], direction: -1 | 0 | 1, relevance = 1, quote = QUOTE): PriorEvidence {
  const trust = LAYER_TRUST[layer];
  return {
    layer,
    citation: `lit.${layer}:test#1`,
    evidence_quote: quote,
    direction,
    relevance,
    trust,
    contribution: trust * relevance * direction,
  };
}

function fakeDb(opts: { situations?: unknown[]; statements?: unknown[]; failSituation?: boolean; failStatement?: boolean }): SqlClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async query(text: string) {
      if (text.includes("FROM lit.situation")) {
        calls.push("situation");
        if (opts.failSituation) throw new Error("sit boom");
        return { rows: opts.situations ?? [], rowCount: 0 };
      }
      if (text.includes("FROM lit.corpus_statement")) {
        calls.push("statement");
        if (opts.failStatement) throw new Error("stmt boom");
        return { rows: opts.statements ?? [], rowCount: 0 };
      }
      throw new Error(`unexpected sql ${text.slice(0, 40)}`);
    },
  };
}

const SIT_ROW = {
  corpus_key: "a".repeat(64),
  chunk_index: 3,
  domain: "situational",
  situation: "fourth and short near the red zone",
  decision: "go for it",
  lesson: "short yardage converts near the goal",
  evidence_quote: QUOTE,
  rank: 0.3,
};
const STMT_ROW = {
  book: "Football Analytics",
  page: 44,
  md5: "b".repeat(32),
  statement: "Red zone offense on fourth down improves scoring efficiency when short yardage is converted.",
  situation: "red zone fourth down",
  domain_tags: ["sports"],
  rank: 0.2,
};

describe("constants and trust weights", () => {
  it("pins the contract values", () => {
    expect(PRIOR_BOUND).toBe(0.025);
    expect(LAYER_TRUST).toEqual({ situation: 0.85, statement: 0.65, chunk: 0.55 });
    expect(SHRINK_FLOOR).toBe(0.65);
    expect(SUPPORT_TARGET).toBe(5);
    expect(MIN_EVIDENCE_QUOTE_CHARS).toBe(20);
  });
});

describe("shrink and support", () => {
  it("shrink(support) = 0.65 + 0.35*support, clamped to [0,1]", () => {
    expect(shrinkFactor(0)).toBeCloseTo(0.65, 9);
    expect(shrinkFactor(0.5)).toBeCloseTo(0.825, 9);
    expect(shrinkFactor(1)).toBeCloseTo(1, 9);
    expect(shrinkFactor(-3)).toBeCloseTo(0.65, 9);
    expect(shrinkFactor(7)).toBeCloseTo(1, 9);
    expect(shrinkFactor(Number.NaN)).toBeCloseTo(0.65, 9);
  });
  it("support grows with evidence count and saturates at SUPPORT_TARGET", () => {
    expect(supportFromCount(0)).toBe(0);
    expect(supportFromCount(1)).toBeCloseTo(0.2, 9);
    expect(supportFromCount(5)).toBe(1);
    expect(supportFromCount(500)).toBe(1);
    expect(supportFromCount(-2)).toBe(0);
  });
});

describe("bounds", () => {
  it("boundPrior stays inside [-0.025, +0.025] for any finite raw", () => {
    for (const raw of [-1e9, -100, -1, -0.001, 0, 0.001, 1, 100, 1e9]) {
      const p = boundPrior(raw);
      expect(Math.abs(p)).toBeLessThanOrEqual(PRIOR_BOUND);
    }
    expect(boundPrior(0)).toBe(0);
    expect(boundPrior(Number.NaN)).toBe(0);
    expect(boundPrior(Number.POSITIVE_INFINITY)).toBe(0);
    expect(boundPrior(100)).toBeGreaterThan(0.024); // tanh saturates near the bound
  });

  it("100 aligned positive rows cannot push the prior past the bound", () => {
    const rows = Array.from({ length: 100 }, () => ev("situation", 1));
    const p = computeTacticalPrior("k", "q", rows);
    expect(p.logOddsPrior).toBeLessThanOrEqual(PRIOR_BOUND);
    expect(p.logOddsPrior).toBeGreaterThan(0);
    expect(p.evidenceCount).toBe(100);
    expect(p.support).toBe(1);
  });

  it("mixed directions cancel toward zero", () => {
    const rows = [ev("situation", 1), ev("situation", -1)];
    expect(computeTacticalPrior("k", "q", rows).logOddsPrior).toBe(0);
  });
});

describe("trust weights and shrink in the computed prior", () => {
  it("situation > statement > chunk contribution at equal relevance/direction", () => {
    const s = computeTacticalPrior("k", "q", [ev("situation", 1)]);
    const t = computeTacticalPrior("k", "q", [ev("statement", 1)]);
    const c = computeTacticalPrior("k", "q", [ev("chunk", 1)]);
    expect(s.rawLogOdds).toBeCloseTo(0.85, 6);
    expect(t.rawLogOdds).toBeCloseTo(0.65, 6);
    expect(c.rawLogOdds).toBeCloseTo(0.55, 6);
    expect(s.logOddsPrior).toBeGreaterThan(t.logOddsPrior);
    expect(t.logOddsPrior).toBeGreaterThan(c.logOddsPrior);
  });

  it("prior = boundPrior(raw) * shrink(support) exactly", () => {
    const rows = [ev("statement", 1, 0.5)];
    const p = computeTacticalPrior("k", "q", rows);
    expect(p.support).toBeCloseTo(0.2, 6);
    expect(p.shrink).toBeCloseTo(0.65 + 0.35 * 0.2, 6);
    expect(p.logOddsPrior).toBeCloseTo(boundPrior(p.rawLogOdds) * p.shrink, 5);
  });

  it("more supporting evidence lifts the shrink factor", () => {
    const one = computeTacticalPrior("k", "q", [ev("situation", 1, 0.4)]);
    const five = computeTacticalPrior("k", "q", Array.from({ length: 5 }, () => ev("situation", 1, 0.4)));
    expect(five.shrink).toBeGreaterThan(one.shrink);
    expect(five.shrink).toBe(1);
  });
});

describe("evidence quote law", () => {
  it("drops rows whose quote is under 20 characters — never truncates into evidence", () => {
    const short = ev("situation", 1, 1, "too short");
    const p = computeTacticalPrior("k", "q", [short, ev("statement", 1)]);
    expect(p.evidenceCount).toBe(1);
    expect(p.evidence.every((e) => e.evidence_quote.length >= MIN_EVIDENCE_QUOTE_CHARS)).toBe(true);
  });

  it("no evidence => exactly zero prior, never a default", () => {
    const p = computeTacticalPrior("k", "q", []);
    expect(p.logOddsPrior).toBe(0);
    expect(p.rawLogOdds).toBe(0);
    expect(p.evidenceCount).toBe(0);
    expect(p.evidence).toEqual([]);
  });

  it("direction-0 rows count as support but move nothing", () => {
    const p = computeTacticalPrior("k", "q", [ev("situation", 0)]);
    expect(p.evidenceCount).toBe(1);
    expect(p.logOddsPrior).toBe(0);
  });
});

describe("direction lexicon", () => {
  it("is deterministic and word-bounded", () => {
    expect(directionOf("this increases success and scoring")).toBe(1);
    expect(directionOf("turnover risk and penalty problems")).toBe(-1);
    expect(directionOf("the game was played on grass")).toBe(0);
    expect(directionOf("")).toBe(0);
    // "win" inside "window" must not count.
    expect(directionOf("the window was open")).toBe(0);
  });
});

describe("situation query construction", () => {
  it("turns down/distance/zone/personnel/script into content terms", () => {
    const terms = situationQueryTerms({ down: 4, distance: 1, fieldZone: "red_zone", personnel: "11", script: "trailing" });
    for (const t of ["fourth", "4th", "short", "red", "zone", "personnel", "11", "trailing"]) {
      expect(terms).toContain(t);
    }
  });
  it("derives field zone from yardLine when zone is absent", () => {
    expect(situationQueryTerms({ yardLine: 90 })).toContain("red");
    expect(situationQueryTerms({ yardLine: 10 })).toContain("backed");
    expect(situationQueryTerms({ yardLine: 50 })).toContain("midfield");
  });
  it("empty situation asks nothing", () => {
    expect(situationQueryTerms({})).toEqual([]);
    expect(situationQueryTerms({ down: null, distance: null })).toEqual([]);
  });
  it("situation key is stable and order-insensitive for extraTerms", () => {
    const a = tacticalSituationKey({ down: 3, distance: 7, extraTerms: ["wind", "cold"] });
    const b = tacticalSituationKey({ down: 3, distance: 7, extraTerms: ["cold", "wind"] });
    expect(a).toBe(b);
    expect(tacticalSituationKey({ down: 4 })).not.toBe(a);
  });
});

describe("situationTacticalPriors (fake DB)", () => {
  const SITUATION = { down: 4, distance: 1, fieldZone: "red_zone" as const };

  it("produces a bounded, quoted prior from situation + statement rows", async () => {
    const db = fakeDb({ situations: [SIT_ROW], statements: [STMT_ROW] });
    const { prior, layerErrors } = await situationTacticalPriors(db, SITUATION);
    expect(layerErrors).toEqual([]);
    expect(db.calls.sort()).toEqual(["situation", "statement"]);
    expect(prior.evidenceCount).toBe(2);
    expect(Math.abs(prior.logOddsPrior)).toBeLessThanOrEqual(PRIOR_BOUND);
    expect(prior.logOddsPrior).not.toBe(0);
    for (const e of prior.evidence) {
      expect(e.evidence_quote.length).toBeGreaterThanOrEqual(20);
      expect(e.citation).toMatch(/^lit\./);
    }
    expect(prior.evidence.some((e) => e.layer === "situation" && e.trust === 0.85)).toBe(true);
    expect(prior.evidence.some((e) => e.layer === "statement" && e.trust === 0.65)).toBe(true);
  });

  it("empty corpus => zero prior, no invention", async () => {
    const { prior } = await situationTacticalPriors(fakeDb({}), SITUATION);
    expect(prior.logOddsPrior).toBe(0);
    expect(prior.evidenceCount).toBe(0);
  });

  it("empty situation => zero prior without any DB call", async () => {
    const db = fakeDb({ situations: [SIT_ROW] });
    const { prior } = await situationTacticalPriors(db, {});
    expect(prior.logOddsPrior).toBe(0);
    expect(db.calls).toEqual([]);
  });

  it("failed layers are reported; total failure still yields zero", async () => {
    const { prior, layerErrors } = await situationTacticalPriors(
      fakeDb({ failSituation: true, failStatement: true }),
      SITUATION,
    );
    expect(layerErrors).toHaveLength(2);
    expect(prior.logOddsPrior).toBe(0);
  });

  it("rows with short quotes are dropped at the SQL boundary and in TS", async () => {
    const { prior } = await situationTacticalPriors(
      fakeDb({ situations: [{ ...SIT_ROW, evidence_quote: "short" }], statements: [{ ...STMT_ROW, statement: "tiny" }] }),
      SITUATION,
    );
    expect(prior.evidenceCount).toBe(0);
    expect(prior.logOddsPrior).toBe(0);
  });

  it("folds optional chunk evidence at chunk trust, respecting the similarity floor", async () => {
    const chunk = {
      corpus_key: "c".repeat(64),
      chunk_index: 9,
      title: "Red zone fourth down",
      chunk_text: "Fourth and short in the red zone: converted runs gain the first down.",
      similarity: 0.9,
    };
    const { prior } = await situationTacticalPriors(fakeDb({}), SITUATION, { chunkEvidence: [chunk, { ...chunk, similarity: 0.2 }] });
    expect(prior.evidenceCount).toBe(1);
    expect(prior.evidence[0]!.layer).toBe("chunk");
    expect(prior.evidence[0]!.trust).toBe(0.55);
  });

  it("downweights synthetic/prototype chunk evidence 0.25x", async () => {
    const chunk = {
      corpus_key: "c".repeat(64),
      chunk_index: 9,
      title: "Red zone fourth down",
      chunk_text: "Fourth and short in the red zone: converted runs gain the first down.",
      similarity: 0.9,
    };
    const real = await situationTacticalPriors(fakeDb({}), SITUATION, { chunkEvidence: [chunk] });
    const synth = await situationTacticalPriors(fakeDb({}), SITUATION, { chunkEvidence: [{ ...chunk, title: "synthetic-data prototype" }] });
    expect(synth.prior.evidence[0]!.contribution).toBeCloseTo(real.prior.evidence[0]!.contribution * 0.25, 6);
  });
});

describe("applyPriorsPreFwl", () => {
  it("adds the bounded sum pre-FWL; stacking cannot exceed one bound", () => {
    const p = computeTacticalPrior("k", "q", Array.from({ length: 50 }, () => ev("situation", 1)));
    expect(p.logOddsPrior).toBeGreaterThan(0.024);
    const base = 0.4;
    const once = applyPriorsPreFwl(base, [p]);
    const twice = applyPriorsPreFwl(base, [p, p]);
    expect(once).toBeCloseTo(base + p.logOddsPrior, 9);
    expect(twice).toBeCloseTo(base + PRIOR_BOUND, 9);
    expect(applyPriorsPreFwl(base, [])).toBe(base);
    const neg = computeTacticalPrior("k", "q", Array.from({ length: 50 }, () => ev("situation", -1)));
    expect(applyPriorsPreFwl(base, [neg, neg])).toBeCloseTo(base - PRIOR_BOUND, 9);
  });
});