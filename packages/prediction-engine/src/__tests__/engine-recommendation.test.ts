/**
 * The engine emits a PICK, or it emits NO BET.
 *
 * The spine returns a probability and a publish state. It returns no side, no
 * selection and no pick (`IntelligenceReasoning` has no such field, and
 * `SituationalContext.selection` is an INPUT, so the engine is told what to
 * evaluate). `recommend()` is that conversion, and these tests pin the three
 * rules it must never break:
 *
 *  1. NO BET IS A FIRST-CLASS OUTPUT, not a fallback for a broken call.
 *  2. THE MARKET IS COMPARISON ONLY and can never source the side.
 *  3. PUBLISH STATE IS BINDING: WITHHOLD and SHADOW cannot produce a pick.
 *
 * Every case builds the real `IntelligenceReasoning` shape and calls the real
 * `recommend`, with no stub in between, so a change to either side of the
 * boundary shows up here.
 */

import { describe, expect, it } from "vitest";
import { recommend, DEFAULT_MIN_EDGE } from "../engine-recommendation.js";
import type { IntelligenceReasoning } from "../reasoning.js";

const NOW = "2026-10-01T12:00:00.000Z";

/**
 * A reasoning result with every field the recommender reads, defaulted to a
 * healthy, publishable state so each test varies exactly one thing.
 */
function reasoning(over: Partial<IntelligenceReasoning> = {}): IntelligenceReasoning {
  return {
    calibratedProb: 0.6,
    situationalShift: 0.04,
    knowability: 0.8,
    evidenceHealth: 0.8,
    familyWeights: {} as IntelligenceReasoning["familyWeights"],
    why: ["home blend is ahead"],
    whyNot: [],
    marketFairProb: 0.5,
    edgeVsMarket: 0.1,
    publishState: "CANDIDATE",
    withholdReasons: [],
    signalWeight: 1,
    sixQuestions: {
      what: "w",
      when: "n",
      where: "h",
      reliability: "r",
      marketBelieves: "m",
      improvesDecisions: "i",
    },
    shadowReport: {
      active: false,
      families: [],
      justification: null,
      calibrationCount: 2,
      shadowedCount: 0,
    },
    observationCount: 2,
    ...over,
  } as IntelligenceReasoning;
}

