/**
 * arXiv:2605.31529v2 — SVI-Bench: A Dynamic Microworld for Strategic Video Intelligence
 *
 * SVI-style data engine for NFL: game-clock alignment of broadcast clips to nflverse play-by-play,
 * cross-modal entity resolution into per-game identity graphs, three-stage QC, and a multiple-choice
 * outcome-forecasting eval protocol (accuracy by horizon + CE).
 *
 * Improvement: Replicate the SVI data-engine pattern for NFL: game-clock alignment of broadcast clips to nflverse play-by-play, cross-modal entity resolution into per-game identity graphs, LLM-assisted QA/forecast instance generation, three-stage QC; adopt the T5 multiple-choice outcome-forecasting eval protocol (fixed observation windows, target events beyond the window) for GSE's forecasting models.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the data-engine pattern and T5 eval protocol if: the NFL pilot corpus (10 games) achieves ≥ 95% auto-consistency of generated instances against play-by-play logs, and the T5-style eval reproduces the paper's qualitative pattern (accuracy degrading with horizon, CE measurable and improvable with finetuning).
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/**
 * Clock alignment: search candidate offsets; score = fraction of clips whose
 * shifted time lands within tol of a play-by-play event.
 */
export function alignClock(
  clipTimes: readonly number[],
  pbpTimes: readonly number[],
  offsets: readonly number[],
  tol: number,
): { offset: number; matchRate: number } {
  if (clipTimes.length === 0 || offsets.length === 0) throw new Error("alignClock: empty input");
  let best = offsets[0]!;
  let bestRate = -1;
  for (const off of offsets) {
    let hits = 0;
    for (const c of clipTimes) {
      if (pbpTimes.some((p) => Math.abs(c + off - p) <= tol)) hits++;
    }
    const rate = hits / clipTimes.length;
    if (rate > bestRate) { bestRate = rate; best = off; }
  }
  return { offset: best, matchRate: bestRate };
}

/**
 * Entity resolution: greedy bipartite match by similarity; returns the
 * fraction of entities resolved above threshold.
 */
export function entityResolution(
  sim: number[][], // rows: clip entities, cols: pbp entities
  thresh: number,
): number {
  if (sim.length === 0) throw new Error("entityResolution: empty");
  const usedCols = new Set<number>();
  let matched = 0;
  for (const row of sim) {
    let best = -1;
    let bestV = thresh;
    row.forEach((v, j) => {
      if (!usedCols.has(j) && v > bestV) { bestV = v; best = j; }
    });
    if (best >= 0) { usedCols.add(best); matched++; }
  }
  return matched / sim.length;
}

/** Three-stage QC: schema -> pbp-consistency -> dedupe. Returns failing stages. */
export function qcGates(inst: {
  hasSchema: boolean;
  pbpConsistent: boolean;
  duplicate: boolean;
}): string[] {
  const failed: string[] = [];
  if (!inst.hasSchema) failed.push("schema");
  if (!inst.pbpConsistent) failed.push("pbp-consistency");
  if (inst.duplicate) failed.push("dedupe");
  return failed;
}

/**
 * Multiple-choice outcome-forecasting eval: accuracy by horizon bucket and
 * calibration error of the chosen-option confidence.
 */
export function mcForecastEval(
  correct: readonly boolean[],
  horizons: readonly number[], // seconds beyond the observation window
  confidences: readonly number[],
  horizonBuckets: readonly [number, number][],
): { accByHorizon: number[]; ce: number } {
  if (correct.length !== horizons.length || correct.length !== confidences.length) {
    throw new Error("mcForecastEval: length mismatch");
  }
  const accByHorizon = horizonBuckets.map(([lo, hi]) => {
    const idx = horizons.map((h, i) => ({ h, i })).filter(({ h }) => h >= lo && h < hi);
    if (idx.length === 0) return NaN;
    return mean(idx.map(({ i }) => (correct[i] ? 1 : 0)));
  });
  // Calibration error: |mean confidence - accuracy| over deciles
  let ce = 0;
  for (let b = 0; b < 10; b++) {
    const idx = confidences.map((c, i) => ({ c, i })).filter(({ c }) => c >= b / 10 && c < (b + 1) / 10 + 1e-12);
    if (idx.length === 0) continue;
    const mc = mean(idx.map(({ c }) => c));
    const acc = mean(idx.map(({ i }) => (correct[i] ? 1 : 0)));
    ce += (idx.length / correct.length) * Math.abs(mc - acc);
  }
  return { accByHorizon, ce };
}
