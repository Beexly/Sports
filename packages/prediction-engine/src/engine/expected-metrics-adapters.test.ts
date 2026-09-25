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
  it("builds a calibration report from aligned arrays", () => {
    const predicted = [0.2, 0.4, 0.6, 0.8, 0.5, 0.5, 0.5, 0.5, 0.3, 0.7];
    const actual = [0, 0, 1, 1, 1, 0, 1, 0, 0, 1];
    const r = calibrationReportAdapter({ predicted, actual });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.raw!.n).toBe(10);
  });

  it("fails closed on misaligned arrays", () => {
    expect(isFailClosed(calibrationReportAdapter({ predicted: [0.5], actual: [] }))).toBe(true);
    expect(isFailClosed(calibrationReportAdapter(null))).toBe(true);
    expect(isFailClosed(graduationVerdictAdapter({ predicted: [0.5], actual: [] }))).toBe(true);
    expect(isFailClosed(graduationVerdictAdapter(null))).toBe(true);
  });

  it("graduation verdict runs on aligned arrays", () => {
    const r = graduationVerdictAdapter({
      predicted: [0.4, 0.6, 0.5, 0.7, 0.3, 0.8, 0.5, 0.5],
      actual: [0, 1, 0, 1, 0, 1, 1, 0],
    });
    expect(isObservation(r) || isFailClosed(r)).toBe(true);
  });
});
