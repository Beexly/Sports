/**
 * Public ROI Policy — the units/ROI counterpart to the Wilson-gated CLV policy.
 *
 * Win rate is a proportion (Wilson). ROI in UNITS is a mean of skewed continuous
 * per-bet returns — a few big prices skew it — so the honest band comes from the
 * deterministic BCa bootstrap (bcaMeanCi), and the interval reproduces from the
 * sealed ledger by anyone (the RNG is seeded). Same discipline as everywhere
 * else: gate-until-defensible, canonical only, and we only CLAIM profit when the
 * 95% LOWER bound clears break-even (0 units) — the point estimate alone
 * overclaims exactly the way a tout would.
 *
 * DOUBLE-METHOD CORROBORATION. BCa and the studentized bootstrap-t are two
 * METHODOLOGICALLY DISTINCT second-order interval constructions (BCa adjusts
 * quantiles on the statistic's scale; bootstrap-t inverts a pivot on a
 * studentized scale), evaluated on a COMMON seeded resample set (common random
 * numbers). Sharing the resample stream is deliberate: it removes Monte-Carlo
 * noise from the method comparison and keeps both bands reproducible from one
 * (ledger, seed) pair — the corroboration guards against METHOD error, while
 * Monte-Carlo error is controlled by B=10000. A profit claim is only made when
 * BOTH lower bounds clear break-even — strictly more conservative than either
 * alone, and reproducible by any skeptic from the sealed ledger.
 *
 * WHY THE SECOND METHOD IS LOAD-BEARING (measured, not asserted): a 2026-07-02
 * Monte-Carlo on the shipped functions with sports-shaped return mixtures
 * (handoff/claude/overnight-2026-07-01/coverage-sim-sports-shaped.mjs, NSIM=600
 * per cell, B=1000) found BCa alone under-covers at n=25 on skewed ledgers
 * (92.2-93.7% realized vs 95% nominal) while studentized covered >=95.0% in
 * every cell; on a break-even-true ledger the AND-gate's false-profit rate was
 * 2.33% at n=25 (within the 2.5% one-sided budget) vs 3.00% for BCa alone.
 * Below n~100, do not weaken this gate to BCa-only.
 *
 * CONVENTIONS (pinned so a competitor can't pin them for us): pushes/voids are
 * settled 0-unit bets — included in n and in the mean (conservative: zeros drag
 * a positive mean toward 0). PENDING picks are NOT settled and are excluded
 * entirely (null), never counted as 0-unit returns.
 */

import { bcaMeanCi, studentizedMeanCi, empiricalBernsteinMeanCi, anytimeValidLedger, americanToDecimalOdds } from "@sports/prediction-engine";

export type PickResultLike = "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";

/**
 * Realized units for one settled pick at a 1-unit flat stake, using the actual
 * American entry price. WIN pays the decimal profit; LOSS loses the stake;
 * PUSH/VOID are settled 0-unit bets (no action). PENDING is UNRESOLVED — it has
 * no realized return, so it is excluded (null), never counted as a settled 0:
 * counting it would inflate n past the publication gate and inject variance-
 * shrinking zeros into the CI.
 */
export function unitsForPick(result: PickResultLike, americanEntryOdds: number | null | undefined): number | null {
  if (result === "PENDING") return null;
  if (result === "PUSH" || result === "VOID") return 0;
  if (americanEntryOdds == null || !Number.isFinite(americanEntryOdds) || americanEntryOdds === 0) return null;
  if (result === "WIN") return americanToDecimalOdds(americanEntryOdds) - 1;
  return -1; // LOSS
}

export type PublicRoiBlocker = "GATE_OFF_PERFORMANCE_STATS" | "INSUFFICIENT_GRADED_SAMPLE";

export interface PublicRoiPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
  /** Per-settled-pick unit returns (canonical, published, priced). */
  readonly returns: readonly number[];
}

