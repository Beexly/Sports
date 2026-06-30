import { describe, it, expect } from "vitest";
import { calculatePickResult, selectGradingLine } from "../settlement.js";

const NFL = "americanfootball_nfl";
const MLS = "soccer_usa_mls";

// ============================================================
// SPREAD settlement
// ============================================================

describe("calculatePickResult — SPREAD", () => {
  it("home covers (home -3.5, wins by 7)", () => {
    // homeMargin=7, line=-3.5, homeCoverMargin=3.5 > 0 → home WIN
    expect(calculatePickResult("SPREAD", "Kansas City Chiefs", -3.5, "Kansas City Chiefs", 21, 14, NFL)).toBe("WIN");
  });

  it("home fails to cover (home -3.5, wins by only 3)", () => {
    // homeMargin=3, line=-3.5, homeCoverMargin=-0.5 < 0 → home LOSS
    expect(calculatePickResult("SPREAD", "Kansas City Chiefs", -3.5, "Kansas City Chiefs", 17, 14, NFL)).toBe("LOSS");
  });

  it("away covers when home doesn't (home -3.5, home wins by 3)", () => {
    // away pick: homeCoverMargin=-0.5 < 0 → away WIN
    expect(calculatePickResult("SPREAD", "Denver Broncos", -3.5, "Kansas City Chiefs", 17, 14, NFL)).toBe("WIN");
  });

  it("away fails to cover (home -3.5, home wins by 7)", () => {
    // away pick: homeCoverMargin=3.5 > 0 → away LOSS
    expect(calculatePickResult("SPREAD", "Denver Broncos", -3.5, "Kansas City Chiefs", 21, 14, NFL)).toBe("LOSS");
  });

  it("exact push (home -7, wins by exactly 7)", () => {
    // homeMargin=7, line=-7, homeCoverMargin=0 → PUSH
    expect(calculatePickResult("SPREAD", "Kansas City Chiefs", -7, "Kansas City Chiefs", 28, 21, NFL)).toBe("PUSH");
  });

  it("exact push for away pick too", () => {
    expect(calculatePickResult("SPREAD", "Denver Broncos", -7, "Kansas City Chiefs", 28, 21, NFL)).toBe("PUSH");
  });

  it("home underdog covers (+3.5, loses by 2)", () => {
    // homeMargin=-2, line=3.5, homeCoverMargin=1.5 > 0 → home WIN
    expect(calculatePickResult("SPREAD", "Denver Broncos", 3.5, "Denver Broncos", 14, 16, NFL)).toBe("WIN");
  });

  it("home underdog fails to cover (+3.5, loses by 7)", () => {
    // homeMargin=-7, line=3.5, homeCoverMargin=-3.5 < 0 → home LOSS
    expect(calculatePickResult("SPREAD", "Denver Broncos", 3.5, "Denver Broncos", 14, 21, NFL)).toBe("LOSS");
  });

  it("home wins outright as underdog (covers)", () => {
    // homeMargin=3, line=3.5, homeCoverMargin=6.5 > 0 → home WIN
    expect(calculatePickResult("SPREAD", "Denver Broncos", 3.5, "Denver Broncos", 17, 14, NFL)).toBe("WIN");
  });

  it("home loses and away covers (away favored)", () => {
    // Away team is -7 → home line = +7 (line=7)
    // homeMargin=-3, line=7, homeCoverMargin=4 > 0 → home (underdog) WIN
    expect(calculatePickResult("SPREAD", "Home Team", 7, "Home Team", 14, 17, NFL)).toBe("WIN");
  });
});

// ============================================================
// MONEYLINE settlement
// ============================================================

describe("calculatePickResult — MONEYLINE", () => {
  it("home ML win", () => {
    expect(calculatePickResult("MONEYLINE", "Chiefs", -3.5, "Chiefs", 21, 14, NFL)).toBe("WIN");
  });

  it("home ML loss", () => {
    expect(calculatePickResult("MONEYLINE", "Chiefs", -3.5, "Chiefs", 14, 21, NFL)).toBe("LOSS");
  });

  it("away ML win", () => {
    expect(calculatePickResult("MONEYLINE", "Broncos", -3.5, "Chiefs", 14, 21, NFL)).toBe("WIN");
  });

  it("away ML loss", () => {
    expect(calculatePickResult("MONEYLINE", "Broncos", -3.5, "Chiefs", 21, 14, NFL)).toBe("LOSS");
  });

  it("non-soccer tie is PUSH for home ML", () => {
    // NFL overtime tie (very rare but possible)
    expect(calculatePickResult("MONEYLINE", "Chiefs", 0, "Chiefs", 17, 17, NFL)).toBe("PUSH");
  });

  it("non-soccer tie is PUSH for away ML", () => {
    expect(calculatePickResult("MONEYLINE", "Broncos", 0, "Chiefs", 17, 17, NFL)).toBe("PUSH");
  });

  it("soccer draw is LOSS for home ML bet (3-way market)", () => {
    expect(calculatePickResult("MONEYLINE", "LA Galaxy", 0, "LA Galaxy", 1, 1, MLS)).toBe("LOSS");
  });

  it("soccer draw is LOSS for away ML bet (3-way market)", () => {
    expect(calculatePickResult("MONEYLINE", "Toronto FC", 0, "LA Galaxy", 1, 1, MLS)).toBe("LOSS");
  });

  it("soccer home win is WIN", () => {
    expect(calculatePickResult("MONEYLINE", "LA Galaxy", 0, "LA Galaxy", 2, 1, MLS)).toBe("WIN");
  });

  it("soccer away win is WIN for away pick", () => {
    expect(calculatePickResult("MONEYLINE", "Toronto FC", 0, "LA Galaxy", 1, 2, MLS)).toBe("WIN");
  });
});

