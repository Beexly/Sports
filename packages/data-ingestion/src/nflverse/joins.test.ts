import { describe, expect, it } from "vitest";
import {
  JoinCounter,
  createRosterIndexBuilder,
  indexContractIdentities,
  indexForSeason,
  indexRosterByPfrId,
  indexRosters,
  isRosterKeyAmbiguous,
  joinContractToRoster,
  joinSnapToRoster,
  parseContractRow,
  parseRosterRow,
  parseSnapRow,
  personnelForPlay,
  pfrKey,
  playersOnFieldIdFormat,
  rosterBucket,
  rosterKey,
  seasonFromGameId,
} from "./joins.js";

/**
 * Fixture ids are copied from the real files, not invented:
 *   00-0004091 Phil Dawson   ARI K 2018      rosters.jsonl
 *   00-0037106 / 00-0036391 2024 participants participation-2024.jsonl
 *   00-0036442 Joe Burrow    2023 contract   contracts.jsonl
 *   WisnSt01    Wisniewski  PHI G 2018      snap-counts.jsonl
 */
const DAWSON = "00-0004091";
const ON_FIELD_2024_A = "00-0037106";
const ON_FIELD_2024_B = "00-0036391";
const BURROW = "00-0036442";
const WISNIEWSKI_PFR = "WisnSt01";

function rosterRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    season: 2018,
    week: 1,
    roster_level: "weekly",
    team: "ARI",
    position: "K",
    depth_chart_position: "K",
    jersey_number: 4,
    status: "ACT",
    full_name: "Phil Dawson",
    gsis_id: DAWSON,
    pfr_id: null,
    ...overrides,
  };
}

function snapRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    season: 2018,
    week: 1,
    team: "PHI",
    player: "Stefen Wisniewski",
    position: "G",
    game_id: "2018_01_ATL_PHI",
    pfr_player_id: WISNIEWSKI_PFR,
    ...overrides,
  };
}

describe("roster index", () => {
  it("keys on season plus gsis_id and keeps roster_level distinguishable", () => {
    const index = indexRosters([
      rosterRow({ roster_level: "season", week: 17 }),
      rosterRow({ roster_level: "weekly", week: 1 }),
      rosterRow({ roster_level: "weekly", week: 8 }),
    ]);

    expect(index.indexedRows).toBe(3);
    expect(index.byKey.size).toBe(1);
    expect(index.seasonLevelRows).toBe(1);
    expect(index.weeklyLevelRows).toBe(2);

    const bucket = rosterBucket(index, 2018, DAWSON);
    expect(bucket).toBeDefined();
    if (bucket === undefined) return;
    // One season-level row and two weekly rows survive as separate records.
    expect(bucket.seasonRows).toHaveLength(1);
    expect(bucket.weeklyRows).toHaveLength(2);
    expect(bucket.seasonRows[0]?.roster_level).toBe("season");
    expect(bucket.weeklyRows[0]?.roster_level).toBe("weekly");
    expect(bucket.weeklyRows[0]?.week).toBe(1);
    expect(bucket.weeklyRows[1]?.week).toBe(8);
  });

  it("keys on season too, so the same gsis_id in two seasons is two keys", () => {
    const index = indexRosters([rosterRow({ season: 2018 }), rosterRow({ season: 2019 })]);

    expect(index.byKey.size).toBe(2);
    expect(rosterBucket(index, 2018, DAWSON)).toBeDefined();
    expect(rosterBucket(index, 2019, DAWSON)).toBeDefined();
    expect(rosterBucket(index, 2020, DAWSON)).toBeUndefined();
    expect(index.seasonMin).toBe(2018);
    expect(index.seasonMax).toBe(2019);
  });

  it("keeps BOTH season-level rows on a shared key and reports the key ambiguous", () => {
    const index = indexRosters([
      rosterRow({ roster_level: "season", week: 17, team: "ARI" }),
      rosterRow({ roster_level: "season", week: 17, team: "NYJ" }),
    ]);

    const bucket = rosterBucket(index, 2018, DAWSON);
    expect(bucket).toBeDefined();
    if (bucket === undefined) return;

    // Neither row is dropped and neither is chosen.
    expect(bucket.seasonRows).toHaveLength(2);
    expect(bucket.ambiguous).toBe(true);
    expect(bucket.seasonRows.map((record) => record.team).sort()).toEqual(["ARI", "NYJ"]);
    expect(index.ambiguousKeys).toBe(1);
    expect(isRosterKeyAmbiguous(index, 2018, DAWSON)).toBe(true);
  });

  it("does not call a key ambiguous just because it has many weekly rows", () => {
    const rows = Array.from({ length: 17 }, (_unused, week) => rosterRow({ roster_level: "weekly", week: week + 1 }));
    const index = indexRosters(rows);

    expect(index.ambiguousKeys).toBe(0);
    expect(isRosterKeyAmbiguous(index, 2018, DAWSON)).toBe(false);
  });

  it("refuses a blank gsis_id and never indexes it under a guessed key", () => {
    const index = indexRosters([rosterRow({ gsis_id: "" }), rosterRow({ gsis_id: "   " }), rosterRow({ gsis_id: null })]);

    expect(index.indexedRows).toBe(0);
    expect(index.byKey.size).toBe(0);
    expect(index.refusals.blank_gsis_id).toBe(3);
    expect(rosterKey(2018, "")).toBeNull();
    expect(rosterKey(2018, "  ")).toBeNull();
    expect(rosterBucket(index, 2018, "")).toBeUndefined();
  });

  it("refuses a roster row whose roster_level is not a level it knows", () => {
    const decision = parseRosterRow(rosterRow({ roster_level: "preseason" }));
    expect(decision.ok).toBe(false);
    const index = indexRosters([rosterRow({ roster_level: "preseason" })]);
    expect(index.refusals.unknown_roster_level).toBe(1);
  });

  it("increments the builder once per row and reports the season range actually present", () => {
    const builder = createRosterIndexBuilder();
    builder.add(rosterRow({ season: 2018 }));
    builder.add(rosterRow({ season: 2025 }));
    const index = builder.finish();
    expect(index.indexedRows).toBe(2);
    expect(index.seasonMin).toBe(2018);
    expect(index.seasonMax).toBe(2025);
  });
});

