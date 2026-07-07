import { describe, expect, it } from "vitest";
import { computeNoBetStrength } from "../no-bet-strength.js";

describe("computeNoBetStrength", () => {
  it("turns source-rights and responsible-gaming risks into hard passes", () => {
    const result = computeNoBetStrength({
      risks: [
        {
          factor: "SOURCE_RIGHTS_BLOCKED",
          reason: "Source is not allowed for modeling.",
          severity: 1,
        },
      ],
    });

    expect(result.decision).toBe("HARD_PASS");
    expect(result.hardPassReasons).toContain("Source is not allowed for modeling.");
  });

  it("adds evidence-health pressure without needing a hard block", () => {
    const result = computeNoBetStrength({
      evidenceHealth: 40,
      risks: [{ factor: "MODEL_DISAGREEMENT", reason: "Models split directionally.", severity: 0.5 }],
    });

    expect(result.score).toBeGreaterThan(25);
    expect(result.decision).toBe("WATCH");
  });
});
