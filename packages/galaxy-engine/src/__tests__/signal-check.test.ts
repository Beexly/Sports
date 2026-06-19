import { describe, it, expect } from "vitest";
import {
  gradeSignalPrediction,
} from "../grading-adapter.js";
import {
  evaluateSignalCheck,
  gradeMarketSignalCheck,
  gradeBinarySignalCheck,
} from "../signal-check.js";

describe("Grading adapter (wraps @sports/prediction-engine)", () => {
  it("settles a SPREAD home cover via the real engine", () => {
    // Home -3.5, home wins by 7 → home covers → WIN.
    const r = gradeSignalPrediction(
      { pickType: "SPREAD", selection: "Chiefs -3.5", line: -3.5, homeTeam: "Chiefs" },
      { homeScore: 28, awayScore: 21, sportKey: "americanfootball_nfl" },
    );
    expect(r).toBe("WIN");
  });

  it("settles a TOTAL under via the real engine", () => {
    const r = gradeSignalPrediction(
      { pickType: "TOTAL", selection: "UNDER 47.5", line: 47.5, homeTeam: "Chiefs" },
      { homeScore: 17, awayScore: 13, sportKey: "americanfootball_nfl" },
    );
    expect(r).toBe("WIN");
  });

  it("settles a MONEYLINE loss via the real engine", () => {
    const r = gradeSignalPrediction(
      { pickType: "MONEYLINE", selection: "Bills ML (+120)", line: 120, homeTeam: "Bills" },
      { homeScore: 10, awayScore: 24, sportKey: "americanfootball_nfl" },
    );
    expect(r).toBe("LOSS");
  });
});

describe("Signal Check (bible §7)", () => {
  it("composes settlement + calibration into a transparent outcome", () => {
    const o = evaluateSignalCheck("WAR_ROOM", "WIN", 80);
    expect(o.result).toBe("WIN");
    expect(o.correct).toBe(true);
    expect(o.reward.xp).toBeGreaterThan(0);
    expect(o.breakdown.length).toBeGreaterThan(0);
    // The glass box must include settlement + calibration rows.
    const labels = o.breakdown.map((r) => r.label);
    expect(labels).toContain("Settlement");
    expect(labels).toContain("Calibration score");
  });

  it("PUSH yields correct=null and no calibration row", () => {
    const o = evaluateSignalCheck("WAR_ROOM", "PUSH", 70);
    expect(o.correct).toBeNull();
    expect(o.breakdown.find((r) => r.label === "Calibration score")).toBeUndefined();
  });

  it("grades a market Signal Check end-to-end", () => {
    const o = gradeMarketSignalCheck(
      "WAR_ROOM",
      { pickType: "SPREAD", selection: "Eagles -6.5", line: -6.5, homeTeam: "Eagles" },
      { homeScore: 31, awayScore: 17, sportKey: "americanfootball_nfl" },
      75,
    );
    expect(o.result).toBe("WIN");
    expect(o.correct).toBe(true);
  });

  it("grades a direct binary Signal Check (Blacktop trivia)", () => {
    const right = gradeBinarySignalCheck("BLACKTOP", true, 60);
    const wrong = gradeBinarySignalCheck("BLACKTOP", false, 60);
    expect(right.result).toBe("WIN");
    expect(wrong.result).toBe("LOSS");
    expect(right.reward.xp).toBeGreaterThan(wrong.reward.xp);
  });
});
