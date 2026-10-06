/**
 * Edge-lab honesty bridge — a fail-closed evaluation surface over the edge-lab
 * honesty family: it decides what a performance CLAIM is allowed to say, what
 * an agent council is allowed to conclude, and whether a selective firing point
 * is backed by enough calibration evidence to be a finding rather than a guess.
 *
 * The family, all pure computation in `@sports/prediction-engine/src/edge-lab`:
 *   - `honest-ceiling.ts`        claim floors/ceilings for any stated win rate
 *   - `agent-roles.ts`           typed role contracts + `staticOpinion`
 *   - `edge-lab-council.ts`      the deterministic sequential council
 *   - `selective-gate.ts`        Venn–Abers interval, the FIRE gate, τ tuning
 *   - `props-context-bind.ts`    schedule/forecast context cells (leak-gated)
 *   - `kaunitz-outlier.ts`       cross-book Shin too-long price scanner
 *   - `grouped-climatology.ts`   walk-forward cell climatology + BSS scoring
 *
 * Fail-closed on every path. Nothing here invents a rate, a price, a prior, an
 * interval, or a calibration row: a refusal from the underlying module is
 * surfaced as a refusal, and a missing input is never imputed.
 *
 * HONESTY POSTURE ON `honest-ceiling.ts`: this bridge reports the doctrine's
 * floor and ceiling VERBATIM (`breakEven`, `blindCeiling`, `selectiveFloor`)
 * beside a boolean `permitted`. It never synthesises a headline rate, never
 * averages a claim against a ceiling, and never presents a mid-point as a
 * result. `BLIND_ATS_CEILING` is a construction bound on what a full-slate
 * claim may assert; `SELECTIVE_CLAIM_FLOOR` is an evidentiary floor, not a
 * target. Reading either as an expected performance number inverts the module.
 *
 * Deep imports, not the package barrel: `agent-roles.ts`, `edge-lab-council.ts`,
 * `selective-gate.ts` and `props-context-bind.ts` are not re-exported from
 * `packages/prediction-engine/src/index.ts` yet, and that barrel is owned
 * centrally. Every import here resolves without touching it.
 */

import {
  BLIND_ATS_CEILING,
  BREAK_EVEN,
  SELECTIVE_CLAIM_FLOOR,
  HonestCeilingError,
  assertClaimWithinCeiling,
  collectCeilingDefects,
  type PerformanceClaimInput,
  type PerformanceClaimScope,
  type SelectiveClaimFloor,
  type SelectiveClaimProof,
} from "@sports/prediction-engine/src/edge-lab/honest-ceiling.js";
import {
  staticOpinion,
  type AgentOpinion,
  type DebateSummary,
  type EdgeLabAgent,
  type EdgeLabAgentRole,
  type EdgeLabContext,
} from "@sports/prediction-engine/src/edge-lab/agent-roles.js";
import {
  DEFAULT_MAX_GUARDIAN_WIDTH,
  SequentialEdgeLabCouncil,
  defaultAgents,
} from "@sports/prediction-engine/src/edge-lab/edge-lab-council.js";
import {
  MIN_STRATUM_CALIBRATION,
  applySelectiveGate,
  tuneTau,
  vennAbersInterval,
  type GateDecisionRow,
  type MultiprobGateOptions,
  type MultiprobSource,
  type TauSelection,
  type TuneTauOptions,
  type VennAbersInterval,
} from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import {
  bindTeamContext,
  CONTEXT_BIND_METHOD_TAG,
  type ContextBindResult,
  type ContextCell,
  type ContextField,
} from "@sports/prediction-engine/src/edge-lab/props-context-bind.js";
import type { GameRow } from "@sports/prediction-engine/src/edge-lab/game-row.js";
import type { GameWeatherForecast } from "@sports/prediction-engine/src/edge-lab/features/nfl-weather.js";
import {
  DEFAULT_KAUNITZ_TAU,
  MIN_KAUNITZ_BOOKS,
  scanKaunitzOutliers,
  type KaunitzBookQuote,
  type KaunitzFlag,
} from "@sports/prediction-engine/src/edge-lab/kaunitz-outlier.js";
import {
  DEFAULT_MIN_CELL_N,
  GROUPED_CLIMATOLOGY_METHOD_TAG,
  brierMean,
  brierSkillScore,
  fitGroupedClimatology,
  predictGrouped,
  scoreAgainstClimatology,
  type BinaryOutcome,
  type CellRate,
  type ClimTrainRow,
  type GroupedClimatology,
  type ScoredCase,
} from "@sports/prediction-engine/src/edge-lab/grouped-climatology.js";
import type { CalibrationSample } from "@sports/prediction-engine/src/probability-calibration.js";

export type EdgeLab2Eval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): EdgeLab2Eval<never> {
  return { ok: false, reason };
}

const CONTEXT_FIELDS: readonly ContextField[] = [
  "rest_days",
  "body_clock_shift_h",
  "wx_total_suppression",
];

/**
 * The roles an operator may inject into a council run. `risk_honesty_guardian`
 * and `decision_agent` are deliberately excluded: the guardian's veto is
 * enforced structurally by the orchestrator, so letting a caller author that
 * opinion (or a duplicate that `find()`s first) would put the veto under the
 * control of the thing the veto exists to constrain.
 */
