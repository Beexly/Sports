import { describe, it, expect } from "vitest";
import {
  buildSelfModel,
  getKnowledgeForDomain,
  isKnowledgeStale,
  recordSelfCorrection,
  summarizeSelfModelForOwner,
  type KnowledgeDomain,
} from "../self-knowledge";
import type { OwnerSummary } from "../../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "../intelligence-state";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeOwnerSummary(overrides: Partial<OwnerSummary> = {}): OwnerSummary {
  return {
    overallColor: "GREEN",
    oneLiner: "Platform GREEN.",
    picks: {
      today: 3,
      isPublicGateOpen: true,
      publicReadyCount: 3,
      blockedReason: null,
      canonicalPending: 1,
      canonicalSettled: 10,
      bootstrapExcluded: 0,
      totalInSystem: 11,
      publicReadinessExplanation: "",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 10,
      minimumRequired: 100,
      remainingToThreshold: 90,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: [],
      smallSampleWarning: true,
      record: "7-3",
    },
    departments: [],
    decisions: [],
    criticalWarnings: [],
    advisoryWarnings: [],
    aiOps: {
      available: false,
      reason: "Not wired",
      modelLanePolicy: [],
      toInstrumentNext: ["Wire Langfuse", "Wire Helicone"],
      ccusageNote: "",
    },
    assessedAt: new Date().toISOString(),
    jarvisVersion: "v2-test",
    ...overrides,
  };
}

function makeOSState(summary: OwnerSummary): JarvisIntelligenceState {
  return {
    summary,
    capabilities: [],
    capabilityStats: {
      total: 0,
      active: 0,
      draftOnly: 0,
      manual: 0,
      designed: 0,
      notWired: 0,
      wiringScore: 0,
      wiringLabel: "0% wired",
    },
    council: [],
    councilCounts: {
      total: 0,
      draftOnly: 0,
      manual: 0,
      notWired: 0,
      registeredCockpitAgents: 0,
    },
    operatingLoop: [],
    memory: {
      wired: false,
      truth: "Not wired",
      protocolDocs: [],
      nextAction: "Wire memory",
    },
    assessedAt: summary.assessedAt,
  };
}

// ─── buildSelfModel ───────────────────────────────────────────────────────────

describe("buildSelfModel", () => {
  it("returns a self model with knowledgeMap", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    expect(model.knowledgeMap.length).toBeGreaterThan(0);
  });

  it("cannotDoList includes voice (NOT_WIRED)", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const voiceEntry = model.cannotDoList.find((item) =>
      item.toLowerCase().includes("voice"),
    );
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry).toContain("NOT_WIRED");
  });

  it("cannotDoList includes external tools (NOT_WIRED)", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const externalEntry = model.cannotDoList.find((item) =>
      item.toLowerCase().includes("external tool") ||
      item.toLowerCase().includes("mcp"),
    );
    expect(externalEntry).toBeDefined();
    expect(externalEntry).toContain("NOT_WIRED");
  });

  it("MEMORY_STORE domain has isKnown=false (no DB/vector wired)", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const memEntry = model.knowledgeMap.find(
      (e) => e.domain === "MEMORY_STORE",
    );
    expect(memEntry).toBeDefined();
    expect(memEntry?.isKnown).toBe(false);
  });

  it("VOICE_INTERFACE domain has isKnown=false", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const voiceEntry = model.knowledgeMap.find(
      (e) => e.domain === "VOICE_INTERFACE",
    );
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry?.isKnown).toBe(false);
  });

  it("EXTERNAL_TOOLS domain has isKnown=false", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const extEntry = model.knowledgeMap.find(
      (e) => e.domain === "EXTERNAL_TOOLS",
    );
    expect(extEntry).toBeDefined();
    expect(extEntry?.isKnown).toBe(false);
  });

  it("selfCorrectionLog starts empty", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    expect(model.selfCorrectionLog).toHaveLength(0);
  });

  it("canDoList is non-empty", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    expect(model.canDoList.length).toBeGreaterThan(0);
  });

  it("confidence is HIGH for GREEN platform with no critical warnings", () => {
    const summary = makeOwnerSummary({
      overallColor: "GREEN",
      criticalWarnings: [],
    });
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    expect(model.confidenceLevel).toBe("HIGH");
  });

  it("confidence is LOW for RED platform", () => {
    const summary = makeOwnerSummary({
      overallColor: "RED",
    });
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    expect(model.confidenceLevel).toBe("LOW");
  });
});

