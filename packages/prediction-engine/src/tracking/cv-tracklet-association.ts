/**
 * Frame-to-frame detection association → tracklets.
 *
 * Greedy IoU matching across consecutive frames: each active tracklet claims
 * the highest-IoU unmatched detection above threshold; unmatched detections
 * start new tracklets; tracklets that go unmatched for longer than
 * maxGapFrames are retired (occlusion tolerance). Single-frame blips are
 * dropped by minTrackletFrames.
 *
 * Emits the Tracklet / FramePoint contracts from cv-movement-primitive.ts with
 * xM/yM left null — world coordinates are filled downstream by the pipeline
 * after camera compensation + homography. Foot points (not box centers) feed
 * the field mapping; see footPoint() in cv-detector-contract.ts.
 *
 * Original implementation for GSE; no code ported.
 */

import type { FramePoint, Tracklet } from "./cv-movement-primitive.js";
import {
  footPoint,
  type BoundingBox,
  type Detection,
  type FrameDetections,
} from "./cv-detector-contract.js";
import {
  applyMat3,
  invertMat3,
  mat3Mul,
  type Mat3,
} from "./cv-camera-compensation.js";

export function bboxIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const inter = interW * interH;
  if (inter <= 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

export interface AssociationOptions {
  /** Minimum IoU to link a detection to an active tracklet. Default 0.3. */
  minIou?: number;
  /** Frames a tracklet survives with no match before retirement. Default 5. */
  maxGapFrames?: number;
  /** Drop tracklets shorter than this (kills single-frame blips). Default 2. */
  minTrackletFrames?: number;
}

interface ActiveTracklet {
  id: string;
  team: string;
  role: string;
  frames: FramePoint[];
  lastBbox: BoundingBox;
  gap: number;
}

export function buildTracklets(
  frames: readonly FrameDetections[],
  options: AssociationOptions = {},
): Tracklet[] {
  const minIou = options.minIou ?? 0.3;
  const maxGapFrames = options.maxGapFrames ?? 5;
  const minTrackletFrames = options.minTrackletFrames ?? 2;

  const finished: ActiveTracklet[] = [];
  let active: ActiveTracklet[] = [];
  let nextId = 1;

  for (const frame of frames) {
    const dets = [...frame.detections];
    const usedDet = new Set<number>();
    const matched = new Set<ActiveTracklet>();

    // Greedy: repeatedly take the best (tracklet, detection) IoU pair.
    for (;;) {
      let best: { trk: ActiveTracklet; di: number; iou: number } | null = null;
      for (const trk of active) {
        if (matched.has(trk)) continue;
        for (let di = 0; di < dets.length; di++) {
          if (usedDet.has(di)) continue;
          const det = dets[di];
          if (det == null) continue;
          const iou = bboxIoU(trk.lastBbox, det.bbox);
          if (iou >= minIou && (best == null || iou > best.iou)) {
            best = { trk, di, iou };
          }
        }
      }
      if (best == null) break;
      matched.add(best.trk);
      usedDet.add(best.di);
      const det = dets[best.di];
      if (det == null) continue;
      const fp = footPoint(det);
      best.trk.frames.push({
        t: frame.t,
        xPx: fp.xPx,
        yPx: fp.yPx,
        xM: null,
        yM: null,
        speed: null,
      });
      best.trk.lastBbox = det.bbox;
      best.trk.gap = 0;
    }

    // Age the tracklets that existed before this frame and went unmatched.
    const stillActive: ActiveTracklet[] = [];
    for (const trk of active) {
      if (matched.has(trk)) {
        stillActive.push(trk);
        continue;
      }
      trk.gap += 1;
      if (trk.gap > maxGapFrames) finished.push(trk);
      else stillActive.push(trk);
    }

    // Unmatched detections start new tracklets (added after aging so they
    // are never penalized for the frame they were born in).
    for (let di = 0; di < dets.length; di++) {
      if (usedDet.has(di)) continue;
      const det = dets[di];
      if (det == null) continue;
      const fp = footPoint(det);
      stillActive.push({
        id: `trk-${String(nextId++).padStart(4, "0")}`,
        team: det.teamHint ?? "UNK",
        role: det.classId,
        frames: [
          {
            t: frame.t,
            xPx: fp.xPx,
            yPx: fp.yPx,
            xM: null,
            yM: null,
            speed: null,
          },
        ],
        lastBbox: det.bbox,
        gap: 0,
      });
    }
    active = stillActive;
  }

  finished.push(...active);
  return finished
    .filter((t) => t.frames.length >= minTrackletFrames)
    .map((t) => ({ id: t.id, team: t.team, role: t.role, frames: t.frames }));
}

// ---------------------------------------------------------------------------
// Motion-aware association (K2: identity from motion continuity).
//
// Appearance ReID is a dead end in identical uniforms; identity comes from
// motion continuity instead. Detections are stabilized into a camera-still
// frame via the per-pair inter-frame homographies, then each tracklet is
// predicted forward with a constant-velocity model and matched within a
// sprint-reach gate (v_max · dt), not an IoU threshold. Tracklets coast
// through occlusions keeping their velocity; retirement only after
// coastFrames unmatched frames.
// ---------------------------------------------------------------------------

const IDENTITY_MAT3: Mat3 = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1] };

