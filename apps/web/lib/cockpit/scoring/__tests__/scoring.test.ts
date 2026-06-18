/**
 * Tests for the cockpit scoring engine: verifies the routing decisions and the
 * trust-guardrail-aligned escalation — anything touching public picks, model
 * weights, revenue claims, or rights/scraping can never AUTO_SAVE_INTERNAL.
 */
import { describe, it, expect } from "vitest";
import { scoreCandidate } from "../index";
import type { ScoringInput } from "../types";

// A baseline "safe internal" candidate. Individual tests override one axis at a
// time so the effect of each rule is isolated and obvious.
function safeInternal(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    assignedAgent: "scout",
    riskLevel: "LOW",
    reversible: true,
    blastRadius: "ISOLATED",
    evidenceStrength: "STRONG",
    expectedImpact: "LOW",
    ...overrides,
  };
}

describe("scoreCandidate — routing decisions", () => {
  it("auto-saves low-risk, reversible, isolated, internal-only work", () => {
    const r = scoreCandidate(safeInternal());
    expect(r.routing).toBe("AUTO_SAVE_INTERNAL");
    expect(r.complianceRisk).toBeLessThanOrEqual(0.2);
    expect(r.reversibility).toBeGreaterThanOrEqual(0.8);
  });

  it("sends to approval when not auto-save-eligible (MODERATE risk)", () => {
    const r = scoreCandidate(safeInternal({ riskLevel: "MODERATE" }));
    expect(r.routing).toBe("SEND_TO_APPROVAL");
  });

  it("requires edits when evidence is missing or weak", () => {
    const none = scoreCandidate(safeInternal({ evidenceStrength: "NONE" }));
    const weak = scoreCandidate(safeInternal({ evidenceStrength: "WEAK" }));
    expect(none.routing).toBe("REQUIRE_EDITS");
    expect(weak.routing).toBe("REQUIRE_EDITS");
  });

  it("blocks a forbidden external action (L5) — hard stop, never approvable", () => {
    const r = scoreCandidate(safeInternal({ action: "PUBLISH" }));
    expect(r.routing).toBe("BLOCK");
    expect(r.complianceRisk).toBe(1);
  });

  it("blocks every forbidden external action", () => {
    const forbidden = [
      "PUBLISH",
      "SEND_EXTERNAL",
      "SPEND_MONEY",
      "DEPLOY",
      "CHANGE_PUBLIC_CLAIM",
      "CHANGE_MODEL_WEIGHT",
      "SCRAPE_PROTECTED_SOURCE",
      "ENABLE_PUBLIC_PICKS",
    ] as const;
    for (const action of forbidden) {
      expect(scoreCandidate(safeInternal({ action })).routing).toBe("BLOCK");
    }
  });

  it("escalates a COMPLIANCE_HOLD (the cockpit's own stop)", () => {
    const r = scoreCandidate(safeInternal({ riskLevel: "COMPLIANCE_HOLD" }));
    expect(r.routing).toBe("ESCALATE");
  });

  it("escalates when authority is OWNER_ONLY", () => {
    const r = scoreCandidate(safeInternal({ authorityLevel: "OWNER_ONLY" }));
    expect(r.routing).toBe("ESCALATE");
  });

  it("sends owner-approval-required low-stakes work to the Approval Queue", () => {
    const r = scoreCandidate(safeInternal({ ownerApprovalRequired: true }));
    expect(r.routing).toBe("SEND_TO_APPROVAL");
  });

  it("escalates owner-approval-required HIGH-risk work", () => {
    const r = scoreCandidate(
      safeInternal({ ownerApprovalRequired: true, riskLevel: "HIGH" })
    );
    expect(r.routing).toBe("ESCALATE");
  });
});

