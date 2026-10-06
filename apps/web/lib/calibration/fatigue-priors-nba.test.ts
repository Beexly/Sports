import { describe, it, expect } from "vitest";
import {
  FATIGUE_PRIORS,
  fatiguePosterior,
  retainFatigueFeature,
  leakageFreeAttestation,
  nullResultNote,
} from "@/lib/calibration/fatigue-priors-nba";

// ============================================================
// arXiv 2112.14649v1 — NBA fatigue priors. Additive only.
// ============================================================

describe("fatigue priors — 2112.14649v1", () => {
  it("encodes the paper coefficients as priors", () => {
    const byName = Object.fromEntries(FATIGUE_PRIORS.map((p) => [p.feature, p]));
    expect(byName["restDifferential"].priorMean).toBeCloseTo(0.35, 10);
    expect(byName["westwardTravelHours"].priorMean).toBeCloseTo(-1.74, 10);
    expect(byName["threeInFour"].priorMean).toBeCloseTo(-1.29, 10);
    for (const p of FATIGUE_PRIORS) expect(p.priorSd).toBeGreaterThan(0.5);
  });

  it("posterior shrinks a precise estimate toward a wide prior only slightly", () => {
    const post = fatiguePosterior(0.35, 1.0, 0.1, 0.05);
    expect(post.mean).toBeGreaterThan(0.1);
    expect(post.mean).toBeLessThan(0.35);
    expect(post.sd).toBeLessThan(0.05 + 1e-9);
  });

  it("posterior tracks the prior when the estimate is pure noise", () => {
    const post = fatiguePosterior(0.35, 1.0, 5.0, 100);
    expect(post.mean).toBeCloseTo(0.35, 1);
  });

  it("retainFatigueFeature requires >= 2 improving seasons", () => {
    expect(retainFatigueFeature([true, true, false])).toBe(true);
    expect(retainFatigueFeature([true, false, false])).toBe(false);
    expect(retainFatigueFeature([])).toBe(false);
  });

  it("leakageFreeAttestation rejects post-game revisions", () => {
    expect(leakageFreeAttestation(true, false)).toBe(true);
    expect(leakageFreeAttestation(true, true)).toBe(false);
    expect(leakageFreeAttestation(false, false)).toBe(false);
  });

  it("nullResultNote documents the null bar", () => {
    const note = nullResultNote(0.07);
    expect(note).toContain("0.07");
    expect(note).toContain("null result");
  });
});
