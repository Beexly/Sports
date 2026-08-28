import { describe, expect, it } from "vitest";
import { linesInSeasons, parseNflverseGameLines, fetchNflverseGameLines } from "../nflverse-game-lines.js";

const FIXTURE = `game_id,season,week,home_team,away_team,gameday,spread_line,total_line,home_moneyline,away_moneyline,home_spread_odds,away_spread_odds
2018_01_ATL_PHI,2018,1,PHI,ATL,2018-09-06,-1.5,44.5,-120,100,-110,-110
2017_01_OLD_ZZZ,2017,1,NE,KC,2017-09-07,-7,48,-300,250,-110,-110
2025_18_BUF_KC,2025,18,KC,BUF,2025-01-05,-3,47.5,-150,130,-105,-115
`;

describe("parseNflverseGameLines — 2018–2025 history (nflverse games.csv)", () => {
  it("parses spread, total, and moneylines", () => {
    const rows = parseNflverseGameLines(FIXTURE);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.spreadLine).toBe(-1.5);
    expect(rows[0]?.totalLine).toBe(44.5);
    expect(rows[0]?.homeMoneyline).toBe(-120);
  });
  it("filters the 2018–2025 window the prior audit called missing", () => {
    const win = linesInSeasons(parseNflverseGameLines(FIXTURE), 2018, 2025);
    expect(win.map((r) => r.season).sort()).toEqual([2018, 2025]);
  });
  it("fetchNflverseGameLines uses injectable fetchText and default 2018–2025 window", async () => {
    const rows = await fetchNflverseGameLines({
      fetchText: async (key) => {
        expect(key).toBe("schedules");
        return FIXTURE;
      },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.season >= 2018 && r.season <= 2025)).toBe(true);
  });
});