export interface PublicRoiPolicy {
  readonly canExposeRoi: boolean;
  readonly blockers: readonly PublicRoiBlocker[];
  readonly primaryReason: PublicRoiBlocker | null;
  readonly gradedSampleSize: number;
  /** Mean units per bet (2 decimals). Null when gated. */
  readonly roiPerBet: number | null;
  /** 95% BCa lower/upper bound on units per bet (2 decimals). Null when gated. */
  readonly roiCiLow: number | null;
  readonly roiCiHigh: number | null;
  /**
   * 95% studentized (bootstrap-t) lower/upper bound — the methodologically
   * distinct cross-check. Null when gated, and null when the bound is honestly
   * non-finite (lopsided ledger: bootstrap-t cannot bound that side).
   */
  readonly roiCiLowStudentized: number | null;
  readonly roiCiHighStudentized: number | null;
  /**
   * True only when BOTH the BCa and the studentized 95% lower bounds (rounded,
   * finite) clear 0 units — a profit claim corroborated by two distinct
   * second-order constructions. Measured to hold the false-claim rate within
   * the nominal 2.5% budget at n>=25 (see module doc).
   */
  readonly clearsProfit: boolean;
  /**
   * WORST-CASE tier (empirical-Bernstein, Maurer-Pontil 2009): the only leg
   * with a FINITE-SAMPLE guarantee — no asymptotics, no resampling, valid
   * because per-bet returns are bounded by construction (loss = -1 stake,
   * win = decimalOdds-1). Deliberately much wider than the bootstrap bands.
   * clearsProfitWorstCase = its 95% lower bound clears 0 too: the strongest
   * profit statement the platform can make. ADDITIVE — does not change
   * clearsProfit semantics.
   */
  readonly roiCiLowWorstCase: number | null;
  readonly clearsProfitWorstCase: boolean;
  /**
   * ANYTIME-VALID evidence tier (K11, e-process / Ville's inequality): a
   * sequential test of H0 "no edge" that stays valid under CONTINUOUS
   * monitoring — checking it after every settled pick cannot inflate the
   * false-positive rate (proven by an adversarial-optional-stopping
   * Monte-Carlo in the engine's test suite). ADDITIVE context beside the
   * fixed-sample bands; deliberately NOT a fourth leg of the clearsProfit
   * AND-gate — folding an instant-of-a-sequential-process statistic into a
   * fixed-sample boolean would reintroduce the exact peeking fragility this
   * tier exists to eliminate. REQUIRES the returns array in settlement order
   * (the loader sorts by settledAt ascending for exactly this reason).
   * Null when gated or when the ledger is empty.
   */
  readonly anytimeEvidence: {
    /** ln of the cumulative e-value against H0: mean <= 0. */
    readonly logEValue: number;
    /** Has the Ville threshold (e-value >= 1/alpha) EVER been crossed? */
    readonly everSignificant: boolean;
    readonly firstSignificantAtN: number | null;
    /** Anytime-valid lower bound on the true mean (units/bet), rounded. */
    readonly lowerBound: number;
  } | null;
  readonly publicMessage: string;
  readonly operatorMessage: string;
  readonly minimumRequirements: readonly string[];
}

const MIN_GRADED_DEFAULT = 25;

/**
 * Fixed a-priori win-return bound for the anytime-valid tier (units at 1-unit
 * stake): 20 = a +2000 American winner. Fixed BEFORE seeing the data so the
 * e-process's betting schedule never depends on future observations (the
 * Ville licensing requires it); Kelly-style betting is scale-adaptive, so a
 * generous bound costs almost no power.
 */
const ANYTIME_RANGE_UNITS = 20;

