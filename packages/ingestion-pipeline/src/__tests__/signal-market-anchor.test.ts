import { describe, expect, it } from "vitest";
import type { PublishTimeMarketPResult } from "@sports/prediction-engine";
import {
  NO_MARKET_REFERENCE,
  SIGNAL_EDGE_SHRINK,
  SIGNAL_LEAN_TRUEPROB,
  signalDecision,
  signalEdgeFields,
  signalFactorDescription,
  signalRationale,
  signalReasoning,
} from "../signal-market-anchor.js";

/**
 * C-253. The signal slate used to write `rawEdge = trueProb - 0.5` on every
 * pick and call it an edge. These tests pin the two populations apart: a pick
 * with a real de-vigged book price measures against that price, a pick without
 * one measures against a coin flip AND SAYS SO, and no copy asserts a price a
 * pick does not have or denies one it does.
 */
function resolved(p: number, bookCount = 2): PublishTimeMarketPResult {
  return {
    status: "resolved",
    p,
    side: "home",
    bookCount,
    pSource: bookCount >= 2 ? "market_p_from_odds_table" : "market_p_single_book",
    bookmakers: bookCount >= 2 ? ["draftkings", "espn_public"] : ["espn_public"],
    snapshotAt: new Date("2026-09-08T12:00:00Z"),
    oldestBookAt: new Date("2026-09-08T11:00:00Z"),
    method: "mean_implied_proportional_devig",
  };
}

const unresolved: PublishTimeMarketPResult = {
  status: "unresolved",
  reason: "no_rows",
  bookCount: 0,
};

describe("signalEdgeFields", () => {
  it("measures the edge against the de-vigged book price when one exists", () => {
    const f = signalEdgeFields(0.66, resolved(0.54));
    expect(f.anchored).toBe(true);
    expect(f.reference).toBe(0.54);
    expect(f.marketFairProb).toBe(0.54);
    expect(f.rawEdge).toBeCloseTo(0.12, 9);
    expect(f.shrunkEdge).toBeCloseTo(0.12 * SIGNAL_EDGE_SHRINK, 9);
  });

  it("does NOT measure against 0.5 when a market exists", () => {
    // The whole defect: 0.66 - 0.5 = 0.16 would have been the stored "edge"
    // even though the market said 0.54 and the real edge is 0.12.
    const f = signalEdgeFields(0.66, resolved(0.54));
    expect(f.rawEdge).not.toBeCloseTo(0.66 - NO_MARKET_REFERENCE, 6);
  });

  it("can produce a NEGATIVE edge, which the coin-flip reference could never do above 0.5", () => {
    // A pick the model likes at 0.60 against a market at 0.71 is overpriced.
    // trueProb - 0.5 is +0.10 there and would have read as a positive edge.
    const f = signalEdgeFields(0.6, resolved(0.71));
    expect(f.rawEdge).toBeLessThan(0);
    expect(f.shrunkEdge).toBeLessThan(0);
  });

  it("keeps marketFairProb null and flags the row when nothing was stored", () => {
    const f = signalEdgeFields(0.66, unresolved);
    expect(f.anchored).toBe(false);
    expect(f.marketFairProb).toBeNull();
    expect(f.reference).toBe(NO_MARKET_REFERENCE);
    expect(f.rawEdge).toBeCloseTo(0.16, 9);
    expect(f.marketFairSource).toBeNull();
    expect(f.marketBookCount).toBeNull();
    expect(f.marketSnapshotAt).toBeNull();
  });

  it("treats a null resolver result (a throw upstream) as unanchored, not as an anchor at 0.5", () => {
    const f = signalEdgeFields(0.66, null);
    expect(f.anchored).toBe(false);
    expect(f.marketFairProb).toBeNull();
  });

  it("carries the book count and source so one book is never read as two", () => {
    const one = signalEdgeFields(0.66, resolved(0.54, 1));
    expect(one.marketFairSource).toBe("market_p_single_book");
    expect(one.marketBookCount).toBe(1);
    const two = signalEdgeFields(0.66, resolved(0.54, 2));
    expect(two.marketFairSource).toBe("market_p_from_odds_table");
    expect(two.marketBookCount).toBe(2);
  });
});

