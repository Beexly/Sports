/**
 * The parser is the trust boundary, so it is tested as one.
 *
 * Three properties matter, in order:
 *
 *   1. It ACCEPTS a well-formed ruling. A parser that rejects everything looks
 *      exactly as green as one that accepts everything, and the only way to tell
 *      them apart is to assert on a real accepted ruling.
 *   2. It REFUSES every malformed shape, and says WHICH failure it saw. A
 *      parser that collapses all failures into "reject" cannot be monitored: a
 *      model that starts emitting prose looks identical to one that is being
 *      rate-limited.
 *   3. It REFUSES a fabricated statistic. This is the property that makes the
 *      arbiter auditable at all: a ruling that cites a number nobody supplied
 *      cannot be checked against the outcome later, because the number it
 *      reasoned from does not exist.
 *
 * The mutant control at the end states which assertions a weakened numeric guard
 * would break, so removing that guard is a test failure rather than a silent
 * regression.
 */

import { describe, expect, it } from "vitest";
import { detectDisagreement, type PathClaim, type SideResolver } from "@/lib/arbiter/disagreement";
import {
  ARBITER_VERDICTS,
  buildArbiterPrompt,
  isArbiterVerdict,
  parseRuling,
  SYSTEM_PROMPT,
  isRejected,
} from "@/lib/arbiter/verdict";

const sideResolver: SideResolver = (selection) =>
  selection.startsWith("Chicago") ? "HOME" : selection.startsWith("Carolina") ? "AWAY" : null;

function reasoning(overrides: Partial<PathClaim> = {}): PathClaim {
  return {
    path: "REASONING",
    pickId: "pick_reasoning",
    pickType: "MONEYLINE",
    selection: "Carolina Panthers ML (model signal)",
    confidence: 63,
    bookmakerCount: 0,
    edgeScore: null,
    pickGrade: "LEAN",
    modelVersion: "signal-2026-09-13",
    isModelSignal: true,
    ...overrides,
  };
}

function legacy(overrides: Partial<PathClaim> = {}): PathClaim {
  return {
    path: "LEGACY",
    pickId: "pick_legacy",
    pickType: "MONEYLINE",
    selection: "Chicago Bears ML",
    confidence: 72,
    bookmakerCount: 11,
    edgeScore: 74,
    pickGrade: "STRONG_PLAY",
    modelVersion: "book-2026-09-13",
    isModelSignal: false,
    ...overrides,
  };
}

const clash = () => {
  const result = detectDisagreement(
    reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 52 }),
    legacy({ selection: "Chicago Bears ML", confidence: 88 }),
    sideResolver,
  );
  if (result.kind !== "CONFIDENCE_CLASH") throw new Error("fixture must be a clash");
  return result;
};

const sideConflict = () => {
  const result = detectDisagreement(reasoning(), legacy(), sideResolver);
  if (result.kind !== "SIDE_CONFLICT") throw new Error("fixture must be a side conflict");
  return result;
};

describe("parseRuling: accepts a well-formed ruling", () => {
  it("accepts each of the three verdicts and keeps the model's own confidence", () => {
    for (const verdict of ARBITER_VERDICTS) {
      const ruling = parseRuling(
        JSON.stringify({
          winner: verdict,
          confidence: 0.72,
          reasoning: "The legacy row's own top band is measured inverted.",
        }),
        clash(),
      );
      expect(ruling.verdict).toBe(verdict);
      expect(ruling.confidence).toBe(0.72);
      // `accepted` only exists on the accepted variant, so reaching it is itself
      // the proof that this verdict took the ACCEPTED branch and not a
      // coincidence of the union's shape.
      if (isRejected(ruling)) throw new Error(`expected ${verdict} to be accepted`);
      expect(ruling.accepted).toBe(true);
    }
  });

  it("accepts a JSON object wrapped in a markdown fence", () => {
    const ruling = parseRuling(
      "```json\n" +
        JSON.stringify({
          winner: "UPHOLD_REASONING",
          confidence: 0.8,
          reasoning: "Both rows name the same side.",
        }) +
        "\n```",
      clash(),
    );
    expect(ruling.verdict).toBe("UPHOLD_REASONING");
  });

  it("accepts a JSON object surrounded by a sentence of preamble", () => {
    const ruling = parseRuling(
      'Sure. {"winner":"UNDECIDED","confidence":0.5,"reasoning":"The evidence does not separate them."} Hope that helps.',
      clash(),
    );
    expect(ruling.verdict).toBe("UNDECIDED");
  });

  it("accepts a reasoning string that echoes a number from the supplied claims", () => {
    // 88 and 52 are the two claims' own confidences, so echoing them is grounded.
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_REASONING",
        confidence: 0.9,
        reasoning: "The legacy row reads 88 against the reasoning row's 52.",
      }),
      clash(),
    );
    expect(ruling.verdict).toBe("UPHOLD_REASONING");
  });
});

