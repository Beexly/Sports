import { describe, expect, it } from "vitest";
import {
  bannedBrandClaims,
  colors,
  gradeForConfidence,
  identity,
  microcopy,
  pickGrades,
} from "../index";

describe("@sports/brand", () => {
  it("keeps identity centralized", () => {
    expect(identity.productName).toBe("Galaxy Sports Edge");
    expect(identity.position).toMatch(/cannot explain/i);
  });

  it("maps confidence to locked grade bands", () => {
    expect(gradeForConfidence(90)).toBe("ELITE_PLAY");
    expect(gradeForConfidence(78)).toBe("STRONG_PLAY");
    expect(gradeForConfidence(67)).toBe("SOLID_PLAY");
    expect(gradeForConfidence(51)).toBe("LEAN");
  });

  it("assigns every grade a brand color", () => {
    for (const grade of Object.values(pickGrades)) {
      expect(Object.values(colors)).toContain(grade.color);
    }
  });

  it("makes quiet boards feel intentional", () => {
    expect(microcopy.empty.body).toMatch(/Silence is a decision/);
  });

  it("locks banned brand claims in code", () => {
    expect(bannedBrandClaims).toContain("ai-powered picks");
    expect(bannedBrandClaims).toContain("risk-free");
  });
});
