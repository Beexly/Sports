import { describe, it, expect } from "vitest";
import { compilePublicClaim, type ClaimContext } from "@/lib/claims/public-claim-compiler";

function base(overrides: Partial<ClaimContext> = {}): ClaimContext {
  return {
    kind: "CLV_BEAT_CLOSE",
    text: "Beat the close on 57% of 220 graded picks (95% CI 50.5–63.4%).",
    canExposePerformanceStats: true,
    settledSampleSize: 220,
    minSettledForPublic: 100,
    isBootstrap: false,
    clvCoverageRatePct: 99,
    calibrationPublishable: true,
    modelVersion: "v5.0.0",
    dataFreshnessAgeMinutes: 10,
    ...overrides,
  };
}

describe("public claim compiler", () => {
  it("allows a fully-gated, honest claim and returns the text", () => {
    const c = compilePublicClaim(base());
    expect(c.verdict).toBe("ALLOW");
    expect(c.publicText).toBe(base().text);
    expect(c.blockers).toEqual([]);
  });

  it("blocks banned phrases via the single source of truth (no text leaks)", () => {
    const c = compilePublicClaim(base({ text: "Guaranteed lock of the day — risk-free." }));
    expect(c.verdict).toBe("BLOCK");
    expect(c.publicText).toBeNull();
    expect(c.blockers.map((b) => b.code)).toContain("BANNED_PHRASE");
  });

  it("blocks when the performance gate is off", () => {
    const c = compilePublicClaim(base({ canExposePerformanceStats: false }));
    expect(c.blockers.map((b) => b.code)).toContain("GATE_OFF");
  });

  it("blocks bootstrap-era data", () => {
    const c = compilePublicClaim(base({ isBootstrap: true }));
    expect(c.blockers.map((b) => b.code)).toContain("BOOTSTRAP_DATA");
  });

  it("blocks an insufficient settled sample", () => {
    const c = compilePublicClaim(base({ settledSampleSize: 40 }));
    expect(c.blockers.map((b) => b.code)).toContain("INSUFFICIENT_SAMPLE");
  });

  it("blocks a CLV claim with incomplete coverage (survivorship)", () => {
    const c = compilePublicClaim(base({ clvCoverageRatePct: 80 }));
    expect(c.blockers.map((b) => b.code)).toContain("INCOMPLETE_COVERAGE");
    const unknown = compilePublicClaim(base({ clvCoverageRatePct: null }));
    expect(unknown.blockers.map((b) => b.code)).toContain("COVERAGE_UNKNOWN");
  });

  it("requires a model-version stamp for performance claims", () => {
    const c = compilePublicClaim(base({ modelVersion: null }));
    expect(c.blockers.map((b) => b.code)).toContain("MISSING_MODEL_VERSION");
  });

  it("blocks stale data", () => {
    const c = compilePublicClaim(base({ dataFreshnessAgeMinutes: 600 }));
    expect(c.blockers.map((b) => b.code)).toContain("STALE_DATA");
  });

  it("blocks a calibration claim that hasn't cleared its floor", () => {
    const c = compilePublicClaim(base({ kind: "CALIBRATION", calibrationPublishable: false }));
    expect(c.blockers.map((b) => b.code)).toContain("CALIBRATION_NOT_READY");
  });

  it("does not apply performance gates to a generic (non-performance) claim", () => {
    const c = compilePublicClaim({
      kind: "GENERIC",
      text: "Closing line value is a leading indicator, not a guarantee of future results.",
      canExposePerformanceStats: false,
      settledSampleSize: 0,
      minSettledForPublic: 100,
      isBootstrap: true,
    });
    expect(c.verdict).toBe("ALLOW");
  });
});
