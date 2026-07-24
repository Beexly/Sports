/**
 * Turning production rows into gate rows — the mapping layer.
 *
 * Kept separate from gate-consumer.ts (which classifies outcomes) because this
 * is where the *honesty* risk actually lives: every field here is a place a
 * plausible-looking wrong value could enter the gate and produce a confident,
 * wrong decision. Each is therefore either derived exactly or the row is
 * excluded and reported — never guessed.
 */

import {
  americanToImpliedProbability,
  removeVig,
  selectionIsHomeSide,
} from "@sports/prediction-engine";
import type { GateDecisionRow } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import type { ExcludedCandidate } from "./gate-consumer";

/** Which side of the market a pick is on, including the honest third answer. */
export type PickSide = "home" | "away" | "undetermined";

/**
 * Resolve a pick's side with an explicit UNDETERMINED state.
 *
 * `selectionIsHomeSide` returns a bare boolean, so a selection matching
 * NEITHER team comes back `false` — indistinguishable from a genuine away
 * pick. That is survivable in settlement (which validates elsewhere) but not
 * here: the side chooses which devigged probability becomes `q`, so getting it
 * wrong silently inverts the edge on that row. Composing the exported helper
 * with the sides swapped recovers the third state without reimplementing the
 * team-matching logic that settlement already proves.
 */
export function resolvePickSide(
  selection: string,
  homeTeamName: string,
  awayTeamName: string,
): PickSide {
  if (selectionIsHomeSide(selection, homeTeamName, awayTeamName)) return "home";
  if (selectionIsHomeSide(selection, awayTeamName, homeTeamName)) return "away";
  return "undetermined";
}

export interface RawPickRow {
  readonly id: string;
  readonly selection: string;
  readonly confidence: number;
  readonly pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly result: "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly sportName: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  /** Two-sided prices for this game's market, when captured. */
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  /**
   * Draw price, for three-way markets (soccer and similar).
   *
   * Present means the market is NOT two-way, and `removeVig(home, away)` would
   * normalize over a pair that does not sum to the book's full probability
   * mass — inflating `q` for both sides. Such rows are excluded rather than
   * devigged against the wrong denominator.
   */
  readonly drawPrice?: number | null;

  // ---- Provenance. Read from production rows; NEVER synthesised. ----------
  //
  // These decide whether a settled pick may teach the gate anything. They are
  // optional on the type because the illustrative page supplies its own rows,
  // but under `requireLearningEligible` an absent value is a REFUSAL, not a
  // default — see `isLearningAdmissible`.

  /** `Pick.isBootstrap` — true for picks written before canonical history. */
  readonly isBootstrap?: boolean;
  /**
   * `PickSignalSnapshot.eligibleForLearning` — set by the settlement flow only
   * when `canLearnFromOutcomes`, not bootstrap, and settlement is recorded.
   * `undefined` means no snapshot row existed, which is not the same as false
   * and is certainly not the same as true.
   */
  readonly eligibleForLearning?: boolean;
  /** `Pick.modelVersion` — the engine version that produced `confidence`. */
  readonly modelVersion?: string | null;
}

export interface BuiltRows {
  readonly rows: readonly GateDecisionRow[];
  readonly excluded: readonly ExcludedCandidate[];
}

export interface CalibrationOptions {
  /**
   * Admit a settled pick into calibration ONLY when its provenance proves it is
   * learning-eligible. Required for production history; off for the illustrative
   * page, which supplies rows that have no provenance to read.
   */
  readonly requireLearningEligible?: boolean;
}

/** Production history is always read strictly. There is no second setting. */
export const PRODUCTION_CALIBRATION_OPTS: CalibrationOptions = {
  requireLearningEligible: true,
};

/**
 * Whether a settled pick's provenance permits it to teach the gate.
 *
 * FAILS CLOSED. Admissible requires two affirmative facts: not a bootstrap
 * pick, and a settlement flow that explicitly marked the snapshot eligible.
 * Anything else — `undefined`, a missing snapshot, a bootstrap row — is
 * inadmissible.
 *
 * The asymmetry is deliberate. Wrongly excluding an eligible pick costs the
 * gate a row and makes it fire less. Wrongly *including* an ineligible one
 * lets history the product has already declared untrustworthy set the bar the
 * product then claims to have cleared. Only one of those is a lie.
 */
export function isLearningAdmissible(row: RawPickRow): boolean {
  return row.isBootstrap === false && row.eligibleForLearning === true;
}

/** Reasons a row's provenance blocked it, named so the output is inspectable. */
function learningExclusionReasons(row: RawPickRow): string[] {
  const reasons: string[] = [];
  if (row.isBootstrap !== false) {
    reasons.push(
      row.isBootstrap === undefined
        ? "provenance (isBootstrap absent; bootstrap status unproven)"
        : "provenance (bootstrap pick; excluded from canonical history)",
    );
  }
  if (row.eligibleForLearning !== true) {
    reasons.push(
      row.eligibleForLearning === undefined
        ? "provenance (no signal snapshot; learning eligibility unproven)"
        : "provenance (settlement did not mark this eligible for learning)",
    );
  }
  return reasons;
}

