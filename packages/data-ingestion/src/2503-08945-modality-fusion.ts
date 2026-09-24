/**
 * PassAI: explainable artificial intelligence algorithm for soccer pass analysis using multimodal information resources
 *
 * arXiv:2503.08945 · lane:multimodal_fusion · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Late-fusion primitives: confidence-weighted probability fusion across modalities, majority voting over discrete labels, and per-modality confidence gating.
 *
 * Improvement (record):
 * Build temporal PassAI for NFL pass-completion prediction: replace the single-frame image stream with a 5-frame sequence (snap, mid-drop, throw, catch-point, +0.5s) processed by a TimeSformer/VideoSwin stream alongside the stats MLP, targeting the failed-pass recall class (currently 70.8%) that single frames cannot fix.
 *
 * ACCEPTANCE GATE:
 * ACCEPT: two-stream model beats the tracking-only baseline by ≥2 percentage points accuracy AND ≥0.015 AUC on the held-out 2022 test, with the stats stream contributing (mean C_S > 0.2 in stage-1 attributions).
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: fusion utility. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2503.08945" as const;
export const LANE = "multimodal_fusion" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPT: two-stream model beats the tracking-only baseline by ≥2 percentage points accuracy AND ≥0.015 AUC on the held-out 2022 test, with the stats stream contributing (mean C_S > 0.2 in stage-1 attributions).`;

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

/**
 * Confidence-weighted fusion of per-modality probability vectors
 * (all modalities must share the class count).
 */
export function weightedFusion(probs: number[][], weights: number[]): number[] | null {
  if (probs.length === 0 || probs.length !== weights.length) return null;
  const first = probs[0];
  if (!first) return null;
  const n = first.length;
  if (n === 0) return null;
  if (!probs.every((p) => p.length === n && p.every(isFiniteNumber))) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const wSum = weights.reduce((s, w) => s + w, 0);
  if (wSum === 0) return null;
  const out: number[] = [];
  for (let j =  0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < probs.length; i++) s += (probs[i] as number[])[j] as number * (weights[i] as number);
    out.push(s / wSum);
  }
  return out;
}

/** Majority vote over discrete labels from each modality (ties -> first). */
export function majorityVote(labels: number[][]): number[] | null {
  if (labels.length === 0) return null;
  const first = labels[0];
  if (!first) return null;
  const n = first.length;
  if (!labels.every((l) => l.length === n && l.every((v) => Number.isInteger(v)))) return null;
  const out: number[] = [];
  for (let j = 0; j < n; j++) {
    const counts = new Map<number, number>();
    for (const l of labels) {
      const v = l[j] as number;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let best = first[j] as number;
    let bestN = -1;
    for (const [lab, c] of counts) {
      if (c > bestN) {
        bestN = c;
        best = lab;
      }
    }
    out.push(best);
  }
  return out;
}

/** Keep/drop gate per modality from confidence scores and a threshold. */
export function modalityGate(confidences: number[], threshold: number): boolean[] | null {
  if (!isFiniteNumber(threshold)) return null;
  if (!confidences.every(isFiniteNumber)) return null;
  return confidences.map((c) => c >= threshold);
}
