import { describe, expect, it } from "vitest";
import {
  baselineWpModel,
  replayGame,
  replayGameSeeded,
  stressTest,
  type WpEvent,
} from "./wp-event-replay.js";

function ev(over: Partial<WpEvent> = {}): WpEvent {
  return {
    t: 1000,
    eventId: "e1",
    type: "play",
    data: { homeScore: 0, awayScore: 0, secondsElapsed: 0 },
    ...over,
  };
}

describe("W6 replayGame", () => {
  it("streams { t, wp } after each event", () => {
    const events = [
      ev({ t: 1, data: { homeScore: 7, awayScore: 0, secondsElapsed: 300 } }),
      ev({ t: 2, eventId: "e2", data: { homeScore: 7, awayScore: 3, secondsElapsed: 600 } }),
      ev({ t: 3, eventId: "e3", data: { homeScore: 14, awayScore: 3, secondsElapsed: 1200 } }),
    ];
    const r = replayGame("g1", events, baselineWpModel);
    expect(r.gameId).toBe("g1");
    expect(r.points).toHaveLength(3);
    expect(r.invalidPoints).toBe(0);
    for (const p of r.points) {
      expect(p.wp).toBeGreaterThan(0);
      expect(p.wp).toBeLessThan(1);
    }
    expect(r.finalWp).not.toBeNull();
    // Home leads throughout — final WP should favor home
    expect(r.finalWp!).toBeGreaterThan(0.5);
  });

  it("tracks score state from event data", () => {
    const events = [
      ev({ t: 1, data: { homeScore: 3, awayScore: 0, secondsElapsed: 100 } }),
      ev({ t: 2, eventId: "e2", data: {} }), // no scores — carry forward
    ];
    const r = replayGame("g1", events, baselineWpModel);
    expect(r.points[1]!.homeScore).toBe(3);
    expect(r.points[1]!.awayScore).toBe(0);
  });

  it("counts invalid model outputs as invalidPoints", () => {
    const events = [ev(), ev({ t: 2, eventId: "e2" })];
    const r = replayGame("g1", events, () => null);
    expect(r.invalidPoints).toBe(2);
    expect(r.finalWp).toBeNull();

    const r2 = replayGame("g1", events, () => 1.5);
    expect(r2.invalidPoints).toBe(2);
  });

  it("throws without events array", () => {
    expect(() => replayGame("g1", null as never, baselineWpModel)).toThrow();
  });
});

describe("W6 stressTest", () => {
  it("computes max and mean abs error vs reference", () => {
    const events = [
      ev({ t: 1, data: { homeScore: 7, awayScore: 0, secondsElapsed: 300 } }),
      ev({ t: 2, eventId: "e2", data: { homeScore: 7, awayScore: 0, secondsElapsed: 600 } }),
    ];
    // Reference equals baseline model output
    const replay = replayGame("g1", events, baselineWpModel);
    const reference = replay.points.map((p) => ({ t: p.t, wp: p.wp }));

    const r = stressTest(baselineWpModel, [{ gameId: "g1", events, reference }], 0.08);
    expect(r.games).toHaveLength(1);
    expect(r.games[0]!.pointsCompared).toBe(2);
    expect(r.games[0]!.maxAbsError).toBeCloseTo(0, 5);
    expect(r.allPassed).toBe(true);
    expect(r.globalMaxAbsError).toBeCloseTo(0, 5);
  });

  it("flags failures when max error exceeds threshold", () => {
    const events = [ev({ t: 1, data: { homeScore: 7, awayScore: 0, secondsElapsed: 300 } })];
    const reference = [{ t: 1, wp: 0.05 }]; // far from baseline's ~0.7
    const r = stressTest(baselineWpModel, [{ gameId: "g1", events, reference }], 0.05);
    expect(r.games[0]!.failed).toBe(true);
    expect(r.allPassed).toBe(false);
    expect(r.globalMaxAbsError).toBeGreaterThan(0.5);
  });

  it("skips reference points with no model output", () => {
    const events = [ev({ t: 1 })];
    const reference = [
      { t: 1, wp: 0.5 },
      { t: 99, wp: 0.6 }, // no model point at t=99
    ];
    const r = stressTest(baselineWpModel, [{ gameId: "g1", events, reference }], 0.2);
    expect(r.games[0]!.pointsCompared).toBe(1);
    expect(r.games[0]!.pointsSkipped).toBe(1);
  });

  it("rejects bad thresholds", () => {
    expect(() => stressTest(baselineWpModel, [], 0)).toThrow();
    expect(() => stressTest(baselineWpModel, [], Number.NaN)).toThrow();
  });
});

describe("W6 replayGameSeeded", () => {
  it("is deterministic under a seed", () => {
    const events = [ev(), ev({ t: 2, eventId: "e2" })];
    const model = (
      _e: WpEvent,
      _s: { homeScore: number; awayScore: number; secondsElapsed: number; completedEvents: number },
      rng: () => number,
    ) => 0.3 + 0.4 * rng();

    const a = replayGameSeeded("g1", events, model, 42);
    const b = replayGameSeeded("g1", events, model, 42);
    expect(a.points.map((p) => p.wp)).toEqual(b.points.map((p) => p.wp));

    const c = replayGameSeeded("g1", events, model, 7);
    expect(c.points.map((p) => p.wp)).not.toEqual(a.points.map((p) => p.wp));
  });
});
