import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair, gradeSignalPick } from "../generate-signal-slate.js";
import { GRADE_THRESHOLDS, UNPRICED_MAX_GRADE, computePickGrade } from "@sports/types";

describe("blendIndependentHomeFair", () => {
  it("blends two-way independents without inventing", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.55, awayFairProb: 0.45, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    expect(b).not.toBeNull();
    expect(b!.homeP).toBeGreaterThan(0.5);
    expect(b!.sources).toEqual(["kalshi", "elo"]);
  });

  it("weights sharp sources over near-coin-flip (RES lift)", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.75, awayFairProb: 0.25, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.51, awayFairProb: 0.49, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "poisson", homeFairProb: 0.5, awayFairProb: 0.5, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    // Equal-weight would be ~0.587; sharpness-weight pulls toward Kalshi 0.75
    expect(b!.homeP).toBeGreaterThan(0.62);
    expect(b!.homeP).toBeLessThan(0.75);
  });

  it("returns null when no finite independents", () => {
    expect(blendIndependentHomeFair([])).toBeNull();
  });
});

// ============================================================================
// ONE GRADING FUNCTION
// ============================================================================

/**
 * This file used to carry a private third grade ladder — `confidence >= 80 ->
 * STRONG_PLAY, >= 65 -> SOLID_PLAY` — writing the same words into the same
 * `pickGrade` column the market board writes, with different cut-points and no
 * market involved at all. One site, one word, two meanings.
 *
 * Signal picks have no book line (`bookmakerCount: 0`, `marketFairProb: null`),
 * so there is no Edge Index to grade against. `gradeSignalPick` now delegates to
 * the shared `computePickGrade` with `null` for the price, which applies the
 * confidence rungs and caps the result at `UNPRICED_MAX_GRADE`: the rungs above
 * it are claims about a PRICE, and there is no price to make them about.
 *
 * These assert the WIRING at runtime, not by grepping the source — a delegation
 * claim nobody executes is a delegation claim nobody keeps.
 */
describe("gradeSignalPick delegates to the one shared grader", () => {
  it("returns exactly what computePickGrade returns for an unpriced pick", () => {
    for (const confidence of [50, 60, 64, 65, 70, 75, 80, 85, 95, 100]) {
      expect(gradeSignalPick(confidence)).toBe(computePickGrade(confidence, null));
    }
  });

  it("caps an unpriced pick at SOLID_PLAY however confident the model is", () => {
    expect(UNPRICED_MAX_GRADE).toBe("SOLID_PLAY");
    for (const confidence of [65, 80, 90, 100]) {
      expect(gradeSignalPick(confidence)).toBe("SOLID_PLAY");
    }
  });

  it("is STRICTLY stricter than the retired local ladder", () => {
    // Retired: confidence >= 80 => STRONG_PLAY, >= 65 => SOLID_PLAY, else LEAN.
    const retired = (c: number) =>
      c >= 80 ? "STRONG_PLAY" : c >= 65 ? "SOLID_PLAY" : "LEAN";
    const rank = { LEAN: 0, SOLID_PLAY: 1, STRONG_PLAY: 2, ELITE_PLAY: 3 } as const;

    let demoted = 0;
    for (let confidence = 50; confidence <= 100; confidence++) {
      const before = retired(confidence) as keyof typeof rank;
      const after = gradeSignalPick(confidence) as keyof typeof rank;
      // No signal pick may GAIN a rung from this change.
      expect(rank[after], `confidence ${confidence} was promoted`).toBeLessThanOrEqual(
        rank[before],
      );
      if (rank[after] < rank[before]) demoted++;
    }
    // …and the change is not a no-op: the >= 80 band really does lose a rung.
    expect(demoted).toBe(21); // confidence 80..100 inclusive
  });

  it("still awards LEAN below the lowest confidence rung", () => {
    expect(gradeSignalPick(GRADE_THRESHOLDS.SOLID_PLAY.confidence - 1)).toBe("LEAN");
  });
});
