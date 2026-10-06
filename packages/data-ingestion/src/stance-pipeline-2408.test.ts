import { describe, expect, it } from "vitest";
import { retrieveFewShot, buildStancePrompt, perClassF1 } from "./stance-pipeline-2408.js";

const bank = [
  { id: "a", text: "QB out", topic: "injury", stance: "supports" as const, embedding: [1, 0] },
  { id: "b", text: "QB fine", topic: "injury", stance: "refutes" as const, embedding: [0, 1] },
  { id: "c", text: "QB maybe", topic: "injury", stance: "neutral" as const, embedding: [0.7, 0.7] },
  { id: "d", text: "trade soon", topic: "trade", stance: "supports" as const, embedding: [-1, 0] },
];

describe("stance pipeline", () => {
  it("retrieves the 3 most similar labeled tweets", () => {
    const ex = retrieveFewShot({ id: "t", text: "x", embedding: [1, 0.1] }, bank, 3);
    expect(ex).toHaveLength(3);
    expect(ex[0]?.id).toBe("a");
  });
  it("assembles the prompt with examples + target", () => {
    const p = buildStancePrompt({ id: "t", text: "target text", embedding: [1, 0] }, "injury", bank.slice(0, 2));
    expect(p.examples).toHaveLength(2);
    expect(p.target).toBe("target text");
    expect(p.topic).toBe("injury");
  });
  it("computes per-class F1", () => {
    const f1 = perClassF1(
      ["supports", "supports", "refutes"],
      ["supports", "refutes", "refutes"],
      "supports",
    );
    expect(f1).toBeCloseTo(2 / 3, 10);
    expect(perClassF1([], [], "supports")).toBe(0);
  });
  it("handles empty input", () => {
    const tweet = { id: "t", text: "x", embedding: [1, 0] };
    expect(retrieveFewShot(tweet, [], 3)).toEqual([]);
    const p = buildStancePrompt(tweet, "injury", []);
    expect(p.examples).toEqual([]);
    expect(p.target).toBe("x");
  });
  it("handles edge inputs", () => {
    // zero-vector embeddings score 0 similarity without NaN
    const zero = { id: "z", text: "z", embedding: [0, 0] };
    const bank = [{ id: "a", text: "a", topic: "t", stance: "supports" as const, embedding: [1, 1] }];
    expect(retrieveFewShot(zero, bank, 5)).toHaveLength(1);
    // k larger than the bank returns the whole bank
    const tweet = { id: "t", text: "x", embedding: [1, 0] };
    expect(retrieveFewShot(tweet, bank, 10)).toHaveLength(1);
  });
});

