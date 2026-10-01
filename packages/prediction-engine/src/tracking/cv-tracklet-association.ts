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
  type FrameDetections,
} from "./cv-detector-contract.js";

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
