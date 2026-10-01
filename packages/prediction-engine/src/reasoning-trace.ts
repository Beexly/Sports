/**
 * Reasoning trace — "a reasoning engine that cannot show its reasoning is not
 * reasoning."
 *
 * WHAT THIS IS. A full, auditable account of how ONE scored pick came to be,
 * from the real `ScoredPick` the engine actually emitted plus the real
 * `OddsInput` it was minted from. Nothing in the trace is invented: every
 * number is read back off the scored output, or recomputed by calling the SAME
 * exported primitives the scorer used. This module forms no new opinions and
 * re-picks nothing.
 *
 * WHAT THE ENGINE COULD ALREADY SHOW, AND WHAT IT COULDN'T
 * (assessment; file:line in the calib-boundary worktree):
 *
 *   COULD ALREADY SHOW
 *   - `ScoredPick.reasoning` — one prose sentence (scoring.ts:783, :1044, :1390).
 *   - `ScoredPick.factorBreakdown.factors` — a flat `FactorDetail[]` of
 *     name / impact / description / weight (types/index.ts:135, :138).
 *   - Scalar channels (types/index.ts:92-136): consensusScore, marketDepthScore,
 *     edgeScore, lineMovementScore, volatilityPenalty, dataQualityScore,
 *     rankingP, rankingSource, marketFairProb, marketFairShinProb,
 *     independentEdge.
 *
 *   COULD NOT — the four gaps this module closes
 *   1. NEGATIVE SPACE. `computeGameContext` (game-context.ts:622-751) reads ~20
 *      input signals and pushes a factor ONLY when one fires. A null factor at
 *      game-context.ts:165, :247, :378, :429, :458, :541, :602, :735 is
 *      SILENT, so an input signal that produced no factor is invisible in
 *      today's output: "we saw nothing" and "we never looked" read identically.
 *      `suppressed[]` closes this.
 *   2. THE ARITHMETIC. The confidence sum is written inline with no record of
 *      which terms entered it — scoring.ts:1014-1020 (TOTAL), :657-665
 *      (SPREAD), :1320-1327 (MONEYLINE). `arithmetic` reconciles it term by
 *      term against the pick's real `confidence`.
 *   3. THE CALIBRATION SEAM. `EdgeInput.calibrator` (edge-engine.ts:104-107)
 *      applies a map at edge-engine.ts:223-232 under the LAW "absent means
 *      unchanged", but nothing downstream records whether a seam ran, what it
 *      moved, or that it moved nothing when absent. `calibrationSeam` reports
 *      seam state and seam effect. IT NEVER FITS ONE.
 *   4. THE RANKING PATH. `deriveRankingProbability` (ranking-prob.ts:42-108)
 *      blends independent trueProb with confidence; only the resulting
 *      `rankingSource` string is persisted. `ranking` shows the terms.
 *
 * THE LAWS HONOURED HERE
 *   - NO CALIBRATION MAP IS EVER FITTED IN THIS MODULE.
 *     `calibrationSeam.fittedAtRuntime` is the literal `false`. A supplied
 *     calibrator's EFFECT is shown; it is never invoked to produce a trace
 *     value. With no calibrator, the trace states the value is unchanged
 *     because nothing was applied — it does not substitute a plausible number.
 *   - NO Brier / ECE / Kelly / calibration SCORES are reported. Those are
 *     inputs and objectives, not per-pick trace fields. The only calibration
 *     content here is seam STATE and seam EFFECT.
 *   - NO SYNTHETIC SIGNAL VALUES. Every emitted number traces to a field on the
 *     ScoredPick / OddsInput, or to an exported engine primitive called with
 *     those real values. Where a number cannot be sourced the field is null and
 *     `unresolved` says why.
 *   - HONEST STRUCTURE OVER FLATTERING NUMBERS. If the trace cannot reconcile
 *     the pick's confidence, `arithmetic.reconciles` is FALSE and the residual
 *     is reported. The trace is never bent to make a pick look right.
 *
 * The load-bearing assertion is `arithmetic.reconciles`: if it is ever false on
 * a real pick, this trace is lying about how the number was made.
 *
 * The human-readable renderer lives in `reasoning-trace-render.ts`.
 */

import type {
  AtsFormBucket,
  BookmakerOddsInput,
  FactorDetail,
  IndependentMarketFairValue,
  OddsInput,
  ScoredPick,
} from "@sports/types";
import {
  americanToImpliedProbability,
  clamp,
  removeVig,
} from "./scoring.js";
import { WEIGHTS } from "./constants.js";
import {
  computeCrossMarketScore,
  computeGameContext,
  computeHeadToHeadScore,
  computeHistoricalFormScore,
  computeLineMovementScore,
  computeRestAdvantageScore,
  computeScheduleStressScore,
  computeUncertaintyPenalty,
  computeVenueFormScore,
  type GameContextScores,
} from "./game-context.js";
import { SKELLAM_COVER_SOURCE } from "./skellam.js";

// ============================================================
// Types
// ============================================================

export type SuppressionReason =
  /** The signal belongs to another market type and is deliberately not read. */
  | "NOT_APPLICABLE_TO_MARKET"
  /** Read, but the signal's own gate (sample size, threshold, floor) refused it. */
  | "GATED_NO_SCORE"
  /** Only the picked side's value is read; this is the unpicked side's. */
  | "WRONG_SIDE_NOT_READ"
  /** Read and scored non-zero, yet no factor reached factorBreakdown. */
  | "FACTOR_DROPPED";

export interface FiredSignal {
  readonly name: string;
  readonly weight: number;
  readonly impact: FactorDetail["impact"];
  readonly description: string;
  /** True when this factor's weight actually entered the confidence sum. */
  readonly enteredConfidenceSum: boolean;
  /**
   * The `GameContextInput` field(s) that fed this factor. Without this a reader
   * can see a factor fired but cannot find the input that produced it, and
   * cannot cross-check it against the suppressed half of the trace.
   */
  readonly fedBy: readonly string[];
  /** Why it was excluded, when it was (the market-echo guard). */
  readonly exclusionReason?: string;
}

export interface SuppressedSignal {
  /** The `GameContextInput` field that WAS present in the input. */
  readonly field: string;
  readonly signal: string;
  readonly reason: SuppressionReason;
  /** Never empty. */
  readonly explanation: string;
  /** The real value read off the input, rendered for display. */
  readonly inputValue: string;
  /** The score the engine's own primitive produced, when this market reads it. */
  readonly computedScore: number | null;
}

export interface ConfidenceTerm {
  readonly label: string;
  readonly value: number;
  readonly enteredSum: boolean;
  /** Field on the pick, or the engine primitive that produced the value. */
  readonly source: string;
  readonly exclusionReason?: string;
}

export interface ConfidenceArithmetic {
  readonly terms: readonly ConfidenceTerm[];
  /** The flat +10 board-quality base the scorer adds (scoring.ts:1017, :662, :1324). */
  readonly base: number;
  /** Sum of the terms whose `enteredSum` is true, before the base. */
  readonly includedSum: number;
  /** includedSum + base, after clamp(0, 100). */
  readonly clampedSum: number;
  /** What the engine actually published. */
  readonly pickConfidence: number;
  /** includedSum + base, clamped and rounded, === pickConfidence. The key assertion. */
  readonly reconciles: boolean;
  /** pickConfidence − recomputed. Non-zero means the trace could not reconcile. */
  readonly residual: number;
}

