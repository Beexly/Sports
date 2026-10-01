/**
 * cv-eval-stratification.ts — K3: occlusion-stratified eval harness.
 *
 * A single precision/recall number hides where a detector fails. This
 * module applies the AWS 5-axis error-stratification protocol —
 * occlusion × box size × aspect × camera angle × contrast = 32 cells —
 * so a 0.74 recall becomes a per-cell diagnosis that decides "more data"
 * vs "different architecture".
 *
 * Matching criterion: IoU ≥ 0.5 (AWS implementation spec — BINDING).
 * MDPI §5.1's 20-px center-distance matching is available as an explicit
 * option; the two protocols disagree on the matching rule and the AWS
 * spec governs this module's default.
 *
 * The "strategic gathering" rule: the 3 worst-recall cells with n≥5
 * produce the headline recommendation, e.g. "gather N more frames
 * matching high-occlusion / wide-aspect / sideline" (= pile frames).
 */

import { bboxIoU } from "./cv-tracklet-association.js";
import type {
  BoundingBox,
  Detection,
  VideoFrame,
} from "./cv-detector-contract.js";

export type ViewAngle = "sideline" | "endzone";

export interface EvalFrame {
  readonly detections: readonly Detection[];
  /** Visible-player ground-truth boxes. */
  readonly groundTruth: readonly BoundingBox[];
  readonly view: ViewAngle;
  /** Grayscale pixels for the contrast axis; omit → contrast defaults low. */
  readonly frame?: VideoFrame;
}

export type MatchCriterion =
  | { readonly kind: "iou"; readonly threshold: number }
  | { readonly kind: "centerDistance"; readonly thresholdPx: number };

export interface StratifyOptions {
  /** Default { kind: "iou", threshold: 0.5 } (AWS, binding). */
  readonly matchCriterion?: MatchCriterion;
  /** Override the median gt area for the size axis. */
  readonly sizeMedianArea?: number;
  /** Override the contrast threshold (std(ring)/mean(box)). */
  readonly contrastThreshold?: number;
  /** Minimum gt count for a cell to rank as "worst". Default 5. */
  readonly worstCellMinN?: number;
}

export interface StratumCell {
  readonly key: string;
  readonly occlusion: "high" | "low";
  readonly size: "small" | "large";
  readonly aspect: "wide" | "tall";
  readonly angle: ViewAngle;
  readonly contrast: "high" | "low";
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
  /** Ground-truth count (tp + fn). */
  readonly n: number;
  readonly precision: number;
  readonly recall: number;
}

export interface StratificationReport {
  /** All 32 cells (empty cells included with 0 counts). */
  readonly cells: readonly StratumCell[];
  readonly overall: { precision: number; recall: number; tp: number; fp: number; fn: number };
  /** Up to 3 lowest-recall cells with n >= worstCellMinN. */
  readonly worstCells: readonly StratumCell[];
  /** Headline data-collection recommendation. */
  readonly recommendation: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function boxArea(b: BoundingBox): number {
  return Math.max(0, b.width) * Math.max(0, b.height);
}

function intersectionArea(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

/** Box-level occlusion proxy: fraction of gt area overlapped by other gt. */
function occlusionLevel(gt: BoundingBox, others: readonly BoundingBox[]): "high" | "low" {
  const area = boxArea(gt);
  if (area <= 0) return "low";
  let overlap = 0;
  for (const o of others) {
    if (o === gt) continue;
    overlap += intersectionArea(o, gt);
  }
  return overlap / area > 0.4 ? "high" : "low";
}

/**
 * Local contrast: std of the 1-box-width margin ring / mean inside box.
 * Returns null when no frame pixels are available.
 */
function contrastValue(box: BoundingBox, frame?: VideoFrame): number | null {
  if (frame == null) return null;
  const { pixels, width, height } = frame;
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(width, Math.ceil(box.x + box.width));
  const y1 = Math.min(height, Math.ceil(box.y + box.height));
  if (x1 <= x0 || y1 <= y0) return null;
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += pixels[y]?.[x] ?? 0;
      n++;
    }
  }
  if (n === 0) return null;
  const mean = sum / n;
  // Margin ring: 1 box-width outward.
  const mx = Math.max(1, Math.floor(box.width));
  const rx0 = Math.max(0, x0 - mx);
  const ry0 = Math.max(0, y0 - mx);
  const rx1 = Math.min(width, x1 + mx);
  const ry1 = Math.min(height, y1 + mx);
  let rsum = 0;
  let rsumSq = 0;
  let rn = 0;
  for (let y = ry0; y < ry1; y++) {
    for (let x = rx0; x < rx1; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const v = pixels[y]?.[x] ?? 0;
      rsum += v;
      rsumSq += v * v;
      rn++;
    }
  }
  if (rn === 0) return null;
  const rmean = rsum / rn;
  const rvar = Math.max(0, rsumSq / rn - rmean * rmean);
  return Math.sqrt(rvar) / (mean + 1e-6);
}

