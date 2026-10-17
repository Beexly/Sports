import { describe, it, expect } from "vitest";
import {
  computeYoyEpaPersistence,
  YOY_PERSISTENCE_SHRINKAGE_K,
  type YoyPlay,
} from "../yoy-persistence.js";

describe("YoY EPA Persistence", () => {
  const K = YOY_PERSISTENCE_SHRINKAGE_K;

  function makePlay(overrides: Partial<YoyPlay>): YoyPlay {
    return {
      playId: "p1",
      gameId: "g1",
      season: 2026,
      week: 5,
      posteam: "SEA",
      defteam: "SF",
      playType: "pass",
      epa: 0.1,
      ...overrides,
    };
  }

  it("filters correctly by point-in-time constraints", () => {
    const plays = [
      makePlay({ season: 2026, week: 4, posteam: "SEA", epa: 0.2 }), // current
      makePlay({ season: 2026, week: 5, posteam: "SEA", epa: 0.5 }), // target week - EXCLUDED from current
      makePlay({ season: 2026, week: 6, posteam: "SEA", epa: -0.1 }), // future week - EXCLUDED
      makePlay({ season: 2025, week: 18, posteam: "SEA", epa: 0.1 }), // prior
      makePlay({ season: 2025, week: 20, posteam: "SEA", epa: -0.2 }), // prior (after targetWeek still prior)
      makePlay({ season: 2024, week: 10, posteam: "SEA", epa: 0.8 }), // season - 2 - EXCLUDED
    ];

    const res = computeYoyEpaPersistence(plays, 2026, 5);
    const sea = res.offense.find((t) => t.teamId === "SEA")!;

    expect(sea.currentPlays).toBe(1); // week 4
    expect(sea.priorPlays).toBe(2); // week 18 and 20
    expect(sea.shrunkEpaPerPlay).toBeNull(); // Under floor
  });

  it("returns nulls (not zeros) for a week 1 target due to empty current window", () => {
    const plays = [
      makePlay({
        season: 2025,
        week: 1,
        posteam: "SEA",
        defteam: "SF",
        epa: 0.1,
      }),
    ];
    // Push enough plays to hit the prior floor
    for (let i = 0; i < K; i++) {
      plays.push(
        makePlay({
          season: 2025,
          week: 1,
          posteam: "SEA",
          defteam: "SF",
          epa: 0.1,
        }),
      );
    }

    const res = computeYoyEpaPersistence(plays, 2026, 1);
    const seaOff = res.offense.find((t) => t.teamId === "SEA")!;

    expect(seaOff.currentPlays).toBe(0);
    expect(seaOff.priorPlays).toBe(K + 1);
    expect(seaOff.currentEpaPerPlay).toBeNull();
    expect(seaOff.priorEpaPerPlay).toBeNull();
    expect(seaOff.deltaEpaPerPlay).toBeNull();
    expect(seaOff.shrunkEpaPerPlay).toBeNull();
  });

  it("enforces per-side floor independence", () => {
    const plays: YoyPlay[] = [];

    // SEA offense meets both current and prior floors
    for (let i = 0; i < K; i++) {
      plays.push(
        makePlay({
          season: 2026,
          week: 1,
          posteam: "SEA",
          defteam: "BUF",
          epa: 0.2,
        }),
      );
      plays.push(
        makePlay({
          season: 2025,
          week: 1,
          posteam: "SEA",
          defteam: "BUF",
          epa: -0.1,
        }),
      );
    }

    // SEA defense does not meet current floor (only 1 play)
    plays.push(
      makePlay({
        season: 2026,
        week: 1,
        posteam: "NYG",
        defteam: "SEA",
        epa: 0.0,
      }),
    );
    for (let i = 0; i < K; i++) {
      plays.push(
        makePlay({
          season: 2025,
          week: 1,
          posteam: "NYG",
          defteam: "SEA",
          epa: 0.0,
        }),
      );
    }

    const res = computeYoyEpaPersistence(plays, 2026, 5);
    const seaOff = res.offense.find((t) => t.teamId === "SEA")!;
    const seaDef = res.defense.find((t) => t.teamId === "SEA")!;

    expect(seaOff.currentEpaPerPlay).not.toBeNull();
    expect(seaOff.priorEpaPerPlay).not.toBeNull();
    expect(seaOff.shrunkEpaPerPlay).not.toBeNull();

    expect(seaDef.currentEpaPerPlay).toBeNull();
    expect(seaDef.shrunkEpaPerPlay).toBeNull();
  });

  it("computes shrinkage matching the pinned formula exactly and preserves delta sign", () => {
    const plays: YoyPlay[] = [];
    // Current window: 250 plays with EPA 0.4.
    for (let i = 0; i < 250; i++) {
      plays.push(makePlay({ season: 2026, week: 2, posteam: "MIN", epa: 0.4 }));
    }
    // Prior window: 300 plays with EPA 0.1.
    for (let i = 0; i < 300; i++) {
      plays.push(makePlay({ season: 2025, week: 1, posteam: "MIN", epa: 0.1 }));
    }

    const res = computeYoyEpaPersistence(plays, 2026, 5);
    const minOff = res.offense.find((t) => t.teamId === "MIN")!;

    // Check values
    expect(minOff.currentPlays).toBe(250);
    expect(minOff.priorPlays).toBe(300);
    expect(minOff.currentEpaPerPlay).toBeCloseTo(0.4);
    expect(minOff.priorEpaPerPlay).toBeCloseTo(0.1);
    expect(minOff.deltaEpaPerPlay).toBeCloseTo(0.3); // Current > Prior => positive delta

    // Formula check: (250 * 0.4 + 200 * 0.1) / (250 + 200) = (100 + 20) / 450 = 120 / 450 = 0.266666...
    expect(minOff.shrunkEpaPerPlay).toBeCloseTo(0.26666666666666666);
    expect(minOff.shrunkEpaPerPlay).toBeGreaterThan(minOff.priorEpaPerPlay!);
    expect(minOff.shrunkEpaPerPlay).toBeLessThan(minOff.currentEpaPerPlay!);
  });

  it("computes genuinely defteam-grained numbers, not negating values", () => {
    const plays: YoyPlay[] = [];

    // DAL offense: +0.2 EPA current and prior
    for (let i = 0; i < K; i++) {
      plays.push(
        makePlay({
          season: 2026,
          week: 2,
          posteam: "DAL",
          defteam: "PHI",
          epa: 0.2,
        }),
      );
      plays.push(
        makePlay({
          season: 2025,
          week: 1,
          posteam: "DAL",
          defteam: "PHI",
          epa: 0.2,
        }),
      );
    }

    // DAL defense (allowing EPA): +0.5 EPA current, +0.1 EPA prior
    for (let i = 0; i < K; i++) {
      plays.push(
        makePlay({
          season: 2026,
          week: 2,
          posteam: "PHI",
          defteam: "DAL",
          epa: 0.5,
        }),
      );
      plays.push(
        makePlay({
          season: 2025,
          week: 1,
          posteam: "PHI",
          defteam: "DAL",
          epa: 0.1,
        }),
      );
    }

    const res = computeYoyEpaPersistence(plays, 2026, 5);
    const dalOff = res.offense.find((t) => t.teamId === "DAL")!;
    const dalDef = res.defense.find((t) => t.teamId === "DAL")!;

    expect(dalOff.currentEpaPerPlay).toBeCloseTo(0.2);
    expect(dalDef.currentEpaPerPlay).toBeCloseTo(0.5); // Means allowing +0.5 EPA/play. NOT negated.
    expect(dalDef.deltaEpaPerPlay).toBeCloseTo(0.4); // Current allowed - prior allowed (positive delta)
  });

  it("excludes null EPA plays from means and counts them", () => {
    const plays: YoyPlay[] = [];

    for (let i = 0; i < K; i++) {
      plays.push(makePlay({ season: 2026, week: 2, posteam: "BUF", epa: 1.0 }));
      plays.push(makePlay({ season: 2025, week: 1, posteam: "BUF", epa: 0.5 }));
    }
    // Add null plays
    plays.push(makePlay({ season: 2026, week: 2, posteam: "BUF", epa: null }));
    plays.push(makePlay({ season: 2025, week: 1, posteam: "BUF", epa: null }));
    plays.push(makePlay({ season: 2025, week: 1, posteam: "BUF", epa: null }));

    const res = computeYoyEpaPersistence(plays, 2026, 5);
    const bufOff = res.offense.find((t) => t.teamId === "BUF")!;

    // Means should not be dragged down by nulls scored as 0
    expect(bufOff.currentEpaPerPlay).toBeCloseTo(1.0);
    expect(bufOff.currentPlays).toBe(K); // the null play shouldn't be counted in currentPlays

    // Provenance should record the exclusion
    expect(res.provenance.excludedEpaNullPlays).toBe(3);
    expect(res.provenance.sampleSize).toBe(2 * K);
  });

  it("outputs a sorted list of teams", () => {
    const plays: YoyPlay[] = [
      makePlay({ posteam: "MIN", defteam: "CHI" }),
      makePlay({ posteam: "ARI", defteam: "SEA" }),
    ];
    const res = computeYoyEpaPersistence(plays, 2026, 5);

    const offTeams = res.offense.map((t) => t.teamId);
    expect(offTeams).toEqual(["ARI", "CHI", "MIN", "SEA"]);
    const defTeams = res.defense.map((t) => t.teamId);
    expect(defTeams).toEqual(["ARI", "CHI", "MIN", "SEA"]);
  });
});
