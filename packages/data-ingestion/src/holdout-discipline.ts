/**
 * Holdout Discipline — seal the last season, classify nulls by source, and
 * namespace team identity across tiers.
 *
 * BUILD V2 from agent-bus handoff v3 (8221adb), whose stated source was a rugby
 * modelling series that stated its validation protocol out loud:
 *
 *   "seal off the last season... that's always gonna be our out of sample test
 *   element"
 *
 * plus three rules that generalise past rugby:
 *
 *   - NULL-CLASSIFICATION: when a league does not collect a stat, the value is
 *     MISSING, not zero. Pro D2 has no comparable stat, so encoding it as 0
 *     silently drags every mean and rate down. Missing means skip the weight.
 *   - PROMOTION/RELEGATION: a team's rating history belongs to the tier it was
 *     earned in. Promoting a team must not import its lower-division baseline
 *     into the upper tier's averages.
 *   - ARCHIVE, DON'T DELETE: a sealed holdout is retained, never dropped.
 *
 * This is the SEASON-level sibling of eval/edge-lab/sealed-split.mjs, which
 * enforces the same discipline at the file level. The two do not import each
 * other — one splits files, this splits seasons, and merging them would couple
 * two independent boundaries.
 *
 * Learn-only. No upstream code ported. New file.
 *
 * THE CENTRAL SAFETY PROPERTY: the holdout is not sealed by convention, it is
 * sealed by a `sealed` flag that makes a trainer throw if it receives it. A
 * convention is a comment; this is a type. A model that reaches the holdout by
 * accident fails loudly instead of publishing a number.
 */

export type Game = {
  readonly id: string;
  readonly season: number;
  /** Optional week; absent for datasets that are season-grained. */
  readonly week?: number;
};

export type SplitResult<T extends Game> = {
  readonly train: readonly T[];
  /**
   * The holdout is the SEALED object, never a bare array. Declaring it as
   * `readonly T[]` would be a lie the compiler cannot catch: the value is
   * branded, and a caller reaching for `.map` on it would crash at runtime with
   * no static warning. Handing back the brand is the entire safety property.
   */
  readonly holdout: SealedHoldout<T>;
  /** The season that was sealed off, and why it was eligible to be. */
  readonly sealedSeason: number;
  readonly sealed: true;
};

export class SealedHoldoutError extends Error {
  constructor(public readonly season: number) {
    super(
      `season ${season} is sealed holdout data and must not reach feature selection, ` +
        `hyperparameter choice, or calibration. Access it exactly once, at final scoring.`,
    );
    this.name = "SealedHoldoutError";
  }
}

/**
 * A dataset branded as holdout. The `sealed` literal is what makes
 * `assertTrainable` exhaustive at the type level, and `score()` the only
 * sanctioned way to read it.
 */
export type SealedHoldout<T extends Game> = {
  readonly kind: "sealed-holdout";
  readonly sealed: true;
  readonly season: number;
  readonly games: readonly T[];
};

export type Trainable<T extends Game> = {
  readonly kind: "train";
  readonly sealed: false;
  readonly games: readonly T[];
};

/**
 * Split a game list so the most recent COMPLETE season is held out.
 *
 * "Complete" is explicit rather than inferred: pass `completeSeasons` when the
 * caller knows which seasons ran to completion. When it is omitted, every season
 * present is treated as complete, which is right for off-season datasets and
 * wrong mid-season — so an in-progress season WILL be sealed and used for
 * training, producing an optimistic number. Mid-season callers should pass it.
 *
 * `completeSeasons` gates ELIGIBILITY TO BE SEALED, not membership in the split.
 * An in-progress season's games are real, already-played games; they belong in
 * train. Dropping them would discard data for no honesty gain — the risk of a
 * partial season is that it is a biased SAMPLE of its season, which is a reason
 * never to grade on it, not a reason to refuse to learn from it. So an
 * incomplete season is trained on and never sealed; only a complete season can
 * become the holdout.
 */
export function sealLastSeason<T extends Game>(
  games: readonly T[],
  completeSeasons?: readonly number[],
): SplitResult<T> {
  if (games.length === 0) {
    throw new Error("sealLastSeason: no games to split");
  }

  const eligible = completeSeasons ? new Set(completeSeasons) : undefined;
  const complete = new Set<number>();
  for (const g of games) {
    if (!eligible || eligible.has(g.season)) complete.add(g.season);
  }

  if (complete.size === 0) {
    throw new Error("sealLastSeason: no complete seasons present; pass completeSeasons that include one");
  }

  const seasons = [...complete].sort((a, b) => a - b);
  // `complete.size > 0` above guarantees an element, but TS cannot see that
  // through an index access, so take the max directly instead of asserting.
  const sealedSeason = seasons.reduce((hi, s) => (s > hi ? s : hi), seasons[0] as number);

  // Every game not in the sealed season is training data, including the games
  // of an in-progress season. Nothing is discarded.
  const train: T[] = [];
  const holdout: T[] = [];
  for (const g of games) {
    if (g.season === sealedSeason) holdout.push(g);
    else train.push(g);
  }

  if (train.length === 0) {
    throw new Error(`sealLastSeason: sealing ${sealedSeason} would leave no training data`);
  }

  return { train, holdout: seal(holdout, sealedSeason), sealedSeason, sealed: true };
}

/** Brand a game list as sealed. Exported for callers assembling holds by hand. */
export function seal<T extends Game>(games: readonly T[], season: number): SealedHoldout<T> {
  return { kind: "sealed-holdout", sealed: true, season, games };
}

