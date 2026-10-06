import { describe, expect, it } from "vitest";
import {
  buildCalibrationHistory,
  type SettledPickHistorySource,
} from "./build-calibration-history";
import { calibrationHistoryWithholds } from "./pathwise-defect";

/**
 * Pure mapper from settled picks to CalibrationHistoryRow[].
 * Silence on absence (empty in, empty out). PUSH/VOID never invent a y.
 * p is the mint basis: marketFairProb else trueProb else confidence/100.
 */

function pick(over: Partial<SettledPickHistorySource> = {}): SettledPickHistorySource {
  return {
    sport: "americanfootball_nfl",
    pickType: "MONEYLINE",
    result: "WIN",
    settledAt: new Date("2026-09-14T00:00:00Z"),
    commenceTime: new Date("2026-09-13T17:00:00Z"),
    confidence: 62,
    ...over,
  };
}

describe("buildCalibrationHistory", () => {
  it("returns empty for empty input (silence, same as undefined)", () => {
    expect(buildCalibrationHistory([])).toEqual([]);
    expect(calibrationHistoryWithholds(buildCalibrationHistory([]))).toBe(false);
  });

  it("maps WIN to y=1 and LOSS to y=0", () => {
    const rows = buildCalibrationHistory([
      pick({ result: "WIN" }),
      pick({ result: "LOSS" }),
    ]);
    expect(rows.map((r) => r.y)).toEqual([1, 0]);
  });

  it("excludes PUSH, VOID, and PENDING — no invented y", () => {
    const rows = buildCalibrationHistory([
      pick({ result: "PUSH" }),
      pick({ result: "VOID" }),
      pick({ result: "PENDING" }),
      pick({ result: "WIN" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.y).toBe(1);
  });

  it("uses marketFairProb as p when present", () => {
    const rows = buildCalibrationHistory([
      pick({
        marketFairProb: 0.55,
        trueProb: 0.7,
        confidence: 80,
        factorBreakdown: { marketFairProb: 0.55, independentEdge: { trueProb: 0.7 } },
      }),
    ]);
    expect(rows[0]!.p).toBe(0.55);
  });

  it("falls back to trueProb when marketFairProb is absent", () => {
    const rows = buildCalibrationHistory([
      pick({
        marketFairProb: null,
        trueProb: 0.61,
        confidence: 40,
        factorBreakdown: { independentEdge: { trueProb: 0.61 } },
      }),
    ]);
    expect(rows[0]!.p).toBe(0.61);
  });

  it("falls back to confidence/100 when both probs are absent", () => {
    const rows = buildCalibrationHistory([pick({ confidence: 47 })]);
    expect(rows[0]!.p).toBeCloseTo(0.47, 10);
  });

  it("does not train the withhold screen on a backfill trueProb", () => {
    const rows = buildCalibrationHistory([
      pick({
        marketFairProb: null,
        trueProb: 0.8,
        confidence: 62,
        factorBreakdown: {
          independentEdge: { trueProb: 0.8, trueProbBasis: "backfill" },
        },
      }),
    ]);
    expect(rows[0]!.p).toBeCloseTo(0.62, 10);
  });

  it("reads marketFairProb and trueProb from factorBreakdown when top-level is empty", () => {
    const rows = buildCalibrationHistory([
      pick({
        marketFairProb: undefined,
        trueProb: undefined,
        factorBreakdown: {
          marketFairProb: 0.52,
          independentEdge: { trueProb: 0.8 },
        },
      }),
    ]);
    expect(rows[0]!.p).toBe(0.52);
  });

  it("stratum is sport x market family", () => {
    const rows = buildCalibrationHistory([
      pick({ sport: "americanfootball_nfl", pickType: "MONEYLINE" }),
      pick({ sport: "americanfootball_nfl", pickType: "SPREAD" }),
      pick({ sport: "basketball_nba", pickType: "TOTAL" }),
    ]);
    expect(rows.map((r) => r.stratum)).toEqual([
      "AMERICANFOOTBALL_NFL:MONEYLINE",
      "AMERICANFOOTBALL_NFL:SPREAD",
      "BASKETBALL_NBA:TOTAL",
    ]);
  });

  it("path is settledAt epoch ms, falling back to commenceTime", () => {
    const settledAt = new Date("2026-09-20T12:00:00Z");
    const commenceTime = new Date("2026-09-13T17:00:00Z");
    const rows = buildCalibrationHistory([
      pick({ settledAt, commenceTime }),
      pick({ settledAt: null, commenceTime }),
      pick({ settledAt: null, commenceTime: null }),
    ]);
    expect(rows[0]!.path).toBe(settledAt.getTime());
    expect(rows[1]!.path).toBe(commenceTime.getTime());
    expect(rows[2]!.path).toBe(0);
  });

  it("emits an unreadable p when no basis exists so the screen withholds", () => {
    const rows = buildCalibrationHistory([
      pick({ confidence: null, marketFairProb: null, trueProb: null, factorBreakdown: null }),
    ]);
    expect(rows).toHaveLength(1);
    expect(Number.isNaN(rows[0]!.p)).toBe(true);
    expect(calibrationHistoryWithholds(rows)).toBe(true);
  });
});
