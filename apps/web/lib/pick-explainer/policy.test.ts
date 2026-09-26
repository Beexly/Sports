import { describe, it, expect } from "vitest";
import type { FactorBreakdown } from "@sports/types";
import { buildGroundedContext } from "./grounding";
import { evaluatePickExplanationPolicy } from "./policy";

const CITE = "(source: factor_breakdown at 2026-04-15T17:00:00.000Z)";

describe("evaluatePickExplanationPolicy", () => {
  it("passes a grounded, advice-free explanation with a citation", () => {
    const text =
      `The pick is driven by an 84% bookmaker consensus and a +6.1 line-movement ` +
      `factor ${CITE}. Volatility is low across 9 books.`;
    expect(evaluatePickExplanationPolicy(text)).toEqual([]);
  });

  it("flags empty output (and the missing citation)", () => {
    const failures = evaluatePickExplanationPolicy("   ");
    expect(failures).toContain("EMPTY");
    expect(failures).toContain("MISSING_CITATION");
  });

  it("requires a grounding citation", () => {
    expect(evaluatePickExplanationPolicy("Consensus is strong here.")).toContain("MISSING_CITATION");
  });

  it("rejects betting certainty", () => {
    expect(
      evaluatePickExplanationPolicy(`This side will definitely cover ${CITE}.`),
    ).toContain("BETTING_CERTAINTY");
  });

  it("rejects personal betting advice", () => {
    expect(
      evaluatePickExplanationPolicy(`You should bet this one ${CITE}.`),
    ).toContain("PERSONAL_ADVICE");
  });

  it("rejects EV / Kelly / win-rate language", () => {
    expect(
      evaluatePickExplanationPolicy(`The Kelly stake is favorable ${CITE}.`),
    ).toEqual(expect.arrayContaining(["EV_KELLY_WINRATE", "PERSONAL_ADVICE"]));
  });

  it("rejects competitor comparisons", () => {
    expect(
      evaluatePickExplanationPolicy(`Sharper than DraftKings here ${CITE}.`),
    ).toContain("COMPETITOR_COMPARE");
  });

  it("rejects over-long output", () => {
    expect(evaluatePickExplanationPolicy(`${CITE} ` + "x".repeat(1700))).toContain("TOO_LONG");
  });
});

describe("evaluatePickExplanationPolicy — UNGROUNDED_NUMERIC (LQ14)", () => {
  const GROUNDING = "line 3.5 · confidence 74 · captured 2026-08-22T15:00:00Z";
  const CITED = "(source: signal_snapshot at 2026-08-22T15:00:00Z)";

  it("(a) passes a numeric claim grounded in the context — no false positive on the citation timestamp", () => {
    const failures = evaluatePickExplanationPolicy(`The 3.5-point line held. ${CITED}`, GROUNDING);
    expect(failures).not.toContain("UNGROUNDED_NUMERIC");
  });

  it("(b) flags a fabricated stat the grounded context never stated — the audit's exact example", () => {
    const failures = evaluatePickExplanationPolicy(
      `The 3.5-point line held. ${CITED} They are 8-2 in their last 10.`,
      GROUNDING,
    );
    expect(failures).toContain("UNGROUNDED_NUMERIC");
  });

  it("(c) bare integers pass without needing grounding", () => {
    const failures = evaluatePickExplanationPolicy(`Consensus held across 9 books ${CITED}.`, GROUNDING);
    expect(failures).not.toContain("UNGROUNDED_NUMERIC");
  });

  it("(d) single-arg legacy call is unchanged (no grounding, no numeric check)", () => {
    const failures = evaluatePickExplanationPolicy(`They are 8-2 in their last 10 ${CITED}.`);
    expect(failures).not.toContain("UNGROUNDED_NUMERIC");
  });
});

/**
 * REGRESSION — the guard matched VALUES, not MEANING.
 *
 * `POST /api/picks/[id]/explain` returns this text verbatim to a paying Pro/Elite
 * reader with no draft boundary and no human in the loop. The old guard flattened
 * the grounded context to bare numbers, so any value that appeared ANYWHERE in it
 * was whitelisted in ANY context. Against the real `buildGroundedContext` output
 * below, all four of these fabrications passed.
 */
describe("evaluatePickExplanationPolicy — a number may only be spent as what it is", () => {
  const factorBreakdown = {
    consensusScore: 22,
    marketDepthScore: 14,
    edgeScore: 18,
    lineMovementScore: 6,
    volatilityPenalty: -3,
    factors: [
      {
        name: "ATS form",
        impact: "POSITIVE",
        weight: 2.4,
        description: "Away side is covering at home-dog prices.",
      },
      {
        name: "Line movement",
        impact: "POSITIVE",
        weight: 4.2,
        description: "Spread moved toward the pick since open.",
      },
    ],
    independentEdge: {
      decision: "LEAN",
      agreement: "CONFIRMS",
      marketFairProb: 0.543,
      trueProb: 0.612,
      rawEdge: 0.069,
      shrunkEdge: 0.031,
      expectedClv: 0.019,
      conviction: 58,
      sources: ["kalshi"],
      priced: false,
      rationale: "Exchange fair sits below the book's de-vigged price.",
    },
  } as unknown as FactorBreakdown;

  const grounded = buildGroundedContext({
    game: {
      homeTeamName: "Kansas City Chiefs",
      awayTeamName: "Buffalo Bills",
      sport: "NFL",
      commenceTime: new Date("2026-01-17T23:30:00.000Z"),
    },
    pick: {
      pickType: "SPREAD",
      selection: "Kansas City Chiefs -2.5",
      line: -2.5,
      confidence: 61,
      edgeScore: 18,
      // The value 6.1 exists in this context ONLY as part of the version string.
      modelVersion: "v6.1.0",
      generatedAt: new Date("2026-01-17T12:00:00.000Z"),
      result: "PENDING",
      factorBreakdown,
    },
    snapshot: {
      capturedAt: new Date("2026-01-17T12:00:00.000Z"),
      confidenceAtPrediction: 61,
      dataQualityScore: 88,
      bookmakerCount: 9,
      lineMovementDelta: 1.5,
      settlementResult: null,
      signalFlags: { hadOddsSignal: true, hadAtsFormSignal: true, hadLineMovementSignal: true },
    },
  });

  const CITED = "(source: factor_breakdown at 2026-01-17T12:00:00.000Z)";

  it.each([
    ["a true probability spent as a cover rate", `The Chiefs have covered in 61.2% of similar spots ${CITED}`],
    ["a factor weight spent as a percentage", `ATS form carries a 2.4% historical hit premium ${CITED}`],
    ["a market fair probability spent as a win rate", `This side wins 54.3% of the time historically ${CITED}`],
    ["a value that exists only in the version string", `Similar spots have returned 6.1% above the market ${CITED}`],
  ])("rejects %s", (_label, text) => {
    expect(evaluatePickExplanationPolicy(text, grounded.context)).toContain("UNGROUNDED_NUMERIC");
  });

  it("still accepts the legitimate restatement of both probabilities", () => {
    const text =
      `The book's de-vigged market fair probability is 54.3% while the independent ` +
      `estimate is 61.2% ${CITED}.`;
    expect(evaluatePickExplanationPolicy(text, grounded.context)).not.toContain("UNGROUNDED_NUMERIC");
  });

  it("still accepts a factor weight restated as a weight", () => {
    const text = `Line movement carries a weight of 4.2 in the breakdown ${CITED}.`;
    expect(evaluatePickExplanationPolicy(text, grounded.context)).not.toContain("UNGROUNDED_NUMERIC");
  });
});
