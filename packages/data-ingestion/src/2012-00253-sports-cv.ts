/**
 * A New Action Recognition Framework for Video Highlights Summarization in Sporting Events
 *
 * arXiv:2012.00253 · lane:sports_cv · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Detection quality primitives for sports video: intersection-over-union for box agreement, greedy
 * score-ordered non-maximum suppression to remove duplicate detections, and precision/recall computed
 * by greedy IoU matching of detections against ground truth.
 *
 * Improvement (wiring record): RallySeg-3L module: (a) frame-level playing/non-playing classifier per sport on broadcast frames
 * (replace YOLOv3/OpenPose with GSE's current detector or a cheap fine-tuned classifier); (b)
 * middle-level probability-sum fusion across detected athletes; (c) short-window majority vote with
 * tuned k and Prc (grid-search on GSE's own rally timestamps); (d) Delta-t gap-merge to emit final
 * clip intervals for highlight rendering; start with table tennis/pickleball where rally structure is
 * clean, then port to tennis.
 *
 * ACCEPTANCE GATE: RallySeg-3L must beat the naive frame-level baseline by >=5pp on F1 (C metric) on the same 5-match
 * set; absolute P >= 90% and R >= 85% required for a production pilot. If the voting cascade does not
 * clear +5pp over flat frame classification, drop it.
 *
 * Ingest role: computer-vision detection QA (IoU, NMS, precision/recall).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2012.00253" as const;
export const LANE = "sports_cv" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `RallySeg-3L must beat the naive frame-level baseline by >=5pp on F1 (C metric) on the same 5-match set; absolute P >= 90% and R >= 85% required for a production pilot. If the voting cascade does not clear +5pp over flat frame classification, drop it.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "IoU matching + greedy NMS",
  iouThreshold: 0.5,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ScoredBox extends Box {
  score: number;
}

function validBox(b: Box): boolean {
  return (
    typeof b === "object" &&
    b !== null &&
    isFiniteNumber(b.x1) &&
    isFiniteNumber(b.y1) &&
    isFiniteNumber(b.x2) &&
    isFiniteNumber(b.y2) &&
    b.x2 > b.x1 &&
    b.y2 > b.y1
  );
}

/** Intersection-over-union of two boxes. Null on degenerate boxes. */
export function iou(a: Box, b: Box): number | null {
  if (!validBox(a) || !validBox(b)) return null;
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  const union = areaA + areaB - inter;
  if (union <= 0) return null;
  return inter / union;
}

/**
 * Greedy non-maximum suppression: keep the highest-score box, drop later boxes
 * whose IoU with a kept box exceeds the threshold.
 */
export function nonMaxSuppression(boxes: readonly ScoredBox[], iouThreshold: number): ScoredBox[] | null {
  if (!isFiniteNumber(iouThreshold) || iouThreshold < 0 || iouThreshold > 1) return null;
  if (!boxes.every((b) => validBox(b) && isFiniteNumber(b.score))) return null;
  const sorted = [...boxes].sort((x, y) => y.score - x.score);
  const kept: ScoredBox[] = [];
  for (const cand of sorted) {
    let overlaps = false;
    for (const k of kept) {
      const v = iou(cand, k);
      if (v !== null && v > iouThreshold) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) kept.push(cand);
  }
  return kept;
}

/** Precision/recall with greedy score-ordered IoU matching of detections to ground truth. */
export function precisionRecallAtIou(
  detections: readonly ScoredBox[],
  groundTruth: readonly Box[],
  iouThreshold: number,
): { precision: number; recall: number; tp: number; fp: number; fn: number } | null {
  if (!isFiniteNumber(iouThreshold) || iouThreshold < 0 || iouThreshold > 1) return null;
  if (!detections.every((d) => validBox(d) && isFiniteNumber(d.score))) return null;
  if (!groundTruth.every(validBox)) return null;
  const matched: boolean[] = new Array(groundTruth.length).fill(false);
  let tp = 0;
  for (const det of [...detections].sort((x, y) => y.score - x.score)) {
    let best = -1;
    let bestIou = iouThreshold;
    groundTruth.forEach((gt, gi) => {
      if (matched[gi] === true) return;
      const v = iou(det, gt);
      if (v !== null && v > bestIou) {
        bestIou = v;
        best = gi;
      }
    });
    if (best >= 0) {
      matched[best] = true;
      tp++;
    }
  }
  const fp = detections.length - tp;
  const fn = groundTruth.length - tp;
  return {
    precision: detections.length === 0 ? 0 : tp / detections.length,
    recall: groundTruth.length === 0 ? 0 : tp / groundTruth.length,
    tp,
    fp,
    fn,
  };
}