/**
 * The gate's Mondrian stratum.
 *
 * `${sport}|${pickType}`, plus the model version WHEN PRESENT. Score semantics
 * change across major engine versions, so pooling versions would calibrate
 * today's confidence against numbers that meant something different — and the
 * pooling would be invisible in the output. Absent version keeps the two-part
 * key, so the illustrative page and existing callers are unaffected.
 */
export function stratumOf(row: RawPickRow): string {
  const base = `${row.sportName}|${row.pickType}`;
  return row.modelVersion ? `${base}|${row.modelVersion}` : base;
}

/**
 * Build CALIBRATION rows: settled picks only, with a realized outcome.
 *
 * PUSH and VOID are excluded rather than mapped to 0. A push is not a loss,
 * and coercing it into one would quietly bias the calibration set toward
 * pessimism — the model would look worse than it is, and the gate would fire
 * less than it should, for a reason nobody could see in the output.
 *
 * Under `requireLearningEligible` a row must additionally PROVE it is eligible
 * to teach the gate. Provenance failures are reported like any other missing
 * input, so a stratum starved by ineligible history reads as
 * `INSUFFICIENT_CALIBRATION` — which is the truth — rather than quietly
 * calibrating on rows the product has already disowned.
 */
export function buildCalibrationRows(
  picks: readonly RawPickRow[],
  options: CalibrationOptions = {},
): BuiltRows {
  const rows: GateDecisionRow[] = [];
  const excluded: ExcludedCandidate[] = [];

  for (const p of picks) {
    if (p.result !== "WIN" && p.result !== "LOSS") continue; // not a calibration signal

    if (options.requireLearningEligible && !isLearningAdmissible(p)) {
      excluded.push({
        rowId: p.id,
        stratum: stratumOf(p),
        missing: learningExclusionReasons(p),
      });
      continue;
    }

    const built = toGateRow(p, p.result === "WIN" ? 1 : 0);
    if ("row" in built) rows.push(built.row);
    else excluded.push(built.excluded);
  }
  return { rows, excluded };
}

/**
 * Build CANDIDATE rows: unsettled published picks awaiting a decision.
 *
 * `y` is required by the gate's row type but is unknown for a live candidate,
 * so it is set to 0 and is NEVER read for these rows — the gate uses `y` only
 * to compute realized outcomes among FIRED decisions, which is a backtest
 * concern. Documented here because a future reader could otherwise mistake it
 * for a claim that every pending pick lost.
 */
export function buildCandidateRows(picks: readonly RawPickRow[]): BuiltRows {
  const rows: GateDecisionRow[] = [];
  const excluded: ExcludedCandidate[] = [];

  for (const p of picks) {
    if (p.result !== "PENDING") continue;
    const built = toGateRow(p, 0);
    if ("row" in built) rows.push(built.row);
    else excluded.push(built.excluded);
  }
  return { rows, excluded };
}

function toGateRow(
  p: RawPickRow,
  y: 0 | 1,
): { row: GateDecisionRow } | { excluded: ExcludedCandidate } {
  const stratum = stratumOf(p);
  const missing: string[] = [];

  if (p.homePrice === null || p.awayPrice === null) {
    missing.push("q (no two-sided odds captured for this market)");
  }

  // A captured draw price means a three-way market. Normalizing home/away
  // alone would divide by less than the book's full probability mass and
  // overstate q on both sides, which shifts the edge in the direction that
  // makes the gate fire. Excluded, not approximated.
  if (p.drawPrice !== null && p.drawPrice !== undefined) {
    missing.push("q (three-way market; home/away devig omits the draw)");
  }

  const side = resolvePickSide(p.selection, p.homeTeamName, p.awayTeamName);
  // TOTAL markets are OVER/UNDER, not a team side, so home/away devigging does
  // not apply. Excluded explicitly rather than silently devigged against the
  // wrong pair of prices.
  if (p.pickType === "TOTAL") {
    missing.push("q (totals are not a home/away market; needs over/under prices)");
  } else if (side === "undetermined") {
    missing.push(`side (selection "${p.selection}" matched neither team)`);
  }

  if (!Number.isFinite(p.confidence)) missing.push("score (confidence absent)");

  if (missing.length > 0) {
    return { excluded: { rowId: p.id, stratum, missing } };
  }

  const devigged = removeVig(
    americanToImpliedProbability(p.homePrice as number),
    americanToImpliedProbability(p.awayPrice as number),
  );
  const q = side === "home" ? devigged.home : devigged.away;

  return {
    row: {
      rowId: p.id,
      score: p.confidence / 100,
      q,
      stratum,
      y,
    },
  };
}
