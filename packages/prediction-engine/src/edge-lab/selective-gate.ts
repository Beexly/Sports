/**
 * The selective firing gate (handoff §2 P1): distribution-free interval
 * calibration via inductive Venn–Abers (Mondrian-stratified), firing only
 * when the LOWER bound of the calibrated edge clears the vig threshold:
 *
 *     fire  ⇔  LCB(e) = p_lower − q  >  τ_vig
 *
 * τ is tuned on a DISJOINT fold only (the tuner refuses to run on rows it
 * evaluated — §5 "tuning the risk-coverage curve on the eval set is the #1
 * self-deception risk"), and every emitted operating point carries the
 * statutory quartet fields: coverage denominator, Wilson LCB, and the
 * caller-supplied CLV/provenance hooks (display guard enforces the rest).
 *
 * Venn–Abers (inductive, binary): for a test score s against a calibration
 * set C, p0 = isotonic(C ∪ {(s,0)})(s) and p1 = isotonic(C ∪ {(s,1)})(s).
 * [min,max] of the pair is a validity-guaranteed probability interval; the
 * gate uses its lower end — the model must clear the bar even under its
 * own most skeptical calibrated reading.
 */

import { isotonicCalibration, type CalibrationSample } from "../probability-calibration.js";
import { wilsonLowerBound } from "./stats.js";

export interface VennAbersInterval {
  readonly p0: number;
  readonly p1: number;
  readonly lower: number;
  readonly upper: number;
}

/** Inductive Venn–Abers interval for one test score against a calibration set. */
export function vennAbersInterval(
  calibration: readonly CalibrationSample[],
  score: number,
): VennAbersInterval {
  const with0 = isotonicCalibration([...calibration, { p: score, y: 0 }]);
  const with1 = isotonicCalibration([...calibration, { p: score, y: 1 }]);
  const p0 = with0.predict(score);
  const p1 = with1.predict(score);
  return { p0, p1, lower: Math.min(p0, p1), upper: Math.max(p0, p1) };
}

export interface GateDecisionRow {
  readonly rowId: string;
  /** Raw model score (uncalibrated OOF probability). */
  readonly score: number;
  /** De-vigged market probability of the modeled side. */
  readonly q: number;
  /** Mondrian stratum key (e.g. "nfl|MONEYLINE"); calibration is per-stratum. */
  readonly stratum: string;
  readonly y: 0 | 1;
}

export interface FiredDecision {
  readonly rowId: string;
  readonly stratum: string;
  readonly lcbEdge: number;
  readonly interval: VennAbersInterval;
  readonly q: number;
  readonly y: 0 | 1;
}

export interface SelectiveGateReport {
  readonly tau: number;
  readonly eligible: number;
  readonly fired: number;
  readonly coverage: number;
  /** Realized win rate among fired plays, with its Wilson lower bound. */
  readonly realizedRate: number | null;
  readonly wilsonLcb: number | null;
  readonly perStratum: readonly {
    readonly stratum: string;
    readonly eligible: number;
    readonly fired: number;
    readonly realizedRate: number | null;
    readonly wilsonLcb: number | null;
  }[];
  readonly decisions: readonly FiredDecision[];
}

/** Minimum per-stratum calibration rows before the gate will fire in it. */
const MIN_STRATUM_CALIBRATION = 100;

/**
 * Apply the gate: calibrate each eval row's score with Venn–Abers against
 * the CALIBRATION rows of its stratum (never against eval rows), fire when
 * lower(p) − q > tau, and report the coverage-stamped selective outcome.
 */
