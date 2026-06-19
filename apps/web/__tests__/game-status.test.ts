/**
 * Game status and timeline utilities — test suite.
 * Covers: phase detection, phase labels, color classes, period labels,
 * clock formatting/parsing, sport metadata, score display, time remaining.
 * Minimum 45 tests.
 */

import { describe, it, expect } from "vitest";
import {
  gamePhaseFromDates,
  gamePhaseLabel,
  gamePhaseColorClass,
  periodLabel,
  formatClock,
  parseClock,
  totalPeriods,
  overtimePeriodNumber,
  isOvertimePeriod,
  sportDisplayName,
  sportEmoji,
  formatScore,
  scoreboardDisplay,
  isHighScoring,
  typicalGameDuration,
  estimatedMinutesRemaining,
  type Sport,
  type GamePhase,
} from "@/lib/sports/game-status";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date("2024-01-15T20:00:00Z").getTime();
const H = 60 * 60 * 1000; // 1 hour in ms
const MIN = 60 * 1000; // 1 minute in ms

// ---------------------------------------------------------------------------
// gamePhaseFromDates
// ---------------------------------------------------------------------------

describe("gamePhaseFromDates", () => {
  it("returns 'pregame' when startTime is 2 hours from now", () => {
    const start = NOW + 2 * H;
    expect(gamePhaseFromDates(start, null, NOW)).toBe("pregame");
  });

  it("returns 'pregame' when startTime is exactly 61 minutes from now", () => {
    const start = NOW + 61 * MIN;
    expect(gamePhaseFromDates(start, null, NOW)).toBe("pregame");
  });

  it("returns 'imminent' when startTime is 30 minutes from now", () => {
    const start = NOW + 30 * MIN;
    expect(gamePhaseFromDates(start, null, NOW)).toBe("imminent");
  });

  it("returns 'imminent' when startTime is exactly 1 minute from now", () => {
    const start = NOW + 1 * MIN;
    expect(gamePhaseFromDates(start, null, NOW)).toBe("imminent");
  });

  it("returns 'live' when startTime is 10 minutes ago, no endedAt", () => {
    const start = NOW - 10 * MIN;
    expect(gamePhaseFromDates(start, null, NOW)).toBe("live");
  });

  it("returns 'live' when startTime is exactly now, no endedAt", () => {
    expect(gamePhaseFromDates(NOW, null, NOW)).toBe("live");
  });

  it("returns 'final' when endedAt is 1 hour ago", () => {
    const start = NOW - 3 * H;
    const ended = NOW - H;
    expect(gamePhaseFromDates(start, ended, NOW)).toBe("final");
  });

  it("returns 'final' when endedAt is exactly now", () => {
    const start = NOW - 3 * H;
    expect(gamePhaseFromDates(start, NOW, NOW)).toBe("final");
  });

  it("works with Date objects as well as numbers", () => {
    const start = new Date(NOW + 2 * H);
    const nowDate = new Date(NOW);
    expect(gamePhaseFromDates(start, null, nowDate)).toBe("pregame");
  });

  it("defaults to 'pregame' when arguments are unusual (future endedAt not in past)", () => {
    // endedAt in the future means 'final' rule won't fire; game hasn't started
    const start = NOW + 2 * H;
    const ended = NOW + 3 * H;
    // endedAt is NOT in the past so rule 1 skipped, start > now+1h → pregame
    expect(gamePhaseFromDates(start, ended, NOW)).toBe("pregame");
  });

  it("uses Date.now() when 'now' param is omitted (smoke test)", () => {
    // 24h in the future — will always be "pregame"
    const start = Date.now() + 24 * H;
    expect(gamePhaseFromDates(start)).toBe("pregame");
  });
});

// ---------------------------------------------------------------------------
// gamePhaseLabel
// ---------------------------------------------------------------------------

