/**
 * arXiv:2504.10106v1 — SoccerNet-v3D: Leveraging Sports Broadcast Replays for 3D Scene Understanding
 *
 * 3D ball ground-truth mining from NFL broadcast footage: calibration quality gates, reprojection-filtered
 * triangulation (midpoint-of-rays with outlier rejection), and a closed-loop box optimizer that fits size
 * with the center fixed — with the sphere prior flagged for re-derivation to a prolate-spheroid football.
 *
 * Improvement: Mint 3D ball and pose ground truth from existing NFL broadcast footage with the paper's annotation-mining recipe — calibration quality gates, reprojection-filtered triangulation, closed-loop box optimizer (engineering directive: optimize size, not center) — the cheapest credible path to 3D ball ground truth for NGS-replacement, with no wearables and no camera rigs.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Ledger states no numeric gate; the transferable asset is the annotation-mining recipe (calibration gates, triangulation, box optimizer), and the football-shape caveat is an adaptation task: the sphere prior (Eq. 7) must be re-derived for a prolate-spheroid football with unknown orientation.
 */

/** Camera: center C and unit ray direction function via intrinsics (simplified pinhole). */
export interface PinholeCam {
  cx: number; cy: number; cz: number;
  fx: number; fy: number;
  px: number; py: number; // principal point
}

/** Back-project a pixel to a unit ray. */
export function pixelRay(cam: PinholeCam, u: number, v: number): [number, number, number] {
  const d: [number, number, number] = [(u - cam.px) / cam.fx, (v - cam.py) / cam.fy, 1];
  const n = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / n, d[1] / n, d[2] / n];
}

/** Calibration quality gate: mean reprojection error under threshold. */
export function calibrationGate(reprojErrors: readonly number[], threshPx: number): boolean {
  if (reprojErrors.length === 0) throw new Error("calibrationGate: no errors");
  if (threshPx <= 0) throw new Error("calibrationGate: threshPx > 0");
  return reprojErrors.reduce((s, e) => s + e, 0) / reprojErrors.length <= threshPx;
}

/** Midpoint of closest points between two rays. */
export function rayMidpoint(
  c1: readonly [number, number, number],
  d1: readonly [number, number, number],
  c2: readonly [number, number, number],
  d2: readonly [number, number, number],
): [number, number, number] {
  const w0: [number, number, number] = [c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]];
  const a = d1[0] ** 2 + d1[1] ** 2 + d1[2] ** 2;
  const b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2];
  const c = d2[0] ** 2 + d2[1] ** 2 + d2[2] ** 2;
  const d = d1[0] * w0[0] + d1[1] * w0[1] + d1[2] * w0[2];
  const e = d2[0] * w0[0] + d2[1] * w0[1] + d2[2] * w0[2];
  const denom = a * c - b * b;
  const sc = denom < 1e-12 ? 0 : (b * e - c * d) / denom;
  const tc = denom < 1e-12 ? 0 : (a * e - b * d) / denom;
  const p1: [number, number, number] = [c1[0] + sc * d1[0], c1[1] + sc * d1[1], c1[2] + sc * d1[2]];
  const p2: [number, number, number] = [c2[0] + tc * d2[0], c2[1] + tc * d2[1], c2[2] + tc * d2[2]];
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
}

/** Project a 3D point to pixels. */
export function project(cam: PinholeCam, p: readonly [number, number, number]): [number, number] {
  const dz = p[2] - cam.cz;
  if (dz <= 1e-9) throw new Error("project: point behind camera");
  return [
    cam.px + cam.fx * ((p[0] - cam.cx) / dz),
    cam.py + cam.fy * ((p[1] - cam.cy) / dz),
  ];
}

/**
 * Reprojection-filtered triangulation: triangulate from every camera pair,
 * drop estimates whose max reprojection error exceeds the gate, average
 * the survivors.
 */
export function triangulateFiltered(
  cams: readonly PinholeCam[],
  pixels: readonly (readonly [number, number])[],
  maxReprojPx: number,
): [number, number, number] {
  if (cams.length !== pixels.length || cams.length < 2) {
    throw new Error("triangulateFiltered: need >= 2 views");
  }
  const ests: [number, number, number][] = [];
  for (let i = 0; i < cams.length; i++) {
    for (let j = i + 1; j < cams.length; j++) {
      const r1 = pixelRay(cams[i]!, pixels[i]![0], pixels[i]![1]);
      const r2 = pixelRay(cams[j]!, pixels[j]![0], pixels[j]![1]);
      const c1: [number, number, number] = [cams[i]!.cx, cams[i]!.cy, cams[i]!.cz];
      const c2: [number, number, number] = [cams[j]!.cx, cams[j]!.cy, cams[j]!.cz];
      const p = rayMidpoint(c1, r1, c2, r2);
      let worst = 0;
      for (let k = 0; k < cams.length; k++) {
        const [u, v] = project(cams[k]!, p);
        worst = Math.max(worst, Math.hypot(u - pixels[k]![0], v - pixels[k]![1]));
      }
      if (worst <= maxReprojPx) ests.push(p);
    }
  }
  if (ests.length === 0) throw new Error("triangulateFiltered: all pairs rejected");
  const n = ests.length;
  return [
    ests.reduce((s, p) => s + p[0], 0) / n,
    ests.reduce((s, p) => s + p[1], 0) / n,
    ests.reduce((s, p) => s + p[2], 0) / n,
  ];
}

/**
 * Closed-loop box optimizer (engineering directive: optimize size, not
 * center): least-squares ball size from 2D box widths given fixed centers.
 * NOTE: the sphere prior (paper Eq. 7) must be re-derived for a
 * prolate-spheroid football with unknown orientation before use on NFL film.
 */
export function optimizeBallSize(
  boxWidthsPx: readonly number[],
  depths: readonly number[], // camera-to-ball distance per view
  focalPx: number,
): number {
  if (boxWidthsPx.length !== depths.length || boxWidthsPx.length === 0) {
    throw new Error("optimizeBallSize: length mismatch or empty");
  }
  // width_px = size * focal / depth  ->  size = mean(width * depth / focal)
  const sizes = boxWidthsPx.map((w, i) => (w * (depths[i] ?? 1)) / focalPx);
  return sizes.reduce((s, x) => s + x, 0) / sizes.length;
}
