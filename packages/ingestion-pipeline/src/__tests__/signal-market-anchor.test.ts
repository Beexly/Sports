import { describe, expect, it } from "vitest";
import type { PublishTimeMarketPResult } from "@sports/prediction-engine";
import {
  NO_MARKET_REFERENCE,
  SIGNAL_EDGE_SHRINK,
  signalEdgeFields,
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
