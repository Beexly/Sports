import { describe, it, expect } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import {
  median,
  consensusFromEvent,
  clvForBet,
  studentTTwoSidedP,
  oneSampleClvTTest,
  evaluateClvFeasibility,
  type ClvGameOpenClose,
} from "../clv-feasibility.js";

describe("median", () => {
  it("returns null for empty, the middle for odd, the mean of middles for even", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([-3, -1])).toBe(-2);
  });
});

function event(overrides: Partial<OddsApiEvent> & { bookmakers: OddsApiEvent["bookmakers"] }): OddsApiEvent {
  return {
    id: "g1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2024-09-08T17:00:00Z",
    home_team: "Home",
    away_team: "Away",
    ...overrides,
  };
}

describe("consensusFromEvent", () => {
  it("takes the median home spread and total across books, ignoring unpriced markets", () => {
    const e = event({
      bookmakers: [
        {
          key: "a",
          title: "A",
          last_update: "x",
          markets: [
            { key: "spreads", last_update: "x", outcomes: [
              { name: "Home", price: -110, point: -3 },
              { name: "Away", price: -110, point: 3 },
            ] },
            { key: "totals", last_update: "x", outcomes: [
              { name: "Over", price: -110, point: 45 },
              { name: "Under", price: -110, point: 45 },
            ] },
          ],
        },
        {
          key: "b",
          title: "B",
          last_update: "x",
          markets: [
            { key: "spreads", last_update: "x", outcomes: [
              { name: "Home", price: -110, point: -2.5 },
              { name: "Away", price: -110, point: 2.5 },
            ] },
            { key: "totals", last_update: "x", outcomes: [
              { name: "Over", price: -110, point: 47 },
              { name: "Under", price: -110, point: 47 },
            ] },
          ],
        },
        {
          key: "c",
          title: "C",
          last_update: "x",
          markets: [
            { key: "spreads", last_update: "x", outcomes: [
              { name: "Home", price: -110, point: -4 },
              { name: "Away", price: -110, point: 4 },
            ] },
            // no totals at book c
          ],
        },
      ],
    });
    const c = consensusFromEvent(e);
    expect(c.spreadHome).toBe(-3); // median of [-4,-3,-2.5]
    expect(c.total).toBe(46); // median of [45,47]
    expect(c.spreadBooks).toBe(3);
    expect(c.totalBooks).toBe(2);
  });

  it("returns nulls when no book priced a market", () => {
    const c = consensusFromEvent(event({ bookmakers: [] }));
    expect(c.spreadHome).toBeNull();
    expect(c.total).toBeNull();
    expect(c.spreadBooks).toBe(0);
  });
});

describe("clvForBet", () => {
  const game: ClvGameOpenClose = {
    openSpreadHome: -2,
    closeSpreadHome: -3,
    openTotal: 44,
    closeTotal: 46,
  };

  it("computes spread CLV for the chosen side via the audited primitive", () => {
    // HOME struck at -2, closes -3 → laid fewer points → +1 CLV.
    expect(clvForBet({ market: "SPREAD", side: "HOME" }, game)).toBe(1);
    // AWAY is the zero-sum mirror.
    expect(clvForBet({ market: "SPREAD", side: "AWAY" }, game)).toBe(-1);
  });

  it("computes total CLV for the chosen side", () => {
    // OVER struck at 44, closes 46 → bought the over cheaper → +2 CLV.
    expect(clvForBet({ market: "TOTAL", side: "OVER" }, game)).toBe(2);
    expect(clvForBet({ market: "TOTAL", side: "UNDER" }, game)).toBe(-2);
  });

  it("returns null when the rule does not apply or a line is missing", () => {
    expect(clvForBet(null, game)).toBeNull();
    expect(
      clvForBet({ market: "SPREAD", side: "HOME" }, { ...game, closeSpreadHome: null }),
    ).toBeNull();
    expect(
      clvForBet({ market: "TOTAL", side: "OVER" }, { ...game, openTotal: null }),
    ).toBeNull();
  });
});

describe("studentTTwoSidedP", () => {
  it("matches known two-sided critical values", () => {
    // t_10 two-tailed 0.05 critical value is 2.228.
    expect(studentTTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3);
    // t_10 two-tailed 0.01 critical value is 3.169.
    expect(studentTTwoSidedP(3.169, 10)).toBeCloseTo(0.01, 3);
    // Symmetric in the sign of t.
    expect(studentTTwoSidedP(-2.228, 10)).toBeCloseTo(0.05, 3);
  });

  it("approaches the normal at large df", () => {
    // z=1.96 two-tailed ≈ 0.05 as df→∞.
    expect(studentTTwoSidedP(1.96, 200000)).toBeCloseTo(0.05, 2);
  });

  it("handles degenerate inputs", () => {
    expect(studentTTwoSidedP(0, 5)).toBe(1);
    expect(studentTTwoSidedP(Infinity, 5)).toBe(0);
    expect(studentTTwoSidedP(5, 0)).toBe(1);
  });
});

