import { describe, expect, it } from "vitest";
import {
  FeatureGroup,
  Sample,
  deltaSepAdditive,
  normalizeByPace,
  passesImprovementGate,
  probeSeparability,
  recombine,
} from "./1905-11481v2-ai-feynman-separability";

function makeSamples(
  f: (x: readonly number[]) => number,
  n: number,
): Sample[] {
  const out: Sample[] = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    const x = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
    out.push({ x, y: f(x) });
  }
  return out;
}

const OFFENSE: FeatureGroup = { name: "offense", indices: [0, 1] };
const DEFENSE: FeatureGroup = { name: "defense", indices: [2, 3] };

describe("AI Feynman separability front-end", () => {
  it("detects additive separability when f = g(xA) + h(xB)", () => {
    const f = (x: readonly number[]) =>
      (x[0]! + 2 * x[1]!) + (x[2]! ** 2 - x[3]!);
    const samples = makeSamples(f, 40);
    const res = probeSeparability(samples, f, OFFENSE, DEFENSE);
    expect(res.additiveSeparable).toBe(true);
    expect(res.deltaSepAdditive).toBeLessThan(res.threshold);
  });

  it("does NOT fire additive separability for coupled f = xA * xB interaction", () => {
    const f = (x: readonly number[]) =>
      x[0]! * x[2]! + x[1]! + x[3]!;
    const samples = makeSamples(f, 40);
    expect(deltaSepAdditive(samples, f, OFFENSE, DEFENSE)).toBeGreaterThan(0.1);
  });

  it("detects multiplicative separability via log|y| probe", () => {
    const f = (x: readonly number[]) =>
      Math.exp(x[0]! + x[1]!) * Math.exp(x[2]! + x[3]!);
    const samples = makeSamples(f, 40);
    const res = probeSeparability(samples, f, OFFENSE, DEFENSE);
    expect(res.multiplicativeSeparable).toBe(true);
  });

  it("recombines additively when separability fired", () => {
    const res = probeSeparability(
      makeSamples((x) => x[0]! + x[2]!, 20),
      (x) => x[0]! + x[2]!,
      OFFENSE,
      DEFENSE,
    );
    const recombined = recombine(
      [
        { group: "offense", expression: "2*x0 + x1", nodes: 4 },
        { group: "defense", expression: "x2^2", nodes: 3 },
      ],
      res,
    );
    expect(recombined.separabilityFired).toBe(true);
    expect(recombined.expression).toContain(" + ");
    expect(recombined.totalNodes).toBeLessThanOrEqual(4 + 3 + 1);
  });

  it("falls back to coupled expression when separability never fires", () => {
    const f = (x: readonly number[]) => x[0]! * x[2]! + x[1]! + x[3]!;
    const samples = makeSamples(f, 40);
    const res = probeSeparability(samples, f, OFFENSE, DEFENSE);
    expect(res.additiveSeparable).toBe(false);
    const recombined = recombine(
      [{ group: "flat", expression: "x0*x2", nodes: 3 }],
      res,
    );
    expect(recombined.separabilityFired).toBe(false);
    expect(recombined.expression).toContain("coupled");
  });

  it("pace normalization rescales points-per-drive by league-mean pace", () => {
    const samples: Sample[] = [
      { x: [1, 2, 64], y: 2.0 }, // 64 plays/game
      { x: [1, 2, 80], y: 2.5 }, // 80 plays/game
    ];
    const out = normalizeByPace(samples, 2, 72);
    expect(out[0]!.y).toBeCloseTo(2.0 * (72 / 64), 9);
    expect(out[1]!.y).toBeCloseTo(2.5 * (72 / 80), 9);
  });

  it("passesImprovementGate implements the >=5% RMSE / <=20% node rule", () => {
    // 10% RMSE better, 15% more nodes -> pass.
    expect(passesImprovementGate(0.5, 0.45, 100, 115)).toBe(true);
    // Only 4% RMSE better -> fail.
    expect(passesImprovementGate(0.5, 0.48, 100, 100)).toBe(false);
    // 30% more nodes -> fail.
    expect(passesImprovementGate(0.5, 0.4, 100, 130)).toBe(false);
    // Underperforms -> fail.
    expect(passesImprovementGate(0.5, 0.6, 100, 100)).toBe(false);
  });
});
