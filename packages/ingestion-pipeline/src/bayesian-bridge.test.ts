import { describe, expect, it } from "vitest";
import {
  evalBlendAnalystView,
  evalDirichletPredictive,
  evalEbTau2,
  evalEpProbitFit,
  evalEpProbitPredict,
  evalFitPoolingWeight,
  evalOpinionPool,
  evalPartialPool,
  evalRollForwardPriors,
} from "./bayesian-bridge.js";

describe("bayesian-bridge hierarchical shrinkage", () => {
  it("evalPartialPool shrinks group means toward the prior", () => {
    const r = evalPartialPool({
      groupMeans: [2.5, 1.2, 3.1],
      ns: [10, 3, 20],
      sigma2: 1.0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(3);
      // Small-n group should shrink most toward the grand mean
      expect(r.data[1]!.posterior).not.toBe(1.2);
    }
  });

  it("evalEbTau2 returns a non-negative between-group variance", () => {
    const r = evalEbTau2({
      groupMeans: [1, 2, 3, 4],
      ns: [10, 10, 10, 10],
      sigma2: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThanOrEqual(0);
  });

  it("fail-closes on misaligned or invalid inputs", () => {
    expect(evalPartialPool({ groupMeans: [1], ns: [1, 2], sigma2: 1 }).ok).toBe(false);
    expect(evalPartialPool({ groupMeans: [1], ns: [1], sigma2: -1 }).ok).toBe(false);
    expect(evalEbTau2({ groupMeans: [1], ns: [0], sigma2: 1 }).ok).toBe(false);
  });
});

describe("bayesian-bridge dirichlet opinion pool", () => {
  const home = { cover: 0.5, nocover: 0.45, push: 0.05 };
  const away = { cover: 0.3, nocover: 0.65, push: 0.05 };

  it("evalOpinionPool returns a proper distribution", () => {
    const r = evalOpinionPool({ homeDist: home, awayDist: away, w: 0.6 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const sum = r.data.cover + r.data.nocover + r.data.push;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("evalFitPoolingWeight grid-searches w on settled games", () => {
    const games = Array.from({ length: 20 }, (_, i) => ({
      homeDist: home,
      awayDist: away,
      outcome: (i % 2 === 0 ? "cover" : "nocover") as "cover" | "nocover" | "push",
    }));
    const r = evalFitPoolingWeight({ games, gridSteps: 11 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.w).toBeGreaterThanOrEqual(0);
      expect(r.data.w).toBeLessThanOrEqual(1);
    }
  });

  it("evalDirichletPredictive smooths counts", () => {
    const r = evalDirichletPredictive({
      counts: { cover: 10, nocover: 8, push: 2 },
      alpha: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const sum = r.data.cover + r.data.nocover + r.data.push;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("fail-closes on bad w", () => {
    expect(evalOpinionPool({ homeDist: home, awayDist: away, w: 1.5 }).ok).toBe(false);
  });
});

describe("bayesian-bridge match-prior discipline", () => {
  it("evalBlendAnalystView blends explicit pseudo-samples", () => {
    const r = evalBlendAnalystView({
      priorCounts: [10, 10],
      viewProbs: [0.7, 0.3],
      pseudoN: 4,
      wM: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const sum = r.data[0]! + r.data[1]!;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("evalRollForwardPriors evolves team means toward the league mean", () => {
    const r = evalRollForwardPriors({
      posteriorMeans: { KC: 0.7, BUF: 0.3, SF: 0.5 },
      shrinkage: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.data)).toHaveLength(3);
  });

  it("fail-closes on misaligned vectors", () => {
    expect(
      evalBlendAnalystView({
        priorCounts: [10],
        viewProbs: [0.5, 0.5],
        pseudoN: 4,
        wM: 0.5,
      }).ok,
    ).toBe(false);
  });
});

describe("bayesian-bridge ep-probit", () => {
  it("evalEpProbitFit + evalEpProbitPredict round-trip", () => {
    const X = [
      [1, 0.5],
      [1, -0.3],
      [1, 1.2],
      [1, -1.0],
      [1, 0.2],
      [1, 0.8],
      [1, -0.5],
      [1, 1.5],
    ];
    const y = [1, 0, 1, 0, 0, 1, 0, 1];
    const fit = evalEpProbitFit({ X, y });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const pred = evalEpProbitPredict({ fit: fit.data, x: [1, 1.0] });
    expect(pred.ok).toBe(true);
    if (pred.ok) {
      expect(pred.data).toBeGreaterThan(0);
      expect(pred.data).toBeLessThan(1);
    }
  });

  it("fail-closes without a fitted posterior", () => {
    expect(evalEpProbitPredict({ fit: null, x: [1, 1] }).ok).toBe(false);
    expect(evalEpProbitFit({ X: [], y: [] }).ok).toBe(false);
  });
});
