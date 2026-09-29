/**
 * The fantasy variance model — OUR projection, built on nflverse production data.
 *
 * WHAT THIS IS NOT. It is not the process grade. `PlayerModel.canPublishProjections`
 * stays `false` forever: the grade is EPA + target share + WOPR, it is context,
 * and no amount of clean numbers here relabels it as a forecast. Every number
 * this module returns is a projection; every number the grade returns is context.
 *
 * THE METHOD, as specified and as measured.
 *   rate   = recency-weighted mean PPR/game, exponential half-life 6 weeks
 *   shrink = empirical Bayes toward the positional mean, weight = reliability
 *   proj   = shrunk rate * remaining games
 *   CV_p   = the player's own CV across training games, EB-shrunk to the
 *            positional CV by the SAME reliability weight
 *   floor  = proj * (1 - CV_p)     ceiling = proj * (1 + CV_p)
 *
 * HONESTY NOTE ON THE POSTED SPOT-CHECK. The founder's spec pinned McCaffrey at
 * proj=417 / floor=313 / ceiling=584 and said: "If they aren't [consistent with
 * the method], the method is wrong and the spot-check fails." They are NOT
 * consistent, and the measurements say why — see POSITIONAL_CV_SNAPSHOT below and
 * the test file, which asserts the measured values rather than the posted ones:
 *
 *   1. proj=417 IS McCaffrey's REALIZED 2025 total (416.6 measured). A model
 *      fitted on seasons < 2025 has never seen it, so it is the answer, not a
 *      forecast. Our honest fit gives proj=248.0 over 17 remaining games.
 *   2. 313 and 584 are ASYMMETRIC about 417. The method's band is symmetric in
 *      CV by construction: floor implies CV=0.2494, ceiling implies CV=0.4005.
 *      No single CV can produce that pair — floor+ceiling=897 != 2*417=834.
 *   3. The spec's positional CV priors (QB 45% / RB 55% / WR 65% / TE 67%) do not
 *      match production. Measured on seasons < 2025 (see the snapshot constant
 *      below, computed from 32,894 player-weeks): within-player mean CV is
 *      QB 0.993 / RB 0.872 / WR 0.876 / TE 0.936. Every prior is understated.
 *
 * The priors are therefore carried as DECLARED, UNAVAILABLE inputs: they are
 * named, documented, and NOT silently swapped for the measured values. Callers
 * must choose. The library does not pretend a founder-supplied constant and a
 * measured constant are the same thing.
 *
 * Pure: no DB, no fetch, no clock beyond an injected `asOf`. The data adapter
 * that reads `player_game_stats` lives in the caller.
 */

// The four fantasy positions this model covers. The process grade calls this
// `ModelPosition` and lives in apps/web, so the union is declared here rather
// than imported across the package boundary.
export type ModelPosition = "QB" | "RB" | "WR" | "TE";

/** Exponential half-life for the recency weight, in weeks. Specified. */
export const RECENCY_HALF_LIFE_WEEKS = 6;

/**
 * Games played at which a player's rate is weighted 50% against the positional
 * mean. This is the empirical-Bayes prior strength: `reliability = n/(n+KAPPA)`.
 * Exposed and named because a shrinkage constant nobody can see is a constant
 * that will drift.
 */
export const SHRINKAGE_KAPPA_GAMES = 8;

/**
 * Positional CV priors as POSTED IN THE SPEC, kept verbatim and explicitly
 * unavailable. Measured production values disagree by 0.23-0.54 absolute; see
 * `POSITIONAL_CV_SNAPSHOT` for what the data actually says.
 */
export const SPEC_POSTED_POSITIONAL_CV: Readonly<Record<string, number>> = Object.freeze({
  QB: 0.45,
  RB: 0.55,
  WR: 0.65,
  TE: 0.67,
});

/**
 * What production actually measures: mean of per-player within-player CV, over
 * players with >= 8 training games, seasons 2020-2024 REG, n=771 players.
 * Measured 2026-09-28 from 32,894 player-weeks. A test asserts these, so the
 * drift from the posted priors is visible instead of silent.
 */
export const POSITIONAL_CV_SNAPSHOT: Readonly<Record<ModelPosition, number>> = Object.freeze({
  QB: 0.993,
  RB: 0.872,
  WR: 0.876,
  TE: 0.936,
});

/** Provenance of the snapshot above, kept beside it so it cannot drift alone. */
export const POSITIONAL_CV_SNAPSHOT_META = Object.freeze({
  /** Players behind each snapshot number. */
  samplePlayers: Object.freeze<Record<ModelPosition, number>>({
    QB: 96,
    RB: 206,
    WR: 304,
    TE: 165,
  }),
  /** 2026-09-28. */
  measuredOn: "2026-09-28",
});

/** One player-week from the source table. `absWeek` orders across seasons. */
export interface PlayerWeek {
  readonly playerId: string;
  readonly position: ModelPosition;
  /** Absolute week index, monotonically increasing across seasons. */
  readonly absWeek: number;
  readonly ppr: number;
}

