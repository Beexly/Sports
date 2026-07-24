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
import { ivapPredict, type IvapCalibrationPoint } from "../calibration/ivap.js";
import { cvapPredict } from "../calibration/cvap.js";
import {
  assignMondrianCategory,
  type SportsGameContext,
  type TaxonomyCategory,
} from "../conformal/sports-taxonomy.js";
import { learnThenTest, type LttCandidate } from "./phase4-research.js";
import { regularizedIncompleteBeta, wilsonLowerBound } from "./stats.js";

export interface VennAbersInterval {
  readonly p0: number;
  readonly p1: number;
  readonly lower: number;
  readonly upper: number;
}

/**
 * Which multiprobability estimator produces the calibrated interval the gate
 * fires on.
 *
 * "legacy-isotonic" is the DEFAULT and is exactly the behavior this file has
 * always had (`vennAbersInterval` above) — callers that pass no options get a
 * bit-for-bit unchanged decision path. The other two are opt-in.
 */
export type MultiprobSource = "legacy-isotonic" | "ivap" | "cvap";

export interface MultiprobGateOptions {
  /** Estimator for the calibrated interval. Default "legacy-isotonic". */
  readonly source?: MultiprobSource;
  /** Folds for source "cvap". Default 5. Ignored otherwise. */
  readonly cvapFolds?: number;
  /**
   * First-class No-Bet: refuse to fire when the calibrated interval is wider
   * than this, however good the lower bound looks. An interval this wide means
   * the calibration set does not actually pin the probability down, and a
   * point estimate drawn from it would be a confident-sounding guess.
   * Undefined (default) disables the check.
   */
  readonly maxWidthForFire?: number;
  /** Optional game context; when supplied every decision carries its Mondrian category. */
  readonly taxonomyCtx?: SportsGameContext;
}

/** Why a row that cleared τ was still not fired. */
export type NoBetReason = "interval_too_wide";

/**
 * Compute the calibrated interval under the selected estimator.
 *
 * Every branch returns the SAME `VennAbersInterval` shape with `lower`/`upper`
 * ordered, so the gate's firing rule is identical regardless of source — only
 * the estimate changes, never the decision semantics.
 */
function intervalFromSource(
  cal: readonly CalibrationSample[],
  score: number,
  options: MultiprobGateOptions,
): VennAbersInterval {
  const source = options.source ?? "legacy-isotonic";
  if (source === "legacy-isotonic") return vennAbersInterval(cal, score);

  const points: IvapCalibrationPoint[] = cal.map((c) => ({ score: c.p, label: c.y }));
  const pred =
    source === "cvap"
      ? cvapPredict(points, score, { folds: options.cvapFolds })
      : ivapPredict(points, score);
  const lower = Math.min(pred.p0, pred.p1);
  const upper = Math.max(pred.p0, pred.p1);
  return { p0: pred.p0, p1: pred.p1, lower, upper };
}

/**
 * Thrown when two row sets that must play disjoint roles (calibration vs
 * tuning vs eval) share a rowId — the enforcement behind this file's header
 * claim ("the tuner refuses to run on rows it evaluated"), which was
 * previously just prose (style: asof-store's AsOfViolationError).
 */
export class GateSetOverlapError extends Error {
  constructor(message: string, readonly offendingIds: readonly string[]) {
    super(message);
    this.name = "GateSetOverlapError";
  }
}

/**
 * Pairwise-disjointness assertion (calibration vs tuning vs eval): every
 * gate entry point that accepts more than one row set calls this first.
 * Only the pairs actually passed together at a given call site are checked
 * (applySelectiveGate: calibration vs eval; tuneTau: calibration vs
 * tuning), but calling this at every entry point transitively enforces full
 * three-way disjointness across a correct calibration -> tuning -> eval
 * workflow (tuneTau's calibration/tuning rows must also be disjoint from
 * whatever is later passed to applySelectiveGate as eval).
 */
