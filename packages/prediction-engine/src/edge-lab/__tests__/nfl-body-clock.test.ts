/**
 * Body-clock features: the classic case is a Pacific team at an Eastern 1 PM
 * kickoff (+3h early on the body clock, flag=1). Everything derives from
 * schedule facts knowable months ahead, so the as-of audit must stay clean;
 * unknown team abbreviations are skipped, never guessed.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import {
  bodyClockShiftHours,
  buildBodyClockFeatureRows,
  NFL_TEAM_UTC_OFFSET,
} from "../features/nfl-body-clock.js";

function game(over: Partial<GameRow> & { gameId: string }): GameRow {
  return {
    sport: "nfl",
    season: 2021,
    week: 5,
    startTime: "2021-10-10T17:00:00.000Z", // 1:00 PM ET standard time
    homeTeam: "NE",
    awayTeam: "SEA",
    homeScore: 24,
    awayScore: 20,
    closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
    ...over,
  };
}

describe("bodyClockShiftHours", () => {
  it("Pacific team at an Eastern venue kicks off +3 body-clock hours early", () => {
    expect(bodyClockShiftHours(NFL_TEAM_UTC_OFFSET["SEA"]!, NFL_TEAM_UTC_OFFSET["NE"]!)).toBe(3);
  });
  it("Eastern team at a Pacific venue plays -3 (later than body clock)", () => {
    expect(bodyClockShiftHours(NFL_TEAM_UTC_OFFSET["NE"]!, NFL_TEAM_UTC_OFFSET["SEA"]!)).toBe(-3);
  });
  it("same zone is 0", () => {
    expect(bodyClockShiftHours(-5, -5)).toBe(0);
  });
});

describe("buildBodyClockFeatureRows", () => {
  it("flags the classic away-early-west spot: SEA at NE, 1 PM ET", () => {
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildBodyClockFeatureRows([game({ gameId: "g1" })], store);
    expect(rows).toHaveLength(1);
    const f = rows[0]!.features;
    expect(f.get("clock:home_shift_h")).toBe(0);
    expect(f.get("clock:away_shift_h")).toBe(3);
    expect(f.get("clock:shift_diff")).toBe(-3);
    expect(f.get("clock:away_early_west_flag")).toBe(1);
    expect(skipped.unknownTeam).toBe(0);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("no flag for the same matchup at a late-afternoon kickoff (4:25 PM ET)", () => {
    const store = new AsOfFeatureStore();
    const { rows } = buildBodyClockFeatureRows(
      [game({ gameId: "g2", startTime: "2021-10-10T21:25:00.000Z" })],
      store,
    );
    expect(rows[0]!.features.get("clock:away_shift_h")).toBe(3);
    expect(rows[0]!.features.get("clock:away_early_west_flag")).toBe(0);
  });

  it("same-zone game: all shifts zero, no flag", () => {
    const store = new AsOfFeatureStore();
    const { rows } = buildBodyClockFeatureRows(
      [game({ gameId: "g3", homeTeam: "PHI", awayTeam: "NYG" })],
      store,
    );
    const f = rows[0]!.features;
    expect(f.get("clock:away_shift_h")).toBe(0);
    expect(f.get("clock:shift_diff")).toBe(0);
    expect(f.get("clock:away_early_west_flag")).toBe(0);
  });

  it("skips an unknown team abbreviation rather than guessing a zone", () => {
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildBodyClockFeatureRows(
      [game({ gameId: "g4", awayTeam: "XXX" })],
      store,
    );
    expect(rows).toHaveLength(0);
    expect(skipped.unknownTeam).toBe(1);
  });

  it("standard honest-denominator skips: no scores, tie, no odds", () => {
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildBodyClockFeatureRows(
      [
        game({ gameId: "ns", homeScore: null, awayScore: null }),
        game({ gameId: "ti", homeScore: 21, awayScore: 21 }),
        game({ gameId: "no", closing: { spreadHome: null, total: null, moneylineHomeDecimal: null, moneylineAwayDecimal: null } }),
      ],
      store,
    );
    expect(rows).toHaveLength(0);
    expect(skipped.noScores).toBe(1);
    expect(skipped.tie).toBe(1);
    expect(skipped.noOdds).toBe(1);
  });

  it("every current franchise abbreviation resolves to a zone (map completeness)", () => {
    const teams = [
      "BUF","MIA","NE","NYJ","NYG","PHI","WAS","BAL","CIN","CLE","PIT","ATL","CAR","JAX",
      "TB","DET","IND","CHI","GB","MIN","DAL","HOU","TEN","NO","KC","DEN","ARI","SEA","SF",
      "LA","LAC","LV",
    ];
    for (const t of teams) {
      expect(NFL_TEAM_UTC_OFFSET[t], `missing zone for ${t}`).toBeDefined();
    }
  });
});
