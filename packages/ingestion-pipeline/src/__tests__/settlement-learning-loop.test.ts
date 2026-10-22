import { describe, it, expect } from "vitest";
import {
  runSettlementLearningLoop,
  type SettledPickObservation,
} from "../settlement-learning-loop.js";

describe("Settlement Continual Learning & Recalibration Loop (GAP-08)", () => {
  it("returns INSUFFICIENT_OBSERVATIONS when no binary outcomes exist", async () => {
    const picks: SettledPickObservation[] = [
      {
        pickId: "p1",
        gameId: "g1",
        sport: "nfl",
        pickType: "SPREAD",
        selection: "KC -3",
        trueProb: 0.55,
        result: "PUSH",
        settledAt: "2026-10-21T18:00:00Z",
      },
    ];

    const report = await runSettlementLearningLoop(picks);
    expect(report.status).toBe("INSUFFICIENT_OBSERVATIONS");
    expect(report.binaryObservationsCount).toBe(0);
    expect(report.murphyDecomposition).toBeNull();
    expect(report.onlineBetaReport).toBeNull();
  });

  it("executes the full continual learning loop over settled picks", async () => {
    const picks: SettledPickObservation[] = [
      {
        pickId: "p1",
        gameId: "g1",
        sport: "nfl",
        pickType: "SPREAD",
        selection: "KC -3",
        trueProb: 0.58,
        rankingP: 0.59,
        marketFairProb: 0.52,
        result: "WIN",
        settledAt: "2026-10-21T18:00:00Z",
        closingPrice: 0.53,
      },
      {
        pickId: "p2",
        gameId: "g2",
        sport: "nfl",
        pickType: "TOTAL",
        selection: "OVER 44.5",
        trueProb: 0.62,
        rankingP: 0.61,
        marketFairProb: 0.51,
        result: "WIN",
        settledAt: "2026-10-21T18:05:00Z",
        closingPrice: 0.52,
      },
      {
        pickId: "p3",
        gameId: "g3",
        sport: "nfl",
        pickType: "MONEYLINE",
        selection: "DET ML",
        trueProb: 0.48,
        rankingP: 0.47,
        marketFairProb: 0.50,
        result: "LOSS",
        settledAt: "2026-10-21T18:10:00Z",
        closingPrice: 0.49,
      },
      {
        pickId: "p4",
        gameId: "g4",
        sport: "nfl",
        pickType: "SPREAD",
        selection: "SF -7",
        trueProb: 0.65,
        rankingP: 0.64,
        marketFairProb: 0.54,
        result: "WIN",
        settledAt: "2026-10-21T18:15:00Z",
        closingPrice: 0.55,
      },
      {
        pickId: "p5",
        gameId: "g5",
        sport: "nfl",
        pickType: "TOTAL",
        selection: "UNDER 47.5",
        trueProb: 0.54,
        rankingP: 0.53,
        marketFairProb: 0.50,
        result: "LOSS",
        settledAt: "2026-10-21T18:20:00Z",
        closingPrice: 0.50,
      },
    ];

    const report = await runSettlementLearningLoop(picks);
    expect(report.status).toBe("COMPLETED");
    expect(report.processedCount).toBe(5);
    expect(report.binaryObservationsCount).toBe(5);
    expect(report.winRate).toBe(3 / 5);

    // 1. Murphy Brier Partition
    expect(report.murphyDecomposition).not.toBeNull();
    if (report.murphyDecomposition) {
      const { bs, rel, res, unc } = report.murphyDecomposition;
      expect(typeof bs).toBe("number");
      expect(typeof rel).toBe("number");
      expect(typeof res).toBe("number");
      expect(typeof unc).toBe("number");
      expect(Math.abs(bs - (rel - res + unc))).toBeLessThan(1e-10);
    }

    // 2. Trailing ECE
    expect(typeof report.trailingEce).toBe("number");

    // 3. Online Beta Recalibration
    expect(report.onlineBetaReport).not.toBeNull();
    if (report.onlineBetaReport) {
      expect(report.onlineBetaReport.n).toBe(5);
      expect(report.onlineBetaReport.finalParams.a).toBeGreaterThan(0);
      expect(report.onlineBetaReport.steps.length).toBe(5);
    }

    // 4. Laplace-Kalman Precision Edge Posterior
    expect(report.kalmanPosteriorP).not.toBeNull();
    expect(typeof report.kalmanPosteriorP).toBe("number");
    expect(report.kalmanPosteriorP!).toBeGreaterThan(0);

    // 5. Premise Promotions
    expect(report.premisePromotions.length).toBeGreaterThan(0);
    for (const prom of report.premisePromotions) {
      expect(prom.pi).toBeGreaterThanOrEqual(0.05);
      expect(prom.pi).toBeLessThanOrEqual(3.0);
    }

    // 6. ReHarness TTT Memory Revision
    expect(report.skillRevisions.length).toBeGreaterThan(0);
    const revision = report.skillRevisions[0];
    expect(revision?.skill_id).toBeDefined();
    expect(revision?.execution_latency_ms).toBeGreaterThanOrEqual(0);
  });
});