describe("gamePhaseLabel", () => {
  const cases: [GamePhase, string][] = [
    ["pregame", "Upcoming"],
    ["imminent", "Starting Soon"],
    ["live", "Live"],
    ["halftime", "Halftime"],
    ["final", "Final"],
    ["postponed", "Postponed"],
    ["cancelled", "Cancelled"],
  ];

  for (const [phase, expected] of cases) {
    it(`maps '${phase}' → '${expected}'`, () => {
      expect(gamePhaseLabel(phase)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// gamePhaseColorClass
// ---------------------------------------------------------------------------

describe("gamePhaseColorClass", () => {
  it("live → text-green-400", () => {
    expect(gamePhaseColorClass("live")).toBe("text-green-400");
  });

  it("final → text-ink-400", () => {
    expect(gamePhaseColorClass("final")).toBe("text-ink-400");
  });

  it("postponed → text-amber-400", () => {
    expect(gamePhaseColorClass("postponed")).toBe("text-amber-400");
  });

  it("cancelled → text-amber-400", () => {
    expect(gamePhaseColorClass("cancelled")).toBe("text-amber-400");
  });

  it("imminent → text-blue-400", () => {
    expect(gamePhaseColorClass("imminent")).toBe("text-blue-400");
  });

  it("pregame → text-ink-500", () => {
    expect(gamePhaseColorClass("pregame")).toBe("text-ink-500");
  });

  it("halftime → text-amber-300", () => {
    expect(gamePhaseColorClass("halftime")).toBe("text-amber-300");
  });
});

// ---------------------------------------------------------------------------
// periodLabel — NFL
// ---------------------------------------------------------------------------

describe("periodLabel — NFL", () => {
  it("period 1 → Q1, not overtime", () => {
    const info = periodLabel(1, "americanfootball_nfl");
    expect(info.label).toBe("Q1");
    expect(info.isOvertime).toBe(false);
  });

  it("period 4 → Q4, not overtime", () => {
    const info = periodLabel(4, "americanfootball_nfl");
    expect(info.label).toBe("Q4");
    expect(info.isOvertime).toBe(false);
  });

  it("period 5 → OT, isOvertime true", () => {
    const info = periodLabel(5, "americanfootball_nfl");
    expect(info.label).toBe("OT");
    expect(info.isOvertime).toBe(true);
  });

  it("period 6 → OT, isOvertime true (double OT)", () => {
    const info = periodLabel(6, "americanfootball_nfl");
    expect(info.label).toBe("OT");
    expect(info.isOvertime).toBe(true);
  });

  it("returns the correct sport in PeriodInfo", () => {
    const info = periodLabel(2, "americanfootball_nfl");
    expect(info.sport).toBe("americanfootball_nfl");
    expect(info.number).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// periodLabel — NBA
// ---------------------------------------------------------------------------

describe("periodLabel — NBA", () => {
  it("period 1 → Q1", () => {
    expect(periodLabel(1, "basketball_nba").label).toBe("Q1");
  });

  it("period 4 → Q4", () => {
    expect(periodLabel(4, "basketball_nba").label).toBe("Q4");
  });

  it("period 5 → OT, isOvertime true", () => {
    const info = periodLabel(5, "basketball_nba");
    expect(info.label).toBe("OT");
    expect(info.isOvertime).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// periodLabel — NCAAB
// ---------------------------------------------------------------------------

describe("periodLabel — NCAAB", () => {
  it("period 1 → H1", () => {
    const info = periodLabel(1, "basketball_ncaab");
    expect(info.label).toBe("H1");
    expect(info.isOvertime).toBe(false);
  });

  it("period 2 → H2", () => {
    const info = periodLabel(2, "basketball_ncaab");
    expect(info.label).toBe("H2");
    expect(info.isOvertime).toBe(false);
  });

  it("period 3 → OT, isOvertime true", () => {
    const info = periodLabel(3, "basketball_ncaab");
    expect(info.label).toBe("OT");
    expect(info.isOvertime).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// periodLabel — MLB
// ---------------------------------------------------------------------------

describe("periodLabel — MLB", () => {
  it("period 1 → 1st", () => {
    expect(periodLabel(1, "baseball_mlb").label).toBe("1st");
  });

  it("period 2 → 2nd", () => {
    expect(periodLabel(2, "baseball_mlb").label).toBe("2nd");
  });

  it("period 3 → 3rd", () => {
    expect(periodLabel(3, "baseball_mlb").label).toBe("3rd");
  });

  it("period 4 → 4th", () => {
    expect(periodLabel(4, "baseball_mlb").label).toBe("4th");
  });

  it("period 9 → 9th, not overtime", () => {
    const info = periodLabel(9, "baseball_mlb");
    expect(info.label).toBe("9th");
    expect(info.isOvertime).toBe(false);
  });

  it("period 10 → 10th, isOvertime true", () => {
    const info = periodLabel(10, "baseball_mlb");
    expect(info.label).toBe("10th");
    expect(info.isOvertime).toBe(true);
  });

  it("period 11 → 11th", () => {
    expect(periodLabel(11, "baseball_mlb").label).toBe("11th");
  });

  it("period 12 → 12th", () => {
    expect(periodLabel(12, "baseball_mlb").label).toBe("12th");
  });
});

// ---------------------------------------------------------------------------
// periodLabel — NHL
// ---------------------------------------------------------------------------

describe("periodLabel — NHL", () => {
  it("period 1 → P1", () => {
    expect(periodLabel(1, "icehockey_nhl").label).toBe("P1");
  });

  it("period 3 → P3, not overtime", () => {
    const info = periodLabel(3, "icehockey_nhl");
    expect(info.label).toBe("P3");
    expect(info.isOvertime).toBe(false);
  });

  it("period 4 → OT, isOvertime true", () => {
    const info = periodLabel(4, "icehockey_nhl");
    expect(info.label).toBe("OT");
    expect(info.isOvertime).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// periodLabel — Soccer
// ---------------------------------------------------------------------------

describe("periodLabel — Soccer", () => {
  it("period 1 → 1H", () => {
    expect(periodLabel(1, "soccer_epl").label).toBe("1H");
  });

  it("period 2 → 2H, not overtime", () => {
    const info = periodLabel(2, "soccer_epl");
    expect(info.label).toBe("2H");
    expect(info.isOvertime).toBe(false);
  });

  it("period 3 → ET1, isOvertime true", () => {
    const info = periodLabel(3, "soccer_epl");
    expect(info.label).toBe("ET1");
    expect(info.isOvertime).toBe(true);
  });

  it("period 4 → ET2, isOvertime true", () => {
    const info = periodLabel(4, "soccer_epl");
    expect(info.label).toBe("ET2");
    expect(info.isOvertime).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatClock
// ---------------------------------------------------------------------------

describe("formatClock", () => {
  it("formatClock(14, 32) → '14:32'", () => {
    expect(formatClock(14, 32)).toBe("14:32");
  });

  it("formatClock(0, 9) → '0:09' (pads seconds to 2 digits)", () => {
    expect(formatClock(0, 9)).toBe("0:09");
  });

  it("formatClock(0, 0) → '0:00'", () => {
    expect(formatClock(0, 0)).toBe("0:00");
  });

  it("formatClock(2, 59) → '2:59'", () => {
    expect(formatClock(2, 59)).toBe("2:59");
  });
});

// ---------------------------------------------------------------------------
// parseClock
// ---------------------------------------------------------------------------

describe("parseClock", () => {
  it("parseClock('14:32') → {minutes:14, seconds:32}", () => {
    expect(parseClock("14:32")).toEqual({ minutes: 14, seconds: 32 });
  });

  it("parseClock('0:09') → {minutes:0, seconds:9}", () => {
    expect(parseClock("0:09")).toEqual({ minutes: 0, seconds: 9 });
  });

  it("parseClock('bad') → null", () => {
    expect(parseClock("bad")).toBeNull();
  });

  it("parseClock('') → null", () => {
    expect(parseClock("")).toBeNull();
  });

  it("parseClock('1:60') → null (seconds >= 60 invalid)", () => {
    expect(parseClock("1:60")).toBeNull();
  });

  it("parseClock('5:5') → null (seconds must be 2 digits)", () => {
    expect(parseClock("5:5")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// totalPeriods
// ---------------------------------------------------------------------------

describe("totalPeriods", () => {
  const cases: [Sport, number][] = [
    ["americanfootball_nfl", 4],
    ["americanfootball_ncaaf", 4],
    ["basketball_nba", 4],
    ["basketball_ncaab", 2],
    ["baseball_mlb", 9],
    ["icehockey_nhl", 3],
    ["soccer_epl", 2],
  ];

  for (const [sport, expected] of cases) {
    it(`${sport} → ${expected}`, () => {
      expect(totalPeriods(sport)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// overtimePeriodNumber
// ---------------------------------------------------------------------------

describe("overtimePeriodNumber", () => {
  it("NFL → 5", () => expect(overtimePeriodNumber("americanfootball_nfl")).toBe(5));
  it("NBA → 5", () => expect(overtimePeriodNumber("basketball_nba")).toBe(5));
  it("NCAAB → 3", () => expect(overtimePeriodNumber("basketball_ncaab")).toBe(3));
  it("MLB → 10", () => expect(overtimePeriodNumber("baseball_mlb")).toBe(10));
  it("NHL → 4", () => expect(overtimePeriodNumber("icehockey_nhl")).toBe(4));
  it("Soccer → 3", () => expect(overtimePeriodNumber("soccer_epl")).toBe(3));
});

// ---------------------------------------------------------------------------
// isOvertimePeriod
// ---------------------------------------------------------------------------

describe("isOvertimePeriod", () => {
  it("NFL period 5 → true", () => {
    expect(isOvertimePeriod(5, "americanfootball_nfl")).toBe(true);
  });

  it("NFL period 4 → false", () => {
    expect(isOvertimePeriod(4, "americanfootball_nfl")).toBe(false);
  });

  it("MLB period 10 → true", () => {
    expect(isOvertimePeriod(10, "baseball_mlb")).toBe(true);
  });

  it("MLB period 9 → false", () => {
    expect(isOvertimePeriod(9, "baseball_mlb")).toBe(false);
  });

  it("NHL period 4 → true", () => {
    expect(isOvertimePeriod(4, "icehockey_nhl")).toBe(true);
  });

  it("NHL period 3 → false", () => {
    expect(isOvertimePeriod(3, "icehockey_nhl")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sportDisplayName
// ---------------------------------------------------------------------------

describe("sportDisplayName", () => {
  const cases: [Sport, string][] = [
    ["americanfootball_nfl", "NFL"],
    ["basketball_nba", "NBA"],
    ["baseball_mlb", "MLB"],
    ["icehockey_nhl", "NHL"],
    ["soccer_epl", "EPL"],
    ["americanfootball_ncaaf", "CFB"],
    ["basketball_ncaab", "NCAAB"],
  ];

  for (const [sport, expected] of cases) {
    it(`${sport} → '${expected}'`, () => {
      expect(sportDisplayName(sport)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// sportEmoji
// ---------------------------------------------------------------------------

describe("sportEmoji", () => {
  it("NFL → 🏈", () => expect(sportEmoji("americanfootball_nfl")).toBe("🏈"));
  it("NCAAF → 🏈", () => expect(sportEmoji("americanfootball_ncaaf")).toBe("🏈"));
  it("NBA → 🏀", () => expect(sportEmoji("basketball_nba")).toBe("🏀"));
  it("NCAAB → 🏀", () => expect(sportEmoji("basketball_ncaab")).toBe("🏀"));
  it("MLB → ⚾", () => expect(sportEmoji("baseball_mlb")).toBe("⚾"));
  it("NHL → 🏒", () => expect(sportEmoji("icehockey_nhl")).toBe("🏒"));
  it("Soccer → ⚽", () => expect(sportEmoji("soccer_epl")).toBe("⚽"));
});

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------

describe("formatScore", () => {
  it("formatScore(24, 17, 'Chiefs', 'Raiders') → 'Chiefs 24, Raiders 17'", () => {
    expect(formatScore(24, 17, "Chiefs", "Raiders")).toBe("Chiefs 24, Raiders 17");
  });

  it("handles zero scores", () => {
    expect(formatScore(0, 0, "Team A", "Team B")).toBe("Team A 0, Team B 0");
  });
});

// ---------------------------------------------------------------------------
// scoreboardDisplay
// ---------------------------------------------------------------------------

describe("scoreboardDisplay", () => {
  it("scoreboardDisplay(24, 17) → '24-17'", () => {
    expect(scoreboardDisplay(24, 17)).toBe("24-17");
  });

  it("scoreboardDisplay(0, 0) → '0-0'", () => {
    expect(scoreboardDisplay(0, 0)).toBe("0-0");
  });
});

// ---------------------------------------------------------------------------
// isHighScoring
// ---------------------------------------------------------------------------

describe("isHighScoring", () => {
  it("NBA → true", () => expect(isHighScoring("basketball_nba")).toBe(true));
  it("NCAAB → true", () => expect(isHighScoring("basketball_ncaab")).toBe(true));
  it("NFL → false", () => expect(isHighScoring("americanfootball_nfl")).toBe(false));
  it("MLB → false", () => expect(isHighScoring("baseball_mlb")).toBe(false));
  it("NHL → false", () => expect(isHighScoring("icehockey_nhl")).toBe(false));
  it("Soccer → false", () => expect(isHighScoring("soccer_epl")).toBe(false));
});

// ---------------------------------------------------------------------------
// typicalGameDuration
// ---------------------------------------------------------------------------

describe("typicalGameDuration", () => {
  it("NFL → 210", () => expect(typicalGameDuration("americanfootball_nfl")).toBe(210));
  it("NBA → 150", () => expect(typicalGameDuration("basketball_nba")).toBe(150));
  it("MLB → 180", () => expect(typicalGameDuration("baseball_mlb")).toBe(180));
  it("NHL → 150", () => expect(typicalGameDuration("icehockey_nhl")).toBe(150));
  it("Soccer → 110", () => expect(typicalGameDuration("soccer_epl")).toBe(110));
  it("NCAAF → 210", () => expect(typicalGameDuration("americanfootball_ncaaf")).toBe(210));
  it("NCAAB → 130", () => expect(typicalGameDuration("basketball_ncaab")).toBe(130));
});

// ---------------------------------------------------------------------------
// estimatedMinutesRemaining
// ---------------------------------------------------------------------------

describe("estimatedMinutesRemaining", () => {
  it("NFL period 3 clock 10 → (4-3)*15+10 = 25", () => {
    expect(estimatedMinutesRemaining(3, 10, "americanfootball_nfl")).toBe(25);
  });

  it("NFL period 1 clock 15 → (4-1)*15+15 = 60", () => {
    expect(estimatedMinutesRemaining(1, 15, "americanfootball_nfl")).toBe(60);
  });

  it("NFL period 4 clock 0 → 0", () => {
    expect(estimatedMinutesRemaining(4, 0, "americanfootball_nfl")).toBe(0);
  });

  it("NBA period 3 clock 5 → (4-3)*15+5 = 20", () => {
    expect(estimatedMinutesRemaining(3, 5, "basketball_nba")).toBe(20);
  });

  it("NHL period 2 clock 8 → (3-2)*20+8 = 28", () => {
    expect(estimatedMinutesRemaining(2, 8, "icehockey_nhl")).toBe(28);
  });

  it("NHL period 3 clock 0 → 0", () => {
    expect(estimatedMinutesRemaining(3, 0, "icehockey_nhl")).toBe(0);
  });

  it("MLB inning 5 → (9-5)*18 = 72", () => {
    expect(estimatedMinutesRemaining(5, 0, "baseball_mlb")).toBe(72);
  });

  it("MLB inning 9 → (9-9)*18 = 0", () => {
    expect(estimatedMinutesRemaining(9, 0, "baseball_mlb")).toBe(0);
  });

  it("Soccer half 1 clock 20 → (2-1)*45+20 = 65", () => {
    expect(estimatedMinutesRemaining(1, 20, "soccer_epl")).toBe(65);
  });

  it("Soccer half 2 clock 0 → 0", () => {
    expect(estimatedMinutesRemaining(2, 0, "soccer_epl")).toBe(0);
  });

  it("NCAAB half 1 clock 10 → (2-1)*20+10 = 30", () => {
    expect(estimatedMinutesRemaining(1, 10, "basketball_ncaab")).toBe(30);
  });

  it("does not return negative values", () => {
    // Overtime period — should return 0, not negative
    expect(estimatedMinutesRemaining(5, 0, "americanfootball_nfl")).toBe(0);
  });
});
