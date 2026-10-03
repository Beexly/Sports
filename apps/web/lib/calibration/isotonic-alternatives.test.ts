import { describe, expect, it } from "vitest";
import {
  ISOTONIC_ALTERNATIVES,
  recommendIsotonicAlternative,
} from "@/lib/calibration/isotonic-alternatives";

describe("isotonic alternatives matrix", () => {
  it("covers core situations and never claims RES lift", () => {
    expect(ISOTONIC_ALTERNATIVES.length).toBeGreaterThanOrEqual(6);
    for (const a of ISOTONIC_ALTERNATIVES) {
      expect(a.raisesRes).toBe(false);
      expect(a.existingModule.length).toBeGreaterThan(3);
    }
    const beta = recommendIsotonicAlternative("need_identity_preserving");
    expect(beta.prefer.toLowerCase()).toContain("beta");
    const thin = recommendIsotonicAlternative("thin_tails");
    expect(thin.prefer.toLowerCase()).toMatch(/platt|temp/);
  });
});
