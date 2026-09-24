/**
 * Tests for ./playoff-sensitivity-diagnostic (arXiv:1604.05090v1, lane=experimental).
 *
 * ACCEPTANCE GATE: ADAPT gate (narrow): (a) Test 2 must confirm the alpha_ij coefficients predict simulated
 * perturbation effects (linearity holds at epsilon ~ 0.03); (b) Test 3 or analyst judgment must
 * show the sensitivity ranking changes at least some futures sizing decisions vs the status quo.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./playoff-sensitivity-diagnostic";

describe("playoff sensitivity diagnostic (arXiv:1604.05090v1)", () => {
  const pWin = new Map([
    ["KC", new Map([["BUF", 0.6], ["BAL", 0.7]])],
    ["BUF", new Map([["BAL", 0.55]])],
  ]);
  const path = [{ i: "KC", j: "BUF" }, { i: "KC", j: "BAL" }];
  it("alpha = P/P_ij on path pairs", () => {
    const alphas = mod.alphaCoefficients(0.42, path, pWin)!;
    expect(alphas[0]!.alpha).toBeCloseTo(0.42 / 0.6, 10);
    expect(alphas[1]!.alpha).toBeCloseTo(0.42 / 0.7, 10);
  });
  it("worst-case drop scales with epsilon", () => {
    const alphas = mod.alphaCoefficients(0.42, path, pWin)!;
    const drop = mod.worstCaseDrop(alphas, 0.03)!;
    expect(drop).toBeCloseTo((0.42 / 0.6 + 0.42 / 0.7) * 0.03, 10);
    expect(mod.worstCaseDrop(alphas, 0)).toBe(0);
  });
  it("topKPairs ranks by |alpha|", () => {
    const alphas = mod.alphaCoefficients(0.42, path, pWin)!;
    const top = mod.topKPairs(alphas, 1);
    expect(top[0]!.i).toBe("KC");
    expect(top[0]!.j).toBe("BUF");
  });
  it("null on missing pair probability", () => {
    expect(mod.alphaCoefficients(0.42, [{ i: "KC", j: "XXX" }], pWin)).toBeNull();
    expect(mod.alphaCoefficients(2, path, pWin)).toBeNull();
    expect(mod.worstCaseDrop([{ i: "a", j: "b", alpha: NaN }], 0.03)).toBeNull();
  });
});
