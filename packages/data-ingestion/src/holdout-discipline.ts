/**
 * Holdout discipline + null-classification ingestion standard (V2).
 *
 * Source: rugby model series Ep 2 — "seal off the last season… that's always
 * gonna be our out of sample test element." Learn-only.
 *
 * - sealLastSeason(): splits games into train/holdout with a sealed flag
 * - classifyNull(): missing-by-league = null, never zero
 * - mapTeamIdentity(): promotion/relegation namespace
 *
 * COMPOSES WITH: existing nflverse/CFB loaders, sealed-split.mjs.
 */

export interface SeasonGame {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly opponent: string;
  readonly label: 0 | 1;
  readonly features: Record<string, number | null>;
}

export interface SealedDataset {
  readonly train: readonly SeasonGame[];
  readonly holdout: readonly SeasonGame[];
  readonly sealed: true;
  readonly holdoutSeason: number;
}

export class HoldoutLeakError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "HoldoutLeakError";
  }
}

/**
 * Seal the last complete season as holdout. The holdout is NEVER touched by
 * feature selection, hyperparameter choice, or calibration — the `sealed`
 * flag throws if a training function receives it.
 */
export function sealLastSeason(games: readonly SeasonGame[]): SealedDataset {
  if (games.length === 0) {
    throw new HoldoutLeakError("Cannot seal an empty dataset");
  }
  const seasons = Array.from(new Set(games.map((g) => g.season))).sort((a, b) => a - b);
  const holdoutSeason = seasons[seasons.length - 1];
  const train = games.filter((g) => g.season < holdoutSeason);
  const holdout = games.filter((g) => g.season === holdoutSeason);

  if (train.length === 0) {
    throw new HoldoutLeakError("Only one season — cannot seal holdout without training data");
  }

  return { train, holdout, sealed: true, holdoutSeason };
}

/**
 * Guard: call this before any training function. Throws if the dataset is sealed.
 */
export function assertNotSealed(dataset: unknown, fnName: string): void {
  if (dataset && typeof dataset === "object" && "sealed" in dataset && (dataset as { sealed: boolean }).sealed === true) {
    throw new HoldoutLeakError(
      `HoldoutLeakError: sealed dataset passed to training function "${fnName}". Holdout data must never be used for training.`,
    );
  }
}

// ── Null classification ─────────────────────────────────────────────────────

export interface NullClassification {
  readonly value: number | null;
  readonly isNull: boolean;
}

/**
 * When a league/source does not collect a stat, the feature is null, never zero.
 * Downstream aggregators must skip nulls.
 */
export function classifyNull(
  stat: number | null | undefined,
  leagueHasStat: boolean,
): NullClassification {
  if (!leagueHasStat) {
    return { value: null, isNull: true };
  }
  if (stat == null || !Number.isFinite(stat)) {
    return { value: null, isNull: true };
  }
  return { value: stat, isNull: false };
}

/**
 * Mean that skips nulls — a league without the stat contributes zero weight,
 * not a zero value.
 */
export function nullSafeMean(values: readonly (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ── Promotion/relegation ────────────────────────────────────────────────────

export interface TeamIdentity {
  readonly teamId: string;
  readonly season: number;
  readonly tier: number;
}

/**
 * When a team changes league/tier between seasons, its rating history is
 * namespaced by (team, tier) so a promoted team's prior-tier stats don't
 * pollute the new tier's baselines.
 */
export function mapTeamIdentity(
  teamId: string,
  season: number,
  tierBySeason: ReadonlyMap<string, number>,
): string {
  const tier = tierBySeason.get(`${teamId}:${season}`) ?? 1;
  return `${teamId}::tier${tier}`;
}

/**
 * Get the rating key for a team in a specific season, respecting tier changes.
 */
export function ratingKey(teamId: string, season: number, tier: number): string {
  return `${teamId}::tier${tier}::${season}`;
}
