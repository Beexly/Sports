import { describe, it, expect } from "vitest";
import {
  convictionTier,
  summarizeConviction,
  BREAK_EVEN_PROBABILITY,
  CONVICTION_MIN_PROBABILITY,
  CONVICTION_MIN_CLV_BEAT_RATE,
  CONVICTION_MIN_CLV_SAMPLE,
  type ConvictionInput,
  type ConvictionResult,
} from "../conviction-tier.js";

/** A pick that clears every conviction bar — reused as the base for negative cases. */
const QUALIFYING: ConvictionInput = {
  calibratedProbability: 0.7,
  edgeDecision: "SPEAK",
  clvBeatCloseRate: 0.6,
  clvSampleSize: 25,
};

describe("convictionTier", () => {
  it("exposes honest, documented thresholds", () => {
    expect(BREAK_EVEN_PROBABILITY).toBeCloseTo(0.524, 3);
    expect(CONVICTION_MIN_PROBABILITY).toBe(0.65);
    expect(CONVICTION_MIN_CLV_BEAT_RATE).toBe(0.5);
    expect(CONVICTION_MIN_CLV_SAMPLE).toBe(20);
  });

  it("awards CONVICTION only when calibrated P, SPEAK edge, and a real CLV record all clear the bar", () => {
    const r = convictionTier(QUALIFYING);
    expect(r.tier).toBe("CONVICTION");
    expect(r.meetsConvictionBar).toBe(true);
    expect(r.reasons).toHaveLength(0);
    expect(r.expectedWinRate).toBeCloseTo(0.7, 5);
    expect(r.breakEven).toBeCloseTo(BREAK_EVEN_PROBABILITY, 5);
  });

  it("REJECTS an out-of-range probability instead of clamping it (raw 0–100 score guard)", () => {
    const rawScore = convictionTier({ ...QUALIFYING, calibratedProbability: 70 });
    expect(rawScore.tier).toBe("PASS");
    expect(rawScore.expectedWinRate).toBe(0);
    expect(rawScore.reasons.join(" ")).toMatch(/outside \[0,1\] — treating as uncalibrated/);

    expect(convictionTier({ ...QUALIFYING, calibratedProbability: 1.5 }).expectedWinRate).toBe(0);
    expect(convictionTier({ ...QUALIFYING, calibratedProbability: -0.2 }).tier).toBe("PASS");
    expect(convictionTier({ ...QUALIFYING, calibratedProbability: Number.NaN }).tier).toBe("PASS");
  });

  it("requires a MINIMUM CLV sample — one lucky graded pick cannot certify conviction", () => {
    const onePick = convictionTier({ ...QUALIFYING, clvBeatCloseRate: 1, clvSampleSize: 1 });
    expect(onePick.tier).toBe("LEAN");
    expect(onePick.reasons.join(" ")).toMatch(/sample 1 is below the minimum 20/);

    // Rate present but sample size omitted → treated as 0 → blocked.
    const noSample = convictionTier({
      calibratedProbability: 0.7,
      edgeDecision: "SPEAK",
      clvBeatCloseRate: 0.9,
    });
    expect(noSample.meetsConvictionBar).toBe(false);
    expect(noSample.reasons.join(" ")).toMatch(/sample 0 is below the minimum 20/);
  });

  it("uses the PRICE-SPECIFIC break-even for moneylines (a -200 favorite needs ~66.7%)", () => {
    const favShort = convictionTier({ ...QUALIFYING, calibratedProbability: 0.65, americanPrice: -200 });
    expect(favShort.breakEven).toBeCloseTo(0.667, 2);
    expect(favShort.tier).toBe("PASS"); // 0.65 < 0.667 break-even → not even playable
    expect(favShort.reasons.join(" ")).toMatch(/below the conviction floor/);

    const favOk = convictionTier({ ...QUALIFYING, calibratedProbability: 0.7, americanPrice: -200 });
    expect(favOk.tier).toBe("CONVICTION"); // 0.70 ≥ 0.667
  });

  it("drops to LEAN when probability is below the conviction floor but above break-even", () => {
    const r = convictionTier({ ...QUALIFYING, calibratedProbability: 0.6 });
    expect(r.tier).toBe("LEAN");
    expect(r.meetsConvictionBar).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/below the conviction floor/);
  });

  it("a LEAN edge cannot reach CONVICTION (needs SPEAK)", () => {
    const r = convictionTier({ ...QUALIFYING, calibratedProbability: 0.72, edgeDecision: "LEAN" });
    expect(r.tier).toBe("LEAN");
    expect(r.reasons.join(" ")).toMatch(/needs SPEAK/);
  });

  it("a PASS edge is always PASS — no independent edge, no opinion", () => {
    const r = convictionTier({ ...QUALIFYING, calibratedProbability: 0.8, edgeDecision: "PASS" });
    expect(r.tier).toBe("PASS");
    expect(r.reasons.join(" ")).toMatch(/PASS/);
  });

  it("missing CLV history blocks CONVICTION (no claim without proof we beat the close)", () => {
    const nullClv = convictionTier({ ...QUALIFYING, clvBeatCloseRate: null });
    expect(nullClv.tier).toBe("LEAN");
    expect(nullClv.reasons.join(" ")).toMatch(/no closing-line-value history/);
  });

  it("a weak CLV beat-rate blocks CONVICTION", () => {
    const r = convictionTier({ ...QUALIFYING, clvBeatCloseRate: 0.4 });
    expect(r.tier).toBe("LEAN");
    expect(r.reasons.join(" ")).toMatch(/beat-rate/);
  });

  it("below break-even is PASS even with a SPEAK edge (not playable)", () => {
    const r = convictionTier({ ...QUALIFYING, calibratedProbability: 0.5 });
    expect(r.tier).toBe("PASS");
  });

  it("summarizeConviction tallies a slate across tiers", () => {
    const results: ConvictionResult[] = [
      convictionTier(QUALIFYING), // CONVICTION
      convictionTier({ ...QUALIFYING, calibratedProbability: 0.6 }), // LEAN
      convictionTier({ ...QUALIFYING, calibratedProbability: 0.5, edgeDecision: "PASS" }), // PASS
    ];
    expect(summarizeConviction(results)).toEqual({ conviction: 1, lean: 1, pass: 1 });
  });
});