function assertDisjointRowSets(
  sets: readonly { readonly name: string; readonly rows: readonly { readonly rowId: string }[] }[],
): void {
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i]!;
      const b = sets[j]!;
      const bIds = new Set(b.rows.map((r) => r.rowId));
      const overlap = [...new Set(a.rows.map((r) => r.rowId).filter((id) => bIds.has(id)))];
      if (overlap.length > 0) {
        throw new GateSetOverlapError(
          `"${a.name}" and "${b.name}" row sets are not disjoint — ${overlap.length} rowId(s) ` +
            `appear in both, and the tuner/gate refuses to run on rows it also evaluates in ` +
            `another role: ${overlap.join(", ")}`,
          overlap,
        );
      }
    }
  }
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
  /** De-vigged market probability of the modeled side. EDGE ATTRIBUTION only
   * (see FIX 4 note on meanBreakeven) — the firing decision (lcbEdge) is
   * always computed against this, never against obtainableDecimalPrice. */
  readonly q: number;
  /** Mondrian stratum key (e.g. "nfl|MONEYLINE"); calibration is per-stratum. */
  readonly stratum: string;
  readonly y: 0 | 1;
  /**
   * The real, obtainable decimal price for this row's modeled side, when
   * known (e.g. a captured book quote). When present, THIS row's breakeven
   * bar for realized-result evaluation is 1/obtainableDecimalPrice (the true
   * vig-inclusive bar), not the devigged q. Absent -> falls back to q.
   */
  readonly obtainableDecimalPrice?: number;
}

export interface FiredDecision {
  readonly rowId: string;
  readonly stratum: string;
  readonly lcbEdge: number;
  readonly interval: VennAbersInterval;
  readonly q: number;
  readonly y: 0 | 1;
  readonly obtainableDecimalPrice?: number;
  /**
   * Width of the calibrated interval (upper − lower) — how much the
   * calibration set actually pins this probability down. Always populated, so
   * the ledger records the honesty of every fired decision, not just its edge.
   */
  readonly width: number;
  /** Which multiprobability estimator produced `interval`. */
  readonly multiprobSource: MultiprobSource;
  /** Mondrian taxonomy category, when a game context was supplied. */
  readonly taxonomyCategory?: TaxonomyCategory;
}

/**
 * Per-row breakeven rate for REALIZED-RESULT evaluation (meanBreakeven,
 * tuneTau's exact-binomial p-values): 1/obtainableDecimalPrice when a real
 * obtainable price is known (the true, vig-inclusive bar a bettor actually
 * had to clear), else the devigged market probability q. q ALSO drives
 * lcbEdge (edge attribution / the firing decision itself) unconditionally —
 * this function is never used there. Devigged q is not itself the wrong
 * number; it is the wrong number for "did this beat the price we could get."
 */
function rowBreakeven(row: { readonly q: number; readonly obtainableDecimalPrice?: number }): number {
  return row.obtainableDecimalPrice !== undefined ? 1 / row.obtainableDecimalPrice : row.q;
}

/**
 * strictObtainable enforcement: every FIRED decision must carry a real
 * obtainableDecimalPrice, or the caller is told exactly which rowIds are
 * missing one rather than silently falling back to devigged q for them.
 */
function assertObtainablePrices(decisions: readonly FiredDecision[]): void {
  const missing = decisions.filter((d) => d.obtainableDecimalPrice === undefined).map((d) => d.rowId);
  if (missing.length > 0) {
    throw new RangeError(
      `strictObtainable requires obtainableDecimalPrice on every fired row; missing on ` +
        `${missing.length} row(s): ${missing.join(", ")}`,
    );
  }
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
  /** Which estimator produced the intervals in this report. */
  readonly multiprobSource: MultiprobSource;
  /**
   * Rows that cleared τ but were vetoed for having too wide a calibrated
   * interval. Reported rather than silently dropped: a large number here means
   * the gate is firing far less than τ alone suggests, and an operator reading
   * only `coverage` would not otherwise see why.
   */
  readonly widthNoBets: number;
}

/**
 * Minimum per-stratum calibration rows before the gate will fire in it.
 *
 * Exported so a consumer can distinguish "we evaluated this stratum and
 * declined" from "we never had enough settled history to evaluate it at all".
 * Those are very different things to tell a user, and a consumer that cannot
 * tell them apart ends up reporting a confident refusal where the truth is an
 * absence of evidence.
 */
export const MIN_STRATUM_CALIBRATION = 100;

/**
 * Apply the gate: calibrate each eval row's score with Venn–Abers against
 * the CALIBRATION rows of its stratum (never against eval rows), fire when
 * lower(p) − q > tau, and report the coverage-stamped selective outcome.
 */