export interface CalibrationSeam {
  /** True when the caller supplied `context.probrequencyCalibrator`. */
  readonly present: boolean;
  /** ALWAYS false. This module never fits a calibration map. */
  readonly fittedAtRuntime: false;
  /** Independent blend as the engine computed it BEFORE the seam. */
  readonly beforeSeam: number | null;
  /** Published `independentEdge.trueProb` — after the seam. */
  readonly afterSeam: number | null;
  /** afterSeam − beforeSeam. Exactly 0 when a seam ran, and equal values when absent. */
  readonly delta: number | null;
  /** True only when a seam was present AND it moved the probability. */
  readonly changedValue: boolean;
  readonly note: string;
}

export interface IndependentEdgeTrace {
  readonly assessed: boolean;
  /** Sources the scorer actually blended for this market. */
  readonly sourcesConsulted: readonly string[];
  /** Sources supplied in the input that this market's scorer does not read. */
  readonly sourcesNotConsulted: readonly string[];
  /** Per-source independent probability for the chosen side, as supplied. */
  readonly sourceProbabilities: readonly { source: string; prob: number | null }[];
  /** Weighted blend of those estimates (all supplied weights default to 1). */
  readonly blendedProbability: number | null;
  /** The market's own de-vigged fair value for the chosen side. */
  readonly marketFairProbability: number | null;
  readonly rawEdge: number | null;
  readonly shrunkEdge: number | null;
  readonly agreement: string;
  readonly decision: string;
  readonly priced: boolean;
  readonly expectedClv: number | null;
  readonly conviction: number | null;
  readonly rationale: string | null;
  /** True when the adverse-price withhold gate would refuse this pick (types/index.ts:86). */
  readonly pricesWorseThanMarket: boolean;
}

export interface RankingTrace {
  readonly rankingScore: number;
  readonly rankingP: number | null;
  readonly source: string;
  /** Confidence as a probability — the blend's other term (ranking-prob.ts:57-59). */
  readonly confidenceAsProbability: number;
  readonly independentTrueProb: number | null;
  /** Weight on the independent term (ranking-prob.ts:85, default 0.7). */
  readonly independentWeight: number;
  /** The literal blend arithmetic used, or null when confidence alone ranked. */
  readonly blendedFormula: string | null;
  readonly priced: boolean;
}

export interface MarketRead {
  readonly bookmakerCount: number;
  readonly consensusPct: number;
  readonly marketFairProb: number | null;
  readonly marketFairMethod: string | null;
  /** Shin's method on the same market/side — display only; no scoring path reads it. */
  readonly marketFairShinProb: number | null;
  readonly entryPrice: number | null;
  readonly edgeScore: number;
  readonly dataQualityScore: number;
  /** Real book rows the pick rests on, from the input. */
  readonly books: readonly { bookmaker: string; line?: number; price?: number }[];
  /** Two-way implied-probability sum (the book's overround) where computable. */
  readonly twoSidedImpliedSum: number | null;
  /** Overround ≥ 1 ⇒ the market is internally consistent (scoring.ts:369). */
  readonly marketConsistent: boolean;
}

export interface ReasoningTrace {
  readonly schema: "sports.reasoning-trace.v1";
  readonly gameId: string;
  readonly sport: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly pickType: ScoredPick["pickType"];
  readonly selection: string;
  readonly line: number;
  readonly pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER";
  readonly modelVersion: string;
  readonly dataFreshnessAt: string;
  readonly fired: readonly FiredSignal[];
  /** Input signals present that produced NO factor. The negative space. */
  readonly suppressed: readonly SuppressedSignal[];
  readonly arithmetic: ConfidenceArithmetic;
  readonly market: MarketRead;
  readonly independentEdge: IndependentEdgeTrace;
  readonly calibrationSeam: CalibrationSeam;
  readonly ranking: RankingTrace;
  readonly pick: {
    readonly confidence: number;
    readonly tier: string;
    readonly pickGrade: string;
    readonly riskLevel: string;
    readonly edgeScore: number;
    readonly reasoning: string;
  };
  /** Honest self-report: things this trace could not source. Empty is the goal. */
  readonly unresolved: readonly string[];
}

// ============================================================
// Small helpers
// ============================================================

function num(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(4);
}

function fmtBucket(b: AtsFormBucket): string {
  return `${b.wins}-${b.losses}${b.pushes > 0 ? `-${b.pushes}` : ""} (n=${b.sampleSize})`;
}

/** Exactly the scorer's own final step (scoring.ts:657, :1014, :1320). */
function finishConfidence(v: number): number {
  return Math.round(clamp(v, 0, 100));
}

/**
 * Which independent fair values does THIS market's scorer actually read?
 * SPREAD takes only the Skellam cover source (scoring.ts:669-671); MONEYLINE
 * takes everything EXCEPT it (scoring.ts:1308); TOTAL reads none (its
 * factorBreakdown at scoring.ts:1054-1070 carries no independentEdge).
 */
function sourcesForMarket(
  pickType: ScoredPick["pickType"],
  fairValues: readonly IndependentMarketFairValue[] | undefined,
): { consulted: string[]; notConsulted: string[] } {
  const all = (fairValues ?? []).map((fv) => fv.source);
  if (pickType === "TOTAL") return { consulted: [], notConsulted: all };
  if (pickType === "SPREAD") {
    return {
      consulted: all.filter((s) => s === SKELLAM_COVER_SOURCE),
      notConsulted: all.filter((s) => s !== SKELLAM_COVER_SOURCE),
    };
  }
  return {
    consulted: all.filter((s) => s !== SKELLAM_COVER_SOURCE),
    notConsulted: all.filter((s) => s === SKELLAM_COVER_SOURCE),
  };
}

/** Market key for this pick type, as the scorer filters bookmakerOdds. */
function marketKeyFor(pickType: ScoredPick["pickType"]): "H2H" | "SPREADS" | "TOTALS" {
  return pickType === "MONEYLINE" ? "H2H" : pickType === "SPREAD" ? "SPREADS" : "TOTALS";
}

/**
 * The complete, two-sided book set each scorer prices from — the same filters
 * the scorers apply (scoring.ts:1229, :465, :876).
 */
function pricedBookSet(
  pickType: ScoredPick["pickType"],
  input: OddsInput,
): { rows: BookmakerOddsInput[]; overround: number | null } {
  const market = marketKeyFor(pickType);

  if (market === "H2H") {
    const rows = input.bookmakerOdds.filter(
      (o) => o.market === "H2H" && o.homePrice !== undefined && o.awayPrice !== undefined,
    );
    if (rows.length === 0) return { rows, overround: null };
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const overround =
      mean(rows.map((o) => americanToImpliedProbability(o.homePrice!))) +
      mean(rows.map((o) => americanToImpliedProbability(o.awayPrice!)));
    return { rows, overround };
  }

  if (market === "SPREADS") {
    const rows = input.bookmakerOdds.filter(
      (o) =>
        o.market === "SPREADS" &&
        o.spread !== undefined &&
        o.homeSpreadPrice !== undefined &&
        o.awaySpreadPrice !== undefined,
    );
    if (rows.length === 0) return { rows, overround: null };
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const overround =
      mean(rows.map((o) => americanToImpliedProbability(o.homeSpreadPrice!))) +
      mean(rows.map((o) => americanToImpliedProbability(o.awaySpreadPrice!)));
    return { rows, overround };
  }

  const rows = input.bookmakerOdds.filter(
    (o) =>
      o.market === "TOTALS" &&
      o.total !== undefined &&
      o.overPrice !== undefined &&
      o.underPrice !== undefined,
  );
  if (rows.length === 0) return { rows, overround: null };
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const overround =
    mean(rows.map((o) => americanToImpliedProbability(o.overPrice!))) +
    mean(rows.map((o) => americanToImpliedProbability(o.underPrice!)));
  return { rows, overround };
}

// ============================================================
// Fired signals
// ============================================================

