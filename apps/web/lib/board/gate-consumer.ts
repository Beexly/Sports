/**
 * The first PRODUCTION consumer of `applySelectiveGate`.
 *
 * Until this existed, the selective gate ran only in `scripts/edge-lab/`
 * research paths, so the product's central honesty claim — that it refuses to
 * bet when it cannot justify betting — was not reachable from any surface a
 * user could see. This module closes that gap by feeding the REAL gate with
 * REAL rows and reporting the REAL outcome, including the outcome nobody likes:
 * that there is not yet enough settled history to fire anything.
 *
 * WHAT IS REAL HERE, precisely:
 *   score  — Pick.confidence / 100 (the model's own number, not a proxy)
 *   y      — Pick.result, WIN → 1 and LOSS → 0. PUSH/VOID/PENDING are excluded
 *            entirely rather than coerced, because a push is not a loss and
 *            calling it one would quietly bias the calibration set.
 *   q      — genuinely DE-VIGGED, via removeVig() over both sides' implied
 *            probabilities from the Odds table. Not a one-sided implied price
 *            dressed up as a fair value.
 *   stratum— `${sport}|${pickType}`, matching the gate's Mondrian expectation.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *   - It does not write to the ledger. `FiredDecision` has no production
 *     persistence path (see PRODUCT_CASCADE_MAP.md); inventing one here would
 *     be the bridge that map explicitly blocks.
 *   - It does not fabricate a calibration set to make the gate fire. If a
 *     stratum lacks MIN_STRATUM_CALIBRATION settled rows, the honest answer is
 *     INSUFFICIENT_CALIBRATION, and that is what it returns.
 */

// Deep submodule import, NOT the package barrel — following the precedent the
// barrel itself documents at its foot for the promotion gate: edge-lab is
// server-only, and the barrel is imported by client components, so widening it
// risks dragging a server dependency into the browser bundle (that exact
// mistake broke a Vercel build once already, via node:crypto). selective-gate's
// import graph is pure today, but a deep import means it cannot become a
// bundle problem if that ever changes.
import {
  applySelectiveGate,
  MIN_STRATUM_CALIBRATION,
  type FiredDecision,
  type GateDecisionRow,
  type MultiprobGateOptions,
  type SelectiveGateReport,
} from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import {
  evaluateFireAuthority,
  type FireAuthorityDecision,
} from "@sports/prediction-engine/src/edge-lab/fire-authority.js";

/**
 * Why a candidate did or did not fire. These are the only four answers, and
 * each maps to something the gate actually computed — none is a UI-side guess.
 */
export type GateOutcomeCode =
  /** Cleared τ (and the width cap, when set). */
  | "FIRE"
  /** Evaluated against a real calibration set; the lower bound did not clear τ. */
  | "NO_BET_LCB"
  /** Cleared τ but the calibrated interval was too wide to trust. */
  | "NO_BET_WIDTH"
  /** Never evaluated: this stratum has too little settled history to calibrate. */
  | "INSUFFICIENT_CALIBRATION"
  /**
   * Never reached the gate: a required input was absent (no two-sided odds to
   * devig, so no honest `q`). Reported rather than dropped — a candidate that
   * silently disappears from the board is indistinguishable from one we
   * considered and declined, and only one of those is true.
   */
  | "NOT_EVALUATED_MISSING_INPUTS";

/** A candidate that could not be turned into a gate row, and why. */
export interface ExcludedCandidate {
  readonly rowId: string;
  readonly stratum: string;
  /** Which required field(s) were unavailable, e.g. ["q (no two-sided odds)"]. */
  readonly missing: readonly string[];
}

export interface GateOutcome {
  readonly rowId: string;
  readonly stratum: string;
  readonly code: GateOutcomeCode;
  /** Plain-language reason, safe to show any visitor on any tier. */
  readonly reason: string;
  /** Present only for rows the gate actually evaluated. */
  readonly lcbEdge?: number;
  /** Calibrated-interval width. Paid detail — gate at the call site. */
  readonly width?: number;
  /** Which estimator produced the interval. Paid detail. */
  readonly multiprobSource?: FiredDecision["multiprobSource"];
  /**
   * Product authorization. true only when multiprob code is FIRE AND
   * evaluateFireAuthority allows (LIVE_BOARD + dual-asOf + cal + quote).
   * Multiprob FIRE with publicFire=false is the production default.
   */
  readonly publicFire: boolean;
  /** Fire-authority refuse reason when multiprob FIRE was held. */
  readonly authorityHoldReason?: string;
}

