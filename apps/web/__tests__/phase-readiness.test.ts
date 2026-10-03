import { describe, it, expect } from "vitest";
import { evaluatePhaseAdvance } from "@/lib/pricing/phase-readiness";

describe("evaluatePhaseAdvance", () => {
  it("from FOUNDING, is not eligible for PROVEN without picks + published calibration", () => {
    const r = evaluatePhaseAdvance(
      { canonicalSettledPicks: 10, calibrationPublished: false, beatCloseRate: null },
      "FOUNDING",
    );
    expect(r.nextPhaseId).toBe("PROVEN");
    expect(r.eligible).toBe(false);
    expect(r.unmet.length).toBeGreaterThan(0);
  });

  it("from FOUNDING, becomes eligible for PROVEN at >=100 settled + published calibration", () => {
    const r = evaluatePhaseAdvance(
      { canonicalSettledPicks: 120, calibrationPublished: true, beatCloseRate: null },
      "FOUNDING",
    );
    expect(r.eligible).toBe(true);
    expect(r.met.length).toBeGreaterThanOrEqual(2);
    expect(r.rationale).toContain("PRICING_PHASE=PROVEN");
  });

  it("ESTABLISHED requires a verified closing-line-value beat rate >= 52.4%", () => {
    const base = { canonicalSettledPicks: 800, calibrationPublished: true };
    expect(evaluatePhaseAdvance({ ...base, beatCloseRate: 0.5 }, "PROVEN").eligible).toBe(false);
    expect(evaluatePhaseAdvance({ ...base, beatCloseRate: 0.55 }, "PROVEN").eligible).toBe(true);
  });

  it("AUTHORITY is the top rung — no further increase is named", () => {
    const r = evaluatePhaseAdvance(
      { canonicalSettledPicks: 9999, calibrationPublished: true, beatCloseRate: 0.6 },
      "AUTHORITY",
    );
    expect(r.nextPhaseId).toBeNull();
    expect(r.eligible).toBe(false);
    expect(r.rationale).toContain("top rung");
  });

  describe("decided-rate passthrough (additive disclosure, gate untouched)", () => {
    it("carries the decided-only reading beside the rate the floor reads", () => {
      const r = evaluatePhaseAdvance(
        {
          canonicalSettledPicks: 9999,
          calibrationPublished: true,
          beatCloseRate: 0.234,
          beatCloseRateDecided: 0.4084,
        },
        "PROVEN",
      );
      expect(r.beatCloseRateDecided).toBe(0.4084);
      // The floor still reads the all-graded rate only:
      expect(r.eligible).toBe(false);
    });

    it("is null when the caller does not provide the decided reading", () => {
      const r = evaluatePhaseAdvance(
        { canonicalSettledPicks: 9999, calibrationPublished: true, beatCloseRate: 0.6 },
        "PROVEN",
      );
      expect(r.beatCloseRateDecided).toBeNull();
      expect(r.eligible).toBe(true);
    });
  });
});
