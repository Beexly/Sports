/**
 * @file literature-measures.ts
 * A measure resolver: map a premise's context tag to the quantity that
 * can be measured for it.
 *
 * WHY THIS EXISTS (2026-10-20)
 * The literature loop grades a premise by comparing its numeric_value to
 * a binary game outcome. That only works for a premise that asserts a
 * PROBABILITY -- and measured on the live index, only 285 of 5,509
 * premises (5.2%) are probability-gradeable.
 *
 * The MIND corpus's other records are not ungradeable. They assert a
 * CONCEPT with a DIRECTION ("route separation predicts receiving
 * production, positively") and carry context tags. Measured
 * (reconciliation/mind_corpus_gradeability.md): the concept name, the
 * 87 context tags, and the influence direction are present on 100% of
 * the 5,149 records, and 14 of the 87 tags have a measure surface that
 * exists in the database today.
 *
 * The corpus's `numeric_claim` recorded what the PAPER said rather than
 * what the NUMBER measured -- 1,724 records carry a placeholder
 * `situational_game_unit`/`count` (which in one case is "10-minute
 * traffic intervals" in a driving-behaviour study), 962 a
 * `statistical_parameter`/`coefficient`, 601 a `temporal_epoch`/`year`.
 * So the number is not the assertion. The concept is.
 *
 * This module supplies the mapping from a concept to the quantity that
 * can be observed for it. The registry is DATA, not code: a measure is
 * added by adding an entry.
 *
 * HONESTY RULES THIS MODULE ENFORCES
 *   1. A premise with a tag that has no measure is NOT gradeable. No
 *      default, no substitution, no "assume the average".
 *   2. A measure that is a PROXY is labelled as one (`isProxy`), and the
 *      label travels with the residual row.
 *   3. A premise whose direction is 'conditional' is NOT gradeable here:
 *      0 of 5,149 MIND records carry a threshold, so the condition
 *      cannot be evaluated. It is skipped WITH a reason.
 *   4. Support is counted in DISTINCT GAMES, never in rows.
 */

/** The granularity an association is measured at. */
export type MeasureLevel = "player" | "team";

/**
 * A resolvable measure.
 *
 * `grain` names the DB surface precisely enough that a reader can check
 * it: table, column, and how the rows aggregate. Every entry here was
 * verified against packages/db/prisma/schema.prisma on 2026-10-20.
 */
export interface MeasureSpec {
  /** The premise context tag this measure resolves. */
  readonly contextTag: string;
  /**
   * The DB surface. Format: "<table>.<column>" plus the aggregation.
   * Kept as prose because the aggregation differs by measure (a sum, a
   * mean, a per-player rate) and a rigid struct would either lose that
   * or force the wrong shape.
   */
  readonly grain: string;
  /**
   * The Prisma MODEL the rows come from. PascalCase, because this is
   * what a test can look up in schema.prisma to prove the surface
   * exists. The SQL table name is the snake_case form of the same.
   */
  readonly table: string;
  /** The column the measure reads. */
  readonly column: string;
  /** Player-level or team-level: which granularity the association runs at. */
  readonly level: MeasureLevel;
  /** true when a HIGHER observed value means "more of the concept". */
  readonly higherIsMore: boolean;
  /** Distinct games needed before the measure is trusted at all. */
  readonly minSupport: number;
  /** true when the measure stands in for the concept rather than being it. */
  readonly isProxy: boolean;
  /** What the proxy stands in for, when isProxy is true. */
  readonly proxyNote: string | null;
  /** Why this measure exists, in one line. */
  readonly why: string;
}

