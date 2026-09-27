/**
 * Signal ledger populator — READ-ONLY candidate generator.
 *
 * Derives universal-ledger candidate rows (`signals` table shape) from the
 * entity-level tables the platform ALREADY populates, so `composeLedger` /
 * `compositeScore` has something real to weight. Writes NOTHING: this emits
 * candidates to stdout/JSON for founder review before any prod insert.
 *
 * Weight policy (per docs/PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md):
 *  - confidence is the honesty valve: settled stat ≈ 1.0, rumor ≈ 0.2.
 *  - Each signal declares its own weight; nothing is hardcoded as a winner.
 *  - Category-level base weight is a PRIOR, not a verdict — the tuner
 *    (tune-signal-weights.ts) recomputes it from settled outcomes.
 *
 * Signal keys follow the entityType.entityKey convention already documented in
 * the prisma Signal model (e.g. "ngs.separation", "injury.practice_status").
 */

import type { LedgerSignalRow } from "./signal-ledger.js";

export type EntityType = "player" | "team";

export interface LedgerCandidate extends LedgerSignalRow {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly category: string;
  /** Season the stat belongs to (0 = season-agnostic). */
  readonly season: number;
  /** Week the stat belongs to (0 = season-agnostic). */
  readonly week: number;
}

export interface CandidateSourceRow {
  /** Stable entity identifier (playerId / gsisId / team abbreviation). */
  readonly entityId: string;
  readonly key: string;
  readonly category: string;
  /** Normalized directional reading, + good / − bad. */
  readonly value: number;
  /** Raw source reading retained for audit. */
  readonly valueRaw?: number | null;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: string;
  readonly season: number;
  readonly week: number;
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/**
 * Normalize a raw stat to the shared directional scale the composer reads
 * (+1 strong good, 0 neutral, −1 strong bad). Centered on a league-average
 * anchor and scaled by a domain spread so a value is comparable ACROSS
 * signal families — the whole point of the shared scale.
 *
 * `anchor` is the neutral point; `spread` maps one standard deviation to ~0.5.
 */
export function normalizeReading(raw: number, anchor: number, spread: number): number {
  if (!Number.isFinite(raw) || !Number.isFinite(anchor) || !Number.isFinite(spread) || spread <= 0) {
    return 0;
  }
  return clamp((raw - anchor) / (2 * spread), -1, 1);
}

/** Base weight PRIOR by category, and the honesty valve (confidence). */
export const CATEGORY_PRIORS: Readonly<Record<string, { weight: number; confidence: number }>> = {
  // Settled hard metrics: near-1.0 honesty.
  HEALTH: { weight: 1.0, confidence: 0.95 },
  PRODUCTION: { weight: 1.0, confidence: 0.9 },
  EFFICIENCY: { weight: 0.9, confidence: 0.85 },
  // Soft / narrative: present, discounted, never ignored (strategy doc §soft).
  NARRATIVE: { weight: 0.5, confidence: 0.45 },
  // Market-derived context: real but not independent of the book.
  ODDS: { weight: 0.7, confidence: 0.7 },
  SCHEDULE: { weight: 0.6, confidence: 0.7 },
  RATINGS: { weight: 0.8, confidence: 0.75 },
};

export function categoryPrior(category: string): { weight: number; confidence: number } {
  return CATEGORY_PRIORS[category] ?? { weight: 0.5, confidence: 0.4 };
}

/**
 * Build a candidate ledger row from a raw source reading.
 * A row with a non-finite value or a malformed timestamp is DROPPED rather
 * than defaulted — the ledger must never carry a synthetic vote.
 */
export function buildCandidate(
  row: CandidateSourceRow,
  entityType: EntityType,
): LedgerCandidate | null {
  if (!row.entityId || !row.key) return null;
  if (!Number.isFinite(row.value)) return null;
  if (!Number.isFinite(Date.parse(row.capturedAt))) return null;
  if (!Number.isFinite(row.weight) || row.weight < 0) return null;
  if (!Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) return null;

  const captured = new Date(row.capturedAt).toISOString();
  return {
    entityType,
    entityId: row.entityId,
    key: row.key,
    category: row.category,
    value: clamp(row.value, -1, 1),
    weight: row.weight,
    confidence: row.confidence,
    capturedAt: captured,
    season: row.season,
    week: row.week,
  };
}

/**
 * Group candidates by entity and compose the attributed Galaxy-Index reading
 * via the production composer. `now` MUST be injected by callers so the output
 * is deterministic and replayable (see signal-ledger.ts determinism seam).
 */
export function composeByEntity(
  candidates: readonly LedgerCandidate[],
  now: string,
  halfLifeDays = 14,
): { entityType: EntityType; entityId: string; score: number; top: readonly string[] }[] {
  const byEntity = new Map<string, LedgerCandidate[]>();
  for (const c of candidates) {
    const k = `${c.entityType}:${c.entityId}`;
    const arr = byEntity.get(k);
    if (arr) arr.push(c);
    else byEntity.set(k, [c]);
  }

  const out: { entityType: EntityType; entityId: string; score: number; top: readonly string[] }[] = [];
  for (const [key, rows] of byEntity) {
    const [entityType, entityId] = key.split(":") as [EntityType, string];
    const composed = composeLedgerFor(rows, now, halfLifeDays);
    out.push({
      entityType,
      entityId,
      score: composed.score,
      top: composed.contributions.slice(0, 5).map((c) => c.key),
    });
  }
  return out;
}

// Imported lazily to keep this module db-free and unit-testable.
import { composeLedger } from "./signal-ledger.js";
function composeLedgerFor(
  rows: readonly LedgerCandidate[],
  now: string,
  halfLifeDays: number,
) {
  return composeLedger(
    rows.map((r) => ({
      key: r.key,
      value: r.value,
      weight: r.weight,
      confidence: r.confidence,
      capturedAt: r.capturedAt,
    })),
    { now, halfLifeDays },
  );
}