const OVERRIDABLE_ROLES: readonly EdgeLabAgentRole[] = [
  "market_microstructure",
  "feature_analyst",
  "placebo_analyst",
  "calibration_analyst",
  "glass_ledger",
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBinary(value: unknown): value is BinaryOutcome {
  return value === 0 || value === 1;
}

function isUnitInterval(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function describeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isContextField(value: unknown): value is ContextField {
  return typeof value === "string" && (CONTEXT_FIELDS as readonly string[]).includes(value);
}

// ── honest-ceiling.ts ───────────────────────────────────────────────────────

export interface PerformanceClaimReport {
  /** The doctrine constants, reported verbatim and never blended. */
  readonly breakEven: number;
  readonly blindCeiling: number;
  readonly selectiveFloor: SelectiveClaimFloor;
  /** True when `collectCeilingDefects` found nothing against this claim. */
  readonly permitted: boolean;
  /** Empty when permitted. Every defect is reported, not just the first. */
  readonly defects: readonly string[];
  /**
   * Whether `assertClaimWithinCeiling` actually threw. Cross-checks the pure
   * defect list against the throwing gate so a divergence is visible rather
   * than assumed away.
   */
  readonly gateThrew: boolean;
  /** The thrown error's reasons, when it threw. Empty otherwise. */
  readonly gateReasons: readonly string[];
}

function validateClaimScope(value: unknown): value is PerformanceClaimScope {
  return value === "blind" || value === "selective";
}

function validateProof(value: unknown): value is SelectiveClaimProof | null {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const p = value as Partial<SelectiveClaimProof>;
  return (
    isFiniteNumber(p.firedBets) &&
    typeof p.multiSeasonWalkForward === "boolean" &&
    typeof p.positiveClv === "boolean"
  );
}

/**
 * Judge a proposed performance claim against the ceiling doctrine.
 *
 * Returns the doctrine constants, whether the claim is permitted, and the
 * defect list. It deliberately does NOT return an "expected rate" or any
 * mid-point between the floor and the ceiling: no number in this report is a
 * prediction of what the product will do, and a consumer that wants one must
 * go and measure it on settled rows.
 */
export function evalPerformanceClaim(input: {
  readonly scope: PerformanceClaimScope;
  readonly claimedRate: number;
  readonly selectiveProof?: SelectiveClaimProof | null;
}): EdgeLab2Eval<PerformanceClaimReport> {
  if (!validateClaimScope(input.scope)) {
    return fail("scope must be \"blind\" or \"selective\"");
  }
  if (!isFiniteNumber(input.claimedRate)) {
    return fail("claimedRate must be a finite number");
  }
  if (!validateProof(input.selectiveProof)) {
    return fail(
      "selectiveProof, when supplied, needs finite firedBets and boolean multiSeasonWalkForward/positiveClv",
    );
  }

  // The module treats a malformed rate as a defect rather than a throw, so the
  // range is checked here to keep the failure attributable.
  if (input.claimedRate < 0 || input.claimedRate > 1) {
    return fail(
      `claimedRate=${input.claimedRate} is outside [0, 1] — a rate is a fraction, not a percentage or a score`,
    );
  }

  const claim: PerformanceClaimInput = {
    scope: input.scope,
    claimedRate: input.claimedRate,
    selectiveProof: input.selectiveProof ?? null,
  };

  try {
    const defects = collectCeilingDefects(claim);
    let gateThrew = false;
    let gateReasons: readonly string[] = [];
    try {
      assertClaimWithinCeiling(claim);
    } catch (e) {
      if (!(e instanceof HonestCeilingError)) {
        return fail(`assertClaimWithinCeiling threw a non-HonestCeilingError: ${describeError(e)}`);
      }
      gateThrew = true;
      gateReasons = [...e.reasons];
    }
    // The pure list and the throwing gate must agree; a split verdict would
    // mean one of the two is lying about the same input.
    if (gateThrew !== defects.length > 0) {
      return fail(
        `collectCeilingDefects and assertClaimWithinCeiling disagree on the same claim ` +
          `(defects=${defects.length}, threw=${gateThrew}) — refusing to pick a winner`,
      );
    }
    return {
      ok: true,
      data: {
        breakEven: BREAK_EVEN,
        blindCeiling: BLIND_ATS_CEILING,
        selectiveFloor: SELECTIVE_CLAIM_FLOOR,
        permitted: defects.length === 0,
        defects,
        gateThrew,
        gateReasons,
      },
    };
  } catch (e) {
    return fail(`performance claim check threw: ${describeError(e)}`);
  }
}

// ── selective-gate.ts ───────────────────────────────────────────────────────

function validateGateRows(rows: readonly unknown[], label: string): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return `${label} must be a non-empty array of gate rows`;
  }
  const seen = new Set<string>();
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) {
      return `${label} contains a non-object row`;
    }
    const row = raw as Partial<GateDecisionRow>;
    if (typeof row.rowId !== "string" || row.rowId.length === 0) {
      return `${label} contains a row without a rowId`;
    }
    if (seen.has(row.rowId)) {
      return `${label} contains duplicate rowId "${row.rowId}"`;
    }
    seen.add(row.rowId);
    if (!isUnitInterval(row.score)) {
      return `${label} row "${row.rowId}" has a score outside [0, 1]`;
    }
    if (!isUnitInterval(row.q)) {
      return `${label} row "${row.rowId}" has a devigged market q outside [0, 1]`;
    }
    if (typeof row.stratum !== "string" || row.stratum.length === 0) {
      return `${label} row "${row.rowId}" has no Mondrian stratum`;
    }
    if (!isBinary(row.y)) {
      return `${label} row "${row.rowId}" has a non-binary outcome y`;
    }
    if (row.obtainableDecimalPrice !== undefined) {
      const price = row.obtainableDecimalPrice;
      if (!isFiniteNumber(price) || price <= 1) {
        return `${label} row "${row.rowId}" has an obtainableDecimalPrice that is not decimal odds > 1`;
      }
    }
  }
  return null;
}

export interface SelectiveGateReportOut {
  readonly tau: number;
  readonly eligible: number;
  readonly fired: number;
  readonly coverage: number;
  readonly realizedRate: number | null;
  readonly wilsonLcb: number | null;
  readonly perStratum: readonly {
    readonly stratum: string;
    readonly eligible: number;
    readonly fired: number;
    readonly realizedRate: number | null;
    readonly wilsonLcb: number | null;
  }[];
  readonly multiprobSource: MultiprobSource;
  /** Rows that cleared tau but were vetoed for a too-wide interval. */
  readonly widthNoBets: number;
  readonly widthVetoedRowIds: readonly string[];
  readonly decisions: readonly {
    readonly rowId: string;
    readonly stratum: string;
    readonly q: number;
    readonly y: BinaryOutcome;
    readonly lcbEdge: number;
    readonly width: number;
    readonly interval: VennAbersInterval;
    readonly obtainableDecimalPrice?: number;
    readonly taxonomyCategory?: string;
  }[];
  /**
   * Strata present in the eval rows that carried fewer than
   * MIN_STRATUM_CALIBRATION calibration rows and therefore never fired.
   * Surfaced so "we declined" is never reported as "we found nothing" — an
   * absence of calibration history is not a measurement.
   */
  readonly silentStrata: readonly { readonly stratum: string; readonly calibrationRows: number }[];
  readonly minStratumCalibration: number;
}

function validateGateOptions(options: MultiprobGateOptions | undefined): string | null {
  if (options === undefined) return null;
  const source = options.source;
  if (
    source !== undefined &&
    source !== "legacy-isotonic" &&
    source !== "ivap" &&
    source !== "cvap"
  ) {
    return "gate option source must be legacy-isotonic | ivap | cvap";
  }
  if (options.cvapFolds !== undefined) {
    if (!Number.isInteger(options.cvapFolds) || options.cvapFolds < 2) {
      return "gate option cvapFolds must be an integer >= 2";
    }
  }
  if (options.maxWidthForFire !== undefined) {
    const w = options.maxWidthForFire;
    if (!isFiniteNumber(w) || w < 0 || w > 1) {
      return "gate option maxWidthForFire must be finite in [0, 1]";
    }
  }
  if (options.taxonomyCtx !== undefined) {
    const ctx = options.taxonomyCtx;
    if (
      typeof ctx !== "object" ||
      ctx === null ||
      typeof ctx.isHome !== "boolean" ||
      typeof ctx.isFavorite !== "boolean" ||
      !isFiniteNumber(ctx.restDays)
    ) {
      return "gate option taxonomyCtx requires isHome/isFavorite booleans and a finite restDays";
    }
  }
  return null;
}

/**
 * Run the selective firing gate over disjoint calibration and eval folds.
 *
 * The gate only ever fires on the LOWER end of a calibrated interval, so a
 * fired row is a statement the model clears the bar even under its own most
 * skeptical reading. Strata without enough calibration rows stay silent and are
 * reported as silent rather than counted as declines.
 */
