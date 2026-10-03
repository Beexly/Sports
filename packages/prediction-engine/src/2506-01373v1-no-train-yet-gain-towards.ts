/**
 * arXiv:2506.01373v1 — No Train Yet Gain: Towards Generic Multi-Object Tracking in Sports and Beyond
 *
 * McByte gating pattern for the video-tracking lane: mask + motion association costs with jersey-number OCR
 * confidence fused as a third cue — in ambiguity, prefer the tracklet–detection pair whose OCR number
 * matches the tracklet's majority-vote number.
 *
 * Improvement: Adopt the McByte gating pattern for the video-tracking lane and fuse jersey-number OCR confidence as a third association cue alongside the mask: in ambiguity cases prefer the tracklet–detection pair whose OCR number matches the tracklet's majority-vote number — testing whether a football-specific identity cue beats the generic mask cue in same-uniform piles where masks are least reliable.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the McByte gating pattern if the McByte variant reduces ID switches by ≥ 30% vs ByteTrack on the 3-segment window with HOTA ≥ baseline; REJECT (keep ByteTrack/OC-SORT) if the gain is < 10% or throughput falls below 10 FPS offline-batch equivalent.
 */

/** Majority-vote jersey number over a tracklet's OCR reads. */
export function majorityVote(nums: readonly (number | null)[]): number | null {
  const counts = new Map<number, number>();
  for (const n of nums) {
    if (n === null) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestC = 0;
  for (const [n, c] of counts) {
    if (c > bestC) { bestC = c; best = n; }
  }
  return best;
}

/**
 * McByte association cost: mask cost + motion cost, minus an OCR bonus when
 * the detection's number matches the tracklet's majority-vote number.
 */
export function associationCost(
  maskCost: number,
  motionCost: number,
  ocrConf: number, // 0..1
  ocrNum: number | null,
  trackNum: number | null,
  ocrWeight: number,
): number {
  if (ocrConf < 0 || ocrConf > 1) throw new Error("associationCost: ocrConf in [0,1]");
  if (ocrWeight < 0) throw new Error("associationCost: ocrWeight >= 0");
  const bonus = ocrNum !== null && trackNum !== null && ocrNum === trackNum
    ? ocrWeight * ocrConf
    : 0;
  return maskCost + motionCost - bonus;
}

/**
 * Greedy frame-by-frame assignment + ID-switch count: an ID switch occurs
 * when a tracklet's matched detection id changes between frames.
 */
export function countIdSwitches(
  matches: readonly (readonly (number | null)[])[], // frames x tracklets -> detection id
): number {
  let switches = 0;
  for (let t = 0; t < (matches[0]?.length ?? 0); t++) {
    let prev: number | null = null;
    let started = false;
    for (const frame of matches) {
      const cur = frame[t] ?? null;
      if (!started) { prev = cur; started = true; continue; }
      if (cur !== null && prev !== null && cur !== prev) switches++;
      if (cur !== null) prev = cur;
    }
  }
  return switches;
}

/** ID-switch reduction of candidate vs baseline (fraction). */
export function idSwitchReduction(baseline: number, candidate: number): number {
  if (baseline <= 0) throw new Error("idSwitchReduction: baseline > 0");
  return (baseline - candidate) / baseline;
}
