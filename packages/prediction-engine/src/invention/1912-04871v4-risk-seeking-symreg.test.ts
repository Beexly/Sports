import { describe, expect, it } from "vitest";
import {
  Program,
  binary,
  countNodes,
  distinctInputVars,
  evaluate,
  leafConst,
  leafVar,
  mutate,
  nestedTrigDepth,
  passesConstraintMask,
  passesGate,
  predictiveR,
  riskSeekingAdvantages,
  riskSeekingBaseline,
  riskSeekingPostPass,
  unary,
} from "./1912-04871v4-risk-seeking-symreg";

function mul(a: number, b: number) {
  return binary({ kind: "op", name: "mul" }, leafConst(a), leafConst(b));
}

describe("risk-seeking symbolic regression post-pass", () => {
  it("counts nodes, trig depth, and input vars", () => {
    const e = binary(
      { kind: "op", name: "add" },
      leafVar(0),
      unary("sin", leafVar(1)),
    );
    expect(countNodes(e)).toBe(4);
    expect(nestedTrigDepth(e)).toBe(1);
    expect([...distinctInputVars(e)].sort()).toEqual([0, 1]);
  });

  it("constraint mask forbids >15 nodes, nested trig >=2, single-input", () => {
    const nested = unary("sin", unary("cos", leafVar(0)));
    expect(passesConstraintMask(nested)).toBe(false); // single-input anyway
    const nested2 = unary(
      "sin",
      binary({ kind: "op", name: "add" }, unary("cos", leafVar(0)), leafVar(1)),
    );
    expect(nestedTrigDepth(nested2)).toBe(2);
    expect(passesConstraintMask(nested2)).toBe(false);
    const single = binary(
      { kind: "op", name: "add" },
      leafVar(0),
      leafConst(1),
    );
    expect(passesConstraintMask(single)).toBe(false);
    // Two vars, small, no trig -> passes.
    const ok = binary(
      { kind: "op", name: "add" },
      leafVar(0),
      binary({ kind: "op", name: "mul" }, leafVar(1), leafConst(2)),
    );
    expect(passesConstraintMask(ok)).toBe(true);
  });

  it("mask forbids a >15-node expression", () => {
    let e = binary(
      { kind: "op", name: "add" },
      leafVar(0),
      leafVar(1),
    );
    for (let i = 0; i < 10; i++) {
      e = binary({ kind: "op", name: "add" }, e, leafVar(0));
    }
    expect(countNodes(e)).toBeGreaterThan(15);
    expect(passesConstraintMask(e)).toBe(false);
  });

  it("risk-seeking baseline is the top-epsilon quantile, not the mean", () => {
    const rewards = [0.1, 0.2, 0.3, 0.4, 0.9];
    // epsilon=0.2 -> idx floor(0.8*5)=4 -> 0.9 (max, top quintile).
    expect(riskSeekingBaseline(rewards, 0.2)).toBe(0.9);
    // epsilon=0.5 -> idx floor(0.5*5)=2 -> 0.3.
    expect(riskSeekingBaseline(rewards, 0.5)).toBe(0.3);
  });

  it("risk-seeking advantages are zero below the quantile baseline", () => {
    const progs: Program[] = [
      { expr: leafVar(0), logProb: -1, reward: 0.2 },
      { expr: leafVar(1), logProb: -1, reward: 0.5 },
      { expr: leafVar(2), logProb: -1, reward: 0.9 },
    ];
    const adv = riskSeekingAdvantages(progs, 0.5); // baseline = 0.5
    expect(adv[0]).toBe(0);
    expect(adv[1]).toBe(0);
    expect(adv[2]).toBeGreaterThan(0);
  });

  it("predictiveR is ~1 for the exact generating expression", () => {
    const xs: number[][] = [[0.5, 0.2], [1, 2], [-1, 0.5], [2, -1]];
    const ys = xs.map(([a, b]) => 3 * a! + 2 * b!);
    const e = binary(
      { kind: "op", name: "add" },
      binary({ kind: "op", name: "mul" }, leafVar(0), leafConst(3)),
      binary({ kind: "op", name: "mul" }, leafVar(1), leafConst(2)),
    );
    expect(predictiveR(e, xs, ys)).toBeGreaterThan(0.999);
  });

  it("evaluate handles unary and division safely", () => {
    expect(evaluate(unary("sin", leafConst(0)), [])).toBeCloseTo(0, 9);
    expect(evaluate(binary({ kind: "op", name: "div" }, leafConst(1), leafConst(0)), [])).toBe(1);
    expect(evaluate(mul(2, 3), [])).toBe(6);
  });

  it("post-pass never returns a mask-violating best and improves or not", () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const xs: number[][] = [];
    for (let i = 0; i < 30; i++) xs.push([rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1]);
    const ys = xs.map(([a, b]) => a! + b!);
    const hof: Program[] = [
      {
        expr: binary(
          { kind: "op", name: "add" },
          leafVar(0),
          binary({ kind: "op", name: "mul" }, leafVar(1), leafConst(0.5)),
        ),
        logProb: -2,
        reward: 0.5,
      },
    ];
    const { best, gateMarginReached } = riskSeekingPostPass(hof, xs, ys, 40, rng);
    expect(passesConstraintMask(best.expr)).toBe(true);
    expect(best.reward).toBeGreaterThanOrEqual(hof[0]!.reward);
    expect(gateMarginReached).toBe(best.reward - 0.5 >= 0.03);
  });

  it("mutate keeps expressions evaluable and bounded", () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const e = binary(
      { kind: "op", name: "add" },
      leafVar(0),
      leafVar(1),
    );
    for (let i = 0; i < 50; i++) {
      const m = mutate(e, rng);
      expect(Number.isFinite(evaluate(m, [0.5, -0.2, 1]))).toBe(true);
      expect(countNodes(m)).toBeLessThan(60);
    }
  });

  it("passesGate requires >=0.03 r margin and <=15 nodes", () => {
    expect(passesGate(0.8, 0.75, 10)).toBe(true);
    expect(passesGate(0.77, 0.75, 10)).toBe(false);
    expect(passesGate(0.9, 0.75, 16)).toBe(false);
  });
});