export function evalSelectiveGate(input: {
  readonly calibrationRows: readonly GateDecisionRow[];
  readonly evalRows: readonly GateDecisionRow[];
  readonly tau: number;
  readonly options?: MultiprobGateOptions;
}): EdgeLab2Eval<SelectiveGateReportOut> {
  const { calibrationRows, evalRows, tau, options } = input;
  const calErr = validateGateRows(calibrationRows, "calibrationRows");
  if (calErr !== null) return fail(calErr);
  const evalErr = validateGateRows(evalRows, "evalRows");
  if (evalErr !== null) return fail(evalErr);
  if (!isFiniteNumber(tau) || tau < 0 || tau >= 1) {
    return fail("tau must be a finite probability gap in [0, 1)");
  }
  const optErr = validateGateOptions(options);
  if (optErr !== null) return fail(optErr);

  try {
    const report = applySelectiveGate(calibrationRows, evalRows, tau, options ?? {});
    if (!isFiniteNumber(report.coverage) || report.coverage < 0 || report.coverage > 1) {
      return fail(`gate produced coverage=${report.coverage}, outside [0, 1]`);
    }
    if (report.fired > report.eligible) {
      return fail(`gate fired ${report.fired} of ${report.eligible} eligible rows — impossible count`);
    }
    for (const d of report.decisions) {
      if (!isFiniteNumber(d.lcbEdge) || !isUnitInterval(d.q)) {
        return fail(`gate decision for row "${d.rowId}" is not finite and bounded`);
      }
      if (!isUnitInterval(d.interval.lower) || !isUnitInterval(d.interval.upper)) {
        return fail(`gate decision for row "${d.rowId}" has an interval outside [0, 1]`);
      }
      if (d.interval.lower > d.interval.upper) {
        return fail(`gate decision for row "${d.rowId}" has an inverted interval`);
      }
      if (!isFiniteNumber(d.width) || d.width < 0) {
        return fail(`gate decision for row "${d.rowId}" has a non-finite width`);
      }
    }
    if (report.widthNoBets !== report.widthVetoedRowIds.length) {
      return fail("gate widthNoBets disagrees with widthVetoedRowIds — the count is not attributable");
    }

    const calByStratum = new Map<string, number>();
    for (const row of calibrationRows) {
      calByStratum.set(row.stratum, (calByStratum.get(row.stratum) ?? 0) + 1);
    }
    const silentStrata = [...new Set(evalRows.map((r) => r.stratum))]
      .map((stratum) => ({ stratum, calibrationRows: calByStratum.get(stratum) ?? 0 }))
      .filter((s) => s.calibrationRows < MIN_STRATUM_CALIBRATION)
      .sort((a, b) => a.stratum.localeCompare(b.stratum));

    return {
      ok: true,
      data: {
        tau: report.tau,
        eligible: report.eligible,
        fired: report.fired,
        coverage: report.coverage,
        realizedRate: report.realizedRate,
        wilsonLcb: report.wilsonLcb,
        perStratum: report.perStratum.map((s) => ({ ...s })),
        multiprobSource: report.multiprobSource,
        widthNoBets: report.widthNoBets,
        widthVetoedRowIds: [...report.widthVetoedRowIds],
        decisions: report.decisions.map((d) => ({
          rowId: d.rowId,
          stratum: d.stratum,
          q: d.q,
          y: d.y,
          lcbEdge: d.lcbEdge,
          width: d.width,
          interval: { p0: d.interval.p0, p1: d.interval.p1, lower: d.interval.lower, upper: d.interval.upper },
          ...(d.obtainableDecimalPrice !== undefined
            ? { obtainableDecimalPrice: d.obtainableDecimalPrice }
            : {}),
          ...(d.taxonomyCategory !== undefined ? { taxonomyCategory: String(d.taxonomyCategory) } : {}),
        })),
        silentStrata,
        minStratumCalibration: MIN_STRATUM_CALIBRATION,
      },
    };
  } catch (e) {
    // GateSetOverlapError lands here: a shared rowId between the calibration
    // and eval folds is the self-deception failure the gate exists to stop.
    return fail(`selective gate refused: ${describeError(e)}`);
  }
}

export interface MultiprobIntervalOut {
  readonly p0: number;
  readonly p1: number;
  readonly lower: number;
  readonly upper: number;
  readonly width: number;
  readonly calibrationRows: number;
}

/**
 * Inductive Venn–Abers interval for one score against a calibration set.
 * The lower end is the only end the gate fires on; both are reported so a
 * caller can see how much precision the calibration set actually bought.
 */
export function evalVennAbersInterval(input: {
  readonly calibration: readonly CalibrationSample[];
  readonly score: number;
}): EdgeLab2Eval<MultiprobIntervalOut> {
  const { calibration, score } = input;
  if (!Array.isArray(calibration) || calibration.length === 0) {
    return fail("calibration must be a non-empty array of { p, y } samples");
  }
  for (const s of calibration) {
    if (typeof s !== "object" || s === null) {
      return fail("calibration contains a non-object sample");
    }
    if (!isUnitInterval(s.p)) return fail("every calibration sample needs p in [0, 1]");
    if (!isBinary(s.y)) return fail("every calibration sample needs a binary y");
  }
  if (!isUnitInterval(score)) return fail("score must be in [0, 1]");
  try {
    const iv = vennAbersInterval(calibration, score);
    if (!isUnitInterval(iv.lower) || !isUnitInterval(iv.upper) || iv.lower > iv.upper) {
      return fail("Venn–Abers produced a non-finite or inverted interval");
    }
    return {
      ok: true,
      data: {
        p0: iv.p0,
        p1: iv.p1,
        lower: iv.lower,
        upper: iv.upper,
        width: iv.upper - iv.lower,
        calibrationRows: calibration.length,
      },
    };
  } catch (e) {
    return fail(`vennAbersInterval threw: ${describeError(e)}`);
  }
}

export interface TauTuningOut {
  /**
   * The loosest accepted tau, or null. `null` is a REAL ANSWER — "fire
   * nothing" — not a failure and not a placeholder, so it survives as ok:true.
   */
  readonly tau: number | null;
  readonly reason: string;
  readonly curve: readonly {
    readonly tau: number;
    readonly coverage: number;
    readonly fired: number;
    readonly realizedRate: number | null;
    readonly wilsonLcb: number | null;
    readonly meanBreakeven: number | null;
  }[];
  readonly minFired: number;
  readonly delta: number;
}

/**
 * Tune the firing threshold on a DISJOINT tuning fold under a fixed-sequence
 * exact-binomial test. Disjointness across calibration/tuning/eval is asserted
 * by the module and a violation fails closed here.
 */