describe("scoreCandidate — guardrail-aligned escalation (never auto for picks/model/revenue/rights)", () => {
  const SENSITIVE = [
    "PUBLIC_PICKS",
    "MODEL_WEIGHTS",
    "REVENUE_CLAIMS",
    "RIGHTS_SCRAPING",
  ] as const;

  it.each(SENSITIVE)(
    "forces HIGH complianceRisk and never auto-saves when touching %s",
    (domain) => {
      // Even with the SAFEST possible candidate, a sensitive domain blocks auto-save.
      const r = scoreCandidate(safeInternal({ sensitiveDomains: [domain] }));
      expect(r.complianceRisk).toBeGreaterThanOrEqual(0.85);
      expect(r.routing).not.toBe("AUTO_SAVE_INTERNAL");
      expect(["SEND_TO_APPROVAL", "ESCALATE"]).toContain(r.routing);
    }
  );

  it("escalates a sensitive domain combined with HIGH risk", () => {
    const r = scoreCandidate(
      safeInternal({ sensitiveDomains: ["MODEL_WEIGHTS"], riskLevel: "HIGH" })
    );
    expect(r.routing).toBe("ESCALATE");
  });

  it("escalates a sensitive domain with broad blast radius", () => {
    const r = scoreCandidate(
      safeInternal({ sensitiveDomains: ["PUBLIC_PICKS"], blastRadius: "BROAD" })
    );
    expect(r.routing).toBe("ESCALATE");
  });

  it("never auto-saves any sensitive domain regardless of other axes (exhaustive)", () => {
    for (const domain of SENSITIVE) {
      for (const riskLevel of ["LOW", "MODERATE", "HIGH"] as const) {
        const r = scoreCandidate(
          safeInternal({ sensitiveDomains: [domain], riskLevel, evidenceStrength: "STRONG" })
        );
        expect(r.routing).not.toBe("AUTO_SAVE_INTERNAL");
      }
    }
  });
});

describe("scoreCandidate — reversibility / blast-radius edges", () => {
  it("scores explicitly irreversible work at reversibility 0 and never auto-saves", () => {
    const r = scoreCandidate(safeInternal({ reversible: false }));
    expect(r.reversibility).toBe(0);
    expect(r.routing).not.toBe("AUTO_SAVE_INTERNAL");
  });

  it("does not auto-save broad-blast-radius work even when reversible + low-risk", () => {
    const r = scoreCandidate(safeInternal({ blastRadius: "BROAD" }));
    expect(r.blastRadius).toBe(1);
    expect(r.routing).not.toBe("AUTO_SAVE_INTERNAL");
  });

  it("ranks blast radius ISOLATED < LOCALIZED < BROAD", () => {
    const iso = scoreCandidate(safeInternal({ blastRadius: "ISOLATED" })).blastRadius;
    const loc = scoreCandidate(safeInternal({ blastRadius: "LOCALIZED" })).blastRadius;
    const broad = scoreCandidate(safeInternal({ blastRadius: "BROAD" })).blastRadius;
    expect(iso).toBeLessThan(loc);
    expect(loc).toBeLessThan(broad);
  });

  it("keeps every axis within [0,1]", () => {
    const r = scoreCandidate(
      safeInternal({ confidenceHint: 5, evidenceStrength: "NONE", blastRadius: "BROAD" })
    );
    for (const v of [
      r.confidence,
      r.complianceRisk,
      r.reversibility,
      r.blastRadius,
      r.evidenceStrength,
      r.expectedImpact,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("scoreCandidate — confidence + impact", () => {
  it("uses the confidence hint when provided (clamped to [0,1])", () => {
    expect(scoreCandidate(safeInternal({ confidenceHint: 0.42 })).confidence).toBe(0.42);
    expect(scoreCandidate(safeInternal({ confidenceHint: 2 })).confidence).toBe(1);
    expect(scoreCandidate(safeInternal({ confidenceHint: -1 })).confidence).toBe(0);
  });

  it("derives confidence from evidence/risk when no hint is given", () => {
    const strong = scoreCandidate(safeInternal({ evidenceStrength: "STRONG" })).confidence;
    const weak = scoreCandidate(
      safeInternal({ evidenceStrength: "WEAK", riskLevel: "MODERATE" })
    ).confidence;
    expect(strong).toBeGreaterThan(weak);
  });

  it("maps expected-impact hints monotonically", () => {
    const none = scoreCandidate(safeInternal({ expectedImpact: "NONE" })).expectedImpact;
    const high = scoreCandidate(safeInternal({ expectedImpact: "HIGH" })).expectedImpact;
    expect(none).toBeLessThan(high);
  });
});

describe("scoreCandidate — determinism", () => {
  it("returns identical results for identical inputs", () => {
    const input = safeInternal({
      sensitiveDomains: ["MODEL_WEIGHTS"],
      riskLevel: "HIGH",
      evidenceStrength: "MODERATE",
      expectedImpact: "MEDIUM",
    });
    const a = scoreCandidate(input);
    const b = scoreCandidate(input);
    expect(a).toEqual(b);
  });

  it("does not mutate its input", () => {
    const input = safeInternal({ sensitiveDomains: ["PUBLIC_PICKS"] });
    const snapshot = JSON.stringify(input);
    scoreCandidate(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("freezes the reasons array on the result", () => {
    const r = scoreCandidate(safeInternal());
    expect(Object.isFrozen(r.reasons)).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});
