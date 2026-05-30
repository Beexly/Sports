/**
 * Targeted coverage for detectModelCourtRefusal and evaluateModelCourtAnswerPolicy
 * branches not reached by model-court-answer.test.ts.
 *
 * The primary test covers: BETTING_CERTAINTY (via answerModelCourtQuestion),
 * PERSONAL_ADVICE (direct), EVIDENCE_THIN (via thin node), MISSING_CITATION,
 * and BETTING_CERTAINTY+PERSONAL_ADVICE in answer output.
 *
 * This file covers the remaining refusal kinds and answer policy branches
 * by calling the pure functions directly.
 */

import { describe, it, expect } from "vitest";
import {
  detectModelCourtRefusal,
  evaluateModelCourtAnswerPolicy,
} from "@/lib/intelligence-graph/model-court/answer";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import { fixtureGame, fixturePick, fixtureSignals } from "@/__fixtures__/intelligence-graph/game-node";

const VALID_CITATION = "(source: market at 2026-05-22T18:00:00.000Z)";

const goodNode = buildGameIntelligenceNode({
  game: fixtureGame,
  picks: [fixturePick],
  signals: fixtureSignals,
  now: new Date("2026-05-22T18:30:00.000Z"),
});

// ============================================================
// detectModelCourtRefusal — GAME_NOT_IN_CONTEXT
// ============================================================

describe("detectModelCourtRefusal — GAME_NOT_IN_CONTEXT", () => {
  it("returns GAME_NOT_IN_CONTEXT when mode is ASK_THIS_GAME and node is absent", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THIS_GAME",
      question: "What factors support the home team?",
    });
    expect(result).toBe("GAME_NOT_IN_CONTEXT");
  });

  it("returns GAME_NOT_IN_CONTEXT when mode is EXPLAIN_FOR_MY_LENS with no lens", () => {
    const result = detectModelCourtRefusal({
      mode: "EXPLAIN_FOR_MY_LENS",
      question: "Explain this pick for my betting style.",
      node: goodNode,
      // lens is absent
    });
    expect(result).toBe("GAME_NOT_IN_CONTEXT");
  });

  it("does NOT return GAME_NOT_IN_CONTEXT for ASK_THE_SLATE with no node", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "What is the best pick today?",
    });
    // ASK_THE_SLATE doesn't require a node — should not get GAME_NOT_IN_CONTEXT
    // (may return another refusal or null, but not GAME_NOT_IN_CONTEXT)
    expect(result).not.toBe("GAME_NOT_IN_CONTEXT");
  });
});

// ============================================================
// detectModelCourtRefusal — EV_KELLY_WINRATE
// ============================================================

describe("detectModelCourtRefusal — EV_KELLY_WINRATE", () => {
  it("returns EV_KELLY_WINRATE for 'expected value' question", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "What is the expected value on tonight's picks?",
    });
    expect(result).toBe("EV_KELLY_WINRATE");
  });

  it("returns EV_KELLY_WINRATE for 'kelly' question", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "Should I use kelly criterion here?",
    });
    expect(result).toBe("EV_KELLY_WINRATE");
  });

  it("returns EV_KELLY_WINRATE for 'win rate' question", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "What is the win rate on spread picks?",
    });
    expect(result).toBe("EV_KELLY_WINRATE");
  });

  it("returns EV_KELLY_WINRATE for 'ROI' question", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "What is the ROI on NBA picks this season?",
    });
    expect(result).toBe("EV_KELLY_WINRATE");
  });
});

// ============================================================
// detectModelCourtRefusal — COMPETITOR_COMPARE
// ============================================================

describe("detectModelCourtRefusal — COMPETITOR_COMPARE", () => {
  it("returns COMPETITOR_COMPARE for 'better than' question", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THE_SLATE",
      question: "Is this service better than DraftKings picks?",
    });
    expect(result).toBe("COMPETITOR_COMPARE");
  });
});

// ============================================================
// detectModelCourtRefusal — EVIDENCE_THIN via score < 55
// ============================================================

