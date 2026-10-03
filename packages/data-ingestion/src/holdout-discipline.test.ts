import { describe, expect, it } from "vitest";
import {
  sealLastSeason,
  assertNotSealed,
  classifyNull,
  nullSafeMean,
  mapTeamIdentity,
  ratingKey,
  HoldoutLeakError,
  type SeasonGame,
} from "./holdout-discipline.js";

function makeGame(over: Partial<SeasonGame> = {}): SeasonGame {
  return {
    gameId: "g1", season: 2024, week: 5, team: "KC", opponent: "BUF",
    label: 1, features: { epa: 0.15, snapShare: 0.85 },
    ...over,
  };
}

describe("V2: holdout discipline + null classification", () => {
  it("sealLastSeason holds out exactly the latest season", () => {
    const games = [
      ...[2020, 2021, 2022, 2023, 2024].map((s) => makeGame({ season: s, gameId: `g${s}` })),
    ];
    const d = sealLastSeason(games);
    expect(d.holdoutSeason).toBe(2024);
    expect(d.holdout.every((g) => g.season === 2024)).toBe(true);
    expect(d.train.every((g) => g.season < 2024)).toBe(true);
    expect(d.train.length).toBe(4);
    expect(d.holdout.length).toBe(1);
    expect(d.sealed).toBe(true);
  });

  it("passing sealed dataset to trainer throws HoldoutLeakError", () => {
    const games = [makeGame({ season: 2023 }), makeGame({ season: 2024, gameId: "g2" })];
    const d = sealLastSeason(games);
    expect(() => assertNotSealed(d, "trainModel")).toThrow(HoldoutLeakError);
    expect(() => assertNotSealed(d, "trainModel")).toThrow(/sealed/i);
  });

  it("unsealed data passes guard", () => {
    const games = [makeGame()];
    expect(() => assertNotSealed(games, "trainModel")).not.toThrow();
    expect(() => assertNotSealed(null, "trainModel")).not.toThrow();
  });

  it("sealLastSeason throws on empty dataset", () => {
    expect(() => sealLastSeason([])).toThrow(HoldoutLeakError);
  });

  it("sealLastSeason throws on single season", () => {
    const games = [makeGame({ season: 2024 }), makeGame({ season: 2024, gameId: "g2" })];
    expect(() => sealLastSeason(games)).toThrow(HoldoutLeakError);
  });

  it("classifyNull: missing-by-league stat → isNull true", () => {
    const r = classifyNull(0, false);
    expect(r.isNull).toBe(true);
    expect(r.value).toBeNull();
  });

  it("classifyNull: present stat → isNull false", () => {
    const r = classifyNull(42, true);
    expect(r.isNull).toBe(false);
    expect(r.value).toBe(42);
  });

  it("classifyNull: undefined stat → isNull true", () => {
    const r = classifyNull(undefined, true);
    expect(r.isNull).toBe(true);
    expect(r.value).toBeNull();
  });

  it("nullSafeMean skips nulls (league without stat contributes zero weight)", () => {
    const mean = nullSafeMean([10, null, 20, null, 30]);
    expect(mean).toBe(20); // (10+20+30)/3, not (10+0+20+0+30)/5
  });

  it("nullSafeMean returns null when all values are null", () => {
    expect(nullSafeMean([null, null])).toBeNull();
    expect(nullSafeMean([])).toBeNull();
  });

  it("mapTeamIdentity namespaces by tier (promotion doesn't pollute)", () => {
    const tiers = new Map<string, number>([
      ["LUTON:2023", 2], // Luton in tier 2 in 2023
      ["LUTON:2024", 1], // promoted to tier 1 in 2024
    ]);
    const id2023 = mapTeamIdentity("LUTON", 2023, tiers);
    const id2024 = mapTeamIdentity("LUTON", 2024, tiers);
    expect(id2023).toContain("tier2");
    expect(id2024).toContain("tier1");
    expect(id2023).not.toBe(id2024);
  });

  it("ratingKey is tier-namespaced", () => {
    const k1 = ratingKey("LUTON", 2023, 2);
    const k2 = ratingKey("LUTON", 2024, 1);
    expect(k1).not.toBe(k2);
    expect(k1).toContain("tier2");
    expect(k2).toContain("tier1");
  });
});
