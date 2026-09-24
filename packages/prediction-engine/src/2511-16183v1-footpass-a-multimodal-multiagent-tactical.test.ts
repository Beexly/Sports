/**
 * Vitest suite for arXiv:2511.16183v1 (FOOTPASS: A Multi-Modal Multi-Agent Tactical Context Dataset for Play-by-Play Action Spotting in Soccer Broadcast Videos).
 * Gate: Adopt the two-stage pipeline for the clip workflow only if on the 10-game test set the denoised pipeline achieves >=80% recall at >=60% precision on highlight plays AND beats the detector-alone baseline by >=20pp precision at matched recall.
 */
import { describe, it, expect } from "vitest";
import { discretize, transferEntropy } from "./2511-16183v1-footpass-a-multimodal-multiagent-tactical";

describe("2511-16183v1 transfer entropy", () => {
  it("detects the causal direction in a driven series", () => {
    // y[t+1] = x[t] (binned), x is noise
    const x: number[] = [];
    const y: number[] = [0];
    for (let t = 0; t < 200; t++) {
      const xv = (t * 37) % 10 / 10;
      x.push(xv);
      y.push(xv);
    }
    const teXY = transferEntropy(x, y.slice(0, 200), 5);
    const teYX = transferEntropy(y.slice(0, 200), x, 5);
    expect(teXY).toBeGreaterThan(teYX);
    expect(teXY).toBeGreaterThan(0.3);
  });
  it("rejects bad input", () => {
    expect(() => transferEntropy([1, 2], [1, 2])).toThrow();
    expect(() => discretize([1], 1)).toThrow();
  });
});
