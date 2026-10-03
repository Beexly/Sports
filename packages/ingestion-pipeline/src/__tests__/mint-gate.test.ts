import { describe, expect, it } from "vitest";
import { mintAfterMind, type MindVerdict } from "../mint-gate.js";

const asked = (over: Partial<MindVerdict> = {}): MindVerdict => ({
  asked: true,
  label: "FINAL",
  checklist: { offensive_line: "CLEAR", coaching_scheme: "CLEAR", qb_behavior: "CLEAR" },
  ...over,
});

describe("mintAfterMind", () => {
  it("passes a game the mind was not asked to cover", () => {
    expect(mintAfterMind(undefined)).toEqual({ action: "pass" });
    expect(mintAfterMind(null)).toEqual({ action: "pass" });
  });

  it("withholds INVALID and does not carry a probability", () => {
    const decision = mintAfterMind(asked({ label: "INVALID", checklist: {} }));
    expect(decision.action).toBe("withhold");
    expect(JSON.stringify(decision)).not.toMatch(/0\.5/);
    expect(Object.keys(decision)).toEqual(["action", "reason"]);
  });

  it("withholds a DATA-GAP track even when the label is not INVALID", () => {
    const decision = mintAfterMind(
      asked({
        label: "ANALYSIS-DRAFT — not for publication",
        checklist: { offensive_line: "CLEAR", qb_behavior: "DATA-GAP" },
      }),
    );
    expect(decision.action).toBe("withhold");
    if (decision.action === "withhold") {
      expect(decision.reason).toContain("qb_behavior");
      expect(decision.reason).not.toContain("offensive_line");
    }
  });

  it("accepts the DATA_GAP spelling", () => {
    const decision = mintAfterMind(
      asked({ checklist: { coaching_scheme: "DATA_GAP" } }),
    );
    expect(decision.action).toBe("withhold");
  });

  it("passes a clear trace without inventing a number", () => {
    const decision = mintAfterMind(asked());
    expect(decision).toEqual({ action: "pass" });
    expect(JSON.stringify(decision)).not.toMatch(/0\.5/);
  });
});
