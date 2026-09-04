import { describe, it, expect } from "vitest";
import {
  assemblePreGameFeatures,
  buildHistoricalOddsInput,
  replayAndSettleGame,
  DEFAULT_REPLAY_SPORT,
  type RawScheduleRow,
} from "../historical-replay.js";

// Same settled fixture shape as historical-replay.test.ts: KC home, favored by 3
// (home-perspective spread_line = -3), total 47, KC ML -150 / DET +130, final 27-20.
function baseRow(): RawScheduleRow {
  return {
    gameKey: "2023_05_DET_KC",
    season: 2023,
    week: 5,
    gameType: "REG",
    homeTeam: "KC",
    awayTeam: "DET",
    commenceTime: "2023-10-08T17:00:00.000Z",
    spreadLine: -3,
    totalLine: 47,
    homeMoneyline: -150,
    awayMoneyline: 130,
    restHome: 7,
    restAway: 7,
    homeScore: 27,
    awayScore: 20,
    result: 7,
  };
}

function preGameRow(): RawScheduleRow {
  return { ...baseRow(), homeScore: null, awayScore: null, result: null };
}

// ============================================================
// Dispatch T1 (docs/ops/OVERNIGHT_NCAAF_2026-09-04.md §5 T1):
// optional sportKey, default americanfootball_nfl. The IMPORTANT half of the
// spec is the default half — every existing caller must stay byte-identical.
// ============================================================
describe("historical-replay sportKey parameterization", () => {
  it("the default sport constant is the exact pre-T1 NFL literal", () => {
    expect(DEFAULT_REPLAY_SPORT).toBe("americanfootball_nfl");
  });

  it("default and explicit-NFL calls produce the IDENTICAL odds input (sport label included)", () => {
    const features = assemblePreGameFeatures(preGameRow());
    const plain = buildHistoricalOddsInput(features);
    const explicit = buildHistoricalOddsInput(features, { sportKey: "americanfootball_nfl" });
    expect(JSON.parse(JSON.stringify(plain))).toEqual(JSON.parse(JSON.stringify(explicit)));
    expect(plain.sport).toBe("americanfootball_nfl");
  });

  it("an NCAAF sportKey reaches the scoring input as the NCAAF sport", () => {
    const features = assemblePreGameFeatures(preGameRow());
    const input = buildHistoricalOddsInput(features, { sportKey: "americanfootball_ncaaf" });
    expect(input.sport).toBe("americanfootball_ncaaf");
  });

  it("replaying one row with sportKey americanfootball_ncaaf settles picks end to end", () => {
    const settled = replayAndSettleGame(baseRow(), { sportKey: "americanfootball_ncaaf" });
    expect(settled.length).toBeGreaterThan(0);
    for (const p of settled) {
      expect(["WIN", "LOSS", "PUSH"]).toContain(p.result);
    }
    // KC -3, final margin 7 → every spread pick on this fixture wins, settled
    // under the NCAAF sport key (non-soccer grading: margin vs line, pushes allowed).
    const spreadPicks = settled.filter((p) => p.pickType === "SPREAD");
    expect(spreadPicks.length).toBeGreaterThan(0);
    expect(spreadPicks.every((p) => p.result === "WIN")).toBe(true);
  });

  it("threading a sportKey does NOT fork the frozen model: NCAAF replay settles object-identical to NFL replay", () => {
    const row = baseRow();
    const nfl = replayAndSettleGame(row);
    const ncaaf = replayAndSettleGame(row, { sportKey: "americanfootball_ncaaf" });
    expect(nfl.length).toBe(ncaaf.length);
    expect(JSON.parse(JSON.stringify(nfl))).toEqual(JSON.parse(JSON.stringify(ncaaf)));
  });

  it("the lookahead guard is untouched: a score on the pre-game object still throws LookaheadLeakError", async () => {
    const { assemblePreGameFeatures: assemble, LookaheadLeakError } = await import(
      "../historical-replay.js"
    );
    expect(() => assemble(baseRow())).toThrow(LookaheadLeakError);
  });
});
