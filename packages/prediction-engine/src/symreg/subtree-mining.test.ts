/**
 * Subtree mining — tests (arXiv 2305.14656v1).
 *
 * ACCEPTANCE GATE: the miner finds the planted frequent motif with the
 * right support; canonical hashing is order-sensitive; the name
 * proposer suggests sensible names; the compression check passes at
 * >= 20% shorter; the island bandit kills trailing islands;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  allocateIslands,
  compressionCheck,
  enumerateSubtrees,
  mineMotifs,
  proposeName,
  subtreeHash,
  type SrNode,
} from "./subtree-mining";

const op = (o: string, ...children: SrNode[]): SrNode => ({ kind: "op", op: o, children });
const v = (name: string): SrNode => ({ kind: "var", name });

// Planted motif: x / (1 + x) — the saturating ratio.
const motif = op("div", v("x"), op("add", { kind: "const", value: 1 }, v("x")));

function makeProgram(withMotif: boolean, seed: number): SrNode {
  const body = withMotif
    ? op("add", motif, op("mul", v("y"), { kind: "const", value: seed }))
    : op("add", op("mul", v("y"), v("z")), { kind: "const", value: seed });
  return op("sub", body, v("w"));
}

describe("subtreeHash + enumerateSubtrees", () => {
  it("hashes canonically and order-sensitively", () => {
    expect(subtreeHash(v("x"))).toBe("v:x");
    expect(subtreeHash({ kind: "const", value: 3 })).toBe("c");
    expect(subtreeHash(op("add", v("x"), v("y")))).toBe("add(v:x,v:y)");
    expect(subtreeHash(op("add", v("y"), v("x")))).not.toBe(subtreeHash(op("add", v("x"), v("y"))));
    const subs = enumerateSubtrees(makeProgram(true, 1), 2);
    expect(subs.length).toBeGreaterThan(3);
    // minSize filters single nodes.
    expect(enumerateSubtrees(v("x"), 2)).toEqual([]);
  });
});

describe("mineMotifs", () => {
  it("finds the planted frequent motif", () => {
    const programs = Array.from({ length: 20 }, (_, i) => makeProgram(i < 12, i));
    const motifs = mineMotifs(programs, 10, 3);
    expect(motifs.length).toBeGreaterThan(0);
    const top = motifs[0] as { support: number; proposedName: string; hash: string };
    expect(top.support).toBeGreaterThanOrEqual(10);
    // The planted motif appears in exactly the 12 motif programs.
    const planted = motifs.find((m) => m.hash === subtreeHash(motif));
    expect(planted?.support).toBe(12);
    expect(planted?.proposedName).toBe("saturating-ratio");
    expect(() => mineMotifs([], 10)).toThrow();
    expect(() => mineMotifs(programs, 0)).toThrow();
  });

  it("proposes sensible names", () => {
    expect(proposeName(op("exp", v("x")), "h")).toBe("softplus-like");
    expect(proposeName(op("mul", v("x"), op("sub", v("y"), v("z"))), "h")).toBe("interaction-decay");
  });
});

describe("compressionCheck", () => {
  it("passes at >= 20% shorter median expressions", () => {
    const ok = compressionCheck([20, 22, 24], [14, 15, 16]);
    expect(ok.medianBaseline).toBe(22);
    expect(ok.medianExtended).toBe(15);
    expect(ok.compression).toBeCloseTo(7 / 22, 12);
    expect(ok.pass).toBe(true);
    const bad = compressionCheck([20, 22, 24], [19, 20, 21]);
    expect(bad.pass).toBe(false);
    expect(() => compressionCheck([], [1])).toThrow();
  });
});

describe("allocateIslands", () => {
  it("kills islands whose upper quantile trails", () => {
    const islands = [
      { id: "a", scores: [0.8, 0.85, 0.9] },
      { id: "b", scores: [0.78, 0.82, 0.88] },
      { id: "c", scores: [0.4, 0.45, 0.5] },
    ];
    const { survivors, killed } = allocateIslands(islands, 0.75, 0.1);
    expect(survivors).toContain("a");
    expect(survivors).toContain("b");
    expect(killed).toEqual(["c"]);
    expect(() => allocateIslands([])).toThrow();
  });
});
