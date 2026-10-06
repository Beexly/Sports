import { describe, expect, it } from "vitest";
import { segmentPlays } from "./cv-play-segmentation.js";
import type { Tracklet } from "../tracking/cv-movement-primitive.js";

/** Build a tracklet from [t, xM, yM] points. */
function trk(
  id: string,
  team: string,
  pts: readonly (readonly [number, number, number])[],
): Tracklet {
  return {
    id,
    team,
    role: "player",
    frames: pts.map(([t, xM, yM]) => ({
      t,
      xPx: 0,
      yPx: 0,
      xM,
      yM,
      speed: null,
    })),
  };
}

/**
 * Scripted play: set (static + jitter) → burst (fast coordinated motion)
 * → dead (static). 11 offensive tracklets.
 */
function scriptedPlay(
  idPrefix: string,
  t0: number,
  setSec: number,
  liveSec: number,
  deadSec: number,
  nPlayers = 11,
): Tracklet[] {
  const out: Tracklet[] = [];
  for (let p = 0; p < nPlayers; p++) {
    const bx = 50 + p * 0.8;
    const by = 20 + (p % 5) * 1.2;
    const pts: [number, number, number][] = [];
    const dt = 0.25;
    // Set: tiny jitter, ~0.2 m/s.
    for (let t = t0; t < t0 + setSec; t += dt) {
      pts.push([t, bx + 0.02 * Math.sin(t * 9 + p), by + 0.02 * Math.cos(t * 7 + p)]);
    }
    // Burst: 3 m/s downfield — everyone fires off.
    const tSnap = t0 + setSec;
    for (let t = tSnap; t < tSnap + liveSec; t += dt) {
      const el = t - tSnap;
      pts.push([t, bx + 3 * el, by + (p % 2 === 0 ? 0.8 * el : -0.5 * el)]);
    }
    // Dead: static again.
    const tEnd = tSnap + liveSec;
    const ex = bx + 3 * liveSec;
    const ey = by + (p % 2 === 0 ? 0.8 * liveSec : -0.5 * liveSec);
    for (let t = tEnd; t < tEnd + deadSec; t += dt) {
      pts.push([t, ex, ey]);
    }
    out.push(trk(`${idPrefix}-p${p}`, "KC", pts));
  }
  return out;
}

describe("segmentPlays", () => {
  it("finds one play from a set → burst → dead script", () => {
    const tracklets = scriptedPlay("g1", 0, 2, 4, 3);
    const plays = segmentPlays("game1", tracklets);
    expect(plays).toHaveLength(1);
    const play = plays[0]!;
    expect(play.snapKind).toBe("set");
    expect(play.snapT).toBeGreaterThanOrEqual(1.5);
    expect(play.snapT).toBeLessThanOrEqual(2.75);
    expect(play.endT).toBeGreaterThanOrEqual(5.5);
    expect(play.endT).toBeLessThanOrEqual(7.0);
    expect(play.confidence).toBeGreaterThan(0.6);
    expect(play.playId).toBe("play_game1_1");
  });

  it("finds two plays separated by a lull", () => {
    const p1 = scriptedPlay("g1", 0, 2, 4, 4);
    const p2 = scriptedPlay("g2", 14, 2, 4, 3);
    const plays = segmentPlays("game1", [...p1, ...p2]);
    expect(plays).toHaveLength(2);
    expect(plays[1]!.snapT).toBeGreaterThan(13);
    expect(plays[1]!.snapT).toBeLessThan(17);
  });

  it("catches hurry-up plays with no clean set at lower confidence", () => {
    // Only 3 tracklets with data during the lull → not a "set".
    const tracklets = scriptedPlay("g1", 0, 2, 4, 3, 3);
    const plays = segmentPlays("game1", tracklets);
    expect(plays).toHaveLength(1);
    expect(plays[0]!.snapKind).toBe("hurry-up");
    expect(plays[0]!.confidence).toBeLessThan(0.6);
  });

  it("returns nothing for empty input or pure dead ball", () => {
    expect(segmentPlays("g", [])).toEqual([]);
    const still = scriptedPlay("g1", 0, 9, 0, 0).map((t) => ({
      ...t,
      frames: t.frames.filter((f) => f.t < 9),
    }));
    expect(segmentPlays("g", still)).toEqual([]);
  });
});
