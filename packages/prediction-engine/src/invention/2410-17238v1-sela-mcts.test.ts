import { describe, expect, it } from "vitest";
import {
  HypothesisNode,
  MCTSConfig,
  makeRootNode,
  meanValue,
  passesSelaGate,
  rollout,
  runMCTSSearch,
  runRoundRobin,
  spearman,
  ucbScore,
  valueEstimateVsTruth,
  wastedRolloutRate,
  wideningLimit,
} from "./2410-17238v1-sela-mcts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const FAMILIES = ["matchup", "weather", "rest", "market", "special-teams"];

// Thin-lane scenario: the best hypotheses live in the thin family.
function thinLaneCandidates(): Map<string, HypothesisNode[]> {
  const map = new Map<string, HypothesisNode[]>();
  for (const f of FAMILIES) {
    const hyps: HypothesisNode[] = [];
    for (let i = 0; i < 6; i++) {
      const q = f === "special-teams" ? 0.75 - i * 0.02 : 0.45 - i * 0.02;
      hyps.push({
        id: `${f}-h${i}`,
        family: f,
        hypothesis: `${f} hypothesis ${i}`,
        trueQuality: q,
      });
    }
    map.set(f, hyps);
  }
  return map;
}

const CONFIG: MCTSConfig = {
  exploration: Math.SQRT2,
  wideningC: 1.5,
  wideningAlpha: 0.5,
  budget: 60,
};

describe("SELA hierarchical MCTS", () => {
  it("root starts with one child per signal family", () => {
    const root = makeRootNode(FAMILIES);
    expect(root.children.map((c) => c.family)).toEqual(FAMILIES);
    expect(root.visits).toBe(0);
  });

  it("unvisited nodes have infinite UCB (optimism in face of uncertainty)", () => {
    const root = makeRootNode(FAMILIES);
    expect(ucbScore(root.children[0]!, 0)).toBe(Infinity);
  });

  it("progressive widening grows sublinearly with visits", () => {
    expect(wideningLimit(1)).toBeGreaterThanOrEqual(1);
    expect(wideningLimit(16)).toBeLessThan(wideningLimit(64));
    expect(wideningLimit(10000)).toBeLessThan(10000); // sublinear
  });

  it("single rollout expands, simulates, and backpropagates", () => {
    const root = makeRootNode(FAMILIES);
    const res = rollout(root, thinLaneCandidates(), CONFIG, 0.6, seededRng(5));
    expect(res).not.toBeNull();
    expect(root.visits).toBe(1);
    const expanded = root.children.find(
      (c) => c.id === `family:${res!.hypothesis.family}`,
    )!;
    expect(expanded.visits).toBe(1);
    expect(expanded.children.length).toBe(1);
    expect(expanded.children[0]!.rolledOut).toBe(true);
  });

  it("MCTS finds the thin-lane winners (special-teams family)", () => {
    const { root, gatePassers } = runMCTSSearch(
      FAMILIES,
      thinLaneCandidates(),
      CONFIG,
      0.6,
      seededRng(9),
    );
    expect(gatePassers.length).toBeGreaterThan(0);
    const st = root.children.find((c) => c.family === "special-teams")!;
    expect(st.children.length).toBeGreaterThan(0);
    expect(gatePassers.every((h) => h.family === "special-teams")).toBe(true);
    expect(meanValue(st)).toBeGreaterThan(0.5);
  });

  it("wastedRolloutRate counts non-gate rollouts only", () => {
    const { root } = runMCTSSearch(
      FAMILIES,
      thinLaneCandidates(),
      CONFIG,
      0.6,
      seededRng(9),
    );
    const waste = wastedRolloutRate(root);
    expect(waste).toBeGreaterThanOrEqual(0);
    expect(waste).toBeLessThanOrEqual(1);
  });

  it("tree value estimates correlate with true holdout quality (Spearman >= 0.5)", () => {
    const { root } = runMCTSSearch(
      FAMILIES,
      thinLaneCandidates(),
      { ...CONFIG, budget: 120 },
      0.6,
      seededRng(3),
    );
    const { estimates, truths } = valueEstimateVsTruth(root);
    expect(estimates.length).toBeGreaterThan(3);
    expect(spearman(estimates, truths)).toBeGreaterThanOrEqual(0.5);
  });

  it("spearman returns 1 for identical orderings and 0 for empty", () => {
    expect(spearman([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 9);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 9);
    expect(spearman([], [])).toBe(0);
  });

  it("round-robin baseline visits every family at equal budget", () => {
    const passers = runRoundRobin(
      FAMILIES,
      thinLaneCandidates(),
      60,
      0.6,
      seededRng(9),
    );
    // Thin-lane scenario: round-robin spreads thin, MCTS concentrates.
    const { gatePassers } = runMCTSSearch(
      FAMILIES,
      thinLaneCandidates(),
      CONFIG,
      0.6,
      seededRng(9),
    );
    expect(gatePassers.length).toBeGreaterThanOrEqual(passers.length);
  });

  it("passesSelaGate implements the 1.5x / -30% waste / rho>=0.5 rule", () => {
    expect(passesSelaGate(9, 6, 0.3, 0.5, 0.6)).toBe(true);
    expect(passesSelaGate(8, 6, 0.3, 0.5, 0.6)).toBe(false); // <1.5x
    expect(passesSelaGate(9, 6, 0.4, 0.5, 0.6)).toBe(false); // waste drop <30%
    expect(passesSelaGate(9, 6, 0.3, 0.5, 0.4)).toBe(false); // rho < 0.5
  });
});
