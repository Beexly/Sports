import { describe, expect, it } from "vitest";
import {
  buildPerformanceReport,
  calibrationCurve,
  streaks,
  beatCloseRate,
  type SettledPickRecord,
} from "../performance-analytics.js";

const rec = (over: Partial<SettledPickRecord> & { won: boolean }): SettledPickRecord => ({
  sport: "NBA",
  pickType: "SPREAD",
  modelProb: 0.6,
  ...over,
});

describe("buildPerformanceReport", () => {
  it("segments by sport and pick type with correct win rates", () => {
    const records: SettledPickRecord[] = [
      rec({ sport: "NBA", pickType: "SPREAD", won: true, profitUnits: 0.91 }),
      rec({ sport: "NBA", pickType: "TOTAL", won: false, profitUnits: -1 }),
      rec({ sport: "NFL", pickType: "SPREAD", won: true, profitUnits: 0.91 }),
    ];
    const report = buildPerformanceReport(records);
    expect(report.overall).toMatchObject({ picks: 3, wins: 2 });
    expect(report.overall.winRate).toBeCloseTo(0.6667, 3);
    expect(report.bySport.find((s) => s.segment === "NFL")?.winRate).toBe(1);
    expect(report.byPickType.find((s) => s.segment === "SPREAD")?.picks).toBe(2);
    expect(report.overall.roiUnits).toBeCloseTo(0.82, 2);
  });
});

describe("calibrationCurve", () => {
  it("buckets predictions and reports the actual win rate per bucket", () => {
    const records: SettledPickRecord[] = [
      rec({ modelProb: 0.72, won: true }),
      rec({ modelProb: 0.74, won: true }),
      rec({ modelProb: 0.71, won: false }),
      rec({ modelProb: 0.55, won: false }),
    ];
    const curve = calibrationCurve(records);
    const seventies = curve.find((b) => b.label === "70-80%");
    expect(seventies?.count).toBe(3);
    expect(seventies?.actualWinRate).toBeCloseTo(0.6667, 3);
  });
});

describe("streaks", () => {
  it("finds the longest win and loss streaks in order", () => {
    const records = [true, true, true, false, false, true].map((won) => rec({ won }));
    expect(streaks(records)).toEqual({ longestWinStreak: 3, longestLossStreak: 2 });
  });
});

describe("beatCloseRate", () => {
  it("is the fraction of picks whose model prob beat the close", () => {
    const records: SettledPickRecord[] = [
      rec({ won: true, modelProb: 0.6, closingProb: 0.55 }), // beat
      rec({ won: false, modelProb: 0.5, closingProb: 0.55 }), // did not
      rec({ won: true, modelProb: 0.62, closingProb: 0.5 }), // beat
    ];
    expect(beatCloseRate(records)).toBeCloseTo(0.6667, 3);
    expect(beatCloseRate([rec({ won: true })])).toBeNull(); // no closing data
  });
});
