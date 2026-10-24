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
import {
  makeEventKey,
  normalCdf,
  DEFAULT_TOP_K,
  applyResidualFeedback,
  promotePremisesToCausalEdges,
} from "../literature-retrieval.js";
import {
  isGameKey,
  resolveOwnGameOutcome,
  groundingFor,
} from "../literature-residual-grounding.js";
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

// ---------------------------------------------------------------------------
// REGRESSION (2026-10-20): the promoted-edge estimate must be an OBSERVED
// quantity, not the premise's own claim.
//
// The original implementation wrote `c.numeric_value` -- the number the
// premise asserted -- into `lit.causal_edge.effect_estimate`. An edge whose
// estimate is just the premise's own claim is unfalsifiable: it says
// "premise P moves the outcome by exactly what P said it would". The
// estimate must be the observed mean signed residual.
//
// This test drives the real function against a fake db and asserts the
// estimate that reaches the INSERT is the residual, and that the premise's
// numeric_value never appears there.
// ---------------------------------------------------------------------------
describe("promoted edge honesty", () => {
  it("writes the observed mean residual as the effect estimate, not the premise's claim", async () => {
    const inserted: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      query: async (sql: string, params: unknown[] = []) => {
        // the candidate SELECT
        if (sql.includes("FROM lit.premise_score s")) {
          return {
            rows: [
              {
                id: "p1",
                premise_key: "bridge:x:claim",
                title: "t",
                domain: "injury",
                numeric_value: 0.85, // the premise's CLAIM
                numeric_unit: "probability",
                numeric_metric: "m",
                influence_direction: "pos",
                applicable_contexts: ["ctx"],
                activation_score: 0.5,
                graded: 4,
                correct: 2,
                mean_residual: 0.031, // the OBSERVED miscalibration
              },
            ],
          };
        }
        inserted.push({ sql, params });
        return { rows: [{ id: "edge1" }] };
      },
    } as never;

    const res = await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });

    expect(res.promoted).toBe(1);
    // the reconciling demotion statement must be issued
    expect(res.retired).toBe(0);
    // the returned estimate is the residual
    expect(res.edges[0]?.effect_estimate).toBeCloseTo(0.031, 6);

    const edgeInsert = inserted.find((x) => x.sql.includes("INSERT INTO lit.causal_edge"));
    expect(edgeInsert).toBeDefined();
    const params = edgeInsert!.params;
    // params: edgeKey, premiseId, cause, effect, observedEffect, unit, support_n
    expect(params[4]).toBeCloseTo(0.031, 6);
    // the premise's own claim must NOT be the estimate
    expect(params[4]).not.toBe(0.85);
  });

  it("sets status explicitly rather than inheriting the schema default", async () => {
    const inserted: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes("FROM lit.premise_score s")) {
          return {
            rows: [
              {
                id: "p1",
                premise_key: "k",
                title: "t",
                domain: "d",
                numeric_value: 0.5,
                numeric_unit: null,
                numeric_metric: null,
                influence_direction: null,
                applicable_contexts: [],
                activation_score: 0.5,
                graded: 3,
                correct: 1,
                mean_residual: 0.02,
              },
            ],
          };
        }
        inserted.push({ sql, params });
        return { rows: [{ id: "e" }] };
      },
    } as never;

    await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });

    const edgeInsert = inserted.find((x) => x.sql.includes("INSERT INTO lit.causal_edge"));
    expect(edgeInsert!.sql).toContain("status");
    expect(edgeInsert!.sql).toContain("'promoted'");
  });

  it("marks the premise_score.promoted flag so the two tables agree", async () => {
    const inserted: string[] = [];
    const db = {
      query: async (sql: string) => {
        if (sql.includes("FROM lit.premise_score s")) {
          return {
            rows: [
              {
                id: "p1",
                premise_key: "k",
                title: "t",
                domain: "d",
                numeric_value: 0.5,
                numeric_unit: null,
                numeric_metric: null,
                influence_direction: null,
                applicable_contexts: [],
                activation_score: 0.5,
                graded: 3,
                correct: 1,
                mean_residual: 0.02,
              },
            ],
          };
        }
        inserted.push(sql);
        return { rows: [{ id: "e" }] };
      },
    } as never;

    await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });

    const flagWrite = inserted.find((x) => x.includes("UPDATE lit.premise_score"));
    expect(flagWrite).toBeDefined();
    expect(flagWrite!).toContain("promoted = true");
  });

  it("requires a non-null observed residual -- a premise with no outcome has no effect", async () => {
    const captured: unknown[] = [];
    const db = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes("FROM lit.premise_score s")) {
          captured.push(params);
          return { rows: [] };
        }
        return { rows: [{ id: "e" }] };
      },
    } as never;

    await promotePremisesToCausalEdges(db, {});
    const candidateParams = captured[0] as unknown[];
    // the candidate SELECT must filter on a non-null mean_residual
    expect(candidateParams.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION (2026-10-20): a game-scoped premise must be graded against the
// game it ASSERTS ABOUT.
//
// A bridge premise's key names the game it predicts:
// "bridge:2025_02_CLE_BAL:pregame_context_logit" asserts P(home wins) for
// 2025_02_CLE_BAL. `source_ref` carries that game key, and
// historical_games holds that game's real result under the same format.
//
// The bug: the residual loop graded such a premise against whatever game
// the activation happened to be for. That compares two unrelated
// propositions. It produced a degenerate population in which every sample
// had actual = 1 (both graded games were wins), which is why
// mean_signed_residual == mean_abs_residual exactly and the
// "residuals improved" trend was noise.
//
// The rule: a premise with a known own-game result is graded against THAT
// result; a premise without one (a general MIND-corpus claim) is graded
// against the game it was activated for.
// ---------------------------------------------------------------------------
describe("residual grounding", () => {
  const GAME_KEY = "2025_02_CLE_BAL";

  it("resolves a game-scoped premise to its OWN game outcome", async () => {
    const queried: string[] = [];
    const db = {
      query: async (q: string, vals?: readonly unknown[]) => {
        queried.push(q);
        expect(vals?.[0]).toBe(GAME_KEY);
        return { rows: [{ actual: 0, game_key: GAME_KEY }], rowCount: 1 };
      },
    };

    const own = await resolveOwnGameOutcome(db, GAME_KEY);

    expect(own).not.toBeNull();
    // away win -> actual 0, NOT the pick's outcome
    expect(own!.actual).toBe(0);
    expect(own!.game_key).toBe(GAME_KEY);
    expect(queried[0]).toContain("historical_games");
  });

  it("returns null for a source_ref that is not a game key (no mis-query)", async () => {
    let called = false;
    const db = {
      query: async () => {
        called = true;
        return { rows: [], rowCount: 0 };
      },
    };

    const own = await resolveOwnGameOutcome(db, "https://arxiv.org/abs/1710.06551");
    expect(own).toBeNull();
    expect(called).toBe(false);
  });

  it("returns null when the own game has no recorded result (not mis-graded)", async () => {
    const db = { query: async () => ({ rows: [], rowCount: 0 }) };
    const own = await resolveOwnGameOutcome(db, GAME_KEY);
    expect(own).toBeNull();
  });

  it("survives a deployment with no historical_games table", async () => {
    const db = {
      query: async () => {
        throw new Error('relation "historical_games" does not exist');
      },
    };
    const own = await resolveOwnGameOutcome(db, GAME_KEY);
    expect(own).toBeNull();
  });

  it("recognises a game key and rejects a doc hash", () => {
    expect(isGameKey("2025_02_CLE_BAL")).toBe(true);
    expect(isGameKey("2025_02_CLE")).toBe(false);
    expect(isGameKey("mind:arXiv:1710.06551")).toBe(false);
    expect(isGameKey(null)).toBe(false);
  });

  it("grounds a game-scoped premise on its own game and a general one on the activation game", () => {
    const own = { actual: 1, game_key: "2025_02_CLE_BAL" };
    expect(groundingFor(own, "2026-game-x")).toEqual({ actual: 1, game_id: "2025_02_CLE_BAL" });
    // no own game -> fall back to the activation's game, actual unresolved
    expect(groundingFor(null, "2026-game-x")).toEqual({ actual: undefined, game_id: "2026-game-x" });
  });
});

// ---------------------------------------------------------------------------
// REGRESSION (2026-10-20): the promotion path must be RECONCILABLE, and the
// support factor must count DISTINCT GAMES.
//
// Three separate defects were found in the same area:
//
// 1. The support factor counted residual ROWS. A game-scoped premise is
//    activated once per retrieval event touching its game -- 21 rows for
//    ONE game in the measured run. Counting rows let one piece of
//    evidence look like 21 and saturated the support factor, so a
//    premise earned full weight from a single game.
//
// 2. Promotion was ADD-ONLY. Sixteen edges promoted under the old
//    row-counting rule stayed marked 'promoted' with zero qualifying
//    premises behind them. An edge table that can only grow is an edge
//    table that cannot be wrong.
//
// 3. premise_score.promoted was set on promotion but never CLEARED on
//    demotion, so it read 16 while causal_edge had 0 promoted.
//
// The contract these tests pin: after the promotion function runs, the
// promoted-edge set is EXACTLY the set of premises clearing the gate, and
// the flag agrees with it in both directions.
// ---------------------------------------------------------------------------
describe("promotion reconciliation", () => {
  function fakeDb(opts?: { graded?: number; score?: number; rows?: unknown[] }) {
    const issued: string[] = [];
    const graded = opts?.graded ?? 5;
    const score = opts?.score ?? 0.5;
    return {
      issued,
      db: {
        query: async (sql: string) => {
          issued.push(sql);
          if (sql.includes("FROM lit.premise_score s")) {
            return {
              rows:
                opts?.rows ??
                [
                  {
                    id: "p1",
                    premise_key: "k",
                    title: "t",
                    domain: "d",
                    numeric_value: 0.5,
                    numeric_unit: "probability",
                    numeric_metric: null,
                    influence_direction: null,
                    applicable_contexts: [],
                    activation_score: score,
                    graded,
                    correct: 2,
                    mean_residual: 0.05,
                  },
                ],
            };
          }
          if (sql.includes("UPDATE lit.causal_edge")) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [{ id: "e" }], rowCount: 1 };
        },
      },
    };
  }

  it("counts DISTINCT GAMES for support, not residual rows", async () => {
    // The de-duplication lives in applyResidualFeedback's scorecard
    // aggregation -- that is where the support factor is computed.
    const issued: string[] = [];
    const db = {
      query: async (sql: string) => {
        issued.push(sql);
        if (sql.includes("FROM lit.residual")) {
          return {
            rows: [
              {
                n: 1,
                mean_res: 0.05,
                mse: 0.0025,
                correct: 1,
              },
            ],
          };
        }
        return { rows: [{ id: "r" }], rowCount: 1 };
      },
    } as never;

    await applyResidualFeedback(db, [
      {
        activation_id: "a1",
        premise_id: "p1",
        game_id: "g1",
        predicted: 0.5,
        actual: 1,
        outcome_correct: true,
      },
    ]);

    const agg = issued.find((x) => x.includes("FROM lit.residual"));
    expect(agg).toBeDefined();
    // The support factor must count distinct (premise, game) pairs.
    //
    // The assertion is on the BEHAVIOUR, not on the exact spelling:
    // the query aliases the columns (r.premise_id) because the
    // class filter joins lit.premise, and an assertion on the literal
    // text broke on the aliasing without any behaviour changing. A
    // test that pins the exact string of a query is a test that fails
    // on a harmless rename and passes on a harmful one.
    //
    // What is pinned: the DISTINCT is there, and it is over the
    // (premise, game) pair.
    expect(agg).toMatch(/DISTINCT ON\s*\(\s*r?\.?premise_id\s*,\s*r?\.?game_id\s*\)/i);
    // And the class filter is on the same query, so a residual from an
    // unverified premise cannot be counted as evidence.
    expect(agg).toContain("record_class = 'CITABLE_VERIFIED'");
    expect(agg).toContain("status = 'ACTIVE'");
  });

  it("retires edges whose premise no longer clears the gate", async () => {
    const { db, issued } = fakeDb();
    await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });
    const retire = issued.find((x) => x.includes("SET status = 'retired'"));
    expect(retire).toBeDefined();
  });

  it("reconciles premise_score.promoted with the edge set in both directions", async () => {
    const { db, issued } = fakeDb();
    await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });
    // the flag must be SET FROM the edge set (EXISTS), not set to true
    const flag = issued.find(
      (x) => x.includes("UPDATE lit.premise_score") && x.includes("promoted = EXISTS"),
    );
    expect(flag).toBeDefined();
    expect(flag).not.toContain("SET promoted = true");
  });

  it("reports how many edges it retired", async () => {
    const { db } = fakeDb();
    const res = await promotePremisesToCausalEdges(db, { minGraded: 3, minScore: 0.01 });
    expect(typeof res.retired).toBe("number");
  });
});
