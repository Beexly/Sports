import { describe, it, expect } from "vitest";
import { calculatePickResult, homePerspectiveLine } from "../settlement.js";

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
// R-01 boundary contract: Pick.line is persisted from the CHOSEN side's
// perspective. Settlement converts chosen-side → home-perspective via
// homePerspectiveLine() before calculatePickResult()/computeClv().
// ============================================================

describe("homePerspectiveLine — chosen-side → home-perspective conversion", () => {
  it("SPREAD home pick passes through unchanged (chosen IS home)", () => {
    expect(homePerspectiveLine("SPREAD", "Kansas City Chiefs -3.5", -3.5, "Kansas City Chiefs")).toBe(-3.5);
    expect(homePerspectiveLine("SPREAD", "Kansas City Chiefs +2.5", 2.5, "Kansas City Chiefs")).toBe(2.5);
  });

  it("SPREAD away pick is negated (away line = −homeLine)", () => {
    // Away favorite laying 3.5 → home perspective is +3.5
    expect(homePerspectiveLine("SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs")).toBe(3.5);
    // Away dog getting 3.5 → home perspective is -3.5
    expect(homePerspectiveLine("SPREAD", "Denver Broncos +3.5", 3.5, "Kansas City Chiefs")).toBe(-3.5);
  });

  it("TOTAL passes through (no team perspective)", () => {
    expect(homePerspectiveLine("TOTAL", "OVER 48.5", 48.5, "Kansas City Chiefs")).toBe(48.5);
    expect(homePerspectiveLine("TOTAL", "UNDER 48.5", 48.5, "Kansas City Chiefs")).toBe(48.5);
  });

  it("MONEYLINE passes through (line is the chosen side's American price)", () => {
    expect(homePerspectiveLine("MONEYLINE", "Denver Broncos ML (-150)", -150, "Kansas City Chiefs")).toBe(-150);
    expect(homePerspectiveLine("MONEYLINE", "Kansas City Chiefs ML (+130)", 130, "Kansas City Chiefs")).toBe(130);
  });
});

describe("R-01 live-repro regression — settlement through the boundary conversion", () => {
  // Settles a pick exactly the way the worker does post-fix: the persisted
  // chosen-side Pick.line is converted with homePerspectiveLine() before
  // calculatePickResult(). Mirrors workers/data-refresh settleResults().
  function settleAsWorker(
    pickType: "SPREAD" | "MONEYLINE" | "TOTAL",
    selection: string,
    persistedChosenSideLine: number,
    homeTeam: string,
    homeScore: number,
    awayScore: number
  ) {
    return calculatePickResult(
      pickType,
      selection,
      homePerspectiveLine(pickType, selection, persistedChosenSideLine, homeTeam),
      homeTeam,
      homeScore,
      awayScore,
      NFL
    );
  }

  // THE live repro (LAUNCH_READINESS B-01): away-favored pick persisted
  // line=-3.5 (chosen-perspective), away loses by 1-2 → must grade LOSS.
  // Pre-fix, feeding the chosen-side -3.5 straight in graded this WIN.
  it("away favorite -3.5 that loses by 1 grades LOSS (live repro)", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs", 21, 20)
    ).toBe("LOSS");
  });

  it("away favorite -3.5 that loses by 2 grades LOSS (live repro)", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs", 22, 20)
    ).toBe("LOSS");
  });

  it("away favorite -3.5 that wins by 4 grades WIN (covers)", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs", 17, 21)
    ).toBe("WIN");
  });

  it("away favorite -3.5 that wins by 3 grades LOSS (fails to cover)", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs", 17, 20)
    ).toBe("LOSS");
  });

  it("away favorite -3 that wins by exactly 3 grades PUSH", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos -3", -3, "Kansas City Chiefs", 17, 20)
    ).toBe("PUSH");
  });

  it("home favorite -3.5 is unaffected by the conversion (wins by 7 → WIN)", () => {
    expect(
      settleAsWorker("SPREAD", "Kansas City Chiefs -3.5", -3.5, "Kansas City Chiefs", 21, 14)
    ).toBe("WIN");
  });

  it("home favorite -3.5 that wins by 3 grades LOSS (fails to cover)", () => {
    expect(
      settleAsWorker("SPREAD", "Kansas City Chiefs -3.5", -3.5, "Kansas City Chiefs", 17, 14)
    ).toBe("LOSS");
  });

  it("away dog +3.5 that loses by 3 grades WIN (covers)", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos +3.5", 3.5, "Kansas City Chiefs", 24, 21)
    ).toBe("WIN");
  });

  it("away dog +3.5 that loses by 4 grades LOSS", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos +3.5", 3.5, "Kansas City Chiefs", 24, 20)
    ).toBe("LOSS");
  });

  it("away dog +3 that loses by exactly 3 grades PUSH", () => {
    expect(
      settleAsWorker("SPREAD", "Denver Broncos +3", 3, "Kansas City Chiefs", 24, 21)
    ).toBe("PUSH");
  });

  it("chosen-side away favorite WITHOUT the conversion reproduces the bug", () => {
    // Documents the defect this contract fixes: feeding the persisted
    // chosen-side line straight into calculatePickResult inverts the grade.
    const wrong = calculatePickResult(
      "SPREAD", "Denver Broncos -3.5", -3.5, "Kansas City Chiefs", 21, 20, NFL
    );
    expect(wrong).toBe("WIN"); // the corrupt grade the boundary fix prevents
  });
});
