import type { HistCalibrationRow, HistCandidate, HistDecisionRecord } from "./types.js";
import { decideHistCandidate, type DecideDeps } from "./multiprob-decision.js";

export interface WalkForwardSlice {
  from: Date;
  to: Date;
}

export function monthlySlices(startYear: number, endYear: number): WalkForwardSlice[] {
  const slices: WalkForwardSlice[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      slices.push({
        from: new Date(Date.UTC(y, m, 1)),
        to: new Date(Date.UTC(y, m + 1, 1)),
      });
    }
  }
  return slices;
}

export function replaySlice(
  candidates: readonly HistCandidate[],
  calibration: readonly HistCalibrationRow[],
  slice: WalkForwardSlice,
  deps: DecideDeps,
): HistDecisionRecord[] {
  const out: HistDecisionRecord[] = [];
  for (const c of candidates) {
    const t = c.decisionTime.getTime();
    if (t < slice.from.getTime() || t >= slice.to.getTime()) continue;
    out.push(decideHistCandidate(c, calibration, deps));
  }
  return out;
}

export function replayAll(
  candidates: readonly HistCandidate[],
  calibration: readonly HistCalibrationRow[],
  slices: readonly WalkForwardSlice[],
  deps: DecideDeps,
): HistDecisionRecord[] {
  const out: HistDecisionRecord[] = [];
  for (const s of slices) out.push(...replaySlice(candidates, calibration, s, deps));
  return out;
}