export interface MotionAwareOptions {
  /**
   * Per-pair inter-frame homographies (prev→curr); entry i maps frame i
   * to frame i+1. Null entries (or a missing array) mean "no camera motion"
   * for that pair. Default: all identity.
   */
  homographies?: readonly (Mat3 | null)[];
  /** Sprint ceiling, m/s. Default 10 (Harsh Raj reachable-set gate). */
  vMaxMps?: number;
  /** Pixels per meter for the gate (frame-calibrated). Default 20. */
  pxPerMeter?: number;
  /** Coast through occlusions this many frames before retiring. Default 15. */
  coastFrames?: number;
  /** Drop tracklets shorter than this. Default 2. */
  minTrackletFrames?: number;
  /** Velocity smoothing: vel = a·vel + (1−a)·observed. Default 0.7. */
  velocitySmoothing?: number;
  /** Gate = vMaxPx · dt · gateFactor. Default 1.5. */
  gateFactor?: number;
}

interface MotionTracklet {
  id: string;
  team: string;
  role: string;
  frames: FramePoint[];
  /** Last stabilized position (advanced by vel·dt even while coasting). */
  pos: { x: number; y: number };
  /** Stabilized velocity, px/s. */
  vel: { x: number; y: number };
  gap: number;
  lastT: number;
}

