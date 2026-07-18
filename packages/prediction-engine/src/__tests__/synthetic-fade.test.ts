import { describe, it, expect } from "vitest";
import {
  syntheticPublicLean,
  MAX_FADE_NUDGE,
  MAX_CONFIDENCE,
  SYNTHETIC_FADE_LABEL,
} from "../synthetic-fade.js";

describe("syntheticPublicLean", () => {
  it("is neutral with no public-attractor facts", () => {
    const r = syntheticPublicLean({});
    expect(r.leanIndex).toBe(0);
    expect(r.fadeNudge).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it("models heavy public lean onto a marquee primetime favourite and fades it", () => {
    const r = syntheticPublicLean({
      marketImpliedProb: 0.75,
      isPopularTeam: true,
      isPrimetime: true,
      hasStarNarrative: true,
      mediaLean: 1,
    });
    expect(r.leanIndex).toBeCloseTo(0.8, 6);
    // Public is heavy on this side → the nudge fades it (negative, on this side).
    expect(r.fadeNudge).toBeCloseTo(-0.008, 6);
    expect(r.confidence).toBeCloseTo(0.16, 6);
  });

  it("leans toward the dog and nudges positively when this side is unpopular", () => {
    const r = syntheticPublicLean({ marketImpliedProb: 0.2 });
    expect(r.leanIndex).toBeLessThan(0);
    expect(r.fadeNudge).toBeGreaterThan(0);
  });

  it("never exceeds the hard caps even at the extreme", () => {
    const r = syntheticPublicLean({
      marketImpliedProb: 1,
      isPopularTeam: true,
      isPrimetime: true,
      hasStarNarrative: true,
      mediaLean: 1,
    });
    expect(r.leanIndex).toBeLessThanOrEqual(1);
    expect(Math.abs(r.fadeNudge)).toBeLessThanOrEqual(MAX_FADE_NUDGE + 1e-9);
    expect(r.confidence).toBeLessThanOrEqual(MAX_CONFIDENCE + 1e-9);
  });

  it("is monotonic — adding a public attractor strengthens the lean", () => {
    const base = syntheticPublicLean({ marketImpliedProb: 0.7 });
    const withPrime = syntheticPublicLean({ marketImpliedProb: 0.7, isPrimetime: true });
    expect(withPrime.leanIndex).toBeGreaterThan(base.leanIndex);
  });

  it("leanIndex equals the weighted sum of its contributions", () => {
    const r = syntheticPublicLean({ marketImpliedProb: 0.6, isPopularTeam: true });
    const recomputed = r.contributions.reduce((acc, c) => acc + c.value * c.weight, 0);
    expect(r.leanIndex).toBeCloseTo(recomputed, 4);
  });

  it("always carries the mandatory non-betting-data label", () => {
    expect(syntheticPublicLean({ marketImpliedProb: 0.9 }).label).toBe(SYNTHETIC_FADE_LABEL);
  });
});
