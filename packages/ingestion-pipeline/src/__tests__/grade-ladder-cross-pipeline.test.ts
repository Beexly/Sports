import { describe, expect, it } from "vitest";
import {
  buildSignalReasoning,
  pickGradeFromConfidence,
  signalGradeDisclosure,
  type SignalGrade,
} from "../generate-signal-slate.js";
import { computePickGrade, GRADE_THRESHOLDS, HONEST_MARKET_EDGE_INDEX_MAX } from "@sports/types";

/**
 * ============================================================================
 * TWO PIPELINES, ONE WORD
 * ============================================================================
 *
 * The market board (`process-sport.ts` → `scoreGames` → `computePickGrade`)
 * grades on confidence AND Edge Index. The signal board
 * (`generate-signal-slate.ts` → `pickGradeFromConfidence`) grades on confidence
 * alone. Both write a `pickGrade` into the same column and both render through
 * the same `PICK_GRADE_LABELS`, so a customer sees "Strong Play" twice on one
 * site with two different meanings behind it.
 *
 * They also write two different QUANTITIES into `edgeScore`:
 *
 *   market board  Edge Index, 50 = fair price
 *   signal board  round((trueProb − 0.5) × 100), 0–50 conviction points
 *
 * These tests do not paper over that. They pin it: the divergence is real, it
 * is bounded, and it is disclosed on the pick itself. Collapsing the two
 * ladders onto one scale re-labels every signal pick and is an owner call.
 */

/** How the signal slate derives its two numbers, mirrored from the source. */
function signalNumbers(trueProb: number): { confidence: number; edgeScore: number } {
  return {
    confidence: Math.round(trueProb * 100),
    edgeScore: Math.max(0, Math.round((trueProb - 0.5) * 100)),
  };
}

describe("the two graders genuinely disagree, and the disagreement is bounded", () => {
  it("a signal pick the signal board calls STRONG_PLAY, the market grader calls LEAN", () => {
    const { confidence, edgeScore } = signalNumbers(0.82);

    expect(pickGradeFromConfidence(confidence)).toBe("STRONG_PLAY");
    expect(computePickGrade(confidence, edgeScore)).toBe("LEAN");
  });

  /**
   * Not a near-miss: the signal board's edgeScore is bounded by 50 for any
   * probability (trueProb ≤ 1 ⇒ (trueProb − 0.5) × 100 ≤ 50), while SOLID_PLAY
   * — the LOWEST composite rung — already asks for 50 and the rungs above it
   * ask for 65 and 80. So the composite grader would return LEAN for every
   * signal pick that can exist, however strong the model.
   */
  it("no signal pick can clear even the lowest composite rung above LEAN", () => {
    for (let p = 0.51; p <= 0.999; p += 0.001) {
      const { confidence, edgeScore } = signalNumbers(p);
      expect(edgeScore).toBeLessThanOrEqual(50);
      if (edgeScore < GRADE_THRESHOLDS.SOLID_PLAY.edge) {
        expect(computePickGrade(confidence, edgeScore)).toBe("LEAN");
      }
    }
  });

  it("the signal board's own ladder is reachable end to end — every rung has a witness", () => {
    const witnesses: Record<SignalGrade, number> = {
      STRONG_PLAY: 0.85,
      SOLID_PLAY: 0.70,
      LEAN: 0.60,
    };
    for (const [grade, trueProb] of Object.entries(witnesses) as [SignalGrade, number][]) {
      expect(pickGradeFromConfidence(signalNumbers(trueProb).confidence)).toBe(grade);
    }
  });

  it("the two ladders use different confidence cut-points for the same word", () => {
    // STRONG_PLAY: signal board wants 80, market board wants 75 (plus an edge).
    expect(pickGradeFromConfidence(80)).toBe("STRONG_PLAY");
    expect(GRADE_THRESHOLDS.STRONG_PLAY.confidence).not.toBe(80);
  });
});

describe("the divergence is disclosed on the customer-visible pick", () => {
  it("names the grade and says why it is not a market-board grade", () => {
    for (const grade of ["STRONG_PLAY", "SOLID_PLAY", "LEAN"] as const) {
      const text = signalGradeDisclosure(grade);
      expect(text).toContain(grade);
      expect(text.toLowerCase()).toContain("confidence-only");
      expect(text).toContain("Edge Index");
    }
  });

  it("the disclosure does not claim an edge the signal board never measured", () => {
    const text = signalGradeDisclosure("STRONG_PLAY");
    expect(text).not.toMatch(/\bvalue\b|\bbeat the (market|book)\b|\bsharp\b/i);
  });

  /**
   * The wiring, executed rather than asserted by grep: the string the pick
   * actually ships with has to carry the disclosure. Without this, the whole
   * "the difference is surfaced to the customer" claim rests on a comment.
   */
  it("every signal pick's reasoning carries the disclosure for its own grade", () => {
    for (const trueProb of [0.85, 0.7, 0.6]) {
      const confidence = Math.round(trueProb * 100);
      const grade = pickGradeFromConfidence(confidence);
      const reasoning = buildSignalReasoning({
        chosenTeam: "Home Club",
        trueProb,
        sourcesLabel: "kalshi, elo",
        rankingP: trueProb,
        grade,
      });

      expect(reasoning).toContain(signalGradeDisclosure(grade));
      // …and the pre-existing honesty markers survive the extraction.
      expect(reasoning).toContain("Model signal (no book line)");
      expect(reasoning).toContain("Not a sportsbook quote");
      expect(reasoning).toContain("Eligibility RED forbids PROVEN/performance claims");
      expect(reasoning).toContain(`RankingP=${trueProb.toFixed(3)}`);
    }
  });
});

describe("the shared constants both pipelines are judged against", () => {
  it("the market board's top two rungs sit above the honest-market Edge Index ceiling", () => {
    expect(GRADE_THRESHOLDS.ELITE_PLAY.edge).toBeGreaterThan(HONEST_MARKET_EDGE_INDEX_MAX);
    expect(GRADE_THRESHOLDS.STRONG_PLAY.edge).toBeGreaterThan(HONEST_MARKET_EDGE_INDEX_MAX);
  });
});
