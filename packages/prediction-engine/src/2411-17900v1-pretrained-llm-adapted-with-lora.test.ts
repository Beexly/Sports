/**
 * Vitest suite for arXiv:2411.17900v1 (Pretrained LLM Adapted with LoRA as a Decision Transformer for Offline RL in Quantitative Trading).
 * Gate: ADOPT iff on 2024 (a) beats (b) by ≥1pp ROI (transfer works in this domain) AND (a) beats fractional-Kelly by ≥2pp with drawdown no worse; if (a)≈(b), REJECT the pretraining complexity and use the from-scratch DT.
 */
import { describe, it, expect } from "vitest";
import { encodeTrajectory, returnsToGo, ENABLED } from "./2411-17900v1-pretrained-llm-adapted-with-lora";

describe("2411-17900v1 decision-transformer trajectory (disabled)", () => {
  it("encodes return-to-go + state + action tokens", () => {
    const steps = [
      { state: [100, 0.05], action: [0.02], returnToGo: 3 },
      { state: [102, 0.03], action: [0.01], returnToGo: 1 },
    ];
    const toks = encodeTrajectory(steps);
    expect(toks[0]).toEqual([3, 100, 0.05, 0.02]);
    expect(returnsToGo([1, -1, 2])).toEqual([2, 1, 2]);
    expect(() => encodeTrajectory([])).toThrow();
  });
  it("is disabled pending the pretrained backbone", () => {
    expect(ENABLED).toBe(false);
  });
});