export function evalTuneTau(input: {
  readonly calibrationRows: readonly GateDecisionRow[];
  readonly tuningRows: readonly GateDecisionRow[];
  readonly taus?: readonly number[];
  readonly minFired?: number;
  readonly delta?: number;
  readonly strictObtainable?: boolean;
  readonly gate?: MultiprobGateOptions;
  readonly evalRows?: readonly GateDecisionRow[];
}): EdgeLab2Eval<TauTuningOut> {
  const {
    calibrationRows,
    tuningRows,
    taus,
    minFired,
    delta,
    strictObtainable,
    gate,
    evalRows,
  } = input;
  const calErr = validateGateRows(calibrationRows, "calibrationRows");
  if (calErr !== null) return fail(calErr);
  const tuningErr = validateGateRows(tuningRows, "tuningRows");
  if (tuningErr !== null) return fail(tuningErr);
  if (evalRows !== undefined) {
    const evalErr = validateGateRows(evalRows, "evalRows");
    if (evalErr !== null) return fail(evalErr);
  }
  const resolvedMinFired = minFired ?? 50;
  if (!Number.isInteger(resolvedMinFired) || resolvedMinFired < 1) {
    return fail("minFired must be an integer >= 1");
  }
  const resolvedDelta = delta ?? 0.05;
  if (!isFiniteNumber(resolvedDelta) || resolvedDelta <= 0 || resolvedDelta >= 1) {
    return fail("delta must be a finite FWER budget in (0, 1)");
  }
  if (taus !== undefined) {
    if (!Array.isArray(taus) || taus.length === 0) {
      return fail("taus must be a non-empty array of probability gaps");
    }
    for (const t of taus) {
      if (!isFiniteNumber(t) || t < 0 || t >= 1) {
        return fail(`tau ${t} is outside [0, 1)`);
      }
    }
  }
  const optErr = validateGateOptions(gate);
  if (optErr !== null) return fail(optErr);

  const opts: TuneTauOptions = {
    minFired: resolvedMinFired,
    delta: resolvedDelta,
    ...(taus !== undefined ? { taus } : {}),
    ...(strictObtainable !== undefined ? { strictObtainable } : {}),
    ...(gate !== undefined ? { gate } : {}),
    ...(evalRows !== undefined ? { evalRows } : {}),
  };

  try {
    const selection: TauSelection = tuneTau(calibrationRows, tuningRows, opts);
    if (selection.tau !== null && !isFiniteNumber(selection.tau)) {
      return fail("tuneTau returned a non-finite tau");
    }
    for (const point of selection.curve) {
      if (!isFiniteNumber(point.coverage) || point.coverage < 0 || point.coverage > 1) {
        return fail(`tuneTau curve point at tau=${point.tau} has coverage outside [0, 1]`);
      }
      if (!Number.isInteger(point.fired) || point.fired < 0) {
        return fail(`tuneTau curve point at tau=${point.tau} has a non-integer fired count`);
      }
      if (point.meanBreakeven !== null && !isUnitInterval(point.meanBreakeven)) {
        return fail(`tuneTau curve point at tau=${point.tau} has a breakeven outside [0, 1]`);
      }
    }
    return {
      ok: true,
      data: {
        tau: selection.tau,
        reason: selection.reason,
        curve: selection.curve.map((p) => ({ ...p })),
        minFired: resolvedMinFired,
        delta: resolvedDelta,
      },
    };
  } catch (e) {
    return fail(`tuneTau refused: ${describeError(e)}`);
  }
}

// ── edge-lab-council.ts + agent-roles.ts ────────────────────────────────────

export interface CouncilOverride {
  readonly role: EdgeLabAgentRole;
  readonly stance: AgentOpinion["stance"];
  readonly confidence: number;
  readonly rationale: string;
  readonly noBetSignal?: boolean;
}

export interface EdgeLabDebateOut {
  readonly summary: DebateSummary;
  readonly roundCount: number;
  readonly opinionCount: number;
  readonly roles: readonly {
    readonly role: EdgeLabAgentRole;
    readonly stance: AgentOpinion["stance"];
    readonly confidence: number;
    readonly noBetSignal: boolean;
  }[];
  readonly guardianMaxWidth: number;
}

function validateCouncilOverrides(
  overrides: readonly CouncilOverride[] | undefined,
): string | null {
  if (overrides === undefined) return null;
  if (!Array.isArray(overrides)) return "overrides must be an array";
  for (const o of overrides) {
    if (typeof o !== "object" || o === null) return "each override must be an object";
    if (!OVERRIDABLE_ROLES.includes(o.role)) {
      return (
        `override role "${String(o.role)}" is not overridable — the risk/honesty guardian and the ` +
        "decision agent are structural and cannot be authored by a caller"
      );
    }
    if (o.stance !== "support" && o.stance !== "oppose" && o.stance !== "abstain" && o.stance !== "flag") {
      return `override stance "${String(o.stance)}" must be support | oppose | abstain | flag`;
    }
    if (!isFiniteNumber(o.confidence) || o.confidence < 0 || o.confidence > 1) {
      return "override confidence must be finite in [0, 1]";
    }
    if (typeof o.rationale !== "string" || o.rationale.length === 0) {
      return "every override needs a non-empty rationale — an unexplained vote is not a finding";
    }
    if (o.noBetSignal !== undefined && typeof o.noBetSignal !== "boolean") {
      return "override noBetSignal must be a boolean when supplied";
    }
  }
  return null;
}