describe("oneSampleClvTTest", () => {
  it("returns a null result for empty and a degenerate one for n<2", () => {
    expect(oneSampleClvTTest([])).toMatchObject({ n: 0, pValue: 1, tStat: 0 });
    expect(oneSampleClvTTest([1.5])).toMatchObject({ n: 1, meanClv: 1.5, pValue: 1 });
  });

  it("treats a constant nonzero sample as maximally significant and a constant-zero as null", () => {
    const pos = oneSampleClvTTest([1, 1, 1, 1]);
    expect(pos.tStat).toBe(Infinity);
    expect(pos.pValue).toBe(0);
    const zero = oneSampleClvTTest([0, 0, 0]);
    expect(zero.tStat).toBe(0);
    expect(zero.pValue).toBe(1);
  });

  it("computes mean, sd, t and a sane p-value for a varied sample", () => {
    const r = oneSampleClvTTest([2, 0, 2, 0, 2, 0, 2, 0]); // mean 1, sd ~1.069
    expect(r.meanClv).toBe(1);
    expect(r.sdClv).toBeCloseTo(1.069, 2);
    expect(r.positiveRate).toBe(0.5);
    expect(r.tStat).toBeCloseTo(2.646, 2);
    expect(r.pValue).toBeCloseTo(0.033, 2);
  });
});

// Build n games whose HOME open→close drift is governed by a deterministic delta.
// HOME CLV = openSpreadHome − closeSpreadHome = delta (close = open − delta).
function spreadGames(deltas: readonly number[], openSpread = -2): ClvGameOpenClose[] {
  return deltas.map((d, i) => ({
    gameId: `g${i}`,
    openSpreadHome: openSpread,
    closeSpreadHome: openSpread - d,
    openTotal: null,
    closeTotal: null,
  }));
}

describe("evaluateClvFeasibility", () => {
  it("flags a planted positive-drift rule as an edge candidate and its zero-sum mirror as not", () => {
    // 40 games, HOME CLV alternates +1/0 → mean +0.5, t≈6 → survives FDR.
    const deltas = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 : 0));
    const report = evaluateClvFeasibility(spreadGames(deltas), { q: 0.1, minSample: 30 });

    const byKey = new Map(report.rules.map((r) => [r.key, r]));
    // HOME (and its alias FAVORITE, since the home side is favored) are candidates.
    expect(byKey.get("spread:HOME")!.isEdgeCandidate).toBe(true);
    expect(byKey.get("spread:FAVORITE")!.isEdgeCandidate).toBe(true);
    // AWAY / UNDERDOG are discoveries (same |t|) but negative mean → NOT candidates.
    expect(byKey.get("spread:AWAY")!.discovery).toBe(true);
    expect(byKey.get("spread:AWAY")!.isEdgeCandidate).toBe(false);
    expect(byKey.get("spread:UNDERDOG")!.isEdgeCandidate).toBe(false);

    const candidateKeys = report.edgeCandidates.map((r) => r.key).sort();
    expect(candidateKeys).toEqual(["spread:FAVORITE", "spread:HOME"]);
  });

  it("finds NO edge when open→close drift is symmetric (efficient market)", () => {
    // HOME CLV alternates +1/−1 → mean 0 → no discovery either way.
    const deltas = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const report = evaluateClvFeasibility(spreadGames(deltas), { q: 0.1, minSample: 30 });
    expect(report.edgeCandidates).toHaveLength(0);
    expect(report.rules.find((r) => r.key === "spread:HOME")!.discovery).toBe(false);
  });

  it("excludes under-sampled rules from the FDR family (reports but does not judge)", () => {
    const report = evaluateClvFeasibility(spreadGames([1, 0, 1]), { q: 0.1, minSample: 30 });
    const home = report.rules.find((r) => r.key === "spread:HOME")!;
    expect(home.tested).toBe(false);
    expect(home.discovery).toBe(false);
    expect(home.qValue).toBeNull();
    // Total rules never get samples here → also untested.
    expect(report.rules.find((r) => r.key === "total:OVER")!.tested).toBe(false);
    expect(report.edgeCandidates).toHaveLength(0);
  });
});