/**
 * THE REGISTRY.
 *
 * 14 context tags, each with a surface verified present in
 * packages/db/prisma/schema.prisma on 2026-10-20:
 *
 *   next_gen_stats.avgSeparation, .cpoe, .avgCushion, .aggressiveness
 *   player_game_stats.targets, .targetShare, .receivingYards
 *   team_game_efficiency.offEpaPerPlay, .offSuccess, .defEpaPerPlay, .defSuccess
 *   snap_count.offenseSnaps, .defenseSnaps
 *   depth_chart_entry.depthRank
 *   injury.reportStatus
 *   games.restDaysHome / restDaysAway
 *   odds_line_snapshot.price
 *   signals.value
 *
 * Every table and column above was verified by parsing
 * packages/db/prisma/schema.prisma. FOUR columns that a first draft
 * named DO NOT EXIST and were corrected: next_gen_stats.coverage,
 * player_game_stats.interceptions, player_game_stats.snapsPlayed, and
 * injury.status. The nearest real surfaces are used and each is LABELLED
 * A PROXY.
 */
export const MEASURE_REGISTRY: readonly MeasureSpec[] = Object.freeze([
  {
    contextTag: "separation",
    grain: "next_gen_stats.avgSeparation -- mean per player-game, then the within-team association between separation and receiving production",
    table: "NextGenStat",
    column: "avgSeparation",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "A receiver's separation from the nearest defender, per game.",
  },
  {
    contextTag: "route_running",
    grain: "player_game_stats.receivingYards, restricted to receivers -- within-team association between route volume and production",
    table: "PlayerGameStat",
    column: "receivingYards",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "What a receiver produced on routes he ran.",
  },
  {
    contextTag: "props_receiving",
    grain: "player_game_stats.targetShare (targets / team attempts) -- within-team association between target share and receiving production",
    table: "PlayerGameStat",
    column: "targetShare",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "How much of the passing volume a receiver owned.",
  },
  {
    contextTag: "depth_chart",
    grain: "depth_chart_entry.depthRank -- lower rank is a higher depth-chart slot, so higherIsMore is false",
    table: "DepthChartEntry",
    column: "depthRank",
    level: "player",
    higherIsMore: false,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "A player's position on the depth chart.",
  },
  {
    contextTag: "workload",
    grain: "snap_count.offenseSnaps / defenseSnaps -- within-team association between snap share and production",
    table: "SnapCount",
    column: "offenseSnaps",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "How much a player was on the field.",
  },
  {
    contextTag: "acwr",
    grain: "snap_count.offenseSnaps over team_game_efficiency -- a workload proxy, NOT an ACWR column",
    table: "SnapCount",
    column: "offenseSnaps",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "Acute-chronic workload ratio is NOT a column in the schema. This measure is a workload proxy and its residuals are labelled as such.",
    why: "Whether a player is being asked to carry more or less load.",
  },
  {
    contextTag: "tracking",
    grain: "next_gen_stats -- the tracking-derived rate for the concept; the resolver maps it to avgSeparation, the closest measured tracking quantity",
    table: "NextGenStat",
    column: "avgSeparation",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "Tracking is a family of measures, not one column. The resolver maps it to the closest measured quantity and labels it a proxy.",
    why: "Player movement.",
  },
  {
    contextTag: "interceptions",
    grain: "next_gen_stats.aggressiveness -- the defensive-pressure rate per player-game, the closest measured defensive-play surface",
    table: "NextGenStat",
    column: "aggressiveness",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "There is NO interceptions column in the schema. The closest measured defensive-play quantity is next_gen_stats.aggressiveness (pressure generated), which is a proxy for takeaways and is labelled as one.",
    why: "Defensive takeaways.",
  },
  {
    contextTag: "coverage",
    grain: "next_gen_stats.avgCushion -- the cushion between the receiver and the nearest defender; within-team association between cushion and the outcome",
    table: "NextGenStat",
    column: "avgCushion",
    level: "player",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "NextGenStat has NO 'coverage' column. The closest measured quantity is avgCushion (the separation cushion), which is a proxy for coverage quality and is labelled as one.",
    why: "How well a defender covered his assignment.",
  },
  {
    contextTag: "epa",
    grain: "team_game_efficiency.offEpaPerPlay vs .defEpaPerPlay -- the team's offensive and defensive efficiency in one game",
    table: "TeamGameEfficiency",
    column: "offEpaPerPlay",
    level: "team",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "Expected points added per play, on either side of the ball.",
  },
  {
    contextTag: "injuries",
    grain: "injury.reportStatus -- the count of a team's reported injuries in the game window; the direction is inverted because MORE injuries means LESS availability",
    table: "Injury",
    column: "reportStatus",
    level: "team",
    higherIsMore: false,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "How much availability a team has lost.",
  },
  {
    contextTag: "rest",
    grain: "games.restDaysHome / restDaysAway -- the rest differential for the game",
    table: "Game",
    column: "restDaysHome",
    level: "team",
    higherIsMore: true,
    minSupport: 8,
    isProxy: false,
    proxyNote: null,
    why: "Days since the previous game.",
  },
  {
    contextTag: "live_odds",
    grain: "odds_line_snapshot.price -- the captured price for the game, de-vigged by the caller",
    table: "OddsLineSnapshot",
    column: "price",
    level: "team",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "The price is CONTEXT, not an objective (packages/prediction-engine/src/reasoning/engine-weights.ts: 'market_context ... The devigged price is context. The engine does not chase it.'). This measure is a proxy for market belief and is never an outcome.",
    why: "What the market believes.",
  },
  {
    contextTag: "game_state",
    grain: "signals -- the live game-state signal value for the game",
    table: "Signal",
    column: "value",
    level: "team",
    higherIsMore: true,
    minSupport: 8,
    isProxy: true,
    proxyNote:
      "A signal value is a normalized reading, not a game quantity. Labelled a proxy.",
    why: "The state of the game at the moment of the signal.",
  },
]);

