import { describe, it, expect } from "vitest";
import {
  edgeAssessmentToSyntheticSignal,
  clvGradeToSyntheticSignal,
  calibrationCurveToGenesisResult,
  pickSignalSnapshotToGenesisReceipt,
  type GenesisAdapterContext,
} from "../data-genesis-adapter.js";
import { assessEdge } from "../edge-engine.js";
import { reliabilityCurve, type CalibrationSample } from "../probability-calibration.js";
import type { ClvGrade } from "../clv-capture.js";
import type { PickSignalSnapshotData } from "../signal-snapshot.js";
import { isReceiptValid } from "@sports/data-genesis";

/** Deterministic test hash (FNV-1a). PRODUCTION injects a real sha256. */
function testHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const ctx: GenesisAdapterContext = {
  engineVersion: "prediction-engine@test",
  generatedAt: "2026-06-26T00:00:00.000Z",
  modelVersion: "v-test",
  sport: "NFL",
  eventId: "game-123",
};

describe("data-genesis adapter — shadow wrapping of engine outputs", () => {
  it("wraps an EdgeAssessment as a draft, receipted SyntheticSignal", () => {
    const edge = assessEdge({
      marketFairProb: 0.5,
      independents: [
        { source: "poisson", prob: 0.58 },
        { source: "kalshi", prob: 0.57 },
      ],
      evidenceScore: 80,
    });
    const signal = edgeAssessmentToSyntheticSignal(edge, ctx, testHash);
    expect(signal.domain).toBe("edge");
    expect(signal.validationStatus).toBe("draft"); // shadow — never born promoted
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
    expect(signal.uncertainty).toBeGreaterThanOrEqual(0);
    expect(signal.uncertainty).toBeLessThanOrEqual(1);
    expect(isReceiptValid(signal.receipt)).toBe(true);
    expect(signal.receipt.synthetic).toBe(true);
    expect(signal.tags).toContain("shadow");
  });

  it("the receipt is deterministic for the same edge + context", () => {
    const edge = assessEdge({ marketFairProb: 0.5, independents: [{ source: "poisson", prob: 0.6 }], evidenceScore: 70 });
    const a = edgeAssessmentToSyntheticSignal(edge, ctx, testHash);
    const b = edgeAssessmentToSyntheticSignal(edge, ctx, testHash);
    expect(a.receipt.receiptId).toBe(b.receipt.receiptId);
    expect(a.receipt.outputHash).toBe(b.receipt.outputHash);
  });

  it("wraps a ClvGrade as a draft SyntheticSignal", () => {
    const clv: ClvGrade = { kind: "POINTS", value: 1.5, verdict: "BEAT_CLOSE", closeLine: -2.5, closePrice: null };
    const signal = clvGradeToSyntheticSignal(clv, ctx, testHash);
    expect(signal.domain).toBe("clv");
    expect(signal.validationStatus).toBe("draft");
    expect(signal.tags).toContain("BEAT_CLOSE");
    expect(isReceiptValid(signal.receipt)).toBe(true);
  });

  it("converts a prediction-engine reliability curve into a Genesis CalibrationCurveResult (reuse, not recompute)", () => {
    const samples: CalibrationSample[] = [];
    for (let i = 0; i < 200; i++) samples.push({ p: 0.7, y: (i < 140 ? 1 : 0) as 0 | 1 });
    const bins = reliabilityCurve(samples, 10);
    const result = calibrationCurveToGenesisResult(bins, samples.length, { sport: "NFL", eventId: "agg" });
    expect(result.totalSamples).toBe(200);
    expect(result.expectedCalibrationError).toBeCloseTo(0, 5); // 70% at p=0.7 is well-calibrated
    expect(result.curveId.startsWith("curve:")).toBe(true);
    expect(result.points.length).toBe(bins.length);
  });

  it("builds a valid GenesisReceipt over a PickSignalSnapshot", () => {
    const snapshot = {
      pickId: "pick-1",
      gameId: "game-123",
      hadOddsSignal: true,
      hadLineMovementSignal: false,
      hadRestSignal: false,
      hadScheduleSignal: false,
      hadAtsFormSignal: false,
      hadH2HSignal: false,
      hadVenueSignal: false,
      hadWeatherSignal: false,
      hadInjurySignal: false,
      hadRatingsSignal: false,
      hadPlayerSignal: false,
      hadOfficialsSignal: false,
      hadVenueEnvironmentSignal: false,
      hadPaceSignal: false,
      hadMilestoneSignal: false,
      bookmakerCount: 7,
      dataQualityScore: 88,
      confidenceAtPrediction: 64,
      lineMovementDelta: null,
      restAdvantageNet: null,
      atsFormSampleSize: null,
      h2hSampleSize: null,
      scheduleDensityHome: null,
      scheduleDensityAway: null,
      isBootstrap: false,
      usedDerivedHistory: false,
      usedScheduleSignal: false,
      modelVersion: "v-test",
    } satisfies PickSignalSnapshotData;
    const receipt = pickSignalSnapshotToGenesisReceipt(snapshot, ctx, testHash);
    expect(isReceiptValid(receipt)).toBe(true);
    expect(receipt.sourceRefs).toContain("pick-1");
    expect(receipt.modelVersion).toBe("v-test");
  });
});
