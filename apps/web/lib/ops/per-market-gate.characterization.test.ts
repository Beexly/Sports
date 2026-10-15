/**
 * Characterization pins for the per-market calibration gate (G-06) —
 * gate-wiring batch 2.
 *
 * This module shipped with NO test file of its own (only its caller,
 * compute-live-calibration-metrics, has a suite). These pins record the
 * gate's CURRENT behavior exactly, including the fail-open NaN defect
 * flagged inline. A red pin after a future edit means behavior moved and
 * must be reviewed, not silently re-pinned.
 */
import { describe, expect, it } from "vitest";
import {
  MARKET_GATE_FLOORS,
  ML_RES_FLOOR_STRICT,
  evaluateMarketGate,
  type MarketGateInputs,
} from "./per-market-gate";

/** Inputs that pass every SPREAD floor with room to spare. */
const cleanSpread: MarketGateInputs = {
  n: 544,
  ece: 0.03,
  eceDebiased: 0.02,
  brier: 0.24,
  reliability: 0.01,
  resolution: 0.005,
  baseRate: 0.5,
};

describe("per-market gate characterization — floor table", () => {
  it("pins the measured per-market floors exactly", () => {
    expect(MARKET_GATE_FLOORS).toEqual({
      MONEYLINE: { minN: 100, eceNullQ95: 0.0793, eceNullQ95Debiased: 0.0535, reliabilityFloor: 0.05, resFloor: 0.0091 },
      SPREAD: { minN: 100, eceNullQ95: 0.0518, eceNullQ95Debiased: 0.0369, reliabilityFloor: 0.05, resFloor: 0.0029 },
      TOTAL: { minN: 100, eceNullQ95: 0.0552, eceNullQ95Debiased: 0.0434, reliabilityFloor: 0.05, resFloor: 0.0036 },
      PROPS: { minN: 100, eceNullQ95: 0.0793, eceNullQ95Debiased: 0.0535, reliabilityFloor: 0.05, resFloor: 0.0091 },
    });
    expect(ML_RES_FLOOR_STRICT).toBe(0.0126);
  });

  it("PROPS floors are the pooled moneyline defaults (module header: must be re-derived before use)", () => {
    expect(MARKET_GATE_FLOORS.PROPS).toEqual(MARKET_GATE_FLOORS.MONEYLINE);
  });
});

