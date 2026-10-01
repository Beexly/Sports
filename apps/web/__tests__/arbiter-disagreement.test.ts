/**
 * What the detector is for, measured.
 *
 * The failure this whole module exists to name was found in production on
 * 2026-09-13: the reasoning path wrote a moneylines claim onto a fixture that
 * ALREADY carried a legacy spread claim, and on two of them it took the other
 * side. The site was selling "Chicago Bears -3.0" and "Carolina Panthers ML" on
 * one game at once. That is a collision, and a detector that cannot see it is
 * worse than no detector because it reads as coverage.
 *
 * The assertions below are therefore mostly NEGATIVE: each one builds the
 * specific shape that must NOT be called a disagreement, because a detector
 * that fires on everything produces a full ledger of noise and the real
 * collisions disappear into it. The positive cases prove the detector can move
 * at all, and the last test states the mutation those negatives exist to catch.
 *
 * THE TWO NON-DISAGREEMENTS ARE DISTINCT ON PURPOSE. `AGREEMENT` means the two
 * paths converged; `INSUFFICIENT` means we could not tell. Folding them into
 * one "fine" would make a parse failure indistinguishable from a real
 * convergence, and the arbiter's accuracy measurement would then quietly
 * include rows where no comparison ever happened.
 */

import { describe, expect, it } from "vitest";
import {
  detectDisagreement,
  isReasoningPathRow,
  CONFIDENCE_CLASH_FLOOR_POINTS,
  type PathClaim,
  type SideResolver,
} from "@/lib/arbiter/disagreement";

const sideResolver: SideResolver = (selection) => {
  if (selection.startsWith("Chicago") || selection.startsWith("Baltimore")) return "HOME";
  if (selection.startsWith("Carolina") || selection.startsWith("Toronto")) return "AWAY";
  return null;
};

/** A reasoning-path claim: model signal, zero books, the marker selection. */
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

/** A legacy-path claim: real books, a real edge, a graded pick. */
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

describe("isReasoningPathRow", () => {
  it("identifies a model-signal row by its defining facts, not by a flag column", () => {
    expect(
      isReasoningPathRow({ selection: "Panthers ML (model signal)", bookmakerCount: 0 }),
    ).toBe(true);
  });

  it("rejects a signal marker on a row that carries books", () => {
    // The marker text alone must not be enough: a book-priced row is the legacy
    // path regardless of what its selection string happens to contain.
    expect(
      isReasoningPathRow({ selection: "Panthers ML (model signal)", bookmakerCount: 11 }),
    ).toBe(false);
  });

  it("rejects a bookmaker-less row without the marker", () => {
    expect(isReasoningPathRow({ selection: "Panthers ML", bookmakerCount: 0 })).toBe(false);
  });
});

describe("detectDisagreement: a side conflict is a conflict", () => {
  it("names the side conflict when the two paths back opposite teams", () => {
    const result = detectDisagreement(reasoning(), legacy(), sideResolver);
    expect(result.kind).toBe("SIDE_CONFLICT");
    if (result.kind !== "SIDE_CONFLICT") throw new Error("unreachable");
    expect(result.sameSide).toBe(false);
    expect(result.reasoning.pickId).toBe("pick_reasoning");
    expect(result.legacy.pickId).toBe("pick_legacy");
  });

  it("recovers the exact production pair from the 2026-09-13 coherence incident", () => {
    // SPREAD "Chicago Bears -3.0" (11 books) against MONEYLINE "Carolina
    // Panthers ML (model signal)" (0 books) on one fixture: opposite positions,
    // both sellable, and the signal row's own text claimed "no book line".
    // A detector that dismissed cross-market pairs would MISS this one.
    const result = detectDisagreement(
      reasoning(),
      legacy({
        pickType: "SPREAD",
        selection: "Chicago Bears -3.0",
        confidence: 72,
        pickGrade: "ELITE_PLAY",
      }),
      sideResolver,
    );
    expect(result.kind).toBe("SIDE_CONFLICT");
  });

  it("recovers the second production pair (Orioles at Toronto)", () => {
    const result = detectDisagreement(
      reasoning({ selection: "Baltimore Orioles ML (model signal)", confidence: 69 }),
      legacy({ pickType: "SPREAD", selection: "Toronto Blue Jays -1.5", confidence: 58 }),
      sideResolver,
    );
    expect(result.kind).toBe("SIDE_CONFLICT");
    if (result.kind !== "SIDE_CONFLICT") throw new Error("unreachable");
    expect(result.magnitude).toBe(11);
  });

  it("reports the real confidence gap on a side conflict, never a sentinel", () => {
    const result = detectDisagreement(
      reasoning({ confidence: 40 }),
      legacy({ confidence: 95 }),
      sideResolver,
    );
    if (result.kind !== "SIDE_CONFLICT") throw new Error("expected a side conflict");
    expect(result.magnitude).toBe(55);
  });
});

describe("detectDisagreement: agreement is not a disagreement", () => {
  it("returns AGREEMENT when both paths back the same team at the same confidence", () => {
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 70 }),
      sideResolver,
    );
    expect(result.kind).toBe("AGREEMENT");
  });

  it("returns AGREEMENT for a same-side gap below the declared floor", () => {
    // One point of confidence is rounding, not a dispute. Firing here would put
    // a ruling in the ledger for most of the board.
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 71 }),
      sideResolver,
    );
    expect(result.kind).toBe("AGREEMENT");
  });

  it("reports the gap in its reason so a reader can see the margin", () => {
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 74 }),
      sideResolver,
    );
    if (result.kind !== "AGREEMENT") throw new Error("expected agreement");
    expect(result.reason).toContain("4-point");
  });
});