/**
 * Factor names deliberately EXCLUDED from the confidence sum by the
 * market-echo guard, yet still shipped as context (scoring.ts:258-272,
 * :378-397, :616-655). They read weight 0 beside an excluded term.
 */
const MARKET_ECHO_FACTORS = new Map<string, string>([
  [
    "Pricing Edge",
    "Market-internal: the book's own de-vigged fair value versus the offered price. Both inputs are market quantities, so it is excluded from confidence (scoring.ts:378-397). Its value ships as edgeScore.",
  ],
  [
    "Cross-Market Alignment",
    "Cross-market bonus: the H2H market's de-vigged probability added to a spread pick. A market-probability channel, so it is excluded from confidence (scoring.ts:616-655).",
  ],
  [
    "Cross-Market Divergence",
    "Cross-market penalty: the H2H market's de-vigged probability subtracted from a spread pick. A market-probability channel, so it is excluded from confidence (scoring.ts:616-655).",
  ],
]);

/**
 * The Independent Edge factor's weight is the RANKING delta
 * (`rankingScore − confidence`, scoring.ts:1350-1352) — not a confidence term.
 * It moved `rankingScore`, never `confidence`, so it is grouped with the
 * excluded factors rather than the included ones.
 */
const INDEPENDENT_EDGE_PREFIX = "Independent Edge";
const INDEPENDENT_EDGE_EXCLUSION =
  "Ranking delta, not a confidence term: this weight is `rankingScore − confidence` (scoring.ts:1350-1352). It moved the RANKING key only; the confidence sum never saw it.";

/**
 * Which `GameContextInput` fields feed each factor. Derived from the engine's
 * own gating in `computeGameContext` (game-context.ts:629-751) so a reader can
 * trace any factor back to the input that produced it, and can confirm that
 * every field is accounted for in either `fired` or `suppressed`.
 */
const FACTOR_INPUT_FIELDS: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/^Home ATS Form$/, ["homeAtsForm"]],
  [/^Away ATS Form$/, ["awayAtsForm"]],
  [/^Home Venue Form$/, ["homeAtsFormAtHome"]],
  [/^Away Venue Form$/, ["awayAtsFormAway"]],
  [/^Head-to-Head Form$/, ["headToHeadForm"]],
  [/^Rest Advantage$/, ["restDaysHome", "restDaysAway", "isBackToBackHome", "isBackToBackAway"]],
  [/^Schedule Density$/, ["scheduleDensityHome", "scheduleDensityAway"]],
  [/^Cross-Market/, ["mlFairProbHome"]],
  [/^Signal Conflict$/, ["lineMovementScore", "historicalFormScore", "headToHeadScore", "crossMarketScore"]],
  [/^Line Movement$/, ["openingSpread", "currentSpread", "openingTotal", "currentTotal"]],
  [/^Data Quality$/, ["bookmakerCoverageMax", "dataFreshnessMinutes", "hasSpreadMarket", "hasTotalMarket", "hasH2HMarket"]],
  [/^Bookmaker Consensus$/, ["bookmakerOdds"]],
  [/^Market Coverage$/, ["bookmakerCoverageMax", "bookmakerOdds"]],
  [/^Pricing Edge$/, ["bookmakerOdds"]],
  [/^Independent Edge/, ["independentFairValues"]],
];

function inputFieldsFor(factorName: string): readonly string[] {
  for (const [pattern, fields] of FACTOR_INPUT_FIELDS) {
    if (pattern.test(factorName)) return fields;
  }
  return [];
}

function firedSignals(factors: readonly FactorDetail[]): FiredSignal[] {
  return factors
    // Shadow evidence factors are provenance, not signal: weight 0 by
    // construction (scoring.ts:143-159). Reported in `suppressed`, not `fired`.
    .filter((f) => !f.name.startsWith("Shadow "))
    .map((f) => {
      const exclusion = MARKET_ECHO_FACTORS.get(f.name) ??
        (f.name.startsWith(INDEPENDENT_EDGE_PREFIX) ? INDEPENDENT_EDGE_EXCLUSION : undefined);
      return {
        name: f.name,
        weight: f.weight,
        impact: f.impact,
        description: f.description,
        enteredConfidenceSum: exclusion === undefined,
        fedBy: inputFieldsFor(f.name),
        ...(exclusion ? { exclusionReason: exclusion } : {}),
      };
    });
}

// ============================================================
// Suppressed signals — input fields that produced NO factor
// ============================================================

/**
 * Walk every `GameContextInput` signal field this market reads and decide
 * whether it fired. A field present in the input whose signal produced no
 * factor lands in `suppressed[]` with the engine's own reason — which is the
 * negative space the flat factor list structurally cannot express.
 *
 * Nothing here re-decides the pick: the side comes off the emitted pick, and
 * every gate explanation names the engine primitive that made the call.
 */
/**
 * The engine's OWN cross-market input, recomputed the way each scorer
 * computes it — never taken at face value from `input.context`.
 *
 * FINDING (reported, not worked around): a caller-supplied
 * `context.mlFairProbHome` is IGNORED by every scorer. Each one OVERWRITES the
 * field with a value derived from the input's own H2H book rows —
 * scoring.ts:571-586 (SPREAD) and the equivalent in scoreMoneyline /
 * scoreTotalPick — and it derives that value only when ≥ 2 complete H2H rows
 * exist, otherwise setting it to null. So supplying `mlFairProbHome: 0.82` on
 * an input with no H2H rows produces NO cross-market factor at all, and the
 * supplied 0.82 is dead. This trace reports the DERIVED value the scorer used
 * and records the discarded one as a suppressed signal.
 */
function derivedMlFairProbHome(input: OddsInput): number | null {
  const h2h = input.bookmakerOdds.filter(
    (o) => o.market === "H2H" && o.homePrice !== undefined && o.awayPrice !== undefined,
  );
  if (h2h.length < 2) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const avgHome = mean(h2h.map((o) => americanToImpliedProbability(o.homePrice!)));
  const avgAway = mean(h2h.map((o) => americanToImpliedProbability(o.awayPrice!)));
  return removeVig(avgHome, avgAway).home;
}

