"use strict";
/**
 * Trust-predicate tests.
 *
 * The point of these is not coverage. It is that four specific invariants in
 * `src/lib/trust.ts` are LOAD-BEARING for customer trust, and each has a
 * plausible-looking "simplification" that breaks it. Each test below names the
 * simplification it exists to block.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const trust = require("/tmp/gsebuild/lib/trust.js");

const NOW = new Date("2026-09-15T12:00:00Z");

function edge(expectedClv, over = {}) {
  return {
    decision: "SPEAK",
    agreement: "CONFIRMS",
    marketFairProb: 0.5,
    trueProb: 0.55,
    rawEdge: 0.05,
    shrunkEdge: 0.04,
    expectedClv,
    conviction: 60,
    sources: [],
    priced: true,
    rationale: "test",
    ...over,
  };
}

function pick(over = {}) {
  return {
    id: "p1",
    game: {
      homeTeam: "ATL",
      awayTeam: "PIT",
      commenceTime: "2026-09-16T00:00:00Z",
      sport: "NFL",
    },
    pickType: "SPREAD",
    selection: "Atlanta Falcons -3.0",
    line: -3,
    confidence: 72,
    edgeScore: 12,
    factorBreakdown: { factors: [], consensusScore: 20, marketDepthScore: 15, edgeScore: 12, lineMovementScore: 0, volatilityPenalty: 0 },
    dataQualityScore: 90,
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "",
    reasoningShort: "",
    isFeatured: false,
    isAuditAvailable: true,
    generatedAt: "2026-09-15T10:00:00Z",
    dataFreshnessAt: "2026-09-15T11:00:00Z",
    result: "PENDING",
    ...over,
  };
}

/* ── Invariant 1: gate on the signed number, not the label ─────────────── */

test("adverse edge: a negative expectedClv is adverse", () => {
  assert.equal(trust.pricesWorseThanMarket(edge(-0.0001)), true);
});

test("adverse edge: CONTRADICTS carries 0.0 and must be KEPT, not dropped on its label", () => {
  // The upstream comment: "a CONTRADICTS row carries expectedClv 0.0 by
  // construction, so the label would drop rows that are not adverse."
  const contradicts = edge(0, { decision: "CONTRADICTS", agreement: "CONTRADICTS" });
  assert.equal(trust.pricesWorseThanMarket(contradicts), false);
});

test("adverse edge: decision PASS with a POSITIVE clv is not adverse", () => {
  // Blocks the simplification `decision === "PASS"` → suppress.
  assert.equal(trust.pricesWorseThanMarket(edge(0.03, { decision: "PASS" })), false);
});

test("adverse edge: exactly zero is kept — zero is not adverse", () => {
  assert.equal(trust.pricesWorseThanMarket(edge(0)), false);
});

/* ── Invariant 2: absence is silence, and silence keeps the row ────────── */

test("absence is silence: no edge object → keep", () => {
  assert.equal(trust.pricesWorseThanMarket(null), false);
  assert.equal(trust.pricesWorseThanMarket(undefined), false);
});

test("absence is silence: non-finite clv → keep", () => {
  assert.equal(trust.pricesWorseThanMarket(edge(Number.NaN)), false);
  assert.equal(trust.pricesWorseThanMarket(edge(Number.NEGATIVE_INFINITY)), false);
  assert.equal(trust.pricesWorseThanMarket(edge(Number.POSITIVE_INFINITY)), false);
});

test("NEGATIVE CONTROL: a malformed breakdown must not wipe the board", () => {
  // "If that asymmetry ever inverts, a parse bug becomes a silent board wipe."
  const malformed = [
    { factorBreakdown: "this is not json" },
    { factorBreakdown: "{ broken" },
    { factorBreakdown: null },
    { factorBreakdown: 42 },
    { factorBreakdown: [] },
    { factorBreakdown: { independentEdge: "not an object" } },
    { factorBreakdown: {} },
  ];
  for (const row of malformed) {
    assert.equal(
      trust.isAdverseEdgeRow(row),
      false,
      `row with breakdown ${JSON.stringify(row.factorBreakdown)} was suppressed instead of kept`,
    );
  }
});

test("breakdown arriving as a JSON STRING is parsed, not ignored", () => {
  // This is not hypothetical: the server has parseFactorBreakdown for exactly
  // this reason (Prisma stores the breakdown as JSON, sometimes as text).
  const asString = JSON.stringify({ factors: [], independentEdge: edge(-0.2) });
  assert.equal(trust.isAdverseEdgeRow({ factorBreakdown: asString }), true);
});

/* ── Stale-pick policy ─────────────────────────────────────────────────── */

