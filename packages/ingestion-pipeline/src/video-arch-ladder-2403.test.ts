import { describe, expect, it } from "vitest";
import { regimeReproduces, ladderVerdict } from "./video-arch-ladder-2403.js";

describe("video arch ladder", () => {
  it("passes when the reproduced ranking matches within 3pp", () => {
    const r = regimeReproduces("few_shot_10", { "ST-GCN": 0.7 },
      [
        { architecture: "ST-GCN", regime: "few_shot_10", top1: 0.69, playerDisjoint: true, runId: "r1" },
        { architecture: "PoseC3D", regime: "few_shot_10", top1: 0.68, playerDisjoint: true, runId: "r1" },
      ]);
    expect(r.ok).toBe(true);
  });
  it("fails when a paper-top architecture is missing", () => {
    const r = regimeReproduces("full_data", { SlowFast: 0.8 },
      [{ architecture: "Swin", regime: "full_data", top1: 0.8, playerDisjoint: true, runId: "r1" }]);
    expect(r.ok).toBe(false);
  });
  it("ladder verdict requires every regime", () => {
    const paper = {
      few_shot_10: { "ST-GCN": 0.7 }, few_shot_50: { "ST-GCN": 0.72 }, full_data: { SlowFast: 0.85 },
    };
    const good = [
      { architecture: "ST-GCN", regime: "few_shot_10" as const, top1: 0.7, playerDisjoint: true, runId: "a" },
      { architecture: "PoseC3D", regime: "few_shot_10" as const, top1: 0.69, playerDisjoint: true, runId: "a" },
      { architecture: "ST-GCN", regime: "few_shot_50" as const, top1: 0.72, playerDisjoint: true, runId: "a" },
      { architecture: "PoseC3D", regime: "few_shot_50" as const, top1: 0.71, playerDisjoint: true, runId: "a" },
      { architecture: "SlowFast", regime: "full_data" as const, top1: 0.85, playerDisjoint: true, runId: "a" },
      { architecture: "Swin", regime: "full_data" as const, top1: 0.84, playerDisjoint: true, runId: "a" },
    ];
    const v = ladderVerdict(paper, good);
    expect(v.adopted).toBe(true);
    expect(v.regimes.full_data).toBe(true);
    expect(ladderVerdict(paper, []).adopted).toBe(false);
  });
  it("handles empty input", () => {
    // no reproductions at all: every expected architecture is missing
    const r = regimeReproduces("full_data", {}, []);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("missing");
  });
});

