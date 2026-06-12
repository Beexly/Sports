import { describe, it, expect } from "vitest";
import {
  askJarvis,
  JARVIS_QUESTIONS,
  JARVIS_INTENT_GROUPS,
  JARVIS_INTENT_ORDER,
} from "../ask-jarvis";
import { buildStubOwnerSummaryForOS } from "../../jarvis/os-state";

const NOW = "2026-06-12T10:00:00.000Z";

const summary = buildStubOwnerSummaryForOS(NOW);
const OS_INTENTS = JARVIS_INTENT_GROUPS.OS_LAYER;

describe("Ask Jarvis — OS layer expansion (structural)", () => {
  it("registers all 13 OS intents in the group, order, and questions", () => {
    expect(OS_INTENTS.length).toBe(13);
    for (const intent of OS_INTENTS) {
      expect(JARVIS_INTENT_ORDER).toContain(intent);
      expect(JARVIS_QUESTIONS[intent].length).toBeGreaterThan(0);
    }
  });

  it("new intents return valid JarvisAnswer without throwing", () => {
    for (const intent of OS_INTENTS) {
      const answer = askJarvis(intent, summary);
      expect(answer.intent).toBe(intent);
      expect(answer.question).toBe(JARVIS_QUESTIONS[intent]);
      expect(answer.answer.length).toBeGreaterThan(0);
      expect(answer.supportingState.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(answer.confidence);
    }
  });
});

describe("Ask Jarvis — OS layer honesty", () => {
  it("'can-you-talk' is honest that voice is not active", () => {
    const answer = askJarvis("can-you-talk", summary);
    expect(answer.answer).toMatch(/not yet|not active/i);
    expect(answer.supportingState.join(" ")).toContain("isActive: NO");
  });

  it("'prepare-next-prompt' returns a promptSuggestion", () => {
    const answer = askJarvis("prepare-next-prompt", summary);
    expect(answer.promptSuggestion).toBeDefined();
    expect(answer.promptSuggestion!.length).toBeGreaterThan(0);
    expect(answer.answer).toContain(answer.promptSuggestion!);
  });

  it("'what-tools-are-wired' explains wired vs not wired", () => {
    const answer = askJarvis("what-tools-are-wired", summary);
    expect(answer.answer).toMatch(/wired/i);
    expect(answer.answer).toMatch(/not wired|partial/i);
    expect(answer.supportingState.join(" ")).toMatch(/Requires approval/i);
  });

  it("'how-do-we-improve' reports canAutomaticallyAdjustPredictionEngine: false", () => {
    const answer = askJarvis("how-do-we-improve", summary);
    expect(answer.supportingState.join(" ")).toContain(
      "canAutomaticallyAdjustPredictionEngine: NO"
    );
    expect(answer.answer).toMatch(/never|proposals/i);
    expect(answer.approvalRequired).toBe(true);
  });

  it("'what-do-you-remember' reports memory not wired", () => {
    const answer = askJarvis("what-do-you-remember", summary);
    expect(answer.answer).toMatch(/nothing across sessions|not wired/i);
    expect(answer.supportingState.join(" ")).toContain("Wired: NO");
  });

  it("'summarize-airwave' is honest that Airwave is not in OwnerSummary", () => {
    const answer = askJarvis("summarize-airwave", summary);
    expect(answer.answer).toMatch(/not flow|does not flow|no live/i);
  });

  it("'can-you-act' enforces the approval boundary", () => {
    const answer = askJarvis("can-you-act", summary);
    expect(answer.answer).toMatch(/approval|boundar/i);
    expect(answer.approvalRequired).toBe(true);
  });

  it("'summarize-galaxy' composes operations and OS posture", () => {
    const answer = askJarvis("summarize-galaxy", summary);
    expect(answer.answer).toMatch(/OS posture/i);
    expect(answer.answer).toMatch(/wired/i);
  });

  it("'what-is-blocked-os' reports structural blockers", () => {
    const answer = askJarvis("what-is-blocked-os", summary);
    expect(answer.answer).toMatch(/blockers/i);
    expect(answer.supportingState.join(" ")).toMatch(/memory store not wired/i);
  });
});
