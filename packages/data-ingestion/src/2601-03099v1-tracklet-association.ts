/**
 * Time-Aware Synthetic Control
 *
 * arXiv:2601.03099v1 · lane:tracking · verdict:ADOPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Global tracklet association over per-frame detections: ReID embedding distances fused with a jersey-number auxiliary head, pruned by a field-coordinate spatial gate (meters on the field plane) instead of a fixed-camera prior; greedy bipartite matching links tracklets across gaps with linear gap-fill interpolation.
 *
 * Improvement (record):
 * GSE gains a time-aware synthetic control module that estimates the counterfactual impact of starting-QB injuries, coordinator changes, or rule changes on team EPA/play trajectories with 95% CIs validated by placebo tests on untreated teams.
 *
 * ACCEPTANCE GATE:
 * Adopt if TASC's median placebo RMSE beats classical synthetic control by >=10% relative AND beats the flat-carry baseline by >=15% in at least 4 of 6 seasons, with the stability signature in the d-sweep.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: tracking post-processor (association + spatial gating + gap fill). Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2601.03099v1" as const;
export const LANE = "tracking" as const;
export const VERDICT = "ADOPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt if TASC's median placebo RMSE beats classical synthetic control by >=10% relative AND beats the flat-carry baseline by >=15% in at least 4 of 6 seasons, with the stability signature in the d-sweep.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** 2D field-coordinate point with timestamp. */
export interface TrackPoint {
  x: number;
  y: number;
  t: number;
}

/** Assignment of one track row to one detection column. */
export interface Assignment {
  row: number;
  col: number;
  cost: number;
}

/**
 * Cosine distance between identity embedding vectors (0 = identical direction).
 * Fail-closed: null on mismatched lengths, non-finite entries, or zero norms.
 */
export function cosineDistance(a: number[], b: number[]): number | null {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] as number;
    const bv = b[i] as number;
    if (!isFiniteNumber(av) || !isFiniteNumber(bv)) return null;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return null;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Field-coordinate spatial gate: true when two detections are within maxDistM
 * meters on the field plane. Replaces the paper's fixed-camera assumption.
 */
export function fieldCoordinateGate(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  maxDistM: number,
): boolean | null {
  if (!isFiniteNumber(p1.x) || !isFiniteNumber(p1.y)) return null;
  if (!isFiniteNumber(p2.x) || !isFiniteNumber(p2.y)) return null;
  if (!isFiniteNumber(maxDistM) || maxDistM < 0) return null;
  return Math.hypot(p1.x - p2.x, p1.y - p2.y) <= maxDistM;
}

/**
 * Jersey-number-aware ReID connector score: the auxiliary number-classification
 * head's OCR confidence, flipped when the decoded digits disagree.
 */
export function jerseyNumberMatchScore(ocrConfidence: number, digitsAgree: boolean): number | null {
  if (!isFiniteNumber(ocrConfidence) || ocrConfidence < 0 || ocrConfidence > 1) return null;
  return digitsAgree ? ocrConfidence : 1 - ocrConfidence;
}

/**
 * Greedy bipartite assignment over a tracklet-to-detection cost matrix,
 * minimizing total cost one row at a time. Null on ragged/non-finite matrices.
 */
export function greedyBipartiteAssignment(cost: number[][]): Assignment[] | null {
  if (!Array.isArray(cost) || cost.length === 0) return null;
  const first = cost[0];
  if (!first || first.length === 0) return null;
  const nCols = first.length;
  for (const row of cost) {
    if (!Array.isArray(row) || row.length !== nCols || !row.every(isFiniteNumber)) return null;
  }
  const used = new Set<number>();
  const out: Assignment[] = [];
  for (let r = 0; r < cost.length; r++) {
    const row = cost[r] as number[];
    let best = -1;
    let bestC = Infinity;
    for (let c = 0; c < nCols; c++) {
      const v = row[c] as number;
      if (!used.has(c) && v < bestC) {
        bestC = v;
        best = c;
      }
    }
    if (best < 0) return null;
    used.add(best);
    out.push({ row: r, col: best, cost: bestC });
  }
  return out;
}

/** Linear interpolation of a tracklet across a detection gap (before.t < t < after.t). */
export function interpolateTrackletGap(before: TrackPoint, after: TrackPoint, t: number): TrackPoint | null {
  if (!isFiniteNumber(before.x) || !isFiniteNumber(before.y) || !isFiniteNumber(before.t)) return null;
  if (!isFiniteNumber(after.x) || !isFiniteNumber(after.y) || !isFiniteNumber(after.t)) return null;
  if (!isFiniteNumber(t) || !(before.t < t && t < after.t)) return null;
  const f = (t - before.t) / (after.t - before.t);
  return { x: before.x + f * (after.x - before.x), y: before.y + f * (after.y - before.y), t };
}
