import { describe, it, expect } from "vitest";
import { assessEdge, SPEAK_EDGE } from "../edge-engine.js";

describe("assessEdge — the honest default", () => {
  it("PASSES with no independent estimate (never manufactures an edge from the market)", () => {
    const a = assessEdge({ marketFairProb: 0.52, independents: [] });
    expect(a.decision).toBe("PASS");
    expect(a.trueProb).toBeNull();
    expect(a.rationale).toMatch(/decline|manufacture/i);
  });

  it("PASSES when the independent estimate barely differs from the market", () => {
    const a = assessEdge({
      marketFairProb: 0.521,
      independents: [{ source: "poisson", prob: 0.525 }],
    });
    expect(a.decision).toBe("PASS");
    expect(Math.abs(a.rawEdge)).toBeLessThan(0.01);
  });
});

describe("assessEdge — the independent-referee logic (the part tout tools skip)", () => {
  it("SPEAKS when two independent estimators agree the book is soft", () => {
    const a = assessEdge({
      marketFairProb: 0.50,
      independents: [
        { source: "poisson", prob: 0.575 },
        { source: "kalshi", prob: 0.565 },
      ],
    });
    expect(a.agreement).toBe("CONFIRMS");
    expect(a.decision).toBe("SPEAK");
    expect(a.rawEdge).toBeGreaterThan(0.05);
    expect(a.expectedClv).toBeGreaterThan(0); // we expect to beat the close
    expect(a.conviction).toBeGreaterThan(50);
    expect(a.rationale).toMatch(/expected CLV/i);
  });

  it("PASSES when an independent referee sides WITH the sportsbook (our model is the outlier)", () => {
    const a = assessEdge({
      marketFairProb: 0.50,
      independents: [
        { source: "poisson", prob: 0.60 }, // model loves the side
        { source: "kalshi", prob: 0.46 }, // the independent exchange disagrees
      ],
    });
    // blended trueProb ~0.53 is edge-positive, but the exchange contradicts →
    // we stand down rather than fade the market on one signal.
    expect(a.agreement).toBe("CONTRADICTS");
    expect(a.decision).toBe("PASS");
    expect(a.rationale).toMatch(/outlier|sides with the sportsbook/i);
  });

  it("discounts a SOLO source (cannot be cross-checked) vs a CONFIRMED pair", () => {
    const solo = assessEdge({ marketFairProb: 0.5, independents: [{ source: "poisson", prob: 0.56 }] });
    const pair = assessEdge({
      marketFairProb: 0.5,
      independents: [{ source: "poisson", prob: 0.56 }, { source: "kalshi", prob: 0.56 }],
    });
    expect(solo.agreement).toBe("SOLO");
    expect(pair.agreement).toBe("CONFIRMS");
    // same raw edge, but the cross-checked pair earns more conviction
    expect(pair.conviction).toBeGreaterThan(solo.conviction);
  });
});

describe("assessEdge — shrink + guards", () => {
  it("shrinks the edge for thin evidence and high uncertainty", () => {
    const strong = assessEdge({
      marketFairProb: 0.5,
      independents: [{ source: "poisson", prob: 0.57 }, { source: "kalshi", prob: 0.57 }],
      evidenceScore: 100,
      uncertainty: 0,
    });
    const weak = assessEdge({
      marketFairProb: 0.5,
      independents: [{ source: "poisson", prob: 0.57 }, { source: "kalshi", prob: 0.57 }],
      evidenceScore: 40,
      uncertainty: 0.5,
    });
    expect(Math.abs(weak.shrunkEdge)).toBeLessThan(Math.abs(strong.shrunkEdge));
    expect(weak.conviction).toBeLessThan(strong.conviction);
  });

  it("refuses to credit a positive edge from a sub-vig (inconsistent) book", () => {
    const a = assessEdge({
      marketFairProb: 0.50,
      independents: [{ source: "poisson", prob: 0.58 }, { source: "kalshi", prob: 0.58 }],
      marketConsistent: false,
    });
    expect(a.rawEdge).toBe(0);
    expect(a.decision).toBe("PASS");
  });

  it("never SPEAKS below the published edge threshold", () => {
    const a = assessEdge({
      marketFairProb: 0.5,
      independents: [{ source: "poisson", prob: 0.515 }, { source: "kalshi", prob: 0.515 }],
    });
    expect(Math.abs(a.shrunkEdge)).toBeLessThan(SPEAK_EDGE);
    expect(a.decision).not.toBe("SPEAK");
  });

  it("does not back the side when the model thinks it is OVERvalued (negative edge)", () => {
    const a = assessEdge({
      marketFairProb: 0.60,
      independents: [{ source: "poisson", prob: 0.52 }, { source: "kalshi", prob: 0.53 }],
    });
    expect(a.rawEdge).toBeLessThan(0);
    expect(a.decision).toBe("PASS"); // we only back positive-edge sides
  });
});
