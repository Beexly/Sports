import { describe, expect, it } from "vitest";
import { countThreeCycles, cycleRate, dominanceGraph, longCycles } from "./cycle-diagnostics";

describe("cycle-diagnostics", () => {
  it("detects a rock-paper-scissors triple", () => {
    const recs = [
      { a: "A", b: "B", winsA: 3, winsB: 1 }, // A > B
      { a: "B", b: "C", winsA: 3, winsB: 1 }, // B > C
      { a: "C", b: "A", winsA: 3, winsB: 1 }, // C > A
    ];
    const g = dominanceGraph(recs);
    expect(countThreeCycles(g)).toBe(1);
    expect(cycleRate(g)).toBeCloseTo(1, 12);
  });
  it("transitive hierarchy has zero cycles", () => {
    const recs = [
      { a: "A", b: "B", winsA: 4, winsB: 0 },
      { a: "B", b: "C", winsA: 4, winsB: 0 },
      { a: "A", b: "C", winsA: 4, winsB: 0 },
    ];
    const g = dominanceGraph(recs);
    expect(countThreeCycles(g)).toBe(0);
    expect(cycleRate(g)).toBe(0);
  });
  it("longCycles finds 4-cycles for narratives", () => {
    const recs = [
      { a: "A", b: "B", winsA: 2, winsB: 0 }, { a: "B", b: "C", winsA: 2, winsB: 0 },
      { a: "C", b: "D", winsA: 2, winsB: 0 }, { a: "D", b: "A", winsA: 2, winsB: 0 },
    ];
    const g = dominanceGraph(recs);
    const cs = longCycles(g, 4);
    expect(cs.length).toBeGreaterThanOrEqual(1);
    expect(cs[0]?.length).toBe(4);
  });
  it("minGames floor suppresses noisy edges", () => {
    const recs = [{ a: "A", b: "B", winsA: 1, winsB: 0 }];
    expect(dominanceGraph(recs, 2).get("A")?.has("B")).toBeFalsy();
    expect(dominanceGraph(recs, 1).get("A")?.has("B")).toBe(true);
    expect(cycleRate(new Map())).toBe(0);
  });
});