function buildCouncilContext(input: {
  readonly slateId: string;
  readonly asOf: string;
  readonly sport: string;
  readonly marketType?: string;
  readonly features?: Readonly<Record<string, number | string | boolean>>;
  readonly marketImpliedProb?: number;
  readonly modelScore?: number;
  readonly multiprob?: { readonly p0: number; readonly p1: number; readonly width: number };
  readonly conformalWidth?: number;
  readonly taxonomyCategory?: string;
  readonly calibrationSampleSize?: number;
  readonly placeboSurvived?: boolean;
}): EdgeLab2Eval<EdgeLabContext> {
  const { slateId, asOf, sport } = input;
  if (typeof slateId !== "string" || slateId.length === 0) return fail("slateId is required");
  if (typeof asOf !== "string" || !Number.isFinite(Date.parse(asOf))) {
    return fail("asOf must be a parseable ISO-8601 instant");
  }
  if (typeof sport !== "string" || sport.length === 0) return fail("sport is required");
  if (input.marketType !== undefined && typeof input.marketType !== "string") {
    return fail("marketType must be a string when supplied");
  }
  if (input.taxonomyCategory !== undefined && typeof input.taxonomyCategory !== "string") {
    return fail("taxonomyCategory must be a string when supplied");
  }
  if (input.features !== undefined) {
    if (typeof input.features !== "object" || input.features === null) {
      return fail("features must be a record when supplied");
    }
    for (const [k, v] of Object.entries(input.features)) {
      const t = typeof v;
      if (t !== "number" && t !== "string" && t !== "boolean") {
        return fail(`feature "${k}" must be a number, string, or boolean (got ${t})`);
      }
    }
  }
  if (input.marketImpliedProb !== undefined && !isUnitInterval(input.marketImpliedProb)) {
    return fail("marketImpliedProb must be in [0, 1] when supplied");
  }
  if (input.modelScore !== undefined && !isUnitInterval(input.modelScore)) {
    return fail("modelScore must be in [0, 1] when supplied");
  }
  if (input.multiprob !== undefined) {
    const mp = input.multiprob;
    if (!isUnitInterval(mp.p0) || !isUnitInterval(mp.p1)) {
      return fail("multiprob p0/p1 must be in [0, 1]");
    }
    if (mp.p0 > mp.p1) {
      return fail(`multiprob endpoints are inverted (p0=${mp.p0} > p1=${mp.p1})`);
    }
    if (!isFiniteNumber(mp.width) || mp.width < 0 || mp.width > 1) {
      return fail("multiprob width must be finite in [0, 1]");
    }
    if (Math.abs(mp.width - (mp.p1 - mp.p0)) > 1e-9) {
      return fail(
        `multiprob width ${mp.width} does not match p1 - p0 = ${mp.p1 - mp.p0} — an inconsistent ` +
          "interval would let the guardian read precision that is not there",
      );
    }
  }
  if (input.conformalWidth !== undefined) {
    const w = input.conformalWidth;
    if (!isFiniteNumber(w) || w < 0 || w > 1) {
      return fail("conformalWidth must be finite in [0, 1] when supplied");
    }
  }
  if (input.calibrationSampleSize !== undefined) {
    const n = input.calibrationSampleSize;
    if (!Number.isInteger(n) || n < 0) {
      return fail("calibrationSampleSize must be a non-negative integer when supplied");
    }
  }
  if (input.placeboSurvived !== undefined && typeof input.placeboSurvived !== "boolean") {
    return fail("placeboSurvived must be a boolean when supplied — absent means untested, not passed");
  }

  return {
    ok: true,
    data: {
      slateId,
      asOf,
      sport,
      ...(input.marketType !== undefined ? { marketType: input.marketType } : {}),
      ...(input.features !== undefined ? { features: input.features } : {}),
      ...(input.marketImpliedProb !== undefined
        ? { marketImpliedProb: input.marketImpliedProb }
        : {}),
      ...(input.modelScore !== undefined ? { modelScore: input.modelScore } : {}),
      ...(input.multiprob !== undefined ? { multiprob: input.multiprob } : {}),
      ...(input.conformalWidth !== undefined ? { conformalWidth: input.conformalWidth } : {}),
      ...(input.taxonomyCategory !== undefined ? { taxonomyCategory: input.taxonomyCategory } : {}),
      ...(input.calibrationSampleSize !== undefined
        ? { calibrationSampleSize: input.calibrationSampleSize }
        : {}),
      ...(input.placeboSurvived !== undefined ? { placeboSurvived: input.placeboSurvived } : {}),
    },
  };
}

/**
 * Run the deterministic Edge Lab council over one context.
 *
 * The council's `finalDecision` is a DIAGNOSTIC synthesis for edge review, not
 * a firing decision: `applySelectiveGate` remains the only FIRE/NO_BET
 * authority. A run is only returned when every opinion is well-formed.
 */
export async function evalEdgeLabDebate(input: {
  readonly slateId: string;
  readonly asOf: string;
  readonly sport: string;
  readonly marketType?: string;
  readonly features?: Readonly<Record<string, number | string | boolean>>;
  readonly marketImpliedProb?: number;
  readonly modelScore?: number;
  readonly multiprob?: { readonly p0: number; readonly p1: number; readonly width: number };
  readonly conformalWidth?: number;
  readonly taxonomyCategory?: string;
  readonly calibrationSampleSize?: number;
  readonly placeboSurvived?: boolean;
  readonly guardianMaxWidth?: number;
  readonly guardianMinCalibrationSamples?: number;
  readonly overrides?: readonly CouncilOverride[];
}): Promise<EdgeLab2Eval<EdgeLabDebateOut>> {
  const ctx = buildCouncilContext(input);
  if (!ctx.ok) return ctx;

  if (input.guardianMaxWidth !== undefined) {
    const w = input.guardianMaxWidth;
    if (!isFiniteNumber(w) || w < 0 || w > 1) {
      return fail("guardianMaxWidth must be finite in [0, 1]");
    }
  }
  if (input.guardianMinCalibrationSamples !== undefined) {
    const n = input.guardianMinCalibrationSamples;
    if (!Number.isInteger(n) || n < 1) {
      return fail("guardianMinCalibrationSamples must be an integer >= 1");
    }
  }
  const overrideErr = validateCouncilOverrides(input.overrides);
  if (overrideErr !== null) return fail(overrideErr);

  const maxWidth = input.guardianMaxWidth ?? DEFAULT_MAX_GUARDIAN_WIDTH;

  // Caller overrides are modelled as real agents via `staticOpinion` so they
  // participate in the same sequential debate as the built-in roster.
  const overrideAgents: EdgeLabAgent[] = (input.overrides ?? []).map((o) => ({
    role: o.role,
    evaluate: (): AgentOpinion =>
      staticOpinion(o.role, o.stance, o.rationale, o.confidence, {
        ...(o.noBetSignal !== undefined ? { noBetSignal: o.noBetSignal } : {}),
      }),
  }));

  const roster: readonly EdgeLabAgent[] = [
    ...overrideAgents,
    ...defaultAgents({
      maxWidth,
      ...(input.guardianMinCalibrationSamples !== undefined
        ? { minCalibrationSamples: input.guardianMinCalibrationSamples }
        : {}),
    }),
  ];

  try {
    const council = new SequentialEdgeLabCouncil(roster);
    const summary = await council.runDebate(ctx.data, 1);
    if (summary.rounds.length === 0) return fail("council produced no debate rounds");
    const decisions: readonly DebateSummary["finalDecision"][] = [
      "bet",
      "no_bet",
      "reduce_size",
      "review",
    ];
    if (!decisions.includes(summary.finalDecision)) {
      return fail(`council produced an unknown finalDecision "${summary.finalDecision}"`);
    }
    if (typeof summary.primaryReason !== "string" || summary.primaryReason.length === 0) {
      return fail("council produced no primaryReason — a decision without a reason is not reportable");
    }
    const opinions = summary.rounds[0]?.opinions ?? [];
    if (opinions.length === 0) return fail("council produced an empty opinion set");
    for (const o of opinions) {
      if (!isFiniteNumber(o.confidence) || o.confidence < 0 || o.confidence > 1) {
        return fail(`agent ${o.role} returned confidence ${o.confidence}, outside [0, 1]`);
      }
      if (typeof o.rationale !== "string" || o.rationale.length === 0) {
        return fail(`agent ${o.role} returned an empty rationale`);
      }
    }
    return {
      ok: true,
      data: {
        summary,
        roundCount: summary.rounds.length,
        opinionCount: opinions.length,
        roles: opinions.map((o) => ({
          role: o.role,
          stance: o.stance,
          confidence: o.confidence,
          noBetSignal: o.noBetSignal === true,
        })),
        guardianMaxWidth: maxWidth,
      },
    };
  } catch (e) {
    return fail(`edge lab debate threw: ${describeError(e)}`);
  }
}

// ── props-context-bind.ts ───────────────────────────────────────────────────

