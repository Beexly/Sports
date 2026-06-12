import { describe, expect, it } from "vitest";
import {
  buildExecutiveBriefing,
  buildJarvisResponse,
  buildSessionScribe,
  detectIntent,
  shouldScribeMessage,
  type ConversationSession,
} from "../conversation-engine";
import { makeSummary } from "./fixtures";

const NOW = "2026-06-12T07:00:00.000Z";

function emptySession(): ConversationSession {
  return {
    sessionId: "s-test",
    startedAt: NOW,
    messages: [],
    openActionItems: [],
    ownerDecisionsPending: 1,
  };
}

describe("detectIntent", () => {
  it('"run today" → OVERNIGHT_LOOP with HIGH confidence', () => {
    const d = detectIntent("run today");
    expect(d.taskCategory).toBe("OVERNIGHT_LOOP");
    expect(d.confidence).toBe("HIGH");
  });

  it('"what needs me" → decisions intent', () => {
    expect(detectIntent("what needs me").intent).toBe("decisions");
    expect(detectIntent("What needs my decision?").intent).toBe("decisions");
  });

  it("maps the common executive phrasings", () => {
    expect(detectIntent("how are we doing").intent).toBe("today");
    expect(detectIntent("status").intent).toBe("today");
    expect(detectIntent("what's blocked").intent).toBe("blocked");
    expect(detectIntent("are we launch ready?").intent).toBe("launch-ready");
    expect(detectIntent("fix the settlement job").taskCategory).toBe("FIX");
  });

  it("unknown input falls back to general-inquiry at LOW confidence", () => {
    const d = detectIntent("zzz quantum hamster");
    expect(d.intent).toBe("general-inquiry");
    expect(d.confidence).toBe("LOW");
  });
});

describe("buildJarvisResponse", () => {
  it("task request returns an embedded DispatchPlan with a ready prompt", () => {
    const msg = buildJarvisResponse("run today", emptySession(), makeSummary(), NOW);
    expect(msg.dispatchPlan).toBeDefined();
    expect(msg.dispatchPlan!.category).toBe("OVERNIGHT_LOOP");
    expect(msg.dispatchPlan!.fullPrompt.length).toBeGreaterThan(0);
    expect(msg.requiresApproval).toBe(msg.dispatchPlan!.approvalRequired);
  });

  it("state-changing fix requires approval; read-only check does not", () => {
    const fix = buildJarvisResponse("fix the settlement job", emptySession(), makeSummary(), NOW);
    expect(fix.dispatchPlan).toBeDefined();
    expect(fix.requiresApproval).toBe(true);
    const check = buildJarvisResponse(
      "investigate the ingestion lag",
      emptySession(),
      makeSummary(),
      NOW
    );
    expect(check.dispatchPlan).toBeDefined();
    expect(check.requiresApproval).toBe(false);
  });

  it("never invents facts: unknown questions get the honest fallback", () => {
    const msg = buildJarvisResponse(
      "zzz quantum hamster forecast",
      emptySession(),
      makeSummary(),
      NOW
    );
    expect(msg.confidence).toBe("LOW");
    expect(msg.content).toContain("don't have a sourced answer");
    expect(msg.dispatchPlan).toBeUndefined();
  });

  it("question intents answer from OwnerSummary deterministically", () => {
    const summary = makeSummary();
    const a = buildJarvisResponse("what needs me", emptySession(), summary, NOW);
    const b = buildJarvisResponse("what needs me", emptySession(), summary, NOW);
    expect(a.content).toBe(b.content);
    expect(a.intent).toBe("decisions");
  });
});

describe("session synthesis", () => {
  it("buildExecutiveBriefing reports exchanges, dispatches, platform close state", () => {
    const session = emptySession();
    const text = buildExecutiveBriefing(session, makeSummary());
    expect(text).toContain("0 owner exchanges");
    expect(text).toContain("AMBER");
  });

  it("shouldScribeMessage: dispatches and criticals scribe; routine answers don't", () => {
    const dispatch = buildJarvisResponse("run today", emptySession(), makeSummary(), NOW);
    expect(shouldScribeMessage(dispatch)).toBe(true);
    const routine = buildJarvisResponse(
      "zzz nothing",
      emptySession(),
      makeSummary({ decisions: [], criticalWarnings: [] }),
      NOW
    );
    expect(shouldScribeMessage(routine)).toBe(false);
  });

  it("buildSessionScribe produces a HANDOFF vault entry", () => {
    const entry = buildSessionScribe(emptySession(), makeSummary(), NOW);
    expect(entry.type).toBe("HANDOFF");
    expect(entry.project).toBe("JARVIS");
    expect(entry.approvalStatus).toBe("NOT_REQUIRED");
  });
});
