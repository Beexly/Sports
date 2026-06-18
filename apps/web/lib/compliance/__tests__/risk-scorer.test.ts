/**
 * Tests for the Compliance / Risk Scorer (Workstream J12).
 *
 * Covers each BLOCK trigger (unapproved/unregistered source, banned claim,
 * ungated performance claim, external-without-approval, minors-data), the
 * honest REVIEW-on-unknown defaults, the ALLOW path, the J5 adapter, and
 * determinism (the same input always yields an identical result).
 */
import { describe, it, expect } from "vitest";
import {
  scoreComplianceRisk,
  toCockpitComplianceSignal,
  scoreComplianceRiskForCockpit,
  type ComplianceAction,
} from "../risk-scorer";

// A baseline low-risk internal action. Tests override one field at a time so
// the effect of each rule is isolated.
function internal(overrides: Partial<ComplianceAction> = {}): ComplianceAction {
  return {
    kind: "config",
    surface: "internal",
    jurisdiction: "US",
    ...overrides,
  };
}

describe("scoreComplianceRisk — BLOCK triggers", () => {
  it("blocks a scrape against a permission_required source", () => {
    const r = scoreComplianceRisk({ kind: "scrape", sourceId: "scores24-live" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.rights).toBe(1);
    expect(r.overall).toBe(1);
  });

  it("blocks a scrape against an excluded source", () => {
    const r = scoreComplianceRisk({ kind: "scrape", sourceId: "siriusxm-activator" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.rights).toBe(1);
  });

  it("blocks a scrape against a vendor_candidate source", () => {
    const r = scoreComplianceRisk({ kind: "scrape", sourceId: "score24-com" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("blocks a scrape against an unregistered source", () => {
    const r = scoreComplianceRisk({ kind: "scrape", sourceId: "does-not-exist" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.rights).toBe(1);
  });

  it("blocks a scrape with no sourceId at all", () => {
    const r = scoreComplianceRisk({ kind: "scrape" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("does NOT block a scrape against an approved source", () => {
    const r = scoreComplianceRisk({ kind: "scrape", sourceId: "the-odds-api" });
    expect(r.verdict).not.toBe("BLOCK");
    expect(r.axes.rights).toBeLessThan(1);
  });

  it("blocks a public claim containing a registry-banned phrase", () => {
    const r = scoreComplianceRisk({
      kind: "claim",
      surface: "public",
      claimText: "This pick is a guaranteed winner.",
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.reputation).toBe(1);
  });

  it("blocks a public claim containing the 'lock' slang", () => {
    const r = scoreComplianceRisk({
      kind: "publish",
      surface: "public",
      claimText: "Tonight's lock is the over.",
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("blocks a public claim containing a trust-gate supplemental phrase", () => {
    const r = scoreComplianceRisk({
      kind: "claim",
      surface: "public",
      claimText: "Our profitable system means no risk for you.",
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("blocks an ungated public performance/win-rate claim", () => {
    const r = scoreComplianceRisk({
      kind: "claim",
      surface: "public",
      claimText: "Our win rate is 60% this season.",
      isPerformanceClaim: true,
      performanceGatePassed: false,
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("does NOT block a performance claim once the gate has passed", () => {
    const r = scoreComplianceRisk({
      kind: "claim",
      surface: "public",
      claimText: "Our published win rate is computed from settled picks.",
      isPerformanceClaim: true,
      performanceGatePassed: true,
      ageGated: true,
      hasResponsibleGamingMessaging: true,
    });
    expect(r.verdict).not.toBe("BLOCK");
  });

  it("blocks an external/forbidden action without approval", () => {
    const r = scoreComplianceRisk({ kind: "publish", externalAction: "SEND_EXTERNAL" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.platform).toBe(1);
    expect(r.axes.legal).toBe(1);
  });

  it("blocks an isExternal action without approval", () => {
    const r = scoreComplianceRisk({ kind: "message", isExternal: true });
    expect(r.verdict).toBe("BLOCK");
  });

  it("does NOT hard-block an approved external action (residual review)", () => {
    const r = scoreComplianceRisk({
      kind: "message",
      isExternal: true,
      approved: true,
      jurisdiction: "US",
    });
    expect(r.verdict).toBe("REVIEW");
  });

  it("blocks minors-data without a privacy review", () => {
    const r = scoreComplianceRisk({ kind: "config", touchesMinorsData: true });
    expect(r.verdict).toBe("BLOCK");
    expect(r.axes.age).toBe(1);
  });

  it("does NOT block minors-data once privacy-reviewed (still review)", () => {
    const r = scoreComplianceRisk({
      kind: "config",
      touchesMinorsData: true,
      minorsDataPrivacyReviewed: true,
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.axes.age).toBe(1);
  });
});

describe("scoreComplianceRisk — REVIEW honest defaults", () => {
  it("reviews an unknown action kind rather than silently allowing", () => {
    const r = scoreComplianceRisk({ kind: "other", surface: "internal" });
    expect(r.verdict).toBe("REVIEW");
    expect(r.overall).toBeGreaterThanOrEqual(0.5);
  });

  it("reviews an unknown jurisdiction on a customer-facing surface", () => {
    const r = scoreComplianceRisk({
      kind: "publish",
      surface: "public",
      ageGated: true,
      hasResponsibleGamingMessaging: true,
      // jurisdiction omitted → unknown
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.axes.jurisdiction).toBeGreaterThan(0);
  });

  it("reviews unknown age-gating on a customer-facing surface", () => {
    const r = scoreComplianceRisk({
      kind: "publish",
      surface: "public",
      jurisdiction: "US",
      hasResponsibleGamingMessaging: true,
      // ageGated omitted → unknown
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.axes.age).toBeGreaterThan(0);
  });

  it("reviews an action reaching an at-risk user", () => {
    const r = scoreComplianceRisk({
      kind: "message",
      surface: "external",
      jurisdiction: "US",
      ageGated: true,
      hasResponsibleGamingMessaging: true,
      approved: true,
      targetsAtRiskUser: true,
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.axes.responsibleGaming).toBe(1);
  });

  it("reviews a spend action without approval", () => {
    const r = scoreComplianceRisk({ kind: "spend", jurisdiction: "US" });
    expect(r.verdict).toBe("REVIEW");
  });

  it("reviews an out-of-set jurisdiction", () => {
    const r = scoreComplianceRisk({ kind: "config", surface: "internal", jurisdiction: "EE" });
    expect(r.verdict).toBe("REVIEW");
    expect(r.axes.jurisdiction).toBeGreaterThan(0);
  });
});

describe("scoreComplianceRisk — ALLOW path", () => {
  it("allows a low-risk internal config action with no risk signals", () => {
    const r = scoreComplianceRisk(internal());
    expect(r.verdict).toBe("ALLOW");
    expect(r.overall).toBe(0);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("allows a clean internal claim with no banned language", () => {
    const r = scoreComplianceRisk(
      internal({ kind: "claim", claimText: "We ingest live odds and score every matchup." }),
    );
    expect(r.verdict).toBe("ALLOW");
  });
});

describe("scoreComplianceRisk — axes are always in [0,1]", () => {
  it("every axis stays within the unit interval", () => {
    const cases: ComplianceAction[] = [
      { kind: "scrape", sourceId: "scores24-live" },
      { kind: "claim", surface: "public", claimText: "guaranteed profit", isPerformanceClaim: true },
      { kind: "publish", isExternal: true },
      { kind: "config", touchesMinorsData: true },
      internal(),
    ];
    for (const c of cases) {
      const r = scoreComplianceRisk(c);
      for (const v of Object.values(r.axes)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(r.overall).toBeGreaterThanOrEqual(0);
      expect(r.overall).toBeLessThanOrEqual(1);
    }
  });
});

describe("scoreComplianceRisk — determinism", () => {
  it("returns identical results for identical inputs", () => {
    const action: ComplianceAction = {
      kind: "scrape",
      surface: "internal",
      sourceId: "fpl-api",
      jurisdiction: "UK",
    };
    const a = scoreComplianceRisk(action);
    const b = scoreComplianceRisk(action);
    expect(a).toEqual(b);
  });

  it("is order-independent across a batch (no shared mutable state)", () => {
    const a = scoreComplianceRisk({ kind: "scrape", sourceId: "the-odds-api" });
    scoreComplianceRisk({ kind: "publish", isExternal: true }); // a BLOCK in between
    const c = scoreComplianceRisk({ kind: "scrape", sourceId: "the-odds-api" });
    expect(a).toEqual(c);
  });
});

describe("J5 adapter", () => {
  it("maps a BLOCK verdict to forceBlock with complianceRisk 1", () => {
    const result = scoreComplianceRisk({ kind: "scrape", sourceId: "scores24-live" });
    const signal = toCockpitComplianceSignal(result);
    expect(signal.forceBlock).toBe(true);
    expect(signal.verdict).toBe("BLOCK");
    expect(signal.complianceRisk).toBe(1);
  });

  it("maps an ALLOW verdict to no forceBlock and low risk", () => {
    const signal = scoreComplianceRiskForCockpit(internal());
    expect(signal.forceBlock).toBe(false);
    expect(signal.verdict).toBe("ALLOW");
    expect(signal.complianceRisk).toBe(0);
  });

  it("carries the reasons through for the audit trail", () => {
    const signal = scoreComplianceRiskForCockpit({ kind: "scrape", sourceId: "does-not-exist" });
    expect(signal.reasons.length).toBeGreaterThan(0);
  });
});
