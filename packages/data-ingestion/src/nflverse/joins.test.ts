import { describe, expect, it } from "vitest";

import {
  indexRosters,
  joinContractsToRosters,
  joinSnapsToRosters,
  personnelForPlay,
  rosterKey,
  seasonOfGameId,
  summarize,
} from "./joins.js";
import type { ContractRow, RosterRow, SnapRow } from "./rows.js";

function roster(over: Partial<RosterRow> = {}): RosterRow {
  return {
    season: 2024,
    week: null,
    roster_level: "season",
    team: "BUF",
    position: "QB",
    depth_chart_position: null,
    jersey_number: 17,
    status: "ACT",
    full_name: "J Allen",
    gsis_id: "00-0034857",
    pfr_id: "AllenJa02",
    ...over,
  };
}

function snap(over: Partial<SnapRow> = {}): SnapRow {
  return {
    season: 2024,
    week: 1,
    team: "BUF",
    player: "J Allen",
    position: "QB",
    offense_snaps: 60,
    offense_pct: 1,
    defense_snaps: 0,
    defense_pct: 0,
    st_snaps: 0,
    st_pct: 0,
    game_id: "2024_01_BAL_KC",
    pfr_player_id: "AllenJa02",
    ...over,
  };
}

function contract(over: Partial<ContractRow> = {}): ContractRow {
  return {
    player: "J Allen",
    team: "BUF",
    year_signed: 2024,
    value: 80,
    apy: 20,
    guaranteed: 80,
    years: 4,
    position: "QB",
    gsis_id: "00-0034857",
    ...over,
  };
}

describe("indexRosters", () => {
  it("keeps weekly and season rows apart and is not ambiguous for them", () => {
    const index = indexRosters([roster(), roster({ roster_level: "weekly", week: 1 })]);
    const entries = index.byGsis.get(rosterKey(2024, "00-0034857"))!;
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.row.roster_level).sort()).toEqual(["season", "weekly"]);
    // A season row beside a weekly row is the normal shape, not a conflict.
    expect(entries.some((e) => e.ambiguous)).toBe(false);
  });

  it("treats many weekly rows across different weeks as a time series", () => {
    // The key is season + gsis_id and does NOT include the week, so a full
    // season of weekly rows collapses onto one key. That is 17-18 rows for a
    // regular player and it is not a conflict.
    const weekly = [1, 2, 3, 4, 5].map((week) => roster({ roster_level: "weekly", week }));
    const index = indexRosters(weekly);
    const entries = index.byGsis.get(rosterKey(2024, "00-0034857"))!;
    expect(entries).toHaveLength(5);
    expect(entries.every((e) => e.ambiguous)).toBe(false);
  });

  it("flags a same-level, same-week collision and keeps BOTH rows", () => {
    const index = indexRosters([roster(), roster({ team: "MIA" })]);
    const entries = index.byGsis.get(rosterKey(2024, "00-0034857"))!;
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.ambiguous)).toBe(true);
    // It must not have silently picked one team.
    expect(entries.map((e) => e.row.team).sort()).toEqual(["BUF", "MIA"]);
  });

  it("flags two weekly rows in the same week", () => {
    const index = indexRosters([
      roster({ roster_level: "weekly", week: 3 }),
      roster({ roster_level: "weekly", week: 3, team: "MIA" }),
    ]);
    const entries = index.byGsis.get(rosterKey(2024, "00-0034857"))!;
    expect(entries.every((e) => e.ambiguous)).toBe(true);
  });

  it("does not collide across seasons", () => {
    const index = indexRosters([roster(), roster({ season: 2023 })]);
    expect(index.byGsis.get(rosterKey(2024, "00-0034857"))).toHaveLength(1);
    expect(index.byGsis.get(rosterKey(2023, "00-0034857"))).toHaveLength(1);
    // A player present in two seasons IS ambiguous for a contract, which has no
    // season of its own to disambiguate with.
    expect(index.byGsisAll.get("00-0034857")).toHaveLength(2);
  });

  it("counts a null pfr_id rather than indexing it", () => {
    const index = indexRosters([roster({ pfr_id: null })]);
    expect(index.noPfrId).toBe(1);
    expect(index.byPfr.has(rosterKey(2024, "null"))).toBe(false);
  });
});