export interface VarianceModelInput {
  /** Training window only. Any week at or after `holdoutFromWeek` is excluded. */
  readonly weeks: readonly PlayerWeek[];
  /** Positional mean PPR/game, computed by the caller from the same window. */
  readonly positionalMeanPpr: Readonly<Record<string, number>>;
  /** Positional CV. Pass the measured snapshot, not the posted spec. */
  readonly positionalCv: Readonly<Record<string, number>>;
  /** Remaining games for this player. Drives `proj`, never the band shape. */
  readonly remainingGames: Readonly<Record<string, number>>;
  /** Reliability constant in games. Defaults to the named export. */
  readonly kappa?: number;
  readonly halfLifeWeeks?: number;
  /** Minimum training games before a player is projectable at all. */
  readonly minGames?: number;
}

export interface ProjectionRow {
  readonly playerId: string;
  readonly position: ModelPosition;
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
  /** Games behind the estimate. */
  readonly games: number;
  /** n/(n+kappa): how much of the estimate is the player, not the prior. */
  readonly reliability: number;
  /** Recency-weighted rate BEFORE shrinkage. Shown so shrinkage is auditable. */
  readonly rawRate: number;
  /** CV used for the band, AFTER EB shrinkage toward the positional CV. */
  readonly cvPlayer: number;
  /** The player's own measured CV, before shrinkage. */
  readonly rawCv: number;
}

/** Which positional CV a caller supplied, and whether it is the spec's. */
export type CvSource = "spec-posted" | "measured" | "caller-supplied";

function sdOf(values: readonly number[]): number {
  if (values.length < 2) return 0;
  let m = 0;
  for (const v of values) m += v;
  m /= values.length;
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  return Math.sqrt(s / (values.length - 1));
}

function meanOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/**
 * Exponential recency weight. `latestAbsWeek` is the player's most recent
 * TRAINING week — a player who stopped playing ages out of his own history
 * instead of inheriting an immortal recent form.
 */
export function recencyWeight(absWeek: number, latestAbsWeek: number, halfLife: number): number {
  if (halfLife <= 0) return 1;
  // Clamp at zero age: a week at or after the latest must not receive more
  // than full weight. Without this a future-dated or tie-dated week scores
  // 0.5^(negative) and silently dominates the blend.
  const age = latestAbsWeek - absWeek;
  if (age <= 0) return 1;
  return Math.pow(0.5, age / halfLife);
}

/**
 * Build projections. A player is EXCLUDED, never given a prior, when he has
 * fewer than `minGames` training weeks, has no remaining games, has no
 * positional prior, or has a non-positive mean. Excluded is the honest answer
 * when the data cannot support a number.
 */
export function buildVarianceProjections(input: VarianceModelInput): readonly ProjectionRow[] {
  const halfLife = input.halfLifeWeeks ?? RECENCY_HALF_LIFE_WEEKS;
  const kappa = input.kappa ?? SHRINKAGE_KAPPA_GAMES;
  const minGames = input.minGames ?? 8;

  const byPlayer = new Map<string, PlayerWeek[]>();
  for (const w of input.weeks) {
    const list = byPlayer.get(w.playerId);
    if (list) list.push(w);
    else byPlayer.set(w.playerId, [w]);
  }

  const out: ProjectionRow[] = [];
  for (const [playerId, all] of byPlayer) {
    const list = [...all].sort((a, b) => a.absWeek - b.absWeek);
    const newest = list[list.length - 1];
    if (newest === undefined) continue;
    const position = newest.position;
    const posKey = String(position);
    const priorMean = input.positionalMeanPpr[posKey];
    const priorCv = input.positionalCv[posKey];
    const remaining = input.remainingGames[playerId];
    if (priorMean === undefined || priorCv === undefined) continue;
    if (remaining === undefined || remaining <= 0) continue;
    if (list.length < minGames) continue;

    const values = list.map((w) => w.ppr);
    const mean = meanOf(values);
    if (!(mean > 0)) continue;

    const latest = newest.absWeek;
    let wSum = 0;
    let wx = 0;
    for (const w of list) {
      const weight = recencyWeight(w.absWeek, latest, halfLife);
      wSum += weight;
      wx += weight * w.ppr;
    }
    const rawRate = wSum > 0 ? wx / wSum : mean;

    const n = list.length;
    const reliability = n / (n + kappa);
    const rate = reliability * rawRate + (1 - reliability) * priorMean;
    const proj = rate * remaining;

    const rawCv = sdOf(values) / mean;
    const cvPlayer = reliability * rawCv + (1 - reliability) * priorCv;

    out.push({
      playerId,
      position,
      proj,
      floor: proj * (1 - cvPlayer),
      ceiling: proj * (1 + cvPlayer),
      games: n,
      reliability,
      rawRate,
      cvPlayer,
      rawCv,
    });
  }
  out.sort((a, b) => b.proj - a.proj);
  return out;
}

/** Which of the two CV tables a caller is passing, for the honesty record. */
export function classifyCvSource(positionalCv: Readonly<Record<string, number>>): CvSource {
  const keys: readonly string[] = ["QB", "RB", "WR", "TE"];
  const spec = SPEC_POSTED_POSITIONAL_CV as Readonly<Record<string, number>>;
  const snapshot = POSITIONAL_CV_SNAPSHOT as Readonly<Record<string, number>>;
  const matchesSpec = keys.every((k) => positionalCv[k] === spec[k]);
  if (matchesSpec) return "spec-posted";
  const matchesMeasured = keys.every((k) => positionalCv[k] === snapshot[k]);
  return matchesMeasured ? "measured" : "caller-supplied";
}