export function applySelectiveGate(
  calibrationRows: readonly GateDecisionRow[],
  evalRows: readonly GateDecisionRow[],
  tau: number,
  options: MultiprobGateOptions = {},
): SelectiveGateReport {
  assertDisjointRowSets([
    { name: "calibration", rows: calibrationRows },
    { name: "eval", rows: evalRows },
  ]);
  const calByStratum = new Map<string, CalibrationSample[]>();
  for (const row of calibrationRows) {
    const list = calByStratum.get(row.stratum) ?? [];
    list.push({ p: row.score, y: row.y });
    calByStratum.set(row.stratum, list);
  }

  const source = options.source ?? "legacy-isotonic";
  const widthCap = options.maxWidthForFire;
  const taxonomyCategory = options.taxonomyCtx
    ? assignMondrianCategory(options.taxonomyCtx)
    : undefined;
  let widthNoBets = 0;

  const decisions: FiredDecision[] = [];
  const perStratumAgg = new Map<string, { eligible: number; wins: number; fired: number }>();
  for (const row of evalRows) {
    const agg = perStratumAgg.get(row.stratum) ?? { eligible: 0, wins: 0, fired: 0 };
    agg.eligible += 1;
    perStratumAgg.set(row.stratum, agg);

    const cal = calByStratum.get(row.stratum);
    if (!cal || cal.length < MIN_STRATUM_CALIBRATION) continue; // silent stratum: never fires
    const interval = intervalFromSource(cal, row.score, options);
    const width = interval.upper - interval.lower;
    // Edge attribution ALWAYS uses devigged q, never obtainableDecimalPrice
    // (FIX 4: q stays the attribution baseline; the real price only changes
    // the realized-result breakeven bar computed downstream).
    const lcbEdge = interval.lower - row.q;

    if (lcbEdge > tau) {
      // Second first-class No-Bet signal. Clearing τ is necessary but no
      // longer sufficient: an interval wider than the caller's tolerance means
      // the calibration set does not pin this probability down, so firing on
      // its lower end would be reading precision into noise.
      //
      // Deliberately checked INSIDE the τ branch: widthNoBets must count only
      // rows the gate would otherwise have fired. Vetoing before the τ test
      // would also sweep up rows that were never going to fire, inflating the
      // count and making the width cap look far more active than it is.
      if (widthCap !== undefined && width > widthCap) {
        widthNoBets += 1;
        continue;
      }
      decisions.push({
        rowId: row.rowId,
        stratum: row.stratum,
        lcbEdge,
        interval,
        q: row.q,
        y: row.y,
        obtainableDecimalPrice: row.obtainableDecimalPrice,
        width,
        multiprobSource: source,
        taxonomyCategory,
      });
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
    multiprobSource: source,
    widthNoBets,
  };
}

export interface CoverageEdgePoint {
  readonly tau: number;
  readonly coverage: number;
  readonly fired: number;
  readonly realizedRate: number | null;
  readonly wilsonLcb: number | null;
  /**
   * Mean breakeven rate of the fired plays (the bar to clear) — per row,
   * 1/obtainableDecimalPrice when a real obtainable price is known (the
   * true, vig-inclusive bar), else the devigged q. Devigged q remains the
   * edge-ATTRIBUTION baseline only (lcbEdge, unconditionally); this field
   * answers "what win rate breaks even at the price actually obtainable."
   */
  readonly meanBreakeven: number | null;
}

export interface CoverageEdgeCurveOptions {
  /**
   * When true, every FIRED row at every tau must carry a real
   * obtainableDecimalPrice — throws (naming the missing rowIds) rather than
   * silently falling back to devigged q for any of them. Default false.
   */
  readonly strictObtainable?: boolean;
}

/** The published coverage-vs-edge curve (§2 P1). */
export function coverageEdgeCurve(
  calibrationRows: readonly GateDecisionRow[],
  evalRows: readonly GateDecisionRow[],
  taus: readonly number[],
  opts: CoverageEdgeCurveOptions = {},
): CoverageEdgePoint[] {
  return taus.map((tau) => {
    const r = applySelectiveGate(calibrationRows, evalRows, tau);
    if (opts.strictObtainable) assertObtainablePrices(r.decisions);
    const meanBreakeven =
      r.fired > 0 ? r.decisions.reduce((a, d) => a + rowBreakeven(d), 0) / r.fired : null;
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

export interface TuneTauOptions {
  readonly taus?: readonly number[];
  readonly minFired?: number;
  /** Fixed-sequence FWER budget fed to learnThenTest (default 0.05). */
  readonly delta?: number;
  /** Forwarded to coverageEdgeCurve — see CoverageEdgeCurveOptions. */
  readonly strictObtainable?: boolean;
}

/**
 * Tune τ on a DISJOINT tuning fold using fixed-sequence Learn-then-Test
 * (Angelopoulos et al.) instead of an uncorrected multi-look grid scan —
 * scanning every τ independently and taking whichever one happens to clear
 * a bar is exactly the "tuning the risk-coverage curve on the eval set is
 * the #1 self-deception risk" multiplicity failure this module's header
 * warns about (only worse: it doesn't even need the eval set to fail, a
 * wide-enough tau grid on the TUNING set alone inflates the false-positive
 * rate the same way).
 *
 * Candidates are ordered MOST-CONSERVATIVE FIRST (largest τ = fires the
 * fewest plays = hardest to pass by chance) and tested in that fixed
 * sequence; learnThenTest accepts while each candidate's p-value <= delta
 * and STOPS at the first failure — later, looser candidates are never
 * tested once one fails, which is what controls the family-wise error rate
 * at delta with no Bonferroni-style power loss (§5's "phase4-research.ts
 * learnThenTest sits unused" is exactly the tool this rewrite puts to use).
 *
 * Each candidate's p-value is a valid ONE-SIDED EXACT test of "the fired
 * set's true win rate is at most its breakeven" against "it's higher":
 * under the null that the true rate equals breakeven b, wins ~
 * Binomial(fired, b), and
 *
 *     p = P[wins' >= wins | fired, b] = I_b(wins, fired - wins + 1)
 *
 * via the regularized incomplete beta identity (stats.ts's
 * regularizedIncompleteBeta — no normal approximation, no Wilson interval,
 * exact for any fired count). Breakeven here follows FIX 4's per-row rule
 * (coverageEdgeCurve's meanBreakeven: 1/obtainableDecimalPrice per row when
 * known, else devigged q) via the same `opts.strictObtainable` passthrough.
 *
 * Returns the LOOSEST accepted τ — the smallest τ in the accepted
 * fixed-sequence prefix, i.e. the operating point that fires the most while
 * still surviving every more-conservative test ahead of it in the
 * sequence. Returns tau: null (fire nothing) when no candidate is accepted
 * — an honest, first-class outcome, exactly as before.
 */
export function tuneTau(
  calibrationRows: readonly GateDecisionRow[],
  tuningRows: readonly GateDecisionRow[],
  opts: TuneTauOptions = {},
): TauSelection {
  assertDisjointRowSets([
    { name: "calibration", rows: calibrationRows },
    { name: "tuning", rows: tuningRows },
  ]);
  const taus = opts.taus ?? [0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05];
  const minFired = opts.minFired ?? 50;
  const delta = opts.delta ?? 0.05;
  const curve = coverageEdgeCurve(calibrationRows, tuningRows, taus, {
    strictObtainable: opts.strictObtainable,
  });

  // Candidates the grid can even speak to: enough fired plays for the exact
  // test to mean anything, and a defined breakeven. Points that don't meet
  // this bar are excluded from the candidate universe entirely (not tested
  // and not treated as a sequence-stopping failure) — a design choice, not
  // a multiplicity loophole: minFired is a data-sufficiency prerequisite
  // fixed before looking at outcomes, identical in spirit to the old
  // implementation's `point.fired >= minFired` gate.
  const candidates: LttCandidate[] = [];
  for (const point of curve) {
    if (point.fired < minFired || point.meanBreakeven === null || point.realizedRate === null) continue;
    const wins = Math.round(point.realizedRate * point.fired);
    const pValue = regularizedIncompleteBeta(point.meanBreakeven, wins, point.fired - wins + 1);
    candidates.push({ threshold: point.tau, pValue });
  }

  const accepted = learnThenTest(candidates, delta);
  if (accepted.length === 0) {
    return {
      tau: null,
      reason:
        `no operating point survives the fixed-sequence exact-binomial test at delta=${delta} ` +
        `(${candidates.length} candidate(s) considered) — fire nothing`,
      curve,
    };
  }
  // learnThenTest orders most-conservative (largest τ) first and returns the
  // accepted PREFIX in that same order; the last element is therefore the
  // smallest — loosest — τ still standing after the fixed-sequence test.
  const loosest = accepted[accepted.length - 1]!;
  return {
    tau: loosest.threshold,
    reason:
      `loosest τ=${loosest.threshold} accepted by the fixed-sequence exact-binomial test ` +
      `(p=${loosest.pValue.toFixed(4)} <= delta=${delta}), ${accepted.length}/${candidates.length} ` +
      `candidate(s) accepted most-conservative-first`,
    curve,
  };
}
