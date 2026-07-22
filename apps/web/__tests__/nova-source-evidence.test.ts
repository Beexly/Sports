/**
 * NOVA S3 — source-registry, change-detection, and evidence-assessment tests.
 *
 * Restores the S3-scope coverage that S1 deliberately deferred (S1's test
 * file injects a local fixture assessor; these tests exercise the real
 * `assessEvidence()` from `evidence.ts` and prove it satisfies the S1
 * `EvidenceAssessor` injection contract), plus the curated discovery
 * registry and deterministic change detection extracted from the frozen
 * #146 reference branch (fbc3cfe).
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPPORTUNITY_SOURCES,
  assessEvidence,
  detectMaterialChanges,
  enabledOpportunitySources,
  evaluateOpportunity,
  getOpportunitySource,
  observationKey,
  validateSourceRegistry,
  type EvidenceAssessor,
  type OpportunityCandidate,
  type OpportunityEvidence,
  type OpportunityObservation,
} from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:00:00.000Z");

function evidenceFixture(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    id: "evidence-1",
    sourceId: "official-source",
    tier: "official_primary",
    title: "Official release",
    url: "https://example.com/official",
    observedAt: "2026-07-20T12:00:00.000Z",
    publishedAt: "2026-07-20T10:00:00.000Z",
    contentFingerprint: "abc123",
    supports: ["Official pricing and cost reduction terms"],
    rightsStatus: "public_metadata_only",
    directEvidence: true,
    ...overrides,
  };
}

function candidateFixture(overrides: Partial<OpportunityCandidate> = {}): OpportunityCandidate {
  const base: OpportunityCandidate = {
    id: "candidate-1",
    title: "Local inference lane improvement",
    summary: "A rights-cleared, no-cash internal improvement with official evidence.",
    opportunityClass: "cost_reduction",
    revenueLanes: ["cost_avoidance"],
    targetProjects: ["GSE"],
    observedAt: "2026-07-20T12:00:00.000Z",
    lifecycleState: "verified",
    evidence: [evidenceFixture()],
    economics: {
      moneyState: "discovered",
      potentialSavings: {
        low: 25,
        high: 100,
        currency: "USD",
        period: "monthly",
        basis: "scenario",
      },
      requiredCashUsd: 0,
      requiredOwnerHours: 2,
      expectedDaysToFirstEvidence: 1,
      expectedDaysToCash: null,
      recurringPotential: true,
      eligibilityRequirements: [],
      economicAssumptions: ["Savings must be measured against the current provider lane."],
    },
    signals: {
      strategicFit: 5,
      evidenceStrength: 5,
      revenuePotential: 3,
      timeToValue: 5,
      recurringLeverage: 5,
      dataFlywheel: 3,
      distributionLeverage: 2,
      costReduction: 5,
      defensibility: 3,
      reversibility: 5,
      learningValue: 4,
      urgency: 3,
    },
    risks: {
      cashRisk: 0,
      ownerTimeRisk: 1,
      implementationComplexity: 1,
      legalRisk: 0,
      securityRisk: 1,
      dataRightsRisk: 0,
      vendorLockInRisk: 1,
      volatilityRisk: 2,
    },
    rightsStatus: "cleared",
    securityPosture: "trusted_read_only",
    requiresExternalAction: false,
    requiresCredentials: false,
    involvesDataSharing: false,
    involvesModelTraining: false,
    jurisdictionSensitive: false,
    proposedActions: ["Run a shadow benchmark"],
    tags: ["local", "cost"],
  };
  return { ...base, ...overrides };
}

function observation(overrides: Partial<OpportunityObservation> = {}): OpportunityObservation {
  return {
    sourceId: "vendor",
    externalId: "release-1",
    title: "New SDK release",
    url: "https://example.com/release-1",
    publishedAt: "2026-07-20T10:00:00.000Z",
    observedAt: "2026-07-20T11:00:00.000Z",
    contentFingerprint: "v1",
    labels: ["sdk"],
    ...overrides,
  };
}

describe("NOVA curated source registry (S3)", () => {
  it("keeps the curated source registry structurally valid", () => {
    expect(validateSourceRegistry()).toEqual([]);
    expect(DEFAULT_OPPORTUNITY_SOURCES.length).toBeGreaterThanOrEqual(20);
  });

  it("discovers MCP broadly but never treats registry presence as install authority", () => {
    expect(getOpportunitySource("mcp-official-registry")?.enabledByDefault).toBe(true);
    expect(getOpportunitySource("mcp-official-registry")?.prohibitedCapture).toContain("automatic install");
  });

  it("leaves crypto payment experimentation disabled by default", () => {
    expect(getOpportunitySource("coinbase-x402")?.enabledByDefault).toBe(false);
    expect(enabledOpportunitySources()).not.toContainEqual(expect.objectContaining({ id: "coinbase-x402" }));
  });

  it("flags registry entries that lose their capture contracts", () => {
    const first = DEFAULT_OPPORTUNITY_SOURCES[0];
    if (!first) throw new Error("curated registry must not be empty");
    const errors = validateSourceRegistry([
      { ...first, allowedCapture: [] },
      { ...first, url: "http://insecure.example" },
      first,
    ]);
    expect(errors.some((error) => error.includes("allowed-capture"))).toBe(true);
    expect(errors.some((error) => error.includes("HTTPS"))).toBe(true);
    expect(errors.some((error) => error.includes("Duplicate source id"))).toBe(true);
  });
});

describe("NOVA change detection (S3)", () => {
  it("detects critical deprecations and high-value credit announcements", () => {
    const changes = detectMaterialChanges(
      [observation()],
      [
        observation({ title: "SDK deprecated August 1", contentFingerprint: "v2", labels: ["deprecation"] }),
        observation({ externalId: "new", title: "New startup credit", contentFingerprint: "new", labels: ["credit"] }),
      ],
    );
    expect(changes.find((change) => change.current?.externalId === "release-1")?.materiality).toBe("CRITICAL");
    expect(changes.find((change) => change.current?.externalId === "new")?.materiality).toBe("HIGH");
  });

  it("records removals without inventing materiality and keeps unchanged items quiet", () => {
    const changes = detectMaterialChanges(
      [observation(), observation({ externalId: "gone", title: "Old entry", contentFingerprint: "g1" })],
      [observation()],
    );
    const removed = changes.find((change) => change.kind === "REMOVED");
    expect(removed?.previous?.externalId).toBe("gone");
    expect(removed?.reasons.join(" ")).toMatch(/absent from the current source snapshot/i);
    expect(changes.find((change) => change.kind === "UNCHANGED")?.materiality).toBe("LOW");
  });

  it("keys observations by stable external id and falls back to normalized content", () => {
    expect(observationKey(observation())).toBe("vendor:release-1");
    const anonymous = observation({ externalId: "  " });
    expect(observationKey(anonymous)).toMatch(/^vendor:[a-z0-9]+$/);
    expect(observationKey(anonymous)).toBe(observationKey(observation({ externalId: "" })));
  });
});

describe("NOVA evidence assessment (S3)", () => {
  it("satisfies the S1 EvidenceAssessor injection contract exactly", () => {
    const assessor: EvidenceAssessor = assessEvidence;
    const decision = evaluateOpportunity(candidateFixture(), assessor, NOW);
    expect(decision.evidence.primaryEvidenceCount).toBe(1);
    expect(decision.evidence.hasMoneyClaimEvidence).toBe(true);
    expect(decision.generatedAt).toBe(NOW.toISOString());
  });

  it("scores primary official evidence above unverified claims", () => {
    const official = assessEvidence(candidateFixture(), NOW);
    const rumor = assessEvidence(
      candidateFixture({ evidence: [evidenceFixture({ tier: "unverified_claim", directEvidence: false })] }),
      NOW,
    );
    expect(official.evidenceScore).toBeGreaterThan(rumor.evidenceScore);
    expect(official.primaryEvidenceCount).toBe(1);
    expect(rumor.primaryEvidenceCount).toBe(0);
    expect(rumor.missingClaims).toContain("No primary or official evidence attached.");
  });

  it("returns a zero score and explicit missing claims when no evidence is attached", () => {
    const assessment = assessEvidence(candidateFixture({ evidence: [] }), NOW);
    expect(assessment.evidenceScore).toBe(0);
    expect(assessment.missingClaims).toContain("No evidence attached.");
    expect(assessment.missingClaims).toContain("No primary or official evidence attached.");
  });

  it("marks evidence older than the 45-day staleness horizon", () => {
    const fresh = assessEvidence(candidateFixture(), NOW);
    const stale = assessEvidence(
      candidateFixture({ evidence: [evidenceFixture({ observedAt: "2026-05-01T00:00:00.000Z" })] }),
      NOW,
    );
    expect(fresh.stale).toBe(false);
    expect(stale.stale).toBe(true);
    expect(stale.evidenceScore).toBeLessThan(fresh.evidenceScore);
  });

  it("penalizes contradicted evidence and reports the contradiction", () => {
    const contradicted = assessEvidence(
      candidateFixture({
        evidence: [evidenceFixture(), evidenceFixture({ id: "evidence-2", contradicts: ["Pricing claim disputed"] })],
      }),
      NOW,
    );
    expect(contradicted.hasContradiction).toBe(true);
    const clean = assessEvidence(
      candidateFixture({ evidence: [evidenceFixture(), evidenceFixture({ id: "evidence-2" })] }),
      NOW,
    );
    expect(contradicted.evidenceScore).toBeLessThan(clean.evidenceScore);
  });

  it("requires primary evidence for money-bearing claims", () => {
    const moneyWithoutEvidence = assessEvidence(
      candidateFixture({
        evidence: [evidenceFixture({ supports: ["General feature notes"] })],
      }),
      NOW,
    );
    expect(moneyWithoutEvidence.hasMoneyClaimEvidence).toBe(false);
    expect(moneyWithoutEvidence.missingClaims).toContain(
      "Money, credit, pricing, or payout assumptions lack primary evidence.",
    );
  });

  it("blocks uncleared data-sharing and model-training rights", () => {
    const assessment = assessEvidence(
      candidateFixture({
        involvesDataSharing: true,
        involvesModelTraining: true,
        rightsStatus: "terms_review_required",
      }),
      NOW,
    );
    expect(assessment.missingClaims).toContain("Data-sharing rights are not cleared.");
    expect(assessment.missingClaims).toContain("Model-training rights are not cleared.");
  });
});
