/**
 * Universal signal ledger — the persistent "weight absolutely everything" layer.
 *
 * `compositeScore` blends in-memory WeightedSignals with confidence + freshness
 * decay and reports attributed contributions. This module is the bridge from
 * PERSISTED ledger rows — one record per signal that moves an entity's value,
 * hard metrics AND soft signals (practice status, rumors, coachspeak) — to that
 * composer: it derives age-in-days from each row's `capturedAt`, maps the row to
 * a WeightedSignal, and composes the entity's attributed Galaxy-Index reading.
 *
 * Design (the part the owner cares about): the weighting POLICY is NOT baked in
 * here. Each row carries its own `weight`, `confidence` (the honesty valve — a
 * settled stat ≈ 1.0, a rumor ≈ 0.2), and `value` (already normalized to a shared
 * directional scale by the calibration-gated populator). This layer only blends
 * what the ledger holds — so tuning weights/confidence is a data + calibration
 * step, never a hardcoded guess. An unparsable/absent timestamp decays to zero
 * influence (a bad-timestamp signal never votes as fresh).
 *
 * Pure and db-free. NOT wired into the published pick score (that remains a
 * separate, calibration-gated MODEL_VERSION step).
 */
import { compositeScore, type CompositeScore, type CompositeScoreOptions } from "./composite-score.js";

export interface LedgerSignalRow {
  /** Stable signal key, e.g. "ngs.separation" or "rumor.holdout". */
  readonly key: string;
  /** Normalized directional reading on a shared scale (z-score / −1..1; + good, − bad). */
  readonly value: number;
  /** Base importance (>= 0). */
  readonly weight: number;
  /** Reliability 0..1 (default 1) — keeps a rumor from voting like a fact. */
  readonly confidence?: number;
  /** ISO timestamp the signal was captured (drives freshness decay). */
  readonly capturedAt: string;
}

export interface ComposeLedgerOptions extends CompositeScoreOptions {
  /** "Now" for age computation (default: current time). */
  readonly now?: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Age of a signal in days. An unparsable `capturedAt` (or `now`) returns
 * Infinity, which decays the signal's freshness to ~0 in the composer — a
 * bad-timestamp signal drops out rather than masquerading as fresh.
 */
export function ledgerAgeDays(capturedAt: string, now: string): number {
  const a = Date.parse(capturedAt);
  const n = Date.parse(now);
  if (!Number.isFinite(a) || !Number.isFinite(n)) return Infinity;
  return Math.max(0, (n - a) / MS_PER_DAY);
}

/**
 * Blend persisted ledger rows for one entity into a single attributed score.
 * Pure: derives age from `capturedAt` and delegates to `compositeScore`.
 */
export function composeLedger(
  rows: readonly LedgerSignalRow[],
  options: ComposeLedgerOptions = {},
): CompositeScore {
  const now = options.now ?? new Date().toISOString();
  const signals = rows.map((r) => {
    const ageDays = ledgerAgeDays(r.capturedAt, now);
    // A malformed/absent timestamp must NEVER vote as fresh. Force zero weight at
    // the source so the guarantee holds even when freshness decay is disabled
    // (the composer treats halfLifeDays <= 0 as "no decay").
    const usable = Number.isFinite(ageDays);
    return {
      key: r.key,
      value: r.value,
      weight: usable ? r.weight : 0,
      confidence: r.confidence,
      ageDays: usable ? ageDays : 0,
    };
  });
  return compositeScore(signals, options);
}
