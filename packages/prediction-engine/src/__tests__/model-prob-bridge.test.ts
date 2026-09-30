/**
 * model-prob-bridge.test.ts — proves the end-to-end path from settled history to a
 * REAL modelProb in a PickProofReceipt, and proves it REFUSES when no calibrated
 * number exists.
 *
 * The proof runs in two legs, both offline (no DB, no network):
 *
 *   LEG 1 — synthetic corpus with a KNOWN miscalibration. Confidence is drawn to
 *   predict 0.80 but the true win rate is 0.50, i.e. exactly the confidence/100
 *   lie the receipt must never commit. Asserts:
 *     - the raw confidence/100 forecast is measurably miscalibrated (it would score
 *       a much worse Brier than the calibrated map), and
 *     - the resolved modelProb is a REAL, different number that scores better,
 *     - minting a receipt with it produces a verifiable receipt whose hash covers
 *       the number, and
 *     - TAMPERING with modelProb breaks verification (the commitment is real).
 *
 *   LEG 2 — refusal. With no samples / a closed gate / an under-powered corpus, the
 *   resolver returns null and the receipt still mints as "none". This is the
 *   regression guard for the honest default.
 *
 * Brier is computed with the repo's own consumer primitive
 * (eval/edge-lab/metrics.mjs brierScore) so the leg proves the SAME number the
 * clv-report would print, not a re-implementation.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  resolveModelProb,
  MODEL_PROB_CORPUS_ORDER_BY,
  MODEL_PROB_CORPUS_WHERE,
} from "../model-prob-bridge.js";
import { buildPickProofReceipt, verifyPickProofReceipt } from "../pick-proof-receipt.js";
import { parseCanonicalPayload } from "../proof-of-record.js";
import type { CalibrationSample } from "../probability-calibration.js";
import { brierScore } from "../../../../eval/edge-lab/metrics.mjs";

const sha256Hex = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex");

/** Deterministic PRNG so the corpus is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a chronological corpus where the FORECAST is a confidence/100 proxy that
 * is confidently wrong: it averages ~0.80 while outcomes land at ~0.50.
 * `n` rows, chronological order preserved (the ladder's held-out split needs it).
 */
function buildMiscalibratedCorpus(n: number, seed = 20260930): CalibrationSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    // Forecast in [0.70, 0.90] — a confident, overconfident band.
    const p = 0.7 + rand() * 0.2;
    // Outcome is a coin flip: the forecast is systematically wrong by ~30 points.
    const y: 0 | 1 = rand() < 0.5 ? 1 : 0;
    out.push({ p, y });
  }
  return out;
}

const BASELINE_INPUT = {
  pickId: "cm0kbc9x0000",
  gameId: "2023091010",
  selection: "Chiefs -3.5",
  pickType: "SPREAD",
  line: -3.5,
  entryOdds: -110,
  marketFairProb: 0.54,
  marketFairMethodTag: "proportional_devig_v1",
  confidence: 78,
  edgeScore: 12.5,
  modelVersion: "v5.2.8",
  asOf: "2026-09-27T18:00:00.000Z",
} as const;

