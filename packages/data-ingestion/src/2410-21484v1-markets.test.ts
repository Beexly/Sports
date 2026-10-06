/**
 * Tests for ./2410-21484v1-markets (arXiv:2410.21484v1, lane=markets).
 *
 * ACCEPTANCE GATE: For the review as evidence: REJECT as a source of conclusions (narrative, unverified, no pooling) — accept only as a pointer list. Promote a cited primary paper to deep-read only if it is retrievable and contains an auditable experiment.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2410-21484v1-markets";

describe("2410.21484v1 review evidence and forecast diagnostics", () => {
  it("keeps the review as a pointer list", () => {
    const result = mod.buildReviewPointerList([
      { id: "primary-good", retrievable: true, primary: true, auditableExperiment: true },
      { id: "review", retrievable: true, primary: false, auditableExperiment: true },
      { id: "missing", retrievable: false, primary: true, auditableExperiment: true },
    ]);
    expect(result.studyIds).toEqual(["primary-good"]);
    expect(result.conclusionsAllowed).toBe(false);
    expect(mod.ENABLED).toBe(false);
  });

  it("pools only auditable studies and trims the ROI distribution", () => {
    const summary = mod.poolReportedRoi([
      { id: "a", retrievable: true, primary: true, auditableExperiment: true, reportedRoi: -0.2 },
      { id: "b", retrievable: true, primary: true, auditableExperiment: true, reportedRoi: 0.1 },
      { id: "c", retrievable: true, primary: true, auditableExperiment: true, reportedRoi: 0.2 },
      { id: "d", retrievable: true, primary: true, auditableExperiment: true, reportedRoi: 0.8 },
      { id: "e", retrievable: true, primary: false, auditableExperiment: true, reportedRoi: 9 },
    ], 0.25);
    expect(summary?.n).toBe(4);
    expect(summary?.rawMean).toBeCloseTo(0.225, 10);
    expect(summary?.publicationBiasAdjustedMean).toBeCloseTo(0.15, 10);
    expect(summary?.median).toBeCloseTo(0.15, 10);
    expect(summary?.trimmedCount).toBe(2);
    expect(mod.poolReportedRoi([], 0.1)).toBeNull();
  });

  it("keeps odd- and even-sized medians correct", () => {
    const study = (id: string, reportedRoi: number) => ({
      id,
      retrievable: true,
      primary: true,
      auditableExperiment: true,
      reportedRoi,
    });
    expect(mod.poolReportedRoi([study("odd-1", 0.2)])?.median).toBeCloseTo(0.2, 10);
    expect(mod.poolReportedRoi([
      study("odd-3-a", -0.2),
      study("odd-3-b", 0.1),
      study("odd-3-c", 0.2),
    ])?.median).toBeCloseTo(0.1, 10);
    expect(mod.poolReportedRoi([
      study("even-2-a", 0.1),
      study("even-2-b", 0.3),
    ])?.median).toBeCloseTo(0.2, 10);
    expect(mod.poolReportedRoi([
      study("even-4-a", -0.2),
      study("even-4-b", 0.1),
      study("even-4-c", 0.2),
      study("even-4-d", 0.8),
    ])?.median).toBeCloseTo(0.15, 10);
  });

  it("computes calibration and accuracy metrics without allowing a review conclusion", () => {
    const skill = mod.evaluateForecastSkill([0.8, 0.2], [1, 0]);
    expect(skill?.brier).toBeCloseTo(0.04, 10);
    expect(skill?.logLoss).toBeGreaterThan(0);
    expect(skill?.accuracy).toBe(1);
    expect(mod.evaluateForecastSkill([0.8], [0, 1])).toBeNull();
  });
});