export interface PropsContextBindOut {
  readonly cells: readonly ContextCell[];
  readonly priced: false;
  readonly methodTag: typeof CONTEXT_BIND_METHOD_TAG;
  readonly restDays: number | null;
  readonly bodyClockShiftHours: number | null;
  readonly wxTotalSuppression: number | null;
}

function validateSchedule(schedule: readonly unknown[]): string | null {
  if (!Array.isArray(schedule)) return "schedule must be an array of GameRow";
  for (const raw of schedule) {
    if (typeof raw !== "object" || raw === null) return "schedule contains a non-object row";
    const g = raw as Partial<GameRow>;
    if (typeof g.startTime !== "string" || !Number.isFinite(Date.parse(g.startTime))) {
      return "every schedule row needs a parseable ISO startTime";
    }
    if (typeof g.homeTeam !== "string" || typeof g.awayTeam !== "string") {
      return "every schedule row needs homeTeam and awayTeam strings";
    }
    if (g.homeScore === undefined || g.awayScore === undefined) {
      return "every schedule row needs explicit homeScore/awayScore (null = not final, never omitted)";
    }
  }
  return null;
}

function validateWeather(
  weather: readonly { readonly gameId: string; readonly forecast: GameWeatherForecast }[],
): string | null {
  if (!Array.isArray(weather)) return "weather must be an array of { gameId, forecast }";
  for (const w of weather) {
    if (typeof w !== "object" || w === null) return "each weather entry must be an object";
    if (typeof w.gameId !== "string" || w.gameId.length === 0) {
      return "each weather entry needs a gameId";
    }
    const f = w.forecast;
    if (typeof f !== "object" || f === null) {
      return `weather entry "${w.gameId}" needs a forecast object`;
    }
    if (typeof f.forecastIssuedAt !== "string" || !Number.isFinite(Date.parse(f.forecastIssuedAt))) {
      return `weather entry "${w.gameId}" needs a parseable forecastIssuedAt`;
    }
    if (typeof f.isDome !== "boolean") {
      return `weather entry "${w.gameId}" needs isDome boolean`;
    }
  }
  return null;
}

/**
 * Bind rest / body-clock / weather context cells for one kickoff.
 *
 * All-or-refuse: the module refuses the whole request on the first failing
 * field, and that refusal is surfaced here as a failure carrying the exact
 * refusal code. A refused bind is never converted into a default rest week or
 * a neutral weather value.
 */
export function evalPropsContextBind(input: {
  readonly schedule: readonly GameRow[];
  readonly weather?: readonly { readonly gameId: string; readonly forecast: GameWeatherForecast }[];
  readonly team: string;
  readonly gameId: string;
  readonly kickoffIso: string;
  readonly isHome: boolean;
  readonly opponentTeam: string;
  readonly fields: readonly ContextField[];
  readonly decisionLeadMs?: number;
}): EdgeLab2Eval<PropsContextBindOut> {
  const { schedule, team, gameId, kickoffIso, isHome, opponentTeam, fields } = input;
  if (typeof team !== "string" || team.length === 0) return fail("team is required");
  if (typeof opponentTeam !== "string" || opponentTeam.length === 0) {
    return fail("opponentTeam is required — the venue zone is resolved from the other side");
  }
  if (typeof gameId !== "string" || gameId.length === 0) return fail("gameId is required");
  if (typeof kickoffIso !== "string" || !Number.isFinite(Date.parse(kickoffIso))) {
    return fail("kickoffIso must be a parseable ISO-8601 instant");
  }
  if (typeof isHome !== "boolean") return fail("isHome must be a boolean");
  if (!Array.isArray(fields) || fields.length === 0) {
    return fail("fields must be a non-empty array of ContextField");
  }
  for (const f of fields) {
    if (!isContextField(f)) {
      return fail(
        `unknown context field "${String(f)}" — expected one of ${CONTEXT_FIELDS.join(" | ")}`,
      );
    }
  }
  const schedErr = validateSchedule(schedule);
  if (schedErr !== null) return fail(schedErr);
  const weather = input.weather ?? [];
  const wxErr = validateWeather(weather);
  if (wxErr !== null) return fail(wxErr);
  if (input.decisionLeadMs !== undefined) {
    const lead = input.decisionLeadMs;
    if (!isFiniteNumber(lead) || lead < 0) {
      return fail("decisionLeadMs must be a finite non-negative number of milliseconds");
    }
  }

  const weatherByGame = new Map<string, GameWeatherForecast>();
  for (const w of weather) weatherByGame.set(w.gameId, w.forecast);

  let result: ContextBindResult;
  try {
    result = bindTeamContext({
      schedule,
      weatherByGame,
      request: { team, gameId, kickoffIso, isHome, opponentTeam, fields },
      ...(input.decisionLeadMs !== undefined ? { decisionLeadMs: input.decisionLeadMs } : {}),
    });
  } catch (e) {
    return fail(`bindTeamContext threw: ${describeError(e)}`);
  }

  if (!result.ok) {
    const where = result.field === null ? "whole request" : `field "${result.field}"`;
    return fail(
      `props context bind refused (${where}): ${result.refuse} — no default rest week and no ` +
        "neutral weather value is ever substituted",
    );
  }

  for (const cell of result.cells) {
    if (!isFiniteNumber(cell.value)) {
      return fail(`bound cell "${cell.field}" has a non-finite value`);
    }
    if (cell.field === "rest_days" && cell.value <= 0) {
      return fail(
        `rest_days=${cell.value} is not positive — a zero or negative rest gap means the prior ` +
          "game was not found strictly before the decision cutoff",
      );
    }
    if (cell.field === "body_clock_shift_h" && Math.abs(cell.value) > 12) {
      return fail(`body_clock_shift_h=${cell.value} is outside a plausible ±12h zone shift`);
    }
    if (cell.field === "wx_total_suppression" && (cell.value < 0 || cell.value > 1)) {
      return fail(`wx_total_suppression=${cell.value} is outside [0, 1]`);
    }
  }

  const byField = new Map<string, number>(result.cells.map((c) => [c.field, c.value]));
  return {
    ok: true,
    data: {
      cells: result.cells.map((c) => ({ ...c })),
      priced: false,
      methodTag: result.methodTag,
      restDays: byField.get("rest_days") ?? null,
      bodyClockShiftHours: byField.get("body_clock_shift_h") ?? null,
      wxTotalSuppression: byField.get("wx_total_suppression") ?? null,
    },
  };
}

// ── kaunitz-outlier.ts ──────────────────────────────────────────────────────

export interface KaunitzScanOut {
  readonly tau: number;
  readonly bookCount: number;
  readonly qHomeConsensus: number;
  readonly qAwayConsensus: number;
  readonly books: readonly { readonly book: string; readonly qHome: number; readonly qAway: number; readonly z: number }[];
  readonly flags: readonly KaunitzFlag[];
  readonly priced: false;
}

/**
 * Scan a named-book two-way field for prices that are too long by `tau`
 * probability points against the cross-book Shin median. Log-only: this
 * reports a discrepancy between books, never a bet.
 */
