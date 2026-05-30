/**
 * Targeted coverage for lib/intelligence-graph/model-court/prompts.ts.
 *
 * The existing model-court-answer.test.ts covers the answer-building layer.
 * This file covers the three prelude builders and the internal formatField
 * helper (exercised through the builders):
 *
 *   - buildAskThisGamePrelude: includes mode tag, game fields, null → "n/a"
 *   - buildAskTheSlatePrelude: includes mode tag, slate fields, null → "n/a"
 *   - buildExplainForMyLensPrelude: lens mode header, delegates to game prelude,
 *     includes lens kind, includes all 4 lens-kind reframe instructions
 *   - formatField (internal): null/undefined → "n/a", Date → ISO string,
 *     object → JSON.stringify, number/boolean → String
 */

import { describe, it, expect } from "vitest";
import {
  buildAskThisGamePrelude,
  buildAskTheSlatePrelude,
  buildExplainForMyLensPrelude,
  REFUSAL_TEMPLATES,
  SYSTEM_PROMPT,
} from "@/lib/intelligence-graph/model-court/prompts";

// ============================================================
// Minimal node / slate fixture builders
// ============================================================

function makeNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    matchup: "BOS @ NYK",
    sport: "NBA",
    startsAt: "2026-05-19T01:00:00Z",
    status: "scheduled",
    edgeIndex: 72,
    publishThresholdCleared: true,
    gateDecisionOutcome: "PUBLISHED",
    gateDecisionReason: "threshold cleared",
    evidenceHealthGrade: "B",
    evidenceFreshnessSeconds: 300,
    bootstrapSharePct: 0,
    booksPolled: 12,
    booksReporting: 10,
    consensus: 0.64,
    lineMovement: 0.5,
    volatility: 0.2,
    sharpMoneySignal: "NEUTRAL",
    picksSummary: "BOS -3.5 at 75% confidence",
    premortemText: "If consensus drops below 0.55 this pick flips.",
    evidenceRefsList: "ODDS_API@2026-05-19T00:30:00Z",
    ...overrides,
  };
}

function makeSlate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    dateKey: "2026-05-19",
    sportsActive: "NBA, NHL",
    totalGamesTracked: 8,
    totalGamesPublished: 3,
    totalGamesGated: 5,
    averageEdgeIndex: 58,
    slateDensity: "normal",
    notableConditions: "none",
    perGameSummary: "BOS@NYK: published. LAL@GSW: gated.",
    ...overrides,
  };
}

// ============================================================
// buildAskThisGamePrelude
// ============================================================

describe("buildAskThisGamePrelude", () => {
  it("includes ASK_THIS_GAME mode tag", () => {
    const prelude = buildAskThisGamePrelude(makeNode(), "Is this line sharp?");
    expect(prelude).toContain("Mode: ASK_THIS_GAME");
  });

  it("includes the game matchup, sport, and start time", () => {
    const prelude = buildAskThisGamePrelude(makeNode(), "How does the model read consensus?");
    expect(prelude).toContain("BOS @ NYK");
    expect(prelude).toContain("NBA");
    expect(prelude).toContain("2026-05-19T01:00:00Z");
  });

  it("includes the user question verbatim", () => {
    const question = "What is the edge index for this game?";
    const prelude = buildAskThisGamePrelude(makeNode(), question);
    expect(prelude).toContain(question);
  });

  it("renders numeric fields as their string representation", () => {
    const prelude = buildAskThisGamePrelude(makeNode({ edgeIndex: 84 }), "q");
    expect(prelude).toContain("84");
  });

  it("renders null fields as 'n/a'", () => {
    const prelude = buildAskThisGamePrelude(makeNode({ sharpMoneySignal: null }), "q");
    expect(prelude).toContain("n/a");
  });

  it("renders undefined fields as 'n/a'", () => {
    const node = makeNode();
    delete node["volatility"];
    const prelude = buildAskThisGamePrelude(node, "q");
    expect(prelude).toContain("n/a");
  });

  it("renders a Date object as ISO string", () => {
    const date = new Date("2026-05-19T05:00:00Z");
    const prelude = buildAskThisGamePrelude(makeNode({ startsAt: date }), "q");
    expect(prelude).toContain("2026-05-19T05:00:00.000Z");
  });

  it("renders an object field as JSON", () => {
    const prelude = buildAskThisGamePrelude(
      makeNode({ picksSummary: { pick: "BOS -3.5", confidence: 75 } }),
      "q"
    );
    expect(prelude).toContain('"pick"');
  });
});

// ============================================================
// buildAskTheSlatePrelude
// ============================================================

