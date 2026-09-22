import { describe, expect, it } from "vitest";
import { videoModelGatePasses, rankVideoModels } from "./video-model-gate-2410.js";

describe("video model gate", () => {
  it("passes a model clearing both bars with direct-answer training", () => {
    const r = videoModelGatePasses({ model: "m", mcqAccuracy: 0.7, gEval: 2.8, directAnswerTrained: true });
    expect(r.pass).toBe(true);
    expect(r.reasons).toEqual([]);
  });
  it("fails on any single miss", () => {
    expect(videoModelGatePasses({ model: "m", mcqAccuracy: 0.6, gEval: 2.8, directAnswerTrained: true }).pass).toBe(false);
    expect(videoModelGatePasses({ model: "m", mcqAccuracy: 0.7, gEval: 2.0, directAnswerTrained: true }).pass).toBe(false);
    expect(videoModelGatePasses({ model: "m", mcqAccuracy: 0.7, gEval: 2.8, directAnswerTrained: false }).pass).toBe(false);
  });
  it("ranks by MCQ then G-Eval", () => {
    const ranked = rankVideoModels([
      { model: "b", mcqAccuracy: 0.7, gEval: 2.6, directAnswerTrained: true },
      { model: "a", mcqAccuracy: 0.7, gEval: 3.0, directAnswerTrained: true },
    ]);
    expect(ranked[0]?.model).toBe("a");
  });
});

