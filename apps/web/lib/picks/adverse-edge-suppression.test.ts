import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  countAdverseEdgePicks,
  dropAdverseEdgePicks,
  isAdverseEdgeRow,
  readIndependentEdge,
} from "./adverse-edge-suppression";

/**
 * The display-side half of the PASS-leak fix.
 *
 * The mint gate in scoring.ts is forward-only. Measured on production
 * 2026-09-13, nine published PENDING rows minted before it deployed still
 * carried a negative expectedClv (worst -0.1742), and all nine also read
 * decision = PASS — the two predicates selected the identical set.
 *
 * The invariant that makes suppression SAFE is the asymmetry: a missing or
 * unreadable estimate is silence, and silence keeps the row. If that ever
 * inverts, a parse bug becomes a silent board wipe. Most of this file exists
 * to pin that direction.
 */

/**
 * Strip comments before asserting on source. This module DOCUMENTS both
 * "isPublished is untouched" and the "expectedClv < 0" predicate at length, and
 * that prose is the record of why the rule is shaped this way. An assertion
 * that forbids the phrase outright would force a future author to delete the
 * explanation to keep the guard green.
 */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const edge = (expectedClv: number, decision = "SPEAK") => ({
  factorBreakdown: { independentEdge: { expectedClv, decision } },
});

describe("dropAdverseEdgePicks", () => {
  it("drops a row the engine prices worse than the book", () => {
    // The two rows that were live on 2026-09-13.
    expect(isAdverseEdgeRow(edge(-0.0591, "PASS"))).toBe(true);
    expect(isAdverseEdgeRow(edge(-0.1356, "PASS"))).toBe(true);
    expect(isAdverseEdgeRow(edge(-0.1742, "PASS"))).toBe(true);
  });

  it("keeps a row with a positive edge", () => {
    expect(isAdverseEdgeRow(edge(0.2257))).toBe(false);
    expect(isAdverseEdgeRow(edge(0.0217))).toBe(false);
  });

  it("keeps exactly zero — no edge either way is not adverse", () => {
    // Every model-signal row reads 0.0000. They are uninformative on this axis,
    // not bets against ourselves, and suppressing them here would silently
    // empty the free spine.
    expect(isAdverseEdgeRow(edge(0))).toBe(false);
    expect(isAdverseEdgeRow(edge(-0))).toBe(false);
  });

  it("gates on the signed number, never on the decision label", () => {
    // A CONTRADICTS row has expectedClv 0.0 by construction (the agreement
    // factor zeroes it), so gating on decision === "PASS" would be a different,
    // wider rule than the engine's own. The label is a summary; the number is
    // the claim.
    expect(isAdverseEdgeRow(edge(0, "CONTRADICTS"))).toBe(false);
    expect(isAdverseEdgeRow(edge(-0.02, "SPEAK"))).toBe(true);
  });
});

describe("absence is silence, and silence keeps the row", () => {
  it("keeps a row with no independentEdge at all", () => {
    expect(isAdverseEdgeRow({ factorBreakdown: { rankingP: 0.6 } })).toBe(false);
  });

  it("keeps a row with no factorBreakdown at all", () => {
    expect(isAdverseEdgeRow({})).toBe(false);
    expect(isAdverseEdgeRow({ factorBreakdown: null })).toBe(false);
    expect(isAdverseEdgeRow({ factorBreakdown: undefined })).toBe(false);
  });

  it("keeps a row whose expectedClv is not a finite number", () => {
    // A malformed or legacy blob must never be read as a reason to hide a pick.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, null, "-0.5", undefined]) {
      expect(isAdverseEdgeRow({ factorBreakdown: { independentEdge: { expectedClv: bad } } })).toBe(false);
    }
  });

  it("keeps a row whose factorBreakdown is not an object", () => {
    for (const bad of ["{}", 3, true, []]) {
      expect(isAdverseEdgeRow({ factorBreakdown: bad })).toBe(false);
    }
    // An array has no independentEdge key, so it parses to silence, not a drop.
    expect(readIndependentEdge([])).toBeNull();
  });

  it("NEGATIVE CONTROL: a parse failure must not empty the board", () => {
    // If the asymmetry ever inverts, this is the test that catches it.
    const garbage = Array.from({ length: 12 }, () => ({ factorBreakdown: "not json" }));
    expect(dropAdverseEdgePicks(garbage)).toHaveLength(12);
    expect(countAdverseEdgePicks(garbage)).toBe(0);
  });
});

describe("it suppresses a display and does not retract a pick", () => {
  it("returns a subset in the original order, touching nothing else", () => {
    const rows = [
      { id: "a", ...edge(0.2257) },
      { id: "b", ...edge(-0.1356, "PASS") },
      { id: "c", ...edge(0.0217) },
      { id: "d", ...edge(-0.0591, "PASS") },
      { id: "e", ...edge(0) },
    ];
    const kept = dropAdverseEdgePicks(rows);
    expect(kept.map((r) => r.id)).toEqual(["a", "c", "e"]);
    // Same object references: nothing is rewritten on the way through.
    expect(kept[0]).toBe(rows[0]);
    expect(countAdverseEdgePicks(rows)).toBe(2);
  });

  it("writes nothing — the module has no db import and no isPublished write", () => {
    // A suppressed row must still settle and still count in the public record.
    // Hiding a bet we should not have offered is honest; erasing it from the
    // track record afterwards would not be.
    const src = code(resolve(__dirname, "adverse-edge-suppression.ts"));
    expect(src).not.toMatch(/@sports\/db/);
    expect(src).not.toMatch(/isPublished/);
    expect(src).not.toMatch(/\.update\(|\.updateMany\(|\.delete\(/);
  });

  it("imports the predicate from the engine rather than restating it", () => {
    // One spelling of the rule. Two gates restating it is how they drift, and a
    // drift in this direction publishes a bet we said not to take.
    const src = code(resolve(__dirname, "adverse-edge-suppression.ts"));
    expect(src).toMatch(/import \{ pricesWorseThanMarket, type IndependentEdgeSummary \} from "@sports\/types"/);
    expect(src).not.toMatch(/from "@sports\/prediction-engine"/);
    expect(src).not.toMatch(/expectedClv\s*<\s*0/);
  });

  it("handles an empty slate", () => {
    expect(dropAdverseEdgePicks([])).toEqual([]);
    expect(countAdverseEdgePicks([])).toBe(0);
  });
});

describe("both read surfaces apply it before their row cap", () => {
  it("/api/picks suppresses before ranking and before the tier slice", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "..", "app/api/picks/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/const soundPicks = dropAdverseEdgePicks\(coherentPicks\)/);
    expect(src).toMatch(/\[\.\.\.soundPicks\]\.sort\(comparePicksByRanking\)/);
    // A capped viewer must spend their allowance on rows that survive.
    expect(src.indexOf("dropAdverseEdgePicks")).toBeLessThan(src.indexOf("dailyPickLimit != null\n      ? rankedPicks"));
  });

  it("the board suppresses before the 12-row lane slice", () => {
    const src = readFileSync(resolve(__dirname, "..", "board/state.ts"), "utf8");
    expect(src).toMatch(/dropAdverseEdgePicks\(dropContradictedModelSignals\(publishedTodayRaw\)\)/);
  });
});