function probeSuppressions(
  pick: ScoredPick,
  input: OddsInput,
  factors: readonly FactorDetail[],
  ctx: GameContextScores | null,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER",
): SuppressedSignal[] {
  const c = input.context;
  if (!c) return [];

  const out: SuppressedSignal[] = [];
  const firedNames = new Set(factors.map((f) => f.name));
  const isTotals = pick.pickType === "TOTAL";
  const isSideSpecific = pickedSide === "HOME" || pickedSide === "AWAY";
  /** The mlFairProbHome the SCORER used — derived, never the supplied field. */
  const derivedMlFair = derivedMlFairProbHome(input);

  /** Record a suppression only when the factor is genuinely absent. */
  const add = (
    factorName: string,
    entry: Omit<SuppressedSignal, "signal"> & { signal?: string },
  ) => {
    if (firedNames.has(factorName)) return;
    out.push({
      field: entry.field,
      signal: entry.signal ?? factorName,
      reason: entry.reason,
      explanation: entry.explanation,
      inputValue: entry.inputValue,
      computedScore: entry.computedScore,
    });
  };

  // ── Line movement (game-context.ts:629-649) ─────────────────────────────
  if (pick.pickType === "SPREAD" || isTotals) {
    const open = isTotals ? c.openingTotal : c.openingSpread;
    const cur = isTotals ? c.currentTotal : c.currentSpread;
    const present = open != null || cur != null;
    if (present) {
      const lm = computeLineMovementScore(
        open,
        cur,
        pick.pickType === "SPREAD" ? "SPREAD" : "TOTAL",
        pickedSide as "HOME" | "AWAY" | "OVER" | "UNDER",
      );
      add("Line Movement", {
        field: isTotals ? "openingTotal/currentTotal" : "openingSpread/currentSpread",
        inputValue: `open=${open ?? "null"} current=${cur ?? "null"}`,
        computedScore: lm.score,
        reason: lm.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
        explanation:
          lm.score === 0
            ? `Both fields were supplied but the delta (${lm.delta ?? "n/a"}) is below the 0.1pt movement floor, so the signal scored 0 and emitted no weight (game-context.ts:69-71).`
            : `The signal scored ${num(lm.score)} yet no Line Movement factor reached factorBreakdown.`,
      });
    }
  }

  // ── Rest advantage (game-context.ts:651-663) ────────────────────────────
  const restPresent =
    c.restDaysHome != null ||
    c.restDaysAway != null ||
    c.isBackToBackHome === true ||
    c.isBackToBackAway === true;
  if (restPresent) {
    const restScore = isSideSpecific
      ? computeRestAdvantageScore(
          c.restDaysHome,
          c.restDaysAway,
          c.isBackToBackHome,
          c.isBackToBackAway,
          pickedSide,
        ).score
      : null;
    add("Rest Advantage", {
      field: "restDaysHome/restDaysAway/isBackToBackHome/isBackToBackAway",
      inputValue:
        `home=${c.restDaysHome ?? "null"}d away=${c.restDaysAway ?? "null"}d ` +
        `b2bHome=${c.isBackToBackHome === true} b2bAway=${c.isBackToBackAway === true}`,
      computedScore: restScore,
      reason: !isSideSpecific
        ? "NOT_APPLICABLE_TO_MARKET"
        : restScore === 0
          ? "GATED_NO_SCORE"
          : "FACTOR_DROPPED",
      explanation: !isSideSpecific
        ? "A total is side-agnostic: the scorer deliberately never reads rest for a TOTAL (game-context.ts:653), so this input could not produce a factor."
        : restScore === 0
          ? "Rest inputs were read but the differential from the picked side's perspective was zero, so no weight was emitted (game-context.ts:165)."
          : `The signal scored ${num(restScore!)} yet no Rest Advantage factor reached factorBreakdown.`,
    });
  }

  // ── Historical ATS form (game-context.ts:665-675) ───────────────────────
  if (isSideSpecific) {
    const pickedIsHome = pickedSide === "HOME";
    const pickedForm = pickedIsHome ? c.homeAtsForm : c.awayAtsForm;
    const otherForm = pickedIsHome ? c.awayAtsForm : c.homeAtsForm;
    const label = pickedIsHome ? "Home" : "Away";

    if (pickedForm) {
      const hf = computeHistoricalFormScore(pickedForm, label);
      const decided = pickedForm.wins + pickedForm.losses;
      add(`${label} ATS Form`, {
        field: pickedIsHome ? "homeAtsForm" : "awayAtsForm",
        inputValue: fmtBucket(pickedForm),
        computedScore: hf.score,
        reason: hf.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
        explanation:
          hf.score === 0
            ? `Read ${fmtBucket(pickedForm)} — ${
                decided < 5
                  ? `only ${decided} DECIDED games, below the 5-game minimum (game-context.ts:205)`
                  : "the ATS rate sits in the neutral band, so the signal scored 0 (game-context.ts:231-247)"
              } — no weight emitted.`
            : `The signal scored ${num(hf.score)} yet no ${label} ATS Form factor reached factorBreakdown.`,
      });
    }
    if (otherForm) {
      out.push({
        field: pickedIsHome ? "awayAtsForm" : "homeAtsForm",
        signal: `${pickedIsHome ? "Away" : "Home"} ATS Form`,
        reason: "WRONG_SIDE_NOT_READ",
        explanation: `The scorer reads only the PICKED side's ATS bucket (game-context.ts:667-675). This is the unpicked side's record (${fmtBucket(otherForm)}), so it never entered the decision at all.`,
        inputValue: fmtBucket(otherForm),
        computedScore: null,
      });
    }

    // The unpicked side's VENUE split is likewise never read — the venue probe
    // above only consults the picked side's bucket (game-context.ts:679-687).
    const otherVenueField = pickedIsHome ? "awayAtsFormAway" : "homeAtsFormAtHome";
    const otherVenueLabel = pickedIsHome ? "Away" : "Home";
    const otherVenue = pickedIsHome ? c.awayAtsFormAway : c.homeAtsFormAtHome;
    if (otherVenue) {
      out.push({
        field: otherVenueField,
        signal: `${otherVenueLabel} Venue Form`,
        reason: "WRONG_SIDE_NOT_READ",
        explanation: `The scorer reads only the PICKED side's venue-specific ATS bucket (game-context.ts:679-687). This is the unpicked side's venue split (${fmtBucket(otherVenue)}), so it never entered the decision at all.`,
        inputValue: fmtBucket(otherVenue),
        computedScore: null,
      });
    }

    // ── Venue-specific ATS form (game-context.ts:677-687) ────────────────
    const venue = pickedIsHome ? c.homeAtsFormAtHome : c.awayAtsFormAway;
    if (venue) {
      const vf = computeVenueFormScore(venue, label);
      const decided = venue.wins + venue.losses;
      add(`${label} Venue Form`, {
        field: pickedIsHome ? "homeAtsFormAtHome" : "awayAtsFormAway",
        inputValue: fmtBucket(venue),
        computedScore: vf.score,
        reason: vf.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
        explanation:
          vf.score === 0
            ? `Read ${fmtBucket(venue)} — ${
                decided < 5
                  ? `only ${decided} DECIDED games, below the 5-game minimum (game-context.ts:404)`
                  : "the venue ATS rate sits in the neutral band, so the signal scored 0 (game-context.ts:429-437)"
              } — no weight emitted.`
            : `The signal scored ${num(vf.score)} yet no ${label} Venue Form factor reached factorBreakdown.`,
      });
    }

    // ── Head-to-head form (game-context.ts:689-695) ───────────────────────
    // NOTE: H2H and Schedule Density are NOT inside the side-specific gate,
    // because the engine does not gate them that way. computeHeadToHeadScore
    // is reached only for a HOME/AWAY side and computeScheduleStressScore
    // returns 0 for OVER/UNDER (game-context.ts:508-513, :691) — but the
    // engine still READS the fields and emits nothing, which is precisely the
    // silence this trace exists to make visible. They are probed below for
    // every market.
  }

  // ── Head-to-head form (game-context.ts:689-695) ─────────────────────────
  // Probed for EVERY market: a total is side-agnostic, so the engine reads the
  // bucket and structurally cannot score it (game-context.ts:691).
  if (c.headToHeadForm) {
    if (isSideSpecific) {
      const h2h = computeHeadToHeadScore(c.headToHeadForm);
      const decided = c.headToHeadForm.wins + c.headToHeadForm.losses;
      add("Head-to-Head Form", {
        field: "headToHeadForm",
        inputValue: fmtBucket(c.headToHeadForm),
        computedScore: h2h.score,
        reason: h2h.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
        explanation:
          h2h.score === 0
            ? `Read ${fmtBucket(c.headToHeadForm)} — ${
                decided < 5
                  ? `only ${decided} DECIDED games, below the stricter 5-game H2H minimum (game-context.ts:347)`
                  : "the H2H ATS rate sits in the neutral band, so the signal scored 0 (game-context.ts:373-381)"
              } — no weight emitted.`
            : `The signal scored ${num(h2h.score)} yet no Head-to-Head Form factor reached factorBreakdown.`,
      });
    } else {
      out.push({
        field: "headToHeadForm",
        signal: "Head-to-Head Form",
        reason: "NOT_APPLICABLE_TO_MARKET",
        explanation: `Head-to-head ATS form is only read for a side-specific pick; an OVER/UNDER total has no side to attach an H2H ATS record to (game-context.ts:691). The bucket ${fmtBucket(c.headToHeadForm)} was supplied and structurally cannot affect a total.`,
        inputValue: fmtBucket(c.headToHeadForm),
        computedScore: null,
      });
    }
  }

  // ── Schedule density (game-context.ts:716-724) ─────────────────────────
  // Probed for EVERY market: computeScheduleStressScore explicitly returns 0
  // for OVER/UNDER (game-context.ts:508-513).
  if (c.scheduleDensityHome != null || c.scheduleDensityAway != null) {
    const home = c.scheduleDensityHome;
    const away = c.scheduleDensityAway;
    const diff = home != null && away != null ? home - away : null;
    if (isSideSpecific) {
      const ss = computeScheduleStressScore(home, away, pickedSide);
      add("Schedule Density", {
        field: "scheduleDensityHome/scheduleDensityAway",
        inputValue: `home=${home ?? "null"} away=${away ?? "null"} (games in last 7d)`,
        computedScore: ss.score,
        reason: ss.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
        explanation:
          ss.score === 0
            ? home == null || away == null
              ? "One density is missing, so the asymmetry cannot be measured and the signal scored 0 (game-context.ts:516)."
              : `The 7-day game counts differ by ${Math.abs(diff!)}, below the 2-game asymmetry gate (game-context.ts:525), so the signal scored 0.`
            : `The signal scored ${num(ss.score)} yet no Schedule Density factor reached factorBreakdown.`,
      });
    } else {
      out.push({
        field: "scheduleDensityHome/scheduleDensityAway",
        signal: "Schedule Density",
        reason: "NOT_APPLICABLE_TO_MARKET",
        explanation: `Totals are not side-specific, so computeScheduleStressScore returns 0 for an OVER/UNDER side by construction (game-context.ts:508-513). The densities home=${home ?? "null"} away=${away ?? "null"} were supplied but cannot be attributed to a side of a total, so they scored nothing.`,
        inputValue: `home=${home ?? "null"} away=${away ?? "null"} (games in last 7d)`,
        computedScore: null,
      });
    }
  }

  // ── Cross-market agreement (game-context.ts:697-704) ────────────────────
  //
  // Cross-market is scored off the moneyline the scorer ITSELF derived from the
  // input's H2H rows, never off `context.mlFairProbHome` — each scorer
  // overwrites that field before calling computeGameContext (scoring.ts:571-586
  // for SPREAD). Two distinct suppressions can therefore arise and both are
  // reported:
  //   (a) the caller supplied `mlFairProbHome` but the scorer discarded it;
  //   (b) no H2H rows exist, so the derived value is null and the signal cannot
  //       score at all.
  const crossMarketApplicable = pick.pickType === "SPREAD";
  if (c.mlFairProbHome != null) {
    out.push({
      field: "context.mlFairProbHome (supplied)",
      signal: "Cross-Market Agreement",
      reason: "FACTOR_DROPPED",
      explanation:
        `The caller supplied mlFairProbHome=${c.mlFairProbHome}, but every scorer OVERWRITES that field with a value derived from the input's own H2H book rows before calling computeGameContext (scoring.ts:571-586). The value the scorer actually used was ${derivedMlFair == null ? "null" : derivedMlFair.toFixed(4)}, so the supplied ${c.mlFairProbHome} never entered the decision. This is reported rather than silently used, because a caller reading the type would reasonably believe otherwise.`,
      inputValue: `supplied=${c.mlFairProbHome} · scorer used=${derivedMlFair == null ? "null (no H2H rows)" : derivedMlFair.toFixed(4)}`,
      computedScore: null,
    });
  }
  if (!crossMarketApplicable) {
    out.push({
      field: "derived mlFairProbHome (H2H book rows)",
      signal: "Cross-Market Agreement",
      reason: "NOT_APPLICABLE_TO_MARKET",
      explanation: `Cross-market agreement is defined only as SPREAD-versus-MONEYLINE (game-context.ts:457). This ${pick.pickType} scorer never reads it, so the moneyline fair probability it derived (${derivedMlFair == null ? "null" : derivedMlFair.toFixed(4)}) could not produce a factor here.`,
      inputValue: `derived=${derivedMlFair == null ? "null" : derivedMlFair.toFixed(4)}`,
      computedScore: null,
    });
  } else if (derivedMlFair == null) {
    out.push({
      field: "derived mlFairProbHome (H2H book rows)",
      signal: "Cross-Market Agreement",
      reason: "GATED_NO_SCORE",
      explanation:
        "The scorer derives the cross-market moneyline from the input's H2H rows and needs at least 2 complete two-sided H2H rows (scoring.ts:574). This input has fewer, so the derived probability is null and the signal cannot score (game-context.ts:457-462).",
      inputValue: "derived=null — fewer than 2 complete H2H rows in the input",
      computedScore: null,
    });
  } else {
    const cm = computeCrossMarketScore(
      pickedSide as "HOME" | "AWAY",
      derivedMlFair,
      pick.pickType,
    );
    const factorName = cm.factor?.name ?? "Cross-Market Alignment";
    add(factorName, {
      field: "derived mlFairProbHome (H2H book rows)",
      inputValue: `derived=${derivedMlFair.toFixed(4)}`,
      computedScore: cm.score,
      reason: cm.score === 0 ? "GATED_NO_SCORE" : "FACTOR_DROPPED",
      explanation:
        cm.score === 0
          ? Math.abs(derivedMlFair - 0.5) < 0.05
            ? `The derived moneyline sits at ${(derivedMlFair * 100).toFixed(1)}%, inside the ±5pt near-coin-flip floor, so the signal scored 0 (game-context.ts:461-463).`
            : `The derived moneyline at ${(derivedMlFair * 100).toFixed(1)}% put the signal outside every agreement/divergence band, so it scored 0 (game-context.ts:466-490).`
          : `The signal scored ${num(cm.score)} yet no cross-market factor reached factorBreakdown.`,
    });
  }

  // ── Signal-conflict detector (game-context.ts:706-714) ─────────────────
  // A derived signal with no input field of its own; it fires only when other
  // signals contradict. Reported from the computed context scores.
  if (ctx && ctx.uncertaintyPenalty === 0) {
    const up = computeUncertaintyPenalty(
      ctx.lineMovementScore,
      ctx.historicalFormScore,
      ctx.headToHeadScore,
      ctx.crossMarketScore,
    );
    if (up.penalty === 0) {
      out.push({
        field: "(derived from lineMovementScore × historicalFormScore × headToHeadScore × crossMarketScore)",
        signal: "Signal Conflict",
        reason: "GATED_NO_SCORE",
        explanation:
          "The conflict detector ran on this pick's own signal values and found no contradicting combination, so it scored 0 and emitted no weight (game-context.ts:602).",
        inputValue:
          `lineMovement=${num(ctx.lineMovementScore)} form=${num(ctx.historicalFormScore)} ` +
          `h2h=${num(ctx.headToHeadScore)} crossMarket=${num(ctx.crossMarketScore)}`,
        computedScore: 0,
      });
    }
  }

  // ── Independent fair values this market does not consult ───────────────
  const split = sourcesForMarket(pick.pickType, c.independentFairValues);
  const fvs = c.independentFairValues ?? [];
  for (const src of split.notConsulted) {
    const fv = fvs.find((f) => f.source === src)!;
    const prob = pickedSide === "AWAY" ? fv.awayFairProb : fv.homeFairProb;
    out.push({
      field: `independentFairValues[${src}]`,
      signal: "Independent Edge",
      reason: pick.pickType === "TOTAL" ? "NOT_APPLICABLE_TO_MARKET" : "WRONG_SIDE_NOT_READ",
      explanation:
        pick.pickType === "TOTAL"
          ? `The TOTAL scorer never consults independent fair values at all (its factorBreakdown at scoring.ts:1054-1070 carries no independentEdge), so ${src} at ${prob ?? "null"} could not affect this pick.`
          : pick.pickType === "SPREAD"
            ? `The SPREAD scorer consults ONLY the Skellam cover source (scoring.ts:669-671), so ${src} at ${prob ?? "null"} was filtered out before blending.`
            : `The MONEYLINE scorer consults everything EXCEPT the Skellam cover source (scoring.ts:1308), so ${src} at ${prob ?? "null"} was filtered out before blending.`,
      inputValue: `${src}: home=${fv.homeFairProb ?? "null"} away=${fv.awayFairProb ?? "null"}`,
      computedScore: null,
    });
  }

  // ── A supplied calibrator is state, not a score. Report it, never fit it.
  if (c.probabilityCalibrator) {
    out.push({
      field: "probabilityCalibrator",
      signal: "Calibration Seam",
      reason: "NOT_APPLICABLE_TO_MARKET",
      explanation:
        "An offline-fitted recalibrator WAS supplied for this pick, so edge-engine.ts:223-232 applied it to the blended probability before any edge was derived. It is a seam, not a signal: it carries no weight into the confidence sum and produced no factor. See `calibrationSeam` for its effect. This trace fitted nothing.",
      inputValue: "supplied by caller (offline-fitted map)",
      computedScore: null,
    });
  }

  return out;
}