export function evalKaunitzScan(input: {
  readonly quotes: readonly KaunitzBookQuote[];
  readonly tau?: number;
}): EdgeLab2Eval<KaunitzScanOut> {
  const { quotes } = input;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return fail("quotes must be a non-empty array of two-way book quotes");
  }
  for (const q of quotes) {
    if (typeof q !== "object" || q === null) return fail("each quote must be an object");
    if (typeof q.book !== "string" || q.book.length === 0) {
      return fail("each quote needs a non-empty book name — an anonymous price has no resolution");
    }
    for (const [side, price] of [
      ["homeAmerican", q.homeAmerican],
      ["awayAmerican", q.awayAmerican],
    ] as const) {
      const v = price;
      if (!isFiniteNumber(v) || v === 0) {
        return fail(`quote "${q.book}" has a non-finite or zero ${side}`);
      }
      if (Math.abs(v) < 100) {
        return fail(
          `quote "${q.book}" has ${side}=${v} — American odds are only ever quoted at a ` +
            "magnitude of 100 or more, so this is a blank upstream field, not a price",
        );
      }
    }
  }
  if (quotes.length < MIN_KAUNITZ_BOOKS) {
    return fail(
      `Kaunitz needs a FIELD, not an argument: ${quotes.length} quote(s) supplied, ` +
        `minimum is ${MIN_KAUNITZ_BOOKS}`,
    );
  }
  const tau = input.tau ?? DEFAULT_KAUNITZ_TAU;
  if (!isFiniteNumber(tau) || tau <= 0 || tau >= 1) {
    return fail("tau must be a finite probability gap in (0, 1)");
  }

  try {
    const scan = scanKaunitzOutliers(quotes, input.tau !== undefined ? { tau } : {});
    if (!scan.ok) {
      return fail(
        `Kaunitz scan refused (${scan.refuse}) — a field that thin cannot establish a ` +
          "cross-book median",
      );
    }
    if (scan.bookCount < MIN_KAUNITZ_BOOKS) {
      return fail(`Kaunitz scan returned ${scan.bookCount} clean books, below the ${MIN_KAUNITZ_BOOKS} floor`);
    }
    if (!isUnitInterval(scan.qHomeConsensus) || !isUnitInterval(scan.qAwayConsensus)) {
      return fail("Kaunitz consensus probability is outside [0, 1]");
    }
    for (const b of scan.books) {
      if (!isUnitInterval(b.qHome) || !isUnitInterval(b.qAway)) {
        return fail(`Kaunitz book "${b.book}" produced a Shin probability outside [0, 1]`);
      }
      if (!isFiniteNumber(b.z)) {
        return fail(`Kaunitz book "${b.book}" produced a non-finite insider-share z`);
      }
    }
    for (const f of scan.flags) {
      if (!isFiniteNumber(f.gap) || f.gap < tau) {
        return fail(
          `Kaunitz flag for "${f.book}" (${f.side}) has gap ${f.gap}, below the requested tau=${tau}`,
        );
      }
      if (Math.abs(f.gap - (f.qConsensus - f.qBook)) > 1e-12) {
        return fail(`Kaunitz flag for "${f.book}" reports a gap inconsistent with its own endpoints`);
      }
    }
    return {
      ok: true,
      data: {
        tau: scan.tau,
        bookCount: scan.bookCount,
        qHomeConsensus: scan.qHomeConsensus,
        qAwayConsensus: scan.qAwayConsensus,
        books: scan.books.map((b) => ({ ...b })),
        flags: scan.flags.map((f) => ({ ...f })),
        priced: false,
      },
    };
  } catch (e) {
    return fail(`scanKaunitzOutliers threw: ${describeError(e)}`);
  }
}

// ── grouped-climatology.ts ──────────────────────────────────────────────────

export interface ClimatologyCellOut {
  readonly key: string;
  readonly hits: number;
  readonly n: number;
  readonly rate: number;
}

export interface ClimatologyFitOut {
  readonly methodTag: typeof GROUPED_CLIMATOLOGY_METHOD_TAG;
  readonly minCellN: number;
  readonly trainRows: number;
  readonly pooled: CellRate;
  readonly groups: readonly ClimatologyCellOut[];
  readonly parents: readonly ClimatologyCellOut[];
}

function cellsToArray(map: ReadonlyMap<string, CellRate>): ClimatologyCellOut[] {
  return [...map.entries()]
    .map(([key, c]) => ({ key, hits: c.hits, n: c.n, rate: c.rate }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function validateTrainRows(rows: readonly unknown[]): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "train must be a non-empty array of ClimTrainRow";
  }
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) return "train contains a non-object row";
    const r = raw as Partial<ClimTrainRow>;
    if (typeof r.group !== "string" || r.group.length === 0) {
      return "train contains a row without a non-empty group key";
    }
    if (!isBinary(r.y)) return `train row "${r.group}" has a non-binary outcome y`;
    if (r.parent !== undefined && (typeof r.parent !== "string" || r.parent.length === 0)) {
      return `train row "${r.group}" has a malformed parent key`;
    }
  }
  return null;
}

function validateMinCellN(minCellN: number | undefined): string | null {
  if (minCellN === undefined) return null;
  if (!Number.isInteger(minCellN) || minCellN < 1) {
    return "minCellN must be an integer >= 1 — a sparse cell must back off, not invent a rate";
  }
  return null;
}

/**
 * Fit a grouped (position × week) climatology on a TRAIN window only.
 *
 * The caller owns the walk-forward contract: these rows must come from a
 * strictly earlier window than anything this table is used to score. The
 * bridge cannot verify that, and does not pretend to — it only refuses
 * malformed rows and reports the fitted cells verbatim.
 */
export function evalFitGroupedClimatology(input: {
  readonly train: readonly ClimTrainRow[];
  readonly minCellN?: number;
}): EdgeLab2Eval<ClimatologyFitOut> {
  const { train, minCellN } = input;
  const err = validateTrainRows(train);
  if (err !== null) return fail(err);
  const minErr = validateMinCellN(minCellN);
  if (minErr !== null) return fail(minErr);

  try {
    const table: GroupedClimatology = fitGroupedClimatology(train);
    if (table.n !== train.length) {
      return fail(`climatology fit counted ${table.n} rows from a ${train.length}-row train window`);
    }
    if (!isUnitInterval(table.pooled.rate)) {
      return fail("climatology pooled rate is outside [0, 1]");
    }
    if (table.pooled.n === 0) {
      return fail("climatology fit produced an empty pooled cell — refusing to publish a 0.5 default as a rate");
    }
    for (const group of [...table.rates.keys(), ...table.parentRates.keys()]) {
      const cell = table.rates.get(group) ?? table.parentRates.get(group);
      if (!cell || !isUnitInterval(cell.rate) || cell.n < 0 || cell.hits < 0 || cell.hits > cell.n) {
        return fail(`climatology cell "${group}" is inconsistent`);
      }
    }
    return {
      ok: true,
      data: {
        methodTag: GROUPED_CLIMATOLOGY_METHOD_TAG,
        minCellN: minCellN ?? DEFAULT_MIN_CELL_N,
        trainRows: table.n,
        pooled: { ...table.pooled },
        groups: cellsToArray(table.rates),
        parents: cellsToArray(table.parentRates),
      },
    };
  } catch (e) {
    return fail(`fitGroupedClimatology threw: ${describeError(e)}`);
  }
}