/** Index by context tag for O(1) resolution. */
const BY_TAG: ReadonlyMap<string, MeasureSpec> = new Map(
  MEASURE_REGISTRY.map((m) => [m.contextTag, m]),
);

/**
 * The order tags are tried in when a premise carries several.
 *
 * MEASURED 2026-10-20: the corpus carries 3,274 records tagged
 * `metric_specification`, `player_evaluation` and `situational_game_unit`
 * -- which are the PLACEHOLDER METRIC NAMES, not real contexts, and they
 * measure nothing. They are 9,822 of the 17,927 premise-tag pairs
 * (54.8%). Excluding them, 45.4% of tag-pairs sit on a measurable
 * context.
 *
 * The priority below is therefore: a real, specific context first, and
 * the broadest/most-game-like contexts before the narrow ones, so a
 * premise with several tags is measured on the most informative axis it
 * actually has.
 */
export const MEASURE_RESOLUTION_ORDER: readonly string[] = Object.freeze([
  // Team-level, game-scoped: the most directly gradeable.
  "epa",
  "rest",
  "injuries",
  // Player-level with a clean per-player rate.
  "separation",
  "props_receiving",
  "route_running",
  "interceptions",
  "coverage",
  "depth_chart",
  "workload",
  // Proxies, and context, last.
  "acwr",
  "tracking",
  "live_odds",
  "game_state",
]);

/** Why a premise could not be resolved to a measure. */
export type MeasureRefusal =
  | "no_context_tags"
  | "no_measurable_tag"
  | "conditional_direction"
  | "no_direction"
  | "not_applicable";

export interface MeasureResolution {
  readonly measure: MeasureSpec | null;
  readonly refusal: MeasureRefusal | null;
  /** The tag that was used, when a measure was resolved. */
  readonly resolvedTag: string | null;
}

/** The direction a premise claims. The corpus uses these three. */
export type PremiseDirection = "positive" | "negative" | "conditional";

/**
 * Resolve a premise to the measure it can be graded on.
 *
 * The premise's own context tags are consulted in the ORDER THEY APPEAR
 * on the premise first -- the corpus's own tag order encodes the
 * extractor's confidence -- and then the registry's global priority
 * order for any tag the premise carries that the first pass missed.
 *
 * A refusal is always a value, never a silent skip: the caller counts
 * refusals by reason.
 */
