/**
 * Refusal-only port of the matchup contract from stale branch
 * `claude/edge-map-rebuild-2026-06-04` (`apps/web/lib/intelligence/matchup.ts`).
 * The hand-weighted delta (MAX_DELTA=12, W_DEF_EPA=7, POS_SENSITIVITY,
 * reference bands) is deliberately not ported because it has no out-of-sample
 * evidence. This module has no loaders and never computes a numeric delta.
 */

export type MatchupSourceStatus = "live" | "source-error";

export interface MatchupSource<T> {
  readonly status: MatchupSourceStatus;
  readonly rows: readonly T[];
  readonly error?: string | null;
  readonly sourceUrl?: string;
}

export interface MatchupPlayerModelSource {
  readonly status: MatchupSourceStatus;
  readonly season: number;
  readonly profiles: readonly unknown[];
  readonly error?: string | null;
  readonly sourceUrl?: string;
}

export interface MatchupScheduleSource {
  readonly status: MatchupSourceStatus;
  readonly rows: readonly unknown[];
  readonly week?: number | null;
  readonly error?: string | null;
  readonly sourceUrl?: string;
}

export interface MatchupDeltaLeaf {
  readonly delta: number | null;
  readonly grade: "unknown";
  readonly topDriver: null;
  readonly topMagnitude: 0;
}

export interface MatchupContractRow {
  readonly profile: unknown;
  readonly result: MatchupDeltaLeaf;
}

interface MatchupResultBase {
  readonly generatedAt: string;
  readonly season: number;
  readonly week: number | null;
  readonly rows: readonly MatchupContractRow[];
  readonly gamesCovered: number;
  readonly matchupsRead: number;
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrls: Readonly<Record<string, string>>;
  readonly error: string | null;
}

export interface MatchupSourceError extends MatchupResultBase {
  readonly status: "source-error";
}

export interface MatchupLiveResult extends MatchupResultBase {
  readonly status: "live";
  readonly enrichment: {
    readonly environment: MatchupSourceStatus | null;
    readonly pressureCoverage: MatchupSourceStatus | null;
  };
}

export type MatchupContractResult = MatchupSourceError | MatchupLiveResult;

export interface MatchupContractInput {
  readonly generatedAt: string;
  readonly season: number;
  readonly week: number | null;
  readonly playerModel: MatchupPlayerModelSource | null;
  readonly schedule: MatchupScheduleSource | null;
  readonly environment: MatchupSource<unknown> | null;
  readonly pressureCoverage: MatchupSource<unknown> | null;
  readonly sourceUrls?: Readonly<Record<string, string>>;
}

const WITHHELD_NOTE =
  "The matchup read is unavailable right now. We show an empty state instead of a matchup adjustment we can't stand behind.";

/** Construct an honest empty result when a gating source cannot support a board. */
export function sourceError(
  generatedAt: string,
  season: number,
  week: number | null,
  sourceUrls: Readonly<Record<string, string>>,
  error: string | null,
): MatchupSourceError {
  return {
    generatedAt,
    status: "source-error",
    season,
    week,
    rows: [],
    gamesCovered: 0,
    matchupsRead: 0,
    canPublishProjections: false,
    note: WITHHELD_NOTE,
    sourceUrls,
    error,
  };
}

/**
 * Keep the leaf unknown rather than turning missing or unvalidated context into
 * a zero-valued matchup adjustment. Numeric delta computation is not ported.
 */
export function computeMatchupDeltaLeaf(
  opp: unknown | null,
  contributions: readonly unknown[],
): MatchupDeltaLeaf {
  if (opp === null || contributions.length === 0) {
    return { delta: null, grade: "unknown", topDriver: null, topMagnitude: 0 };
  }

  // The adjustment model is deliberately absent; even complete inputs cannot
  // produce a numeric delta in this refusal-contract-only module.
  return { delta: null, grade: "unknown", topDriver: null, topMagnitude: 0 };
}

/**
 * Apply the two-tier source policy without loading data: player profiles and
 * schedule rows gate the artifact; environment and pressure coverage only enrich
 * it. A successful read remains non-publishable while the adjustment model is
 * unvalidated.
 */
export function evaluateMatchupContract(input: MatchupContractInput): MatchupContractResult {
  const sourceUrls = input.sourceUrls ?? {};
  const playerModel = input.playerModel;
  const schedule = input.schedule;

  // Keep status-error and empty-success checks separate: an empty successful
  // source must refuse just as an explicitly failed source does.
  if (!playerModel || playerModel.status === "source-error" || playerModel.profiles.length === 0) {
    const error = playerModel?.error ?? (playerModel ? "no player profiles" : "player model unavailable");
    return sourceError(input.generatedAt, playerModel?.season ?? input.season, input.week, sourceUrls, error);
  }

  if (!schedule || schedule.status === "source-error" || schedule.rows.length === 0) {
    const error = schedule?.error ?? (schedule ? "no scheduled games" : "schedule unavailable");
    return sourceError(input.generatedAt, playerModel.season, input.week, sourceUrls, error);
  }

  const rows: MatchupContractRow[] = playerModel.profiles.map((profile) => ({
    profile,
    result: computeMatchupDeltaLeaf(null, []),
  }));

  return {
    generatedAt: input.generatedAt,
    status: "live",
    season: playerModel.season,
    week: schedule.week ?? input.week,
    rows,
    gamesCovered: schedule.rows.length,
    matchupsRead: rows.filter((row) => row.result.delta !== null).length,
    canPublishProjections: false,
    note: "Matchup inputs are read-only context. No matchup adjustment or projection is published.",
    sourceUrls,
    error: null,
    enrichment: {
      environment: input.environment?.status ?? null,
      pressureCoverage: input.pressureCoverage?.status ?? null,
    },
  };
}
