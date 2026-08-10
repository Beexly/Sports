/**
 * Persistence for the shadow prediction engine.
 *
 * WHY THIS EXISTS. `LiveOrchestrator` holds its particle filter in memory, and the
 * host is serverless: every invocation builds a fresh instance. Without rehydration
 * the filter re-draws its prior cloud on each request, carries zero observations,
 * and reports ~0.5 forever — it cannot learn from settled games no matter how many
 * are fed to it. That, not the absence of more models, is what has kept every shadow
 * module inert. This module closes the loop.
 *
 * WHAT IT IS NOT. Nothing here publishes, prices, or shows anything to a user.
 * `ShadowSignal` rows are evaluation data: they exist so the shadow engine can be
 * scored against the live one on the SAME games, offline, before any traffic is
 * routed to it. Routing traffic remains a separate, human decision.
 *
 * Reads/writes fail OPEN (null / false) rather than throwing, matching
 * `loadPublicCalibrationReport`'s convention: a DB blip must degrade the shadow
 * pipeline, never take down the caller.
 */

import { db } from "@sports/db";
import {
  TeamStrengthFilter,
  FILTER_SNAPSHOT_VERSION,
  type FilterStateSnapshot,
  type TeamStrengthFilterOptions,
} from "@sports/prediction-engine";

export interface ShadowSignalInput {
  readonly gameId: string;
  readonly modelVersion: string;
  readonly shadowProb: number;
  readonly marketProb: number;
  readonly liveConfidence?: number | null;
}

/**
 * Load the persisted filter for `scope`, or construct a fresh one from `fallback`
 * when there is no usable snapshot.
 *
 * A snapshot whose `version` does not match the running code is IGNORED (fresh
 * filter returned) rather than fed to `restore`, which would throw. A stored
 * snapshot is data from a past deploy; a layout change is an expected migration
 * event, not a reason to break the caller. The same applies to a corrupt payload.
 */
export async function loadFilter(
  scope: string,
  fallback: TeamStrengthFilterOptions,
): Promise<{ readonly filter: TeamStrengthFilter; readonly restored: boolean }> {
  const row = await db.filterStateSnapshot.findUnique({ where: { scope } }).catch(() => null);

  if (row === null || row.version !== FILTER_SNAPSHOT_VERSION) {
    return { filter: new TeamStrengthFilter(fallback), restored: false };
  }

  try {
    return {
      filter: TeamStrengthFilter.restore(row.payload as unknown as FilterStateSnapshot),
      restored: true,
    };
  } catch {
    // A stored snapshot that no longer restores is a migration/corruption event.
    // Starting cold is honest and recoverable; throwing here would wedge the job.
    return { filter: new TeamStrengthFilter(fallback), restored: false };
  }
}

/** Write-through the filter's full state. Returns false if the write failed. */
export async function saveFilter(scope: string, filter: TeamStrengthFilter): Promise<boolean> {
  const snapshot = filter.snapshot();
  const payload = snapshot as unknown as object;
  const observations = snapshot.observations;

  const ok = await db.filterStateSnapshot
    .upsert({
      where: { scope },
      create: { scope, version: snapshot.version, observations, payload },
      update: { version: snapshot.version, observations, payload },
    })
    .then(() => true)
    .catch(() => false);

  return ok;
}

/**
 * Record a shadow evaluation. Upserts on (gameId, modelVersion) — a re-run must
 * overwrite, not append, or the offline Brier would be computed over repeated
 * observations of one game and would silently overweight whatever got re-run.
 */
export async function recordShadowSignal(input: ShadowSignalInput): Promise<boolean> {
  const data = {
    shadowProb: input.shadowProb,
    marketProb: input.marketProb,
    liveConfidence: input.liveConfidence ?? null,
  };

  return db.shadowSignal
    .upsert({
      where: { gameId_modelVersion: { gameId: input.gameId, modelVersion: input.modelVersion } },
      create: { gameId: input.gameId, modelVersion: input.modelVersion, ...data },
      update: data,
    })
    .then(() => true)
    .catch(() => false);
}

/** Attach a settled outcome to every shadow row for this game. Returns rows updated. */
export async function settleShadowSignal(
  gameId: string,
  outcome: 0 | 1,
  settledAt: Date = new Date(),
): Promise<number> {
  return db.shadowSignal
    .updateMany({ where: { gameId, outcome: null }, data: { outcome, settledAt } })
    .then((r: { count: number }) => r.count)
    .catch(() => 0);
}

export interface SettledShadowRow {
  readonly gameId: string;
  readonly modelVersion: string;
  readonly shadowProb: number;
  readonly marketProb: number;
  readonly liveConfidence: number | null;
  readonly outcome: number;
}

/** Settled shadow rows in `[since, until)`, for offline scoring. */
export async function loadSettledShadowSignals(
  since: Date,
  until: Date = new Date(),
): Promise<readonly SettledShadowRow[]> {
  const rows = await db.shadowSignal
    .findMany({
      where: { outcome: { not: null }, settledAt: { gte: since, lt: until } },
      select: {
        gameId: true,
        modelVersion: true,
        shadowProb: true,
        marketProb: true,
        liveConfidence: true,
        outcome: true,
      },
      orderBy: { settledAt: "asc" },
    })
    .catch(() => null);

  if (rows === null) return [];
  return rows.filter((r): r is SettledShadowRow => r.outcome !== null);
}