describe("per-market gate characterization — verdicts", () => {
  it("n below minN is INSUFFICIENT with the exact reason; n == minN proceeds", () => {
    const under = evaluateMarketGate("SPREAD", { ...cleanSpread, n: 99 });
    expect(under.status).toBe("INSUFFICIENT");
    expect(under.reasons).toEqual(["n 99 < 100 — no verdict is meaningful at this sample size"]);
    const at = evaluateMarketGate("SPREAD", { ...cleanSpread, n: 100 });
    expect(at.status).toBe("PASS");
  });

  it("clean inputs PASS, carry the market's own floor object, and report the PASS reason", () => {
    const v = evaluateMarketGate("SPREAD", cleanSpread);
    expect(v.status).toBe("PASS");
    expect(v.floors).toBe(MARKET_GATE_FLOORS.SPREAD);
    expect(v.reasons).toEqual(["all per-market floors met at n 544"]);
  });

  it("ECE exactly at the null band passes; one tick above fails with the exact reason", () => {
    expect(evaluateMarketGate("SPREAD", { ...cleanSpread, ece: 0.0518 }).status).toBe("PASS");
    const over = evaluateMarketGate("SPREAD", { ...cleanSpread, ece: 0.0519 });
    expect(over.status).toBe("FAIL");
    expect(over.reasons).toEqual(["ECE 0.0519 above the calibrated null band 0.0518"]);
  });

  it("a null debiased ECE skips the debiased check entirely", () => {
    expect(evaluateMarketGate("SPREAD", { ...cleanSpread, eceDebiased: null }).status).toBe("PASS");
    const over = evaluateMarketGate("SPREAD", { ...cleanSpread, eceDebiased: 0.037 });
    expect(over.status).toBe("FAIL");
    expect(over.reasons).toEqual(["debiased ECE 0.0370 above the null band 0.0369"]);
  });

  it("Brier must strictly beat the no-skill forecast: equality with baseRate*(1-baseRate) fails", () => {
    const tied = evaluateMarketGate("SPREAD", { ...cleanSpread, brier: 0.25 });
    expect(tied.status).toBe("FAIL");
    expect(tied.reasons).toEqual([
      "Brier 0.2500 does not beat the no-skill forecast 0.2500 (base rate 0.5000) — BSS <= 0",
    ]);
    expect(evaluateMarketGate("SPREAD", { ...cleanSpread, brier: 0.2499 }).status).toBe("PASS");
  });

  it("reliability exactly at its floor passes; above it fails", () => {
    expect(evaluateMarketGate("SPREAD", { ...cleanSpread, reliability: 0.05 }).status).toBe("PASS");
    const over = evaluateMarketGate("SPREAD", { ...cleanSpread, reliability: 0.0501 });
    expect(over.status).toBe("FAIL");
    expect(over.reasons).toEqual(["Murphy reliability 0.0501 above 0.05"]);
  });

  it("the anti-constant guard is inclusive: resolution exactly at the floor fails", () => {
    const at = evaluateMarketGate("SPREAD", { ...cleanSpread, resolution: 0.0029 });
    expect(at.status).toBe("FAIL");
    expect(at.reasons).toEqual([
      "resolution 0.00290 at or below the permutation floor 0.0029 — the probabilities do not discriminate (constant-in-disguise); do not publish this market",
    ]);
  });

  it("a constant-in-disguise model (resolution 0) fails on the resolution reason alone", () => {
    const v = evaluateMarketGate("SPREAD", { ...cleanSpread, ece: 0, eceDebiased: 0, resolution: 0 });
    expect(v.status).toBe("FAIL");
    expect(v.reasons).toHaveLength(1);
    expect(v.reasons[0]).toMatch(/constant-in-disguise/);
  });

  it("failure reasons accumulate in module order: ECE, debiased, Brier, reliability, resolution", () => {
    const v = evaluateMarketGate("SPREAD", {
      n: 544,
      ece: 0.09,
      eceDebiased: null,
      brier: 0.24,
      reliability: 0.09,
      resolution: 0,
      baseRate: 0.5,
    });
    expect(v.status).toBe("FAIL");
    expect(v.reasons).toHaveLength(3);
    expect(v.reasons[0]).toMatch(/^ECE /);
    expect(v.reasons[1]).toMatch(/^Murphy reliability /);
    expect(v.reasons[2]).toMatch(/^resolution /);
  });
});

describe("per-market gate characterization — strict moneyline variant", () => {
  it("strictMl swaps only the moneyline resolution floor, on a copy", () => {
    const inputs: MarketGateInputs = {
      n: 190,
      ece: 0.03,
      eceDebiased: 0.02,
      brier: 0.2,
      reliability: 0.01,
      resolution: 0.01, // above the default 0.0091 floor, below the strict 0.0126 floor
      baseRate: 0.5,
    };
    expect(evaluateMarketGate("MONEYLINE", inputs).status).toBe("PASS");
    const strict = evaluateMarketGate("MONEYLINE", inputs, { strictMl: true });
    expect(strict.status).toBe("FAIL");
    expect(strict.floors.resFloor).toBe(0.0126);
    expect(strict.floors).not.toBe(MARKET_GATE_FLOORS.MONEYLINE);
  });

  it("strictMl is ignored for non-moneyline markets (floor object identity preserved)", () => {
    const v = evaluateMarketGate("SPREAD", cleanSpread, { strictMl: true });
    expect(v.floors).toBe(MARKET_GATE_FLOORS.SPREAD);
    expect(v.status).toBe("PASS");
  });
});

describe("per-market gate characterization — defect pin", () => {
  it("DEFECT (pinned, not fixed): all-NaN metrics return PASS — no finiteness validation exists", () => {
    // Every check is a strict comparison against a floor; NaN comparisons
    // are all false, so a fully non-finite input set produces zero failure
    // reasons and a PASS verdict. The gate fails OPEN on garbage inputs.
    const v = evaluateMarketGate("SPREAD", {
      n: 500,
      ece: Number.NaN,
      eceDebiased: Number.NaN,
      brier: Number.NaN,
      reliability: Number.NaN,
      resolution: Number.NaN,
      baseRate: 0.5,
    });
    expect(v.status).toBe("PASS");
    expect(v.reasons).toEqual(["all per-market floors met at n 500"]);
  });
});