function centerDistance(a: BoundingBox, b: BoundingBox): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

function cellKey(
  occlusion: string,
  size: string,
  aspect: string,
  angle: string,
  contrast: string,
): string {
  return `${occlusion}-occlusion/${size}-box/${aspect}-aspect/${angle}/${contrast}-contrast`;
}

export function stratifyEval(
  frames: readonly EvalFrame[],
  options: StratifyOptions = {},
): StratificationReport {
  const criterion: MatchCriterion = options.matchCriterion ?? {
    kind: "iou",
    threshold: 0.5,
  };
  const worstCellMinN = options.worstCellMinN ?? 5;

  // Size median over all gt boxes (or override).
  const allAreas: number[] = [];
  for (const f of frames) for (const gt of f.groundTruth) allAreas.push(boxArea(gt));
  const sizeMedian = options.sizeMedianArea ?? median(allAreas);

  // Contrast threshold: median of computed values (or override).
  const contrastVals: number[] = [];
  for (const f of frames) {
    for (const gt of f.groundTruth) {
      const v = contrastValue(gt, f.frame);
      if (v != null) contrastVals.push(v);
    }
  }
  const contrastThresh = options.contrastThreshold ?? median(contrastVals);

  // Per-gt attributes (for TP/FN cells).
  interface GtAttr {
    occlusion: "high" | "low";
    size: "small" | "large";
    aspect: "wide" | "tall";
    angle: ViewAngle;
    contrast: "high" | "low";
  }
  const cellCounts = new Map<string, { tp: number; fp: number; fn: number; attr: GtAttr }>();

  const attrFor = (
    gt: BoundingBox,
    gtSet: readonly BoundingBox[],
    view: ViewAngle,
    frame?: VideoFrame,
  ): GtAttr => {
    const occlusion = occlusionLevel(gt, gtSet);
    const size: "small" | "large" = boxArea(gt) < sizeMedian ? "small" : "large";
    const aspect: "wide" | "tall" = gt.width / Math.max(1e-9, gt.height) > 1.5 ? "wide" : "tall";
    const cv = contrastValue(gt, frame);
    const contrast: "high" | "low" = cv != null && cv > contrastThresh ? "high" : "low";
    return { occlusion, size, aspect, angle: view, contrast };
  };

  const bump = (attr: GtAttr, kind: "tp" | "fp" | "fn") => {
    const key = cellKey(attr.occlusion, attr.size, attr.aspect, attr.angle, attr.contrast);
    let c = cellCounts.get(key);
    if (!c) {
      c = { tp: 0, fp: 0, fn: 0, attr };
      cellCounts.set(key, c);
    }
    c[kind] += 1;
  };

  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  for (const f of frames) {
    const gtAttrs = f.groundTruth.map((gt) => attrFor(gt, f.groundTruth, f.view, f.frame));
    // Greedy matching: each gt claims its best unmatched detection.
    const usedDet = new Set<number>();
    const matchedGt = new Set<number>();
    for (let gi = 0; gi < f.groundTruth.length; gi++) {
      const gt = f.groundTruth[gi]!;
      let bestDi = -1;
      let bestScore = -Infinity;
      for (let di = 0; di < f.detections.length; di++) {
        if (usedDet.has(di)) continue;
        const det = f.detections[di]!;
        let ok = false;
        let score = 0;
        if (criterion.kind === "iou") {
          const iou = bboxIoU(gt, det.bbox);
          ok = iou >= criterion.threshold;
          score = iou;
        } else {
          const d = centerDistance(gt, det.bbox);
          ok = d < criterion.thresholdPx;
          score = -d;
        }
        if (ok && score > bestScore) {
          bestScore = score;
          bestDi = di;
        }
      }
      if (bestDi >= 0) {
        usedDet.add(bestDi);
        matchedGt.add(gi);
        bump(gtAttrs[gi]!, "tp");
        totalTp++;
      }
    }
    // Unmatched gt → FN; unmatched detections → FP.
    for (let gi = 0; gi < f.groundTruth.length; gi++) {
      if (!matchedGt.has(gi)) {
        bump(gtAttrs[gi]!, "fn");
        totalFn++;
      }
    }
    for (let di = 0; di < f.detections.length; di++) {
      if (usedDet.has(di)) continue;
      const det = f.detections[di]!;
      // FP cell from the detection's own box; occlusion unknown → low.
      const size: "small" | "large" = boxArea(det.bbox) < sizeMedian ? "small" : "large";
      const aspect: "wide" | "tall" =
        det.bbox.width / Math.max(1e-9, det.bbox.height) > 1.5 ? "wide" : "tall";
      const cv = contrastValue(det.bbox, f.frame);
      const contrast: "high" | "low" = cv != null && cv > contrastThresh ? "high" : "low";
      bump({ occlusion: "low", size, aspect, angle: f.view, contrast }, "fp");
      totalFp++;
    }
  }

  // Materialize all 32 cells.
  const cells: StratumCell[] = [];
  const occlusions = ["high", "low"] as const;
  const sizes = ["small", "large"] as const;
  const aspects = ["wide", "tall"] as const;
  const angles: ViewAngle[] = ["sideline", "endzone"];
  const contrasts = ["high", "low"] as const;
  for (const oc of occlusions)
    for (const sz of sizes)
      for (const ar of aspects)
        for (const an of angles)
          for (const co of contrasts) {
            const key = cellKey(oc, sz, ar, an, co);
            const c = cellCounts.get(key);
            const tp = c?.tp ?? 0;
            const fp = c?.fp ?? 0;
            const fn = c?.fn ?? 0;
            const n = tp + fn;
            cells.push({
              key,
              occlusion: oc,
              size: sz,
              aspect: ar,
              angle: an,
              contrast: co,
              tp,
              fp,
              fn,
              n,
              precision: tp + fp === 0 ? 1 : tp / (tp + fp),
              recall: n === 0 ? 1 : tp / n,
            });
          }

  const overall = {
    tp: totalTp,
    fp: totalFp,
    fn: totalFn,
    precision: totalTp + totalFp === 0 ? 1 : totalTp / (totalTp + totalFp),
    recall: totalTp + totalFn === 0 ? 1 : totalTp / (totalTp + totalFn),
  };

  const worstCells = cells
    .filter((c) => c.n >= worstCellMinN)
    .sort((a, b) => a.recall - b.recall || b.n - a.n)
    .slice(0, 3);

  let recommendation: string;
  if (worstCells.length === 0) {
    recommendation =
      "no stratum meets the minimum-n bar — gather a broader eval set before targeting collection.";
  } else {
    const descs = worstCells.map((c) => c.key).join("; ");
    recommendation =
      `gather ${worstCellMinN * 4} more frames matching ${descs} ` +
      `(worst recall ${worstCells[0]!.recall.toFixed(2)} on n=${worstCells[0]!.n}).`;
  }

  return { cells, overall, worstCells, recommendation };
}