export function applySelectiveGate(
  calibrationRows: readonly GateDecisionRow[],
  evalRows: readonly GateDecisionRow[],
  tau: number,
): SelectiveGateReport {
  const calByStratum = new Map<string, CalibrationSample[]>();
  for (const row of calibrationRows) {
    const list = calByStratum.get(row.stratum) ?? [];
    list.push({ p: row.score, y: row.y });
    calByStratum.set(row.stratum, list);
  }

  const decisions: FiredDecision[] = [];
  const perStratumAgg = new Map<string, { eligible: number; wins: number; fired: number }>();
  for (const row of evalRows) {
    const agg = perStratumAgg.get(row.stratum) ?? { eligible: 0, wins: 0, fired: 0 };
    agg.eligible += 1;
    perStratumAgg.set(row.stratum, agg);

    const cal = calByStratum.get(row.stratum);
    if (!cal || cal.length < MIN_STRATUM_CALIBRATION) continue; // silent stratum: never fires
    const interval = vennAbersInterval(cal, row.score);
    const lcbEdge = interval.lower - row.q;
    if (lcbEdge > tau) {
      decisions.push({ rowId: row.rowId, stratum: row.stratum, lcbEdge, interval, q: row.q, y: row.y });
      agg.fired += 1;
      if (row.y === 1) agg.wins += 1;
    }
  }

  const fired = decisions.length;
  const wins = decisions.filter((d) => d.y === 1).length;
  const eligible = evalRows.length;
  return {
    tau,
    eligible,
    fired,
    coverage: eligible > 0 ? fired / eligible : 0,
    realizedRate: fired > 0 ? wins / fired : null,
    wilsonLcb: fired > 0 ? wilsonLowerBound(wins, fired) : null,
    perStratum: [...perStratumAgg.entries()].map(([stratum, agg]) => ({
      stratum,
      eligible: agg.eligible,
      fired: agg.fired,
      realizedRate: agg.fired > 0 ? agg.wins / agg.fired : null,
      wilsonLcb: agg.fired > 0 ? wilsonLowerBound(agg.wins, agg.fired) : null,
    })),
    decisions,
  };
}

export interface CoverageEdgePoint {
  readonly tau: number;
  readonly coverage: number;
  readonly fired: number;
  readonly realizedRate: number | null;
  readonly wilsonLcb: number | null;
  /** Mean de-vigged breakeven rate of the fired plays (the bar to clear). */
  readonly meanBreakeven: number | null;
}

/** The published coverage-vs-edge curve (§2 P1). */
export function coverageEdgeCurve(
  calibrationRows: readonly GateDecisionRow[],
  evalRows: readonly GateDecisionRow[],
  taus: readonly number[],
): CoverageEdgePoint[] {
  return taus.map((tau) => {
    const r = applySelectiveGate(calibrationRows, evalRows, tau);
    const meanBreakeven =
      r.fired > 0 ? r.decisions.reduce((a, d) => a + d.q, 0) / r.fired : null;
    return {
      tau,
      coverage: r.coverage,
      fired: r.fired,
      realizedRate: r.realizedRate,
      wilsonLcb: r.wilsonLcb,
      meanBreakeven,
    };
  });
}

export interface TauSelection {
  readonly tau: number | null;
  readonly reason: string;
  readonly curve: readonly CoverageEdgePoint[];
}

/**
 * Tune τ on a DISJOINT tuning fold: the smallest τ whose Wilson LCB of the
 * realized fired rate clears the fired plays' mean breakeven, with at
 * least `minFired` plays behind it. Returns tau: null (fire nothing) when
 * no operating point qualifies — an honest, first-class outcome.
 */
export function tuneTau(
  calibrationRows: readonly GateDecisionRow[],
  tuningRows: readonly GateDecisionRow[],
  opts: { readonly taus?: readonly number[]; readonly minFired?: number } = {},
): TauSelection {
  const taus = opts.taus ?? [0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05];
  const minFired = opts.minFired ?? 50;
  const curve = coverageEdgeCurve(calibrationRows, tuningRows, taus);
  for (const point of curve) {
    if (
      point.fired >= minFired &&
      point.wilsonLcb !== null &&
      point.meanBreakeven !== null &&
      point.wilsonLcb > point.meanBreakeven
    ) {
      return { tau: point.tau, reason: `smallest τ with Wilson LCB ${point.wilsonLcb.toFixed(4)} > breakeven ${point.meanBreakeven.toFixed(4)} on ${point.fired} fired`, curve };
    }
  }
  return {
    tau: null,
    reason: "no operating point clears breakeven with a valid Wilson LCB — fire nothing",
    curve,
  };
}