describe("model-prob-bridge — end-to-end path to a real modelProb", () => {
  describe("LEG 1: a genuinely miscalibrated forecast gets a real number", () => {
    const samples = buildMiscalibratedCorpus(400);
    const resolved = resolveModelProb(BASELINE_INPUT.confidence, samples, { gateOpen: true });

    it("resolves a real calibrated probability rather than refusing", () => {
      expect(resolved.refusal).toBeNull();
      expect(resolved.calibrated).toBe(true);
      expect(resolved.modelProb).not.toBeNull();
      expect(resolved.sampleSize).toBe(400);
    });

    it("does NOT simply echo confidence/100 back as the probability", () => {
      // The whole point: 78/100 = 0.78 is the fabricated number. A real calibrated
      // map fitted against a 0.50-base-rate corpus must land somewhere else.
      expect(resolved.modelProb).not.toBeCloseTo(0.78, 3);
      expect(resolved.method).not.toBe("identity");
    });

    it("the corpus really is miscalibrated, so the map is doing real work", () => {
      const probs = samples.map((s) => s.p);
      const outs = samples.map((s) => s.y);
      const observedBaseRate = outs.reduce((s, y) => s + y, 0) / outs.length;
      const predictedBaseRate = probs.reduce((s, p) => s + p, 0) / probs.length;

      // Forecast claims ~0.80; reality is ~0.50. That gap is the defect being fixed.
      expect(predictedBaseRate).toBeGreaterThan(0.75);
      expect(observedBaseRate).toBeLessThan(0.55);

      // And the calibrated number must actually beat the raw forecast on Brier,
      // measured with the repo's own consumer primitive.
      const rawBrier = brierScore(probs, outs);
      const mappedBrier = brierScore(
        probs.map((p) => resolved.modelProb as number),
        outs,
      );
      expect(mappedBrier).toBeLessThan(rawBrier);
    });

    it("mints a receipt whose hash COMMITS the real modelProb", () => {
      const receipt = buildPickProofReceipt(
        { ...BASELINE_INPUT, modelProb: resolved.modelProb },
        sha256Hex,
      );
      // The canonical payload is pipe-delimited `key=value`, keys sorted.
      expect(parseCanonicalPayload(receipt.payload).modelProb).toBe(
        String(resolved.modelProb),
      );
      // "none" must be gone — this receipt makes a probability claim.
      expect(receipt.payload).not.toContain("modelProb=none");
      expect(receipt.fields.modelProb).toBe(resolved.modelProb);
      expect(verifyPickProofReceipt(receipt, sha256Hex)).toBe(true);
    });

    it("a DIFFERENT modelProb yields a DIFFERENT hash (tamper-evident)", () => {
      const real = buildPickProofReceipt(
        { ...BASELINE_INPUT, modelProb: resolved.modelProb },
        sha256Hex,
      );
      const tampered = buildPickProofReceipt(
        { ...BASELINE_INPUT, modelProb: (resolved.modelProb as number) + 0.01 },
        sha256Hex,
      );
      expect(tampered.contentHash).not.toBe(real.contentHash);

      // And editing the committed number after the fact fails verification.
      const edited = { ...real, fields: { ...real.fields, modelProb: 0.99 } };
      expect(verifyPickProofReceipt(edited, sha256Hex)).toBe(false);
    });

    it("the receipt built with modelProb:null is a DIFFERENT commitment", () => {
      // Proves the change is not cosmetic: null and a real number are distinct
      // commitments, so old receipts keep verifying and new ones say something new.
      const none = buildPickProofReceipt({ ...BASELINE_INPUT, modelProb: null }, sha256Hex);
      const real = buildPickProofReceipt(
        { ...BASELINE_INPUT, modelProb: resolved.modelProb },
        sha256Hex,
      );
      expect(none.contentHash).not.toBe(real.contentHash);
      expect(verifyPickProofReceipt(none, sha256Hex)).toBe(true);
      expect(parseCanonicalPayload(none.payload).modelProb).toBe("none");
    });

    it("Brier over the resolved probabilities is computable — the clv-report gate opens", () => {
      // This is literally the filter eval/edge-lab/clv-report.mjs applies before it
      // will report a Brier score. With a real modelProb, the gate is satisfied.
      const picks = samples.map((s, i) => ({
        clvValue: 0,
        clvVerdict: "MATCHED_CLOSE",
        result: s.y === 1 ? "WIN" : "LOSS",
        // Each corpus row is a distinct settled pick at this pick's confidence.
        modelProb: resolveModelProb(BASELINE_INPUT.confidence, samples.slice(0, i + 1), {
          gateOpen: true,
        }).modelProb,
      }));
      const probPicks = picks.filter(
        (p) => typeof p.modelProb === "number" && (p.result === "WIN" || p.result === "LOSS"),
      );
      const brier = brierScore(
        probPicks.map((p) => p.modelProb as number),
        probPicks.map((p) => (p.result === "WIN" ? 1 : 0)),
      );
      expect(brier).toBeGreaterThan(0);
      expect(brier).toBeLessThan(1);
      // The real number is materially better than the 0.50 a coin flip would score,
      // and materially better than the raw 0.78 forecast.
      expect(brier).toBeLessThan(0.25);
    });
  });

  describe("LEG 2: honest refusal — no calibrated number means null", () => {
    it("refuses with no settled samples", () => {
      const r = resolveModelProb(78, [], { gateOpen: true });
      expect(r.modelProb).toBeNull();
      expect(r.refusal).toBe("no-settled-samples");
      expect(r.calibrated).toBe(false);
    });

    it("refuses when the audited gate is closed (default posture)", () => {
      const r = resolveModelProb(78, buildMiscalibratedCorpus(400));
      expect(r.modelProb).toBeNull();
      expect(r.refusal).toBe("gate-closed");
      // Still reports the evidence an operator needs to make the decision.
      expect(r.sampleSize).toBe(400);
    });

    it("refuses on an under-powered corpus rather than fitting noise", () => {
      const r = resolveModelProb(78, buildMiscalibratedCorpus(20), { gateOpen: true });
      expect(r.modelProb).toBeNull();
      expect(r.refusal).toBe("ladder-inactive");
      expect(r.sampleSize).toBe(20);
    });

    it("a null resolution still mints a valid, verifiable receipt as 'none'", () => {
      const r = resolveModelProb(78, [], { gateOpen: true });
      const receipt = buildPickProofReceipt({ ...BASELINE_INPUT, modelProb: r.modelProb }, sha256Hex);
      expect(parseCanonicalPayload(receipt.payload).modelProb).toBe("none");
      expect(verifyPickProofReceipt(receipt, sha256Hex)).toBe(true);
    });

    it("refuses a non-finite confidence instead of writing NaN", () => {
      const r = resolveModelProb(Number.NaN, buildMiscalibratedCorpus(400), { gateOpen: true });
      expect(r.modelProb).toBeNull();
      expect(r.refusal).toBe("non-finite-confidence");
    });
  });

  describe("corpus predicate — the settled-history query is documented once", () => {
    it("matches the learning-eligibility gate the calibrators already use", () => {
      expect(MODEL_PROB_CORPUS_WHERE).toEqual({
        result: { in: ["WIN", "LOSS"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      });
      // Chronological order is mandatory: the ladder's held-out split is time-ordered.
      expect(MODEL_PROB_CORPUS_ORDER_BY).toEqual({ settledAt: "asc" });
    });
  });
});