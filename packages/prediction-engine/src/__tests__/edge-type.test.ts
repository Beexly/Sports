import { describe, it, expect } from "vitest";
import {
  EDGE_TYPES,
  DETECTABLE_NOW_TYPES,
  getEdgeTypeSpec,
  tagEdgeType,
  BOOK_DISAGREEMENT_DISPERSION,
  MIN_BOOKS_FOR_DISAGREEMENT,
  OVERCORRECTION_MIN_MOVE,
  OVERCORRECTION_MIN_REVERSAL,
  type EdgeType,
  type EdgeTypeSignals,
} from "../edge-type.js";

const ALL_13: EdgeType[] = [
  "stale-injury-price",
  "derivative-market-lag",
  "book-disagreement-lag",
  "market-overcorrection",
  "public-narrative-distortion",
  "scheme-mismatch",
  "player-usage-role-change",
  "weather-underreaction",
  "ol-dl-mismatch",
  "pace-game-script-mismatch",
  "coach-tendency-mispricing",
  "prop-threshold-mispricing",
  "no-clear-edge",
];

describe("EDGE_TYPES registry", () => {
  it("contains exactly the 13 taxonomy types", () => {
    expect(EDGE_TYPES).toHaveLength(13);
    expect(EDGE_TYPES.map((s) => s.type).sort()).toEqual([...ALL_13].sort());
  });

  it("marks exactly the three fully-detectable-now types (the taxonomy HAVE set)", () => {
    expect([...DETECTABLE_NOW_TYPES].sort()).toEqual(
      ["book-disagreement-lag", "market-overcorrection", "no-clear-edge"].sort(),
    );
    // Every other type is data-blocked (PARTIAL/MISSING) and not detectable now.
    for (const spec of EDGE_TYPES) {
      if (!DETECTABLE_NOW_TYPES.includes(spec.type)) {
        expect(spec.detectableNow).toBe(false);
        expect(spec.dataStatus === "PARTIAL" || spec.dataStatus === "MISSING").toBe(true);
      }
    }
  });

  it("every entry carries a definition and at least one required signal", () => {
    for (const spec of EDGE_TYPES) {
      expect(spec.definition.length).toBeGreaterThan(0);
      expect(spec.requiredSignals.length).toBeGreaterThan(0);
    }
  });

  it("getEdgeTypeSpec resolves known types and returns undefined otherwise", () => {
    expect(getEdgeTypeSpec("market-overcorrection")?.detectableNow).toBe(true);
    expect(getEdgeTypeSpec("xyz" as EdgeType)).toBeUndefined();
  });
});

describe("tagEdgeType — only detectable-now types fire as positives", () => {
  it("returns null when no usable market read is supplied", () => {
    const tag = tagEdgeType({});
    expect(tag.type).toBeNull();
    expect(tag.detectableNow).toBe(false);
    // The data-blocked candidates are still surfaced, never as positives.
    expect(tag.requiresData.length).toBeGreaterThan(0);
    expect(tag.requiresData.every((c) => c.type !== "no-clear-edge")).toBe(true);
  });

  it("fires book-disagreement-lag when cross-book dispersion clears the bar with enough books", () => {
    const signals: EdgeTypeSignals = {
      homeProbDispersion: BOOK_DISAGREEMENT_DISPERSION + 0.01,
      bookCount: MIN_BOOKS_FOR_DISAGREEMENT,
    };
    const tag = tagEdgeType(signals);
    expect(tag.type).toBe("book-disagreement-lag");
    expect(tag.detectableNow).toBe(true);
  });

  it("does NOT fire book-disagreement-lag below the dispersion bar", () => {
    const tag = tagEdgeType({
      homeProbDispersion: BOOK_DISAGREEMENT_DISPERSION - 0.001,
      bookCount: 10,
      edgeDecision: "PASS",
    });
    expect(tag.type).toBe("no-clear-edge");
  });

  it("does NOT fire book-disagreement-lag with too few books (one book is not a disagreement)", () => {
    const tag = tagEdgeType({
      homeProbDispersion: 0.2,
      bookCount: MIN_BOOKS_FOR_DISAGREEMENT - 1,
      edgeDecision: "PASS",
    });
    expect(tag.type).toBe("no-clear-edge");
  });

  it("fires market-overcorrection on a large move followed by a meaningful retrace", () => {
    const tag = tagEdgeType({
      lineMovementMagnitude: OVERCORRECTION_MIN_MOVE + 1,
      lineMovementReversal: OVERCORRECTION_MIN_REVERSAL + 0.1,
    });
    expect(tag.type).toBe("market-overcorrection");
    expect(tag.detectableNow).toBe(true);
  });

  it("does NOT fire market-overcorrection on a big move with no retrace", () => {
    const tag = tagEdgeType({
      lineMovementMagnitude: 5,
      lineMovementReversal: 0,
      edgeDecision: "PASS",
    });
    expect(tag.type).toBe("no-clear-edge");
  });

  it("defaults to no-clear-edge when the edge engine sees no demonstrable edge", () => {
    const tag = tagEdgeType({ edgeDecision: "PASS", edgeAgreement: "NONE" });
    expect(tag.type).toBe("no-clear-edge");
    expect(tag.detectableNow).toBe(true);
  });

  it("never returns a data-blocked type as a positive — only the three HAVE types", () => {
    const cases: EdgeTypeSignals[] = [
      { edgeDecision: "SPEAK", edgeAgreement: "CONFIRMS" },
      { homeProbDispersion: 0.5, bookCount: 12 },
      { lineMovementMagnitude: 9, lineMovementReversal: 9 },
      { edgeDecision: "LEAN" },
    ];
    for (const c of cases) {
      const tag = tagEdgeType(c);
      if (tag.type !== null) {
        expect(DETECTABLE_NOW_TYPES).toContain(tag.type);
      }
    }
  });

  it("always surfaces the data-blocked candidates with their unlock signals", () => {
    const tag = tagEdgeType({ edgeDecision: "PASS" });
    const types = tag.requiresData.map((c) => c.type);
    expect(types).toContain("stale-injury-price");
    expect(types).toContain("weather-underreaction");
    expect(types).toContain("prop-threshold-mispricing");
    expect(types).not.toContain("no-clear-edge");
    expect(types).not.toContain("book-disagreement-lag");
    for (const c of tag.requiresData) {
      expect(c.requiredSignals.length).toBeGreaterThan(0);
    }
  });
});