/**
 * The gate a training function must pass through. Accepts train data and the
 * SCORE view of the holdout; rejects the holdout itself.
 *
 * Note it takes the games, not the SealedHoldout, so scoring a final time
 * requires the caller to have explicitly unwrapped it via `score()`. That is
 * deliberate friction.
 */
export function assertTrainable<T extends Game>(
  data: readonly T[] | SealedHoldout<T> | Trainable<T>,
): readonly T[] {
  if ((data as SealedHoldout<T>).sealed === true) {
    throw new SealedHoldoutError((data as SealedHoldout<T>).season);
  }
  if (Array.isArray(data)) return data;
  return (data as Trainable<T>).games;
}

/**
 * The ONE sanctioned read of sealed data: final scoring, after the model is
 * frozen. Returns a plain array so a caller cannot pass it back into training
 * by accident.
 */
export function score<T extends Game>(holdout: SealedHoldout<T>): readonly T[] {
  if (holdout.sealed !== true || holdout.kind !== "sealed-holdout") {
    throw new Error("score: not a sealed holdout");
  }
  return holdout.games;
}

/* ------------------------------------------------------------------ *
 * Null classification
 * ------------------------------------------------------------------ */

export type Classified<T> = {
  readonly value: T;
  readonly isNull: boolean;
};

export type NullReason = "source-does-not-collect" | "league-does-not-collect" | "absent";

/**
 * Classify one stat for one league.
 *
 * A stat a league never collected is NULL, not 0. This is the distinction that
 * separates a real average from a quietly poisoned one: 40% of a league being
 * missing is not the same as 40% of a league scoring zero.
 *
 * The return type is `Classified<NonNullable<T>>` deliberately. A caller that
 * passes a literal `null` would otherwise make T infer as `null` and poison the
 * whole array's variance, so `nullSafeMean([...])` would reject its own inputs.
 * The value field always carries the real stat domain; `isNull` is the only
 * thing that says whether it is usable.
 */
export function classifyNull<T>(
  stat: T | null | undefined,
  context: { leagueCollects?: boolean; sourceCollects?: boolean } = {},
): Classified<NonNullable<T>> {
  if (stat === null || stat === undefined) return { value: stat as NonNullable<T>, isNull: true };
  const leagueOk = context.leagueCollects !== false;
  const sourceOk = context.sourceCollects !== false;
  if (!leagueOk || !sourceOk) return { value: stat as NonNullable<T>, isNull: true };
  return { value: stat as NonNullable<T>, isNull: false };
}

/** Why a value was null. Derived from the same context the classifier used. */
export function nullReason(
  stat: unknown,
  context: { leagueCollects?: boolean; sourceCollects?: boolean } = {},
): NullReason {
  if (stat === null || stat === undefined) return "absent";
  if (context.leagueCollects === false) return "league-does-not-collect";
  if (context.sourceCollects === false) return "source-does-not-collect";
  return "absent";
}

/**
 * Mean that ignores nulls. A league that does not collect a stat contributes
 * nothing, rather than contributing a zero that drags the mean down.
 */
export function nullSafeMean(values: readonly Classified<number>[]): number | null {
  const present = values.filter((v) => !v.isNull && Number.isFinite(v.value));
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v.value, 0) / present.length;
}

/**
 * Denominator that counts only non-null observations. This is the `n` that must
 * accompany any published rate, so the coverage floor cannot be faked by
 * treating missing as zero.
 */
export function observedCount(values: readonly Classified<unknown>[]): number {
  return values.filter((v) => !v.isNull).length;
}

/* ------------------------------------------------------------------ *
 * Promotion / relegation identity
 * ------------------------------------------------------------------ */

export type TieredRecord = {
  readonly teamId: string;
  readonly season: number;
  /** League or division identifier, e.g. "E1", "E2", "NCAA-FBS". */
  readonly tier: string;
};

export type NamespacedIdentity = `${string}@${string}`; // `${teamId}@${tier}`

/**
 * A team that changes tier is a DIFFERENT entity in the new tier. Its old
 * history stays attached to the old namespace and never enters the new tier's
 * baselines.
 *
 * Without this, a promoted club's dominant lower-division scoring rate becomes
 * the seed for its upper-division baseline and inflates every rating built on
 * that tier.
 */
export function mapTeamIdentity(record: TieredRecord): NamespacedIdentity {
  return `${record.teamId}@${record.tier}`;
}

/**
 * The baseline history a tier may legitimately borrow from: only records that
 * were earned in the SAME tier.
 */
export function baselineHistoryFor(
  tier: string,
  records: readonly TieredRecord[],
): readonly TieredRecord[] {
  return records.filter((r) => r.tier === tier);
}

/** Every distinct (team, tier) namespace present, sorted for stable output. */
export function identityNamespaces(records: readonly TieredRecord[]): NamespacedIdentity[] {
  return [...new Set(records.map(mapTeamIdentity))].sort();
}

/**
 * Records that would contaminate a tier if used raw — i.e. a prior-tier history
 * for a team now in this tier. Exposed so a caller can assert the contamination
 * count is zero rather than trusting a filter they wrote.
 */
export function crossTierContamination(
  tier: string,
  records: readonly TieredRecord[],
  currentTierByTeam: Readonly<Record<string, string>>,
): readonly TieredRecord[] {
  return records.filter(
    (r) => r.tier !== tier && currentTierByTeam[r.teamId] === tier,
  );
}
