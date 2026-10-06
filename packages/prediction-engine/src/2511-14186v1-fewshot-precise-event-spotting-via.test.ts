/**
 * Vitest suite for arXiv:2511.14186v1 (Few-Shot Precise Event Spotting via Unified Multi-Entity Graph and Distillation).
 * Gate: Adopt the UMEG-Net spotter as GSE's broadcast event-spotter only if on held-out NFL games it beats E2E-Spot trained on the same 100 clips by >=3pp F1evt AND achieves Edit score >=50.
 */
import { describe, it, expect } from "vitest";
import { buildEntityGraph, cosineSim, prototypeScore, f1Event, editScore, ENABLED } from "./2511-14186v1-fewshot-precise-event-spotting-via";

describe("2511-14186v1 few-shot event spotting (disabled)", () => {
  it("builds the 22-player + ball + landmarks graph", () => {
    const g = buildEntityGraph(22, 6);
    expect(g.nodes).toBe(29);
    expect(g.playerBallEdges).toBe(22);
    expect(() => buildEntityGraph(0, 6)).toThrow();
  });
  it("prototype scoring picks the nearest class", () => {
    const protos = new Map([
      ["snap", [1, 0]],
      ["tackle", [0, 1]],
    ]);
    expect(prototypeScore([0.9, 0.1], protos)).toBe("snap");
    expect(() => prototypeScore([1, 0], new Map())).toThrow();
  });
  it("F1evt tolerates near misses; edit score is 1 for identical", () => {
    const pred = [{ frame: 100, cls: "snap" }, { frame: 200, cls: "tackle" }];
    const truth = [{ frame: 102, cls: "snap" }, { frame: 250, cls: "tackle" }];
    expect(f1Event(pred, truth, 5)).toBeCloseTo(0.5, 10);
    expect(f1Event(pred, truth, 60)).toBeCloseTo(1, 10);
    expect(editScore(["snap", "tackle"], ["snap", "tackle"])).toBe(1);
    expect(editScore(["snap"], ["tackle"])).toBe(0);
    expect(() => f1Event(pred, truth, -1)).toThrow();
  });
  it("is disabled pending the trained spotter and labeled clips", () => {
    expect(ENABLED).toBe(false);
  });
});
