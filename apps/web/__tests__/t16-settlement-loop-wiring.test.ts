import { describe, expect, it } from "vitest";
import {
  murphyBrierDecomposition,
  murphyCalibrationBins,
  murphyCalibrationPartition,
  eceWindows,
  eceDifference,
  gateG7HaltsOnMarketFamily,
  LAMBDA_CLV,
  hybridClvTarget,
  laplaceKalmanEdgeUpdate,
  promotePremise,
  premisePromotionStatus,
  marchenkoPasturUpperEdge,
  tracyWidomScale,
  symmetricEigen,
  participationRatio,
  standardizeColumns,
  injectRankOneFactor,
  detectSpectralSpike,
  evaluateShadowPromotionGates,
} from "@sports/prediction-engine";

describe("T16 Settlement Loop Wiring Contract", () => {
  it("exports all fundamental Murphy, Kalman, premise promotion, and spectral spike functions from @sports/prediction-engine", () => {
    expect(typeof murphyBrierDecomposition).toBe("function");
    expect(typeof murphyCalibrationBins).toBe("function");
    expect(typeof murphyCalibrationPartition).toBe("function");
    expect(typeof eceWindows).toBe("function");
    expect(typeof eceDifference).toBe("function");
    expect(typeof gateG7HaltsOnMarketFamily).toBe("function");
    expect(typeof hybridClvTarget).toBe("function");
    expect(typeof laplaceKalmanEdgeUpdate).toBe("function");
    expect(typeof promotePremise).toBe("function");
    expect(typeof premisePromotionStatus).toBe("function");
    expect(typeof marchenkoPasturUpperEdge).toBe("function");
    expect(typeof tracyWidomScale).toBe("function");
    expect(typeof symmetricEigen).toBe("function");
    expect(typeof participationRatio).toBe("function");
    expect(typeof standardizeColumns).toBe("function");
    expect(typeof injectRankOneFactor).toBe("function");
    expect(typeof detectSpectralSpike).toBe("function");
    expect(typeof evaluateShadowPromotionGates).toBe("function");
  });

  it("evaluates Murphy (1973) vector partition with exact identity BS = REL - RES + UNC", () => {
    const probs = [0.1, 0.2, 0.7, 0.8, 0.9];
    const outcomes = [0, 0, 1, 1, 1];
    const decomp = murphyBrierDecomposition(probs, outcomes, { binCount: 5 });

    expect(decomp.bs).toBeGreaterThan(0);
    expect(Math.abs(decomp.identityResidual)).toBeLessThan(1e-10);
    expect(decomp.rel).toBeGreaterThanOrEqual(0);
    expect(decomp.res).toBeGreaterThanOrEqual(0);
    expect(decomp.unc).toBeGreaterThan(0);
  });

  it("evaluates Laplace-Kalman variance-reduced hybrid target and edge update", () => {
    expect(LAMBDA_CLV).toBe(0.35);
    const yStar = hybridClvTarget(1, 0.60);
    // (1 - 0.35)*1 + 0.35*0.60 = 0.65 + 0.21 = 0.86
    expect(Math.abs(yStar - 0.86)).toBeLessThan(1e-6);

    const updated = laplaceKalmanEdgeUpdate(0.05, 0.1, yStar, 0.50, 0.2, 0.01);
    expect(updated.theta).toBeGreaterThan(0.05);
    expect(updated.P).toBeLessThan(0.1 + 0.01);
  });

  it("detects BBP phase transition when synthetic rank-1 factor is injected", () => {
    const T = 50;
    const M = 10;
    // Standard white noise residuals T x M
    const residuals: number[][] = [];
    for (let t = 0; t < T; t++) {
      const row: number[] = [];
      for (let m = 0; m < M; m++) {
        row.push(Math.sin((t + 1) * 11 + (m + 1) * 17) * Math.cos((t + 1) * 3));
      }
      residuals.push(row);
    }
    const std = standardizeColumns(residuals);
    // injectRankOneFactor(residuals, theta, factor, loadings)
    const factor = Array.from({ length: T }, (_, i) => Math.sin(i * 0.5));
    const loadings = Array.from({ length: M }, () => 1.0);
    const perturbed = injectRankOneFactor(std, 2.5, factor, loadings);

    const spike = detectSpectralSpike(perturbed, 0.05);
    expect(spike.aspectRatio).toBeCloseTo(M / T, 4);
    expect(spike.detected).toBe(true);
    expect(spike.lambda1).toBeGreaterThan(spike.lambdaPlus);
    expect(spike.participationRatio).toBeGreaterThan(0.33);
  });
});
