import { describe, expect, it } from "vitest";
import {
  consensusNoVig,
  marketDisagreementPct,
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
