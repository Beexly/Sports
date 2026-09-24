import { describe, it, expect } from "vitest";
import {
  crpsEntropy,
  gaussianCrps,
  calibrateLambda,
  entropyReject,
  calibrateLambdaByRegime,
  evaluateRejectRule,
  pluginGatePasses,
  entropyCriterionAdopted,
  REGIME_EPSILONS,
  type EntropyGame,
} from "./2503-23782v1-regime-conditional-reject.js";

const SQRT_PI = Math.sqrt(Math.PI);

// Deterministic fixture: 160 clean games (low sigma, winners, actual == mu)
// and 40 division games (high sigma, losers, actual == mu + 3*sigma).
function buildGames(): { unlabeled: EntropyGame[]; labeled: EntropyGame[] } {
  const unlabeled: EntropyGame[] = [];
  const labeled: EntropyGame[] = [];
  for (let i = 0; i < 160; i++) {
    const sigma = 0.9 + (i / 159) * 0.2;
    unlabeled.push({ id: `u-c${i}`, regime: "clean", mu: 0, sigma, actual: 0, profit: 0, won: true });
    labeled.push({
      id: `c${i}`, regime: "clean", mu: -3.5, sigma,
      actual: -3.5, profit: 0.91, won: true,
    });
  }
  for (let i = 0; i < 40; i++) {
    const sigma = 2.8 + (i / 39) * 0.4;
    unlabeled.push({ id: `u-d${i}`, regime: "division", mu: 0, sigma, actual: 0, profit: 0, won: false });
    labeled.push({
      id: `d${i}`, regime: "division", mu: 1.5, sigma,
      actual: 1.5 + 3 * sigma, profit: -1.0, won: false,
    });
  }
  return { unlabeled, labeled };
}

describe("2503.23782v1 distributional regression with reject option", () => {
  it("CRPS entropy of a Gaussian is sigma / sqrt(pi)", () => {
    expect(crpsEntropy(1)).toBeCloseTo(1 / SQRT_PI, 12);
    expect(crpsEntropy(2.5)).toBeCloseTo(2.5 / SQRT_PI, 12);
    expect(crpsEntropy(3)).toBeGreaterThan(crpsEntropy(1));
  });

  it("gaussian CRPS matches the closed form at z=0", () => {
    // CRPS(N(mu,s^2), mu) = s * (2*phi(0) - 1/sqrt(pi))
    expect(gaussianCrps(1.5, 2.0, 1.5)).toBeCloseTo(2.0 * (2 * 0.3989422804014327 - 1 / SQRT_PI), 9);
    expect(gaussianCrps(0, 1, 0)).toBeCloseTo(0.2336949773, 9);
    // A far miss scores much worse than a near hit.
    expect(gaussianCrps(0, 1, 5)).toBeGreaterThan(gaussianCrps(0, 1, 0.5));
  });

  it("calibrateLambda returns the (1-epsilon) empirical quantile", () => {
    const ents = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    // n=10, eps=0.2 -> k = ceil(11*0.8) = 9 -> 0.9
    expect(calibrateLambda(ents, 0.2)).toBeCloseTo(0.9, 12);
    expect(calibrateLambda([], 0.2)).toBe(Infinity);
  });

  it("rejects iff CRPS entropy exceeds lambda (paper's optimal rule)", () => {
    const hi: EntropyGame = { id: "h", regime: "division", mu: 0, sigma: 3, actual: 0, profit: 0, won: false };
    const lo: EntropyGame = { id: "l", regime: "clean", mu: 0, sigma: 1, actual: 0, profit: 0, won: true };
    expect(entropyReject(hi, 1.6)).toBe(true);
    expect(entropyReject(lo, 1.6)).toBe(false);
  });

  it("plug-in rule controls the rejection rate distribution-free", () => {
    const { unlabeled, labeled } = buildGames();
    const epsilon = 0.175;
    const lambda = calibrateLambda(unlabeled.map((g) => crpsEntropy(g.sigma)), epsilon);
    const out = evaluateRejectRule(labeled, (g) => entropyReject(g, lambda));
    // 34/40 division games rejected -> r_hat = 0.17, within 2pp of 0.175.
    expect(out.rejectionRate).toBeCloseTo(0.17, 12);
    expect(Math.abs(out.rejectionRate - epsilon)).toBeLessThanOrEqual(0.02);
  });

  it("gate passes: plug-in beats no-gate on ROI by >=1pp with lower CRPS", () => {
    const { unlabeled, labeled } = buildGames();
    const epsilon = 0.175;
    const lambda = calibrateLambda(unlabeled.map((g) => crpsEntropy(g.sigma)), epsilon);
    const plugin = evaluateRejectRule(labeled, (g) => entropyReject(g, lambda));
    const noGate = evaluateRejectRule(labeled, () => false);
    expect(plugin.roi - noGate.roi).toBeGreaterThanOrEqual(0.01);
    expect(plugin.meanCrps).toBeLessThan(noGate.meanCrps);
    expect(pluginGatePasses(plugin, noGate, epsilon)).toBe(true);
  });

  it("gate fails when the rejection rate is not controlled", () => {
    const { unlabeled, labeled } = buildGames();
    const lambda = calibrateLambda(unlabeled.map((g) => crpsEntropy(g.sigma)), 0.175);
    const plugin = evaluateRejectRule(labeled, (g) => entropyReject(g, lambda));
    const noGate = evaluateRejectRule(labeled, () => false);
    // Claiming epsilon = 0.5 while achieving 0.17 -> rate control fails.
    expect(pluginGatePasses(plugin, noGate, 0.5)).toBe(false);
  });

  it("regime-conditional budgets sit out high-entropy regimes more", () => {
    const { unlabeled, labeled } = buildGames();
    const { byRegime, global } = calibrateLambdaByRegime(unlabeled, REGIME_EPSILONS, 0.175);
    // Missing regimes (weather, short-rest) fall back to the global lambda.
    expect(byRegime["weather"]).toBe(global);
    expect(byRegime["short-rest"]).toBe(global);
    const regimeOut = (regime: EntropyGame["regime"]) =>
      evaluateRejectRule(labeled.filter((g) => g.regime === regime), (g) =>
        entropyReject(g, byRegime[g.regime]),
      );
    // Division (eps 0.3) sits out far more than clean (eps 0.1).
    expect(regimeOut("division").rejectionRate).toBeGreaterThan(regimeOut("clean").rejectionRate);
  });

  it("entropy criterion adoption requires beating the 0700 conformal gate ROI", () => {
    const { unlabeled, labeled } = buildGames();
    const { byRegime } = calibrateLambdaByRegime(unlabeled, REGIME_EPSILONS, 0.175);
    const regime = evaluateRejectRule(labeled, (g) => entropyReject(g, byRegime[g.regime]));
    expect(entropyCriterionAdopted(regime, regime.roi - 0.05)).toBe(true);
    expect(entropyCriterionAdopted(regime, regime.roi + 0.05)).toBe(false);
  });
});