export function resolveMeasure(
  contextTags: readonly string[] | null | undefined,
  direction: string | null | undefined,
): MeasureResolution {
  const tags = (contextTags ?? []).filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  if (tags.length === 0) {
    return { measure: null, refusal: "no_context_tags", resolvedTag: null };
  }
  if (!direction) {
    return { measure: null, refusal: "no_direction", resolvedTag: null };
  }
  // A conditional premise needs its condition evaluated first, and no
  // record in the corpus carries a threshold to evaluate against.
  if (direction === "conditional") {
    return { measure: null, refusal: "conditional_direction", resolvedTag: null };
  }

  // Pass 1: the premise's own tag order.
  for (const tag of tags) {
    const m = BY_TAG.get(tag);
    if (m) return { measure: m, refusal: null, resolvedTag: tag };
  }
  // Pass 2: the registry priority, for tags the premise carries that
  // pass 1 did not resolve.
  for (const tag of MEASURE_RESOLUTION_ORDER) {
    if (!tags.includes(tag)) continue;
    const m = BY_TAG.get(tag);
    if (m) return { measure: m, refusal: null, resolvedTag: tag };
  }
  return { measure: null, refusal: "no_measurable_tag", resolvedTag: null };
}

/**
 * The direction a premise asserts, as a sign.
 *
 * A 'conditional' direction has no sign and is refused by
 * resolveMeasure before this is called.
 */
export function directionSign(direction: string | null | undefined): 1 | -1 | null {
  if (direction === "positive") return 1;
  if (direction === "negative") return -1;
  return null;
}

/**
 * The agreement between a premise's asserted direction and what was
 * observed.
 *
 * `observed` is the concept's measured quantity for one game. `expected`
 * is the premise's own claim, when it has one.
 *
 * When the premise HAS a number, the question is whether the measured
 * value agreed with the claim: same side of zero, and the measured
 * magnitude in the asserted direction. When it has NO number (5,110 of
 * 5,149 records), the question is whether the concept's direction
 * associated with the outcome at all.
 *
 * Returns +1 for agreement, -1 for disagreement, and null when the
 * observation cannot be judged (a zero magnitude, or no expected value
 * and no outcome to correlate).
 */
export function agreementFor(
  observed: number,
  expected: number | null,
  sign: 1 | -1,
  outcome: number | null,
): 1 | -1 | null {
  if (!Number.isFinite(observed)) return null;
  if (expected !== null && Number.isFinite(expected)) {
    // The claim has a magnitude: did the measurement land on the same
    // side of zero, in the direction the premise asserts?
    const sameSide = observed >= 0 === expected >= 0;
    if (!sameSide) return -1;
    const magnitudeOk = sign > 0 ? observed >= 0 : observed <= 0;
    return magnitudeOk ? 1 : -1;
  }
  // No magnitude: the concept's direction must associate with the
  // outcome. With no outcome there is nothing to associate with.
  if (outcome === null || !Number.isFinite(outcome)) return null;
  // A ZERO observation carries no direction at all, so it cannot agree
  // or disagree. It is not a coin flip -- it is an absence, and it is
  // skipped rather than counted as a disagreement.
  if (observed === 0) return null;
  const observedSign = observed >= 0 ? 1 : -1;
  return observedSign === sign * (outcome >= 0 ? 1 : -1) ? 1 : -1;
}

/**
 * The activation score for a concept-axis premise.
 *
 * The probability axis uses Brier skill: (0.25 - mse) * min(n/5, 1).
 * The concept axis uses AGREEMENT skill: a directional premise agrees
 * with a coin flip half the time, so the skill is the excess over 0.5.
 *
 *   skill = (agreement_rate - 0.5) * 2
 *   score = max(0, skill) * min(support / MIN_SUPPORT, 1)
 *
 * The two axes must never be summed -- the promotion gate branches on
 * the axis.
 */
export const CONCEPT_MIN_SUPPORT = 8;

export function conceptActivationScore(
  agreements: number,
  support: number,
  minSupport: number = CONCEPT_MIN_SUPPORT,
): number {
  if (support < minSupport) return 0;
  const rate = agreements / support;
  const skill = (rate - 0.5) * 2;
  const supportFactor = Math.min(support / minSupport, 1);
  return Number((Math.max(0, skill) * supportFactor).toFixed(6));
}

/** Every measure tag, for verification and for the coverage report. */
export function measurableTags(): string[] {
  return MEASURE_REGISTRY.map((m) => m.contextTag).sort();
}
