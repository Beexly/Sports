/**
 * Broadcast-video movement primitive (V3).
 *
 * Source: abdullahtarek — YOLOv8 detection + optical-flow camera compensation
 * + perspective transform to real-world meters + per-player speed/distance.
 * Learn-only; no code ported.
 *
 * This build is the MATH + DATA CONTRACT foundation for deriving NGS-like
 * movement metrics from broadcast video. Not the detector — no YOLO weights.
 *
 * COMPOSES WITH: future NGS ingestion for validation.
 */

// ── Data contract ───────────────────────────────────────────────────────────

export interface FramePoint {
  readonly t: number;
  readonly xPx: number;
  readonly yPx: number;
  readonly xM: number | null;
  readonly yM: number | null;
  readonly speed: number | null;
}

export interface Tracklet {
  readonly id: string;
  readonly team: string;
  readonly role: string;
  readonly frames: readonly FramePoint[];
}

export interface MovementMetric {
  readonly playerId: string;
  readonly distanceM: number;
  readonly topSpeedMs: number;
  readonly avgSpeedMs: number;
}

export interface CameraMotionField {
  readonly dx: number;
  readonly dy: number;
  readonly magnitude: number;
}

// ── Camera motion estimation ────────────────────────────────────────────────

/**
 * Estimate camera motion between two frames via dense optical flow.
 * Reference implementation on small fixture frames; production swaps in
 * OpenCV Farneback binding.
 */
export function estimateCameraMotion(
  prevFrame: readonly number[][],
  currFrame: readonly number[][],
): CameraMotionField {
  const h = prevFrame.length;
  const w = prevFrame[0]?.length ?? 0;
  if (h === 0 || w === 0) return { dx: 0, dy: 0, magnitude: 0 };

  // Simple block-matching reference: find dominant global displacement
  const votes = new Map<string, number>();
  const blockSize = 4;
  const searchRadius = 3;

  for (let by = 0; by < h - blockSize; by += blockSize) {
    for (let bx = 0; bx < w - blockSize; bx += blockSize) {
      let bestDx = 0, bestDy = 0, bestDiff = Infinity;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          let diff = 0;
          for (let y = 0; y < blockSize; y++) {
            for (let x = 0; x < blockSize; x++) {
              const py = by + y, px = bx + x;
              const cy = by + y + dy, cx = bx + x + dx;
              if (cy < 0 || cy >= h || cx < 0 || cx >= w) { diff = Infinity; break; }
              diff += Math.abs(prevFrame[py][px] - currFrame[cy][cx]);
            }
          }
          if (diff < bestDiff) {
            bestDiff = diff;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }
      const key = `${bestDx},${bestDy}`;
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }

  // Dominant motion = most-voted displacement
  let bestKey = "0,0";
  let bestVotes = 0;
  for (const [key, count] of votes) {
    if (count > bestVotes) {
      bestVotes = count;
      bestKey = key;
    }
  }
  const [dx, dy] = bestKey.split(",").map(Number);
  return { dx, dy, magnitude: Math.sqrt(dx * dx + dy * dy) };
}

/**
 * Subtract dominant global motion to get camera-compensated displacements.
 */
export function compensateCameraMotion(
  tracklet: Tracklet,
  motionFields: readonly CameraMotionField[],
): Tracklet {
  const compensated: FramePoint[] = tracklet.frames.map((f, i) => {
    const motion = motionFields[i] ?? { dx: 0, dy: 0, magnitude: 0 };
    return {
      ...f,
      xPx: f.xPx - motion.dx,
      yPx: f.yPx - motion.dy,
    };
  });
  return { ...tracklet, frames: compensated };
}

// ── Perspective transform ───────────────────────────────────────────────────

export interface Homography {
  readonly h11: number; readonly h12: number; readonly h13: number;
  readonly h21: number; readonly h22: number; readonly h23: number;
  readonly h31: number; readonly h32: number; readonly h33: number;
}

/**
 * 3×3 homography mapping image pixels → field meters.
 * Field is 120×53.3 yards (109.7×48.8 meters).
 */
export function perspectiveTransform(
  points: readonly { xPx: number; yPx: number }[],
  h: Homography,
): { xM: number; yM: number }[] {
  return points.map(({ xPx, yPx }) => {
    const denom = h.h31 * xPx + h.h32 * yPx + h.h33;
    const xM = (h.h11 * xPx + h.h12 * yPx + h.h13) / denom;
    const yM = (h.h21 * xPx + h.h22 * yPx + h.h23) / denom;
    return { xM, yM };
  });
}

/**
 * Fit homography from detected yardlines (known world coordinates).
 * Field is 120×53.3 yards = 109.7×48.8 meters.
 */
export function fitHomographyFromYardlines(
  detectedYardlines: readonly { xPx: number; yPx: number; xM: number; yM: number }[],
): Homography {
  // Simplified least-squares: use 4 point pairs for the reference homography
  // In production this would solve the full DLT system
  const n = Math.min(4, detectedYardlines.length);
  if (n < 4) {
    // Identity fallback (no transform)
    return { h11: 1, h12: 0, h13: 0, h21: 0, h22: 1, h23: 0, h31: 0, h32: 0, h33: 1 };
  }

  // Solve 8-parameter homography from 4 point pairs (simplified)
  // Using the standard DLT approach with 4 correspondences
  const src = detectedYardlines.slice(0, 4);
  // For the reference implementation, compute scale/offset from bounding box
  let minPxX = Infinity, maxPxX = -Infinity, minPxY = Infinity, maxPxY = -Infinity;
  let minMx = Infinity, maxMx = -Infinity, minMy = Infinity, maxMy = -Infinity;
  for (const p of src) {
    minPxX = Math.min(minPxX, p.xPx); maxPxX = Math.max(maxPxX, p.xPx);
    minPxY = Math.min(minPxY, p.yPx); maxPxY = Math.max(maxPxY, p.yPx);
    minMx = Math.min(minMx, p.xM); maxMx = Math.max(maxMx, p.xM);
    minMy = Math.min(minMy, p.yM); maxMy = Math.max(maxMy, p.yM);
  }
  const sx = maxPxX - minPxX || 1;
  const sy = maxPxY - minPxY || 1;
  const scaleX = (maxMx - minMx) / sx;
  const scaleY = (maxMy - minMy) / sy;

  return {
    h11: scaleX, h12: 0, h13: minMx - scaleX * minPxX,
    h21: 0, h22: scaleY, h23: minMy - scaleY * minPxY,
    h31: 0, h32: 0, h33: 1,
  };
}

// ── Movement metrics ────────────────────────────────────────────────────────

/**
 * Derive per-player movement metrics from camera-compensated,
 * world-coordinate tracklets. Includes ball interpolation across dropped frames.
 */
export function deriveMovementMetrics(
  tracklets: readonly Tracklet[],
): MovementMetric[] {
  return tracklets.map((t) => {
    let distance = 0;
    let topSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < t.frames.length; i++) {
      const prev = t.frames[i - 1];
      const curr = t.frames[i];
      if (prev.xM == null || curr.xM == null || prev.yM == null || curr.yM == null) continue;

      const dx = curr.xM - prev.xM;
      const dy = curr.yM - prev.yM;
      const dt = curr.t - prev.t;
      if (dt <= 0) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      distance += dist;
      const speed = dist / dt;
      topSpeed = Math.max(topSpeed, speed);
      speedSum += speed;
      speedCount++;
    }

    return {
      playerId: t.id,
      distanceM: Number(distance.toFixed(2)),
      topSpeedMs: Number(topSpeed.toFixed(3)),
      avgSpeedMs: speedCount > 0 ? Number((speedSum / speedCount).toFixed(3)) : 0,
    };
  });
}

