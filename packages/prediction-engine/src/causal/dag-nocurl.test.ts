/**
 * DAG-NoCurl Hodge projection — tests (arXiv 2106.07197v1).
 *
 * ACCEPTANCE GATE: the projection of a cyclic weight matrix is acyclic;
 * a clean chain is recovered with low SHD; potentials respect the
 * flow direction; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  hodgePotentials,
  isAcyclic,
  nocurlProject,
  shd,
} from "./dag-nocurl";

describe("hodgePotentials", () => {
  it("ranks nodes along the net flow direction", () => {
    // Chain 0 -> 1 -> 2 with an extra weak backward edge 2 -> 0.
    const A = [
      [0, 0.9, -0.1],
      [-0.9, 0, 0.8],
      [0.1, -0.8, 0],
    ];
    const p = hodgePotentials(A);
    expect(p[0]).toBe(0);
    expect(p[1]).toBeGreaterThan(p[0] as number);
    expect(p[2]).toBeGreaterThan(p[1] as number);
    expect(() => hodgePotentials([])).toThrow();
    expect(() =>
      hodgePotentials([
        [0, 1],
        [0, 1, 2],
      ]),
    ).toThrow();
  });
});

describe("nocurlProject", () => {
  it("projects a cyclic matrix to an acyclic one", () => {
    const W = [
      [0, 0.9, 0.0],
      [0.0, 0, 0.8],
      [0.3, 0.0, 0], // cycle-closing edge 2 -> 0
    ];
    expect(isAcyclic(W)).toBe(false);
    const D = nocurlProject(W, 0.1);
    expect(isAcyclic(D)).toBe(true);
    // The forward chain survives; the backward edge is cut.
    expect((D[0] as number[])[1]).toBeCloseTo(0.9, 12);
    expect((D[1] as number[])[2]).toBeCloseTo(0.8, 12);
    expect((D[2] as number[])[0]).toBe(0);
  });

  it("thresholds small surviving weights", () => {
    const W = [
      [0, 0.9, 0.05],
      [0, 0, 0.8],
      [0, 0, 0],
    ];
    const D = nocurlProject(W, 0.1);
    expect((D[0] as number[])[2]).toBe(0);
    expect((D[0] as number[])[1]).toBeCloseTo(0.9, 12);
  });

  it("recovers a clean chain with zero SHD", () => {
    const truth = [
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ];
    const D = nocurlProject(truth, 0.5);
    expect(shd(D, truth)).toBe(0);
    expect(() => nocurlProject([], 0.1)).toThrow();
  });
});

describe("isAcyclic + shd", () => {
  it("detects cycles and counts structural differences", () => {
    const dag = [
      [0, 1],
      [0, 0],
    ];
    const cyc = [
      [0, 1],
      [1, 0],
    ];
    expect(isAcyclic(dag)).toBe(true);
    expect(isAcyclic(cyc)).toBe(false);
    expect(shd(dag, dag)).toBe(0);
    expect(shd(dag, cyc)).toBe(1);
    expect(() => shd(dag, [[0]])).toThrow();
  });
});
