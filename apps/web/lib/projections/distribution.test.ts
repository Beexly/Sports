import type { MondrianConformalInterval, PlayerRatePosterior } from "@sports/prediction-engine";
import { describe, expect, it } from "vitest";
import { buildProjectionDistribution, buildProjectionDistributionBoard } from "./distribution";

const posterior: PlayerRatePosterior = {
  playerId: "wr-1",
  metricId: "fantasy-points",
  family: "normal-normal",
  sampleSize: 18,
  observedMean: 15.5,
  unshrunkMean: 15.5,
  priorMean: 12,
  shrinkageK: 12,
  shrinkageWeight: 0.6,
  posteriorMean: 14.1,
  posteriorVariance: 2.25,
  priced: false,
  status: "shadow",
};

const conformal: Pick<MondrianConformalInterval, "lower" | "upper" | "alpha"> = {
  lower: 8,
  upper: 24,
  alpha: 0.2,
};

describe("projection distribution outputs", () => {
  it("uses conformal floor and ceiling while preserving posterior weight", () => {
    const distribution = buildProjectionDistribution({
      playerId: "wr-1",
      label: "Avery Knox",
      position: "WR",
      mean: 14,
      posterior,
      conformalInterval: conformal,
    });

    expect(distribution.source).toBe("posterior-conformal");
    expect(distribution.floor).toBe(8);
    expect(distribution.ceiling).toBe(24);
    expect(distribution.posteriorWeight).toBe(0.6);
    expect(distribution.intervalAlpha).toBe(0.2);
    expect(distribution.spikeProbability).toBeGreaterThan(0);
    expect(distribution.bustRisk).toBeGreaterThan(0);
    expect(distribution.priced).toBe(false);
    expect(distribution.status).toBe("shadow");
  });

  it("falls back to existing bands when posteriors and conformal intervals are absent", () => {
    const distribution = buildProjectionDistribution({
      playerId: "rb-1",
      label: "Mason Vale",
      position: "RB",
      mean: 16,
      fallbackFloor: 9,
      fallbackCeiling: 28,
      spikeThreshold: 20,
      bustThreshold: 8,
    });

    expect(distribution.source).toBe("fallback-band");
    expect(distribution.floor).toBe(9);
    expect(distribution.ceiling).toBe(28);
    expect(distribution.spikeThreshold).toBe(20);
    expect(distribution.bustThreshold).toBe(8);
    expect(distribution.spikeProbability).toBeGreaterThan(distribution.bustRisk);
  });

  it("aggregates floor, point, ceiling, spike, bust, and convexity for a portfolio", () => {
    const board = buildProjectionDistributionBoard(
      [
        {
          playerId: "wr-1",
          label: "Avery Knox",
          position: "WR",
          mean: 14,
          posterior,
          conformalInterval: conformal,
        },
        {
          playerId: "rb-1",
          label: "Mason Vale",
          position: "RB",
          mean: 16,
          fallbackFloor: 9,
          fallbackCeiling: 28,
        },
      ],
      { generatedAt: "2026-06-24T04:10:00.000Z" },
    );

    expect(board.generatedAt).toBe("2026-06-24T04:10:00.000Z");
    expect(board.players).toHaveLength(2);
    expect(board.portfolioPoint).toBe(30);
    expect(board.portfolioFloor).toBe(17);
    expect(board.portfolioCeiling).toBe(52);
    expect(board.averageSpikeProbability).toBeGreaterThan(0);
    expect(board.averageBustRisk).toBeGreaterThan(0);
    expect(board.draftOnly).toBe(true);
    expect(board.priced).toBe(false);
  });
});
