import { describe, expect, it } from "vitest";
import {
  MOVE_RISK_HIGH_MIN,
  MOVE_RISK_LOW_MAX,
  MOVE_RISK_WEIGHT,
  compareByMoveRisk,
  moveRisk,
  moveRiskLabel,
} from "../move-risk";

describe("moveRisk", () => {
  it("tags by confidence band", () => {
    expect(moveRisk({ confidence: 90 })).toBe("high");
    expect(moveRisk({ confidence: MOVE_RISK_HIGH_MIN })).toBe("high");
    expect(moveRisk({ confidence: 62 })).toBe("mid");
    expect(moveRisk({ confidence: MOVE_RISK_LOW_MAX })).toBe("low");
    expect(moveRisk({ confidence: 40 })).toBe("low");
  });

  it("returns unknown for absent or non-finite confidence, never low", () => {
    expect(moveRisk({ confidence: null })).toBe("unknown");
    expect(moveRisk({ confidence: undefined })).toBe("unknown");
    expect(moveRisk({ confidence: Number.NaN })).toBe("unknown");
  });
});

describe("publish order", () => {
  it("publishes high risk first and low last", () => {
    const picks = [
      { confidence: 40, generatedAt: "2026-10-23T01:00:00Z" },
      { confidence: 90, generatedAt: "2026-10-23T00:00:00Z" },
      { confidence: 62, generatedAt: "2026-10-23T00:30:00Z" },
    ];
    expect([...picks].sort(compareByMoveRisk).map((p) => p.confidence)).toEqual([90, 62, 40]);
  });

  it("ranks unknown between high and low", () => {
    expect(MOVE_RISK_WEIGHT.unknown).toBeGreaterThan(MOVE_RISK_WEIGHT.high);
    expect(MOVE_RISK_WEIGHT.unknown).toBeLessThan(MOVE_RISK_WEIGHT.low);
  });

  it("breaks ties newest-first so the order is total", () => {
    const sorted = [
      { confidence: 90, generatedAt: "2026-10-23T00:00:00Z" },
      { confidence: 90, generatedAt: "2026-10-23T02:00:00Z" },
    ].sort(compareByMoveRisk);
    expect(sorted[0]?.generatedAt).toBe("2026-10-23T02:00:00Z");
  });
});

describe("labels", () => {
  it("exist for every risk level and mention timing", () => {
    expect(moveRiskLabel("high")).toContain("early");
    expect(moveRiskLabel("low")).toContain("anytime");
    expect(moveRiskLabel("unknown")).toBeTruthy();
  });
});
