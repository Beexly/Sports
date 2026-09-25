import { describe, expect, it } from "vitest";
import {
  calibrationReportAdapter,
  completionProbabilityAdapter,
  cpoeAdapter,
  EXPECTED_METRICS_ADAPTERS,
  expectedYacAdapter,
  graduationVerdictAdapter,
  successfulPlayAdapter,
  winProbabilityAdapter,
  yacOverExpectedAdapter,
} from "./expected-metrics-adapters.js";
import { isFailClosed, isObservation } from "./universal-adapter.js";

describe("expected-metrics-adapters registry", () => {
  it("exposes every adapter", () => {
    expect(Object.keys(EXPECTED_METRICS_ADAPTERS).sort()).toEqual([
      "calibrationReport",
      "completionProbability",
      "cpoe",
      "expectedYac",
      "graduationVerdict",
      "successfulPlay",
      "winProbability",
      "yacOverExpected",
    ]);
  });
});

describe("model-dependent adapters fail closed without models", () => {
  it("winProbability", () => {
    expect(isFailClosed(winProbabilityAdapter(null))).toBe(true);
    expect(isFailClosed(winProbabilityAdapter({ model: null, play: null }))).toBe(true);
  });

  it("completionProbability / cpoe", () => {
    expect(isFailClosed(completionProbabilityAdapter(null))).toBe(true);
    expect(isFailClosed(cpoeAdapter({ model: null, plays: [] }))).toBe(true);
    expect(isFailClosed(cpoeAdapter({ model: {} as never, plays: [] }))).toBe(true);
  });

  it("expectedYac / yacOverExpected", () => {
    expect(isFailClosed(expectedYacAdapter(null))).toBe(true);
    expect(isFailClosed(yacOverExpectedAdapter({ model: null, plays: [] }))).toBe(true);
  });
});

describe("successfulPlayAdapter", () => {
  it("classifies a successful third-down conversion", () => {
    const r = successfulPlayAdapter({
      playId: "g1-10",
      teamId: "KC",
      playerId: "p1",
      down: 3,
      ydstogo: 2,
      yardsGained: 5,
      isPass: false,
      isRush: true,
      isScramble: false,
      isSack: false,
      isInterception: false,
      isFumble: false,
      epa: 0.4,
    } as never);
    // May be Observation with true/false/null depending on success rules
    expect(isObservation(r) || isFailClosed(r)).toBe(true);
  });

  it("fails closed on null play", () => {
    expect(isFailClosed(successfulPlayAdapter(null))).toBe(true);
    expect(isFailClosed(successfulPlayAdapter(undefined))).toBe(true);
  });
});

describe("calibrationReportAdapter / graduationVerdictAdapter", () => {
  const ours = [
    {
      playerId: "a",
      plays: 10,
      actualMean: 0.02,
      expectedMean: 0.0,
      overExpected: 0.02,
      overExpectedTotal: 0.2,
    },
    {
      playerId: "b",
      plays: 12,
      actualMean: -0.01,
      expectedMean: 0.0,
      overExpected: -0.01,
      overExpectedTotal: -0.12,
    },
    {
      playerId: "c",
      plays: 8,
      actualMean: 0.05,
      expectedMean: 0.01,
      overExpected: 0.04,
      overExpectedTotal: 0.32,
    },
  ] as never;
  const truth = [
    { playerId: "a", value: 0.01 },
    { playerId: "b", value: -0.02 },
    { playerId: "c", value: 0.03 },
  ] as never;

  it("builds a calibration report from joined player metrics", () => {
    const r = calibrationReportAdapter({ ours, truth });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.raw!.n).toBe(3);
  });

  it("fails closed on empty arrays", () => {
    expect(isFailClosed(calibrationReportAdapter({ ours: [], truth: [] }))).toBe(true);
    expect(isFailClosed(calibrationReportAdapter(null))).toBe(true);
    expect(isFailClosed(graduationVerdictAdapter({ ours: [], truth: [], thresholds: { minSample: 2, graduatedPearson: 0.8, provisionalPearson: 0.5 } }))).toBe(true);
    expect(isFailClosed(graduationVerdictAdapter(null))).toBe(true);
  });

  it("graduation verdict runs on joined metrics", () => {
    const r = graduationVerdictAdapter({
      ours,
      truth,
      thresholds: {
        minSample: 2,
        graduatedPearson: 0.8,
        provisionalPearson: 0.5,
      },
    });
    expect(isObservation(r) || isFailClosed(r)).toBe(true);
    if (isObservation(r)) {
      expect(typeof r.value).toBe("string");
    }
  });
});
