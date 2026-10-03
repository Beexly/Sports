import { describe, it, expect } from "vitest";
import { compilePublicClaim, type ClaimContext } from "@/lib/claims/public-claim-compiler";
import type { CalibrationPublicState } from "@/lib/calibration/public-state";

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

  /*
   * The graded state exists so a calibration claim can no longer rest on a
   * boolean any caller can set. These pin the precedence: when a verified state
   * is supplied it decides, and the self-reported boolean cannot overrule it.
   */
  it("lets a verified MEETS_FLOOR state stand in for the self-reported boolean", () => {
    const c = compilePublicClaim(
      base({
        kind: "CALIBRATION",
        calibrationState: {
          state: "MEETS_FLOOR",
          clearsOurFloor: true,
          statement: "cleared every floor we set",
          notEstablished: [],
        } as unknown as CalibrationPublicState,
      }),
    );
    // No boolean passed at all — the state alone authorises the claim.
    expect(c.blockers.map((b) => b.code)).not.toContain("CALIBRATION_NOT_READY");
  });

  it("refuses a claim the evidence contradicts even when the boolean says publishable", () => {
    for (const state of ["NO_EVIDENCE", "UNAVAILABLE", "STALE", "COLLECTING", "BELOW_FLOOR"] as const) {
      const c = compilePublicClaim(
        base({
          kind: "CALIBRATION",
          calibrationPublishable: true,
          calibrationState: {
            state,
            clearsOurFloor: false,
            statement: "x",
            notEstablished: [],
          } as unknown as CalibrationPublicState,
        }),
      );
      // The defect: this used to ALLOW on `calibrationPublishable: true` alone.
      expect(c.verdict).toBe("BLOCK");
      expect(c.publicText).toBeNull();
      expect(c.blockers.map((b) => b.code)).toContain("CALIBRATION_NOT_READY");
    }
  });

  it("keeps honouring the boolean when no state is supplied (back-compat)", () => {
    const c = compilePublicClaim(base({ kind: "CALIBRATION", calibrationPublishable: true }));
    expect(c.blockers.map((b) => b.code)).not.toContain("CALIBRATION_NOT_READY");
  });

  it("an explicit null state does NOT silently fall back to the boolean", () => {
    // `null` means "I read the record and there is nothing there", which is
    // different from "I have no way to read it". Only `undefined` falls back.
    const c = compilePublicClaim(
      base({ kind: "CALIBRATION", calibrationPublishable: true, calibrationState: null }),
    );
    expect(c.verdict).toBe("BLOCK");
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
