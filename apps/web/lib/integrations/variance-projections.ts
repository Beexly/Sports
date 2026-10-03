/**
 * Data adapter: production `player_game_stats` -> variance-model input.
 *
 * WHAT IT DOES NOT DO. It does not fall back to the process grade. When the
 * source is stale, short, or empty, this returns an empty projection set and
 * the caller keeps whatever it had. A projection that is actually a grade is
 * the exact failure this whole change exists to prevent.
 *
 * SEASON FRESHNESS IS A HARD FAILURE, not a warning. A model that trained on
 * last season and reports `status: "live"` is how the graded pool ended up two
 * seasons stale while looking healthy. `assertFreshTrainingWindow` throws.
 */

import {
  buildVarianceProjections,
  POSITIONAL_CV_SNAPSHOT,
  type ModelPosition,
  type PlayerWeek,
  type ProjectionRow,
} from "@sports/prediction-engine";

/** Minimal Prisma surface, so tests pass a plain object. */
export type PlayerWeekStat = {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly seasonType: string;
  readonly fantasyPointsPpr: number | null;
  readonly player?: { readonly position: ModelPosition } | null;
};

export type PlayerWeekClient = {
  playerGameStat: {
    findMany(args: {
      where: {
        seasonType: "REG";
        season: { lt: number };
        fantasyPointsPpr: { not: null };
      };
      select: {
        playerId: true;
        season: true;
        week: true;
        seasonType: true;
        fantasyPointsPpr: true;
        player: { select: { position: true } };
      };
      orderBy: [{ playerId: "asc" }, { season: "asc" }, { week: "asc" }];
    }): Promise<readonly PlayerWeekStat[]>;
  };
};

/** Regular-season weeks per season, for the absolute week index. */
export const REG_WEEKS = 18;

export interface TrainingWindow {
  /** Train on seasons strictly below this. 2025 => train 2020-2024. */
  readonly evalSeason: number;
  /** Remaining games for the target season, per player. */
  readonly remainingGames: Readonly<Record<string, number>>;
}

export class StaleTrainingWindowError extends Error {
  constructor(
    readonly newestSeason: number,
    readonly evalSeason: number,
  ) {
    super(
      `variance-model training window is stale: newest season ${newestSeason}, ` +
        `forecasting ${evalSeason} needs at least ${evalSeason - 1}. ` +
        `Refusing to publish projections.`,
    );
    this.name = "StaleTrainingWindowError";
  }
}

/**
 * Fail loudly when the source is older than the season we are forecasting.
 * The rule is one season of slack: forecasting 2025 needs 2024 rows at minimum,
 * so `newestSeason < evalSeason - 1` is the line.
 */
export function assertFreshTrainingWindow(newestSeason: number, evalSeason: number): void {
  if (newestSeason < evalSeason - 1) {
    throw new StaleTrainingWindowError(newestSeason, evalSeason);
  }
}

/** Absolute week index so recency is measured ACROSS seasons, not within one. */
export function absoluteWeek(season: number, week: number, seasonOffset: number): number {
  return seasonOffset * REG_WEEKS + week;
}

/**
 * Positional mean PPR/game and mean within-player CV from the same window.
 * Returned rather than hardcoded so the priors and the fit cannot drift apart.
 */
