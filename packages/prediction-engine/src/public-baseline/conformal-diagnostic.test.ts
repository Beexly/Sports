import { describe, it, expect } from "vitest";
import {
  computeConformalQuantile,
  buildConformalPredictionInterval,
  evaluateConformalDiagnostic,
  hashEpaDropoffTable,
  reallocateEpaDropoff,
  type SealedEpaDropoffTable,
} from "./conformal-diagnostic.js";

describe("conformal-diagnostic: Grok-2 conformal residual flags & prediction intervals", () => {
  it("computes finite-sample empirical quantile qHat from sorted absolute residuals", () => {
    // n = 9 observations, alpha = 0.10 (90% coverage)
    // k = ceil((1 - 0.10) * (9 + 1)) = ceil(0.9 * 10) = 9 -> order statistic |r|_(9)
    const absResiduals = [0.5, 1.0, 1.2, 1.8, 2.1, 2.5, 3.0, 3.4, 4.2];
    const qHat = computeConformalQuantile(absResiduals, 0.10);
    expect(qHat).toBe(4.2);

    // alpha = 0.20 (80% coverage) -> ceil(0.8 * 10) = 8 -> 3.4
    const qHat80 = computeConformalQuantile(absResiduals, 0.20);
    expect(qHat80).toBe(3.4);
  });

  it("constructs valid symmetric conformal prediction interval around sealed total", () => {
    const sealedTotal = 47.5;
    const qHat = 3.5;
    const interval = buildConformalPredictionInterval(sealedTotal, qHat);
    expect(interval.lower).toBe(44.0);
    expect(interval.upper).toBe(51.0);
  });

  it("flags external totals falling outside the conformal band without modifying sealed objects", () => {
    const sealedTotal = 48.0;
    const qHat = 3.0; // interval [45.0, 51.0]

    // Inside interval: external total = 49.5 (residual = -1.5, abs = 1.5 <= 3.0)
    const diagInside = evaluateConformalDiagnostic({
      gameId: "401873017",
      sealedModelTotal: sealedTotal,
      externalTotal: 49.5,
      qHat,
    });
    expect(diagInside.flagged).toBe(false);
    expect(diagInside.residual).toBe(-1.5);
    expect(diagInside.absResidual).toBe(1.5);

    // Outside interval: external total = 52.5 (residual = -4.5, abs = 4.5 > 3.0)
    const diagOutside = evaluateConformalDiagnostic({
      gameId: "401873018",
      sealedModelTotal: sealedTotal,
      externalTotal: 52.5,
      qHat,
    });
    expect(diagOutside.flagged).toBe(true);
    expect(diagOutside.absResidual).toBe(4.5);
    expect(diagOutside.reason).toContain("exceeds conformal quantile");
  });
});

describe("sealed EPA dropoff table: immutability and depth-chart redistribution", () => {
  const table: SealedEpaDropoffTable = Object.freeze({
    "Mike Evans": -0.22,
    "George Kittle": -0.18,
    "Christian McCaffrey": -0.35,
    "Brandon Aiyuk": -0.15,
  });

  it("generates deterministic 64-char SHA-256 hash for inclusion in coachMindsetHash", () => {
    const hash1 = hashEpaDropoffTable(table);
    const hash2 = hashEpaDropoffTable(table);
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });

  it("redistributes dropoff residual strictly under sealed numbers leaving hash unchanged", () => {
    const result = reallocateEpaDropoff({
      table,
      inactivePlayerId: "Mike Evans",
      replacementDepthIds: ["Brandin Cooks", "Jalen McMillan"],
      depthWeights: [0.70, 0.30],
    });

    expect(result.originalDropoff).toBe(-0.22);
    expect(result.allocations["Brandin Cooks"]).toBeCloseTo(-0.154, 4);
    expect(result.allocations["Jalen McMillan"]).toBeCloseTo(-0.066, 4);
    expect(result.tableHash).toBe(hashEpaDropoffTable(table));
  });
});
