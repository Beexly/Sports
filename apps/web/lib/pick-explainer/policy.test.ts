import { describe, it, expect } from "vitest";
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