describe("personnelForPlay", () => {
  const index = indexRosters([
    rosterRow({ season: 2024, week: 17, roster_level: "season", gsis_id: ON_FIELD_2024_A, full_name: "A" }),
    rosterRow({ season: 2024, week: 1, roster_level: "weekly", gsis_id: ON_FIELD_2024_A, full_name: "A" }),
    rosterRow({ season: 2024, week: 17, roster_level: "season", gsis_id: ON_FIELD_2024_B, full_name: "B" }),
  ]);
  const view = indexForSeason(index, 2024);

  it("returns null for a null players_on_field, NOT an empty roster", () => {
    const result = personnelForPlay(null, view);

    // The whole point: null and empty are different facts.
    expect(result).toBeNull();
    expect(result).not.toEqual({});
    expect(result === null).toBe(true);
  });

  it("returns null for undefined and for a non-array players_on_field", () => {
    expect(personnelForPlay(undefined, view)).toBeNull();
    expect(personnelForPlay("00-0037106", view)).toBeNull();
    expect(personnelForPlay(22, view)).toBeNull();
  });

  it("keeps an empty array an empty match, never a null", () => {
    const result = personnelForPlay([], view);

    expect(result).not.toBeNull();
    if (result === null) return;
    // A recorded empty is a recorded empty, and it is still not "we did not record this".
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
    expect(result.blankIds).toBe(0);
  });

  it("returns the matched roster rows with roster_level still on them", () => {
    const result = personnelForPlay([ON_FIELD_2024_A, ON_FIELD_2024_B], view);

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.matched).toHaveLength(3);
    expect(result.unmatched).toHaveLength(0);
    expect(result.matched.filter((record) => record.roster_level === "season")).toHaveLength(2);
    expect(result.matched.filter((record) => record.roster_level === "weekly")).toHaveLength(1);
  });

  it("returns an unmatched id list for ids that are not in the index", () => {
    const result = personnelForPlay([ON_FIELD_2024_A, "00-0000000", "00-0000001"], view);

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.unmatched).toEqual(["00-0000000", "00-0000001"]);
    // ON_FIELD_2024_A carries a season-level and a weekly row in this fixture,
    // so one matched id legitimately produces two roster records.
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map((record) => record.roster_level).sort()).toEqual(["season", "weekly"]);
    expect(result.matched.every((record) => record.gsis_id === ON_FIELD_2024_A)).toBe(true);
  });

  it("refuses a blank id inside the array instead of filling in a guess", () => {
    const result = personnelForPlay([ON_FIELD_2024_A, "", "   "], view);

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.blankIds).toBe(2);
    // A blank never becomes an unmatched id, and never becomes a matched player.
    expect(result.unmatched).toHaveLength(0);
    // Two roster records, not one: the matched id has a season and a weekly row.
    expect(result.matched).toHaveLength(2);
    expect(result.matched.every((record) => record.gsis_id === ON_FIELD_2024_A)).toBe(true);
    expect(result.matched.some((record) => record.gsis_id.trim() === "")).toBe(false);
  });

  it("reports an id as ambiguous when its season-level rows collide, and still returns them all", () => {
    const collided = indexRosters([
      rosterRow({ season: 2024, roster_level: "season", gsis_id: ON_FIELD_2024_A, team: "TEN" }),
      rosterRow({ season: 2024, roster_level: "season", gsis_id: ON_FIELD_2024_A, team: "CHI" }),
    ]);
    const result = personnelForPlay([ON_FIELD_2024_A], indexForSeason(collided, 2024));

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.ambiguousIds).toEqual([ON_FIELD_2024_A]);
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map((record) => record.team).sort()).toEqual(["CHI", "TEN"]);
  });

  it("does not match a gsis id that only exists in another season", () => {
    const result = personnelForPlay([ON_FIELD_2024_A], indexForSeason(index, 2023));
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.unmatched).toEqual([ON_FIELD_2024_A]);
    expect(result.matched).toHaveLength(0);
  });
});

