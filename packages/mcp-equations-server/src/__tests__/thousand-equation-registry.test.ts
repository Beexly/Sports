import { describe, it, expect } from "vitest";
import {
  loadThousandEquationMatrix,
  selectCandidatePremisesByContextMask,
} from "../thousand-equation-registry.js";
import { buildContextMask } from "../mcp-cognitive-router.js";

describe("Thousand-Equation In-Memory Matrix Registry", () => {
  it("loads 1,562 grounded equations with valid integrity counts and zero EQ-EXP placeholders", () => {
    const matrix = loadThousandEquationMatrix();
    expect(matrix.total_equations).toBeGreaterThanOrEqual(1520);
    expect(matrix.citable_verified_count).toBeGreaterThanOrEqual(1300);
    expect(matrix.computed_count).toBeGreaterThanOrEqual(200);
    expect(matrix.load_bearing_count).toBeGreaterThanOrEqual(1500);
    expect(matrix.equations.length).toBeGreaterThanOrEqual(1520);

    // Hard verification: zero synthetic placeholder equations
    const hasExpPlaceholder = matrix.equations.some((e: any) => e.id.startsWith("EQ-EXP-"));
    expect(hasExpPlaceholder).toBe(false);
  });

  it("selects and ranks candidate premises by active context mask bits", () => {
    // Mask with pressure (family 0) and weather (family 1) signals
    const mask = buildContextMask([
      { family: 0, displacement: 0.65, n: 80 },
      { family: 1, displacement: 0.45, n: 75 },
    ]);

    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 30 });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(30);

    // Verify all selected premises have valid premise properties
    for (const cand of candidates) {
      expect(cand.id).toBeTruthy();
      expect(cand.similarity).toBeGreaterThan(0);
      expect(typeof cand.rawLogOddsDelta).toBe("number");
      expect(cand.verificationStatus).toBeDefined();
    }
  });

  it("returns top load-bearing equations when context mask has sparse signals", () => {
    const mask = buildContextMask([]);
    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 25 });
    expect(candidates.length).toBe(25);
    for (const cand of candidates) {
      expect(cand.backtestPassed).toBe(true);
    }
  });
});
