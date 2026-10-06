/**
 * Play segmentation: tracklets → plays.
 *
 * A football play has a kinematic signature visible without any labels:
 *   SET   — 22 bodies nearly motionless (pre-snap), low motion energy
 *   BURST — the snap: coordinated energy spike as everyone fires off
 *   LIVE  — sustained high energy through the play
 *   DEAD  — energy collapse as the pile forms / whistle blows
 *
 * The segmenter bins tracklet speeds into 0.25s windows, smooths the energy
 * curve, and reads the SET→BURST→DEAD transitions. Hurry-up offenses skip
 * the SET; those plays are caught by the burst-onset path at lower
 * confidence.
 *
 * Input is field-meter tracklets (xM/yM filled). Output is play segments
 * with snap/end timestamps. Formation, routes, and score-bug state attach
 * downstream.
 *
 * Original implementation for GSE.
 */

import type { FramePoint, Tracklet } from "../tracking/cv-movement-primitive.js";

export interface PlaySegment {
  readonly playId: string;
  readonly gameId: string;
  /** Snap timestamp, seconds. */
  readonly snapT: number;
  /** Whistle timestamp, seconds. */
  readonly endT: number;
  /** Start of the pre-snap set window (snapT - 2 for hurry-up). */
  readonly preSnapT: number;
  readonly snapKind: "set" | "hurry-up";
  /** 0..1. */
  readonly confidence: number;
}

export interface SegmentationOptions {
  /** Energy bin width, seconds. Default 0.25. */
  binSec?: number;
  /** Below this mean speed (m/s) a bin counts as "set". Default 0.8. */
  setSpeedMs?: number;
  /** Above this mean speed a bin counts as "live". Default 2.5. */
  liveSpeedMs?: number;
  /** Seconds of set required before a snap. Default 1.0. */
  minSetSec?: number;
  /** Seconds of dead required to close a play. Default 1.5. */
  minDeadSec?: number;
  /** Minimum play duration, seconds. Default 2.5. */
  minPlaySec?: number;
  /** Merge plays separated by less than this, seconds. Default 3.0. */
  mergeGapSec?: number;
  /** Minimum tracklets with data to trust a set window. Default 5. */
  minPlayers?: number;
}

/** Mean speed (m/s) of a tracklet's points inside [t0, t1]. */
function meanSpeedIn(
  frames: readonly FramePoint[],
  t0: number,
  t1: number,
): number | null {
  // Speed samples come from consecutive point pairs; each sample is
  // assigned to the bin containing its midpoint. This is robust to any
  // sampling cadence, including dt == bin width.
  let sum = 0;
  let n = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]!;
    const b = frames[i]!;
    if (a.xM == null || a.yM == null || b.xM == null || b.yM == null) continue;
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    const mid = (a.t + b.t) / 2;
    if (mid < t0 || mid >= t1) continue;
    const dx = (b.xM as number) - (a.xM as number);
    const dy = (b.yM as number) - (a.yM as number);
    sum += Math.sqrt(dx * dx + dy * dy) / dt;
    n++;
  }
  return n > 0 ? sum / n : null;
}

interface Bin {
  t: number;
  energy: number;
  players: number;
}