export function evaluatePublicRoiPolicy(input: PublicRoiPolicyInput): PublicRoiPolicy {
  const minGraded = Math.max(1, input.minGradedForPublic > 0 ? input.minGradedForPublic : MIN_GRADED_DEFAULT);
  const n = input.returns.length;

  const blockers: PublicRoiBlocker[] = [];
  if (!input.canExposePerformanceStats) blockers.push("GATE_OFF_PERFORMANCE_STATS");
  if (n < minGraded) blockers.push("INSUFFICIENT_GRADED_SAMPLE");
  const allowed = blockers.length === 0;
  const primary = blockers[0] ?? null;

  const ci = n >= 2 ? bcaMeanCi(input.returns) : null;
  const ciStud = n >= 2 ? studentizedMeanCi(input.returns) : null;
  const roiPerBet = ci ? round2(ci.point) : null;
  const roiCiLow = ci ? round2(ci.low) : null;
  const roiCiHigh = ci ? round2(ci.high) : null;
  // On heavily lopsided ledgers a studentized bound is honestly +/-Infinity
  // ("bootstrap-t cannot bound this side from this ledger"). Surface null
  // rather than an unserializable/absurd Infinity; the gate below treats a
  // non-finite lower bound as NOT clearing profit.
  const roiCiLowStudentized = ciStud && Number.isFinite(ciStud.low) ? round2(ciStud.low) : null;
  const roiCiHighStudentized = ciStud && Number.isFinite(ciStud.high) ? round2(ciStud.high) : null;
  // Profit claim requires BOTH methods' lower bounds to clear 0 — evaluated on
  // the ROUNDED values so the gate can never assert "clears break-even" while
  // the display shows "+0.00" (rounded gating is strictly MORE conservative, so
  // the subset property vs the old BCa-only gate is preserved). A non-finite
  // studentized bound fails the gate by construction.
  const clearsProfit =
    ci != null &&
    ciStud != null &&
    Number.isFinite(ciStud.low) &&
    round2(ci.low) > 0 &&
    round2(ciStud.low) > 0;

  // WORST-CASE tier: empirical-Bernstein (finite-sample, closed-form, no
  // resampling). Valid here because per-bet returns are bounded by construction
  // (loss = -1 stake, win = decimalOdds-1); range defaults to the observed
  // support of the sealed ledger — the exact support of the record the claim is
  // about. Much wider than the bootstrap bands by design. ADDITIVE: it never
  // changes clearsProfit; it only enables the stronger statement when it holds.
  const ciBern = n >= 2 ? empiricalBernsteinMeanCi(input.returns) : null;
  const roiCiLowWorstCase = ciBern && Number.isFinite(ciBern.low) ? round2(ciBern.low) : null;
  const clearsProfitWorstCase =
    clearsProfit && ciBern != null && Number.isFinite(ciBern.low) && round2(ciBern.low) > 0;

  // K11 anytime-valid tier: order-sensitive, so input.returns MUST arrive in
  // settlement order (loadPublicRoiPolicy sorts by settledAt asc, id asc).
  // Additive context only — never part of the clearsProfit gate (see field
  // doc). The range is a FIXED a-priori constant, not the observed max: a
  // data-derived range would make every bet depend on the full array (a
  // predictability leak that voids the literal Ville licensing on mixed-odds
  // ledgers — hostile-review finding, measured negligible but theorem-dirty).
  // 20 units covers +2000 American; a return above it disables the tier
  // honestly (null) rather than quietly bending the guarantee.
  //
  // ⚠ CORRELATION ASSUMPTION (self-audit 2026-07-03, measured): the Ville α-budget
  // assumes returns are not correlated with earlier settled picks. GSE publishes
  // multiple markets per game (see the settledAt tie note below), so this input
  // can carry same-game correlation. Measured H0 false-positive inflates from
  // 0.004 (i.i.d.) to ~0.11 only under 3 PERFECTLY-correlated markets/game (2/game
  // and partial ρ=0.5 stay ≤0.05). The PUBLIC "checked continuously" sentence
  // below is therefore strictly valid only for a de-correlated ledger. PROPER FIX
  // (owner-gated — it changes a published number + the DB query): have
  // loadPublicRoiPolicy pass at most ONE pick per game into this tier. Until then
  // the operator message discloses the assumption and the sentence stays gated
  // behind clearsProfit (a conservative magnitude gate that blunts the residual
  // risk). See anytime-ledger.ts CORRELATION CAVEAT for the numbers.
  const anytime = n >= 1 ? anytimeValidLedger(input.returns, { range: ANYTIME_RANGE_UNITS }) : null;
  const anytimeEvidence = anytime
    ? {
        logEValue: anytime.current.logEValue,
        everSignificant: anytime.everRejected,
        firstSignificantAtN: anytime.firstRejectedAt,
        lowerBound: round2(anytime.lowerBound),
      }
    : null;

  const minimumRequirements: string[] = [];
  if (blockers.includes("GATE_OFF_PERFORMANCE_STATS")) {
    minimumRequirements.push("Open the performance gate (PERFORMANCE_STATS_ENABLED=true) after canonical history accumulates.");
  }
  if (blockers.includes("INSUFFICIENT_GRADED_SAMPLE")) {
    minimumRequirements.push(`Settle at least ${minGraded} priced canonical picks (currently ${n}).`);
  }

  let publicMessage: string;
  let operatorMessage: string;
  if (allowed) {
    // Three honest states: corroborated profit; primary-positive-but-uncorroborated
    // (saying "includes break-even" there would contradict the displayed band);
    // and genuinely includes-break-even.
    const uncorroborated = !clearsProfit && roiCiLow != null && roiCiLow > 0;
    // The anytime sentence is added ONLY when the fixed-sample gate AND the
    // sequential test agree — the strongest statement the platform can make
    // without mixing "not yet claiming profit" with "no-edge rejected" (a
    // technically-coherent but publicly-confusing combination kept operator-only).
    const anytimeSentence =
      clearsProfit && anytimeEvidence?.everSignificant
        ? ` This record has also been checked continuously — after every settled pick since pick ${anytimeEvidence.firstSignificantAtN} — using a sequential test built so that repeated checking cannot by itself make results look significant by chance.`
        : "";
    publicMessage =
      `${signed(roiPerBet)} units per bet over ${n} settled picks ` +
      `(95% CI ${signed(roiCiLow)} to ${signed(roiCiHigh)} units). ` +
      (clearsProfit
        ? "The lower bound clears break-even under two distinct interval methods (BCa and bootstrap-t), recomputable from the same sealed ledger. "
        : uncorroborated
          ? "The primary interval clears break-even, but our stricter cross-check can't yet bound the downside at this sample size, so we don't yet claim a settled profit. "
          : "That range still includes break-even, so we don't yet claim a settled profit. ") +
      "Past results are a record, not a promise of future returns." +
      anytimeSentence;
    operatorMessage =
      `ROI publishable. n=${n} roi=${signed(roiPerBet)}u ` +
      `BCa=[${signed(roiCiLow)},${signed(roiCiHigh)}]u ` +
      `stud=[${signed(roiCiLowStudentized)},${signed(roiCiHighStudentized)}]u ` +
      `bernLow=${signed(roiCiLowWorstCase)}u ` +
      `clearsProfit(both)=${clearsProfit} worstCase=${clearsProfitWorstCase}; min=${minGraded}. ` +
      (anytimeEvidence
        ? `anytime: logE=${anytimeEvidence.logEValue.toFixed(2)} everSig=${anytimeEvidence.everSignificant} ` +
          `firstSigN=${anytimeEvidence.firstSignificantAtN ?? "n/a"} lowerBound=${signed(anytimeEvidence.lowerBound)}u ` +
          `(H0: mu<=0, Ville-valid under continuous monitoring; assumes de-correlated returns — ` +
          `same-game multi-market correlation inflates FP, measured up to ~0.11 at 3 correlated picks/game vs 0.05).`
        : "anytime: n/a.");
  } else {
    publicMessage =
      "The units/ROI record is still accruing. It opens once enough priced picks have settled. " +
      "No profit number is shown before it can be honestly backed.";
    operatorMessage =
      primary === "GATE_OFF_PERFORMANCE_STATS"
        ? `ROI gated: performance gate OFF. n=${n} min=${minGraded}.`
        : `ROI gated: sample too small. ${n} of ${minGraded} settled priced picks.`;
  }

  return {
    canExposeRoi: allowed,
    blockers,
    primaryReason: primary,
    gradedSampleSize: n,
    roiPerBet: allowed ? roiPerBet : null,
    roiCiLow: allowed ? roiCiLow : null,
    roiCiHigh: allowed ? roiCiHigh : null,
    roiCiLowStudentized: allowed ? roiCiLowStudentized : null,
    roiCiHighStudentized: allowed ? roiCiHighStudentized : null,
    clearsProfit: allowed ? clearsProfit : false,
    roiCiLowWorstCase: allowed ? roiCiLowWorstCase : null,
    clearsProfitWorstCase: allowed ? clearsProfitWorstCase : false,
    anytimeEvidence: allowed ? anytimeEvidence : null,
    publicMessage,
    operatorMessage,
    minimumRequirements,
  };
}

