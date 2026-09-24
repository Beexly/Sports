/**
 * Low-weight, shadow-only normalization for persisted NFL run-tendency rows.
 *
 * The source table is a season-level PlayerRushProfile built from public PBP.
 * This module maps that table into the universal ledger's scalar contract; it
 * never selects, scores, publishes, or prices anything. PFR-derived rows are
 * intentionally not accepted here: their separate rights entry is denied today.
 */
import { classifyRushScheme, type RushDirectionCounts } from "./player-rush-scheme.js";
import type { LedgerSignalRow } from "./signal-ledger.js";

export const RUSH_LEDGER_MIN_RUNS = 20;
export const RUSH_LEDGER_WEIGHT = 0.25;
export const RUSH_LEDGER_CONFIDENCE = 0.55;

/** Input mirrors the fields read from PlayerRushProfile, without Prisma types. */
export interface RushProfileLedgerInput extends RushDirectionCounts {
  readonly epaPerRun: number;
  readonly capturedAt: string;
}

export interface RushProfileLedgerPlayer {
  readonly gsisId: string;
  readonly signals: readonly LedgerSignalRow[];
  readonly scheme: "interior/power" | "outside/zone" | "off-tackle" | "balanced" | "low-sample";
}

/**
 * Convert one persisted rush profile to two conservative scalar readings.
 * Low samples emit no rows. A balanced profile emits only the EPA reading;
 * it does not invent a directional scheme vote.
 */
export function rushProfileToLedgerSignals(
  input: RushProfileLedgerInput,
): readonly LedgerSignalRow[] {
  if (!Number.isFinite(input.epaPerRun) || input.runs < RUSH_LEDGER_MIN_RUNS) return [];
  const profile = classifyRushScheme(input);
  const signals: LedgerSignalRow[] = [
    {
      key: "rush.epa_per_run",
      value: clamp(input.epaPerRun, -1, 1),
      weight: RUSH_LEDGER_WEIGHT,
      confidence: RUSH_LEDGER_CONFIDENCE,
      capturedAt: input.capturedAt,
    },
  ];

  const direction = schemeDirection(profile.scheme);
  if (direction !== 0) {
    signals.push({
      key: "rush.scheme_lean",
      value: direction,
      weight: RUSH_LEDGER_WEIGHT,
      confidence: RUSH_LEDGER_CONFIDENCE,
      capturedAt: input.capturedAt,
    });
  }
  return signals;
}

export function rushProfileToLedgerPlayer(
  gsisId: string,
  input: RushProfileLedgerInput,
): RushProfileLedgerPlayer {
  return {
    gsisId,
    signals: rushProfileToLedgerSignals(input),
    scheme: classifyRushScheme(input).scheme,
  };
}

function schemeDirection(
  scheme: RushProfileLedgerPlayer["scheme"],
): number {
  switch (scheme) {
    case "interior/power":
      return 1;
    case "outside/zone":
      return -1;
    case "off-tackle":
      return 0.5;
    case "balanced":
    case "low-sample":
      return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
