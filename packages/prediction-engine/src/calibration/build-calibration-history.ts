/**
 * Pure mapper: settled pick rows -> CalibrationHistoryRow[] for the mint-time
 * withhold screen (calibrationHistoryWithholds).
 *
 * Fail-open on absence: no rows, or no settled WIN/LOSS rows, yields an empty
 * history — the same silence as leaving the field undefined. Never throws.
 * PUSH / VOID / PENDING never invent a y. A settled WIN/LOSS row whose
 * probability basis cannot be read is still emitted (with a non-finite p) so
 * the screen withholds rather than treating unreadable history as calm.
 */

import type { CalibrationHistoryRow } from "@sports/types";

/** Minimal settled-pick shape the builder needs. Pure — no db, no I/O. */
export interface SettledPickHistorySource {
  readonly sport: string;
  readonly pickType: string;
  readonly result: string;
  readonly settledAt?: Date | string | number | null;
  readonly commenceTime?: Date | string | number | null;
  readonly confidence?: number | null;
  /** Top-level de-vig market fair for the chosen side, when stored. */
  readonly marketFairProb?: number | null;
  /** Independent trueProb for the chosen side, when stored. */
  readonly trueProb?: number | null;
  /** factorBreakdown JSON — marketFairProb / independentEdge.trueProb live here. */
  readonly factorBreakdown?: unknown;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function epochMs(value: Date | string | number | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function factorField(factorBreakdown: unknown, key: string): number | null {
  if (factorBreakdown == null || typeof factorBreakdown !== "object" || Array.isArray(factorBreakdown)) {
    return null;
  }
  return finiteNumber((factorBreakdown as Record<string, unknown>)[key]);
}

function factorIndependentTrueProb(factorBreakdown: unknown): number | null {
  if (factorBreakdown == null || typeof factorBreakdown !== "object" || Array.isArray(factorBreakdown)) {
    return null;
  }
  const edge = (factorBreakdown as Record<string, unknown>)["independentEdge"];
  if (edge == null || typeof edge !== "object" || Array.isArray(edge)) return null;
  return finiteNumber((edge as Record<string, unknown>)["trueProb"]);
}

/**
 * Probability the pick was sold at: marketFairProb if present, else trueProb,
 * else confidence/100. NaN when none of those bases is readable — the screen
 * rejects that row and withholds.
 */
function soldProbability(source: SettledPickHistorySource): number {
  const market =
    finiteNumber(source.marketFairProb) ?? factorField(source.factorBreakdown, "marketFairProb");
  if (market != null) return market;
  const trueProb = finiteNumber(source.trueProb) ?? factorIndependentTrueProb(source.factorBreakdown);
  if (trueProb != null) return trueProb;
  const confidence = finiteNumber(source.confidence);
  if (confidence != null) return confidence / 100;
  return Number.NaN;
}

function marketFamily(pickType: string): string {
  return pickType.trim().toUpperCase();
}

/**
 * Map settled picks into CalibrationHistoryRow[].
 *
 * stratum: sport x market family (`NFL:MONEYLINE`).
 * path: settledAt epoch ms, else game commenceTime epoch ms, else 0.
 * p: marketFairProb / trueProb / confidence/100 (same basis as mint).
 * y: 1 on WIN, 0 on LOSS. PUSH / VOID / PENDING are excluded.
 *
 * Always returns an array (possibly empty). Empty is silence — identical to
 * leaving GameContextInput.calibrationHistory undefined.
 */
export function buildCalibrationHistory(
  rows: readonly SettledPickHistorySource[],
): CalibrationHistoryRow[] {
  const out: CalibrationHistoryRow[] = [];
  for (const row of rows) {
    const result = row.result.trim().toUpperCase();
    if (result !== "WIN" && result !== "LOSS") continue;
    const y: 0 | 1 = result === "WIN" ? 1 : 0;
    const stratum = `${row.sport.trim().toUpperCase()}:${marketFamily(row.pickType)}`;
    const path = epochMs(row.settledAt) ?? epochMs(row.commenceTime) ?? 0;
    out.push({ p: soldProbability(row), y, stratum, path });
  }
  return out;
}
