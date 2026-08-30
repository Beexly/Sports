import { describe, expect, it } from "vitest";
import {
  ANALYST_FIVE_QUESTIONS,
  ANALYST_VOICE_EXEMPLARS,
  ANALYST_VOICE_PROMPT_BLOCK,
  BANNED_ANALYST_PHRASES,
} from "@/lib/voice/analyst-standard";
import { PICK_EXPLAINER_SYSTEM } from "@/lib/pick-explainer/prompts";

/**
 * Owner doctrine (2026-06-12): generated explanation copy speaks in the
 * Galaxy analyst voice — direct, human, skeptical — never generic AI
 * marketing. These tests pin the standard and its wiring so a future prompt
 * edit can't silently drop it.
 */

describe("analyst voice standard", () => {
  it("answers all five analyst questions", () => {
    expect(ANALYST_FIVE_QUESTIONS).toHaveLength(5);
    expect(ANALYST_FIVE_QUESTIONS.join(" ")).toMatch(/No-Bet/);
  });

  it("bans the generic-AI marketing register", () => {
    for (const phrase of [
      "leveraging advanced analytics",
      "data-driven insights",
      "compelling opportunity",
      "ai-powered",
    ]) {
      expect(BANNED_ANALYST_PHRASES).toContain(phrase);
    }
  });

  it("desk exemplars never claim certainty or use tout language", () => {
    for (const { desk } of ANALYST_VOICE_EXEMPLARS) {
      // Bare "lock" included: the repo-wide trust-gate guardrail flags the
      // token even when negated, so the exemplars avoid it entirely.
      expect(desk.toLowerCase()).not.toMatch(
        /guaranteed|sure thing|risk-free|easy money|can't lose|free money|\block\b/
      );
    }
  });

  it("the pick explainer system prompt carries the voice block", () => {
    expect(PICK_EXPLAINER_SYSTEM).toContain("the desk, not a bot");
    expect(ANALYST_VOICE_PROMPT_BLOCK).toContain("Never robotic");
  });

  it("voice block stays compact so grounding rules keep owning safety", () => {
    expect(ANALYST_VOICE_PROMPT_BLOCK.split("\n").length).toBeLessThanOrEqual(12);
  });
});