describe("personnelForPlay", () => {
  const index = indexRosters([roster(), roster({ gsis_id: "00-0030001", pfr_id: "Dobb01" })]);

  it("returns null for null players and does not invent an empty roster", () => {
    expect(personnelForPlay(null, index, 2024)).toBeNull();
  });

  it("returns an empty match set for an empty player list, which is not null", () => {
    const result = personnelForPlay([], index, 2024);
    expect(result).not.toBeNull();
    expect(result!.matched).toHaveLength(0);
    expect(result!.unmatched).toHaveLength(0);
  });

  it("matches known ids and reports unknown ones without dropping them", () => {
    const result = personnelForPlay(["00-0034857", "00-9999999"], index, 2024)!;
    expect(result.matched.map((m) => m.gsis_id)).toEqual(["00-0034857"]);
    expect(result.unmatched).toEqual(["00-9999999"]);
    expect(result.matched.length + result.unmatched.length).toBe(2);
  });

  it("qualifies on season so a roster from another year cannot answer", () => {
    expect(personnelForPlay(["00-0034857"], index, 2018)!.unmatched).toEqual(["00-0034857"]);
    expect(personnelForPlay(["00-0034857"], index, 2024)!.matched).toHaveLength(1);
  });

  it("refuses a blank id rather than looking it up", () => {
    const result = personnelForPlay(["   "], index, 2024)!;
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });

  it("flags an ambiguous id and still returns every row for it", () => {
    const ambiguous = indexRosters([roster(), roster({ team: "MIA" })]);
    const result = personnelForPlay(["00-0034857"], ambiguous, 2024)!;
    expect(result.ambiguous).toEqual(["00-0034857"]);
    const entry = result.matched[0];
    expect(entry).toBeDefined();
    expect(entry?.roster).toHaveLength(2);
  });
});

describe("joinSnapsToRosters", () => {
  it("matches on pfr_player_id AND season", () => {
    const index = indexRosters([roster()]);
    const result = joinSnapsToRosters([snap()], index);
    expect(result.matched).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it("does not let a snap match a roster from a different season", () => {
    const index = indexRosters([roster({ season: 2019 })]);
    const result = joinSnapsToRosters([snap({ season: 2024 })], index);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });

  it("reports an unmatched snap and never invents a gsis_id for it", () => {
    const index = indexRosters([roster()]);
    const orphan = snap({ pfr_player_id: "Nobody01" });
    const result = joinSnapsToRosters([orphan], index);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0]).toBe(orphan);
    // The snap row itself is untouched: no synthetic id was grafted on.
    expect(Object.prototype.hasOwnProperty.call(orphan, "gsis_id")).toBe(false);
  });
});

describe("joinContractsToRosters", () => {
  it("matches a contract to a roster on gsis_id", () => {
    const index = indexRosters([roster()]);
    const result = joinContractsToRosters([contract()], index);
    expect(result.matched).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it("reports an unmatched contract rather than dropping it", () => {
    const index = indexRosters([roster()]);
    const result = joinContractsToRosters([contract({ gsis_id: "00-0000000" })], index);
    expect(result.unmatched).toHaveLength(1);
    expect(result.matched).toHaveLength(0);
  });

  it("treats a multi-season career as a career, not a conflict", () => {
    const index = indexRosters([roster(), roster({ season: 2023 })]);
    const result = joinContractsToRosters([contract()], index);
    // Both roster rows are returned, and the span is reported as a fact.
    expect(result.matched[0]?.roster).toHaveLength(2);
    expect(result.matched[0]?.seasonsMatched).toBe(2);
    // Appearing in two seasons is a normal career, not an unresolved conflict.
    expect(result.ambiguous).toHaveLength(0);
  });

  it("does flag a genuine same-level, same-week collision", () => {
    const index = indexRosters([roster(), roster({ team: "MIA" })]);
    const result = joinContractsToRosters([contract()], index);
    expect(result.ambiguous).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("extracts the season from a game id and refuses a malformed one", () => {
    expect(seasonOfGameId("2024_01_TEN_CHI")).toBe(2024);
    expect(seasonOfGameId("nope")).toBeNull();
    expect(seasonOfGameId("")).toBeNull();
  });

  it("reports a null match rate for an empty population, never 0", () => {
    expect(summarize(0, 0, 0, 0).matchRate).toBeNull();
    expect(summarize(10, 5, 5, 0).matchRate).toBe(0.5);
  });
});
