/**
 * THE PREDICTION COURT — tests.
 *
 * Proves the doctrine: process is graded separately from outcome, a push is never a win, a claim louder
 * than its authority is a process failure, missing odds are never imputed, and no fixture trial becomes a
 * public performance claim — with no certainty language anywhere.
 */

import { describe, it, expect } from "vitest";
import {
  gradePrediction,
  buildAllPredictionTrials,
  publicPerformanceStatus,
  computeCLV,
  type PredictionTrialInput,
} from "../prediction-court.js";

const BANNED = /\b(lock|guarantee|guaranteed|sure thing|can't lose|risk[-\s]?free|profit|locks?)\b/i;
const base: PredictionTrialInput = {
  predictionId: "x", matchId: "m", publishedAtLabel: "pre-match", market: "Total", selection: "Under 3",
  oddsAtPublish: 1.9, closingOdds: 1.85, sourceRefs: ["odds-api(fixture)"], evidenceQuality: "RICH",
  claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "WIN",
};

describe("Every trial is fully formed", () => {
  it("has result, process grade, autopsy, and lesson", () => {
    for (const t of buildAllPredictionTrials()) {
      expect(t.result).toBeTruthy();
      expect(t.processGrade).toBeTruthy();
      expect(t.autopsy.length).toBeGreaterThan(0);
      expect(t.lesson.length).toBeGreaterThan(0);
      expect(t.fixtureWatermarked).toBe(true);
    }
  });
});

describe("Process is separated from outcome", () => {
  it("a WIN on good process is DESERVED_WIN", () => {
    expect(gradePrediction(base).outcomeGrade).toBe("DESERVED_WIN");
  });
  it("a WIN on thin evidence is LUCKY_WIN (won, but not good process)", () => {
    expect(gradePrediction({ ...base, evidenceQuality: "THIN" }).outcomeGrade).toBe("LUCKY_WIN");
  });
  it("a LOSS on good process is UNLUCKY_LOSS", () => {
    expect(gradePrediction({ ...base, result: "LOSS" }).outcomeGrade).toBe("UNLUCKY_LOSS");
  });
});

describe("A push is never a win", () => {
  it("PUSH grades PUSH, not a win", () => {
    const t = gradePrediction({ ...base, result: "PUSH" });
    expect(t.outcomeGrade).toBe("PUSH");
    expect(["DESERVED_WIN", "LUCKY_WIN"]).not.toContain(t.outcomeGrade);
  });
});

describe("Authority discipline", () => {
  it("a claim louder than its ceiling is AUTHORITY_TOO_STRONG even when it wins", () => {
    const t = gradePrediction({ ...base, claimStrength: "PUBLIC_ACTION", authorityCeiling: "INFO_ONLY", result: "WIN" });
    expect(t.processGrade).toBe("AUTHORITY_TOO_STRONG");
    expect(t.authorityRespected).toBe(false);
    expect(t.outcomeGrade).toBe("LUCKY_WIN"); // it won, but the process failed
  });
  it("the fixture set contains the deliberate overclaim, flagged", () => {
    const over = buildAllPredictionTrials().find((t) => t.predictionId === "p-eg-overclaim");
    expect(over?.processGrade).toBe("AUTHORITY_TOO_STRONG");
  });
});

describe("Missing data is never imputed", () => {
  it("no odds → DATA_MISSING and CLV null", () => {
    const t = gradePrediction({ ...base, oddsAtPublish: null });
    expect(t.processGrade).toBe("DATA_MISSING");
    expect(t.clv).toBeNull();
  });
  it("no source → DATA_MISSING", () => {
    expect(gradePrediction({ ...base, sourceRefs: [] }).processGrade).toBe("DATA_MISSING");
  });
});

describe("CLV", () => {
  it("beating the close yields positive CLV", () => {
    expect(computeCLV(1.9, 1.8)!).toBeGreaterThan(0);
    expect(computeCLV(1.8, 1.9)!).toBeLessThan(0);
    expect(computeCLV(null, 1.8)).toBeNull();
  });
});

describe("No fixture trial becomes a public performance claim", () => {
  it("publicPerformanceStatus is never a performance claim", () => {
    const s = publicPerformanceStatus(buildAllPredictionTrials());
    expect(s.isPublicPerformanceClaim).toBe(false);
    for (const t of buildAllPredictionTrials()) expect(t.countsAsPublicPerformance).toBe(false);
  });
});

describe("Brand safety", () => {
  it("no certainty language in any trial text", () => {
    for (const t of buildAllPredictionTrials()) {
      for (const text of [t.autopsy, t.lesson, t.whatChanged, t.memoryWrite]) {
        expect(BANNED.test(text)).toBe(false);
      }
    }
  });
});