export function associateMotionAware(
  frames: readonly FrameDetections[],
  options: MotionAwareOptions = {},
): Tracklet[] {
  const vMaxMps = options.vMaxMps ?? 10;
  const pxPerMeter = options.pxPerMeter ?? 20;
  const coastFrames = options.coastFrames ?? 15;
  const minTrackletFrames = options.minTrackletFrames ?? 2;
  const alpha = options.velocitySmoothing ?? 0.7;
  const gateFactor = options.gateFactor ?? 1.5;
  const vMaxPx = vMaxMps * pxPerMeter;
  const homos = options.homographies ?? [];

  if (frames.length === 0) return [];

  // 1. Stabilize every detection into frame-0 camera coordinates via the
  //    cumulative inverse homographies.
  const stab: { x: number; y: number }[][] = [];
  let cum: Mat3 = IDENTITY_MAT3;
  for (let t = 0; t < frames.length; t++) {
    if (t > 0) {
      const h = homos[t - 1] ?? null;
      if (h != null) cum = mat3Mul(cum, invertMat3(h));
    }
    const dets = frames[t]!.detections;
    stab.push(
      dets.map((d) => {
        const fp = footPoint(d);
        const q = applyMat3(cum, fp.xPx, fp.yPx);
        return { x: q.x, y: q.y };
      }),
    );
  }

  // 2. Greedy motion-gated association in the stabilized frame.
  const finished: MotionTracklet[] = [];
  let active: MotionTracklet[] = [];
  let nextId = 1;
  const newId = () => `mtrk-${String(nextId++).padStart(4, "0")}`;

  for (let t = 0; t < frames.length; t++) {
    const frame = frames[t]!;
    const dets = [...frame.detections];
    const pts = stab[t]!;
    const dt = t === 0 ? 0 : frame.t - frames[t - 1]!.t;

    const usedDet = new Set<number>();
    const matched = new Set<MotionTracklet>();

    if (t > 0 && dt > 0) {
      // Greedy: repeatedly take the best (tracklet, detection) gated pair.
      for (;;) {
        let best: { trk: MotionTracklet; di: number; cost: number } | null = null;
        for (const trk of active) {
          if (matched.has(trk)) continue;
          // Constant-velocity prediction from the (coast-advanced) state.
          const px = trk.pos.x + trk.vel.x * dt;
          const py = trk.pos.y + trk.vel.y * dt;
          const gate = vMaxPx * dt * gateFactor;
          for (let di = 0; di < dets.length; di++) {
            if (usedDet.has(di)) continue;
            const p = pts[di];
            if (p == null) continue;
            const cost = Math.hypot(p.x - px, p.y - py);
            if (cost <= gate && (best == null || cost < best.cost)) {
              best = { trk, di, cost };
            }
          }
        }
        if (best == null) break;
        matched.add(best.trk);
        usedDet.add(best.di);
        const det: Detection | undefined = dets[best.di];
        const p = pts[best.di];
        if (det == null || p == null) continue;
        // Velocity update: exponential smoothing of the observed velocity.
        const obsVx = (p.x - best.trk.pos.x) / dt;
        const obsVy = (p.y - best.trk.pos.y) / dt;
        best.trk.vel = {
          x: alpha * best.trk.vel.x + (1 - alpha) * obsVx,
          y: alpha * best.trk.vel.y + (1 - alpha) * obsVy,
        };
        best.trk.pos = { x: p.x, y: p.y };
        best.trk.gap = 0;
        best.trk.lastT = frame.t;
        const fp = footPoint(det);
        best.trk.frames.push({
          t: frame.t,
          xPx: fp.xPx,
          yPx: fp.yPx,
          xM: null,
          yM: null,
          speed: null,
        });
      }
    }

    // Age: unmatched tracklets coast (position advances by vel*dt, no
    // frame point appended); retire only after coastFrames.
    const stillActive: MotionTracklet[] = [];
    for (const trk of active) {
      if (matched.has(trk)) {
        stillActive.push(trk);
        continue;
      }
      if (t > 0 && dt > 0) {
        trk.pos = {
          x: trk.pos.x + trk.vel.x * dt,
          y: trk.pos.y + trk.vel.y * dt,
        };
      }
      trk.gap += 1;
      if (trk.gap > coastFrames) finished.push(trk);
      else stillActive.push(trk);
    }

    // Unmatched detections birth new tracklets (zero initial velocity).
    for (let di = 0; di < dets.length; di++) {
      if (usedDet.has(di)) continue;
      const det = dets[di];
      const p = pts[di];
      if (det == null || p == null) continue;
      const fp = footPoint(det);
      stillActive.push({
        id: newId(),
        team: det.teamHint ?? "UNK",
        role: det.classId,
        frames: [
          { t: frame.t, xPx: fp.xPx, yPx: fp.yPx, xM: null, yM: null, speed: null },
        ],
        pos: { x: p.x, y: p.y },
        vel: { x: 0, y: 0 },
        gap: 0,
        lastT: frame.t,
      });
    }
    active = stillActive;
  }

  finished.push(...active);
  return finished
    .filter((t) => t.frames.length >= minTrackletFrames)
    .map((t) => ({ id: t.id, team: t.team, role: t.role, frames: t.frames }));
}
