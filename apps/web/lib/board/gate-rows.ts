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
}

export interface BuiltRows {
  readonly rows: readonly GateDecisionRow[];
  readonly excluded: readonly ExcludedCandidate[];
}

/** `${sport}|${pickType}` — the gate calibrates per stratum. */
export function stratumOf(row: RawPickRow): string {
  return `${row.sportName}|${row.pickType}`;
}

/**
 * Build CALIBRATION rows: settled picks only, with a realized outcome.
 *
 * PUSH and VOID are excluded rather than mapped to 0. A push is not a loss,
 * and coercing it into one would quietly bias the calibration set toward
 * pessimism — the model would look worse than it is, and the gate would fire
 * less than it should, for a reason nobody could see in the output.
 */
export function buildCalibrationRows(picks: readonly RawPickRow[]): BuiltRows {
  const rows: GateDecisionRow[] = [];
  const excluded: ExcludedCandidate[] = [];

  for (const p of picks) {
    if (p.result !== "WIN" && p.result !== "LOSS") continue; // not a calibration signal
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