// ============================================================
// TOTAL settlement
// ============================================================

describe("calculatePickResult — TOTAL", () => {
  it("over hits", () => {
    expect(calculatePickResult("TOTAL", "OVER", 47.5, "Chiefs", 28, 21, NFL)).toBe("WIN");
  });

  it("over misses", () => {
    expect(calculatePickResult("TOTAL", "OVER", 47.5, "Chiefs", 17, 14, NFL)).toBe("LOSS");
  });

  it("under hits", () => {
    expect(calculatePickResult("TOTAL", "UNDER", 47.5, "Chiefs", 17, 14, NFL)).toBe("WIN");
  });

  it("under misses", () => {
    expect(calculatePickResult("TOTAL", "UNDER", 47.5, "Chiefs", 28, 21, NFL)).toBe("LOSS");
  });

  it("exact total is PUSH", () => {
    expect(calculatePickResult("TOTAL", "OVER", 49, "Chiefs", 28, 21, NFL)).toBe("PUSH");
  });

  it("exact total UNDER is also PUSH", () => {
    expect(calculatePickResult("TOTAL", "UNDER", 49, "Chiefs", 28, 21, NFL)).toBe("PUSH");
  });
});

// ============================================================
// Formula correctness proof: home and away picks must be inverse
// (except on exact push)
// ============================================================

describe("calculatePickResult — home/away symmetry", () => {
  const cases: Array<[string, number, number, number]> = [
    ["home -3.5, wins by 7", -3.5, 21, 14],
    ["home -3.5, wins by 3", -3.5, 17, 14],
    ["home -7, wins by 7 (push)", -7, 28, 21],
    ["home +3.5, loses by 2", 3.5, 14, 16],
    ["home +3.5, loses by 7", 3.5, 14, 21],
  ];

  for (const [label, line, homeScore, awayScore] of cases) {
    it(`SPREAD home vs away must be inverse or both PUSH: ${label}`, () => {
      const homeResult = calculatePickResult("SPREAD", "Home Team", line, "Home Team", homeScore, awayScore, NFL);
      const awayResult = calculatePickResult("SPREAD", "Away Team", line, "Home Team", homeScore, awayScore, NFL);
      if (homeResult === "PUSH") {
        expect(awayResult).toBe("PUSH");
      } else {
        expect(awayResult).toBe(homeResult === "WIN" ? "LOSS" : "WIN");
      }
    });
  }
});

// ============================================================
// Substring-collision regression: an away team whose name CONTAINS the home
// team name (e.g. home "Jets" / away "Winnipeg Jets") must not be mis-settled
// as a home pick. Side is derived with startsWith(homeTeam) — matching how
// scoring builds the selection (`${chosenTeam} …`) and how clv-capture grades —
// so the two can never disagree. (Regression for the `.includes` bug.)
// ============================================================

describe("calculatePickResult — away name contains home name (no mis-settle)", () => {
  const HOME = "Jets"; // NHL: home NY Jets-style short name, away "Winnipeg Jets"
  const AWAY_SEL_ML = "Winnipeg Jets ML (-120)";
  const AWAY_SEL_SPREAD = "Winnipeg Jets -1.5";
  const HOME_SEL_ML = "Jets ML (+105)";

  it("away ML pick wins when the away team (whose name contains 'Jets') wins", () => {
    // away scored more → away won; away pick → WIN. With `.includes` this was a LOSS.
    expect(calculatePickResult("MONEYLINE", AWAY_SEL_ML, 0, HOME, 2, 4, "icehockey_nhl")).toBe("WIN");
  });

  it("away ML pick loses when the away team loses", () => {
    expect(calculatePickResult("MONEYLINE", AWAY_SEL_ML, 0, HOME, 4, 2, "icehockey_nhl")).toBe("LOSS");
  });

  it("home ML pick still settles correctly in the same matchup", () => {
    expect(calculatePickResult("MONEYLINE", HOME_SEL_ML, 0, HOME, 4, 2, "icehockey_nhl")).toBe("WIN");
  });

  it("away SPREAD pick (away -1.5, home line +1.5) loses when away wins by only 1", () => {
    // home line = +1.5; homeMargin = -1; homeCoverMargin = -1 + 1.5 = 0.5 > 0 → home covered
    // away pick → !homeCovered → LOSS. With `.includes` this flipped to WIN.
    expect(calculatePickResult("SPREAD", AWAY_SEL_SPREAD, 1.5, HOME, 2, 3, "icehockey_nhl")).toBe("LOSS");
  });
});

// ============================================================
// selectGradingLine — the no-drift rule
// ============================================================

describe("selectGradingLine", () => {
  it("returns the locked line when clvLockLine is present", () => {
    // Grade against the published lock, not the (drifted) live line.
    expect(selectGradingLine({ clvLockLine: -3.5, line: -2.5 })).toBe(-3.5);
  });

  it("falls back to line when clvLockLine is null (legacy/unlocked rows)", () => {
    expect(selectGradingLine({ clvLockLine: null, line: 7 })).toBe(7);
  });

  it("honors a genuine clvLockLine of 0 — ?? does NOT fall through on 0", () => {
    // A pick'em spread or even total locks at 0; `??` only falls through on
    // null/undefined, so 0 must be returned, not the (different) live line.
    expect(selectGradingLine({ clvLockLine: 0, line: 1.5 })).toBe(0);
  });
});
