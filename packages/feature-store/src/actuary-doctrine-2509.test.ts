import { describe, expect, it } from "vitest";
import {
  brierScore,
  logLoss,
  overrideAudit,
  stalenessCheck,
  type ScoredGame,
} from "./actuary-doctrine-2509.js";

describe("actuary doctrine", () => {
  it("brier and log-loss score forecasts correctly", () => {
    expect(brierScore([1, 0], [1, 0])).toBe(0);
    expect(brierScore([0.5, 0.5], [1, 0])).toBe(0.25);
    // log-loss clamps probabilities to [0.001, 0.999] (no infinite scores),
    // so a perfect forecast floors at -log(0.999) ~= 0.001, not exactly 0
    expect(logLoss([1, 1], [1, 1])).toBeCloseTo(0, 2);
    expect(logLoss([0.5], [1])).toBeCloseTo(Math.log(2), 6);
  });

  it("override audit flags overrides that beat the engine", () => {
    const games: ScoredGame[] = [];
    for (let i = 0; i < 120; i++) {
      const homeWon = i % 2 === 0;
      games.push({
        engineP: 0.5, // engine is coin-flip
        overrideP: homeWon ? 0.9 : 0.1, // human is sharp
        homeWon,
      });
    }
    const a = overrideAudit(games);
    expect(a.overriddenGames).toBe(120);
    expect(a.conclusive).toBe(true);
    expect(a.overridesBeatEngine).toBe(true);
    expect(a.adoptOverrideFeatures).toBe(true);
  });

  it("override audit is inconclusive below 100 overridden games", () => {
    const games: ScoredGame[] = [{ engineP: 0.6, overrideP: 0.7, homeWon: true }];
    const a = overrideAudit(games);
    expect(a.conclusive).toBe(false);
    expect(a.adoptOverrideFeatures).toBe(false);
  });

  it("staleness check retires models degrading >= 0.005", () => {
    const games: ScoredGame[] = [];
    for (let i = 0; i < 100; i++) {
      const homeWon = i % 2 === 0;
      // first half: engine sharp; second half: engine coin-flip
      games.push({ engineP: i < 50 ? (homeWon ? 0.9 : 0.1) : 0.5, homeWon });
    }
    const s = stalenessCheck(games);
    expect(s.degradation).toBeGreaterThan(0.005);
    expect(s.retire).toBe(true);
  });

  it("staleness check passes a stable model", () => {
    const games: ScoredGame[] = [];
    for (let i = 0; i < 100; i++) {
      const homeWon = i % 2 === 0;
      games.push({ engineP: homeWon ? 0.7 : 0.3, homeWon });
    }
    const s = stalenessCheck(games);
    expect(Math.abs(s.degradation)).toBeLessThan(0.005);
    expect(s.retire).toBe(false);
  });

  it("handles empty and malformed input", () => {
    expect(Number.isNaN(brierScore([], []))).toBe(true);
    expect(Number.isNaN(brierScore([0.5], [1, 0]))).toBe(true);
    const a = overrideAudit([]);
    expect(a.conclusive).toBe(false);
    const s = stalenessCheck([]);
    expect(s.retire).toBe(false);
    // non-finite probabilities are clamped, not fatal
    expect(Number.isFinite(brierScore([NaN], [1]))).toBe(true);
  });
});
