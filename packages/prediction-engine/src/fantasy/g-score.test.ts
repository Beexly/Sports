/**
 * G-score — tests (arXiv 2307.02188v5).
 *
 * ACCEPTANCE GATE: G reduces to Z at kappa=0; positive kappa
 * penalizes boom/bust players while negative kappa rewards them; the
 * kappa fit picks a positive kappa for cash-style objectives and a
 * negative one for GPP-style objectives on constructed data; value
 * tiers rank by G per $1k; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  fitKappa,
  gPerDollar,
  gValue,
  playerMoments,
  positionSigma,
  topGRealized,
  zValue,
} from "./g-score";

describe("gValue", () => {
  it("reduces to Z at kappa=0", () => {
    const g = { mu: 18, tau: 8, sigma: 4, replacement: 10, kappa: 0 };
    expect(gValue(g)).toBeCloseTo(zValue(18, 10, 4), 12);
    expect(() => zValue(18, 10, 0)).toThrow();
    expect(() => playerMoments([5])).toThrow();
    expect(() => positionSigma([5])).toThrow();
  });

  it("penalizes variance for cash, rewards it for GPP", () => {
    const steady = { mu: 16, tau: 2, sigma: 4, replacement: 10, kappa: 1 };
    const volatile = { mu: 16, tau: 10, sigma: 4, replacement: 10, kappa: 1 };
    // Cash (kappa>0): steady > volatile.
    expect(gValue(steady)).toBeGreaterThan(gValue(volatile));
    // GPP (kappa<0): volatile > steady.
    const sGpp = { ...steady, kappa: -0.5 };
    const vGpp = { ...volatile, kappa: -0.5 };
    expect(gValue(vGpp)).toBeGreaterThan(gValue(sGpp));
  });
});

describe("playerMoments + positionSigma", () => {
  it("computes moments from game logs", () => {
    const { mu, tau } = playerMoments([10, 20, 30]);
    expect(mu).toBe(20);
    expect(tau).toBe(10);
    expect(positionSigma([10, 20, 30])).toBe(10);
  });
});

describe("fitKappa", () => {
  it("fits contest-dependent kappa", () => {
    // Cash objective: reward realized points, penalize picking
    // high-tau players -> kappa should be >= 0.
    const players = [
      { mu: 16, tau: 2, sigma: 4, replacement: 10, realized: 16 },
      { mu: 16, tau: 10, sigma: 4, replacement: 10, realized: 10 },
      { mu: 20, tau: 3, sigma: 4, replacement: 10, realized: 20 },
      { mu: 20, tau: 12, sigma: 4, replacement: 10, realized: 12 },
    ];
    // Cash: volatile players dudded -> variance should be penalized.
    const cash = fitKappa(players, topGRealized);
    expect(cash.kappa).toBeGreaterThanOrEqual(0);
    // GPP: volatile players spiked -> variance should be rewarded.
    const gppPlayers = players.map((p) => ({
      ...p,
      realized: p.tau > 5 ? p.mu + 12 : p.mu - 4,
    }));
    const gpp = fitKappa(gppPlayers, topGRealized);
    expect(gpp.kappa).toBeLessThan(0);
    expect(topGRealized([1, 3, 2], [10, 30, 20])).toBe(30);
    expect(() => fitKappa([], topGRealized)).toThrow();
  });
});

describe("gPerDollar", () => {
  it("ranks value tiers by G per $1k", () => {
    const tiers = gPerDollar([
      {
        player: "cheap",
        position: "RB",
        weekly: [12, 14, 13, 15],
        salary: 3000,
        kappa: 0.5,
        sigma: 3,
        replacement: 8,
      },
      {
        player: "stud",
        position: "RB",
        weekly: [22, 24, 23, 25],
        salary: 9000,
        kappa: 0.5,
        sigma: 3,
        replacement: 8,
      },
    ]);
    expect(tiers[0]?.player).toBe("cheap");
    expect(tiers[1]?.player).toBe("stud");
  });
});