describe("detectDisagreement: insufficient evidence is named, not guessed", () => {
  it("returns INSUFFICIENT when a side cannot be resolved", () => {
    // An unresolvable selection is ABSENT evidence, not disagreement. Reading
    // silence as conflict is how a detector ends up adjudicating garbage.
    const result = detectDisagreement(
      reasoning({ selection: "TOTAL 47.5" }),
      legacy({ selection: "TOTAL 47.5" }),
      sideResolver,
    );
    expect(result.kind).toBe("INSUFFICIENT");
    if (result.kind !== "INSUFFICIENT") throw new Error("unreachable");
    expect(result.reason).toContain("Could not resolve");
  });

  it("returns INSUFFICIENT when the resolver itself cannot decide any side", () => {
    const result = detectDisagreement(reasoning(), legacy(), () => null);
    expect(result.kind).toBe("INSUFFICIENT");
  });

  it("returns INSUFFICIENT for one pick compared against itself", () => {
    // Nothing is being contested, so there is nothing to rule on.
    const only = reasoning();
    const result = detectDisagreement(only, { ...only }, sideResolver);
    expect(result.kind).toBe("INSUFFICIENT");
    if (result.kind !== "INSUFFICIENT") throw new Error("unreachable");
    expect(result.reason).toContain("nothing to adjudicate");
  });
});

describe("detectDisagreement: a confidence clash is graded, not binary", () => {
  it("names a clash when the same side is priced far apart across the declared floor", () => {
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 52 }),
      legacy({ selection: "Chicago Bears ML", confidence: 88 }),
      sideResolver,
    );
    expect(result.kind).toBe("CONFIDENCE_CLASH");
    if (result.kind !== "CONFIDENCE_CLASH") throw new Error("unreachable");
    expect(result.sameSide).toBe(true);
    expect(result.magnitude).toBe(36);
    expect(result.magnitude).toBeGreaterThanOrEqual(CONFIDENCE_CLASH_FLOOR_POINTS);
  });

  it("fires exactly at the declared floor, so the threshold is not decorative", () => {
    const at = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 60 }),
      legacy({ selection: "Chicago Bears ML", confidence: 60 + CONFIDENCE_CLASH_FLOOR_POINTS }),
      sideResolver,
    );
    expect(at.kind).toBe("CONFIDENCE_CLASH");

    const below = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 60 }),
      legacy({
        selection: "Chicago Bears ML",
        confidence: 60 + CONFIDENCE_CLASH_FLOOR_POINTS - 1,
      }),
      sideResolver,
    );
    expect(below.kind).toBe("AGREEMENT");
  });

  it("reports magnitude as an absolute gap, so a sign flip cannot hide a clash", () => {
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 90 }),
      legacy({ selection: "Chicago Bears ML", confidence: 60 }),
      sideResolver,
    );
    if (result.kind !== "CONFIDENCE_CLASH") throw new Error("expected a clash");
    expect(result.magnitude).toBe(30);
  });

  it("keeps the two producers on their own claims, never swapping them", () => {
    // A detector that silently swapped the sides would hand the arbiter a prompt
    // in which the reasoning path is described by the legacy row's numbers.
    const result = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 52 }),
      legacy({ selection: "Chicago Bears ML", confidence: 88 }),
      sideResolver,
    );
    if (result.kind !== "CONFIDENCE_CLASH") throw new Error("expected a clash");
    expect(result.reasoning.path).toBe("REASONING");
    expect(result.reasoning.confidence).toBe(52);
    expect(result.legacy.path).toBe("LEGACY");
    expect(result.legacy.confidence).toBe(88);
  });
});

/**
 * MUTATION CONTROL. A detector hardcoded to return SIDE_CONFLICT would pass
 * every "is this a conflict" test above and fail only the agreement and
 * insufficient ones. That asymmetry is the whole risk: a detector that always
 * says YES looks like perfect coverage on a dashboard. The negative cases above
 * are what make the positive ones mean anything, and this test states the
 * dependency explicitly rather than leaving it to be discovered in production.
 */
describe("detector mutation control", () => {
  it("an always-conflict detector fails the same-side cases", () => {
    const alwaysConflict = { kind: "SIDE_CONFLICT" } as const;

    // The two inputs that a real detector calls AGREEMENT.
    const sameSide = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 70 }),
      sideResolver,
    );
    const closeGap = detectDisagreement(
      reasoning({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 71 }),
      sideResolver,
    );

    expect(sameSide.kind).not.toBe(alwaysConflict.kind);
    expect(closeGap.kind).not.toBe(alwaysConflict.kind);
  });

  it("a magnitude-only averager fails to name a side conflict at all", () => {
    // The second mutation worth catching: an implementation that only ever
    // compares confidence would report AGREEMENT for two opposite sides whose
    // confidences happen to match, which is precisely the production pair.
    const result = detectDisagreement(
      reasoning({ selection: "Carolina Panthers ML (model signal)", confidence: 70 }),
      legacy({ selection: "Chicago Bears ML", confidence: 70 }),
      sideResolver,
    );
    expect(result.kind).toBe("SIDE_CONFLICT");
  });
});
