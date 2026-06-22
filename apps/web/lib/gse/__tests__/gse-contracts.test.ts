import { describe, it, expect } from "vitest";
import {
  GSE_SOURCE_REGISTRY,
  INTEGRITY_INVARIANTS,
  approvedSources,
  excludedSources,
  fantasyPlatformSources,
  automatedSources,
  sourceById,
} from "../source-rights-gates";
import {
  DECISION_GRAPH,
  DECISION_OS_TIERS,
  auditRequiredNodes,
  blockingGateNodes,
  graphNodeById,
  tierConfig,
} from "../decision-graph-roadmap";
import {
  TRUST_TIER_DEFINITIONS,
  UNIT_ECONOMICS,
  ARR_PROJECTIONS,
  currentTierDefinition,
  proAnnualSavings,
  eliteAnnualSavings,
} from "../revenue-operating-model";

// ── Source rights gates ───────────────────────────────────────────────────────

describe("source-rights-gates", () => {
  it("documents at least 8 sources", () => {
    expect(GSE_SOURCE_REGISTRY.length).toBeGreaterThanOrEqual(8);
  });

  it("every source has required fields", () => {
    for (const src of GSE_SOURCE_REGISTRY) {
      expect(src.sourceId).toBeTruthy();
      expect(src.name).toBeTruthy();
      expect(src.status).toBeTruthy();
      expect(src.dataCategory).toBeTruthy();
      expect(typeof src.automationAllowed).toBe("boolean");
      expect(typeof src.apiAvailable).toBe("boolean");
      expect(typeof src.fantasyPlatform).toBe("boolean");
      expect(Array.isArray(src.extractableDataTypes)).toBe(true);
      expect(Array.isArray(src.prohibitedDataTypes)).toBe(true);
      expect(Array.isArray(src.complianceNotes)).toBe(true);
      expect(Array.isArray(src.gseUseCases)).toBe(true);
    }
  });

  it("approvedSources returns only approved statuses", () => {
    const approved = approvedSources();
    expect(approved.length).toBeGreaterThan(0);
    const validStatuses = [
      "approved_api",
      "approved_open_license",
      "approved_public_logged_off",
      "approved_written_permission",
    ];
    for (const src of approved) {
      expect(validStatuses).toContain(src.status);
    }
  });

  it("excludedSources returns only excluded sources", () => {
    const excluded = excludedSources();
    for (const src of excluded) {
      expect(src.status).toBe("excluded");
    }
  });

  it("siriusxm_activator is excluded", () => {
    const src = sourceById("siriusxm_activator");
    expect(src).toBeDefined();
    expect(src?.status).toBe("excluded");
    expect(src?.automationAllowed).toBe(false);
  });

  it("ESPN fantasy is not permitted for automation", () => {
    const src = sourceById("espn_fantasy");
    expect(src).toBeDefined();
    expect(src?.automationAllowed).toBe(false);
  });

  it("nflverse is approved open license", () => {
    const src = sourceById("nflverse");
    expect(src?.status).toBe("approved_open_license");
    expect(src?.automationAllowed).toBe(true);
  });

  it("documents 11 integrity invariants", () => {
    expect(INTEGRITY_INVARIANTS.length).toBe(11);
  });

  it("integrity invariants include clearance check requirement", () => {
    const clearanceInvariant = INTEGRITY_INVARIANTS.find((inv) =>
      inv.includes("checkClearance()")
    );
    expect(clearanceInvariant).toBeDefined();
  });

  it("automatedSources only includes sources with automationAllowed=true", () => {
    const auto = automatedSources();
    for (const src of auto) {
      expect(src.automationAllowed).toBe(true);
    }
  });

  it("no duplicate source IDs", () => {
    const ids = GSE_SOURCE_REGISTRY.map((s) => s.sourceId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ── Decision graph ────────────────────────────────────────────────────────────

describe("decision-graph-roadmap", () => {
  it("documents a full decision OS graph", () => {
    expect(DECISION_GRAPH.length).toBeGreaterThanOrEqual(7);
  });

  it("every node has required fields", () => {
    for (const node of DECISION_GRAPH) {
      expect(node.id).toBeTruthy();
      expect(node.type).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(node.description).toBeTruthy();
      expect(Array.isArray(node.inputs)).toBe(true);
      expect(Array.isArray(node.outputs)).toBe(true);
      expect(Array.isArray(node.gateConditions)).toBe(true);
      expect(typeof node.auditRequired).toBe("boolean");
    }
  });

  it("data_ingest node is blocking and requires audit", () => {
    const node = graphNodeById("data_ingest");
    expect(node).toBeDefined();
    expect(node?.failureBehavior).toBe("block");
    expect(node?.auditRequired).toBe(true);
  });

  it("no_play_gate node exists and is blocking", () => {
    const node = graphNodeById("no_play_gate");
    expect(node).toBeDefined();
    expect(node?.failureBehavior).toBe("block");
  });

  it("auditRequiredNodes returns only nodes with auditRequired=true", () => {
    const audited = auditRequiredNodes();
    expect(audited.length).toBeGreaterThan(0);
    for (const node of audited) {
      expect(node.auditRequired).toBe(true);
    }
  });

  it("blockingGateNodes returns only blocking nodes", () => {
    const blocking = blockingGateNodes();
    expect(blocking.length).toBeGreaterThan(0);
    for (const node of blocking) {
      expect(node.failureBehavior).toBe("block");
    }
  });

  it("documents 3 decision OS tiers", () => {
    expect(DECISION_OS_TIERS.length).toBe(3);
  });

  it("tierConfig returns correct tier", () => {
    const free = tierConfig("free");
    expect(free.tier).toBe("free");
    expect(free.evidenceVisible).toBe(false);
    expect(free.alertsEnabled).toBe(false);

    const elite = tierConfig("elite");
    expect(elite.tier).toBe("elite");
    expect(elite.evidenceVisible).toBe(true);
    expect(elite.alertsEnabled).toBe(true);
  });

  it("free tier has limited picks per week", () => {
    const free = tierConfig("free");
    expect(free.maxDecisionsPerWeek).not.toBeNull();
    expect(free.maxDecisionsPerWeek!).toBeLessThanOrEqual(7);
  });

  it("pro and elite tiers have unlimited picks", () => {
    expect(tierConfig("pro").maxDecisionsPerWeek).toBeNull();
    expect(tierConfig("elite").maxDecisionsPerWeek).toBeNull();
  });
});

// ── Revenue operating model ───────────────────────────────────────────────────

describe("revenue-operating-model", () => {
  it("documents 4 trust tiers", () => {
    expect(TRUST_TIER_DEFINITIONS.length).toBe(4);
  });

  it("FOUNDING tier prices match CLAUDE.md spec", () => {
    const founding = currentTierDefinition("FOUNDING");
    expect(founding.proMonthlyUsd).toBeCloseTo(14.99, 2);
    expect(founding.proAnnualUsd).toBe(99);
    expect(founding.eliteMonthlyUsd).toBeCloseTo(24.99, 2);
    expect(founding.eliteAnnualUsd).toBe(179);
  });

  it("founding members are grandfathered across all tiers", () => {
    for (const tier of TRUST_TIER_DEFINITIONS) {
      expect(tier.foundingMembersGrandfathered).toBe(true);
    }
  });

  it("prices increase from FOUNDING to AUTHORITY", () => {
    const prices = TRUST_TIER_DEFINITIONS.map((t) => t.proMonthlyUsd);
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i + 1]!).toBeGreaterThan(prices[i]!);
    }
  });

  it("PROVEN tier requires min 100 settled picks gate", () => {
    const proven = currentTierDefinition("PROVEN");
    const gate = proven.milestoneGates.find((g) => g.id === "min_100_settled_picks");
    expect(gate).toBeDefined();
    expect(gate?.requiresVerification).toBe(true);
  });

  it("ESTABLISHED tier requires CLV verification", () => {
    const established = currentTierDefinition("ESTABLISHED");
    const gate = established.milestoneGates.find((g) => g.id === "verified_clv");
    expect(gate).toBeDefined();
  });

  it("annual savings are positive for all tiers", () => {
    for (const tier of TRUST_TIER_DEFINITIONS) {
      expect(proAnnualSavings(tier.tier)).toBeGreaterThan(0);
      expect(eliteAnnualSavings(tier.tier)).toBeGreaterThan(0);
    }
  });

  it("documents unit economics for each tier", () => {
    expect(UNIT_ECONOMICS.length).toBe(4);
    for (const ue of UNIT_ECONOMICS) {
      expect(ue.targetLtvCacRatio).toBeGreaterThan(0);
      expect(ue.targetPaybackMonths).toBeGreaterThan(0);
      expect(Array.isArray(ue.churnRiskFactors)).toBe(true);
      expect(Array.isArray(ue.retentionDrivers)).toBe(true);
    }
  });

  it("LTV/CAC ratio improves from FOUNDING to AUTHORITY", () => {
    const ratios = UNIT_ECONOMICS.map((ue) => ue.targetLtvCacRatio);
    for (let i = 0; i < ratios.length - 1; i++) {
      expect(ratios[i + 1]!).toBeGreaterThanOrEqual(ratios[i]!);
    }
  });

  it("ARR projections cover all 4 stages with increasing ranges", () => {
    expect(ARR_PROJECTIONS.length).toBe(4);
    for (const proj of ARR_PROJECTIONS) {
      expect(proj.targetArrRangeHigh).toBeGreaterThan(proj.targetArrRangeLow);
    }
  });
});