describe("parseRuling: refuses malformed output, and names the failure", () => {
  const cases: ReadonlyArray<{ readonly name: string; readonly text: string; readonly code: string }> = [
    { name: "empty output", text: "   ", code: "EMPTY_OUTPUT" },
    { name: "prose with no object", text: "I think the reasoning path is better.", code: "NO_JSON_OBJECT" },
    { name: "truncated JSON", text: '{"winner":"UPHOLD_LEGACY",', code: "NO_JSON_OBJECT" },
    { name: "JSON that does not parse", text: "{winner: UPHOLD_LEGACY}", code: "UNPARSEABLE_JSON" },
    // A bare array / string / null contains no braces at all, so the parser
    // never finds a candidate object to slice out. The honest code for that is
    // NO_JSON_OBJECT, not NOT_AN_OBJECT: there was no object to be malformed.
    { name: "a bare array", text: '["UPHOLD_LEGACY", 0.8]', code: "NO_JSON_OBJECT" },
    { name: "a JSON string", text: '"UPHOLD_LEGACY"', code: "NO_JSON_OBJECT" },
    { name: "a JSON null", text: "null", code: "NO_JSON_OBJECT" },
  ];

  for (const testCase of cases) {
    it(`rejects ${testCase.name} as ${testCase.code}`, () => {
      const ruling = parseRuling(testCase.text, clash());
      expect(isRejected(ruling)).toBe(true);
      if (!isRejected(ruling)) throw new Error("unreachable");
      expect(ruling.rejection).toBe(testCase.code);
      expect(ruling.verdict).toBeNull();
    });
  }

  it("rejects a verdict outside the closed set and reports what it saw", () => {
    const ruling = parseRuling(
      JSON.stringify({ winner: "AVERAGE", confidence: 0.5, reasoning: "Split the difference." }),
      clash(),
    );
    if (!isRejected(ruling)) throw new Error("expected a rejection");
    expect(ruling.rejection).toBe("UNKNOWN_VERDICT:AVERAGE");
  });

  it("rejects a confidence that is a band label rather than a probability", () => {
    // "STRONG_PLAY" and 0 are the two failure shapes worth naming: a grade
    // string, and a degenerate probability.
    for (const bad of [0, 1, 1.5, -0.2, "0.8"]) {
      const ruling = parseRuling(
        JSON.stringify({ winner: "UPHOLD_LEGACY", confidence: bad, reasoning: "Because." }),
        clash(),
      );
      if (!isRejected(ruling)) throw new Error(`expected ${String(bad)} to be rejected`);
      expect(ruling.rejection).toBe("CONFIDENCE_NOT_A_PROBABILITY");
    }
  });

  it("rejects a ruling with no reasoning, because an unexplained ruling is not auditable", () => {
    for (const bad of ["", "   "]) {
      const ruling = parseRuling(
        JSON.stringify({ winner: "UPHOLD_LEGACY", confidence: 0.7, reasoning: bad }),
        clash(),
      );
      if (!isRejected(ruling)) throw new Error("expected a rejection");
      expect(ruling.rejection).toBe("MISSING_REASONING");
    }
  });

  it("recovers the object from array-wrapped output, then grades the object itself", () => {
    // The parser slices from the first brace to the last, so an array wrapper
    // does not defeat it: the inner object is found and then judged on its own
    // contents. Here it is refused for the missing confidence, which is the
    // correct reason, not "the wrapper was wrong".
    const ruling = parseRuling('[{"winner":"UPHOLD_LEGACY"}]', clash());
    if (!isRejected(ruling)) throw new Error("expected a rejection");
    expect(ruling.rejection).toBe("CONFIDENCE_NOT_A_PROBABILITY");
  });

  it("distinguishes a declined ruling from a rejected one", () => {
    // UNDECIDED is a VALID ruling. It must not be reported as a rejection, or
    // the ledger cannot tell "the arbiter found the evidence thin" from "the
    // arbiter emitted junk", and those two justify opposite responses.
    const declined = parseRuling(
      JSON.stringify({
        winner: "UNDECIDED",
        confidence: 0.4,
        reasoning: "The two rows name the same side and the gap is inside the bands.",
      }),
      clash(),
    );
    expect(isRejected(declined)).toBe(false);
    expect(declined.verdict).toBe("UNDECIDED");
  });
});