// ============================================================
// Confidence arithmetic
// ============================================================

/**
 * Rebuild the confidence sum term by term, exactly as scoring.ts writes it.
 *
 * SPREAD (scoring.ts:657-665) and MONEYLINE (scoring.ts:1320-1327) carry the
 * same twelve terms; TOTAL (scoring.ts:1014-1020) carries six, because
 * computeGameContext returns zero for every side-specific signal on a total.
 * `reconciles` is the load-bearing honesty check: it must be true, and if it is
 * ever false the residual is reported rather than absorbed.
 */
function buildArithmetic(
  pick: ScoredPick,
  fb: ScoredPick["factorBreakdown"],
): ConfidenceArithmetic {
  const isTotals = pick.pickType === "TOTAL";
  const terms: ConfidenceTerm[] = [];

  const add = (
    label: string,
    value: number,
    source: string,
    enteredSum: boolean,
    exclusionReason?: string,
  ) => {
    terms.push({
      label,
      value,
      source,
      enteredSum,
      ...(enteredSum ? {} : { exclusionReason }),
    });
  };

  // Consensus — every market.
  add("Bookmaker Consensus", fb.consensusScore, "factorBreakdown.consensusScore", true);

  // Market depth — every market.
  add(
    "Market Coverage",
    fb.marketDepthScore,
    "factorBreakdown.marketDepthScore",
    true,
  );

  // Volatility penalty — every market.
  add(
    "Market Risk (volatility penalty)",
    fb.volatilityPenalty,
    "factorBreakdown.volatilityPenalty",
    true,
  );

  // Line movement — every market.
  add(
    "Line Movement",
    fb.lineMovementScore,
    "factorBreakdown.lineMovementScore",
    true,
  );

  // Data-quality penalty. NOTE the subtlety: `factorBreakdown.dataQualityScore`
  // is the 0-100 quality score, NOT the penalty. The penalty lives only on the
  // "Data Quality" factor's weight (game-context.ts:303-317), and that factor
  // is emitted only when the score is below 50 — above which the penalty is a
  // genuine 0. Reading it off the factor is the only faithful source.
  const dqFactor = fb.factors.find((f) => f.name === "Data Quality");
  add(
    "Data Quality (penalty)",
    dqFactor ? dqFactor.weight : 0,
    dqFactor
      ? 'factorBreakdown.factors["Data Quality"].weight (game-context.ts:303-317)'
      : "0 — dataQualityScore ≥ 50 so computeDataQuality emitted no factor and no penalty (game-context.ts:319-321)",
    true,
  );

  // Side-specific context terms. TOTAL excludes them all: computeGameContext
  // scores rest only for non-TOTAL (game-context.ts:653), ATS form only for a
  // HOME/AWAY side (:667-675), venue form only for a HOME/AWAY side (:679-687),
  // H2H only for a HOME/AWAY side (:691), schedule stress never for a total
  // (:513) — and the TOTAL sum at scoring.ts:1014-1020 omits them to match.
  const sideTerms: Array<[string, number | undefined, string]> = [
    [
      "Rest Advantage",
      undefined,
      "No Rest Advantage factor fired, so computeRestAdvantageScore returned 0 (game-context.ts:165).",
    ],
    [
      `${pick.pickType === "SPREAD" || pick.pickType === "MONEYLINE" ? "" : ""}Historical ATS Form`,
      undefined,
      "No ATS Form factor fired, so computeHistoricalFormScore returned 0 (game-context.ts:247).",
    ],
    [
      "Head-to-Head Form",
      fb.headToHeadScore,
      "factorBreakdown.headToHeadScore (undefined when 0, scoring.ts:811)",
    ],
    [
      "Venue Form",
      fb.venueFormScore,
      "factorBreakdown.venueFormScore (undefined when 0, scoring.ts:812)",
    ],
    [
      "Signal Conflict (uncertainty penalty)",
      fb.uncertaintyPenalty,
      "factorBreakdown.uncertaintyPenalty (undefined when 0, scoring.ts:813)",
    ],
    [
      "Schedule Density",
      fb.scheduleStressScore,
      "factorBreakdown.scheduleStressScore (undefined when 0, scoring.ts:815)",
    ],
  ];

  for (const [label, scalar, scalarSource] of sideTerms) {
    // Prefer the scalar channel on the pick; fall back to the factor weight the
    // way the scorer read it.
    let value: number | undefined = scalar;
    let source = scalarSource;
    if (value === undefined) {
      const f = fb.factors.find((x) =>
        label.startsWith("Historical")
          ? x.name.endsWith("ATS Form")
          : label.startsWith("Venue")
            ? x.name.endsWith("Venue Form")
            : x.name === label ||
              (label === "Rest Advantage" && x.name === "Rest Advantage") ||
              (label === "Schedule Density" && x.name === "Schedule Density"),
      );
      value = f ? f.weight : 0;
      source = f
        ? `factorBreakdown.factors["${f.name}"].weight`
        : "0 — no factor fired for this signal";
    }
    add(label, value, source, !isTotals, isTotals
      ? "Excluded from the TOTAL sum: a total is side-agnostic, so computeGameContext scores this signal 0 for a TOTAL and scoring.ts:1014-1020 omits it."
      : undefined);
  }

  // Market-echo exclusions — present as factors, absent from the sum.
  add(
    "Pricing Edge (edgeComponentScore)",
    fb.edgeScore,
    "factorBreakdown.edgeScore",
    false,
    `EXCLUDED by the market-echo guard: ${WEIGHTS.EDGE_COMPONENT_MAX}-max market-internal component, removed from the sum at scoring.ts:657-665 / :1320-1327. Value still ships as the Edge Index (edgeScore).`,
  );
  if (!isTotals && pick.pickType === "SPREAD") {
    const cmValue = fb.crossMarketScore ?? 0;
    // The guard's law: this term is excluded from the sum, so any factor
    // published for it must carry weight 0 and read neutral. The trace CHECKS
    // that rather than assuming it, so if a future edit reintroduces the
    // discarded-zeroing defect the trace reports it again from real output
    // instead of needing its text edited.
    //
    // HISTORY: that defect existed. SPREAD computed the zeroed
    // `marketEchoFactors` and then spread the UN-zeroed `...contextFactors`,
    // so a SPREAD pick shipped "Cross-Market Alignment" at weight 4 /
    // "positive". Found by two independent audits, pinned RED, and fixed; all
    // three scorers now spread the zeroed copy. Confidence was never affected —
    // crossMarketScore is in neither sum — so it was an overstated factor claim,
    // not a wrong published number.
    const shipped = fb.factors.find(
      (f) => f.name === "Cross-Market Alignment" || f.name === "Cross-Market Divergence",
    );
    const zeroingLost = shipped != null && shipped.weight !== 0;
    add(
      "Cross-Market Agreement (crossMarketScore)",
      cmValue,
      "factorBreakdown.crossMarketScore",
      false,
      zeroingLost
        ? `EXCLUDED from the confidence sum by the market-echo guard, and the value above is the one the scorer computed. FINDING: the guard's zeroing did NOT survive into factorBreakdown — this factor ships with weight ${num(shipped.weight)} and impact "${shipped.impact}" rather than 0/neutral as the guard intends. Confidence is unaffected because crossMarketScore enters neither sum; the published number is right and the published FACTOR CLAIM is overstated.`
        : `EXCLUDED by the market-echo guard: the H2H market's de-vigged probability is a market-probability channel, removed at scoring.ts:616-655. The factor ships with weight 0 and reads neutral, as the guard intends.`,
    );
  }

  // Independent edge factor: it is a RANKING input, not a confidence term.
  const ieFactor = fb.factors.find((f) => f.name.startsWith("Independent Edge"));
  if (ieFactor) {
    add(
      `Independent Edge (${fb.independentEdge?.sources.join(", ") ?? "?"})`,
      ieFactor.weight,
      'factorBreakdown.factors["Independent Edge"].weight',
      false,
      ieFactor.weight === 0
        ? "Weight 0: the independent edge was surfaced in the glass box but not priced into the ranking path, so it moved no number (scoring.ts:1350-1351)."
        : `Weight ${ieFactor.weight}: this is the RANKING delta (rankingScore − confidence), not a confidence term. It moved rankingScore, never confidence.`,
    );
  }

  // Shadow evidence: provenance with weight 0 by construction.
  const shadows = fb.factors.filter((f) => f.name.startsWith("Shadow "));
  if (shadows.length > 0) {
    add(
      `Shadow Evidence (${shadows.length} source${shadows.length === 1 ? "" : "s"})`,
      0,
      "factorBreakdown.factors[*].weight",
      false,
      "Shadow evidence factors carry weight 0 by construction (scoring.ts:143-159): they are recorded provenance for signals not yet activated, never confidence.",
    );
  }

  // Continuous-signal votes. These come from the slate path
  // (`generate-signal-slate.ts` → `applyContinuousSignalTilt`), which writes one
  // `Continuous signal — <id>` factor per vote carrying the raw value, the neutral
  // it was centered against, the declared sign, the trustWeight and the family.
  //
  // They are enumerated from the factor array rather than from a fixed list, so a
  // signal wired later appears in the trace with no change to this module — which
  // is the point of Law 5's fifth column. A signal that votes but cannot be shown
  // is not wired.
  //
  // NOT part of the confidence sum: the slate applies the tilt to the independent
  // home probability BEFORE scoring, so by the time a pick exists the vote is
  // already inside `trueProb`. They are shown as excluded so the reader does not
  // add them to the arithmetic and get a wrong number.
  const continuous = fb.factors.filter((f) => f.name.startsWith("Continuous signal —"));
  if (continuous.length > 0) {
    for (const f of continuous) {
      const id = f.name.replace("Continuous signal — ", "");
      add(
        `Continuous signal: ${id}`,
        f.weight,
        `factorBreakdown.factors["${f.name}"].weight`,
        false,
        "Applied upstream in the slate, not in this confidence sum: " +
          "applyContinuousSignalTilt adjusts the independent home probability " +
          "before scoring, so the vote is already inside trueProb by the time " +
          "this pick exists. Adding it here would double-count it. " +
          `Detail: ${f.description}`,
      );
    }
  }

  const base = 10;
  const includedSum = terms.reduce((s, t) => (t.enteredSum ? s + t.value : s), 0);
  const clampedSum = clamp(includedSum + base, 0, 100);
  const recomputed = finishConfidence(clampedSum);

  return {
    terms,
    base,
    includedSum,
    clampedSum,
    pickConfidence: pick.confidence,
    reconciles: recomputed === pick.confidence,
    residual: pick.confidence - recomputed,
  };
}