describe("players_on_field id format", () => {
  it("tells a gsis id from a raw jersey number, because the encoding changes by season", () => {
    expect(playersOnFieldIdFormat(ON_FIELD_2024_A)).toBe("gsis_id");
    expect(playersOnFieldIdFormat("00-0037106")).toBe("gsis_id");
    // Real values observed in participation-2018..2022.
    expect(playersOnFieldIdFormat("44987")).toBe("numeric");
    expect(playersOnFieldIdFormat("21213")).toBe("numeric");
    expect(playersOnFieldIdFormat("00-000409")).toBe("unknown");
    expect(playersOnFieldIdFormat("")).toBe("unknown");
  });

  it("does not let a jersey number resolve against a gsis roster", () => {
    const index = indexRosters([
      rosterRow({ season: 2018, roster_level: "season", gsis_id: DAWSON, pfr_id: WISNIEWSKI_PFR }),
    ]);
    const view = indexForSeason(index, 2018);
    const result = personnelForPlay(["44987", "46263"], view);

    expect(result).not.toBeNull();
    if (result === null) return;
    // The 2018-2022 encoding is a jersey number, so these are unmatched ids, not players.
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toEqual(["44987", "46263"]);
  });
});

describe("seasonFromGameId", () => {
  it("reads the season off the game id because participation has no season column", () => {
    expect(seasonFromGameId("2024_01_TEN_CHI")).toBe(2024);
    expect(seasonFromGameId("2018_17_ATL_PHI")).toBe(2018);
    expect(seasonFromGameId("not-a-game-id")).toBeNull();
    expect(seasonFromGameId("24_01_TEN_CHI")).toBeNull();
  });
});

describe("snaps to rosters on pfr_player_id and season", () => {
  const rosterIndex = indexRosters([
    rosterRow({ season: 2018, pfr_id: WISNIEWSKI_PFR, team: "PHI", full_name: "Stefen Wisniewski" }),
  ]);
  const pfrIndex = indexRosterByPfrId(rosterIndex);

  it("matches a snap row and hands back the roster gsis_id", () => {
    const decision = parseSnapRow(snapRow());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;

    const joined = joinSnapToRoster(decision.row, pfrIndex);
    expect(joined.status).toBe("matched");
    expect(joined.gsis_id).toBe(DAWSON);
    expect(joined.candidateGsisIds).toEqual([DAWSON]);
  });

  it("returns a snap with no roster match as unmatched, with no gsis_id", () => {
    const decision = parseSnapRow(snapRow({ pfr_player_id: "NobodyXX99" }));
    if (!decision.ok) return;

    const joined = joinSnapToRoster(decision.row, pfrIndex);
    expect(joined.status).toBe("unmatched");
    // Not dropped, and never handed a synthesised gsis_id.
    expect(joined.roster).toHaveLength(0);
    expect(joined.gsis_id).toBeNull();
    expect(joined.candidateGsisIds).toHaveLength(0);
  });

  it("does not match on pfr id alone when the season is different", () => {
    const decision = parseSnapRow(snapRow({ season: 2019 }));
    if (!decision.ok) return;
    expect(joinSnapToRoster(decision.row, pfrIndex).status).toBe("unmatched");
  });

  it("refuses a blank pfr_player_id rather than joining on it", () => {
    for (const blank of ["", "   ", null, undefined]) {
      const decision = parseSnapRow(snapRow({ pfr_player_id: blank }));
      expect(decision.ok).toBe(false);
      if (!decision.ok) expect(decision.reason).toBe("blank_pfr_player_id");
    }
    expect(pfrKey(2018, "")).toBeNull();
    expect(pfrKey(2018, "  ")).toBeNull();
  });

  it("reports a pfr id claimed by two gsis ids as ambiguous and picks neither", () => {
    const collided = indexRosters([
      rosterRow({ season: 2018, pfr_id: WISNIEWSKI_PFR, gsis_id: DAWSON, team: "PHI" }),
      rosterRow({ season: 2018, pfr_id: WISNIEWSKI_PFR, gsis_id: "00-0004092", team: "NYJ" }),
    ]);
    const collidedPfr = indexRosterByPfrId(collided);
    expect(collidedPfr.ambiguousKeys).toBe(1);

    const decision = parseSnapRow(snapRow());
    if (!decision.ok) return;
    const joined = joinSnapToRoster(decision.row, collidedPfr);
    expect(joined.status).toBe("matched_ambiguous");
    expect(joined.gsis_id).toBeNull();
    expect(joined.candidateGsisIds).toHaveLength(2);
    expect(joined.candidateGsisIds).toContain(DAWSON);
    expect(joined.candidateGsisIds).toContain("00-0004092");
  });

  it("counts roster rows whose pfr_id is blank instead of indexing them", () => {
    const withBlanks = indexRosters([
      rosterRow({ season: 2018, pfr_id: null }),
      rosterRow({ season: 2018, pfr_id: "  " }),
      rosterRow({ season: 2018, pfr_id: WISNIEWSKI_PFR }),
    ]);
    const built = indexRosterByPfrId(withBlanks);
    expect(built.blankPfrRows).toBe(2);
    expect(built.byKey.size).toBe(1);
  });
});

