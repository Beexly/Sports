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

  it("collapses to a point mass (no NaN) when sigma is degenerate", () => {
    // sigma<=0 / NaN: projection is a point mass at mean, not a NaN divide.
    expect(probOver(60, 50, 0)).toBe(0); // line above mean -> over impossible
    expect(probOver(40, 50, 0)).toBe(1); // line below mean -> over certain
    expect(probOver(50, 50, 0)).toBe(0.5); // line on mean -> coin flip
    expect(probOver(60, 50, -5)).toBe(0);
    expect(probOver(60, 50, NaN)).toBe(0);
  });

  it("readProp stays finite (no 'NaN%' note) on a degenerate sigma line", () => {
    const r = readProp(mk({ line: 40, mean: 50, sigma: 0, alts: [] }));
    expect(Number.isFinite(r.pOver)).toBe(true);
    expect(Number.isFinite(r.pSide)).toBe(true);
    expect(Number.isFinite(r.edge)).toBe(true);
    expect(Number.isFinite(r.conviction)).toBe(true);
    expect(r.note).not.toContain("NaN");
    expect(r.side).toBe("over");
    expect(r.priced).toBe(false);
    expect(r.edge).toBe(0);
  });

  it("recommends OVER when our number clears the line, UNDER when below", () => {
    expect(readProp(mk({ mean: 65 })).side).toBe("over");
    expect(readProp(mk({ mean: 35 })).side).toBe("under");
  });

  it("unpriced lines have edge 0; conviction still tracks |2p−1|", () => {
    const coin = readProp(mk({ mean: 50 }));
    expect(coin.priced).toBe(false);
    expect(coin.edge).toBe(0);
    expect(coin.conviction).toBeCloseTo(0, 2);
    const lock = readProp(mk({ mean: 130, sigma: 10 }));
    expect(lock.priced).toBe(false);
    expect(lock.edge).toBe(0);
    expect(lock.conviction).toBeGreaterThan(0.95);
  });

  it("prices e = p − q vs an even book and does not treat 90% chalk as value", () => {
    const even = readProp(mk({ mean: 58, sigma: 20, overAmerican: -110, underAmerican: -110 }));
    expect(even.priced).toBe(true);
    expect(even.edge).toBeCloseTo(even.pOver - 0.5, 5);
    const chalk = readProp(
      mk({ mean: 90, sigma: 8, line: 50, overAmerican: -900, underAmerican: 700 }),
    );
    expect(chalk.priced).toBe(true);
    expect(chalk.conviction).toBeGreaterThan(0.7);
    expect(Math.abs(chalk.edge)).toBeLessThan(chalk.conviction / 5);
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