describe("parseRuling: refuses a fabricated statistic", () => {
  it("rejects a percentage that appears in neither claim", () => {
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_REASONING",
        confidence: 0.8,
        reasoning: "The reasoning path hits 71.4% in this band.",
      }),
      clash(),
    );
    if (!isRejected(ruling)) throw new Error("expected a rejection");
    expect(ruling.rejection).toContain("UNGROUNDED_NUMBERS");
    expect(ruling.rejection).toContain("71.4%");
  });

  it("rejects a record-shaped statistic that appears in neither claim", () => {
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_LEGACY",
        confidence: 0.6,
        reasoning: "The legacy path is 12-4 against the reasoning path this season.",
      }),
      clash(),
    );
    if (!isRejected(ruling)) throw new Error("expected a rejection");
    expect(ruling.rejection).toContain("UNGROUNDED_NUMBERS");
  });

  it("rejects a decimal that appears in neither claim", () => {
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_LEGACY",
        confidence: 0.6,
        reasoning: "The book fair price was 0.615 on that side.",
      }),
      clash(),
    );
    if (!isRejected(ruling)) throw new Error("expected a rejection");
    expect(ruling.rejection).toContain("UNGROUNDED_NUMBERS");
  });

  it("permits the band figures the prompt itself supplied", () => {
    // The prompt tells the arbiter the measured band rates. Citing one of those
    // back is the whole intended use of the band context, so a guard that
    // rejected it would make the prompt's most useful sentence unusable.
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_REASONING",
        confidence: 0.85,
        reasoning: "The legacy top band is measured at 41.5%, well under its 60-69 equivalent.",
      }),
      clash(),
    );
    expect(ruling.verdict).toBe("UPHOLD_REASONING");
  });

  it("permits a number read off the side conflict's own gap", () => {
    const ruling = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_REASONING",
        confidence: 0.7,
        reasoning: "The two rows are 9 points apart on confidence.",
      }),
      sideConflict(),
    );
    expect(ruling.verdict).toBe("UPHOLD_REASONING");
  });
});

describe("the prompt carries the asymmetry the arbiter would otherwise average away", () => {
  it("states the legacy path's inversion, not just the two numbers", () => {
    const prompt = buildArbiterPrompt(clash());
    expect(prompt).toContain("INVERTED");
    expect(prompt).toContain("31.2%");
    expect(prompt).toContain("41.5%");
  });

  it("labels the reasoning path's bands as rising, so the two are not read alike", () => {
    const prompt = buildArbiterPrompt(clash());
    expect(prompt).toContain("67.8%");
    expect(prompt).toMatch(/Rises with the band/);
  });

  it("renders both claims with their producer, selection, and book count", () => {
    const prompt = buildArbiterPrompt(clash());
    expect(prompt).toContain("producer: REASONING");
    expect(prompt).toContain("producer: LEGACY");
    expect(prompt).toContain("pick_reasoning");
    expect(prompt).toContain("pick_legacy");
    expect(prompt).toContain("bookmakers behind it: 11");
    expect(prompt).toContain("bookmakers behind it: 0");
  });

  it("asks the different question for a side conflict than for a clash", () => {
    expect(buildArbiterPrompt(sideConflict())).toContain("OPPOSITE sides");
    expect(buildArbiterPrompt(clash())).toContain("SAME side");
  });

  it("forbids predicting the result, so the arbiter cannot become a forecaster", () => {
    expect(SYSTEM_PROMPT).toMatch(/Never predict the result/);
  });
});

describe("isArbiterVerdict", () => {
  it("is a closed set, and says so", () => {
    expect(isArbiterVerdict("UPHOLD_REASONING")).toBe(true);
    expect(isArbiterVerdict("UPHOLD_LEGACY")).toBe(true);
    expect(isArbiterVerdict("UNDECIDED")).toBe(true);
    expect(isArbiterVerdict("AVERAGE")).toBe(false);
    expect(isArbiterVerdict("")).toBe(false);
    expect(ARBITER_VERDICTS).toHaveLength(3);
  });
});

/**
 * MUTATION CONTROL. Weakening the numeric guard to a no-op (returning
 * `{ grounded: true }` unconditionally) is the single most plausible
 * regression on this file: it would make every fabrication test pass while
 * making the arbiter unauditable. These two assertions are what it breaks.
 */
describe("numeric guard mutation control", () => {
  it("a no-op guard would let both fabrications through, so these are load-bearing", () => {
    const fabricatedPercent = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_REASONING",
        confidence: 0.8,
        reasoning: "The reasoning path hits 71.4% in this band.",
      }),
      clash(),
    );
    const fabricatedRecord = parseRuling(
      JSON.stringify({
        winner: "UPHOLD_LEGACY",
        confidence: 0.6,
        reasoning: "The legacy path is 12-4 against the reasoning path.",
      }),
      clash(),
    );

    expect(isRejected(fabricatedPercent)).toBe(true);
    expect(isRejected(fabricatedRecord)).toBe(true);
  });
});
