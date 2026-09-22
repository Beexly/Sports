import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  retrieveTopK,
  deterministicVerify,
  findCoverageGaps,
  isDuplicateTask,
  shouldGiveUp,
  formatSkillsForPrompt,
  type SkillEntry,
} from "./signal-skill-library.js";

// ============================================================
// arXiv 2305.16291v2 — signal skill library. Additive invention.
// ============================================================

const mk = (skillId: string, lane: string, embedding: number[]): SkillEntry => ({
  skillId,
  description: `${skillId} description`,
  embedding,
  code: "backtest()",
  holdoutDeltaBrier: 0.003,
  journal: `${skillId} journal`,
  lane,
  dependencies: [],
});

describe("signal skill library — 2305.16291v2", () => {
  it("cosineSimilarity is 1 for identical embeddings", () => {
    expect(cosineSimilarity([1, 2], [1, 2])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("retrieveTopK returns the 5 most similar", () => {
    const lib = [
      mk("s1", "weather", [1, 0]),
      mk("s2", "weather", [0, 1]),
      mk("s3", "injuries", [0.9, 0.1]),
    ];
    const top = retrieveTopK(lib, [1, 0], 5);
    expect(top.length).toBe(3);
    expect(top[0]!.skillId).toBe("s1");
    expect(top[1]!.skillId).toBe("s3");
  });

  it("deterministicVerify enforces the 0.002 gate", () => {
    expect(deterministicVerify(0.002)).toBe(true);
    expect(deterministicVerify(0.0019)).toBe(false);
  });

  it("findCoverageGaps lists lanes with no nodes", () => {
    const lib = [mk("s1", "weather", [1, 0])];
    expect(findCoverageGaps(lib, ["weather", "special-teams", "referee-crews"])).toEqual([
      "special-teams",
      "referee-crews",
    ]);
    expect(findCoverageGaps([], ["weather"])).toEqual(["weather"]);
  });

  it("isDuplicateTask flags near-identical proposals", () => {
    const lib = [mk("s1", "weather", [1, 0])];
    expect(isDuplicateTask(lib, [1, 0])).toBe(true);
    expect(isDuplicateTask(lib, [0, 1])).toBe(false);
  });

  it("shouldGiveUp after 4 stuck rounds", () => {
    expect(shouldGiveUp(3)).toBe(false);
    expect(shouldGiveUp(4)).toBe(true);
  });

  it("formatSkillsForPrompt renders skill cards", () => {
    const out = formatSkillsForPrompt([mk("s1", "weather", [1, 0])]);
    expect(out).toContain("[s1]");
    expect(out).toContain("s1 journal");
    expect(out).not.toContain("backtest()");
  });
});