// ============================================================
// Calibration seam
// ============================================================

/**
 * Report the state and EFFECT of the calibration seam. Never fit a map.
 *
 * The LAW (edge-engine.ts:92-97): absent means unchanged, and a map is fitted
 * OFFLINE from settled history and passed in — nothing at runtime fits one,
 * because a map fitted on the picks it is scored against is a self-fulfilling
 * number rather than a measurement. So:
 *   - `fittedAtRuntime` is the literal false, always.
 *   - With no calibrator, `beforeSeam` and `afterSeam` are the SAME value and
 *     `delta` is exactly 0, because nothing ran.
 *   - With a calibrator, the delta shows what the supplied map moved. The map
 *     is never invoked here.
 */
function buildSeam(
  pick: ScoredPick,
  input: OddsInput,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER",
): CalibrationSeam {
  const present = input.context?.probabilityCalibrator !== undefined;
  const ie = pick.factorBreakdown.independentEdge ?? null;
  const afterSeam = ie?.trueProb ?? null;

  // The pre-seam blend is recoverable only for SPREAD/MONEYLINE, whose scorers
  // read independentFairValues. Recompute it from the SUPPLIED per-source
  // probabilities — all weights default to 1 (scoring.ts:230) — which is the
  // same blend edge-engine.ts:202-206 performs before the seam runs.
  const consulted = sourcesForMarket(pick.pickType, input.context?.independentFairValues)
    .consulted;
  const fvs = input.context?.independentFairValues ?? [];
  const probs = consulted
    .map((src) => {
      const fv = fvs.find((f) => f.source === src)!;
      const raw = pickedSide === "AWAY" ? fv.awayFairProb : fv.homeFairProb;
      return raw != null && Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : null;
    })
    .filter((p): p is number => p !== null);

  const beforeSeam = probs.length > 0 ? probs.reduce((a, b) => a + b, 0) / probs.length : null;

  if (beforeSeam == null || afterSeam == null) {
    return {
      present,
      fittedAtRuntime: false,
      beforeSeam,
      afterSeam,
      delta: null,
      changedValue: false,
      note:
        afterSeam == null
          ? "No independent trueProb on this pick, so the seam never had a value to act on. Nothing was fitted and nothing moved."
          : "No blendable independent estimate for this market, so the pre-seam value is not recoverable from the input. Nothing was fitted.",
    };
  }

  const delta = afterSeam - beforeSeam;

  if (!present) {
    return {
      present: false,
      fittedAtRuntime: false,
      beforeSeam,
      afterSeam,
      delta: 0,
      changedValue: false,
      note: "NO SEAM. No calibrator was supplied, so by the LAW (edge-engine.ts:92-97) the value is unchanged: the pre-seam blend and the published trueProb are the same number. Nothing was fitted at runtime.",
    };
  }

  return {
    present: true,
    fittedAtRuntime: false,
    beforeSeam,
    afterSeam,
    delta,
    changedValue: delta !== 0,
    note: `SEAM PRESENT. An offline-fitted calibrator was supplied and applied at edge-engine.ts:223-232, before any edge was derived. It moved the blend by ${delta >= 0 ? "+" : ""}${delta.toFixed(4)}. This trace fitted nothing — it only reports the supplied map's effect.`,
  };
}

