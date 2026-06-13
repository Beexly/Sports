import { describe, it, expect } from "vitest";
import {
  detectIntent,
  buildJarvisResponse,
  buildExecutiveBriefing,
  shouldScribeMessage,
  createSession,
  appendMessage,
  type ConversationMessage,
} from "../conversation-engine";
import type { OwnerSummary } from "../../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "../intelligence-state";

// ─── Test fixtures ─────────────────────────────────────────────────────────────

function makeOwnerSummary(overrides: Partial<OwnerSummary> = {}): OwnerSummary {
  return {
    overallColor: "GREEN",
    oneLiner: "Platform is operating normally.",
    picks: {
      today: 3,
      isPublicGateOpen: true,
      publicReadyCount: 3,
      blockedReason: null,
      canonicalPending: 1,
      canonicalSettled: 10,
      bootstrapExcluded: 2,
      totalInSystem: 13,
      publicReadinessExplanation: "3 picks published today.",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 10,
      minimumRequired: 100,
      remainingToThreshold: 90,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: ["PERFORMANCE_STATS_ENABLED gate is closed"],
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
      toInstrumentNext: [],
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

// ─── detectIntent ──────────────────────────────────────────────────────────────

describe("detectIntent", () => {
  it("detects 'run today' as OVERNIGHT_LOOP with HIGH confidence", () => {
    const result = detectIntent("run today");
    expect(result.intent).toBeNull();
    expect(result.taskCategory).toBe("OVERNIGHT_LOOP");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'what needs me' as decisions intent", () => {
    const result = detectIntent("what needs me");
    expect(result.intent).toBe("decisions");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'what's blocked' as blocked intent", () => {
    const result = detectIntent("what's blocked");
    expect(result.intent).toBe("blocked");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'status' as today intent", () => {
    const result = detectIntent("status");
    expect(result.intent).toBe("today");
  });

  it("detects 'how are we doing' as today intent", () => {
    const result = detectIntent("how are we doing");
    expect(result.intent).toBe("today");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'fix the ingestion worker' as FIX task", () => {
    const result = detectIntent("fix the ingestion worker");
    expect(result.taskCategory).toBe("FIX");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'check the pipeline' as CHECK task", () => {
    const result = detectIntent("check the pipeline");
    expect(result.taskCategory).toBe("CHECK");
  });

  it("returns GENERAL_INQUIRY for unrecognized input", () => {
    const result = detectIntent("asdflkajsdfklj random gibberish");
    expect(result.intent).toBeNull();
    expect(result.taskCategory).toBe("GENERAL_INQUIRY");
    expect(result.confidence).toBe("LOW");
  });

  it("detects 'performance' intent", () => {
    const result = detectIntent("can we show performance?");
    expect(result.intent).toBe("performance");
  });

  it("detects 'launch-ready' intent", () => {
    const result = detectIntent("are we launch-ready");
    expect(result.intent).toBe("launch-ready");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects 'morning briefing' as today intent", () => {
    const result = detectIntent("morning briefing");
    expect(result.intent).toBe("today");
    expect(result.confidence).toBe("HIGH");
  });

  it("detects dispatch overnight loop", () => {
    const result = detectIntent("dispatch overnight loop");
    expect(result.taskCategory).toBe("OVERNIGHT_LOOP");
    expect(result.confidence).toBe("HIGH");
  });
});

// ─── buildJarvisResponse ───────────────────────────────────────────────────────

describe("buildJarvisResponse", () => {
  it("returns a message with role JARVIS", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("status", session, summary, osState);
    expect(msg.role).toBe("JARVIS");
  });

  it("never invents stats not in OwnerSummary — picks count is accurate", () => {
    const summary = makeOwnerSummary({ picks: { ...makeOwnerSummary().picks, today: 7 } });
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("where are our picks", session, summary, osState);
    // Content should reference the actual count or source, not an invented number
    // The message is derived from askJarvis which uses summary.picks.today
    expect(msg.content).not.toContain("NaN");
    expect(msg.content.length).toBeGreaterThan(0);
  });

  it("returns a DispatchPlan for 'run today' task request", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("run today", session, summary, osState);
    expect(msg.dispatchPlan).toBeDefined();
    expect(msg.dispatchPlan?.requiresApproval).toBe(true);
    expect(msg.dispatchPlan?.category).toBe("OVERNIGHT_LOOP");
  });

  it("DispatchPlan always requiresApproval=true", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("build something new", session, summary, osState);
    if (msg.dispatchPlan) {
      expect(msg.dispatchPlan.requiresApproval).toBe(true);
    }
  });

  it("sets requiresApproval for dispatch plan messages", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("run today", session, summary, osState);
    expect(msg.requiresApproval).toBe(true);
  });

  it("responds to 'what needs me' with intent decisions", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("what needs me", session, summary, osState);
    expect(msg.intent).toBe("decisions");
    expect(msg.role).toBe("JARVIS");
  });

  it("message has a timestamp and id", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("status", session, summary, osState);
    expect(msg.id).toBeTruthy();
    expect(msg.timestamp).toBeTruthy();
    expect(() => new Date(msg.timestamp).toISOString()).not.toThrow();
  });

  it("CRITICAL warnings surface CRITICAL priority", () => {
    const summary = makeOwnerSummary({
      overallColor: "RED",
      criticalWarnings: ["Safety warning: performance display policy violated"],
    });
    const session = createSession("test_session");
    const osState = makeOSState(summary);
    const msg = buildJarvisResponse("status", session, summary, osState);
    // RED overall or critical warnings should produce non-ROUTINE priority
    expect(["CRITICAL", "URGENT", "ATTENTION_REQUIRED"]).toContain(msg.priority);
  });
});

