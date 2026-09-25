/**
 * D1 — PropLine intake.
 *
 * Prop settlement, line history, and Pinnacle-anchored no-vig lines.
 * As-of discipline: every record carries an as-of timestamp and is never
 * updated retroactively. Settlement enables CLV grading.
 *
 * COMPOSES WITH: The Odds API ingestion (additive — this module is a
 * second source for prop-level lines and settlements).
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const PROPLINE_ENABLED_ENV = "PROPLINE_INTAKE_ENABLED";

export function proplineEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, PROPLINE_ENABLED_ENV);
}

export interface PropLineRecord {
  readonly eventId: string;
  readonly playerId: string;
  readonly propMarket: string;
  readonly selection: string;
  /** Pinnacle price (decimal). Null → missing, never imputed. */
  readonly pinnacleOverPrice: number | null;
  readonly pinnacleUnderPrice: number | null;
  /** Consensus line (yards, receptions, etc.). */
  readonly line: number | null;
  readonly asOf: string;
  readonly source: string;
}

export interface PropLineHistoryEntry {
  readonly asOf: string;
  readonly line: number | null;
  readonly overPrice: number | null;
  readonly underPrice: number | null;
}

export interface PropSettlement {
  readonly eventId: string;
  readonly playerId: string;
  readonly propMarket: string;
  /** Actual stat value. Null → not settled / missing. */
  readonly actual: number | null;
  readonly settledAt: string | null;
  readonly overWon: boolean | null;
}

export interface NoVigLine {
  readonly fairOver: number;
  readonly fairUnder: number;
  readonly overProb: number;
  readonly underProb: number;
  readonly vigRemoved: boolean;
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/**
 * Pinnacle-anchored no-vig line. Uses Pinnacle prices when both sides are
 * present; fail-closed otherwise — never imputes a missing side.
 */
export function pinnacleNoVig(
  overPrice: number | null,
  underPrice: number | null,
): IntakeResult<NoVigLine> {
  if (
    overPrice === null ||
    underPrice === null ||
    !Number.isFinite(overPrice) ||
    !Number.isFinite(underPrice) ||
    overPrice <= 1 ||
    underPrice <= 1
  ) {
    return {
      ok: false,
      reason: "pinnacle no-vig requires both over/under prices > 1 — missing or invalid",
    };
  }

  const overImp = 1 / overPrice;
  const underImp = 1 / underPrice;
  const total = overImp + underImp;
  if (total <= 0) {
    return { ok: false, reason: "pinnacle no-vig: implied probabilities not positive" };
  }

  const overProb = overImp / total;
  const underProb = underImp / total;
  return {
    ok: true,
    data: {
      fairOver: Number((1 / overProb).toFixed(4)),
      fairUnder: Number((1 / underProb).toFixed(4)),
      overProb: Number(overProb.toFixed(6)),
      underProb: Number(underProb.toFixed(6)),
      vigRemoved: true,
    },
  };
}

/**
 * Line history lookup as-of a given time. Returns the latest entry with
 * `asOf <= asOfTime`. Never returns a future line.
 */
export function lineAsOf(
  history: readonly PropLineHistoryEntry[],
  asOfTime: string,
): PropLineHistoryEntry | null {
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) return null;
  const eligible = history
    .filter((h) => {
      const ht = Date.parse(h.asOf);
      return Number.isFinite(ht) && ht <= t;
    })
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf));
  return eligible.length > 0 ? eligible[0]! : null;
}

/**
 * Grade settlement for CLV: given the closing no-vig line and the actual
 * result, classify over/under. Fail-closed on missing actual.
 */
export function gradeSettlement(
  settlement: PropSettlement | null | undefined,
  closingLine: number | null,
): IntakeResult<{ readonly overWon: boolean; readonly clvEligible: boolean }> {
  if (!settlement || settlement.actual === null || !Number.isFinite(settlement.actual)) {
    return { ok: false, reason: "settlement actual is missing — not imputed" };
  }
  if (closingLine === null || !Number.isFinite(closingLine)) {
    return { ok: false, reason: "closing line is missing — cannot grade CLV" };
  }
  const overWon = settlement.actual > closingLine;
  return {
    ok: true,
    data: {
      overWon,
      clvEligible: settlement.settledAt !== null,
    },
  };
}

/**
 * Ingest a PropLine record batch. Env-gated and fail-closed: when the gate is
 * off, returns ok=false without touching the network. When a record is
 * missing required fields it is rejected, never imputed.
 */
export function ingestPropLines(
  records: readonly PropLineRecord[],
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly PropLineRecord[]; readonly rejected: readonly { readonly index: number; readonly reason: string }[] }> {
  if (!proplineEnabled(env)) {
    return {
      ok: false,
      reason: `propline intake disabled — set ${PROPLINE_ENABLED_ENV}=true to enable (env-gated, fail-closed)`,
    };
  }
  if (!Array.isArray(records)) {
    return { ok: false, reason: "records must be an array" };
  }

  const accepted: PropLineRecord[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (!r.eventId || r.eventId.trim().length === 0) {
      rejected.push({ index: i, reason: "missing eventId" });
      continue;
    }
    if (!r.playerId || r.playerId.trim().length === 0) {
      rejected.push({ index: i, reason: "missing playerId" });
      continue;
    }
    if (!r.propMarket || r.propMarket.trim().length === 0) {
      rejected.push({ index: i, reason: "missing propMarket" });
      continue;
    }
    const asOfMs = Date.parse(r.asOf);
    if (!Number.isFinite(asOfMs)) {
      rejected.push({ index: i, reason: "invalid asOf timestamp" });
      continue;
    }
    accepted.push(r);
  }

  return { ok: true, data: { accepted, rejected } };
}

/**
 * CLV (closing-line value) from a bet price vs the Pinnacle no-vig closing
 * probability. Positive CLV means the bettor beat the close.
 */
export function closingLineValue(
  betDecimalPrice: number | null,
  fairCloseProb: number | null,
): IntakeResult<number> {
  if (
    betDecimalPrice === null ||
    !Number.isFinite(betDecimalPrice) ||
    betDecimalPrice <= 1
  ) {
    return { ok: false, reason: "bet decimal price missing or invalid" };
  }
  if (
    fairCloseProb === null ||
    !Number.isFinite(fairCloseProb) ||
    fairCloseProb <= 0 ||
    fairCloseProb >= 1
  ) {
    return { ok: false, reason: "fair close probability missing or outside (0,1)" };
  }
  const betImplied = 1 / betDecimalPrice;
  const clv = fairCloseProb - betImplied;
  return { ok: true, data: Number(clv.toFixed(6)) };
}
