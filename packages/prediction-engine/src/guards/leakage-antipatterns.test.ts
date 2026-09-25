import { describe, expect, it } from "vitest";
import {
  assertNoLeakage,
  currentWeekSnapShareProbe,
  futureEloProbe,
  leakedProbes,
  runAllProbes,
  signConventionProbe,
  type EloGame,
  type SnapWeek,
} from "./leakage-antipatterns";

/* ---------------------------------------------------------------- *
 * 1. Future-Elo
 * ---------------------------------------------------------------- */

const A = (id: string, season: number, week: number, playedAt: number): EloGame => ({
  id,
  season,
  week,
  playedAt,
});

/** Named fixtures keep the tests off positional indexing, which
 * noUncheckedIndexedAccess correctly rejects. */
const G1 = A("g1", 2024, 1, 1);
const G2 = A("g2", 2024, 2, 2);
const G3 = A("g3", 2024, 3, 3);

/**
 * A builder that honours its contract: each game's rating derives only from its
 * OWN inputs, so passing a longer or shorter list cannot change it.
 */
function honestElo(games: readonly EloGame[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of games) {
    out[g.id] = 1500 + g.playedAt;
  }
  return out;
}

/** A builder that peeks at the whole dataset: the retracted-classifier bug. */
function leakyElo(games: readonly EloGame[]): Record<string, number> {
  const total = games.length;
  const out: Record<string, number> = {};
  for (const g of games) {
    out[g.id] = total * 10 + g.playedAt;
  }
  return out;
}

describe("futureEloProbe", () => {
  it("flags a builder whose ratings change when post-game data is present", () => {
    const games = [G1, G2, G3];
    const result = futureEloProbe({
      buildRatings: leakyElo,
      games,
      targetGameId: "g1",
      historyBefore: [G1],
    });

    expect(result.leaked).toBe(true);
    expect(result.detail).toContain("saw the future");
    expect(result.name).toBe("future-elo");
  });

  it("passes a builder that only reads the games it was handed", () => {
    const games = [G1, G2, G3];
    const result = futureEloProbe({
      buildRatings: honestElo,
      games,
      targetGameId: "g1",
      historyBefore: [G1],
    });

    expect(result.leaked).toBe(false);
  });

  it("does not test a target that has no future, because forward leakage is impossible", () => {
    const games = [G1, G2];
    const result = futureEloProbe({
      buildRatings: leakyElo,
      games,
      targetGameId: "g2",
      historyBefore: [G1, G2],
    });

    expect(result.leaked).toBe(false);
    expect(result.detail).toContain("cannot leak forward info");
  });

  it("treats an empty fixture and an unknown target as nothing to test", () => {
    expect(futureEloProbe({ buildRatings: honestElo, games: [], targetGameId: "g1", historyBefore: [] }).leaked).toBe(
      false,
    );
    expect(
      futureEloProbe({ buildRatings: honestElo, games: [A("g1", 2024, 1, 1)], targetGameId: "nope", historyBefore: [] })
        .leaked,
    ).toBe(false);
  });

  it("does not flag a builder that rates only the entities it has history for", () => {
    const games = [G1, G2];
    const result = futureEloProbe({
      // A team with no history has no rating, so the full-set result has one more
      // key than the prefix. That is correct behaviour, not leakage.
      buildRatings: (given) => Object.fromEntries(given.map((g) => [g.id, 1500 + g.playedAt])),
      games,
      targetGameId: "g1",
      historyBefore: [G1],
    });

    expect(result.leaked).toBe(false);
    expect(result.detail).toContain("identical");
  });
});

/* ---------------------------------------------------------------- *
 * 2. Current-week snap share
 * ---------------------------------------------------------------- */

const W = (season: number, week: number, availability: Record<string, number>): SnapWeek => ({
  season,
  week,
  availability,
});

/** Honours the contract: reads only weeks strictly before the target. */
function honestSnap(weeks: readonly SnapWeek[], target: { season: number; week: number }): Record<string, number> {
  const prior = weeks.filter((w) => (w.season < target.season || (w.season === target.season && w.week < target.week)));
  const out: Record<string, number> = {};
  for (const [player, share] of Object.entries(prior[prior.length - 1]?.availability ?? {})) {
    out[`share_${player}`] = share;
  }
  return out;
}

/** The bug: reads availability from the target week too. */
function leakySnap(weeks: readonly SnapWeek[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of weeks) {
    for (const [player, share] of Object.entries(w.availability)) {
      out[`share_${player}`] = share;
    }
  }
  return out;
}