// ============================================================
// Ranking trace
// ============================================================

function buildRanking(pick: ScoredPick): RankingTrace {
  const fb = pick.factorBreakdown;
  const confidenceAsProbability = clamp(pick.confidence / 100, 1e-6, 1 - 1e-6);
  const independentTrueProb = fb.independentEdge?.trueProb ?? null;
  const independentWeight = 0.7; // ranking-prob.ts:85 default; scoring.ts passes 0.7
  const source = fb.rankingSource ?? "confidence";
  const w = independentWeight;
  const blendedFormula =
    source === "blend_indep_conf" && independentTrueProb != null
      ? `${(1 - w).toFixed(1)}·${confidenceAsProbability.toFixed(4)} + ${w.toFixed(1)}·${independentTrueProb.toFixed(4)} = ${(
          (1 - w) * confidenceAsProbability + w * independentTrueProb
        ).toFixed(4)}`
      : source === "independent_trueProb" && independentTrueProb != null
        ? `trueProb alone = ${independentTrueProb.toFixed(4)} (pure independent path)`
        : null;

  return {
    rankingScore: pick.rankingScore ?? pick.confidence,
    rankingP: fb.rankingP ?? null,
    source,
    confidenceAsProbability,
    independentTrueProb,
    independentWeight,
    blendedFormula,
    priced: fb.independentEdge?.priced === true,
  };
}

