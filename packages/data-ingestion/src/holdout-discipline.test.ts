import { describe, expect, it } from "vitest";
import {
  assertTrainable,
  baselineHistoryFor,
  classifyNull,
  crossTierContamination,
  identityNamespaces,
  mapTeamIdentity,
  nullReason,
  nullSafeMean,
  observedCount,
  seal,
  sealLastSeason,
  score,
  SealedHoldoutError,
  type Game,
  type SealedHoldout,
} from "./holdout-discipline";

const g = (id: string, season: number): Game => ({ id, season });

/* ---------------------------------------------------------------- *
 * Sealing
 * ---------------------------------------------------------------- */

describe("sealLastSeason", () => {
  it("holds out exactly the most recent complete season", () => {
    const games = [
      g("a1", 2020),
      g("a2", 2020),
      g("b1", 2021),
      g("c1", 2022),
      g("c2", 2022),
    ];
    const result = sealLastSeason(games);

    expect(result.sealedSeason).toBe(2022);
    // Read through score(), not by reaching for .games: the holdout is branded
    // precisely so an unguarded `.map` is impossible.
    expect(score(result.holdout).map((x) => x.id)).toEqual(["c1", "c2"]);
    expect(result.train.map((x) => x.id)).toEqual(["a1", "a2", "b1"]);
    expect(result.holdout.sealed).toBe(true);
  });

  it("throws when a trainer is handed the holdout, which is the whole point", () => {
    const result = sealLastSeason([g("a1", 2020), g("b1", 2021)]);
    expect(() => assertTrainable(result.holdout)).toThrow(SealedHoldoutError);
    expect(() => assertTrainable(result.holdout)).toThrow(/must not reach feature selection/);
  });

  it("passes training data through untouched", () => {
    const result = sealLastSeason([g("a1", 2020), g("b1", 2021)]);
    expect(assertTrainable(result.train)).toEqual(result.train);
    expect(() => assertTrainable([g("a1", 2020)])).not.toThrow();
  });

  it("never seals an in-progress season when the caller declares what is complete", () => {
    // 2024 is mid-season: it must be TRAIN, not the holdout.
    const games = [g("a1", 2022), g("b1", 2023), g("c1", 2024), g("c2", 2024)];
    const result = sealLastSeason(games, [2022, 2023]);

    expect(result.sealedSeason).toBe(2023);
    // The in-progress season is trained on, never sealed, and never discarded.
    expect(result.train.map((x) => x.id)).toEqual(["a1", "c1", "c2"]);
    expect(score(result.holdout).map((x) => x.id)).toEqual(["b1"]);
  });

  it("refuses to seal the only season, since that would leave nothing to train on", () => {
    expect(() => sealLastSeason([g("a1", 2024)])).toThrow(/would leave no training data/);
  });

  it("refuses an empty fixture and a fixture with no complete season", () => {
    expect(() => sealLastSeason([])).toThrow(/no games to split/);
    expect(() => sealLastSeason([g("a1", 2024)], [2020, 2021])).toThrow(/no complete seasons present/);
  });

  it("keeps the holdout readable through the single sanctioned scoring path", () => {
    const result = sealLastSeason([g("a1", 2020), g("b1", 2021)]);
    expect(score(result.holdout).map((x) => x.id)).toEqual(["b1"]);
  });

  it("refuses to score something that is not a sealed holdout", () => {
    // A caller can reach score() with a wrong-shaped object at runtime (JS, or
    // hand-built data), so the runtime guard must not rely on the parameter type.
    const notSealed = { kind: "train", sealed: false, games: [] } as unknown as SealedHoldout<Game>;
    expect(() => score(notSealed)).toThrow(/not a sealed holdout/);
  });

  it("rejects a hand-built object that claims to be trainable but carries a sealed holdout", () => {
    const fake = seal([g("a1", 2024)], 2024);
    // The sealed flag is what the gate checks, not the shape of the object. A
    // caller can hand-build anything at runtime, so the runtime check has to
    // hold even where the type system already refuses to build it.
    const lying = { kind: "sealed-holdout", sealed: true, season: 2024, games: [] } as unknown;
    expect(() => assertTrainable(lying as SealedHoldout<Game>)).toThrow(SealedHoldoutError);
    expect(() => assertTrainable({ kind: "train", sealed: true, games: [] } as never)).toThrow(
      SealedHoldoutError,
    );
    expect(fake.season).toBe(2024);
  });
});

/* ---------------------------------------------------------------- *
 * Null classification
 * ---------------------------------------------------------------- */

