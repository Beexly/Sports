import { describe, expect, it, vi } from "vitest";
import {
  runShadowPair,
  runShadowSlate,
  summarizeShadowSlate,
} from "./film-shadow-harness.js";

describe("runShadowPair", () => {
  it("runs the engine twice and logs both arms with weight 0", () => {
    const runEngine = vi.fn((x: { v: number }) => x.v);
    const row = runShadowPair({
      slateId: "s1",
      lane: "props",
      subjectId: "KC-WR1",
      market: "anytime_td",
      line: null,
      controlInputs: { v: 0.2 },
      treatmentInputs: { v: 0.35 },
      runEngine,
      filmPrior: 0.3,
      actual: 1,
    });
    // the engine genuinely ran twice — once per arm
    expect(runEngine).toHaveBeenCalledTimes(2);
    expect(runEngine).toHaveBeenNthCalledWith(1, { v: 0.2 });
    expect(runEngine).toHaveBeenNthCalledWith(2, { v: 0.35 });
    expect(row.controlProb).toBeCloseTo(0.2, 4);
    expect(row.treatmentProb).toBeCloseTo(0.35, 4);
    expect(row.weight).toBe(0);
    // published number is ALWAYS the control arm at w=0
    expect(row.blendedProb).toBeCloseTo(0.2, 4);
    expect(row.delta).toBe(0);
    // research signal preserved: what film WOULD have done at w=1
    expect(row.wouldBeDeltaW1).toBeCloseTo(0.15, 4);
    expect(row.filmPrior).toBe(0.3);
    expect(row.actual).toBe(1);
    expect(row.controlCorrect).toBe(0); // 0.2 < 0.5 but actual=1
    expect(row.calibration).toBe("UNCALIBRATED");
  });

  it("rejects non-finite engine output", () => {
    expect(() =>
      runShadowPair({
        slateId: "s1",
        lane: "props",
        subjectId: "KC-WR1",
        market: "anytime_td",
        line: null,
        controlInputs: {},
        treatmentInputs: {},
        runEngine: () => NaN,
        filmPrior: null,
      }),
    ).toThrow(/non-finite/);
  });

  it("leaves actual null until graded", () => {
    const row = runShadowPair({
      slateId: "s1",
      lane: "props",
      subjectId: "KC-WR1",
      market: "anytime_td",
      line: null,
      controlInputs: { v: 0.6 },
      treatmentInputs: { v: 0.6 },
      runEngine: (x: { v: number }) => x.v,
      filmPrior: null,
    });
    expect(row.actual).toBeNull();
    expect(row.controlCorrect).toBeNull();
  });
});

describe("runShadowSlate + summarizeShadowSlate", () => {
  it("scores a slate and summarizes the research signal", () => {
    const mk = (id: string, c: number, t: number, actual: number) => ({
      slateId: "s1",
      lane: "props" as const,
      subjectId: id,
      market: "anytime_td",
      line: null,
      controlInputs: { v: c },
      treatmentInputs: { v: t },
      runEngine: (x: { v: number }) => x.v,
      filmPrior: t,
      actual,
    });
    const rows = runShadowSlate([
      mk("a", 0.2, 0.8, 1), // film would have helped
      mk("b", 0.7, 0.2, 1), // control right, film wrong
      mk("c", 0.6, 0.65, 1), // both right
    ]);
    expect(rows).toHaveLength(3);
    const summary = summarizeShadowSlate("s1", rows);
    expect(summary.n).toBe(3);
    expect(summary.nGraded).toBe(3);
    expect(summary.controlAccuracy).toBeCloseTo(2 / 3, 4);
    expect(summary.filmWouldHaveHelped).toBeCloseTo(1 / 3, 4);
    expect(summary.meanAbsWouldBeDeltaW1).toBeGreaterThan(0);
  });
});
