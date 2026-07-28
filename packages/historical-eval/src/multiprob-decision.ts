import type {
  HistCalibrationRow,
  HistCandidate,
  HistDecisionRecord,
  HistNoBetReason,
  MultiprobInterval,
} from "./types.js";
import { formatStratumKey } from "./types.js";
import { assertProb, assertQuoteAsOf, filterCalibrationAsOf } from "./asof.js";

export interface DecisionThresholds {
  minStratumN: number;
  tauVig: number;
  maxWidth?: number;
}

export const DEFAULT_HIST_THRESHOLDS: DecisionThresholds = {
  minStratumN: 100,
  tauVig: 0,
  maxWidth: 0.12,
};

export type IntervalFn = (
  cal: readonly HistCalibrationRow[],
  score: number,
) => MultiprobInterval;

/** Test-only — production must inject real IVAP. */
export function testOnlyPointInterval(
  _cal: readonly HistCalibrationRow[],
  score: number,
): MultiprobInterval {
  const p = Math.min(0.99, Math.max(0.01, score));
  return { lo: p, hi: p, method: "test-point-NOT-FOR-PROD" };
}

export interface DecideDeps {
  intervalFn: IntervalFn;
  thresholds?: DecisionThresholds;
}

/** fire ⇔ n≥N ∧ width≤w_max ∧ (p_lo − q) > τ */
export function decideHistCandidate(
  candidate: HistCandidate,
  allCal: readonly HistCalibrationRow[],
  deps: DecideDeps,
): HistDecisionRecord {
  const th = deps.thresholds ?? DEFAULT_HIST_THRESHOLDS;
  const stratumKey = formatStratumKey(candidate.stratum);
  const base = {
    candidateId: candidate.id,
    decisionTime: candidate.decisionTime.toISOString(),
    stratumKey,
  };

  if (!candidate.placeable) {
    return {
      ...base,
      kind: "NOT_EVALUABLE",
      reasons: ["PLACEABLE"],
      summary: "Not placeable at decision time",
    };
  }
  if (!candidate.handicapOk) {
    return {
      ...base,
      kind: "NOT_EVALUABLE",
      reasons: ["HANDICAP"],
      summary: "Handicap mismatch at decision time",
    };
  }
  if (!candidate.quote) {
    return {
      ...base,
      kind: "NOT_EVALUABLE",
      reasons: ["STALE_OR_MISSING_ODDS"],
      summary: "No as-of quote",
    };
  }

  try {
    assertQuoteAsOf(candidate.quote, candidate.decisionTime);
    assertProb(candidate.quote.q, "q");
  } catch {
    return {
      ...base,
      kind: "NOT_EVALUABLE",
      reasons: ["STALE_OR_MISSING_ODDS"],
      summary: "Quote failed as-of or q integrity",
    };
  }

  const calStratum = filterCalibrationAsOf(allCal, candidate.decisionTime).filter(
    (r) =>
      r.stratum.sport === candidate.stratum.sport &&
      r.stratum.market === candidate.stratum.market &&
      r.stratum.modelVersion === candidate.stratum.modelVersion,
  );

  if (calStratum.length < th.minStratumN) {
    return {
      ...base,
      kind: "NO_BET",
      reasons: ["INSUFFICIENT_SAMPLE"],
      summary: `Stratum n=${calStratum.length} < ${th.minStratumN}`,
    };
  }

  const interval = deps.intervalFn(calStratum, candidate.score);
  const width = interval.hi - interval.lo;
  const reasons: HistNoBetReason[] = [];
  if (th.maxWidth != null && width > th.maxWidth) reasons.push("NO_BET_WIDTH");
  const q = candidate.quote.q;
  const edgeLcb = interval.lo - q;
  if (!(edgeLcb > th.tauVig)) reasons.push("NO_BET_LCB");

  if (reasons.length > 0) {
    return {
      ...base,
      kind: "NO_BET",
      reasons,
      interval,
      q,
      edgeLcb,
      summary: `NO_BET: ${reasons.join(",")}`,
    };
  }

  return {
    ...base,
    kind: "FIRE",
    reasons: [],
    interval,
    q,
    edgeLcb,
    summary: `FIRE: p_lo=${interval.lo.toFixed(3)} q=${q.toFixed(3)} edge=${edgeLcb.toFixed(3)}`,
  };
}
