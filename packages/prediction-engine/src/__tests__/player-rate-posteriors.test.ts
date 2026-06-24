import { describe, expect, it } from "vitest";
import {
  buildEmpiricalBayesRatePrior,
  estimateBetaBinomialRatePosterior,
  estimateNormalNormalRatePosterior,
  playerRateShrinkageWeight,
  type PlayerRatePrior,
} from "../player-rate-posteriors.js";

const peerPrior: PlayerRatePrior = {
  mean: 0.5,
  sampleSize: 10,
  source: "empirical-bayes-peer-pool",
};

describe("playerRateShrinkageWeight", () => {
  it("publishes w = n / (n + k)", () => {
    expect(playerRateShrinkageWeight(30, 10)).toBe(0.75);
    expect(playerRateShrinkageWeight(0, 10)).toBe(0);
  });
});

describe("buildEmpiricalBayesRatePrior", () => {
  it("fits a sample-weighted peer prior", () => {
    const prior = buildEmpiricalBayesRatePrior(
      [
        { value: 0.1, sampleSize: 10 },
        { value: 0.4, sampleSize: 30 },
      ],
      { fallbackMean: 0.2, shrinkageK: 16, boundedRate: true },
    );

    expect(prior.mean).toBe(0.325);
    expect(prior.sampleSize).toBe(16);
    expect(prior.source).toBe("empirical-bayes-peer-pool");
  });
});

describe("estimateBetaBinomialRatePosterior", () => {
  it("shrinks a low-volume bounded player rate away from the unshrunk baseline", () => {
    const posterior = estimateBetaBinomialRatePosterior({
      playerId: "wr-small-sample",
      metricId: "target-share",
      successes: 8,
      trials: 10,
      prior: peerPrior,
    });

    expect(posterior.family).toBe("beta-binomial");
    expect(posterior.shrinkageWeight).toBe(0.5);
    expect(posterior.unshrunkMean).toBe(0.8);
    expect(posterior.posteriorMean).toBe(0.65);
    expect(posterior.posteriorMean).toBeLessThan(posterior.unshrunkMean);
    expect(posterior.alpha).toBe(13);
    expect(posterior.beta).toBe(7);
    expect(posterior.priced).toBe(false);
    expect(posterior.status).toBe("shadow");
  });

  it("trusts high-volume player rates more than low-volume rates", () => {
    const lowVolume = estimateBetaBinomialRatePosterior({
      playerId: "wr-low",
      metricId: "target-share",
      successes: 8,
      trials: 10,
      prior: peerPrior,
    });
    const highVolume = estimateBetaBinomialRatePosterior({
      playerId: "wr-high",
      metricId: "target-share",
      successes: 80,
      trials: 100,
      prior: peerPrior,
    });

    expect(highVolume.shrinkageWeight).toBeGreaterThan(lowVolume.shrinkageWeight);
    expect(highVolume.posteriorMean).toBeGreaterThan(lowVolume.posteriorMean);
    expect(highVolume.posteriorMean).toBeLessThan(highVolume.unshrunkMean);
  });
});

describe("estimateNormalNormalRatePosterior", () => {
  it("shrinks a continuous rate toward the empirical prior", () => {
    const posterior = estimateNormalNormalRatePosterior({
      playerId: "rb-small-sample",
      metricId: "yards-per-route",
      sampleMean: 18,
      sampleSize: 12,
      prior: { mean: 10, sampleSize: 12, source: "position-prior" },
      observationVariance: 4,
    });

    expect(posterior.family).toBe("normal-normal");
    expect(posterior.shrinkageWeight).toBe(0.5);
    expect(posterior.unshrunkMean).toBe(18);
    expect(posterior.posteriorMean).toBe(14);
    expect(posterior.posteriorVariance).toBe(0.1667);
    expect(posterior.posteriorMean).toBeLessThan(posterior.unshrunkMean);
    expect(posterior.priced).toBe(false);
  });
});