test("stale: a PENDING pick refreshed 15 days ago is stale", () => {
  const row = pick({ dataFreshnessAt: "2026-08-30T12:00:00Z" });
  assert.equal(trust.isStalePendingPick(row, NOW), true);
});

test("stale: a PENDING pick refreshed today is not stale", () => {
  assert.equal(trust.isStalePendingPick(pick(), NOW), false);
});

test("stale: a SETTLED old pick is not stale — only PENDING rows are policed", () => {
  const row = pick({ result: "WIN", dataFreshnessAt: "2026-06-01T00:00:00Z" });
  assert.equal(trust.isStalePendingPick(row, NOW), false);
});

test("stale: falls back to generatedAt when dataFreshnessAt is null", () => {
  const old = pick({ dataFreshnessAt: null, generatedAt: "2026-08-01T00:00:00Z" });
  assert.equal(trust.isStalePendingPick(old, NOW), true);
  const fresh = pick({ dataFreshnessAt: null, generatedAt: "2026-09-15T09:00:00Z" });
  assert.equal(trust.isStalePendingPick(fresh, NOW), false);
});

test("stale: an unparseable timestamp is silence → keep", () => {
  const row = pick({ dataFreshnessAt: "not-a-date" });
  assert.equal(trust.isStalePendingPick(row, NOW), false);
});

/* ── Composition ───────────────────────────────────────────────────────── */

test("applyBoardSafety counts suppressions and reports an emptied board", () => {
  const rows = [
    pick({ id: "keep-1" }),
    pick({ id: "adverse", factorBreakdown: { factors: [], independentEdge: edge(-0.05) } }),
    pick({ id: "stale", dataFreshnessAt: "2026-08-01T00:00:00Z" }),
  ];
  const report = trust.applyBoardSafety(rows, NOW);
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].id, "keep-1");
  assert.equal(report.suppressedAdverse, 1);
  assert.equal(report.suppressedStale, 1);
  assert.equal(report.emptiedBoard, false);
});

test("applyBoardSafety distinguishes an emptied board from an empty input", () => {
  const allBad = [pick({ factorBreakdown: { factors: [], independentEdge: edge(-0.1) } })];
  assert.equal(trust.applyBoardSafety(allBad, NOW).emptiedBoard, true);
  assert.equal(trust.applyBoardSafety([], NOW).emptiedBoard, false);
});

/* ── Ranking ───────────────────────────────────────────────────────────── */

test("ranking never sorts on confidence: the low-confidence high-edge row wins", () => {
  // The exact 2026-09-13 inversion: confidence 91 carried the SMALLEST edge.
  const weak = pick({
    id: "conf-91",
    confidence: 91,
    edgeScore: 5,
    factorBreakdown: { factors: [], independentEdge: edge(0.0217) },
  });
  const strong = pick({
    id: "conf-85",
    confidence: 85,
    edgeScore: 20,
    factorBreakdown: { factors: [], independentEdge: edge(0.2257) },
  });
  const sorted = [weak, strong].sort(trust.compareByRanking);
  assert.equal(sorted[0].id, "conf-85", "board ranked on confidence instead of edge");
});

test("ranking falls back through the chain deterministically", () => {
  const a = pick({ id: "a", confidence: 40, edgeScore: 10, generatedAt: "2026-09-15T10:00:00Z" });
  const b = pick({ id: "b", confidence: 99, edgeScore: 20, generatedAt: "2026-09-15T09:00:00Z" });
  const sorted = [a, b].sort(trust.compareByRanking);
  assert.equal(sorted[0].id, "b", "edgeScore should break the tie ahead of confidence");
});

test("ranking signal-slate rows (no edge estimate) sort below priced rows", () => {
  const priced = pick({ id: "priced", factorBreakdown: { factors: [], independentEdge: edge(0.01) } });
  const signal = pick({ id: "signal", edgeScore: null, factorBreakdown: null });
  const sorted = [signal, priced].sort(trust.compareByRanking);
  assert.equal(sorted[0].id, "priced");
});

/* ── Book-price honesty ────────────────────────────────────────────────── */

test("hasRealBookPrice: explicit false is respected", () => {
  assert.equal(trust.hasRealBookPrice({ hasBookPrice: false }), false);
});

test("hasRealBookPrice: fewer than two books is not a real book price", () => {
  assert.equal(trust.hasRealBookPrice({ winProbability: { books: 1 } }), false);
  assert.equal(trust.hasRealBookPrice({ winProbability: { books: 2 } }), true);
});

test("hasRealBookPrice: an unknown row is not assumed priced", () => {
  assert.equal(trust.hasRealBookPrice({}), false);
});
