import { describe, expect, it } from "vitest";
import {
  futureEloProbe,
  currentWeekSnapShareProbe,
  signConventionProbe,
  runAllProbes,
  assertNoLeakage,
  type FixtureGame,
  type FeatureBuilder,
} from "./leakage-antipatterns.js";

function makeGame(over: Partial<FixtureGame> = {}): FixtureGame {
  return {
    gameId: "g1", season: 2025, week: 5, team: "KC", opponent: "BUF", isHome: true,
    ratingAfter: 1550, ratingBefore: 1520,
    snapShareCurrentWeek: 0.85, snapSharePriorWeeks: 0.82,
    marketSpread: -3, predictedMargin: 4, label: 1,
    ...over,
  };
}

// Clean feature builder: uses only prior-week data
const cleanBuilder: FeatureBuilder = (games) => ({
  rating: games.map((g) => g.ratingBefore),
  snapShare: games.map((g) => g.snapSharePriorWeeks ?? 0),
});

// Contaminated builder: uses future rating
const contaminatedBuilder: FeatureBuilder = (games) => ({
  rating: games.map((g) => g.ratingAfter),
  snapShare: games.map((g) => g.snapSharePriorWeeks ?? 0),
});

// Snap-share leaker: uses current week
const snapLeaker: FeatureBuilder = (games) => ({
  snapShare: games.map((g) => g.snapShareCurrentWeek ?? 0),
});

describe("V1: leakage anti-pattern probes", () => {
  it("future-Elo probe flags contaminated features", () => {
    // Clean fixture: ratingBefore=1520, ratingAfter=1550 (ratingBefore is the clean feature)
    // Contaminated fixture: ratingBefore=1550 (equal to ratingAfter = future info leaked)
    const clean = [makeGame({ ratingBefore: 1520, ratingAfter: 1550 })];
    const contaminated = [makeGame({ ratingBefore: 1550, ratingAfter: 1550 })];
    // contaminatedBuilder uses ratingAfter for both → same value → no diff
    // We need a builder that uses ratingBefore (clean) vs one that uses ratingAfter
    const usesBefore: FeatureBuilder = (games) => ({ rating: games.map((g) => g.ratingBefore) });
    const r = futureEloProbe(usesBefore, clean, contaminated);
    expect(r.leaked).toBe(true);
    expect(r.detail).toContain("future-Elo");
  });

  it("future-Elo probe passes clean features", () => {
    const clean = [makeGame()];
    const r = futureEloProbe(cleanBuilder, clean, clean);
    expect(r.leaked).toBe(false);
  });

  it("snap-share probe flags current-week leakage", () => {
    const fixture = [makeGame()];
    const r = currentWeekSnapShareProbe(snapLeaker, fixture);
    expect(r.leaked).toBe(true);
    expect(r.detail).toContain("snap-share");
  });

  it("snap-share probe passes clean features", () => {
    const fixture = [makeGame()];
    const r = currentWeekSnapShareProbe(cleanBuilder, fixture);
    expect(r.leaked).toBe(false);
  });

  it("sign-convention probe catches flipped spread", () => {
    // Model says home wins (margin > 0), market says home favored (spread < 0)
    // But if BOTH have same sign → convention bug
    const badFixture = [makeGame({ predictedMargin: 5, marketSpread: 3 })];
    const r = signConventionProbe(badFixture);
    expect(r.leaked).toBe(true);
    expect(r.detail).toContain("sign");
  });

  it("sign-convention probe passes correct convention", () => {
    // Home favored (spread < 0), model predicts home win (margin > 0) → opposite signs
    const goodFixture = [makeGame({ predictedMargin: 5, marketSpread: -3 })];
    const r = signConventionProbe(goodFixture);
    expect(r.leaked).toBe(false);
  });

  it("runAllProbes aggregates all three probes", () => {
    const clean = [makeGame()];
    const contaminated = [makeGame({ ratingBefore: 1550, ratingAfter: 1550 })];
    const signBad = [makeGame({ predictedMargin: 5, marketSpread: 3 })];
    const suite = runAllProbes(cleanBuilder, clean, contaminated, signBad);
    expect(suite.probes).toHaveLength(3);
    expect(suite.allClean).toBe(false); // sign probe should fail
  });

  it("assertNoLeakage throws on detected leakage", () => {
    const clean = [makeGame({ ratingBefore: 1520, ratingAfter: 1550 })];
    const contaminated = [makeGame({ ratingBefore: 1550, ratingAfter: 1550 })];
    const usesBefore: FeatureBuilder = (games) => ({ rating: games.map((g) => g.ratingBefore) });
    const suite = runAllProbes(usesBefore, clean, contaminated, clean);
    expect(() => assertNoLeakage(suite)).toThrow(/LEAKAGE DETECTED/);
  });

  it("assertNoLeakage passes when all probes clean", () => {
    const clean = [makeGame()];
    const suite = runAllProbes(cleanBuilder, clean, clean, clean);
    expect(() => assertNoLeakage(suite)).not.toThrow();
  });
});
