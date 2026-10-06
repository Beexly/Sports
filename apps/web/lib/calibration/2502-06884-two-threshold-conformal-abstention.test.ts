import { describe, expect, it } from "vitest";

import {
  ENABLED,
  RL_TUNING_REJECTED,
  calibrateMarketThresholds,
  conformalThreshold,
  meetsGate,
  triage,
  triageSlate,
} from "@/lib/calibration/2502-06884-two-threshold-conformal-abstention";

describe("two-threshold conformal abstention", () => {
  it("is disabled by default; RL tuning rejected", () => {
    expect(ENABLED).toBe(false);
    expect(RL_TUNING_REJECTED).toBe(true);
  });

  it("triage splits into post/review/abstain bands", () => {
    const t = { market: "spread" as const, alpha: 0.1, betaLow: 0.3, betaHigh: 0.7 };
    expect(triage(0.1, t)).toBe("post");
    expect(triage(0.5, t)).toBe("review");
    expect(triage(0.9, t)).toBe("abstain");
  });

  it("calibrated thresholds respect the abstention budget", () => {
    const calib = Array.from({ length: 200 }, (_, i) => i / 200);
    const t = calibrateMarketThresholds("total", calib, 0.1, 0.15, 0.1);
    expect(t.betaLow).toBeLessThanOrEqual(t.betaHigh);
    expect(t.betaHigh).toBeGreaterThan(0.8);
  });

  it("market-conditional triage recovers picks a global threshold would drop", () => {
    // Moneyline underdogs: higher uncertainty geometry -> looser high threshold.
    const thresholds = {
      spread: { market: "spread" as const, alpha: 0.1, betaLow: 0.2, betaHigh: 0.5 },
      total: { market: "total" as const, alpha: 0.1, betaLow: 0.2, betaHigh: 0.5 },
      moneyline: { market: "moneyline" as const, alpha: 0.1, betaLow: 0.3, betaHigh: 0.8 },
    };
    const slate = [
      { market: "moneyline" as const, u: 0.6 },
      { market: "moneyline" as const, u: 0.65 },
      { market: "spread" as const, u: 0.6 },
    ];
    const res = triageSlate(slate, thresholds);
    // moneyline 0.6/0.65 -> review (not abstain); spread 0.6 -> abstain.
    expect(res.abstained).toBe(1);
    expect(res.coverage).toBeCloseTo(2 / 3, 10);
  });

  it("gate requires coverage >= 90% and abstention <= 25%", () => {
    expect(meetsGate({ posted: 90, review: 5, abstained: 5, coverage: 0.95, abstentionRate: 0.05 })).toBe(true);
    expect(meetsGate({ posted: 80, review: 5, abstained: 15, coverage: 0.85, abstentionRate: 0.15 })).toBe(false);
  });

  it("conformalThreshold is finite-sample corrected", () => {
    const c = Array.from({ length: 100 }, (_, i) => i);
    expect(conformalThreshold(c, 0.1)).toBe(90); // ceil(0.9*101)=91 -> index 90
  });
});