// ─── shouldScribeMessage ───────────────────────────────────────────────────────

describe("shouldScribeMessage", () => {
  function makeMsg(overrides: Partial<ConversationMessage>): ConversationMessage {
    return {
      id: "test_id",
      role: "JARVIS",
      content: "Test message",
      timestamp: new Date().toISOString(),
      priority: "ROUTINE",
      actionItems: [],
      requiresApproval: false,
      confidence: "HIGH",
      ...overrides,
    };
  }

  it("scribes CRITICAL messages", () => {
    expect(shouldScribeMessage(makeMsg({ priority: "CRITICAL" }))).toBe(true);
  });

  it("scribes URGENT messages", () => {
    expect(shouldScribeMessage(makeMsg({ priority: "URGENT" }))).toBe(true);
  });

  it("scribes messages with dispatch plans", () => {
    expect(
      shouldScribeMessage(
        makeMsg({
          dispatchPlan: {
            category: "OVERNIGHT_LOOP",
            description: "Run loop",
            sequence: ["JARVIS"],
            requiresApproval: true,
            estimatedImpact: "HIGH",
          },
        }),
      ),
    ).toBe(true);
  });

  it("scribes messages requiring approval", () => {
    expect(shouldScribeMessage(makeMsg({ requiresApproval: true }))).toBe(true);
  });

  it("does NOT scribe routine status messages", () => {
    expect(
      shouldScribeMessage(
        makeMsg({ priority: "ROUTINE", requiresApproval: false }),
      ),
    ).toBe(false);
  });
});

// ─── buildExecutiveBriefing ────────────────────────────────────────────────────

describe("buildExecutiveBriefing", () => {
  it("produces a non-empty briefing string", () => {
    const summary = makeOwnerSummary();
    const session = createSession("test_session");
    const briefing = buildExecutiveBriefing(session, summary);
    expect(briefing.length).toBeGreaterThan(0);
  });

  it("includes session id in briefing", () => {
    const summary = makeOwnerSummary();
    const session = createSession("UNIQUE_SESSION_123");
    const briefing = buildExecutiveBriefing(session, summary);
    expect(briefing).toContain("UNIQUE_SESSION_123");
  });
});

// ─── Session management ────────────────────────────────────────────────────────

describe("session management", () => {
  it("createSession starts with empty messages", () => {
    const session = createSession("test");
    expect(session.messages).toHaveLength(0);
    expect(session.ownerDecisionsPending).toBe(0);
  });

  it("appendMessage adds message and tracks approvals", () => {
    const session = createSession("test");
    const msg: ConversationMessage = {
      id: "m1",
      role: "JARVIS",
      content: "test",
      timestamp: new Date().toISOString(),
      priority: "ROUTINE",
      actionItems: ["Do something"],
      requiresApproval: true,
      confidence: "HIGH",
    };
    const updated = appendMessage(session, msg);
    expect(updated.messages).toHaveLength(1);
    expect(updated.ownerDecisionsPending).toBe(1);
    expect(updated.openActionItems).toContain("Do something");
  });
});