describe("contracts to rosters on gsis_id", () => {
  const rosterIndex = indexRosters([
    rosterRow({ season: 2018, roster_level: "season", gsis_id: BURROW, full_name: "Joe Burrow" }),
    rosterRow({ season: 2023, roster_level: "season", gsis_id: BURROW, full_name: "Joe Burrow" }),
  ]);
  const identityIndex = indexContractIdentities(rosterIndex);

  it("matches a contract to every season the gsis id appears in", () => {
    const decision = parseContractRow({ player: "Joe Burrow", team: "Bengals", gsis_id: BURROW, apy: 55 });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;

    const joined = joinContractToRoster(decision.row, identityIndex);
    expect(joined.status).toBe("matched");
    expect([...joined.rosterKeys].sort()).toEqual(["2018|" + BURROW, "2023|" + BURROW]);
    expect(joined.ambiguous).toBe(false);
  });

  it("leaves an unmatched contract unmatched and with no roster keys", () => {
    const decision = parseContractRow({ player: "Nobody", gsis_id: "00-0099999" });
    if (!decision.ok) return;

    const joined = joinContractToRoster(decision.row, identityIndex);
    expect(joined.status).toBe("unmatched");
    expect(joined.identity).toBeNull();
    expect(joined.rosterKeys).toHaveLength(0);
  });

  it("flags a gsis id that carries two full names as ambiguous", () => {
    const conflicted = indexContractIdentities(
      indexRosters([
        rosterRow({ season: 2018, roster_level: "season", gsis_id: BURROW, full_name: "Joe Burrow" }),
        rosterRow({ season: 2019, roster_level: "season", gsis_id: BURROW, full_name: "Joe Burrow Jr" }),
      ]),
    );
    expect(conflicted.ambiguousIds).toBe(1);

    const decision = parseContractRow({ player: "Joe Burrow", gsis_id: BURROW });
    if (!decision.ok) return;
    const joined = joinContractToRoster(decision.row, conflicted);
    expect(joined.status).toBe("matched");
    expect(joined.ambiguous).toBe(true);
    expect([...joined.names].sort()).toEqual(["Joe Burrow", "Joe Burrow Jr"]);
  });

  it("refuses a contract with a blank gsis_id", () => {
    for (const blank of ["", "   ", null, undefined]) {
      const decision = parseContractRow({ player: "Nobody", gsis_id: blank });
      expect(decision.ok).toBe(false);
      if (!decision.ok) expect(decision.reason).toBe("blank_gsis_id");
    }
  });
});

describe("join counting", () => {
  it("divides matched by eligible, where eligible excludes the blank keys", () => {
    const counter = new JoinCounter();
    counter.recordMatched(false);
    counter.recordMatched(true);
    counter.recordUnmatched();
    counter.recordBlankKey();

    const counts = counter.counts();
    expect(counts.inputRows).toBe(4);
    expect(counts.blankKey).toBe(1);
    expect(counts.eligible).toBe(3);
    expect(counts.matched).toBe(2);
    expect(counts.unmatched).toBe(1);
    expect(counts.ambiguous).toBe(1);
    expect(counts.matchRate).toBeCloseTo(2 / 3, 12);
  });

  it("reports a null match rate rather than zero when nothing was eligible", () => {
    const counter = new JoinCounter();
    counter.recordBlankKey();
    const counts = counter.counts();
    expect(counts.eligible).toBe(0);
    expect(counts.matchRate).toBeNull();
  });
});