// ── Data loader ──────────────────────────────────────────────────────────────

export interface LoadableRoiClient {
  pick: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
      orderBy: Array<Record<string, unknown>>;
    }) => Promise<Array<{ result: string; proofReceipt: { entryOdds: number } | null }>>;
  };
}

export interface LoadRoiPolicyInput {
  readonly canExposePerformanceStats: boolean;
  readonly minGradedForPublic: number;
}

/**
 * Load the ROI policy from settled, canonical, published picks joined to their
 * proof-receipt entry price (the honest, sealed source of the price we actually
 * entered at). Picks with no receipt price are excluded, never guessed.
 */
export async function loadPublicRoiPolicy(
  db: LoadableRoiClient,
  input: LoadRoiPolicyInput,
): Promise<PublicRoiPolicy> {
  const rows = await db.pick.findMany({
    where: {
      isBootstrap: false,
      isPublished: true,
      result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
    },
    select: { result: true, proofReceipt: { select: { entryOdds: true } } },
    // SETTLEMENT ORDER IS LOAD-BEARING (K11): the anytime-valid evidence tier
    // is a sequential statistic — without an explicit sort, Prisma/Postgres
    // return rows in unspecified order and the anytime guarantee would be
    // mathematically proven in the engine yet silently unearned here. The id
    // tiebreaker makes the sort a TOTAL order: settle-sport stamps one shared
    // settledAt per game, so multi-pick games tie systematically and a
    // one-key sort would publish load-dependent anytime numbers (breaking the
    // bit-reproducibility promise). The fixed-sample bands are order-free.
    orderBy: [{ settledAt: "asc" }, { id: "asc" }],
  });

  const returns: number[] = [];
  for (const r of rows) {
    const u = unitsForPick(r.result as PickResultLike, r.proofReceipt?.entryOdds ?? null);
    if (u !== null) returns.push(u);
  }

  return evaluatePublicRoiPolicy({
    canExposePerformanceStats: input.canExposePerformanceStats,
    minGradedForPublic: input.minGradedForPublic,
    returns,
  });
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function signed(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "n/a"; // never print "Infinity"
  return x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2);
}