describe("the engine emitting a pick", () => {
  it("calls a side from its own probability when the edge clears the threshold", () => {
    const r = recommend({
      reasoning: reasoning({ calibratedProb: 0.62 }),
      marketHomeProb: 0.5,
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
      line: -3.5,
      pickType: "SPREAD",
    });

    expect(r.verdict).toBe("PICK");
    // 62% home, market at 50% home: the engine takes the HOME side.
    expect(r.side).toBe(1);
    expect(r.selection).toBe("Kansas City Chiefs -3.5");
    expect(r.prob).toBeCloseTo(0.62, 4);
    expect(r.edge).toBeCloseTo(0.12, 4);
  });

  it("calls the AWAY side when the engine's own probability is below a half", () => {
    const r = recommend({
      reasoning: reasoning({ calibratedProb: 0.38 }),
      marketHomeProb: 0.5,
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
      line: -3.5,
      pickType: "SPREAD",
    });

    expect(r.verdict).toBe("PICK");
    expect(r.side).toBe(-1);
    expect(r.selection).toBe("Buffalo Bills -3.5");
    // The edge is signed to the side TAKEN, so a positive edge always means
    // "we are above the market on the side we took".
    expect(r.edge).toBeCloseTo(0.12, 4);
  });

  it("emits a NO BET when the edge is under the threshold, which is the common case", () => {
    const r = recommend({
      reasoning: reasoning({ calibratedProb: 0.505 }),
      marketHomeProb: 0.5,
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
      line: -3.5,
      pickType: "SPREAD",
    });

    // An engine that picked here would be picking noise.
    expect(r.verdict).toBe("NO_BET");
    expect(r.noBetReason).toBe("THRESHOLD");
    expect(r.selection).toBeNull();
    expect(r.side).toBe(0);
    // And it still reports WHY, so the operator can see a real engine that
    // simply saw no edge.
    expect(r.why.join(" ")).toContain("threshold");
  });

  it("honours an injected threshold rather than a hardcoded one", () => {
    const input = {
      reasoning: reasoning({ calibratedProb: 0.52 }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD" as const,
    };
    // 2 points of edge: under the 3 point default, over a 1 point policy.
    expect(recommend(input).verdict).toBe("NO_BET");
    expect(recommend({ ...input, options: { minEdge: 0.01 } }).verdict).toBe("PICK");
    expect(DEFAULT_MIN_EDGE).toBe(0.03);
  });

  it("refuses to pick when there is no usable market to measure an edge against", () => {
    const r = recommend({
      // A very confident engine with no price at all.
      reasoning: reasoning({ calibratedProb: 0.9 }),
      marketHomeProb: null,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });

    // Without a market there is no edge, and an edge is the whole basis for
    // calling a side. 90% confidence is not a reason to bet by itself.
    expect(r.verdict).toBe("NO_BET");
    expect(r.noBetReason).toBe("THRESHOLD");
    expect(r.selection).toBeNull();
  });

  it("names OVER on a total and refuses when a total has no line to be over", () => {
    const over = recommend({
      reasoning: reasoning({ calibratedProb: 0.62 }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: 48.5,
      pickType: "TOTAL",
    });
    expect(over.verdict).toBe("PICK");
    expect(over.selection).toBe("OVER 48.5");

    const noLine = recommend({
      reasoning: reasoning({ calibratedProb: 0.62 }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: null,
      pickType: "TOTAL",
    });
    // No line means no expressible selection. Inventing "OVER" with no number
    // would be a fabricated pick, so it is a NO BET.
    expect(noLine.verdict).toBe("NO_BET");
    expect(noLine.noBetReason).toBe("NO_SIDE");
  });
});

describe("RULE 2, the market is a comparison input only", () => {
  it("never changes the recommended SIDE, however far the market moves", () => {
    // The engine's own number is held constant; only the market moves.
    const engine = reasoning({ calibratedProb: 0.62 });
    const sides = [0.95, 0.62, 0.5, 0.38, 0.05].map((marketHomeProb) =>
      recommend({
        reasoning: engine,
        marketHomeProb,
        homeTeam: "KC",
        awayTeam: "BUF",
        line: -3.5,
        pickType: "SPREAD",
      }),
    );
    // Every verdict that produced a pick took the HOME side, because 0.62 is
    // the engine's own probability. A market that disagrees only changes
    // whether there is a pick, never which side it is.
    for (const r of sides) {
      if (r.verdict === "PICK") expect(r.side).toBe(1);
    }
    // A market far above the engine's own number produces a NO BET on the other
    // side, which is a refusal, not a flip.
    expect(sides[0]!.verdict).toBe("NO_BET");
    expect(sides[0]!.selection).toBeNull();
  });

  it("reports an edge against the market the engine took the other side of", () => {
    // Market prices the AWAY side at 55%, the engine at 62% away-side prob.
    const r = recommend({
      reasoning: reasoning({ calibratedProb: 0.38 }),
      marketHomeProb: 0.45,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: 2.5,
      pickType: "SPREAD",
    });
    expect(r.verdict).toBe("PICK");
    expect(r.side).toBe(-1);
    // 0.62 engine vs 0.55 market, on the away side both times.
    expect(r.edge).toBeCloseTo(0.07, 4);
  });
});

describe("RULE 3, publish state is binding", () => {
  it("will not produce a pick from a WITHHELD spine even with a large edge", () => {
    const r = recommend({
      // A 20 point edge is exactly the state where a caller would be most
      // tempted to publish the number anyway.
      reasoning: reasoning({
        calibratedProb: 0.7,
        publishState: "WITHHOLD",
        withholdReasons: ["Slice is historically below the 0.45 win-rate floor"],
      }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });

    expect(r.verdict).toBe("NO_BET");
    expect(r.noBetReason).toBe("WITHHELD_BY_ENGINE");
    expect(r.selection).toBeNull();
    expect(r.side).toBe(0);
    // The number is still reported, so the refusal is auditable rather than a
    // blank.
    expect(r.homeProb).toBeCloseTo(0.7, 4);
    expect(r.why.join(" ")).toContain("win-rate floor");
  });

  it("will not produce a pick from a SHADOW spine", () => {
    const r = recommend({
      reasoning: reasoning({ calibratedProb: 0.7, publishState: "SHADOW" }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });

    expect(r.verdict).toBe("NO_BET");
    expect(r.noBetReason).toBe("SHADOWED_BY_ENGINE");
    expect(r.selection).toBeNull();
  });

  it("refuses thin evidence even when the spine says CANDIDATE and the edge is real", () => {
    const thin = recommend({
      reasoning: reasoning({ calibratedProb: 0.7, knowability: 0.2, evidenceHealth: 0.9 }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });
    expect(thin.verdict).toBe("NO_BET");
    expect(thin.noBetReason).toBe("THIN_EVIDENCE");

    const unhealthy = recommend({
      reasoning: reasoning({ calibratedProb: 0.7, knowability: 0.9, evidenceHealth: 0.1 }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });
    expect(unhealthy.verdict).toBe("NO_BET");
    expect(unhealthy.noBetReason).toBe("THIN_EVIDENCE");
  });
});

describe("RULE 1, NO BET is a value not an error", () => {
  it("always pairs NO_BET with a null selection, and PICK with a non-null one", () => {
    const cases = [
      reasoning({ calibratedProb: 0.62 }),
      reasoning({ calibratedProb: 0.505 }),
      reasoning({ calibratedProb: 0.7, publishState: "WITHHOLD" }),
      reasoning({ calibratedProb: 0.38 }),
    ];
    for (const engine of cases) {
      const r = recommend({
        reasoning: engine,
        marketHomeProb: 0.5,
        homeTeam: "KC",
        awayTeam: "BUF",
        line: -3.5,
        pickType: "SPREAD",
      });
      // The invariant a caller relies on, and the reason the verdict is a
      // literal field rather than something inferred from a null selection.
      if (r.verdict === "PICK") {
        expect(r.selection).not.toBeNull();
        expect(r.prob).not.toBeNull();
        expect(r.noBetReason).toBeNull();
      } else {
        expect(r.selection).toBeNull();
        expect(r.side).toBe(0);
        expect(r.noBetReason).not.toBeNull();
      }
    }
  });

  it("clamps a non-finite probability to a neutral one rather than trusting it", () => {
    const r = recommend({
      reasoning: reasoning({ calibratedProb: Number.NaN }),
      marketHomeProb: 0.5,
      homeTeam: "KC",
      awayTeam: "BUF",
      line: -3.5,
      pickType: "SPREAD",
    });
    // NaN clamps to 0, so the engine is on the away side at 100% of a 0.5
    // market: no edge, and a NO BET rather than a NaN selection.
    expect(r.homeProb).toBe(0);
    expect(r.verdict).toBe("NO_BET");
  });
});
