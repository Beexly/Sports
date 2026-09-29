import { describe, expect, it } from "vitest";
import {
  evalAlpacaGate,
  evalBlrNll,
  evalBoaUpdate,
  evalEwaUpdate,
  evalFixedSupportPools,
  evalGpPosterior,
  evalLibrarian,
  evalOnlineBlr,
  evalRetrieveTopS,
  evalSplitQuality,
  evalSplitQualityScore,
  evalUncertaintyMetaLoss,
} from "./metalearning-conformal-bridge.js";

describe("metalearning-conformal-bridge online BLR", () => {
  it("evalOnlineBlr updates the posterior and returns a predictive", () => {
    const r = evalOnlineBlr({
      dim: 2,
      priorVar: 1,
      observations: [
        { phi: [1, 0.5], y: 1.2 },
        { phi: [1, -0.3], y: -0.4 },
        { phi: [1, 1.0], y: 1.8 },
      ],
      noiseVar: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.posterior.mean).toHaveLength(2);
      expect(r.data.lastPredictive).not.toBeNull();
    }
  });

  it("fail-closes on shape mismatch", () => {
    const r = evalOnlineBlr({
      dim: 2,
      priorVar: 1,
      observations: [{ phi: [1], y: 1 }],
      noiseVar: 0.1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("imputed");
  });

  it("evalAlpacaGate returns ADAPT or REJECT", () => {
    const adapt = evalAlpacaGate({ brierGain: 0.02, msPerWeek: 500, beatsRidgePrior: true });
    expect(adapt.ok).toBe(true);
    if (adapt.ok) expect(adapt.data).toBe("ADAPT");

    const reject = evalAlpacaGate({ brierGain: 0.001, msPerWeek: 500, beatsRidgePrior: true });
    expect(reject.ok).toBe(true);
    if (reject.ok) expect(reject.data).toBe("REJECT");
  });

  it("evalBlrNll computes a predictive NLL", () => {
    const fit = evalOnlineBlr({
      dim: 2,
      priorVar: 1,
      observations: [{ phi: [1, 0.5], y: 1.0 }],
      noiseVar: 0.1,
    });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const nll = evalBlrNll({
      posterior: fit.data.posterior,
      phi: [1, 0.5],
      y: 1.1,
      noiseVar: 0.1,
    });
    expect(nll.ok).toBe(true);
    if (nll.ok) expect(Number.isFinite(nll.data)).toBe(true);
  });
});

describe("metalearning-conformal-bridge librarian", () => {
  const tasks = [
    { X: [[1, 0.2], [1, 0.4], [1, 0.6]], y: [0.3, 0.5, 0.7] },
    { X: [[1, -0.2], [1, -0.4], [1, -0.6]], y: [0.1, 0.2, 0.3] },
    { X: [[1, 0.1], [1, 0.3], [1, 0.5]], y: [0.2, 0.4, 0.6] },
  ];
  const supportX = [[1, 0.3], [1, 0.5], [1, -0.2]];
  const supportY = [0.4, 0.6, 0.15];

  it("evalLibrarian learns scales and predicts", () => {
    const r = evalLibrarian({
      tasks,
      supportX,
      supportY,
      query: [1, 0.4],
      metaMetricAcc: 0.72,
      matchingNetAcc: 0.65,
      randomRetrievalAcc: 0.66,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.prediction)).toBe(true);
      expect(r.data.scales.length).toBeGreaterThan(0);
      expect(["ADAPT", "REJECT"]).toContain(r.data.verdict);
    }
  });

  it("evalRetrieveTopS picks nearest library season ids", () => {
    const r = evalRetrieveTopS({
      query: [1, 0.35],
      library: [
        { id: "s1", embedding: [1, 0.3] },
        { id: "s2", embedding: [1, 0.5] },
        { id: "s3", embedding: [1, -0.2] },
        { id: "s4", embedding: [1, 0.4] },
      ],
      s: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toHaveLength(2);
  });

  it("fail-closes on empty tasks", () => {
    expect(
      evalLibrarian({
        tasks: [],
        supportX,
        supportY,
        query: [1, 0.4],
        metaMetricAcc: 0.7,
        matchingNetAcc: 0.6,
        randomRetrievalAcc: 0.6,
      }).ok,
    ).toBe(false);
  });
});

describe("metalearning-conformal-bridge split quality", () => {
  const train = [0.42, 0.48, 0.51, 0.45, 0.53, 0.47, 0.5, 0.44, 0.52, 0.49];
  const test = [0.46, 0.5, 0.47, 0.53, 0.49, 0.51, 0.45, 0.52, 0.48, 0.5];

  it("evalSplitQuality runs Levene, Brown-Forsythe, and Welch", () => {
    const r = evalSplitQuality({ train, test });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.levene).toBeDefined();
      expect(r.data.brownForsythe).toBeDefined();
      expect(r.data.welch.valid).toBe(true);
    }
  });

  it("evalSplitQualityScore returns a verdict", () => {
    const r = evalSplitQualityScore({ train, test });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeDefined();
  });

  it("fail-closes on too-few samples", () => {
    expect(evalSplitQuality({ train: [1], test: [1, 2] }).ok).toBe(false);
    expect(evalSplitQualityScore({ train: [1, 2], test: [] }).ok).toBe(false);
  });
});

describe("metalearning-conformal-bridge metalearning residue", () => {
  it("evalGpPosterior returns mean and variance", () => {
    const r = evalGpPosterior({
      X: [0, 1, 2, 3],
      y: [0, 0.8, 1.2, 2.1],
      xstar: 1.5,
      lengthscale: 1.0,
      sigmaF: 1.0,
      sigmaN: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.mean)).toBe(true);
      expect(r.data.variance).toBeGreaterThan(0);
    }
  });

  it("evalUncertaintyMetaLoss weights by sigma", () => {
    const r = evalUncertaintyMetaLoss({
      losses: [0.5, 0.3, 0.8],
      sigmas: [1.0, 0.5, 2.0],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);
  });

  it("evalEwaUpdate returns simplex weights", () => {
    const r = evalEwaUpdate({
      w: [0.5, 0.5],
      losses: [0.3, 0.7],
      eta: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(2);
      const sum = r.data[0]! + r.data[1]!;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("evalBoaUpdate returns updated w and V", () => {
    const r = evalBoaUpdate({
      w: [0.5, 0.5],
      losses: [0.3, 0.7],
      V: [0, 0],
      eta: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.w).toHaveLength(2);
      expect(r.data.V).toHaveLength(2);
    }
  });

  it("evalFixedSupportPools builds canonical and designed pools", () => {
    const games = Array.from({ length: 10 }, (_, i) => ({
      id: `g${i}`,
      team: "KC",
      season: 2025,
      week: i + 1,
      archetype: i % 2 === 0 ? "home_dog" : "away_fav",
    })) as never;
    const r = evalFixedSupportPools({
      games,
      team: "KC",
      season: 2025,
      k: 4,
      archetypes: ["home_dog", "away_fav"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.canonical.length).toBeGreaterThan(0);
      expect(r.data.designed.length).toBeGreaterThan(0);
      expect(r.data.coverage).toBeGreaterThanOrEqual(0);
      expect(r.data.coverage).toBeLessThanOrEqual(1);
    }
  });

  it("fail-closes on missing team-season or bad params", () => {
    expect(evalGpPosterior({ X: [], y: [], xstar: 1, lengthscale: 1, sigmaF: 1, sigmaN: 1 }).ok).toBe(false);
    expect(evalUncertaintyMetaLoss({ losses: [1], sigmas: [] }).ok).toBe(false);
    expect(evalEwaUpdate({ w: [1], losses: [1, 2], eta: 0.5 }).ok).toBe(false);
    expect(
      evalFixedSupportPools({ games: [], team: "KC", season: 2025 }).ok,
    ).toBe(false);
  });
});
