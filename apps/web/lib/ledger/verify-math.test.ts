/**
 * Logic tests for the sealed-ledger verification math (WP-5).
 * Pure functions only: no DB, no DOM. These pin the conventions that
 * scripts/verify-ledger.ts uses to recompute every public number.
 */
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_TARGET,
  americanToDecimal,
  americanToImpliedProb,
  calibrationGate,
  confidenceBuckets,
  countWlp,
  isClvBacked,
  isOfficialPlay,
  isSettledResult,
  recomputeClv,
  round2,
  round4,
  unitProfit,
  type OfficialPickRow,
} from "./verify-math";

describe("american odds conversion", () => {
  it("converts negative and positive prices to decimal", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.909090909, 6);
    expect(americanToDecimal(+150)).toBe(2.5);
    expect(americanToDecimal(-200)).toBe(1.5);
    expect(americanToDecimal(+100)).toBe(2);
  });

  it("rejects zero / non-finite prices instead of inventing odds", () => {
    expect(americanToDecimal(0)).toBeNull();
    expect(americanToDecimal(Number.NaN)).toBeNull();
    expect(americanToDecimal(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("implied probability is 1/decimal", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(0.523809524, 6);
    expect(americanToImpliedProb(+150)).toBeCloseTo(0.4, 6);
    expect(americanToImpliedProb(0)).toBeNull();
  });
});

describe("flat-stake unit profit", () => {
  it("WIN profit is decimal(lock price) - 1", () => {
    expect(unitProfit("WIN", -110)).toBeCloseTo(0.909090909, 6);
    expect(unitProfit("WIN", +150)).toBe(1.5);
  });

  it("LOSS is exactly -1u and PUSH exactly 0u", () => {
    expect(unitProfit("LOSS", -110)).toBe(-1);
    expect(unitProfit("LOSS", null)).toBe(-1);
    expect(unitProfit("PUSH", null)).toBe(0);
  });

  it("WIN without a recorded lock price is a coverage gap (null), never an invented price", () => {
    expect(unitProfit("WIN", null)).toBeNull();
    expect(unitProfit("WIN", 0)).toBeNull();
  });
});

describe("CLV recomputation (positive = beat the close)", () => {
  it("TOTAL UNDER: lock - close; the TNF WSH@NYG shape", () => {
    // Locked UNDER 43.5, market closed 40.625: we beat the close by 2.875.
    const clv = recomputeClv({
      market: "TOTAL",
      selection: "UNDER 43.5",
      lockLine: 43.5,
      closeLine: 40.625,
      lockPrice: -110,
      closePrice: -110,
    });
    expect(clv).toEqual({ kind: "POINTS", value: 2.875 });
  });

  it("TOTAL OVER: close - lock", () => {
    const clv = recomputeClv({
      market: "TOTAL",
      selection: "OVER 43.5",
      lockLine: 43.5,
      closeLine: 45,
      lockPrice: null,
      closePrice: null,
    });
    expect(clv).toEqual({ kind: "POINTS", value: 1.5 });
  });

  it("TOTAL without an OVER/UNDER selection is ungraded, never guessed", () => {
    expect(
      recomputeClv({
        market: "TOTAL",
        selection: "43.5",
        lockLine: 43.5,
        closeLine: 40,
        lockPrice: null,
        closePrice: null,
      }),
    ).toBeNull();
  });

  it("SPREAD lines are HOME-perspective; side derives from team names", () => {
    const base = {
      market: "SPREAD" as const,
      lockLine: -1.5,
      closeLine: -3,
      lockPrice: null,
      closePrice: null,
      homeTeamName: "New York Giants",
      awayTeamName: "Washington Commanders",
    };
    // Home side: lock - close = -1.5 - (-3) = +1.5 (beat the close).
    expect(recomputeClv({ ...base, selection: "New York Giants -1.5" })).toEqual({
      kind: "POINTS",
      value: 1.5,
    });
    // Away side: close - lock = -3 - (-1.5) = -1.5 (lost to the close).
    expect(recomputeClv({ ...base, selection: "Washington Commanders +1.5" })).toEqual({
      kind: "POINTS",
      value: -1.5,
    });
  });

  it("SPREAD with an ambiguous side is ungraded, never guessed", () => {
    expect(
      recomputeClv({
        market: "SPREAD",
        selection: "Giants -1.5",
        lockLine: -1.5,
        closeLine: -3,
        lockPrice: null,
        closePrice: null,
        homeTeamName: "New York Giants",
        awayTeamName: "Washington Commanders",
      }),
    ).toBeNull();
  });

  it("MONEYLINE: implied(close) - implied(lock)", () => {
    const clv = recomputeClv({
      market: "MONEYLINE",
      selection: "Moneyline",
      lockLine: null,
      closeLine: null,
      lockPrice: +150,
      closePrice: +120,
    });
    // implied(+120)=0.4545..., implied(+150)=0.4 -> +0.0545...
    expect(clv?.kind).toBe("PROBABILITY");
    expect(clv?.value).toBeCloseTo(0.0545454545, 6);
  });

  it("missing fields return null for every market", () => {
    expect(
      recomputeClv({
        market: "TOTAL",
        selection: "UNDER 43.5",
        lockLine: null,
        closeLine: 40,
        lockPrice: null,
        closePrice: null,
      }),
    ).toBeNull();
    expect(
      recomputeClv({
        market: "MONEYLINE",
        selection: "Moneyline",
        lockLine: null,
        closeLine: null,
        lockPrice: null,
        closePrice: -110,
      }),
    ).toBeNull();
  });
});

describe("CLV backing + official-play classification", () => {
  it("a closing line OR closing price makes a pick CLV-backed", () => {
    expect(isClvBacked(40.5, null)).toBe(true);
    expect(isClvBacked(null, -115)).toBe(true);
    expect(isClvBacked(null, null)).toBe(false);
  });

  const official: OfficialPickRow = {
    result: "WIN",
    isPublished: true,
    tier: "PREMIUM",
    pickGrade: "STRONG_PLAY",
    clvCloseLine: 40.5,
    clvClosePrice: null,
  };

  it("only published PREMIUM STRONG_PLAY/ELITE_PLAY rows are official", () => {
    expect(isOfficialPlay(official)).toBe(true);
    expect(isOfficialPlay({ ...official, pickGrade: "ELITE_PLAY" })).toBe(true);
    expect(isOfficialPlay({ ...official, pickGrade: "PASS" })).toBe(false);
    expect(isOfficialPlay({ ...official, tier: "FREE" })).toBe(false);
    expect(isOfficialPlay({ ...official, isPublished: false })).toBe(false);
  });

  it("settled results are WIN/LOSS/PUSH only", () => {
    expect(isSettledResult("WIN")).toBe(true);
    expect(isSettledResult("LOSS")).toBe(true);
    expect(isSettledResult("PUSH")).toBe(true);
    expect(isSettledResult("VOID")).toBe(false);
    expect(isSettledResult(null)).toBe(false);
    expect(isSettledResult("PENDING")).toBe(false);
  });
});

describe("the 200-bet calibration gate", () => {
  const row = (over: Partial<OfficialPickRow> = {}): OfficialPickRow => ({
    result: "WIN",
    isPublished: true,
    tier: "PREMIUM",
    pickGrade: "STRONG_PLAY",
    clvCloseLine: 40.5,
    clvClosePrice: null,
    ...over,
  });

  it("stays locked below 200 CLV-backed settled official bets; winRate is null", () => {
    const rows = Array.from({ length: CALIBRATION_TARGET - 1 }, () => row());
    const gate = calibrationGate(rows);
    expect(gate.clvBackedSettled).toBe(199);
    expect(gate.unlocked).toBe(false);
    expect(gate.winRate).toBeNull();
    expect(gate.target).toBe(200);
  });

  it("unlocks at exactly 200 and computes wins/(wins+losses), pushes excluded", () => {
    const rows = [
      ...Array.from({ length: 120 }, () => row()),
      ...Array.from({ length: 70 }, () => row({ result: "LOSS" })),
      ...Array.from({ length: 10 }, () => row({ result: "PUSH" })),
    ];
    const gate = calibrationGate(rows);
    expect(gate.clvBackedSettled).toBe(200);
    expect(gate.unlocked).toBe(true);
    expect(gate.winRate).toBeCloseTo(120 / 190, 10);
  });

  it("non-official, unpublished, unsettled and non-CLV-backed rows never count", () => {
    const rows = [
      row({ pickGrade: "PASS" }),
      row({ isPublished: false }),
      row({ result: "PENDING" }),
      row({ clvCloseLine: null, clvClosePrice: null }),
      row({ tier: "FREE" }),
    ];
    expect(calibrationGate(rows).clvBackedSettled).toBe(0);
  });

  it("CLV backing can come from the closing price alone", () => {
    const rows = Array.from({ length: 200 }, () =>
      row({ clvCloseLine: null, clvClosePrice: -115 }),
    );
    expect(calibrationGate(rows).unlocked).toBe(true);
  });
});

describe("W/L/P counts and rounding", () => {
  it("counts only settled results; VOID/PENDING are excluded", () => {
    expect(countWlp(["WIN", "WIN", "LOSS", "PUSH", "VOID", "PENDING"])).toEqual({
      wins: 2,
      losses: 1,
      pushes: 1,
      settled: 4,
    });
  });

  it("round2 / round4 avoid float drift in the artifact", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(-295.2349999)).toBe(-295.23);
    expect(round4(0.0545454545)).toBe(0.0545);
  });
});

describe("confidence buckets are counts only (no rates before the gate)", () => {
  it("bands cover 50-100 and count inclusively", () => {
    const buckets = confidenceBuckets([50, 59, 60, 74, 88, 90, 100, 49, Number.NaN]);
    expect(buckets.map((b) => b.label)).toEqual(["50-59", "60-69", "70-79", "80-89", "90-100"]);
    expect(buckets.map((b) => b.count)).toEqual([2, 1, 1, 1, 2]);
  });
});