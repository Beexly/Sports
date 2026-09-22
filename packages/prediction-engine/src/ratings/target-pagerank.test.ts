import { describe, expect, it } from "vitest";
import {
  buildTransition,
  centralityResiduals,
  pagerankCentrality,
  teamCentralityDifferential,
} from "./target-pagerank";
import type { PlayArc } from "./target-pagerank";

// Synthetic week: QB feeds two WRs; WR1 scores twice, WR2 never scores.
const arcs: PlayArc[] = [];
for (let i = 0; i < 10; i++) arcs.push({ from: "WR1", to: "QB", kind: "target" });
for (let i = 0; i < 8; i++) arcs.push({ from: "WR2", to: "QB", kind: "target" });
arcs.push({ from: "GOAL", to: "WR1", kind: "td" });
arcs.push({ from: "GOAL", to: "WR1", kind: "td" });
arcs.push({ from: "QB", to: "CB1", kind: "int" }); // victim -> defender

describe("target-pagerank", () => {
  it("buildTransition normalizes out-arcs to 1", () => {
    const { nodes, trans } = buildTransition(arcs);
    expect(nodes.length).toBeGreaterThan(3);
    for (const outs of trans.values()) {
      expect(outs.reduce((s, e) => s + e.p, 0)).toBeCloseTo(1, 12);
    }
  });

  it("TD scorer outranks the target-only peer", () => {
    const { nodes, trans } = buildTransition(arcs);
    const rank = pagerankCentrality(nodes, trans);
    const total = Object.values(rank).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(rank["WR1"]).toBeGreaterThan(rank["WR2"] ?? 0);
    expect(rank["CB1"]).toBeGreaterThan(0); // INT credit
  });

  it("empty graph returns empty centrality", () => {
    expect(pagerankCentrality([], new Map())).toEqual({});
  });

  it("centralityResiduals flags high-centrality, low-production players", () => {
    const centrality = { a: 0.4, b: 0.3, c: 0.2, d: 0.1 };
    const production = { a: 10, b: 100, c: 60, d: 50 }; // a: central but unproductive
    const res = centralityResiduals(centrality, production);
    expect(res["a"]).toBeGreaterThan(res["b"] ?? 0);
    expect(centralityResiduals({ a: 1 }, { a: 1 })).toEqual({}); // too few
  });

  it("teamCentralityDifferential signs the stronger target network", () => {
    const centrality = { qbA: 0.3, wrA: 0.2, qbB: 0.15, wrB: 0.1 };
    const teamOf = (id: string): string => (id.endsWith("A") ? "A" : "B");
    expect(teamCentralityDifferential(centrality, teamOf, "A", "B", 11)).toBeGreaterThan(0);
    expect(teamCentralityDifferential(centrality, teamOf, "B", "A", 11)).toBeLessThan(0);
  });
});