// ============================================================
// Public entrypoint
// ============================================================

/**
 * Emit a full reasoning trace for ONE scored pick against the input it was
 * minted from.
 *
 * @param pick    A real `ScoredPick` from `scoreGame`.
 * @param input   The exact `OddsInput` that produced it. Required: without it
 *                the suppressed-signal half of the trace cannot exist, because
 *                a suppressed signal is by definition a field that was PRESENT
 *                in the input and produced nothing.
 *
 * Never throws on missing data — an unsourceable value is null plus an entry
 * in `unresolved`, never a fabricated default.
 */
export function buildReasoningTrace(pick: ScoredPick, input: OddsInput): ReasoningTrace {
  const fb = pick.factorBreakdown;
  const unresolved: string[] = [];

  // Which side did the scorer pick? Read it OFF the emitted pick so the trace
  // cannot re-decide the pick it is explaining.
  const pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER" =
    pick.pickType === "TOTAL"
      ? pick.selection.trim().toUpperCase().startsWith("OVER")
        ? "OVER"
        : "UNDER"
      : pick.selection.startsWith(input.homeTeam)
        ? "HOME"
        : "AWAY";

  // Recompute the context the scorer computed, so the derived-signal probes read
  // the same values the scorer used. This is a re-read, not a re-decision: the
  // factors it produced are already on the pick.
  const ctx = input.context
    ? computeGameContext(
        {
          ...input.context,
          hasSpreadMarket: input.bookmakerOdds.some((o) => o.market === "SPREADS"),
          hasTotalMarket: input.bookmakerOdds.some((o) => o.market === "TOTALS"),
          hasH2HMarket: input.bookmakerOdds.some((o) => o.market === "H2H"),
        },
        pick.pickType,
        pickedSide,
      )
    : null;

  const arithmetic = buildArithmetic(pick, fb);
  if (!arithmetic.reconciles) {
    unresolved.push(
      `CONFIDENCE DID NOT RECONCILE: the trace rebuilt ${arithmetic.clampedSum} → ${Math.round(
        arithmetic.clampedSum,
      )} but the pick published ${arithmetic.pickConfidence} (residual ${arithmetic.residual}). The engine's own arithmetic differs from the term set this trace can read.`,
    );
  }

  const { rows, overround } = pricedBookSet(pick.pickType, input);

  const books = rows.map((o) => {
    const price =
      pick.pickType === "MONEYLINE"
        ? pickedSide === "HOME"
          ? o.homePrice
          : o.awayPrice
        : pick.pickType === "SPREAD"
          ? pickedSide === "HOME"
            ? o.homeSpreadPrice
            : o.awaySpreadPrice
          : pickedSide === "OVER"
            ? o.overPrice
            : o.underPrice;
    const line =
      pick.pickType === "MONEYLINE" ? undefined : pick.pickType === "SPREAD" ? o.spread : o.total;
    return { bookmaker: o.bookmaker, line, price };
  });

  if (rows.length === 0) {
    unresolved.push(
      `No complete two-sided book set for ${pick.pickType} in the supplied input, so the overround and per-book read could not be reconstructed.`,
    );
  }

  // Consistency: overround ≥ 1 is the engine's own sub-vig guard (scoring.ts:369).
  const marketConsistent = overround == null ? false : overround >= 1;

  const consulted = sourcesForMarket(pick.pickType, input.context?.independentFairValues)
    .consulted;
  const fvs = input.context?.independentFairValues ?? [];
  const sourceProbabilities = consulted.map((src) => {
    const fv = fvs.find((f) => f.source === src)!;
    const raw = pickedSide === "AWAY" ? fv.awayFairProb : fv.homeFairProb;
    return { source: src, prob: raw != null && Number.isFinite(raw) ? raw : null };
  });
  const blendable = sourceProbabilities.filter((p) => p.prob != null).map((p) => p.prob!);
  const blendedProbability =
    blendable.length > 0 ? blendable.reduce((a, b) => a + b, 0) / blendable.length : null;

  const ie = fb.independentEdge ?? null;
  const seam = buildSeam(pick, input, pickedSide);

  return {
    schema: "sports.reasoning-trace.v1",
    gameId: pick.gameId,
    sport: input.sport,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    pickType: pick.pickType,
    selection: pick.selection,
    line: pick.line,
    pickedSide,
    modelVersion: pick.modelVersion,
    dataFreshnessAt: new Date(pick.dataFreshnessAt).toISOString(),
    fired: firedSignals(fb.factors),
    suppressed: probeSuppressions(pick, input, fb.factors, ctx, pickedSide),
    arithmetic,
    market: {
      bookmakerCount: pick.bookmakerCount,
      consensusPct: pick.consensusPct,
      marketFairProb: fb.marketFairProb ?? null,
      marketFairMethod: fb.marketFairMethod ?? null,
      marketFairShinProb: fb.marketFairShinProb ?? null,
      entryPrice: pick.entryPrice ?? null,
      edgeScore: pick.edgeScore,
      dataQualityScore: pick.dataQualityScore,
      books,
      twoSidedImpliedSum: overround,
      marketConsistent,
    },
    independentEdge: {
      assessed: ie !== null,
      sourcesConsulted: consulted,
      sourcesNotConsulted: sourcesForMarket(
        pick.pickType,
        input.context?.independentFairValues,
      ).notConsulted,
      sourceProbabilities,
      blendedProbability,
      marketFairProbability: ie?.marketFairProb ?? fb.marketFairProb ?? null,
      rawEdge: ie?.rawEdge ?? null,
      shrunkEdge: ie?.shrunkEdge ?? null,
      agreement: ie?.agreement ?? "NONE",
      decision: ie?.decision ?? "PASS",
      priced: ie?.priced === true,
      expectedClv: ie?.expectedClv ?? null,
      conviction: ie?.conviction ?? null,
      rationale: ie?.rationale ?? null,
      // Read the gate off the summary the scorer already produced; never re-run it.
      pricesWorseThanMarket:
        ie !== null && Number.isFinite(ie.expectedClv) && ie.expectedClv < 0,
    },
    calibrationSeam: seam,
    ranking: buildRanking(pick),
    pick: {
      confidence: pick.confidence,
      tier: pick.tier,
      pickGrade: pick.pickGrade,
      riskLevel: pick.riskLevel,
      edgeScore: pick.edgeScore,
      reasoning: pick.reasoning,
    },
    unresolved,
  };
}

export type { FactorDetail };