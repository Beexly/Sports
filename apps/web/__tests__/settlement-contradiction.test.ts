import { describe, expect, it } from "vitest";
import {
  classifySettledPick,
  expectedResult,
  moneylineTeam,
  sideOf,
  spreadTeam,
  tallyContradictions,
  totalSide,
  type FinalScoreInput,
  type SettledPickInput,
} from "@/lib/ops/settlement-contradiction";

/**
 * Every fixture below is labelled and invented for the test EXCEPT the five
 * marked REAL, which are production rows recorded in ledger C-115. They are
 * reproduced here because a detector for a real defect should be pinned by the
 * real defect: if this file goes green while those five classify as CONSISTENT,
 * the detector is worthless no matter how many synthetic cases it passes.
 */

const final = (over: Partial<FinalScoreInput> = {}): FinalScoreInput => ({
  homeTeamName: "Fixture Home Sox",
  awayTeamName: "Fixture Away Jays",
  homeScore: 5,
  awayScore: 3,
  ...over,
});

const pick = (over: Partial<SettledPickInput> & Pick<SettledPickInput, "pickType">): SettledPickInput => ({
  selection: "OVER 7.0",
  line: 7,
  clvLockLine: null,
  result: "WIN",
  ...over,
});

describe("selection parsing — exact, never fuzzy", () => {
  it("pulls the team out of a moneyline selection with its model-signal suffix", () => {
    expect(moneylineTeam("Alabama Crimson Tide ML (model signal)")).toBe("Alabama Crimson Tide");
    expect(moneylineTeam("Fixture Home Sox ML")).toBe("Fixture Home Sox");
  });

  it("pulls the team out of a spread selection carrying its signed number", () => {
    expect(spreadTeam("Air Force Falcons -29.3")).toBe("Air Force Falcons");
    expect(spreadTeam("Western Kentucky Hilltoppers +2.5")).toBe("Western Kentucky Hilltoppers");
  });

  it("reads the total side off the front, and refuses anything else", () => {
    expect(totalSide("OVER 46.3")).toBe("OVER");
    expect(totalSide("under 9.6")).toBe("UNDER");
    expect(totalSide("Fixture Home Sox -1.5")).toBe("UNKNOWN");
  });

  it("matches a side EXACTLY, and returns UNKNOWN rather than guessing", () => {
    // Containment matching is the defect this detector exists to catch. "LA"
    // inside "atLAnta" is how a pick got bound to the wrong fixture in the first
    // place, so a substring must NOT resolve here.
    expect(sideOf("Fixture Home Sox", final())).toBe("HOME");
    expect(sideOf("Fixture Away Jays", final())).toBe("AWAY");
    expect(sideOf("Sox", final())).toBe("UNKNOWN");
    expect(sideOf("Fixture Home Sox Junior", final())).toBe("UNKNOWN");
    expect(sideOf("", final())).toBe("UNKNOWN");
  });
});

describe("expectedResult — the arithmetic, per market", () => {
  it("grades a moneyline with no line at all", () => {
    const p = pick({ pickType: "MONEYLINE", selection: "Fixture Home Sox ML", line: null });
    expect(expectedResult(p, final({ homeScore: 5, awayScore: 3 }), null)).toBe("WIN");
    expect(expectedResult(p, final({ homeScore: 2, awayScore: 3 }), null)).toBe("LOSS");
  });

  it("refuses to adjudicate a drawn moneyline instead of inventing a side", () => {
    const p = pick({ pickType: "MONEYLINE", selection: "Fixture Home Sox ML", line: null });
    expect(expectedResult(p, final({ homeScore: 1, awayScore: 1 }), null)).toBeNull();
  });

  it("grades a spread from the HOME perspective for either side picked", () => {
    const home = pick({ pickType: "SPREAD", selection: "Fixture Home Sox -1.5", line: -1.5 });
    const away = pick({ pickType: "SPREAD", selection: "Fixture Away Jays -1.5", line: -1.5 });
    // Home wins by 2 against a 1.5 handicap: home covers, away does not.
    expect(expectedResult(home, final({ homeScore: 5, awayScore: 3 }), -1.5)).toBe("WIN");
    expect(expectedResult(away, final({ homeScore: 5, awayScore: 3 }), -1.5)).toBe("LOSS");
  });

  it("returns PUSH on an exact spread landing", () => {
    const p = pick({ pickType: "SPREAD", selection: "Fixture Home Sox -2", line: -2 });
    expect(expectedResult(p, final({ homeScore: 5, awayScore: 3 }), -2)).toBe("PUSH");
  });

  it("grades a total, including the exact landing", () => {
    const over = pick({ pickType: "TOTAL", selection: "OVER 7.0", line: 7 });
    const under = pick({ pickType: "TOTAL", selection: "UNDER 7.0", line: 7 });
    expect(expectedResult(over, final({ homeScore: 5, awayScore: 3 }), 7)).toBe("WIN");
    expect(expectedResult(under, final({ homeScore: 5, awayScore: 3 }), 7)).toBe("LOSS");
    expect(expectedResult(over, final({ homeScore: 4, awayScore: 3 }), 7)).toBe("PUSH");
  });

  it("returns null rather than a verdict when the score is absent", () => {
    const p = pick({ pickType: "TOTAL" });
    expect(expectedResult(p, final({ homeScore: null, awayScore: null }), 7)).toBeNull();
    expect(expectedResult(p, final({ homeScore: 5, awayScore: null }), 7)).toBeNull();
  });
});

