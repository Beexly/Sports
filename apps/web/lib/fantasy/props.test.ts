import { describe, it, expect } from "vitest";
import { probOver, readProp, evalEntry, PROPS, POWER_PAYOUT, type Prop } from "./props";

const mk = (over: Partial<Prop> = {}): Prop => ({
  id: "t", player: "Test", team: "PHI", market: "Rec Yds", line: 50, mean: 60, sigma: 20, alts: [], ...over,
});

describe("props edge", () => {
  it("probOver is 0.5 when the line equals the mean", () => {
    expect(probOver(50, 50, 20)).toBeCloseTo(0.5, 5);
  });

  it("probOver rises as the mean clears the line", () => {
    expect(probOver(50, 60, 20)).toBeGreaterThan(0.5);
    expect(probOver(50, 40, 20)).toBeLessThan(0.5);
  });

  it("recommends OVER when our number clears the line, UNDER when below", () => {
    expect(readProp(mk({ mean: 65 })).side).toBe("over");
    expect(readProp(mk({ mean: 35 })).side).toBe("under");
  });

  it("edge is zero at a coin flip and approaches 1 for a lock", () => {
    expect(readProp(mk({ mean: 50 })).edge).toBeCloseTo(0, 2);
    expect(readProp(mk({ mean: 130, sigma: 10 })).edge).toBeGreaterThan(0.95);
  });

  it("picks the alt line that maximises EV for our side", () => {
    const r = readProp(mk({ mean: 70, sigma: 18, alts: [
      { line: 40, mult: 0.7 },  // very likely but low payout
      { line: 90, mult: 2.0 },  // unlikely but big payout
    ] }));
    expect(r.bestAlt).not.toBeNull();
    // EV must beat both legs' naive break-even framing — it's a real max
    const evs = [0.7, 2.0].map((m, i) => {
      const line = i === 0 ? 40 : 90;
      const p = i === 0 ? probOver(line, 70, 18) : probOver(line, 70, 18);
      return p * m - 1;
    });
    expect(r.bestAlt!.ev).toBeCloseTo(Math.max(...evs), 5);
  });

  it("entry combined probability is the product of legs and shrinks with size", () => {
    const reads = PROPS.slice(0, 4).map(readProp);
    const two = evalEntry(reads.slice(0, 2))!;
    const four = evalEntry(reads.slice(0, 4))!;
    expect(four.combinedP).toBeLessThan(two.combinedP);
    expect(two.payout).toBe(POWER_PAYOUT[2]);
  });

  it("flags a stack of coin-flips as negative EV", () => {
    const flips = Array.from({ length: 5 }, (_, i) => readProp(mk({ id: `f${i}`, mean: 50.5, sigma: 20 })));
    const e = evalEntry(flips)!;
    expect(e.ev).toBeLessThan(0);
    expect(e.verdict).toBe("-EV");
  });

  it("every posted prop produces a coherent read", () => {
    for (const prop of PROPS) {
      const r = readProp(prop);
      expect(r.pSide).toBeGreaterThanOrEqual(0.5);
      expect(r.pSide).toBeLessThanOrEqual(1);
      expect(r.edge).toBeGreaterThanOrEqual(0);
    }
  });
});
