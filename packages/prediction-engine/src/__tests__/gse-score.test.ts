import { describe, expect, it } from "vitest";
import {
  computeGseScore,
  provenanceCredibility,
  provenanceMultiplier,
  gsePublishTier,
  buildGseScoreCard,
  GSE_SCORE_VERSION,
  type GseProvenanceInput,
} from "../gse-score.js";

const PROVEN: GseProvenanceInput = {
  hasProofReceipt: true,
  inPublishedSlateCommitment: true,
  isCanonical: true,
  withinFreshnessSLA: true,
};
const RECEIPT_ONLY: GseProvenanceInput = {
  hasProofReceipt: true,
  inPublishedSlateCommitment: false,
  isCanonical: false,
  withinFreshnessSLA: false,
};
const NONE: GseProvenanceInput = {
  hasProofReceipt: false,
  inPublishedSlateCommitment: false,
  isCanonical: false,
  withinFreshnessSLA: false,
};

describe("GSE Score — confidence with a provenance haircut", () => {
  it("a fully proven pick keeps its full confidence (M = 1.0)", () => {
    expect(provenanceCredibility(PROVEN)).toBeCloseTo(1, 6);
    expect(provenanceMultiplier(PROVEN)).toBeCloseTo(1, 6);
    expect(computeGseScore(78, PROVEN)).toBe(78);
    expect(computeGseScore(50, PROVEN)).toBe(50);
  });

  it("an unproven pick is discounted to the 0.80 floor", () => {
    expect(provenanceCredibility(NONE)).toBe(0);
    expect(provenanceMultiplier(NONE)).toBeCloseTo(0.8, 6);
    expect(computeGseScore(78, NONE)).toBe(62); // round(78 × 0.80) = round(62.4)
  });

  it("partial provenance lands between the floor and full credit", () => {
    expect(provenanceCredibility(RECEIPT_ONLY)).toBeCloseTo(0.34, 6);
    expect(provenanceMultiplier(RECEIPT_ONLY)).toBeCloseTo(0.868, 6);
    expect(computeGseScore(78, RECEIPT_ONLY)).toBe(68); // round(78 × 0.868) = round(67.7)
  });

  it("credibility is capped at 1.0 and the score never exceeds confidence", () => {
    for (const conf of [0, 1, 49, 50, 70, 85, 100]) {
      expect(computeGseScore(conf, PROVEN)).toBeLessThanOrEqual(conf);
      expect(computeGseScore(conf, NONE)).toBeLessThanOrEqual(conf);
    }
    // Out-of-range confidence is clamped before the haircut.
    expect(computeGseScore(140, PROVEN)).toBe(100);
    expect(computeGseScore(-5, PROVEN)).toBe(0);
  });

  it("publish tier mirrors the engine floors", () => {
    expect(gsePublishTier(49)).toBe("UNPUBLISHED");
    expect(gsePublishTier(50)).toBe("FREE");
    expect(gsePublishTier(69)).toBe("FREE");
    expect(gsePublishTier(70)).toBe("PREMIUM");
  });
});

describe("GSE Score Card — the flagship plus the context it travels with", () => {
  // Worked example also printed verbatim in docs/compendium/GSE_SYSTEM_COMPENDIUM.md §1.
  const pick = {
    confidence: 78,
    edgeScore: 64,
    pickGrade: "SOLID_PLAY" as const,
    riskLevel: "MODERATE" as const,
    modelVersion: "v5.0.0",
  };

  it("packages confidence, Edge Index, grade, risk, proof, and versions", () => {
    const card = buildGseScoreCard({
      pick,
      provenance: PROVEN,
      proof: { receiptHash: "abc123", slateRoot: "root99", clvVerdict: null, calibrated: false },
    });
    expect(card.gseScore).toBe(78);
    expect(card.confidence).toBe(78);
    expect(card.edgeIndex).toBe(64);
    expect(card.grade).toBe("SOLID_PLAY");
    expect(card.riskLevel).toBe("MODERATE");
    expect(card.publishTier).toBe("PREMIUM");
    expect(card.credibility).toBeCloseTo(1, 6);
    expect(card.multiplier).toBeCloseTo(1, 6);
    expect(card.proof.receiptHash).toBe("abc123");
    expect(card.proof.slateRoot).toBe("root99");
    expect(card.proof.calibrated).toBe(false);
    expect(card.scoreVersion).toBe(GSE_SCORE_VERSION);
    expect(card.modelVersion).toBe("v5.0.0");
  });

  it("the same pick scores 68 receipt-only and 62 unproven (the doc's worked example)", () => {
    expect(buildGseScoreCard({ pick, provenance: RECEIPT_ONLY }).gseScore).toBe(68);
    expect(buildGseScoreCard({ pick, provenance: NONE }).gseScore).toBe(62);
  });

  it("defaults proof fields to a clean, honest empty state", () => {
    const card = buildGseScoreCard({ pick, provenance: NONE });
    expect(card.proof).toEqual({
      receiptHash: null,
      slateRoot: null,
      clvVerdict: null,
      calibrated: false,
    });
  });
});
