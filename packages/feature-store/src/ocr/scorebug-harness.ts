/**
 * Scorebug OCR evaluation harness — measurement target before any CV land.
 * Ship targets: clean field ≥0.98, exact match ≥0.97 on frozen gold set.
 */

export interface ScorebugGroundTruth {
  readonly frameId: string;
  readonly clock: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly quarter: number;
  readonly possession?: "home" | "away" | null;
}

export interface ScorebugPrediction {
  readonly frameId: string;
  readonly clock: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly quarter: number | null;
  readonly possession?: "home" | "away" | null;
}

export interface FrameResult {
  readonly frameId: string;
  readonly exact: boolean;
  readonly clean: boolean;
  readonly errors: string[];
}

export interface HarnessReport {
  readonly n: number;
  readonly exactRate: number;
  readonly cleanRate: number;
  readonly shipExact: boolean;
  readonly shipClean: boolean;
  readonly frames: FrameResult[];
}

const SHIP_EXACT = 0.97;
const SHIP_CLEAN = 0.98;

function fieldOk(
  pred: number | string | null | undefined,
  truth: number | string,
): boolean {
  if (pred == null) return false;
  return String(pred) === String(truth);
}

export function evaluateFrame(
  truth: ScorebugGroundTruth,
  pred: ScorebugPrediction,
): FrameResult {
  const errors: string[] = [];
  if (!fieldOk(pred.clock, truth.clock)) errors.push("clock");
  if (!fieldOk(pred.homeScore, truth.homeScore)) errors.push("homeScore");
  if (!fieldOk(pred.awayScore, truth.awayScore)) errors.push("awayScore");
  if (!fieldOk(pred.quarter, truth.quarter)) errors.push("quarter");
  if (truth.possession != null && pred.possession !== truth.possession) {
    errors.push("possession");
  }
  const exact = errors.length === 0;
  const clean =
    fieldOk(pred.clock, truth.clock) &&
    fieldOk(pred.homeScore, truth.homeScore) &&
    fieldOk(pred.awayScore, truth.awayScore) &&
    fieldOk(pred.quarter, truth.quarter);
  return { frameId: truth.frameId, exact, clean, errors };
}

export function runHarness(
  pairs: Array<{ truth: ScorebugGroundTruth; pred: ScorebugPrediction }>,
): HarnessReport {
  const frames = pairs.map((p) => evaluateFrame(p.truth, p.pred));
  const n = frames.length;
  const exactRate = n ? frames.filter((f) => f.exact).length / n : 0;
  const cleanRate = n ? frames.filter((f) => f.clean).length / n : 0;
  return {
    n,
    exactRate,
    cleanRate,
    shipExact: n > 0 && exactRate >= SHIP_EXACT,
    shipClean: n > 0 && cleanRate >= SHIP_CLEAN,
    frames,
  };
}
