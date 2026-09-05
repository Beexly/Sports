import { describe, expect, it } from "vitest";
import {
  buildPerformanceReport,
  calibrationCurve,
  computeSegment,
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

  it("places exact-decile probabilities in the correct bucket (no IEEE-754 slip)", () => {
    // 0.7/0.1 === 6.999999999999999, 0.6/0.1 and 0.3/0.1 are likewise short.
    // A naive Math.floor would push a claimed-70% pick into the '60-70%' bucket.
    const records: SettledPickRecord[] = [
      rec({ modelProb: 0.7, won: true }),
      rec({ modelProb: 0.6, won: true }),
      rec({ modelProb: 0.3, won: false }),
    ];
    const curve = calibrationCurve(records);
    expect(curve.find((b) => b.label === "70-80%")?.count).toBe(1);
    expect(curve.find((b) => b.label === "60-70%")?.count).toBe(1);
    expect(curve.find((b) => b.label === "30-40%")?.count).toBe(1);
    // Genuine interior values are undisturbed and the top clamp still holds.
    const edge = calibrationCurve([rec({ modelProb: 0.6999, won: true }), rec({ modelProb: 0.999999, won: true })]);
    expect(edge.find((b) => b.label === "60-70%")?.count).toBe(1);
    expect(edge.find((b) => b.label === "90-100%")?.count).toBe(1);
  });
});

describe("computeSegment ROI honesty", () => {
  it("ranges ROI% over only graded picks, so a partial ledger cannot dilute the loss", () => {
    // A real loss whose profitUnits was never recorded must NOT be imputed as 0 and
    // diluted into the denominator. Numerator and denominator share one population.
    const records: SettledPickRecord[] = [
      rec({ won: true, profitUnits: 5 }),
      rec({ won: false }), // ungraded — no profitUnits recorded
    ];
    const seg = computeSegment(records, "overall");
    expect(seg.picks).toBe(2);
    expect(seg.roiUnits).toBe(5);
    // 5 units over the 1 graded pick = 500%, NOT the diluted 5/2 = 250%.
    expect(seg.roiPercentPerPick).toBe(500);
  });

  it("returns null ROI% when no pick carries profit data", () => {
    const seg = computeSegment([rec({ won: true }), rec({ won: false })], "overall");
    expect(seg.roiPercentPerPick).toBeNull();
  });
});

describe("streaks", () => {
  it("finds the longest win and loss streaks in order", () => {
    const records = [true, true, true, false, false, true].map((won) => rec({ won }));
    expect(streaks(records)).toEqual({ longestWinStreak: 3, longestLossStreak: 2 });
  });
});

describe("all-decided contract (no push/void state)", () => {
  // The type carries no push state: every record is a decided bet. Callers must
  // exclude pushes upstream. This pins the contract — a `won:false` record is a
  // loss for winRate AND streaks, so a push accidentally mapped to false would
  // (as documented) be counted against the record.
  it("counts every won:false record as a loss for winRate and streaks", () => {
    const records: SettledPickRecord[] = [
      rec({ won: true }),
      rec({ won: false }), // e.g. a push mis-mapped to false — counts as a loss
      rec({ won: true }),
    ];
    const report = buildPerformanceReport(records);
    expect(report.overall.winRate).toBeCloseTo(0.6667, 3);
    expect(report.longestWinStreak).toBe(1);
    expect(report.longestLossStreak).toBe(1);
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