describe("copy honesty", () => {
  const anchoredFields = signalEdgeFields(0.66, resolved(0.54, 2));
  const singleBookFields = signalEdgeFields(0.66, resolved(0.54, 1));
  const bareFields = signalEdgeFields(0.66, unresolved);

  it("never denies a book price on a pick that has one", () => {
    const r = signalReasoning(anchoredFields, "Yankees", "elo, poisson", 0.66);
    expect(r).not.toContain("No book price is attached");
    expect(r).not.toContain("no book line");
    expect(r).toContain("de-vigged");
  });

  it("still denies a book price on a pick that has none", () => {
    const r = signalReasoning(bareFields, "Yankees", "elo, poisson", 0.66);
    expect(r).toContain("No book price is attached to this pick");
    expect(r).toContain("not a sportsbook quote");
  });

  it("never claims an edge against a market in the unanchored rationale", () => {
    const r = signalRationale(bareFields, "Yankees", "elo, poisson", 0.66);
    expect(r).toContain("No market price was stored");
    expect(r).toContain("no edge against a market is claimed");
    expect(r).not.toContain("de-vigged");
  });

  it("says out loud when the anchor is below the two-book floor", () => {
    const r = signalRationale(singleBookFields, "Yankees", "elo", 0.66);
    expect(r).toContain("below the two-book floor");
    expect(r).toContain("one stored book line");
  });

  it("does not add the floor caveat when two books backed the anchor", () => {
    const r = signalRationale(anchoredFields, "Yankees", "elo, poisson", 0.66);
    expect(r).not.toContain("below the two-book floor");
    expect(r).toContain("2 stored book lines");
  });

  it("no copy path promises a takeable price", () => {
    for (const r of [
      signalReasoning(anchoredFields, "Yankees", "elo", 0.66),
      signalReasoning(singleBookFields, "Yankees", "elo", 0.66),
      signalReasoning(bareFields, "Yankees", "elo", 0.66),
    ]) {
      expect(r).not.toMatch(/guaranteed|sure thing|can't lose/i);
    }
    expect(signalReasoning(anchoredFields, "Yankees", "elo", 0.66)).toContain(
      "not a quote you can take",
    );
  });

  it("contains no em dash in any authored copy path", () => {
    for (const r of [
      signalRationale(anchoredFields, "Yankees", "elo", 0.66),
      signalRationale(singleBookFields, "Yankees", "elo", 0.66),
      signalRationale(bareFields, "Yankees", "elo", 0.66),
      signalReasoning(anchoredFields, "Yankees", "elo", 0.66),
      signalReasoning(bareFields, "Yankees", "elo", 0.66),
    ]) {
      expect(r).not.toContain("—");
    }
  });
});

/**
 * C-255. Three findings Devin raised on the C-253 change, each pinned here.
 */
describe("signalDecision — a pick the market prices above us is not a LEAN", () => {
  it("claims LEAN when the model likes it and the market does not already price it there", () => {
    expect(signalDecision(0.66, signalEdgeFields(0.66, resolved(0.54)))).toBe("LEAN");
  });

  it("PASSES an anchored pick whose measured edge is NEGATIVE", () => {
    // The whole finding. trueProb 0.66 clears the 0.58 model floor, so the old
    // rule said LEAN. The market prices the side at 0.71, so our own arithmetic
    // says it is overpriced and we must not claim an edge on it.
    const overpriced = signalEdgeFields(0.66, resolved(0.71));
    expect(overpriced.rawEdge).toBeLessThan(0);
    expect(signalDecision(0.66, overpriced)).toBe("PASS");
  });

  it("PASSES at exactly zero edge: a zero edge is not an edge", () => {
    expect(signalDecision(0.66, signalEdgeFields(0.66, resolved(0.66)))).toBe("PASS");
  });

  it("leaves the UNANCHORED rule exactly as it was", () => {
    // Nothing changed for these rows: there is still no market to compare
    // against, and their copy says so.
    expect(signalDecision(0.66, signalEdgeFields(0.66, unresolved))).toBe("LEAN");
    expect(signalDecision(0.5, signalEdgeFields(0.5, unresolved))).toBe("PASS");
    expect(signalDecision(SIGNAL_LEAN_TRUEPROB, signalEdgeFields(SIGNAL_LEAN_TRUEPROB, unresolved))).toBe("LEAN");
  });

  it("still PASSES a positive-edge pick the model does not like enough", () => {
    // Both halves are required. A 2 point edge on a 0.52 estimate is not a LEAN
    // on this lane, and was not before.
    expect(signalDecision(0.52, signalEdgeFields(0.52, resolved(0.5)))).toBe("PASS");
  });
});

describe("signalFactorDescription — the third place the price sentence lived", () => {
  it("does not deny book odds on a pick that has a de-vigged price", () => {
    const d = signalFactorDescription(signalEdgeFields(0.66, resolved(0.54, 2)), "elo, poisson", 0.66);
    expect(d).not.toContain("No book odds attached");
    expect(d).toContain("Stored book fair 0.540");
    expect(d).toContain("2 stored book lines");
    expect(d).toContain("edge +0.120");
  });

  it("still denies book odds on a pick that has none", () => {
    const d = signalFactorDescription(signalEdgeFields(0.66, unresolved), "elo", 0.66);
    expect(d).toContain("No book odds attached.");
    expect(d).not.toContain("Stored book fair");
  });

  it("shows a negative edge with its sign rather than hiding it", () => {
    const d = signalFactorDescription(signalEdgeFields(0.6, resolved(0.71)), "elo", 0.6);
    expect(d).toContain("edge -0.110");
  });

  it("agrees with the rationale and the reasoning on every path", () => {
    // Asserted on SUBSTANCE, not on a phrase list. The first draft of this test
    // matched the literal "No book odds/price" and failed on the rationale,
    // which says "No market price was stored" - a different sentence making the
    // same statement. Matching vocabulary would have forced three unrelated
    // sentences into one wording to satisfy a test; what actually has to hold is
    // that all three either assert a price or deny one, never a mix.
    const assertsPrice = (t: string) => /de-vigged|Stored book fair/i.test(t);
    const deniesPrice = (t: string) =>
      /No book (odds|price)|No market price was stored/i.test(t);

    for (const [label, fields] of [
      ["two books", signalEdgeFields(0.66, resolved(0.54, 2))],
      ["one book", signalEdgeFields(0.66, resolved(0.54, 1))],
      ["no market", signalEdgeFields(0.66, unresolved)],
    ] as const) {
      const all = [
        signalFactorDescription(fields, "elo", 0.66),
        signalRationale(fields, "Yankees", "elo", 0.66),
        signalReasoning(fields, "Yankees", "elo", 0.66),
      ];
      for (const text of all) {
        // Never both, on any single statement.
        expect(assertsPrice(text) && deniesPrice(text), `${label}: "${text}"`).toBe(false);
      }
      if (fields.anchored) {
        expect(all.every(assertsPrice), label).toBe(true);
        expect(all.some(deniesPrice), label).toBe(false);
      } else {
        expect(all.every(deniesPrice), label).toBe(true);
        expect(all.some(assertsPrice), label).toBe(false);
      }
    }
  });
});
