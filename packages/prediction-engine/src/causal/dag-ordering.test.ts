/**
 * DAG ordering — tests (arXiv 2301.11898v2).
 *
 * ACCEPTANCE GATE: Kendall's tau is 1 on identical orderings and -1 on
 * reversals; rank-stability aggregation recovers the consensus order;
 * edge constraining keeps order-respecting edges only; the
 * directionality audit flags violations; the verdict adopts/rejects per
 * the three gate conditions.
 */
import { describe, expect, it } from "vitest";
import {
  aggregateOrderings,
  constrainEdges,
  directionalityAudit,
  kendallTau,
  orderingVerdict,
} from "./dag-ordering";

describe("kendallTau", () => {
  it("is 1 on identical orderings, -1 on reversals", () => {
    const a = ["pressure", "sacks", "def_epa", "points"];
    expect(kendallTau(a, [...a])).toBeCloseTo(1, 12);
    expect(kendallTau(a, [...a].reverse())).toBeCloseTo(-1, 12);
    // One adjacent swap in 4 items: 5 concordant, 1 discordant.
    expect(kendallTau(a, ["sacks", "pressure", "def_epa", "points"])).toBeCloseTo(4 / 6, 12);
    expect(() => kendallTau(["a"], ["a"])).toThrow();
    expect(() => kendallTau(["a", "b"], ["a", "c"])).toThrow();
  });
});

describe("aggregateOrderings", () => {
  it("recovers the consensus order by average rank", () => {
    const orderings = [
      ["pressure", "sacks", "def_epa"],
      ["pressure", "def_epa", "sacks"],
      ["sacks", "pressure", "def_epa"],
    ];
    // pressure avg rank 2/3, sacks 4/3, def_epa 6/3.
    expect(aggregateOrderings(orderings)).toEqual(["pressure", "sacks", "def_epa"]);
    expect(() => aggregateOrderings([])).toThrow();
  });
});

describe("constrainEdges", () => {
  it("keeps only order-respecting edges", () => {
    const ordering = ["pressure", "sacks", "def_epa"];
    const edges = [
      { from: "pressure", to: "sacks" },
      { from: "sacks", to: "pressure" }, // violates order
      { from: "sacks", to: "def_epa" },
    ];
    const { kept, keptFraction } = constrainEdges(edges, ordering);
    expect(kept.map((e) => `${e.from}->${e.to}`)).toEqual([
      "pressure->sacks",
      "sacks->def_epa",
    ]);
    expect(keptFraction).toBeCloseTo(2 / 3, 12);
    expect(constrainEdges([], ordering).keptFraction).toBe(1);
  });
});

describe("directionalityAudit", () => {
  it("flags pairs violating football directionality", () => {
    const expected = new Map([
      ["pressure", "sacks"],
      ["sacks", "def_epa"],
    ]);
    const pairs = [
      { before: "pressure", after: "sacks", confidence: 0.9 }, // respects
      { before: "def_epa", after: "sacks", confidence: 0.95 }, // violates
      { before: "sacks", after: "def_epa", confidence: 0.5 }, // below bar
    ];
    const { fraction, n } = directionalityAudit(pairs, expected);
    expect(n).toBe(2);
    expect(fraction).toBeCloseTo(0.5, 12);
    expect(directionalityAudit([], expected).fraction).toBe(1);
  });
});

describe("orderingVerdict", () => {
  it("applies the three gate conditions", () => {
    expect(orderingVerdict(0.7, 0.001, 0.6, 0.9)).toBe("adopt");
    expect(orderingVerdict(0.4, 0.001, 0.6, 0.9)).toBe("reject");
    expect(orderingVerdict(0.55, 0.001, 0.6, 0.9)).toBe("inconclusive");
    expect(orderingVerdict(0.7, 0.01, 0.6, 0.9)).toBe("inconclusive");
  });
});