export interface ClimatologyScoreOut {
  readonly methodTag: typeof GROUPED_CLIMATOLOGY_METHOD_TAG;
  readonly minCellN: number;
  readonly fit: ClimatologyFitOut;
  readonly score: {
    readonly n: number;
    readonly modelBrier: number;
    readonly pooledClimBrier: number;
    readonly groupedClimBrier: number;
    readonly bssPooled: number | null;
    readonly bssGrouped: number | null;
    readonly groupingLoss: boolean;
  };
  /** Per-case walk-forward climatology probability and which backoff it used. */
  readonly predictions: readonly {
    readonly group: string;
    readonly p: number;
    readonly source: "group" | "parent" | "pooled";
    readonly n: number;
  }[];
}

function validateScoredCases(cases: readonly unknown[]): string | null {
  if (!Array.isArray(cases) || cases.length === 0) {
    return "cases must be a non-empty array of ScoredCase";
  }
  for (const raw of cases) {
    if (typeof raw !== "object" || raw === null) return "cases contains a non-object case";
    const c = raw as Partial<ScoredCase>;
    if (typeof c.group !== "string" || c.group.length === 0) {
      return "each case needs a non-empty group key";
    }
    if (!isUnitInterval(c.pModel)) return `case "${c.group}" has a pModel outside [0, 1]`;
    if (!isBinary(c.y)) return `case "${c.group}" has a non-binary outcome y`;
  }
  return null;
}

/**
 * Score a model against walk-forward GROUPED climatology and the pooled dummy.
 *
 * Beating the pooled dummy is necessary and not sufficient. `groupingLoss` is
 * the honest headline: a model that beats the pooled base rate but loses to
 * the grouped cell mean has recovered the structure the dummy averaged away,
 * and that is not a priced edge. It is reported as its own boolean, not folded
 * into a single "skill" number.
 */
export function evalScoreAgainstClimatology(input: {
  readonly train: readonly ClimTrainRow[];
  readonly cases: readonly ScoredCase[];
  readonly minCellN?: number;
}): EdgeLab2Eval<ClimatologyScoreOut> {
  const { train, cases, minCellN } = input;
  const trainErr = validateTrainRows(train);
  if (trainErr !== null) return fail(trainErr);
  const caseErr = validateScoredCases(cases);
  if (caseErr !== null) return fail(caseErr);
  const minErr = validateMinCellN(minCellN);
  if (minErr !== null) return fail(minErr);

  let table: GroupedClimatology;
  try {
    table = fitGroupedClimatology(train);
  } catch (e) {
    return fail(`fitGroupedClimatology threw: ${describeError(e)}`);
  }
  if (table.n === 0) {
    return fail("train window is empty — pooled climatology would publish a 0.5 that is not evidence");
  }

  try {
    const score = scoreAgainstClimatology(
      cases,
      table,
      minCellN ?? DEFAULT_MIN_CELL_N,
    );
    for (const [label, v] of [
      ["modelBrier", score.modelBrier],
      ["pooledClimBrier", score.pooledClimBrier],
      ["groupedClimBrier", score.groupedClimBrier],
    ] as const) {
      if (!isFiniteNumber(v) || v < 0 || v > 1) {
        return fail(`climatology scorecard ${label}=${v} is outside [0, 1]`);
      }
    }
    if (score.modelBrier > score.pooledClimBrier + 1e-12) {
      return fail(
        `model Brier ${score.modelBrier} is worse than the pooled dummy ${score.pooledClimBrier} — ` +
          "reporting a skill score here would be a lie",
      );
    }
    const predictions = cases.map((c) => {
      const g = predictGrouped(c.group, c.parent, table, minCellN ?? DEFAULT_MIN_CELL_N);
      if (!isUnitInterval(g.p)) {
        throw new RangeError(`climatology prediction for group "${c.group}" escaped [0, 1]`);
      }
      return { group: c.group, p: g.p, source: g.source, n: g.n };
    });

    return {
      ok: true,
      data: {
        methodTag: GROUPED_CLIMATOLOGY_METHOD_TAG,
        minCellN: minCellN ?? DEFAULT_MIN_CELL_N,
        fit: {
          methodTag: GROUPED_CLIMATOLOGY_METHOD_TAG,
          minCellN: minCellN ?? DEFAULT_MIN_CELL_N,
          trainRows: table.n,
          pooled: { ...table.pooled },
          groups: cellsToArray(table.rates),
          parents: cellsToArray(table.parentRates),
        },
        score: {
          n: score.n,
          modelBrier: score.modelBrier,
          pooledClimBrier: score.pooledClimBrier,
          groupedClimBrier: score.groupedClimBrier,
          bssPooled: score.bssPooled,
          bssGrouped: score.bssGrouped,
          groupingLoss: score.groupingLoss,
        },
        predictions,
      },
    };
  } catch (e) {
    return fail(`scoreAgainstClimatology threw: ${describeError(e)}`);
  }
}

export interface BrierSkillOut {
  readonly modelBrier: number;
  readonly referenceBrier: number;
  /** null when the reference is unusable — never coerced to 0. */
  readonly bss: number | null;
}

/**
 * Brier skill of a model against a reference forecast.
 *
 * `bss` is null (not zero) when the reference Brier is non-finite or <= 0: a
 * perfect reference makes the ratio undefined, and a non-skillful model must
 * not be reported as "perfectly skillful" by an infinite ratio.
 */
export function evalBrierSkill(input: {
  readonly pairs: readonly { readonly p: number; readonly y: BinaryOutcome }[];
  readonly referenceProb: number;
}): EdgeLab2Eval<BrierSkillOut> {
  const { pairs, referenceProb } = input;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return fail("pairs must be a non-empty array of { p, y }");
  }
  for (const row of pairs) {
    if (typeof row !== "object" || row === null) return fail("each pair must be an object");
    if (!isUnitInterval(row.p)) return fail("every pair needs p in [0, 1]");
    if (!isBinary(row.y)) return fail("every pair needs a binary y");
  }
  if (!isUnitInterval(referenceProb)) {
    return fail("referenceProb must be in [0, 1]");
  }
  try {
    const modelBrier = brierMean(pairs);
    const referenceBrier = brierMean(
      pairs.map((row) => ({ p: referenceProb, y: row.y })),
    );
    if (!isFiniteNumber(modelBrier) || modelBrier < 0) {
      return fail("model Brier is non-finite or negative");
    }
    if (!isFiniteNumber(referenceBrier) || referenceBrier < 0) {
      return fail("reference Brier is non-finite or negative");
    }
    return {
      ok: true,
      data: { modelBrier, referenceBrier, bss: brierSkillScore(modelBrier, referenceBrier) },
    };
  } catch (e) {
    return fail(`brier skill threw: ${describeError(e)}`);
  }
}