describe("classifySettledPick — the three verdicts that matter", () => {
  it("calls an agreeing pick CONSISTENT", () => {
    const p = pick({ pickType: "TOTAL", selection: "OVER 7.0", line: 7, result: "WIN" });
    expect(classifySettledPick(p, final({ homeScore: 5, awayScore: 3 }))).toBe("CONSISTENT");
  });

  it("separates a display divergence (C-143) from actual corruption (C-115)", () => {
    // Right against the line we GRADE on, wrong against the line the card SHOWS.
    // Reporting this as corruption would overstate the corruption by more than
    // half, which is why the classifier tries the lock line before condemning.
    const p = pick({
      pickType: "TOTAL",
      selection: "UNDER 46.3",
      line: 46.25,
      clvLockLine: 53,
      result: "WIN",
    });
    // Real total 52: loses against 46.25, wins against 53.
    expect(classifySettledPick(p, final({ homeScore: 52, awayScore: 0 }))).toBe("GRADED_ON_LOCK_LINE");
  });

  it("calls a pick CONTRADICTS_BOTH when no line saves it", () => {
    const p = pick({
      pickType: "TOTAL",
      selection: "OVER 6.6",
      line: 6.5625,
      clvLockLine: 8.375,
      result: "LOSS",
    });
    // Real total 13 clears both lines, so OVER won under either reading.
    expect(classifySettledPick(p, final({ homeScore: 6, awayScore: 7 }))).toBe("CONTRADICTS_BOTH");
  });

  it("condemns a moneyline immediately, because there is no second line to try", () => {
    const p = pick({
      pickType: "MONEYLINE",
      selection: "Fixture Home Sox ML (model signal)",
      line: null,
      clvLockLine: null,
      result: "WIN",
    });
    expect(classifySettledPick(p, final({ homeScore: 2, awayScore: 9 }))).toBe("CONTRADICTS_BOTH");
  });

  it("treats VOID and PENDING as claims about nothing, not as contradictions", () => {
    // A VOID does not assert a score, so it cannot disagree with one. Getting
    // this wrong would accuse every legitimate postponement of corruption.
    for (const result of ["VOID", "PENDING"]) {
      const p = pick({ pickType: "TOTAL", selection: "OVER 7.0", line: 7, result });
      expect(classifySettledPick(p, final({ homeScore: 1, awayScore: 1 }))).toBe("UNGRADEABLE");
    }
  });

  it("says UNGRADEABLE, never CONTRADICTS_BOTH, when it cannot identify the side", () => {
    // FAIL CLOSED. A false accusation about our own honesty is worse than a
    // missed detection, because it would send someone unpublishing good rows.
    const p = pick({
      pickType: "SPREAD",
      selection: "Some Other Team -1.5",
      line: -1.5,
      result: "WIN",
    });
    expect(classifySettledPick(p, final())).toBe("UNGRADEABLE");
  });
});

describe("the five REAL production rows from ledger C-115", () => {
  /**
   * If the detector cannot classify these, it does not detect the defect it was
   * written for. Scores, lines, selections and stored results are exactly as
   * they sit in production, measured 2026-09-07.
   */
  const cases: readonly {
    id: string;
    pick: SettledPickInput;
    final: FinalScoreInput;
    expected: string;
  }[] = [
    {
      id: "cmtp7olso04ci9t2po0eeh9eo",
      pick: { pickType: "TOTAL", selection: "OVER 83.5", line: 83.5, clvLockLine: 74, result: "WIN" },
      final: {
        homeTeamName: "Arizona State Sun Devils",
        awayTeamName: "Morgan State Bears",
        homeScore: 70,
        awayScore: 7,
      },
      expected: "GRADED_ON_LOCK_LINE",
    },
    {
      id: "cmtpaag0e03uwvxtdedzppu9k",
      pick: { pickType: "TOTAL", selection: "UNDER 46.3", line: 46.25, clvLockLine: 53, result: "WIN" },
      final: {
        homeTeamName: "Sacramento State Hornets",
        awayTeamName: "Mississippi Valley State Delta Devils",
        homeScore: 52,
        awayScore: 0,
      },
      expected: "GRADED_ON_LOCK_LINE",
    },
    {
      id: "cmtp7m2g104iy5gakc5kdrte9",
      pick: { pickType: "TOTAL", selection: "OVER 6.6", line: 6.5625, clvLockLine: 8.375, result: "LOSS" },
      final: {
        homeTeamName: "Seattle Mariners",
        awayTeamName: "Athletics",
        homeScore: 6,
        awayScore: 7,
      },
      expected: "CONTRADICTS_BOTH",
    },
    {
      id: "cmtpi1g740e91qkek2wlbayk7",
      pick: { pickType: "TOTAL", selection: "OVER 7.0", line: 7, clvLockLine: 7.5, result: "LOSS" },
      final: {
        homeTeamName: "Seattle Mariners",
        awayTeamName: "Athletics",
        homeScore: 6,
        awayScore: 7,
      },
      expected: "CONTRADICTS_BOTH",
    },
    {
      id: "cmtp7m2zq04mg5gak7ze8z2mr",
      pick: { pickType: "TOTAL", selection: "UNDER 8.5", line: 8.5, clvLockLine: 8.5, result: "LOSS" },
      final: {
        homeTeamName: "Los Angeles Dodgers",
        awayTeamName: "Washington Nationals",
        homeScore: 5,
        awayScore: 3,
      },
      expected: "CONTRADICTS_BOTH",
    },
  ];

  for (const c of cases) {
    it(`classifies ${c.id} as ${c.expected}`, () => {
      expect(classifySettledPick(c.pick, c.final)).toBe(c.expected);
    });
  }

  it("tallies the five the way the operator surface will read them", () => {
    const tally = tallyContradictions(cases.map((c) => ({ pick: c.pick, final: c.final })));
    expect(tally).toEqual({
      checked: 5,
      consistent: 0,
      contradictsBoth: 3,
      gradedOnLockLine: 2,
      ungradeable: 0,
    });
  });
});
