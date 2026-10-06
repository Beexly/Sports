// Tests for decision/2001-09097v1-gap-stat-ratings.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  createGapTable,
  updateGapTable,
  predictStatDifferential,
  logisticProb,
  gapOutcomeProbs,
  gapGatePasses,
} from "./2001-09097v1-gap-stat-ratings.js";

describe("GAP-for-NFL ratings (2001.09097v1)", () => {
  it("updates 4-way ratings in the direction of the observed gap", () => {
    let table = createGapTable(["KC", "BUF"]);
    const before = predictStatDifferential(table, "KC", "BUF");
    expect(before).toBe(0);
    // KC dominates EPA/play at home (0.25 vs -0.05).
    table = updateGapTable(table, { homeTeam: "KC", awayTeam: "BUF", homeObserved: 0.25, awayObserved: -0.05 }, 0.2);
    const after = predictStatDifferential(table, "KC", "BUF");
    expect(after).toBeGreaterThan(0);
    // Venue split: KC's home offense moved, not its away offense.
    expect(table["KC"]!.offHome).toBeGreaterThan(table["KC"]!.offAway);
    // BUF's away defense absorbed the damage.
    expect(table["BUF"]!.defAway).toBeGreaterThan(0);
  });
  it("is antisymmetric-ish: swapping venues flips the differential sign", () => {
    let table = createGapTable(["KC", "BUF"]);
    table = updateGapTable(table, { homeTeam: "KC", awayTeam: "BUF", homeObserved: 0.3, awayObserved: 0.0 }, 0.3);
    const kcHome = predictStatDifferential(table, "KC", "BUF");
    const bufHome = predictStatDifferential(table, "BUF", "KC");
    expect(kcHome).toBeGreaterThan(0);
    expect(bufHome).toBeLessThan(kcHome); // venue ratings differ by construction
  });
  it("does not mutate the input table", () => {
    const table = createGapTable(["KC", "BUF"]);
    updateGapTable(table, { homeTeam: "KC", awayTeam: "BUF", homeObserved: 1, awayObserved: 1 }, 0.5);
    expect(predictStatDifferential(table, "KC", "BUF")).toBe(0);
  });
});

describe("logisticProb / gapOutcomeProbs", () => {
  it("is monotone in the differential and bounded", () => {
    expect(logisticProb(0, 0, 1)).toBeCloseTo(0.5, 10);
    expect(logisticProb(2, 0, 1)).toBeGreaterThan(logisticProb(1, 0, 1));
    expect(logisticProb(-5, 0, 1)).toBeGreaterThan(0);
    expect(logisticProb(5, 0, 1)).toBeLessThan(1);
  });
  it("maps a positive differential to favorite-side probabilities", () => {
    const probs = gapOutcomeProbs(0.15, {
      win: { intercept: 0.4, slope: 8 },
      cover: { intercept: 0.1, slope: 6 },
      over: { intercept: 0, slope: 4 },
    });
    expect(probs.winProb).toBeGreaterThan(0.5);
    expect(probs.coverProb).toBeGreaterThan(0.5);
    expect(probs.overProb).toBeGreaterThan(0.5);
  });
});

describe("gapGatePasses", () => {
  it("encodes Brier/CLV/ROI-CI gate", () => {
    expect(gapGatePasses(0.006, 0.4, 0.01, 0.05)).toBe(true);
    expect(gapGatePasses(0.004, 0.4, 0.01, 0.05)).toBe(false);
    expect(gapGatePasses(0.006, 0.2, 0.01, 0.05)).toBe(false);
    expect(gapGatePasses(0.006, 0.4, -0.01, 0.05)).toBe(false); // CI includes zero
  });
});
