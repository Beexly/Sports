/**
 * Sport Task: Fine Grained Action Detection and Classification of Table Tennis Strokes from Videos for MediaEval 2022
 *
 * arXiv:2301.13576 · lane:sports_cv · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Detection quality primitives for sports video: intersection-over-union for box agreement, greedy
 * score-ordered non-maximum suppression to remove duplicate detections, and precision/recall computed
 * by greedy IoU matching of detections against ground truth.
 *
 * Improvement (wiring record): Define 'GSE-ActionBench': an internal benchmark with the same two subtasks for NFL events (pass-play
 * type from trimmed clips; drive segmentation from full game video), scored with global+per-class
 * accuracy and COCO-style temporal mAP (0.5-0.95) + frame-wise IoU; adopt the 'forbid pre-training on
 * prior benchmark years' rule to keep yearly comparisons honest; require working-notes-style method
 * documentation per model version — and add a third subtask the paper lacks: boundary-precision
 * scoring (mean absolute boundary error in frames) for the detection task, since GSE's downstream
 * products (clip extraction, highlight boundaries) care about exact cut points, not just
 * IoU-thresholded mAP.
 *
 * ACCEPTANCE GATE: The internal action benchmark is only useful iff it reproduces the paper's metric behavior: a
 * trivial baseline must score near chance on classification (validating task difficulty) and a strong
 * model must show the long-tail gap (per-class accuracy spread >= 30 points between head and tail
 * classes), mirroring the paper's 2021 74.2-vs-20.4 dynamic.
 *
 * Ingest role: computer-vision detection QA (IoU, NMS, precision/recall).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2301.13576" as const;
export const LANE = "sports_cv" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `The internal action benchmark is only useful iff it reproduces the paper's metric behavior: a trivial baseline must score near chance on classification (validating task difficulty) and a strong model must show the long-tail gap (per-class accuracy spread >= 30 points between head and tail classes), mirroring the paper's 2021 74.2-vs-20.4 dynamic.`;

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