// ─── getKnowledgeForDomain ────────────────────────────────────────────────────

describe("getKnowledgeForDomain", () => {
  it("returns the correct entry for a known domain", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const entry = getKnowledgeForDomain(model, "PLATFORM_STATE");
    expect(entry.domain).toBe("PLATFORM_STATE");
  });

  it("returns UNKNOWN entry for a domain not in the model", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const entry = getKnowledgeForDomain(model, "SOME_UNKNOWN_DOMAIN" as KnowledgeDomain);
    expect(entry.isKnown).toBe(false);
    expect(entry.confidence).toBe("UNKNOWN");
  });
});

// ─── isKnowledgeStale ─────────────────────────────────────────────────────────

describe("isKnowledgeStale", () => {
  it("returns false for a FRESH entry", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const entry = getKnowledgeForDomain(model, "PLATFORM_STATE");
    const now = new Date().toISOString();
    // Just assessed — should not be stale
    expect(isKnowledgeStale(entry, now)).toBe(false);
  });

  it("returns true for a STALE entry (old timestamp)", () => {
    const oldTimestamp = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12h ago
    const entry = {
      domain: "PLATFORM_STATE" as const,
      isKnown: true,
      confidence: "HIGH" as const,
      source: "test",
      freshnessStatus: "STALE" as const,
      lastUpdated: oldTimestamp,
      gapDescription: null,
      howToFill: null,
    };
    const now = new Date().toISOString();
    expect(isKnowledgeStale(entry, now)).toBe(true);
  });

  it("returns true for a null lastUpdated", () => {
    const entry = {
      domain: "MEMORY_STORE" as const,
      isKnown: false,
      confidence: "UNKNOWN" as const,
      source: "test",
      freshnessStatus: "UNKNOWN" as const,
      lastUpdated: null,
      gapDescription: null,
      howToFill: null,
    };
    const now = new Date().toISOString();
    expect(isKnowledgeStale(entry, now)).toBe(true);
  });
});

// ─── recordSelfCorrection ─────────────────────────────────────────────────────

describe("recordSelfCorrection", () => {
  it("appends to selfCorrectionLog", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const corrected = recordSelfCorrection(
      model,
      "Earlier I said picks were 3; actually 4.",
    );
    expect(corrected.selfCorrectionLog).toHaveLength(1);
    expect(corrected.selfCorrectionLog[0]).toContain("Earlier I said picks were 3");
  });

  it("does NOT mutate the original model", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    recordSelfCorrection(model, "A correction");
    expect(model.selfCorrectionLog).toHaveLength(0);
  });

  it("appends multiple corrections in order", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const m1 = recordSelfCorrection(model, "First correction");
    const m2 = recordSelfCorrection(m1, "Second correction");
    expect(m2.selfCorrectionLog).toHaveLength(2);
  });
});

// ─── summarizeSelfModelForOwner ───────────────────────────────────────────────

describe("summarizeSelfModelForOwner", () => {
  it("returns a non-empty string", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const text = summarizeSelfModelForOwner(model);
    expect(text.length).toBeGreaterThan(0);
  });

  it("includes WHAT I KNOW section", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const text = summarizeSelfModelForOwner(model);
    expect(text).toContain("WHAT I KNOW");
  });

  it("includes WHAT I DON'T KNOW section", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const text = summarizeSelfModelForOwner(model);
    expect(text).toContain("WHAT I DON'T KNOW");
  });

  it("includes NEED FROM YOU section", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const model = buildSelfModel(summary, osState);
    const text = summarizeSelfModelForOwner(model);
    expect(text).toContain("NEED FROM YOU");
  });
});