export function segmentPlays(
  gameId: string,
  tracklets: readonly Tracklet[],
  options: SegmentationOptions = {},
): PlaySegment[] {
  const binSec = options.binSec ?? 0.25;
  const setSpeedMs = options.setSpeedMs ?? 0.8;
  const liveSpeedMs = options.liveSpeedMs ?? 2.5;
  const minSetSec = options.minSetSec ?? 1.0;
  const minDeadSec = options.minDeadSec ?? 1.5;
  const minPlaySec = options.minPlaySec ?? 2.5;
  const mergeGapSec = options.mergeGapSec ?? 3.0;
  const minPlayers = options.minPlayers ?? 5;

  if (tracklets.length === 0) return [];

  let tMin = Infinity;
  let tMax = -Infinity;
  for (const tr of tracklets) {
    for (const f of tr.frames) {
      if (f.xM == null || f.yM == null) continue;
      if (f.t < tMin) tMin = f.t;
      if (f.t > tMax) tMax = f.t;
    }
  }
  if (!isFinite(tMin) || tMax - tMin < minPlaySec) return [];

  // Build energy bins.
  const bins: Bin[] = [];
  for (let t = tMin; t < tMax; t += binSec) {
    let sum = 0;
    let n = 0;
    for (const tr of tracklets) {
      const s = meanSpeedIn(tr.frames, t, t + binSec);
      if (s != null) {
        sum += s;
        n++;
      }
    }
    bins.push({ t, energy: n > 0 ? sum / n : 0, players: n });
  }

  // Smooth with a 3-bin moving average to kill single-bin jitter.
  const smooth = bins.map((b, i) => {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(bins.length - 1, i + 1);
    let s = 0;
    for (let j = lo; j <= hi; j++) s += bins[j]!.energy;
    return { ...b, energy: s / (hi - lo + 1) };
  });

  const isSet = (b: Bin) => b.energy < setSpeedMs && b.players >= minPlayers;
  const isLive = (b: Bin) => b.energy >= liveSpeedMs;

  interface Raw {
    snapIdx: number;
    endIdx: number;
    snapKind: "set" | "hurry-up";
    setRun: number;
  }
  const raw: Raw[] = [];
  let i = 0;
  while (i < smooth.length) {
    // Find a snap: a live bin preceded by a set run (or a long lull).
    let snapIdx = -1;
    let snapKind: "set" | "hurry-up" = "hurry-up";
    let setRun = 0;
    let j = i;
    let lullRun = 0;
    while (j < smooth.length) {
      const b = smooth[j]!;
      if (isSet(b)) {
        setRun++;
        lullRun = 0;
      } else if (!isLive(b) && b.energy < liveSpeedMs * 0.5) {
        // Calm but not a clean set (e.g. too few players visible) —
        // the hurry-up path.
        lullRun++;
      }
      // Intermediate energy (transition bins, smoothed edges): leave the
      // counters alone so a lull/set survives into the burst.
      if (isLive(b)) {
        if (setRun * binSec >= minSetSec || lullRun * binSec >= minSetSec) {
          snapKind = setRun * binSec >= minSetSec ? "set" : "hurry-up";
          // Backtrack to the true burst onset: the first bin after calm.
          let m = j;
          while (m > i && smooth[m - 1]!.energy > setSpeedMs) m--;
          snapIdx = m;
          break;
        }
        // Mid-play spike with no preceding calm: reset and keep scanning.
        setRun = 0;
        lullRun = 0;
      }
      j++;
    }
    if (snapIdx < 0) break;

    // Find the end: sustained dead after the snap.
    let endIdx = smooth.length - 1;
    let deadRun = 0;
    let k = snapIdx + 1;
    for (; k < smooth.length; k++) {
      if (!isLive(smooth[k]!)) deadRun++;
      else deadRun = 0;
      if (deadRun * binSec >= minDeadSec) {
        endIdx = k - deadRun + 1;
        break;
      }
    }
    const dur = (endIdx - snapIdx) * binSec;
    if (dur >= minPlaySec) {
      raw.push({ snapIdx, endIdx, snapKind, setRun });
    }
    i = k + 1;
  }

  // Merge plays separated by a short gap (e.g. whistle + quick re-burst).
  const merged: Raw[] = [];
  for (const r of raw) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      (r.snapIdx - prev.endIdx) * binSec < mergeGapSec &&
      r.snapKind === prev.snapKind
    ) {
      merged[merged.length - 1] = { ...prev, endIdx: r.endIdx };
    } else {
      merged.push(r);
    }
  }

  return merged.map((r, n) => {
    const snapT = smooth[r.snapIdx]!.t;
    const endT = smooth[Math.min(r.endIdx, smooth.length - 1)]!.t;
    const setSec = r.snapKind === "set" ? r.setRun * binSec : 0;
    const confidence =
      r.snapKind === "set"
        ? Math.min(0.95, 0.6 + setSec * 0.15)
        : 0.55;
    return {
      playId: `play_${gameId}_${n + 1}`,
      gameId,
      snapT,
      endT,
      preSnapT: r.snapKind === "set" ? snapT - setSec : snapT - 2,
      snapKind: r.snapKind,
      confidence: Math.round(confidence * 100) / 100,
    };
  });
}
