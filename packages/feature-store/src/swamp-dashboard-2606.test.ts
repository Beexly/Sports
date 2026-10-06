import { describe, expect, it } from "vitest";
import {
  compareQuarters,
  swampIndicators,
  type TableInventory,
} from "./swamp-dashboard-2606.js";

const healthy: TableInventory[] = [
  { table: "t1", owner: "ann", metadataCompleteness: 0.95, daysSinceActivity: 5, lineage: ["ngs"], duplicationRate: 0.05 },
  { table: "t2", owner: "bob", metadataCompleteness: 0.92, daysSinceActivity: 10, lineage: ["nflverse"], duplicationRate: 0.1 },
];

describe("swamp dashboard", () => {
  it("computes the six indicators on a healthy inventory", () => {
    const ind = swampIndicators(healthy);
    expect(ind.tables).toBe(2);
    expect(ind.ownership).toBe(1);
    expect(ind.metadataCompleteness).toBeCloseTo(0.935, 9);
    expect(ind.dormancy90).toBe(0);
    expect(ind.lineageCoverage).toBe(1);
    expect(ind.duplication).toBeCloseTo(0.1, 9);
    expect(ind.computable).toBe(true);
    expect(ind.firstRunBar).toBe(true);
  });

  it("flags dormancy, missing owners, and duplication breaches", () => {
    const tables: TableInventory[] = [
      { table: "old", metadataCompleteness: 0.5, daysSinceActivity: 120, lineage: [], duplicationRate: 0.3 },
    ];
    const ind = swampIndicators(tables);
    expect(ind.ownership).toBe(0);
    expect(ind.dormancy90).toBe(1);
    expect(ind.lineageCoverage).toBe(0);
    expect(ind.duplicationBreach).toBe(1);
    expect(ind.firstRunBar).toBe(false);
  });

  it("marks uncomputable when instrumentation is missing", () => {
    const ind = swampIndicators([
      { table: "x", owner: "a", metadataCompleteness: NaN, daysSinceActivity: 1, lineage: ["s"], duplicationRate: 0 },
    ]);
    expect(ind.computable).toBe(false);
    expect(ind.firstRunBar).toBe(false);
  });

  it("escalates intervention on deteriorating quarters", () => {
    const q1 = swampIndicators(healthy);
    const q2tables: TableInventory[] = healthy.map((t) => ({
      ...t,
      metadataCompleteness: 0.7,
      daysSinceActivity: 100,
      duplicationRate: 0.25,
    }));
    const q2 = swampIndicators(q2tables);
    const cmp = compareQuarters(q2, q1);
    expect(cmp.deteriorated.length).toBeGreaterThanOrEqual(2);
    expect(["remediate", "freeze"]).toContain(cmp.stage);
  });

  it("stays quiet on a stable quarter", () => {
    const cmp = compareQuarters(swampIndicators(healthy), swampIndicators(healthy));
    expect(cmp.deteriorated).toEqual([]);
    expect(cmp.stage).toBe("none");
  });

  it("handles empty input", () => {
    const ind = swampIndicators([]);
    expect(ind.computable).toBe(false);
    const cmp = compareQuarters(ind);
    expect(cmp.stage).toBe("none");
  });
});
