import { describe, it, expect } from "vitest";
import { buildPbpIdentity, buildPlayDesign } from "./play-design";
import type { FtnChartingRow } from "@/lib/nflverse/ftn-charting";

type Row = Record<string, string>;

// One pbp identity record. season_type defaults to REG; tests override to POST.
function pbp(o: Partial<Row>): Row {
  return {
    game_id: "2024_19_KC_BUF",
    play_id: "1",
    posteam: "KC",
    passer_player_id: "00-MAHOMES",
    passer_player_name: "P.Mahomes",
    season_type: "REG",
    ...o,
  };
}

// One charted FTN play. Defaults to a play-action snap so rates are easy to read.
function ftn(o: Partial<FtnChartingRow>): FtnChartingRow {
  return {
    gameId: "2024_19_KC_BUF",
    playId: "1",
    season: 2024,
    week: 1,
    isPlayAction: true,
    isRpo: false,
    isScreenPass: false,
    isMotion: false,
    isNoHuddle: false,
    isQbOutOfPocket: false,
    nBlitzers: 5,
    nPassRushers: 4,
    readThrown: "1",
    ...o,
  };
}

describe("buildPbpIdentity — regular-season scope", () => {
  it("indexes REG plays and drops POST (and any non-REG) plays", () => {
    const map = buildPbpIdentity([
      pbp({ game_id: "G_REG", play_id: "1", season_type: "REG" }),
      pbp({ game_id: "G_POST", play_id: "2", season_type: "POST" }),
      pbp({ game_id: "G_BLANK", play_id: "3", season_type: "" }),
    ]);
    expect(map.has("G_REG:1")).toBe(true);
    expect(map.has("G_POST:2")).toBe(false); // playoff identity never indexed
    expect(map.has("G_BLANK:3")).toBe(false); // missing season_type treated as non-REG
    expect(map.size).toBe(1);
  });
});

describe("buildPlayDesign — POST charted plays drop, REG-only rates", () => {
  // A QB with 2 REG plays (1 play-action) plus 1 POST play (play-action). If POST
  // leaked in, the denominator would be 3 and PA rate 2/3; REG-only it is 2 and 1/2.
  const identity = buildPbpIdentity([
    pbp({ game_id: "G_REG", play_id: "1", season_type: "REG" }),
    pbp({ game_id: "G_REG", play_id: "2", season_type: "REG" }),
    pbp({ game_id: "G_POST", play_id: "9", season_type: "POST" }),
  ]);

  const ftnRows: FtnChartingRow[] = [
    ftn({ gameId: "G_REG", playId: "1", isPlayAction: true }),
    ftn({ gameId: "G_REG", playId: "2", isPlayAction: false }),
    ftn({ gameId: "G_POST", playId: "9", isPlayAction: true }), // playoff snap — must drop
  ];

  // Tiny sample floors so the fixture clears them.
  const { qbs, teams, joined } = buildPlayDesign(ftnRows, identity, 1, 1);

  it("joins only the REG charted plays (POST row finds no identity)", () => {
    expect(joined).toBe(2); // 2 REG joined; the POST FTN row dropped
  });

  it("computes per-QB rates over the regular-season denominator only", () => {
    expect(qbs).toHaveLength(1);
    const qb = qbs[0]!;
    expect(qb.plays).toBe(2); // not 3 — POST excluded
    expect(qb.playActionRate).toBe(0.5); // 1/2, not 2/3
  });

  it("computes per-team rates over the regular-season denominator only", () => {
    expect(teams).toHaveLength(1);
    const team = teams[0]!;
    expect(team.team).toBe("KC");
    expect(team.plays).toBe(2);
    expect(team.playActionRate).toBe(0.5);
  });
});