export interface BoardGateEvaluation {
  readonly outcomes: readonly GateOutcome[];
  /**
   * The gate's own report, with every REALIZED-OUTCOME statistic forced to
   * null. See `blindRealizedStats` — for live candidates the outcome has not
   * happened yet, so any realized rate computed from them is fabricated.
   */
  readonly report: SelectiveGateReport;
  /** Strata that could not be evaluated at all, with their settled-row counts. */
  readonly uncalibratedStrata: readonly { stratum: string; calibrationRows: number }[];
  readonly tau: number;
  /**
   * Fire-authority composition applied after multiprob.
   * LIVE_BOARD defaults false — multiprob FIRE is held, never public-published.
   */
  readonly fireAuthority: {
    readonly liveBoardOn: boolean;
    readonly dualAsOfOk: boolean;
    readonly calibrationReady: boolean;
    readonly quoteFresh: boolean;
    /** How many multiprob FIREs were held by fire-authority. */
    readonly held: number;
    /** How many multiprob FIREs survived authority (requires liveBoardOn). */
    readonly authorized: number;
  };
}

/** Optional product topology inputs for fire-authority composition. */
export interface FireAuthorityBoardOpts {
  /** Production default false. Founder-only flip. */
  readonly liveBoardOn?: boolean;
  /** Dual-asOf six-gate already passed. Default true for multiprob-only boards. */
  readonly dualAsOfOk?: boolean;
  readonly dualAsOfCode?: string;
  readonly dualAsOfEdge?: number;
  /** Certificate / cohort ready. Default true when cal rows ≥ min. */
  readonly calibrationReady?: boolean;
  /** Quote plane within dynamic freshness. Default true when odds built. */
  readonly quoteFresh?: boolean;
}

const REASONS: Record<GateOutcomeCode, string> = {
  FIRE: "Cleared the edge threshold on its calibrated lower bound.",
  NO_BET_LCB:
    "No bet — the calibrated lower bound did not clear the market's price after vig.",
  NO_BET_WIDTH:
    "No bet — the calibrated probability range was too wide to act on, even though the midpoint looked favourable.",
  INSUFFICIENT_CALIBRATION:
    "No bet — not enough settled history in this category yet to calibrate a trustworthy probability.",
  NOT_EVALUATED_MISSING_INPUTS:
    "Not evaluated — a required input was missing, so this was never put to the model. This is not a judgement about the game.",
};

/**
 * Strip realized-outcome statistics from a report over LIVE candidates.
 *
 * `GateDecisionRow.y` is required by the gate's row type but is unknowable for
 * a pick that has not settled, so `buildCandidateRows` sets it to an inert 0.
 * The gate cannot know that: it computes `realizedRate` and `wilsonLcb` over
 * fired rows from `y`, so a board where three candidates fired would report a
 * realized rate of 0 — a 0% win rate that reads as measured and is in fact
 * three games that have not been played.
 *
 * That is the single most dangerous number this module could emit, on a
 * product whose claim is that it does not publish numbers it cannot support.
 * `null` is the truthful value: not zero, not withheld — unknown.
 */
function blindRealizedStats(report: SelectiveGateReport): SelectiveGateReport {
  return {
    ...report,
    realizedRate: null,
    wilsonLcb: null,
    perStratum: report.perStratum.map((s) => ({
      ...s,
      realizedRate: null,
      wilsonLcb: null,
    })),
  };
}

/**
 * Pure core: given calibration and candidate rows, run the real gate and
 * classify every candidate. Kept free of Prisma so the classification logic is
 * testable without a database, which is where the honesty-critical branches
 * live.
 */
