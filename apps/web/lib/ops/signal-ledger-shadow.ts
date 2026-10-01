/**
 * Signal-ledger shadow composer — the compose step the census never had.
 *
 * The census cron (`/api/cron/signal-ledger-census`) loads the four populated
 * entity tables and reports what the ledger COULD hold. This module does the
 * next step: it runs those candidates through the production composer
 * (`composeByEntity` → `composeLedger` → `compositeScore`) and returns the
 * per-entity blended scores.
 *
 * SHADOW MEANS SHADOW. This module:
 * - reads candidates, writes nothing (no DB, no disk, no network);
 * - never touches the published pick score, the calibrator, or MODEL_VERSION;
 * - returns a report for the ops route to serialize.
 * Promotion of any shadow number into a live path is a separate, founder-gated
 * step. Per the repo's shadow-only doctrine, uncalibrated signals compute in
 * shadow and cannot promote to public outputs.
 *
 * Determinism: `now` is REQUIRED — no wall-clock default. Two runs over the
 * same candidates with the same `now` produce byte-identical reports, which is
 * what makes the shadow comparable run-over-run. Callers read the clock once
 * and inject it; see signal-ledger.ts for the seam this closes.
 */

import {
  composeByEntity,
  type EntityType,
  type LedgerCandidate,
} from "@sports/prediction-engine";

export interface ShadowEntityScore {
  readonly entityType: EntityType;
  readonly entityId: string;
  /** Effective-weighted blend of the entity's signals, −1..1 (4-decimal rounded). */
  readonly score: number;
  /** Signal keys driving the score, by |contribution| desc — the narration order. */
  readonly topSignals: readonly string[];
  /** How many ledger candidates fed this entity. */
  readonly candidateCount: number;
}

export interface LedgerShadowSummary {
  readonly entitiesScored: number;
  readonly playersScored: number;
  readonly teamsScored: number;
  readonly meanAbsScore: number;
  readonly maxAbsScore: number;
}

export interface LedgerShadowReport {
  readonly now: string;
  readonly halfLifeDays: number;
  /** Entities sorted by |score| desc — strongest ledger readings first. */
  readonly entities: readonly ShadowEntityScore[];
  readonly summary: LedgerShadowSummary;
}

/**
 * Compose every candidate into per-entity shadow scores.
 *
 * Pure and db-free: the only input is the candidate list plus the injected
 * `now`. An empty candidate list is a legitimate, reportable answer — it
 * yields zero entities, not an error.
 */
export function composeLedgerShadow(
  candidates: readonly LedgerCandidate[],
  now: string,
  halfLifeDays = 14,
): LedgerShadowReport {
  if (!Number.isFinite(Date.parse(now))) {
    throw new Error("composeLedgerShadow: `now` must be a valid ISO instant");
  }

  const counts = new Map<string, number>();
  for (const c of candidates) {
    const k = `${c.entityType}:${c.entityId}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const entities: ShadowEntityScore[] = composeByEntity(candidates, now, halfLifeDays)
    .map((e) => ({
      entityType: e.entityType,
      entityId: e.entityId,
      score: e.score,
      topSignals: e.top,
      candidateCount: counts.get(`${e.entityType}:${e.entityId}`) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  let playersScored = 0;
  let teamsScored = 0;
  let absSum = 0;
  let maxAbs = 0;
  for (const e of entities) {
    if (e.entityType === "player") playersScored += 1;
    else teamsScored += 1;
    const a = Math.abs(e.score);
    absSum += a;
    if (a > maxAbs) maxAbs = a;
  }

  const n = entities.length;
  return {
    now,
    halfLifeDays,
    entities,
    summary: {
      entitiesScored: n,
      playersScored,
      teamsScored,
      meanAbsScore: n > 0 ? Math.round((absSum / n) * 1e4) / 1e4 : 0,
      maxAbsScore: Math.round(maxAbs * 1e4) / 1e4,
    },
  };
}
