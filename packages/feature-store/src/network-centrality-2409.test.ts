import { describe, expect, it } from "vitest";
import { degreeCentrality, triangleMotifs, personnelChurn, centralitySeries } from "./network-centrality-2409.js";

const q1 = {
  quarter: 1,
  adjacency: [[0, 2, 0], [0, 0, 3], [1, 0, 0]], // triangle 0->1->2->0
  activeNodes: [0, 1, 2],
};

describe("network centrality", () => {
  it("degree centrality normalizes out-degree", () => {
    const c = degreeCentrality(q1);
    expect(c[0]).toBeCloseTo(1, 10); // out 2 over (3-1)
    expect(c[1]).toBeCloseTo(1.5, 10);
  });
  it("counts the directed triangle once", () => {
    expect(triangleMotifs(q1)).toBe(1);
  });
  it("measures personnel churn between quarters", () => {
    const q2 = { ...q1, quarter: 2, activeNodes: [0, 1, 3] };
    expect(personnelChurn(q1, q2)).toBeCloseTo(0.5, 10); // 2 of 4 union nodes changed
    expect(personnelChurn(q1, q1)).toBe(0);
  });
  it("inactive nodes get zero centrality", () => {
    const c = degreeCentrality({ ...q1, activeNodes: [1, 2] });
    expect(c[0]).toBe(0);
  });
  it("builds a per-quarter series", () => {
    expect(centralitySeries([q1, q1])).toHaveLength(2);
  });
  it("handles empty input", () => {
    expect(centralitySeries([])).toEqual([]);
    expect(degreeCentrality({ quarter: 1, adjacency: [], activeNodes: [] })).toEqual([]);
    expect(triangleMotifs({ quarter: 1, adjacency: [], activeNodes: [] })).toBe(0);
  });
  it("handles edge inputs", () => {
    // single-node network: no out-degree possible
    expect(degreeCentrality({ quarter: 1, adjacency: [[0]], activeNodes: [0] })).toEqual([0]);
    // identical quarters have zero churn
    expect(personnelChurn(q1, q1)).toBe(0);
  });
});