export function evaluateBoardGate(
  calibrationRows: readonly GateDecisionRow[],
  candidateRows: readonly GateDecisionRow[],
  tau: number,
  options: MultiprobGateOptions = {},
  /** Candidates that could not be built into gate rows. Reported, never dropped. */
  excluded: readonly ExcludedCandidate[] = [],
  authority: FireAuthorityBoardOpts = {},
): BoardGateEvaluation {
  const report = applySelectiveGate(calibrationRows, candidateRows, tau, options);

  const calCountByStratum = new Map<string, number>();
  for (const row of calibrationRows) {
    calCountByStratum.set(row.stratum, (calCountByStratum.get(row.stratum) ?? 0) + 1);
  }

  const firedById = new Map<string, FiredDecision>();
  for (const d of report.decisions) firedById.set(d.rowId, d);

  const widthCap = options.maxWidthForFire;
  const widthVetoed = new Set(report.widthVetoedRowIds);

  // Product defaults: LIVE_BOARD hard off. Multiprob FIRE is held, not published.
  const liveBoardOn = authority.liveBoardOn === true;
  const dualAsOfOk = authority.dualAsOfOk !== false;
  const quoteFresh = authority.quoteFresh !== false;
  // Calibration readiness: explicit override, else any stratum that met min.
  const anyStratumCalibrated = [...calCountByStratum.values()].some(
    (n) => n >= MIN_STRATUM_CALIBRATION,
  );
  const calibrationReady =
    authority.calibrationReady !== undefined
      ? authority.calibrationReady
      : anyStratumCalibrated;

  let held = 0;
  let authorized = 0;

  const outcomes: GateOutcome[] = candidateRows.map((row) => {
    const fired = firedById.get(row.rowId);
    if (fired) {
      const auth: FireAuthorityDecision = evaluateFireAuthority({
        dualAsOfOk,
        dualAsOfEdge: authority.dualAsOfEdge ?? fired.lcbEdge,
        dualAsOfCode: authority.dualAsOfCode,
        calibrationReady,
        liveBoardOn,
        quoteFresh,
        selectiveWouldFire: true,
        edge: fired.lcbEdge,
      });
      if (auth.fire) {
        authorized += 1;
      } else {
        held += 1;
      }
      return {
        rowId: row.rowId,
        stratum: row.stratum,
        code: "FIRE" as const,
        reason: REASONS.FIRE,
        lcbEdge: fired.lcbEdge,
        width: fired.width,
        multiprobSource: fired.multiprobSource,
        publicFire: auth.fire,
        authorityHoldReason: auth.fire ? undefined : auth.reason,
      };
    }

    // Not fired. Distinguish "never evaluated" from "evaluated and declined" —
    // conflating them would report a confident refusal where the truth is that
    // we had nothing to judge with.
    const calRows = calCountByStratum.get(row.stratum) ?? 0;
    if (calRows < MIN_STRATUM_CALIBRATION) {
      return {
        rowId: row.rowId,
        stratum: row.stratum,
        code: "INSUFFICIENT_CALIBRATION",
        reason: REASONS.INSUFFICIENT_CALIBRATION,
        publicFire: false,
      };
    }

    // Evaluated. Attribute the refusal to THIS row's own veto, not to the
    // report's aggregate counter.
    //
    // The earlier version asked `report.widthNoBets > 0`, which is a global
    // count across every stratum. One width veto anywhere therefore relabelled
    // every lower-bound failure everywhere as a width veto — a confident public
    // reason that was simply wrong, and exactly the class of mistake this
    // module exists to prevent. The gate now reports which rows it vetoed, so
    // the question can be asked of the row instead of guessed from a total.
    if (widthCap !== undefined && widthVetoed.has(row.rowId)) {
      return {
        rowId: row.rowId,
        stratum: row.stratum,
        code: "NO_BET_WIDTH",
        reason: REASONS.NO_BET_WIDTH,
        publicFire: false,
      };
    }

    return {
      rowId: row.rowId,
      stratum: row.stratum,
      code: "NO_BET_LCB",
      reason: REASONS.NO_BET_LCB,
      publicFire: false,
    };
  });

  // Excluded candidates are appended as first-class outcomes. They are NOT
  // failures of judgement and must never read as one, so they carry their own
  // code and their own language.
  for (const ex of excluded) {
    outcomes.push({
      rowId: ex.rowId,
      stratum: ex.stratum,
      code: "NOT_EVALUATED_MISSING_INPUTS",
      reason: `${REASONS.NOT_EVALUATED_MISSING_INPUTS} Missing: ${ex.missing.join(", ")}.`,
      publicFire: false,
    });
  }

  const evaluatedStrata = new Set(candidateRows.map((r) => r.stratum));
  const uncalibratedStrata = [...evaluatedStrata]
    .map((stratum) => ({ stratum, calibrationRows: calCountByStratum.get(stratum) ?? 0 }))
    .filter((s) => s.calibrationRows < MIN_STRATUM_CALIBRATION)
    .sort((a, b) => a.stratum.localeCompare(b.stratum));

  return {
    outcomes,
    report: blindRealizedStats(report),
    uncalibratedStrata,
    tau,
    fireAuthority: {
      liveBoardOn,
      dualAsOfOk,
      calibrationReady,
      quoteFresh,
      held,
      authorized,
    },
  };
}

/**
 * True when every candidate that REACHED the gate was blocked for want of
 * calibration — the honest "we cannot judge this yet" state.
 *
 * Excluded candidates are ignored here on purpose: they never reached the gate,
 * so they say nothing about whether calibration was the limiting factor.
 * Counting them would let a board full of missing-odds rows masquerade as a
 * calibration problem, which is a different (and more flattering) story than
 * the truth.
 */
export function isFullyUncalibrated(evaluation: BoardGateEvaluation): boolean {
  const reachedGate = evaluation.outcomes.filter(
    (o) => o.code !== "NOT_EVALUATED_MISSING_INPUTS",
  );
  return (
    reachedGate.length > 0 &&
    reachedGate.every((o) => o.code === "INSUFFICIENT_CALIBRATION")
  );
}
