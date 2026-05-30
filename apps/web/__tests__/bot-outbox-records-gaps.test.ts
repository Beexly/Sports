/**
 * Targeted coverage for lib/bot-outbox/records.ts branches not reached by
 * bot-outbox-records.test.ts.
 *
 * The primary test covers:
 *   - topFactorsFromBreakdown with a valid object + known aliases (happy path)
 *   - pickRecordToPublicationInput with selection set
 *   - pickRecordToSettlementInput with result=LOSS
 *   - gateDecisionRecordToGatedInput with edgeIndex=null (falls back to game.currentEdgeIndex)
 *
 * This file covers:
 *   - topFactorsFromBreakdown: null/array/string/number inputs → []
 *   - topFactorsFromBreakdown: unknown alias key → skipped
 *   - topFactorsFromBreakdown: duplicate alias (atsForm + venueForm → same FactorKey) → dedup
 *   - topFactorsFromBreakdown: more than 3 results → capped at 3
 *   - topFactorsFromBreakdown: non-finite score (NaN, Infinity) → skipped
 *   - topFactorsFromBreakdown: negative score → abs value in result
 *   - mapPickResult (via pickRecordToSettlementInput): WIN→W, PUSH→PUSH, VOID→PUSH, PENDING→PENDING
 *   - finalScore (via pickRecordToSettlementInput): awayScore null → "", homeScore null → ""
 *   - formatLine (via pickRecordToPublicationInput): selection="" → uses formatLine
 *   - gateDecisionRecordToGatedInput: edgeIndex non-null → uses decision.edgeIndex directly
 */

import { describe, it, expect } from "vitest";
import {
  topFactorsFromBreakdown,
  pickRecordToPublicationInput,
  pickRecordToSettlementInput,
  gateDecisionRecordToGatedInput,
} from "@/lib/bot-outbox/records";

// ============================================================
// topFactorsFromBreakdown — null / non-object inputs
// ============================================================

