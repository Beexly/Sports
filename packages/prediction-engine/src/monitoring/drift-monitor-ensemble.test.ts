/**
 * Drift-monitor ensemble — tests (arXiv 2207.13287v1).
 *
 * ACCEPTANCE GATE: each detector fires on a sustained shift and stays
 * quiet on a stable stream; the majority vote confirms only when >= 2
 * detectors agree within 3 weeks; the end-to-end evaluation hits the
 * gate (>= 0.8 detections/episode, <= 2 false alarms/season, ADD within
 * one week of the best standalone detector); degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  Ecdd,
  evaluateDrift,
  majorityVote,
  PageHinkley,
  Pudd,
  type Alarm,
} from "./drift-monitor-ensemble";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("PageHinkley", () => {
  it("fires on a sustained Brier increase, quiet on stable", () => {
    const rand = mulberry32(201);
    const d = new PageHinkley(0.005, 0.2);
    let alarms = 0;
    for (let w = 0; w < 40; w++) {
      const brier = 0.2 + (w >= 15 ? 0.08 : 0) + (rand() - 0.5) * 0.02;
      if (d.update(brier)) alarms++;
    }
    expect(alarms).toBeGreaterThanOrEqual(1);
    const d2 = new PageHinkley(0.005, 0.2);
    let quiet = 0;
    for (let w = 0; w < 40; w++) {
      if (d2.update(0.2 + (rand() - 0.5) * 0.02)) quiet++;
    }
    expect(quiet).toBe(0);
    expect(() => new PageHinkley(0.005, 0)).toThrow();
  });
});

describe("Ecdd", () => {
  it("fires when the error stream leaves the baseline", () => {
    const e = new Ecdd(0.3, 0.3, 3, 0.02);
    let alarms = 0;
    for (let w = 0; w < 10; w++) if (e.update(0.3 + (w % 2) * 0.01)) alarms++;
    expect(alarms).toBe(0);
    for (let w = 0; w < 10; w++) if (e.update(0.42)) alarms++;
    expect(alarms).toBeGreaterThanOrEqual(1);
    expect(() => new Ecdd(0.3, 1.5, 3, 0.02)).toThrow();
    expect(() => new Ecdd(0.3, 0.3, 3, 0)).toThrow();
  });
});

describe("Pudd", () => {
  it("fires when the PU-index shifts", () => {
    const rand = mulberry32(202);
    const p = new Pudd(8, 3, 3);
    let alarms = 0;
    const week = (pu: number): void => {
      const u = Math.round(256 * pu + (rand() - 0.5) * 8);
      if (p.update(Math.max(0, Math.min(256, u)), 256)) alarms++;
    };
    for (let w = 0; w < 14; w++) week(0.2);
    expect(alarms).toBe(0);
    for (let w = 0; w < 8; w++) week(0.45);
    expect(alarms).toBeGreaterThanOrEqual(1);
    expect(() => p.update(300, 256)).toThrow();
    expect(() => p.update(5, 0)).toThrow();
  });
});

describe("majorityVote", () => {
  it("confirms only on >= 2 detectors within 3 weeks", () => {
    const alarms: Alarm[] = [
      { detector: "ecdd", week: 10 },
      { detector: "pageHinkley", week: 11 },
      { detector: "pudd", week: 30 }, // lone alarm: no confirmation
    ];
    expect(majorityVote(alarms)).toEqual([10]);
    const spread: Alarm[] = [
      { detector: "ecdd", week: 10 },
      { detector: "pageHinkley", week: 20 }, // outside the window
    ];
    expect(majorityVote(spread)).toEqual([]);
    expect(majorityVote([])).toEqual([]);
  });
});

describe("end-to-end gate", () => {
  it("meets the acceptance gate on synthetic regime shifts", () => {
    const rand = mulberry32(203);
    const weeks = 68; // 4 seasons
    const regimes = [20, 40, 60];
    const brier: number[] = [];
    const err: number[] = [];
    const puCounts: Array<{ u: number; t: number }> = [];
    let regime = 0;
    for (let w = 0; w < weeks; w++) {
      if (regimes.includes(w)) regime++;
      const shift = regime * 0.06;
      brier.push(0.2 + shift + (rand() - 0.5) * 0.02);
      err.push(0.3 + shift + (rand() - 0.5) * 0.04);
      const pu = Math.min(0.9, 0.2 + shift * 2 + (rand() - 0.5) * 0.05);
      const u = Math.max(0, Math.min(256, Math.round(256 * pu)));
      puCounts.push({ u, t: 256 });
    }
    const ph = new PageHinkley(0.005, 0.2);
    const ec = new Ecdd(0.3, 0.3, 3, 0.02);
    const pu = new Pudd(8, 3, 3);
    const alarms: Alarm[] = [];
    const standalone: Record<string, number[]> = { pageHinkley: [], ecdd: [], pudd: [] };
    for (let w = 0; w < weeks; w++) {
      if (ph.update(brier[w] as number)) {
        alarms.push({ detector: "pageHinkley", week: w });
        standalone["pageHinkley"]?.push(w);
      }
      if (ec.update(err[w] as number)) {
        alarms.push({ detector: "ecdd", week: w });
        standalone["ecdd"]?.push(w);
      }
      const pc = puCounts[w] as { u: number; t: number };
      if (pu.update(pc.u, pc.t)) {
        alarms.push({ detector: "pudd", week: w });
        standalone["pudd"]?.push(w);
      }
    }
    const episodes = majorityVote(alarms);
    const ev = evaluateDrift(episodes, regimes, weeks);
    expect(ev.detectionsPerEpisode).toBeGreaterThanOrEqual(0.8);
    expect(ev.detectionsPerEpisode).toBeLessThanOrEqual(1.2);
    expect(ev.falseAlarmsPerSeason).toBeLessThanOrEqual(2);
    // ADD within one week of the best standalone detector.
    const adds = (["pageHinkley", "ecdd", "pudd"] as const).map(
      (k) => evaluateDrift(standalone[k] as number[], regimes, weeks).add,
    );
    const best = Math.min(...adds.filter((a) => !Number.isNaN(a)));
    expect(ev.add).toBeLessThanOrEqual(best + 1 + 1e-9);
  });

  it("evaluateDrift handles empty inputs", () => {
    const ev = evaluateDrift([], [], 0);
    expect(ev.detectionsPerEpisode).toBe(0);
    expect(Number.isNaN(ev.add)).toBe(true);
  });
});
