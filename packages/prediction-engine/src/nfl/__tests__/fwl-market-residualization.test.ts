import { describe, expect, it } from "vitest";
import {
  orthogonalizeAndShrink,
  residualizeSituationalFamiliesAgainstMarket,
  runMasterSituationalReasoningOverlay,
} from "../master-situational-reasoning-aggregator.js";

function designMatrix(n: number, spread: number[]): number[][] {
  return spread.map((s, i) => [1, 0.15 + i * 0.001, s]);
}

describe("FWL market residualization", () => {
  it("shrinks a spread-collinear feature by more than 90% and keeps an orthogonal signal", () => {
    const n = 40;
    const spread = Array.from({ length: n }, (_, i) => -7 + i * 0.35);
    const collinear = spread.map((s) => 0.95 * s + 0.02);
    const orthogonal = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const M = designMatrix(n, spread);
    const collinearResidual = residualizeSituationalFamiliesAgainstMarket(collinear, 0.2, 0, M);
    const orthogonalResidual = residualizeSituationalFamiliesAgainstMarket(orthogonal, 0.2, 0, M);
    const rawNorm = Math.hypot(...collinear);
    const residNorm = Math.hypot(...collinearResidual);
    expect(residNorm / rawNorm).toBeLessThan(0.1);
    const orthRaw = Math.hypot(...orthogonal);
    const orthResid = Math.hypot(...orthogonalResidual);
    expect(orthResid / orthRaw).toBeGreaterThan(0.9);

    const overlay = runMasterSituationalReasoningOverlay({
      familyDeltas: { pressure: 0.2, weather: 0.05 },
      marketAnchorProb: 0.55,
      independentEdgeDecision: "PASS",
      situationalVector: collinear,
      spreadLine: 0,
      historicalWindowMatrix: M,
    });
    expect(overlay.publishAllowed).toBe(false);
    expect(overlay.fwlResidual).toBeDefined();
    const shrunk = orthogonalizeAndShrink(
      { pressure: collinearResidual.reduce((s, v) => s + v, 0) / n },
      0.55,
    );
    expect(Math.abs(shrunk.totalProbabilityDelta)).toBeLessThan(0.35 + 1e-9);
  });
});
