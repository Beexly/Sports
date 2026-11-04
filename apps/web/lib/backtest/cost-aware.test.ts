import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  breakevenRate,
  evaluateAtPrice,
  type CostAwarePick,
  type SettledResult,
} from "./cost-aware";

function picks(wins: number, losses: number, extra: SettledResult[] = []): CostAwarePick[] {
  const out: CostAwarePick[] = [];
  for (let i = 0; i < wins; i += 1) out.push({ id: `w${i}`, result: "WIN" });
  for (let i = 0; i < losses; i += 1) out.push({ id: `l${i}`, result: "LOSS" });
  extra.forEach((r, i) => out.push({ id: `x${i}`, result: r }));
  return out;
}

describe("americanToDecimal", () => {
  it("converts a standard -110 price", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.90909, 4);
  });

  it("converts a plus price", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 6);
  });

  it("treats even money as 2.0", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 6);
    expect(americanToDecimal(-100)).toBeCloseTo(2.0, 6);
  });

  it("rejects prices that are not valid American odds", () => {
    expect(() => americanToDecimal(0)).toThrow(RangeError);
    expect(() => americanToDecimal(50)).toThrow(RangeError);
    expect(() => americanToDecimal(-50)).toThrow(RangeError);
    expect(() => americanToDecimal(Number.NaN)).toThrow(RangeError);
  });
});

describe("breakevenRate", () => {
  it("gives the 52.4% the academy teaches for -110", () => {
    expect(breakevenRate(-110)).toBeCloseTo(0.5238, 3);
  });

  it("gives 40% at +150", () => {
    expect(breakevenRate(150)).toBeCloseTo(0.4, 6);
  });
});

describe("evaluateAtPrice — honest withholding", () => {
  it("reports empty when no pick carries risk", () => {
    const r = evaluateAtPrice(picks(0, 0, ["PENDING", "PUSH"]), { americanOdds: -110 });
    expect(r.status).toBe("empty");
    expect(r.observedWinRate).toBeNull();
    expect(r.netUnits).toBeNull();
  });

  it("withholds performance fields below the sample floor but still states the price", () => {
    const r = evaluateAtPrice(picks(6, 4), { americanOdds: -110 }, { minSampleSize: 100 });
    expect(r.status).toBe("insufficient-sample");
    // The break-even rate is a property of the PRICE, so it is safe to publish.
    expect(r.requiredWinRate).toBeCloseTo(0.5238, 3);
    // Everything that depends on the SAMPLE is withheld.
    expect(r.observedWinRate).toBeNull();
    expect(r.marginOverBreakeven).toBeNull();
    expect(r.beatsBreakeven).toBeNull();
    expect(r.netUnits).toBeNull();
    expect(r.roi).toBeNull();
  });
});

describe("evaluateAtPrice — the domain lesson", () => {
  it("shows 52% LOSES money at -110, matching the academy copy", () => {
    // curriculum.ts: "Win 52.3% forever and you lose forever."
    const r = evaluateAtPrice(picks(52, 48), { americanOdds: -110 }, { minSampleSize: 100 });
    expect(r.status).toBe("ok");
    expect(r.observedWinRate).toBeCloseTo(0.52, 4);
    expect(r.requiredWinRate).toBeCloseTo(0.5238, 3);
    expect(r.beatsBreakeven).toBe(false);
    expect(r.netUnits).toBeLessThan(0);
    expect(r.roi).toBeLessThan(0);
  });

  it("shows 55% WINS at -110", () => {
    const r = evaluateAtPrice(picks(55, 45), { americanOdds: -110 }, { minSampleSize: 100 });
    expect(r.beatsBreakeven).toBe(true);
    expect(r.marginOverBreakeven).toBeGreaterThan(0);
    expect(r.netUnits).toBeGreaterThan(0);
    expect(r.coverage.riskBearing).toBe(100);
  });

  it("computes net units exactly for a plus price", () => {
    // +150: each win returns 1.5, each loss costs 1. 40W/60L -> 60 - 60 = 0.
    const r = evaluateAtPrice(picks(40, 60), { americanOdds: 150 }, { minSampleSize: 100 });
    expect(r.observedWinRate).toBeCloseTo(0.4, 4);
    expect(r.beatsBreakeven).toBe(false); // exactly at breakeven is not "beats"
    expect(r.netUnits).toBeCloseTo(0, 6);
  });
});

describe("evaluateAtPrice — result bucketing", () => {
  it("does not let PUSH or VOID change net units", () => {
    const base = evaluateAtPrice(picks(55, 45), { americanOdds: -110 }, { minSampleSize: 100 });
    const withExtras = evaluateAtPrice(
      picks(55, 45, ["PUSH", "VOID", "PUSH"]),
      { americanOdds: -110 },
      { minSampleSize: 100 },
    );
    expect(withExtras.netUnits).toBe(base.netUnits);
    expect(withExtras.observedWinRate).toBe(base.observedWinRate);
    expect(withExtras.coverage.pushes).toBe(2);
    expect(withExtras.coverage.voids).toBe(1);
  });

  it("excludes PENDING from the risk-bearing count", () => {
    const r = evaluateAtPrice(picks(55, 45, ["PENDING", "PENDING"]), { americanOdds: -110 });
    expect(r.coverage.pending).toBe(2);
    expect(r.coverage.riskBearing).toBe(100);
    expect(r.coverage.totalInput).toBe(102);
  });
});