describe("topFactorsFromBreakdown — null and non-object inputs", () => {
  it("returns [] for null", () => {
    expect(topFactorsFromBreakdown(null)).toEqual([]);
  });

  it("returns [] for an array input", () => {
    expect(topFactorsFromBreakdown([{ key: "odds", score: 0.9 }])).toEqual([]);
  });

  it("returns [] for a string input", () => {
    expect(topFactorsFromBreakdown("lineMovement")).toEqual([]);
  });

  it("returns [] for a number input", () => {
    expect(topFactorsFromBreakdown(42)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(topFactorsFromBreakdown(undefined)).toEqual([]);
  });

  it("returns [] for an empty object", () => {
    expect(topFactorsFromBreakdown({})).toEqual([]);
  });
});

// ============================================================
// topFactorsFromBreakdown — unknown alias key
// ============================================================

describe("topFactorsFromBreakdown — unknown alias keys", () => {
  it("skips keys not in FACTOR_ALIASES", () => {
    expect(topFactorsFromBreakdown({ unknownSignal: 0.9 })).toEqual([]);
  });

  it("skips unknown keys but includes known ones", () => {
    const result = topFactorsFromBreakdown({ unknownSignal: 0.9, odds: 0.5 });
    expect(result).toHaveLength(1);
    expect(result[0].factor).toBe("edge");
  });
});

// ============================================================
// topFactorsFromBreakdown — non-finite scores
// ============================================================

describe("topFactorsFromBreakdown — non-finite scores are skipped", () => {
  it("skips NaN scores", () => {
    expect(topFactorsFromBreakdown({ odds: NaN })).toEqual([]);
  });

  it("skips Infinity scores", () => {
    expect(topFactorsFromBreakdown({ odds: Infinity })).toEqual([]);
  });

  it("skips -Infinity scores", () => {
    expect(topFactorsFromBreakdown({ odds: -Infinity })).toEqual([]);
  });

  it("skips string values mixed with numeric ones", () => {
    const result = topFactorsFromBreakdown({ odds: "high", lineMovement: 0.3 });
    expect(result).toHaveLength(1);
    expect(result[0].factor).toBe("lineMovement");
  });
});

// ============================================================
// topFactorsFromBreakdown — duplicate alias dedup
// ============================================================

describe("topFactorsFromBreakdown — duplicate alias dedup via seen Set", () => {
  it("deduplicates when atsForm and venueForm map to the same FactorKey", () => {
    // Both 'atsForm' and 'venueForm' map to 'venueForm' FactorKey
    const result = topFactorsFromBreakdown({ atsForm: 0.8, venueForm: 0.6 });
    expect(result).toHaveLength(1);
    expect(result[0].factor).toBe("venueForm");
    // Only the first one encountered (atsForm at 0.8 abs) survives
    expect(result[0].score).toBe(0.8);
  });

  it("deduplicates when h2h and headToHead map to the same FactorKey", () => {
    // Both 'h2h' and 'headToHead' map to 'headToHead' FactorKey
    const result = topFactorsFromBreakdown({ h2h: 0.7, headToHead: 0.4 });
    expect(result).toHaveLength(1);
    expect(result[0].factor).toBe("headToHead");
    expect(result[0].score).toBe(0.7);
  });

  it("deduplicates when schedule and scheduleStress map to the same FactorKey", () => {
    const result = topFactorsFromBreakdown({ schedule: 0.55, scheduleStress: 0.33 });
    expect(result).toHaveLength(1);
    expect(result[0].factor).toBe("scheduleStress");
  });
});

// ============================================================
// topFactorsFromBreakdown — cap at 3 results
// ============================================================

describe("topFactorsFromBreakdown — capped at 3 results", () => {
  it("returns at most 3 factors even when more are present", () => {
    const breakdown = {
      odds: 0.9,
      lineMovement: 0.8,
      restAdvantage: 0.7,
      consensus: 0.6,
      volatility: 0.5,
    };
    const result = topFactorsFromBreakdown(breakdown);
    expect(result).toHaveLength(3);
  });

  it("returns the top 3 by score (descending)", () => {
    const breakdown = {
      odds: 0.9,
      lineMovement: 0.8,
      restAdvantage: 0.7,
      consensus: 0.6,
    };
    const result = topFactorsFromBreakdown(breakdown);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  });
});

// ============================================================
// topFactorsFromBreakdown — negative score uses Math.abs
// ============================================================

describe("topFactorsFromBreakdown — negative scores become absolute values", () => {
  it("stores abs value when score is negative", () => {
    const result = topFactorsFromBreakdown({ restAdvantage: -0.74 });
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeCloseTo(0.74);
  });
});

// ============================================================
// mapPickResult — branches via pickRecordToSettlementInput
// ============================================================

function makeMinimalPick(
  result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING",
  overrides: Record<string, unknown> = {}
) {
  return {
    id: "pick-test",
    gameId: "game-test",
    pickType: "SPREAD",
    selection: "BOS -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 65,
    tier: "PRO" as const,
    pickGrade: "GOOD_PLAY",
    modelVersion: "v5.0.0",
    result,
    settledAt: new Date("2026-05-22T22:00:00.000Z"),
    isPublished: true,
    isBootstrap: false,
    factorBreakdown: { odds: 0.5 },
    game: {
      id: "game-test",
      awayTeamName: "BOS",
      homeTeamName: "NYK",
      commenceTime: new Date("2026-05-22T18:00:00.000Z"),
      currentEdgeIndex: 71.0,
      awayScore: 108,
      homeScore: 102,
      sport: { name: "NBA" },
      ...overrides,
    },
  };
}

describe("pickRecordToSettlementInput — mapPickResult branches", () => {
  it("maps WIN result to 'W' outcome", () => {
    const input = pickRecordToSettlementInput(makeMinimalPick("WIN"));
    expect(input.outcome).toBe("W");
  });

  it("maps PUSH result to 'PUSH' outcome", () => {
    const input = pickRecordToSettlementInput(makeMinimalPick("PUSH"));
    expect(input.outcome).toBe("PUSH");
  });

  it("maps VOID result to 'PUSH' outcome", () => {
    const input = pickRecordToSettlementInput(makeMinimalPick("VOID"));
    expect(input.outcome).toBe("PUSH");
  });

  it("maps PENDING result to 'PENDING' outcome", () => {
    const input = pickRecordToSettlementInput(makeMinimalPick("PENDING"));
    expect(input.outcome).toBe("PENDING");
  });

  it("biggestMissFactor is null for non-LOSS results", () => {
    const win = pickRecordToSettlementInput(makeMinimalPick("WIN"));
    expect(win.biggestMissFactor).toBeNull();
    const push = pickRecordToSettlementInput(makeMinimalPick("PUSH"));
    expect(push.biggestMissFactor).toBeNull();
  });

  it("oneLineCause is null for non-LOSS results", () => {
    const win = pickRecordToSettlementInput(makeMinimalPick("WIN"));
    expect(win.oneLineCause).toBeNull();
  });
});

// ============================================================
// finalScore — null score branches
// ============================================================

describe("pickRecordToSettlementInput — finalScore null branches", () => {
  it("returns empty string for finalScore when awayScore is null", () => {
    const pick = makeMinimalPick("WIN", { awayScore: null });
    const input = pickRecordToSettlementInput(pick);
    expect(input.finalScore).toBe("");
  });

  it("returns empty string for finalScore when homeScore is null", () => {
    const pick = makeMinimalPick("WIN", { homeScore: null });
    const input = pickRecordToSettlementInput(pick);
    expect(input.finalScore).toBe("");
  });

  it("returns empty string for finalScore when awayScore is undefined", () => {
    const pick = makeMinimalPick("WIN", { awayScore: undefined });
    const input = pickRecordToSettlementInput(pick);
    expect(input.finalScore).toBe("");
  });
});

// ============================================================
// formatLine — via pickRecordToPublicationInput with empty selection
// ============================================================

describe("pickRecordToPublicationInput — formatLine branches via empty selection", () => {
  function makePublicationPick(line: number, selection: string) {
    return {
      id: "pick-pub",
      gameId: "game-pub",
      pickType: "SPREAD",
      selection,
      line,
      confidence: 70,
      edgeScore: 60,
      tier: "FREE" as const,
      pickGrade: "LEAN",
      modelVersion: "v5.0.0",
      result: "PENDING" as const,
      settledAt: null,
      isPublished: false,
      isBootstrap: false,
      factorBreakdown: {},
      game: {
        id: "game-pub",
        awayTeamName: "LAL",
        homeTeamName: "GSW",
        commenceTime: new Date("2026-05-23T02:30:00.000Z"),
        currentEdgeIndex: 59.0,
        sport: { name: "NBA" },
      },
    };
  }

  it("uses formatLine(line) when selection is empty string", () => {
    const input = pickRecordToPublicationInput(makePublicationPick(6, ""));
    expect(input.line).toBe("+6");
  });

  it("formatLine returns '+N' for positive line", () => {
    const input = pickRecordToPublicationInput(makePublicationPick(3.5, ""));
    expect(input.line).toBe("+3.5");
  });

  it("formatLine returns '-N' for negative line", () => {
    const input = pickRecordToPublicationInput(makePublicationPick(-7, ""));
    expect(input.line).toBe("-7");
  });

  it("formatLine returns '0' for zero line", () => {
    const input = pickRecordToPublicationInput(makePublicationPick(0, ""));
    expect(input.line).toBe("0");
  });
});

// ============================================================
// gateDecisionRecordToGatedInput — edgeIndex non-null branch
// ============================================================

describe("gateDecisionRecordToGatedInput — edgeIndex non-null uses decision.edgeIndex", () => {
  it("uses decision.edgeIndex when it is non-null (not game.currentEdgeIndex)", () => {
    const input = gateDecisionRecordToGatedInput({
      id: "gate-2",
      gameId: "game-2",
      reason: "Edge below threshold.",
      reasonCode: "LOW_EDGE",
      edgeIndex: 44.1,
      modelVersion: "v5.0.0",
      isBootstrap: false,
      evaluatedAt: new Date("2026-05-22T18:00:00.000Z"),
      game: {
        id: "game-2",
        awayTeamName: "PHI",
        homeTeamName: "MIA",
        commenceTime: new Date("2026-05-22T20:00:00.000Z"),
        currentEdgeIndex: 99.9,
        sport: { name: "NBA" },
      },
    });
    expect(input.edgeIndex).toBe(44.1);
    expect(input.edgeIndex).not.toBe(99.9);
  });
});