describe("detectModelCourtRefusal — EVIDENCE_THIN via score threshold", () => {
  it("returns EVIDENCE_THIN when node evidenceHealth.score is below 55", () => {
    // A node with no signals will have a very low evidenceHealth score
    const lowScoreNode = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "game-low-score" },
      picks: [],
      signals: [],
    });
    const result = detectModelCourtRefusal({
      mode: "ASK_THIS_GAME",
      node: lowScoreNode,
      question: "What factors are most important here?",
    });
    expect(result).toBe("EVIDENCE_THIN");
  });
});

// ============================================================
// detectModelCourtRefusal — null (no refusal)
// ============================================================

describe("detectModelCourtRefusal — null (no refusal)", () => {
  it("returns null for a well-grounded question with good evidence", () => {
    const result = detectModelCourtRefusal({
      mode: "ASK_THIS_GAME",
      node: goodNode,
      question: "What does the line movement tell us about this game?",
    });
    expect(result).toBeNull();
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — EMPTY
// ============================================================

describe("evaluateModelCourtAnswerPolicy — EMPTY", () => {
  it("returns EMPTY for an empty string", () => {
    const failures = evaluateModelCourtAnswerPolicy("");
    expect(failures).toContain("EMPTY");
  });

  it("returns EMPTY for whitespace-only string", () => {
    const failures = evaluateModelCourtAnswerPolicy("   ");
    expect(failures).toContain("EMPTY");
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — TOO_LONG
// ============================================================

describe("evaluateModelCourtAnswerPolicy — TOO_LONG", () => {
  it("returns TOO_LONG when answer exceeds 4000 characters", () => {
    const longAnswer = "x".repeat(4001) + " " + VALID_CITATION;
    const failures = evaluateModelCourtAnswerPolicy(longAnswer);
    expect(failures).toContain("TOO_LONG");
  });

  it("does not return TOO_LONG for an answer comfortably under the limit", () => {
    const answer = "Analysis of the line movement. " + VALID_CITATION;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).not.toContain("TOO_LONG");
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — EV_KELLY_WINRATE in answer
// ============================================================

describe("evaluateModelCourtAnswerPolicy — EV_KELLY_WINRATE in output", () => {
  it("returns EV_KELLY_WINRATE when answer contains 'EV'", () => {
    const answer = `The EV on this pick is significant. ${VALID_CITATION}`;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).toContain("EV_KELLY_WINRATE");
  });

  it("returns EV_KELLY_WINRATE when answer contains 'win rate'", () => {
    const answer = `The win rate on this market is high. ${VALID_CITATION}`;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).toContain("EV_KELLY_WINRATE");
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — COMPETITOR_COMPARE in answer
// ============================================================

describe("evaluateModelCourtAnswerPolicy — COMPETITOR_COMPARE in output", () => {
  it("returns COMPETITOR_COMPARE when answer contains 'better than'", () => {
    const answer = `This service is better than the market. ${VALID_CITATION}`;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).toContain("COMPETITOR_COMPARE");
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — MISSING_CITATION
// ============================================================

describe("evaluateModelCourtAnswerPolicy — MISSING_CITATION", () => {
  it("returns MISSING_CITATION when no source citation is present", () => {
    const answer = "The line movement supports the home team.";
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).toContain("MISSING_CITATION");
  });

  it("does not return MISSING_CITATION when valid citation is present", () => {
    const answer = `Good analysis here. ${VALID_CITATION}`;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).not.toContain("MISSING_CITATION");
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — valid answer passes all checks
// ============================================================

describe("evaluateModelCourtAnswerPolicy — valid answer", () => {
  it("returns empty array for a compliant answer", () => {
    const answer = `The line movement of 2 points toward the home team suggests sharp action. ${VALID_CITATION}`;
    const failures = evaluateModelCourtAnswerPolicy(answer);
    expect(failures).toEqual([]);
  });
});

// ============================================================
// evaluateModelCourtAnswerPolicy — multiple failures
// ============================================================

describe("evaluateModelCourtAnswerPolicy — multiple failures", () => {
  it("accumulates all policy violations in a single pass", () => {
    // TOO_LONG + MISSING_CITATION + EV (no citation, too long, contains EV)
    const tooLong = "EV is the metric. " + "x".repeat(4001);
    const failures = evaluateModelCourtAnswerPolicy(tooLong);
    expect(failures).toContain("TOO_LONG");
    expect(failures).toContain("MISSING_CITATION");
    expect(failures).toContain("EV_KELLY_WINRATE");
  });
});
