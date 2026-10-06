/**
 * Tests for ./goal-summarization-bench (arXiv:2207.08635, lane=nlp).
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): first and only English sports-summarization dataset + four benchmark settings
 * defined + public release; as a benchmark and transfer testbed it is solid ADAPT material. NFL-
 * port gate: adapted pipeline beats LED's 24.3 ROUGE-L on the GOAL test set.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./goal-summarization-bench";

describe("GOAL summarization bench (arXiv:2207.08635)", () => {
  it("rouge1 identical = 1", () => {
    expect(mod.rouge1Lite("the chiefs won", "the chiefs won")).toBeCloseTo(1, 10);
    expect(mod.rouge1Lite("chiefs won", "the chiefs won")!).toBeLessThan(1);
    expect(mod.rouge1Lite("", "x")).toBeNull();
  });
  it("rouge2", () => {
    expect(mod.rouge2Lite("a b c", "a b c")).toBeCloseTo(1, 10);
    expect(mod.rouge2Lite("a b", "c d")).toBe(0);
    expect(mod.rouge2Lite("a", "a")).toBeNull();
  });
  it("factuality", () => {
    const s = { gameId: "g", summary: "s", reference: "Mahomes threw 3 touchdowns in the win", facts: ["3 touchdowns", "overtime"] };
    expect(mod.factuality(s)).toBeCloseTo(0.5, 10);
    expect(mod.factuality({ ...s, facts: [] })).toBeNull();
    expect(mod.factuality(null)).toBeNull();
  });
  it("isGameSummary rejects malformed", () => {
    expect(mod.isGameSummary({ gameId: "g" })).toBe(false);
  });
});