describe("currentWeekSnapShareProbe", () => {
  it("flags features that move when only the target week is perturbed", () => {
    const weeks = [W(2024, 1, { alpha: 0.4 }), W(2024, 2, { alpha: 0.7 }), W(2024, 3, { alpha: 0.2 })];
    const result = currentWeekSnapShareProbe({
      buildFeatures: leakySnap,
      weeks,
      targetSeason: 2024,
      targetWeek: 3,
    });

    expect(result.leaked).toBe(true);
    expect(result.detail).toContain("not computable from prior weeks");
  });

  it("passes features built from strictly prior weeks", () => {
    const weeks = [W(2024, 1, { alpha: 0.4 }), W(2024, 2, { alpha: 0.7 }), W(2024, 3, { alpha: 0.2 })];
    const result = currentWeekSnapShareProbe({
      buildFeatures: honestSnap,
      weeks,
      targetSeason: 2024,
      targetWeek: 3,
    });

    expect(result.leaked).toBe(false);
  });

  it("flags a naive last-week builder, because the target week is also the last one handed", () => {
    const weeks = [W(2023, 17, { alpha: 0.1 }), W(2024, 1, { alpha: 0.9 })];
    const result = currentWeekSnapShareProbe({
      // "Use the most recent week I was given" is a common shortcut, and it is
      // wrong whenever the target week is the latest one in the input. The probe
      // catches it; the fix is to filter on the target, not on position.
      buildFeatures: (given) => ({ share_alpha: given[given.length - 1]?.availability.alpha ?? 0 }),
      weeks,
      targetSeason: 2024,
      targetWeek: 1,
    });

    expect(result.leaked).toBe(true);
  });

  it("orders seasons, not just week numbers, so a prior-season week counts as prior", () => {
    const weeks = [W(2023, 17, { alpha: 0.1 }), W(2024, 1, { alpha: 0.9 })];
    const result = currentWeekSnapShareProbe({
      // 17 > 1 numerically, so a week-number-only comparison would wrongly treat
      // 2023 week 17 as LATER than the 2024 week 1 target and discard it. This
      // builder compares seasons first and so keeps it.
      buildFeatures: honestSnap,
      weeks,
      targetSeason: 2024,
      targetWeek: 1,
    });

    expect(result.leaked).toBe(false);
    expect(result.detail).toContain("unaffected");
  });

  it("does not test a target week that does not exist in the fixture", () => {
    const result = currentWeekSnapShareProbe({
      buildFeatures: honestSnap,
      weeks: [W(2025, 1, { alpha: 0.5 })],
      targetSeason: 2024,
      targetWeek: 18,
    });

    expect(result.leaked).toBe(false);
    expect(result.detail).toContain("no week exists");
  });
});

/* ---------------------------------------------------------------- *
 * 3. Sign convention
 * ---------------------------------------------------------------- */

describe("signConventionProbe", () => {
  it("catches a flipped spread sign, the false-accuracy bug", () => {
    const result = signConventionProbe({
      home: "Falcons",
      away: "Lions",
      marketSpreadHome: 6.5,
      modelSpreadHome: -6.5, // flipped relative to its own declared convention
      declaredConvention: "home-positive",
    });

    expect(result.leaked).toBe(true);
    expect(result.detail).toContain("false-accuracy bug");
  });

  it("catches a model that disagrees in sign with the market it is graded against", () => {
    const result = signConventionProbe({
      home: "Falcons",
      away: "Lions",
      marketSpreadHome: 6.5,
      modelSpreadHome: -2,
      declaredConvention: "home-negative", // self-consistent, but inverted vs the market
    });

    expect(result.leaked).toBe(true);
    expect(result.detail).toContain("opposite signs");
  });

  it("accepts a model that matches its declared convention and the market", () => {
    const result = signConventionProbe({
      home: "Falcons",
      away: "Lions",
      marketSpreadHome: 6.5,
      modelSpreadHome: 3.2,
      declaredConvention: "home-positive",
    });

    expect(result.leaked).toBe(false);
  });

  it("rejects a non-finite spread rather than scoring it", () => {
    const result = signConventionProbe({
      home: "Falcons",
      away: "Lions",
      marketSpreadHome: 6.5,
      modelSpreadHome: Number.NaN,
      declaredConvention: "home-positive",
    });

    expect(result.leaked).toBe(true);
    expect(result.detail).toContain("non-finite");
  });

  it("treats an exact zero as not-applicable, not as a pass on a guess", () => {
    const result = signConventionProbe({
      home: "Falcons",
      away: "Lions",
      marketSpreadHome: 0,
      modelSpreadHome: 0,
      declaredConvention: "home-positive",
    });

    expect(result.leaked).toBe(false);
    expect(result.detail).toContain("not applicable");
  });
});

/* ---------------------------------------------------------------- *
 * Runner
 * ---------------------------------------------------------------- */

describe("runAllProbes / assertNoLeakage", () => {
  const cleanGames = [G1, G2];
  const cleanWeeks = [W(2024, 1, { alpha: 0.4 }), W(2024, 2, { alpha: 0.7 })];

  it("reports all three probes and none leaked on a clean set", () => {
    const outcome = runAllProbes({
      futureElo: { buildRatings: honestElo, games: cleanGames, targetGameId: "g1", historyBefore: [G1] },
      snapShare: { buildFeatures: honestSnap, weeks: cleanWeeks, targetSeason: 2024, targetWeek: 2 },
      sign: { home: "A", away: "B", marketSpreadHome: 3, modelSpreadHome: 1, declaredConvention: "home-positive" },
    });

    expect(outcome.probes).toHaveLength(3);
    expect(leakedProbes(outcome)).toHaveLength(0);
    expect(() => assertNoLeakage({
      futureElo: { buildRatings: honestElo, games: cleanGames, targetGameId: "g1", historyBefore: [G1] },
      snapShare: { buildFeatures: honestSnap, weeks: cleanWeeks, targetSeason: 2024, targetWeek: 2 },
      sign: { home: "A", away: "B", marketSpreadHome: 3, modelSpreadHome: 1, declaredConvention: "home-positive" },
    })).not.toThrow();
  });

  it("throws loudly with the offending detail when any probe leaks", () => {
    const games = [G1, G2];
    expect(() =>
      assertNoLeakage({
        futureElo: { buildRatings: leakyElo, games, targetGameId: "g1", historyBefore: [G1] },
      }),
    ).toThrow(/leakage detected in 1 probe/);
  });

  it("marks a probe with no fixture as skipped rather than silently clean", () => {
    const outcome = runAllProbes({});
    expect(outcome.probes).toHaveLength(3);
    expect(outcome.probes.every((p) => p.detail.includes("no fixture supplied"))).toBe(true);
    expect(leakedProbes(outcome)).toHaveLength(0);
  });
});
