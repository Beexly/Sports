import { describe, expect, it } from "vitest";
import {
  consensusNoVig,
  marketDisagreementPct,
  marketGravityIndex,
  noVigFromAmericanPrices,
} from "../market-read.js";

describe("noVigFromAmericanPrices", () => {
  it("a balanced -110/-110 line de-vigs to 50/50 with ~4.76% hold", () => {
    const read = noVigFromAmericanPrices([-110, -110]);
    expect(read).not.toBeNull();
    expect(read!.fairProbabilities[0]).toBeCloseTo(0.5, 3);
    expect(read!.fairProbabilities[1]).toBeCloseTo(0.5, 3);
    expect(read!.bookHoldPct).toBeCloseTo(4.76, 1);
    expect(read!.outcomeCount).toBe(2);
  });

  it("fair probabilities always sum to 1 and preserve favourite ordering", () => {
    const read = noVigFromAmericanPrices([-200, +170]);
    expect(read).not.toBeNull();
    const sum = read!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 4);
    expect(read!.fairProbabilities[0]!).toBeGreaterThan(read!.fairProbabilities[1]!);
    expect(read!.bookHoldPct).toBeGreaterThan(0);
  });

  it("refuses one-sided or invalid quotes — no honest de-vig exists", () => {
    expect(noVigFromAmericanPrices([-110])).toBeNull();
    expect(noVigFromAmericanPrices([])).toBeNull();
    expect(noVigFromAmericanPrices([-110, 0])).toBeNull();
    expect(noVigFromAmericanPrices([-110, Number.NaN])).toBeNull();
  });

  it("handles three-way (draw) markets", () => {
    const read = noVigFromAmericanPrices([+150, +210, +240]);
    expect(read).not.toBeNull();
    expect(read!.outcomeCount).toBe(3);
    const sum = read!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 4);
  });
});

describe("consensusNoVig", () => {
  it("takes the median across books so one outlier cannot drag it", () => {
    const consensus = consensusNoVig([
      { home: -120, away: +100 },
      { home: -125, away: +105 },
      { home: -300, away: +250 }, // stale outlier
    ]);
    expect(consensus).not.toBeNull();
    expect(consensus!.bookCount).toBe(3);
    // Median book is -125/+105; fair home should sit near its de-vig (~0.54),
    // far from the outlier's ~0.72.
    expect(consensus!.fairHomeProb).toBeGreaterThan(0.5);
    expect(consensus!.fairHomeProb).toBeLessThan(0.6);
    expect(consensus!.fairHomeProb + consensus!.fairAwayProb).toBeCloseTo(1, 4);
    expect(consensus!.fairDrawProb).toBeNull();
  });

  it("returns null when no book quotes both sides", () => {
    expect(consensusNoVig([{ home: -110, away: 0 }])).toBeNull();
    expect(consensusNoVig([])).toBeNull();
  });

  it("only mixes draw-quoting books with each other", () => {
    const consensus = consensusNoVig([
      { home: -120, away: +100 },
      { home: +150, away: +210, draw: +240 },
    ]);
    expect(consensus).not.toBeNull();
    expect(consensus!.bookCount).toBe(1);
    expect(consensus!.fairDrawProb).not.toBeNull();
  });
});

describe("marketDisagreementPct", () => {
  it("is the honest edge sentence in percentage points", () => {
    expect(marketDisagreementPct(0.56, 0.528)).toBeCloseTo(3.2, 5);
    expect(marketDisagreementPct(0.5, 0.55)).toBeCloseTo(-5, 5);
  });
});

describe("consensus dispersion", () => {
  it("is ~0 when books agree, higher when they split", () => {
    const tight = consensusNoVig([
      { home: -120, away: +100 },
      { home: -122, away: +102 },
    ]);
    const split = consensusNoVig([
      { home: -500, away: +400 },
      { home: +200, away: -240 },
    ]);
    expect(tight!.homeProbDispersion).toBeLessThan(0.02);
    expect(split!.homeProbDispersion).toBeGreaterThan(0.2);
  });
});

describe("marketGravityIndex", () => {
  it("a pick'em with agreement is balanced — no pull", () => {
    const consensus = consensusNoVig([
      { home: -110, away: -110 },
      { home: -110, away: -110 },
    ])!;
    const g = marketGravityIndex(consensus);
    expect(g.index).toBeLessThan(10);
    expect(g.band).toBe("balanced");
    expect(g.side).toBe("none");
  });

  it("a lopsided, agreed, well-covered market pulls strongly toward the favourite", () => {
    const consensus = consensusNoVig([
      { home: -600, away: +450 },
      { home: -610, away: +460 },
      { home: -590, away: +440 },
      { home: -605, away: +455 },
      { home: -595, away: +445 },
      { home: -600, away: +450 },
    ])!;
    const g = marketGravityIndex(consensus);
    expect(g.side).toBe("home");
    expect(g.band).toBe("strong");
    expect(g.index).toBeGreaterThan(60);
    expect(g.conviction).toBeGreaterThan(0.6);
    expect(g.agreement).toBeGreaterThan(0.9);
  });

  it("book disagreement discounts the pull below the same lean with consensus", () => {
    const agreed = marketGravityIndex(
      consensusNoVig([
        { home: -200, away: +170 },
        { home: -205, away: +175 },
        { home: -198, away: +168 },
      ])!,
    );
    const split = marketGravityIndex(
      consensusNoVig([
        { home: -120, away: +100 },
        { home: -400, away: +320 },
        { home: -150, away: +130 },
      ])!,
    );
    expect(split.agreement).toBeLessThan(agreed.agreement);
  });
});
