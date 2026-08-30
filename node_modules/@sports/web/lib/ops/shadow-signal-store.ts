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

import { db, Prisma } from "@sports/db";
import {
  TeamStrengthFilter,
  FILTER_SNAPSHOT_VERSION,
  createTeamIndexRegistry,
  isValidTeamIndexRegistry,
  DEFAULT_TEAM_CAPACITY,
  type FilterStateSnapshot,
  type TeamStrengthFilterOptions,
  type TeamIndexRegistry,
  type ForecastSkillFoldState,
} from "@sports/prediction-engine";

/**
 * Light structural check for a persisted `ForecastSkillFoldState` — much
 * cheaper than `isValidTeamIndexRegistry` because the failure mode here is
 * low-stakes (worst case: the fold resets to n=0), unlike a mismatched team
 * registry (which can silently misattribute one team's learned strength to
 * another). Rejects anything that isn't a plausible fold state rather than
 * feeding a malformed object into `foldForecastSkillPick` downstream.
 */
function isValidForecastSkillFoldState(value: unknown): value is ForecastSkillFoldState {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.n === "number" &&
    typeof v.logM === "number" &&
    typeof v.maxLogM === "number" &&
    (v.firstCrossedAtPick === null || typeof v.firstCrossedAtPick === "number") &&
    typeof v.threshold === "number" &&
    typeof v.alpha === "number" &&
    typeof v.epsilon === "number" &&
    typeof v.floor === "number" &&
    typeof v.minPicks === "number" &&
    typeof v.sumOurP === "number" &&
    typeof v.sumMarketP === "number" &&
    typeof v.sumOutcome === "number"
  );
}

/** Light structural check for persisted BAEE weights: a non-empty array of finite, non-negative numbers. */
function isValidWeightsArray(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((w) => typeof w === "number" && Number.isFinite(w) && w >= 0)
  );
}

export interface ShadowSignalInput {
  readonly gameId: string;
  readonly modelVersion: string;
  readonly shadowProb: number;
  readonly marketProb: number;
  readonly liveConfidence?: number | null;
  /** Raw per-model probabilities behind `shadowProb`. Purely additive — stored
   *  for a future weighted ensemble; nothing reads it back yet. */
  readonly modelProbs?: readonly number[];
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
): Promise<{
  readonly filter: TeamStrengthFilter;
  readonly registry: TeamIndexRegistry;
  readonly restored: boolean;
  /**
   * Null whenever there is nothing valid to resume — either no row, a version
   * mismatch, or a malformed value. INDEPENDENT of `restored`: a version
   * mismatch forces the filter cold but a row written by an older deploy
   * (before this column existed) legitimately has no forecast-skill state yet,
   * which is a normal "nothing to resume" case, not a corruption event.
   */
  readonly forecastSkillState: ForecastSkillFoldState | null;
  /** Null under the same conditions as `forecastSkillState`, independently checked. */
  readonly baeeWeights: readonly number[] | null;
}> {
  const cold = () => ({
    filter: new TeamStrengthFilter(fallback),
    registry: createTeamIndexRegistry(scope, fallback.nTeams ?? DEFAULT_TEAM_CAPACITY),
    restored: false as const,
    forecastSkillState: null,
    baeeWeights: null,
  });

  const row = await db.filterStateSnapshot.findUnique({ where: { scope } }).catch(() => null);
  if (row === null || row.version !== FILTER_SNAPSHOT_VERSION) return cold();

  // forecastSkillState/baeeWeights are read independently of the
  // filter/registry pairing below — see their doc comments above for why they
  // carry no cross-field identity hazard and may legitimately be absent.
  const forecastSkillState = isValidForecastSkillFoldState(row.forecastSkillState)
    ? row.forecastSkillState
    : null;
  const baeeWeights = isValidWeightsArray(row.baeeWeights) ? row.baeeWeights : null;

  // The registry and the payload are only meaningful TOGETHER: an index is a
  // team's latent-slot identity. A row whose registry is missing or malformed
  // cannot be paired with its particle cloud, and restoring the cloud anyway
  // would attribute learned strength to whichever team later lands in each
  // slot. Refuse the pair and start cold — losing history is recoverable,
  // silently mis-attributing it is not.
  if (!isValidTeamIndexRegistry(row.teamIndex)) {
    return { ...cold(), forecastSkillState, baeeWeights };
  }

  try {
    return {
      filter: TeamStrengthFilter.restore(row.payload as unknown as FilterStateSnapshot),
      registry: row.teamIndex,
      restored: true,
      forecastSkillState,
      baeeWeights,
    };
  } catch {
    // A stored snapshot that no longer restores is a migration/corruption event.
    // Starting cold is honest and recoverable; throwing here would wedge the job.
    return { ...cold(), forecastSkillState, baeeWeights };
  }
}

/**
 * Write-through the filter's full state, its registry, and (optionally) the
 * forecast-skill fold state and BAEE weights, all in a single upsert. Filter
 * and registry are never written one without the other, for the identity
 * reason above; the two optional fields are written whenever supplied,
 * independently of that pairing. Returns false if the write failed.
 */
export async function saveFilter(
  scope: string,
  filter: TeamStrengthFilter,
  registry: TeamIndexRegistry,
  forecastSkillState?: ForecastSkillFoldState | null,
  baeeWeights?: readonly number[] | null,
): Promise<boolean> {
  const snapshot = filter.snapshot();
  const payload = snapshot as unknown as object;
  const teamIndex = registry as unknown as object;
  const observations = snapshot.observations;
  // Prisma's nullable Json columns need Prisma.JsonNull for "write SQL NULL
  // here", not a plain JS `null` — the generated input types reject a literal
  // null (see apps/web/lib/cockpit/transitions.ts for the same pattern).
  const fss = forecastSkillState ? (forecastSkillState as unknown as object) : Prisma.JsonNull;
  const weights = baeeWeights ? ([...baeeWeights] as unknown as object) : Prisma.JsonNull;

  return db.filterStateSnapshot
    .upsert({
      where: { scope },
      create: {
        scope,
        version: snapshot.version,
        observations,
        payload,
        teamIndex,
        forecastSkillState: fss,
        baeeWeights: weights,
      },
      update: {
        version: snapshot.version,
        observations,
        payload,
        teamIndex,
        forecastSkillState: fss,
        baeeWeights: weights,
      },
    })
    .then(() => true)
    .catch(() => false);
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
    modelProbs: input.modelProbs ? ([...input.modelProbs] as unknown as object) : Prisma.JsonNull,
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
