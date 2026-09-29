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

/**
 * THE BAND: two labeled intervals, never one unlabelled band.
 *
 * A coverage label is a PROMISE about how often a realized season total lands
 * inside the band. It is a claim about this model on this signal, so it has to
 * be measured, not assumed from the normal distribution. NFL weekly scoring is
 * far heavier-tailed than Gaussian, and a CV-based band is a ratio, so the
 * textbook z values are simply wrong here.
 *
 * MEASURED 2026-09-28. Walk-forward: fit on seasons 2021-2024 (weeks 1-3, the
 * live shape — 2026 has 3 weeks), project the 15 remaining games, score against
 * 2025 weeks 4-18. n=155 players. `buildVarianceProjections` semantics exactly,
 * including EB shrinkage of the CV toward the positional prior. See
 * `docs/fantasy/research/2026-09-28/two-labeled-bands.md` for the run.
 *
 *   coverage   z      mean width      measured coverage at that z
 *   68%        0.806  +/-62%          68.0%
 *   90%        1.113  +/-86%          90.0%
 *
 * WHY NOT THE ORIGINAL z=0.62 / z=1.28. Those pairs do not cohere: one model
 * has ONE mean CV (0.7707), and the two claimed widths imply different ones.
 * 51%/0.62 = 0.8226 and 78%/1.28 = 0.6094, a 1.35x contradiction. Measured on
 * the shipped model, z=0.62 covers 53.6% (not 68%) and z=1.28 covers 95.5%
 * (not 90%). Shipping a band labelled "68%" that contains 54% of outcomes is
 * the exact dishonesty the coverage label exists to prevent, so the LABEL is
 * kept and the z is measured to match it.
 */
export interface ProjectionBand {
  readonly coverage: number;
  /** The measured z for that coverage. Named, because an unnamed z drifts. */
  readonly z: number;
}

/**
 * The two shipped intervals, in ascending coverage. The coverage number is the
 * claim; `z` is the measured multiplier that makes the claim true.
 */
export const PROJECTION_BANDS: readonly ProjectionBand[] = Object.freeze([
  Object.freeze({ coverage: 0.68, z: 0.806 }),
  Object.freeze({ coverage: 0.9, z: 1.113 }),
]);

/** The default interval. The tighter one, deliberately. */
export const DEFAULT_BAND_COVERAGE = 0.68;

export function bandFor(coverage: number): ProjectionBand {
  const hit = PROJECTION_BANDS.find((b) => Math.abs(b.coverage - coverage) < 1e-9);
  if (!hit) {
    throw new Error(
      `unknown band coverage ${coverage}. Shipped coverages: ` +
        PROJECTION_BANDS.map((b) => b.coverage).join(", "),
    );
  }
  return hit;
}

/**
 * POSITIONS WHOSE PER-PLAYER BAND IS NOT SUPPORTED BY THIS SIGNAL.
 *
 * QB is here because the measured correlation between a player's predicted
 * per-game SD and his realized per-game SD is ~0.06-0.39 depending on the
 * training window, against +0.49-0.63 for RB/WR. A quarterback's band is
 * therefore mostly the positional prior restated: the model knows the average
 * QB is volatile and cannot reliably tell this one from that one.
 *
 * NOTE ON THE R VALUE. The figure cited in the spec (+0.06) is the WORST
 * window measured, not the pooled one. Re-measured on the shipped
 * configuration at a full-season fit, QB r = +0.39 — the LOWEST of the four
 * positions, which preserves the decision but not the number. RB/WR/TE stay
 * per-player. Suppression is a conservative call: shipping a prior as a
 * player's own uncertainty is the failure mode, and being wrong about WHICH
 * position is weakest is far cheaper than publishing a fabricated band.
 */
export const BAND_SUPPRESSED_POSITIONS: ReadonlySet<ModelPosition> = new Set<ModelPosition>(["QB"]);

/** The label a suppressed band carries. Never shown without this string. */
export const POSITIONAL_BASELINE_LABEL =
  "positional baseline — per-player band not supported at this signal";

export type BandKind = "per-player" | "positional-baseline";

export interface ProjectionInterval {
  /** proj*(1 - z*cv), clamped at zero. */
  readonly floor: number;
  /** proj*(1 + z*cv). */
  readonly ceiling: number;
  /** The coverage this interval actually claims. */
  readonly coverage: number;
  readonly z: number;
  /**
   * "per-player" when the band is this player's own measured dispersion.
   * "positional-baseline" when the position has no per-player band, and these
   * numbers are the positional prior. A caller that renders a band without
   * reading this has mislabeled a prior as a player's uncertainty.
   */
  readonly kind: BandKind;
  /** REQUIRED when kind is "positional-baseline". Absent otherwise. */
  readonly label?: string;
}

/**
 * Build the interval for one row at one coverage. Pure — takes the row and a
 * positional CV, returns the interval with its label attached. Callers cannot
 * receive a suppressed band's numbers without also receiving the string that
 * says what they are, because the two are constructed together here.
 */
export function projectionInterval(
  row: Pick<ProjectionRow, "proj" | "cvPlayer" | "position">,
  coverage: number,
): ProjectionInterval {
  const band = bandFor(coverage);
  if (BAND_SUPPRESSED_POSITIONS.has(row.position)) {
    return {
      floor: Math.max(0, row.proj * (1 - band.z * row.cvPlayer)),
      ceiling: row.proj * (1 + band.z * row.cvPlayer),
      coverage: band.coverage,
      z: band.z,
      kind: "positional-baseline",
      label: POSITIONAL_BASELINE_LABEL,
    };
  }
  return {
    floor: Math.max(0, row.proj * (1 - band.z * row.cvPlayer)),
    ceiling: row.proj * (1 + band.z * row.cvPlayer),
    coverage: band.coverage,
    z: band.z,
    kind: "per-player",
  };
}

/**
 * THE HONESTY RULE, enforced in the type system.
 *
 * `canPublishProjections: false` belongs on the PROCESS GRADE and it stays
 * there. The grade is EPA + target share + WOPR: context about how a player
 * is playing, not a forecast of what he will score. Nothing in this module
 * reads it, and this type exists so a future edit that tries to mark a grade
 * as publishable fails to compile rather than shipping a relabel.
 */
export type ProcessGradeIsNeverPublishable = { readonly canPublishProjections: false };

/** The four fantasy positions this model covers. The process grade calls this
 * `ModelPosition` and lives in apps/web, so the union is declared here rather
 * than imported across the package boundary. */
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
  /**
   * The default interval, flattened for the existing `Player` shape. Its
   * coverage is `DEFAULT_BAND_COVERAGE`; the full labeled interval is on
   * `intervals`. Kept so no caller has to be rewritten to adopt the band, and
   * kept honest by the fact that its label is one property access away.
   */
  readonly floor: number;
  readonly ceiling: number;
  /** BOTH labeled intervals. A surface must pick one and show its coverage. */
  readonly intervals: readonly ProjectionInterval[];
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

    // Build BOTH labeled intervals from the same shrunk CV, then flatten the
    // default one onto floor/ceiling. Constructing the intervals first is what
    // guarantees the flattened pair is byte-identical to the 68% interval a
    // surface would otherwise pick — the two cannot drift.
    const intervals = PROJECTION_BANDS.map((b) =>
      projectionInterval({ proj, cvPlayer, position }, b.coverage),
    );
    const primary = intervals[0];
    if (primary === undefined) continue; // PROJECTION_BANDS is non-empty by construction

    out.push({
      playerId,
      position,
      proj,
      floor: primary.floor,
      ceiling: primary.ceiling,
      intervals,
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
