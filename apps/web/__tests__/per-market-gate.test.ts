/**
 * Per-market gate — regression tests against the four live readings measured 2026-09-11.
 *
 * The canonical example this pins: TOTAL passes every legacy floor (debiased ECE 0.0000, the best
 * of the three markets, and a Brier that beats the no-skill forecast) and STILL must fail, because
 * its resolution (0.00119) sits below its own permutation floor (0.0036) and below the null mean
 * (0.00181). ECE and Brier cannot see a constant-in-disguise; the resolution floor is the guard.
 */
import { describe, expect, it } from "vitest";
import {
  ML_RES_FLOOR_STRICT,
  MARKET_GATE_FLOORS,
  evaluateMarketGate,
  type MarketGateInputs,
} from "@/lib/ops/per-market-gate";

/** Live readings, wave1-report.cjs / res-floor.cjs, 2026-09-11. */
const LIVE: Record<"MONEYLINE" | "SPREAD" | "TOTAL", MarketGateInputs> = {
  MONEYLINE: { n: 190, baseRate: 0.7526, ece: 0.0479, eceDebiased: 0.0095, brier: 0.1736, reliability: 0.0031, resolution: 0.0176 },
  SPREAD: { n: 544, baseRate: 0.4338, ece: 0.0208, eceDebiased: 0.0072, brier: 0.2422, reliability: 0.0007, resolution: 0.0053 },
  TOTAL: { n: 417, baseRate: 0.5036, ece: 0.0107, eceDebiased: 0.0, brier: 0.2496, reliability: 0.0006, resolution: 0.0012 },
};

/** A constant forecast that emits the base rate: perfectly calibrated-looking, zero discrimination. */
function constantModel(n: number, baseRate: number): MarketGateInputs {
  return { n, baseRate, ece: 0, eceDebiased: 0, brier: baseRate * (1 - baseRate), reliability: 0, resolution: 0 };
}

describe("per-market gate", () => {
  it("passes moneyline and spread on the live readings", () => {
    expect(evaluateMarketGate("MONEYLINE", LIVE.MONEYLINE).status).toBe("PASS");
    expect(evaluateMarketGate("SPREAD", LIVE.SPREAD).status).toBe("PASS");
  });

  it("FAILS total on the live readings even though its calibration is the best of the three", () => {
    const total = evaluateMarketGate("TOTAL", LIVE.TOTAL);
    expect(total.status).toBe("FAIL");
    expect(total.reasons.join(" ")).toContain("resolution");
    // the things that do NOT catch it — this is the point of the module
    expect(LIVE.TOTAL.eceDebiased).toBeLessThanOrEqual(MARKET_GATE_FLOORS.TOTAL.eceNullQ95Debiased);
    expect(LIVE.TOTAL.brier).toBeLessThan(LIVE.TOTAL.baseRate * (1 - LIVE.TOTAL.baseRate));
  });

  it("catches a constant-in-disguise model that the legacy floors would pass", () => {
    const flat = constantModel(190, 0.7526); // moneyline base rate
    expect(flat.ece).toBeLessThanOrEqual(MARKET_GATE_FLOORS.MONEYLINE.eceNullQ95);
    expect(flat.brier).toBeLessThan(0.22); // it would clear the old absolute Brier floor too
    const v = evaluateMarketGate("MONEYLINE", flat);
    expect(v.status).toBe("FAIL");
    expect(v.reasons.join(" ")).toContain("constant-in-disguise");
    expect(v.reasons.join(" ")).toContain("no-skill");
  });

  it("is per-market by construction: identical inputs flip verdict across markets", () => {
    const base: MarketGateInputs = { n: 400, baseRate: 0.5, ece: 0.02, eceDebiased: 0.005, brier: 0.24, reliability: 0.001, resolution: 0.0035 };
    expect(evaluateMarketGate("SPREAD", base).status).toBe("PASS"); // 0.0035 > 0.0029
    expect(evaluateMarketGate("TOTAL", base).status).toBe("FAIL"); // 0.0035 <= 0.0036
  });

  it("refuses a verdict below the sample floor", () => {
    expect(evaluateMarketGate("MONEYLINE", { ...LIVE.MONEYLINE, n: 40 }).status).toBe("INSUFFICIENT");
  });

  it("strict moneyline bar is tighter and still passes the live reading", () => {
    expect(MARKET_GATE_FLOORS.MONEYLINE.resFloor).toBe(0.0091);
    expect(ML_RES_FLOOR_STRICT).toBe(0.0126);
    expect(evaluateMarketGate("MONEYLINE", LIVE.MONEYLINE, { strictMl: true }).status).toBe("PASS");
  });

  it("floors are ordered as measured and never loosened silently", () => {
    expect(MARKET_GATE_FLOORS.MONEYLINE.resFloor).toBeGreaterThan(MARKET_GATE_FLOORS.SPREAD.resFloor);
    expect(MARKET_GATE_FLOORS.TOTAL.resFloor).toBeGreaterThan(MARKET_GATE_FLOORS.SPREAD.resFloor);
    expect(MARKET_GATE_FLOORS.SPREAD.resFloor).toBeGreaterThan(0);
  });

  it("fails a model whose Brier merely ties the no-skill forecast", () => {
    const tied = { ...LIVE.SPREAD, brier: LIVE.SPREAD.baseRate * (1 - LIVE.SPREAD.baseRate) };
    const v = evaluateMarketGate("SPREAD", tied);
    expect(v.status).toBe("FAIL");
    expect(v.reasons.join(" ")).toContain("BSS <= 0");
  });
});
