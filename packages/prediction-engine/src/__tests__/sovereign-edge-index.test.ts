import { describe, it, expect } from "vitest";
import {
  sovereignEdgeIndex,
  SOVEREIGN_MIN_CLV_SAMPLE,
  type SovereignEdgeInput,
} from "../sovereign-edge-index.js";

/** A fully-qualifying ATTACK input — reused as the base for negative cases. */
const ATTACKABLE: SovereignEdgeInput = {
  edge: { decision: "SPEAK", shrunkEdge: 0.04, expectedClv: 0.04, agreement: "CONFIRMS" },
  calibration: { calibrated: true, ece: 0.02 },
  calibratedProbability: 0.7,
  clvBeatRate: 0.6,
  clvSampleSize: SOVEREIGN_MIN_CLV_SAMPLE + 5,
  americanPrice: -110,
  uncertainty: 0.1,
  volatility: 0.1,
};

describe("sovereignEdgeIndex — shadow index invariants", () => {
  it("is always weight 0 (decision-support only, never priced)", () => {
    expect(sovereignEdgeIndex(ATTACKABLE).weight).toBe(0);
    expect(sovereignEdgeIndex({ ...ATTACKABLE, calibration: { calibrated: false } }).weight).toBe(0);
  });

  it("returns ATTACK only when calibration is active and every bar clears", () => {
    const r = sovereignEdgeIndex(ATTACKABLE);
    expect(r.label).toBe("ATTACK");
    expect(r.components.length).toBeGreaterThan(0);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});

describe("sovereignEdgeIndex — THE honesty cap: uncalibrated can never ATTACK", () => {
  it("calibration inactive (the live reality) caps at WATCH even with a SPEAK edge", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      calibration: { calibrated: false },
      calibratedProbability: null,
    });
    expect(r.label).toBe("WATCH");
    expect(r.label).not.toBe("ATTACK");
    expect(r.reasons.join(" ")).toMatch(/INACTIVE|uncalibrated|CANNOT return ATTACK/i);
  });

  it("calibrated flag set but probability missing/out-of-range → NEEDS_REVIEW, never ATTACK", () => {
    const rawScore = sovereignEdgeIndex({
      ...ATTACKABLE,
      calibration: { calibrated: true },
      calibratedProbability: 70, // a raw 0–100 score must never be read as a probability
    });
    expect(rawScore.label).toBe("NEEDS_REVIEW");
    expect(rawScore.label).not.toBe("ATTACK");

    expect(
      sovereignEdgeIndex({ ...ATTACKABLE, calibratedProbability: 1.5 }).label,
    ).not.toBe("ATTACK");
    expect(
      sovereignEdgeIndex({ ...ATTACKABLE, calibratedProbability: Number.NaN }).label,
    ).not.toBe("ATTACK");
  });

  it("no calibration input ever yields ATTACK across edge strengths", () => {
    for (const decision of ["SPEAK", "LEAN"] as const) {
      const r = sovereignEdgeIndex({
        ...ATTACKABLE,
        edge: { ...ATTACKABLE.edge, decision },
        calibration: { calibrated: false },
        calibratedProbability: undefined,
      });
      expect(r.label).not.toBe("ATTACK");
    }
  });
});

describe("sovereignEdgeIndex — hard disqualifiers and boundaries", () => {
  it("edge PASS → PASS (the honest default), regardless of calibration", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      edge: { ...ATTACKABLE.edge, decision: "PASS" },
    });
    expect(r.label).toBe("PASS");
  });

  it("an independent referee siding with the market → CHANGE_MARKET", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      edge: { ...ATTACKABLE.edge, agreement: "CONTRADICTS" },
    });
    expect(r.label).toBe("CHANGE_MARKET");
  });

  it("calibrated probability below the price's break-even → NO_BET", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      americanPrice: -300, // break-even 75%
      calibratedProbability: 0.6,
    });
    expect(r.label).toBe("NO_BET");
    expect(r.breakEven).toBeGreaterThan(0.7);
  });

  it("price-specific break-even: a heavy favorite needs a higher floor", () => {
    // 0.7 clears -110 break-even but not the -300 break-even (0.75).
    const fav = sovereignEdgeIndex({ ...ATTACKABLE, americanPrice: -300 });
    expect(fav.label).toBe("NO_BET");
  });

  it("calibrated, clears break-even, but below the conviction floor → WATCH (not ATTACK)", () => {
    const r = sovereignEdgeIndex({ ...ATTACKABLE, calibratedProbability: 0.55 });
    expect(r.label).toBe("WATCH");
  });

  it("calibrated SPEAK edge but high volatility → WAIT", () => {
    const r = sovereignEdgeIndex({ ...ATTACKABLE, volatility: 0.9 });
    expect(r.label).toBe("WAIT");
  });

  it("calibrated SPEAK edge but a thin/weak CLV record holds it at WAIT", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      clvBeatRate: 0.51,
      clvSampleSize: SOVEREIGN_MIN_CLV_SAMPLE - 5,
    });
    expect(r.label).toBe("WAIT");
  });

  it("calibrated, clears the floor, but edge is only LEAN → WATCH", () => {
    const r = sovereignEdgeIndex({
      ...ATTACKABLE,
      edge: { ...ATTACKABLE.edge, decision: "LEAN" },
    });
    expect(r.label).toBe("WATCH");
  });
});
