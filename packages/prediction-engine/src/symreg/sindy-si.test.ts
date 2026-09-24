
import { describe, expect, it } from "vitest";
import { dropIntercept, stlsq, verifySideInfo } from "./sindy-si";

describe("sindy-si", () => {
  it("recovers a sparse linear law and kills noise terms", () => {
    // dX = 2*x0 - 0.5*x1 ; library [1, x0, x1, x0^2]
    const Theta: number[][] = [];
    const dX: number[] = [];
    for (let t = 0; t < 40; t++) {
      const x0 = Math.sin(t * 0.3);
      const x1 = Math.cos(t * 0.2);
      Theta.push([1, x0, x1, x0 * x0]);
      dX.push(2 * x0 - 0.5 * x1);
    }
    const xi = stlsq(Theta, dX, 0.1);
    expect(Math.abs((xi[1] ?? 0) - 2)).toBeLessThan(0.05);
    expect(Math.abs((xi[2] ?? 0) + 0.5)).toBeLessThan(0.05);
    expect(xi[0]).toBe(0);
    expect(xi[3]).toBe(0);
  });
  it("verifySideInfo checks boundedness/equilibrium/monotonicity", () => {
    const grid = [[0, 0], [0.5, 1], [-0.3, 2]];
    const rep = verifySideInfo(
      (x) => 1 / (1 + Math.exp(-(x[0] ?? 0))),
      () => 0.2,
      grid,
    );
    expect(rep).toEqual({ bounded: true, equilibrium: false, monotone: true });
    const rep2 = verifySideInfo(() => 0, () => -1, grid);
    expect(rep2.monotone).toBe(false);
  });
  it("dropIntercept zeroes the constant term", () => {
    expect(dropIntercept([3, 1, 2])).toEqual([0, 1, 2]);
  });
  it("empty library returns zeros", () => {
    expect(stlsq([], [], 0.1)).toEqual([]);
  });
});