describe("classifyNull", () => {
  it("marks a stat the league does not collect as null, not zero", () => {
    const result = classifyNull(0, { leagueCollects: false });
    expect(result.isNull).toBe(true);
    expect(result.value).toBe(0);
  });

  it("marks a real zero from a collecting league as present", () => {
    const result = classifyNull(0, { leagueCollects: true });
    expect(result.isNull).toBe(false);
  });

  it("marks absent, null, and undefined as null by default", () => {
    expect(classifyNull(null).isNull).toBe(true);
    expect(classifyNull(undefined).isNull).toBe(true);
  });

  it("distinguishes why a value is null", () => {
    expect(nullReason(5, { leagueCollects: false })).toBe("league-does-not-collect");
    expect(nullReason(5, { sourceCollects: false })).toBe("source-does-not-collect");
    expect(nullReason(null)).toBe("absent");
    expect(nullReason(5)).toBe("absent");
  });
});

describe("nullSafeMean / observedCount", () => {
  it("a league without the stat contributes no weight instead of a zero value", () => {
    // 40% of observations are a league that does not collect the stat.
    const values = [
      classifyNull(10, { leagueCollects: true }),
      classifyNull(20, { leagueCollects: true }),
      classifyNull(0, { leagueCollects: false }),
      classifyNull(0, { leagueCollects: false }),
      classifyNull(30, { leagueCollects: true }),
    ];

    // Nulls skipped: mean of 10, 20, 30. Poisoned-by-zero: mean of 10,20,0,0,30.
    expect(nullSafeMean(values)).toBe(20);
    expect(nullSafeMean(values)).not.toBe(12);
    expect(observedCount(values)).toBe(3);
  });

  it("returns null rather than NaN when everything is missing", () => {
    expect(nullSafeMean([classifyNull(null), classifyNull(0, { leagueCollects: false })])).toBeNull();
    expect(observedCount([classifyNull(null)])).toBe(0);
  });

  it("ignores non-finite values instead of poisoning the mean with Infinity", () => {
    const values = [classifyNull(10), classifyNull(Number.POSITIVE_INFINITY), classifyNull(20)];
    expect(nullSafeMean(values)).toBe(15);
  });

  it("returns null for an empty list rather than 0, which would read as a real average", () => {
    expect(nullSafeMean([])).toBeNull();
  });
});

/* ---------------------------------------------------------------- *
 * Promotion / relegation
 * ---------------------------------------------------------------- */

describe("mapTeamIdentity", () => {
  it("namespaces a team by team AND tier", () => {
    expect(mapTeamIdentity({ teamId: "wolves", season: 2023, tier: "E2" })).toBe("wolves@E2");
  });

  it("gives a promoted team a different identity in its new tier", () => {
    const before = mapTeamIdentity({ teamId: "wolves", season: 2023, tier: "E2" });
    const after = mapTeamIdentity({ teamId: "wolves", season: 2024, tier: "E1" });
    expect(before).not.toBe(after);
  });

  it("keeps prior-tier history out of the new tier's baseline", () => {
    const records = [
      { teamId: "wolves", season: 2023, tier: "E2" },
      { teamId: "wolves", season: 2024, tier: "E1" },
      { teamId: "lions", season: 2024, tier: "E1" },
    ];
    const e1 = baselineHistoryFor("E1", records);

    expect(e1.map((r) => `${r.teamId}@${r.tier}`)).toEqual(["wolves@E1", "lions@E1"]);
    expect(e1.some((r) => r.tier === "E2")).toBe(false);
  });

  it("lists every distinct namespace", () => {
    const records = [
      { teamId: "wolves", season: 2023, tier: "E2" },
      { teamId: "wolves", season: 2024, tier: "E1" },
    ];
    expect(identityNamespaces(records)).toEqual(["wolves@E1", "wolves@E2"]);
  });

  it("surfaces the contamination a naive filter would have let through", () => {
    const records = [
      { teamId: "wolves", season: 2023, tier: "E2" },
      { teamId: "lions", season: 2024, tier: "E1" },
    ];
    const nowInE1: Record<string, string> = { wolves: "E1", lions: "E1" };

    const contamination = crossTierContamination("E1", records, nowInE1);
    expect(contamination.map((r) => `${r.teamId}@${r.tier}`)).toEqual(["wolves@E2"]);
  });

  it("reports no contamination when a tier's records are all its own", () => {
    const records = [
      { teamId: "lions", season: 2024, tier: "E1" },
      { teamId: "crows", season: 2024, tier: "E2" },
    ];
    expect(crossTierContamination("E1", records, { lions: "E1", crows: "E2" })).toHaveLength(0);
  });
});
