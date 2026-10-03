import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  retrieveSimilar,
  boundedInsert,
  consolidateReflections,
  permutationLeakCheck,
  trialsExhausted,
  type Reflection,
} from "./reflexion-harness.js";

// ============================================================
// arXiv 2303.11366v4 — Reflexion harness. Additive invention.
// ============================================================

const mk = (ideaId: string, trial: number, embedding: number[]): Reflection => ({
  ideaId,
  trial,
  lesson: `lesson-${ideaId}-${trial}`,
  embedding,
  diagnostics: "{}",
});

describe("reflexion harness — 2303.11366v4", () => {
  it("cosineSimilarity is 1 for identical, 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("retrieveSimilar returns top-k by similarity", () => {
    const mem = [mk("a", 1, [1, 0]), mk("a", 2, [0, 1]), mk("a", 3, [0.9, 0.1])];
    const top = retrieveSimilar(mem, [1, 0], 2);
    expect(top.length).toBe(2);
    expect(top[0]!.trial).toBe(1);
    expect(top[1]!.trial).toBe(3);
  });

  it("boundedInsert keeps Omega most recent per idea", () => {
    let mem: Reflection[] = [];
    for (let t = 1; t <= 5; t++) mem = boundedInsert(mem, mk("a", t, [t, 0]), 3);
    mem = boundedInsert(mem, mk("b", 1, [0, 1]), 3);
    const aTrials = mem.filter((r) => r.ideaId === "a").map((r) => r.trial);
    expect(aTrials).toEqual([3, 4, 5]);
    expect(mem.filter((r) => r.ideaId === "b").length).toBe(1);
  });

  it("consolidateReflections merges duplicates (Table-3 pathology)", () => {
    const mem = [
      mk("a", 1, [1, 0]),
      mk("a", 2, [1, 0.01]), // near-duplicate
      mk("a", 3, [0, 1]),
    ];
    const { doctrine, expired, duplicatesMerged } = consolidateReflections(mem);
    expect(duplicatesMerged).toBe(1);
    expect(expired.length).toBe(3);
    expect(doctrine.split("\n").length).toBe(2);
  });

  it("permutationLeakCheck flags persistent signals", () => {
    expect(permutationLeakCheck(0.05, 0.045).leaky).toBe(true); // 90% persists
    expect(permutationLeakCheck(0.05, 0.01).leaky).toBe(false);
    expect(permutationLeakCheck(0, 0).leaky).toBe(false);
  });

  it("trialsExhausted enforces the 12-trial budget", () => {
    expect(trialsExhausted(11)).toBe(false);
    expect(trialsExhausted(12)).toBe(true);
  });
});