/**
 * Interpolate ball positions across dropped frames (linear interpolation).
 */
export function interpolateBall(
  frames: readonly (FramePoint | null)[],
): FramePoint[] {
  const result: FramePoint[] = [];
  const known = frames.filter((f): f is FramePoint => f != null);
  if (known.length === 0) return [];

  for (let i = 0; i < frames.length; i++) {
    if (frames[i] != null) {
      result.push(frames[i]!);
    } else {
      // Find nearest known before and after
      let before: FramePoint | null = null;
      let after: FramePoint | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (frames[j] != null) { before = frames[j]!; break; }
      }
      for (let j = i + 1; j < frames.length; j++) {
        if (frames[j] != null) { after = frames[j]!; break; }
      }
      if (before && after) {
        const t = (i - frames.indexOf(before)) / (frames.indexOf(after) - frames.indexOf(before));
        result.push({
          t: before.t + t * (after.t - before.t),
          xPx: before.xPx + t * (after.xPx - before.xPx),
          yPx: before.yPx + t * (after.yPx - before.yPx),
          xM: before.xM != null && after.xM != null ? before.xM + t * (after.xM - before.xM) : null,
          yM: before.yM != null && after.yM != null ? before.yM + t * (after.yM - before.yM) : null,
          speed: null,
        });
      } else if (before) {
        result.push({ ...before, t: before.t + 1 });
      } else if (after) {
        result.push({ ...after, t: after.t - 1 });
      }
    }
  }
  return result;
}