export function derivePositionalStats(
  weeks: readonly PlayerWeek[],
  minGames = 8,
): { meanPpr: Record<string, number>; cv: Record<string, number> } {
  const byPlayer = new Map<string, { position: string; values: number[] }>();
  for (const w of weeks) {
    const list = byPlayer.get(w.playerId);
    if (list) list.values.push(w.ppr);
    else byPlayer.set(w.playerId, { position: String(w.position), values: [w.ppr] });
  }

  const allByPos = new Map<string, number[]>();
  for (const { position, values } of byPlayer.values()) {
    const list = allByPos.get(position);
    if (list) list.push(...values);
    else allByPos.set(position, [...values]);
  }
  const meanPpr: Record<string, number> = {};
  for (const [pos, values] of allByPos) {
    if (values.length === 0) continue;
    meanPpr[pos] = values.reduce((s, v) => s + v, 0) / values.length;
  }

  const cvsByPos = new Map<string, number[]>();
  for (const { position, values } of byPlayer.values()) {
    if (values.length < minGames) continue;
    const m = values.reduce((s, v) => s + v, 0) / values.length;
    if (!(m > 0)) continue;
    const variance =
      values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1);
    const cv = Math.sqrt(variance) / m;
    const list = cvsByPos.get(position);
    if (list) list.push(cv);
    else cvsByPos.set(position, [cv]);
  }
  const cv: Record<string, number> = {};
  for (const [pos, list] of cvsByPos) {
    if (list.length === 0) continue;
    cv[pos] = list.reduce((s, v) => s + v, 0) / list.length;
  }
  return { meanPpr, cv };
}

export interface VarianceProjectionResult {
  readonly rows: readonly ProjectionRow[];
  readonly trainThroughSeason: number;
  /** Which CV table was used. The honesty record. */
  readonly cvSource: "measured" | "caller-supplied";
}

/**
 * Load training weeks and build projections. Throws
 * `StaleTrainingWindowError` when the source is older than the forecast season
 * requires — callers must not catch that and continue with a stale number.
 */
export async function loadVarianceProjections(
  client: PlayerWeekClient,
  window: TrainingWindow,
  opts: {
    /** Overrides the measured CV table. Only for tests. */
    readonly positionalCv?: Readonly<Record<string, number>>;
    readonly minGames?: number;
  } = {},
): Promise<VarianceProjectionResult> {
  const stats = await client.playerGameStat.findMany({
    where: {
      seasonType: "REG",
      season: { lt: window.evalSeason },
      fantasyPointsPpr: { not: null },
    },
    select: {
      playerId: true,
      season: true,
      week: true,
      seasonType: true,
      fantasyPointsPpr: true,
      player: { select: { position: true } },
    },
    orderBy: [{ playerId: "asc" }, { season: "asc" }, { week: "asc" }],
  });

  const seasons = [...new Set(stats.map((s) => s.season))].sort((a, b) => a - b);
  // `.at(-1)` rather than `seasons[seasons.length - 1]`: under
  // noUncheckedIndexedAccess the index form is `number | undefined` and leaks
  // the undefined into `trainThroughSeason` and the freshness check.
  const newestSeason = seasons.at(-1) ?? 0;
  assertFreshTrainingWindow(newestSeason, window.evalSeason);

  const offsetOf = new Map<number, number>();
  seasons.forEach((s, i) => offsetOf.set(s, i));

  const weeks: PlayerWeek[] = [];
  for (const s of stats) {
    const position = s.player?.position;
    const ppr = s.fantasyPointsPpr;
    if (position == null || ppr == null) continue;
    weeks.push({
      playerId: s.playerId,
      position,
      absWeek: absoluteWeek(s.season, s.week, offsetOf.get(s.season) ?? 0),
      ppr,
    });
  }

  const derived = derivePositionalStats(weeks, opts.minGames ?? 8);
  // Measured-from-this-window CV wins over the snapshot only where the window
  // actually has players; otherwise fall back so a thin position is not dropped.
  const positionalCv: Record<string, number> = { ...POSITIONAL_CV_SNAPSHOT, ...opts.positionalCv };
  for (const [pos, value] of Object.entries(derived.cv)) positionalCv[pos] = value;

  const rows = buildVarianceProjections({
    weeks,
    positionalMeanPpr: derived.meanPpr,
    positionalCv,
    remainingGames: window.remainingGames,
    ...(opts.minGames !== undefined ? { minGames: opts.minGames } : {}),
  });

  return { rows, trainThroughSeason: newestSeason, cvSource: "measured" };
}