describe("buildAskTheSlatePrelude", () => {
  it("includes ASK_THE_SLATE mode tag", () => {
    const prelude = buildAskTheSlatePrelude(makeSlate(), "How many games today?");
    expect(prelude).toContain("Mode: ASK_THE_SLATE");
  });

  it("includes the date and sports active", () => {
    const prelude = buildAskTheSlatePrelude(makeSlate(), "What sports are active?");
    expect(prelude).toContain("2026-05-19");
    expect(prelude).toContain("NBA, NHL");
  });

  it("includes game counts", () => {
    const prelude = buildAskTheSlatePrelude(makeSlate(), "q");
    expect(prelude).toContain("8");  // totalGamesTracked
    expect(prelude).toContain("3");  // totalGamesPublished
    expect(prelude).toContain("5");  // totalGamesGated
  });

  it("includes the user question verbatim", () => {
    const question = "Which sport has the most games?";
    const prelude = buildAskTheSlatePrelude(makeSlate(), question);
    expect(prelude).toContain(question);
  });

  it("renders null fields as 'n/a'", () => {
    const prelude = buildAskTheSlatePrelude(makeSlate({ notableConditions: null }), "q");
    expect(prelude).toContain("n/a");
  });
});

// ============================================================
// buildExplainForMyLensPrelude
// ============================================================

describe("buildExplainForMyLensPrelude", () => {
  it("includes EXPLAIN_FOR_MY_LENS mode tag", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "Explain the pick", { kind: "FAN", details: null }
    );
    expect(prelude).toContain("Mode: EXPLAIN_FOR_MY_LENS");
  });

  it("also includes ASK_THIS_GAME base prelude content", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "Explain the pick", { kind: "FAN", details: null }
    );
    expect(prelude).toContain("Mode: ASK_THIS_GAME");
    expect(prelude).toContain("BOS @ NYK");
  });

  it("includes the lens kind", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "FANTASY", details: { dfsScore: 42 } }
    );
    expect(prelude).toContain("FANTASY");
  });

  it("includes FAN lens reframe instruction", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "FAN", details: null }
    );
    expect(prelude).toContain("FAN");
    expect(prelude).toContain("do not include\nbetting language");
  });

  it("includes FANTASY lens reframe instruction", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "FANTASY", details: null }
    );
    expect(prelude).toContain("FANTASY");
    expect(prelude).toContain("player-prop");
  });

  it("includes CREATOR lens reframe instruction", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "CREATOR", details: null }
    );
    expect(prelude).toContain("CREATOR");
    expect(prelude).toContain("citations inline");
  });

  it("includes ANALYST lens reframe instruction", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "ANALYST", details: null }
    );
    expect(prelude).toContain("ANALYST");
    expect(prelude).toContain("raw signal data");
  });

  it("serializes lens.details as JSON for object values", () => {
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), "q", { kind: "ANALYST", details: { focus: "spread" } }
    );
    expect(prelude).toContain('"focus"');
  });

  it("includes the user question", () => {
    const question = "Why did the model gate this game?";
    const prelude = buildExplainForMyLensPrelude(
      makeNode(), question, { kind: "FAN", details: null }
    );
    expect(prelude).toContain(question);
  });
});

// ============================================================
// SYSTEM_PROMPT and REFUSAL_TEMPLATES — existence + key content
// ============================================================

describe("SYSTEM_PROMPT", () => {
  it("includes the three mode names", () => {
    expect(SYSTEM_PROMPT).toContain("ASK_THIS_GAME");
    expect(SYSTEM_PROMPT).toContain("ASK_THE_SLATE");
    expect(SYSTEM_PROMPT).toContain("EXPLAIN_FOR_MY_LENS");
  });

  it("includes the PROHIBITION section", () => {
    expect(SYSTEM_PROMPT).toContain("PROHIBITION");
  });
});

describe("REFUSAL_TEMPLATES", () => {
  it("has entries for all 6 RefusalKinds", () => {
    const keys: string[] = [
      "EVIDENCE_THIN",
      "BETTING_CERTAINTY",
      "EV_KELLY_WINRATE",
      "COMPETITOR_COMPARE",
      "GAME_NOT_IN_CONTEXT",
      "PERSONAL_ADVICE",
    ];
    for (const k of keys) {
      expect(REFUSAL_TEMPLATES[k as keyof typeof REFUSAL_TEMPLATES]).toBeTruthy();
    }
  });

  it("EVIDENCE_THIN template includes grade placeholder", () => {
    expect(REFUSAL_TEMPLATES.EVIDENCE_THIN).toContain("{{grade}}");
  });

  it("BETTING_CERTAINTY template includes edgeIndex placeholder", () => {
    expect(REFUSAL_TEMPLATES.BETTING_CERTAINTY).toContain("{{edgeIndex}}");
  });

  it("COMPETITOR_COMPARE template references the Pass List", () => {
    expect(REFUSAL_TEMPLATES.COMPETITOR_COMPARE).toContain("Pass List");
  });

  it("PERSONAL_ADVICE template mentions Kelly criterion", () => {
    expect(REFUSAL_TEMPLATES.PERSONAL_ADVICE).toContain("Kelly");
  });
});
