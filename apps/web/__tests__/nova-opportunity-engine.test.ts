import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPPORTUNITY_SOURCES,
  assertLifecycleTransition,
  assertMoneyStateTransition,
  buildLearningReport,
  buildOpportunityPortfolio,
  canTransitionLifecycle,
  canTransitionMoneyState,
  detectMaterialChanges,
  enabledOpportunitySources,
  evaluateOpportunity,
  getOpportunitySource,
  runNovaCycle,
  validateSourceRegistry,
  type OpportunityCandidate,
  type OpportunityObservation,
  type OpportunityOutcome,
} from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:00:00.000Z");

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
    evidence: [
      {
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
      },
    ],
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

function outcome(index: number, success: boolean): OpportunityOutcome {
  return {
    candidateId: `candidate-${index}`,
    opportunityClass: "developer_tool",
    sourceIds: ["source-a"],
    measuredAt: "2026-07-21T12:00:00.000Z",
    success,
    shipped: success,
    rolledBack: !success,
    actualCashCostUsd: 0,
    actualOwnerHours: 2,
    actualDaysToFirstEvidence: 1,
    revenue30dUsd: 0,
    savings30dUsd: success ? 50 : 0,
    predictedSuccessProbability: 0.9,
    notes: [],
  };
}

describe("NOVA opportunity policy", () => {
  it("permits verified no-cash internal experimentation without granting external authority", () => {
    const decision = evaluateOpportunity(candidateFixture(), NOW);
    expect(["IMPLEMENT_INTERNAL", "PROTOTYPE_SANDBOX"]).toContain(decision.policy.disposition);
    expect(decision.score.priorityBand).not.toBe("HELD");
    expect(decision.policy.externalActionsAllowed).toBe(false);
    expect(decision.policy.automaticInstallAllowed).toBe(false);
    expect(decision.policy.automaticSpendAllowed).toBe(false);
    expect(decision.experiment?.budget.maxCashUsd).toBe(0);
  });

  it("holds a money claim without primary payout evidence", () => {
    const base = candidateFixture();
    const decision = evaluateOpportunity(
      candidateFixture({
        evidence: [
          {
            id: "community-claim",
            sourceId: "forum",
            tier: "community_signal",
            title: "Someone reported a large payout",
            url: "https://example.com/community",
            observedAt: "2026-07-20T12:00:00.000Z",
            contentFingerprint: "community",
            supports: ["Reported revenue payout"],
            rightsStatus: "public_metadata_only",
            directEvidence: false,
          },
        ],
        economics: {
          ...base.economics,
          moneyState: "approved",
          potentialRevenue: {
            low: 1000,
            high: 100000,
            currency: "USD",
            period: "annual",
            basis: "scenario",
          },
        },
      }),
      NOW,
    );
    expect(decision.policy.disposition).toBe("RESEARCH_MORE");
    expect(decision.score.priorityBand).toBe("HELD");
    expect(decision.policy.blockedReasons.join(" ")).toMatch(/money state approved/i);
  });

  it("blocks model training until training rights are cleared", () => {
    const decision = evaluateOpportunity(
      candidateFixture({
        opportunityClass: "model_or_training_program",
        involvesModelTraining: true,
        involvesDataSharing: true,
        rightsStatus: "unknown",
      }),
      NOW,
    );
    expect(decision.policy.disposition).toBe("RESEARCH_MORE");
    expect(decision.policy.blockedReasons.join(" ")).toMatch(/model training/i);
    expect(decision.policy.requiredReviews).toContain("AUDIT");
  });

  it("routes affiliate and partnership opportunities through owner review", () => {
    const decision = evaluateOpportunity(
      candidateFixture({
        opportunityClass: "affiliate_program",
        revenueLanes: ["affiliate"],
        requiresExternalAction: true,
        jurisdictionSensitive: true,
      }),
      NOW,
    );
    expect(decision.policy.disposition).toBe("OWNER_REVIEW");
    expect(decision.policy.requiredReviews).toEqual(
      expect.arrayContaining(["BOBBY", "METER", "AUDIT", "GAUGE", "Owner"]),
    );
  });

  it("preserves a direct-revenue and a cost experiment when capacity is scarce", () => {
    const direct = candidateFixture({
      id: "direct",
      title: "API product",
      opportunityClass: "app_product",
      revenueLanes: ["usage_based_api"],
      signals: { ...candidateFixture().signals, revenuePotential: 5, costReduction: 1 },
    });
    const cost = candidateFixture({ id: "cost", revenueLanes: ["cost_avoidance"] });
    const research = candidateFixture({ id: "research", revenueLanes: ["none"] });
    const portfolio = buildOpportunityPortfolio([research, direct, cost], { maxConcurrentExperiments: 2 }, NOW);
    expect(portfolio.activeExperiments.map((item) => item.candidate.id)).toEqual(
      expect.arrayContaining(["direct", "cost"]),
    );
  });

  it("rejects duplicate candidate ids", () => {
    expect(() => buildOpportunityPortfolio([candidateFixture(), candidateFixture()], undefined, NOW)).toThrow(
      /ids must be unique/i,
    );
  });
});

describe("NOVA change, source, lifecycle, and learning controls", () => {
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

  it("requires sequential opportunity and money-state evidence", () => {
    expect(canTransitionLifecycle("observed", "verified")).toBe(true);
    expect(canTransitionLifecycle("observed", "shipped")).toBe(false);
    expect(() => assertLifecycleTransition("observed", "shipped")).toThrow(/invalid opportunity lifecycle/i);
    expect(canTransitionMoneyState("discovered", "eligibility_unverified")).toBe(true);
    expect(canTransitionMoneyState("discovered", "paid")).toBe(false);
    expect(() => assertMoneyStateTransition("discovered", "paid")).toThrow(/invalid money-state/i);
  });

  it("measures calibration without changing production weights", () => {
    const report = buildLearningReport(
      [outcome(1, false), outcome(2, false), outcome(3, false), outcome(4, true)],
      NOW,
    );
    expect(report.overall.meanBrierScore).toBeGreaterThan(0.5);
    expect(report.weightChangesApplied).toBe(false);
    expect(report.recommendations.join(" ")).toMatch(/frozen|stronger evidence|low downstream yield/i);
  });

  it("does not claim self-learning without measured outcomes", () => {
    expect(buildLearningReport([], NOW).recommendations.join(" ")).toMatch(/must not claim self-learning/i);
  });

  it("runs a complete cycle while taking zero external or production actions", () => {
    const result = runNovaCycle({
      previousObservations: [],
      currentObservations: [
        observation({ title: "API deprecation deadline announced", labels: ["deprecation"] }),
      ],
      candidates: [candidateFixture()],
      outcomes: [],
      now: NOW,
    });
    expect(result.summary.sourcesChanged).toBe(1);
    expect(result.summary.criticalChanges).toBe(1);
    expect(result.summary.selectedExperiments).toBe(1);
    expect(result.summary.externalActionsTaken).toBe(0);
    expect(result.summary.productionChangesMade).toBe(0);
    expect(result.summary.weightsChanged).toBe(0);
  });
});
