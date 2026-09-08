import { describe, expect, it } from "vitest";
import type {
  PublishTimeMarketPResolved,
  PublishTimeMarketPResult,
} from "@sports/prediction-engine";
import {
  MAX_ANCHOR_AGE_MS,
  MAX_ANCHOR_SPREAD_MS,
  NO_MARKET_REFERENCE,
  anchorFreshness,
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
function resolved(p: number, bookCount = 2): PublishTimeMarketPResolved {
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

/**
 * C-256 (Devin). A bookmaker's newest row at or before generatedAt can be
 * arbitrarily old, so a dead book could pair with a live one and present as a
 * two-book snapshot. The policy sits here rather than in the resolver, which the
 * calibration loader also runs.
 */
describe("anchorFreshness", () => {
  const at = (iso: string) => new Date(iso);
  function withTimes(newest: string, oldest: string): PublishTimeMarketPResult {
    return { ...resolved(0.54, 2), snapshotAt: at(newest), oldestBookAt: at(oldest) };
  }

  it("accepts an ordinary refresh cycle", () => {
    const r = withTimes("2026-09-08T12:00:00Z", "2026-09-08T11:45:00Z");
    expect(anchorFreshness(r, at("2026-09-08T12:10:00Z")).usable).toBe(true);
  });

  it("rejects an anchor whose freshest book is older than the age bound", () => {
    const r = withTimes("2026-09-05T12:00:00Z", "2026-09-05T12:00:00Z");
    const f = anchorFreshness(r, at("2026-09-08T12:00:00Z"));
    expect(f.usable).toBe(false);
    expect(f.usable === false && f.reason).toBe("anchor_too_old");
  });

  it("rejects a snapshot blended from books hours apart, even when the newest is fresh", () => {
    // The exact finding: a dead book's last quote paired with a live one.
    const r = withTimes("2026-09-08T12:00:00Z", "2026-09-08T02:00:00Z");
    const f = anchorFreshness(r, at("2026-09-08T12:05:00Z"));
    expect(f.usable).toBe(false);
    expect(f.usable === false && f.reason).toBe("anchor_books_disagree_in_time");
  });

  it("is a no-op on an unresolved anchor, which has nothing to be stale about", () => {
    expect(anchorFreshness(unresolved, at("2026-09-08T12:00:00Z")).usable).toBe(true);
    expect(anchorFreshness(null, at("2026-09-08T12:00:00Z")).usable).toBe(true);
  });

  it("rejects rather than accepts when a timestamp is not finite", () => {
    const r = withTimes("invalid", "2026-09-08T11:00:00Z");
    expect(anchorFreshness(r, at("2026-09-08T12:00:00Z")).usable).toBe(false);
  });

  it("bounds the spread more tightly than the age, so one cannot swallow the other", () => {
    expect(MAX_ANCHOR_SPREAD_MS).toBeLessThan(MAX_ANCHOR_AGE_MS);
  });
});

/**
 * C-258 (Devin). The reasoning paragraph justified a pick with a gap that runs
 * the wrong way, while signalDecision had already PASSED it for that reason.
 */
describe("anchored reasoning follows the sign of the edge", () => {
  it("calls the gap the reason only when the edge is positive", () => {
    const good = signalReasoning(signalEdgeFields(0.66, resolved(0.54)), "Yankees", "elo", 0.66);
    expect(good).toContain("That gap is the reason this pick is here");
  });

  it("does NOT justify a pick the market prices above our estimate", () => {
    const overpriced = signalEdgeFields(0.6, resolved(0.71));
    const text = signalReasoning(overpriced, "Yankees", "elo", 0.6);
    expect(text).not.toContain("reason this pick is here");
    expect(text).toContain("no edge is claimed on it");
  });

  it("treats a zero gap as no reason either", () => {
    const flat = signalEdgeFields(0.66, resolved(0.66));
    expect(signalReasoning(flat, "Yankees", "elo", 0.66)).toContain("no edge is claimed on it");
  });

  it("agrees with signalDecision on every anchored case", () => {
    // The invariant behind the finding: the customer sentence and the machine
    // decision must never disagree about whether an edge exists.
    for (const q of [0.3, 0.5, 0.54, 0.65, 0.66, 0.71, 0.9]) {
      const fields = signalEdgeFields(0.66, resolved(q));
      const claimsEdge = signalReasoning(fields, "Yankees", "elo", 0.66).includes(
        "reason this pick is here",
      );
      expect(claimsEdge, `q=${q}`).toBe(signalDecision(0.66, fields) === "LEAN");
    }
  });

  it("keeps the tail disclaimer on both branches", () => {
    for (const q of [0.54, 0.71]) {
      expect(signalReasoning(signalEdgeFields(0.66, resolved(q)), "Y", "elo", 0.66)).toContain(
        "not a quote you can take",
      );
    }
  });
});

describe("the persisted Edge Index is not a coin-flip distance once a market exists", () => {
  it("derives from the market-relative edge when anchored", () => {
    // Mirrors the slate: anchored uses rawEdge, unanchored uses trueProb - 0.5.
    const anchored = signalEdgeFields(0.66, resolved(0.54));
    expect(Math.max(0, Math.round(anchored.rawEdge * 100))).toBe(12);
    // The old formula would have persisted 16 on the same pick.
    expect(Math.round((0.66 - NO_MARKET_REFERENCE) * 100)).toBe(16);
  });

  it("floors a negative anchored edge at zero, leaving the field's range unchanged", () => {
    const overpriced = signalEdgeFields(0.6, resolved(0.71));
    expect(Math.max(0, Math.round(overpriced.rawEdge * 100))).toBe(0);
  });
});
