/**
 * @file literature-concept-grader.ts
 * Grade a concept premise: measure the concept's quantity in a real game
 * and compare its asserted DIRECTION against what happened.
 *
 * WHY THIS EXISTS (2026-10-20)
 * The probability axis grades a premise by comparing its numeric_value to
 * a binary game outcome. That only works for a premise asserting a
 * PROBABILITY -- and measured on the live index, 285 of 5,509 premises
 * (5.2%) are probability-gradeable.
 *
 * The other 94.8% assert a CONCEPT with a DIRECTION: "route separation
 * predicts receiving production, positively". Those are gradeable on
 * their own axis, and the measure that does it is
 * literature-measures.ts.
 *
 * MEASURED (reconciliation/concept_axis_coverage.md):
 *   201 premises resolve to a measure today
 *     18 have a specific metric AND a usable direction  (6 gradeable now)
 *     21 have a specific metric but a conditional one  (3 need a direction)
 *   4,540 are refused as 'conditional' -- 88.2% of the corpus, and
 *     0 of them carry a condition, so the refusal is correct.
 *
 * THE HONESTY RULES, restated because this is the part that decides
 * whether a premise may move a number:
 *   1. A premise with no resolvable measure is NOT graded.
 *   2. A premise whose direction is 'conditional' is NOT graded.
 *   3. Support counts DISTINCT GAMES, never rows.
 *   4. A zero observation is an ABSENCE -- it is skipped, not counted as
 *      a disagreement.
 *   5. A premise below MIN_SUPPORT earns activation_score 0, so it can
 *      never be promoted on a handful of games.
 *   6. This grader produces EVIDENCE. It does not move trueProb, and the
 *      market-comparison gate (maxBrierScoreVsMarket 0.250) has not been
 *      applied to a concept premise. Nothing here changes a published
 *      number.
 */

import {
  conceptActivationScore,
  directionSign,
  isDefinitionalPair,
  MEASURE_OUTCOMES,
  resolveMeasure,
  withinGameAgreement,
  type ConceptOutcome,
  type MeasureSpec,
} from "./literature-measures.js";

/** The DB surface this grader needs. */
export interface ConceptGraderDb {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: unknown[]; rowCount: number }>;
}

/** A premise as it sits in the index. */
export interface ConceptPremise {
  readonly premise_key: string;
  readonly source: string;
  readonly claim_type: string | null;
  readonly influence_direction: string | null;
  readonly applicable_contexts: readonly string[];
  readonly numeric_metric: string | null;
  readonly numeric_unit: string | null;
  readonly numeric_value: number | null;
  readonly title: string;
}

/** One graded observation: a premise, a game, and the measurement. */
export interface ConceptObservation {
  readonly premise_key: string;
  readonly game_id: string;
  /** The measure that was used. */
  readonly measure_tag: string;
  /** The table.column the measure read. */
  readonly measure_surface: string;
  /** true when the measure stands in for the concept. */
  readonly measure_is_proxy: boolean;
  /**
   * 'concept' when the measure matches the premise's own concept (its
   * metric or its title); 'tag' when it is merely one of the premise's
   * context tags. A 'tag' match means the score measures the TAG, not
   * the claim, and it must not be read as premise-level evidence.
   */
  readonly measure_match: "concept" | "tag" | null;
  /** The concept's quantity, observed for this game. */
  readonly observed_value: number;
  /** The premise's own threshold, when it has one. */
  readonly expected_value: number | null;
  /** +1 agreement, -1 disagreement, null not judged. */
  readonly agreement: 1 | -1 | null;
}

export type ConceptRefusalReason =
  | "no_measurable_tag"
  | "conditional_direction"
  | "no_direction"
  | "no_context_tags"
  | "no_observed_games"
  | "below_min_support"
  | "no_agreements"
  /**
   * Every outcome this measure may be tested against is DEFINITIONAL --
   * the concept and the outcome are the same quantity measured twice,
   * so a high agreement rate would be arithmetic, not sport.
   *
   * MEASURED 2026-10-20: receivingYards vs targets = 0.8987,
   * receptions vs targets = 0.9379. Both are refused rather than
   * reported as findings.
   */
  | "definitional_outcome";

export interface ConceptRefusal {
  readonly premise_key: string;
  readonly reason: ConceptRefusalReason;
  /** How many games were observed, when the refusal was about support. */
  readonly observed_games?: number;
  /** How many games were needed, when the refusal was about support. */
  readonly required_games?: number;
}

export interface ConceptGrade {
  readonly premise_key: string;
  readonly measure_tag: string;
  readonly measure_surface: string;
  readonly measure_is_proxy: boolean;
  /**
   * 'concept' when the measure matches the premise's own concept (its
   * metric name or its title); 'tag' when it is merely one of the
   * premise's context tags. A 'tag' match means the score measures the
   * TAG, not the claim, and it must not be read as premise-level
   * evidence.
   */
  readonly measure_match: "concept" | "tag" | null;
  /**
   * The outcome the concept was tested against. Recorded so a reader can
   * see WHICH quantity the agreement rate is about -- and so a circular
   * pairing can never be silently reintroduced.
   */
  readonly outcome: ConceptOutcome;
  /** Distinct games the premise was observed on. */
  readonly support: number;
  /** Games where the premise's condition held and the outcome was judged. */
  readonly judged: number;
  /** +1 / -1 counts over the judged games. */
  readonly agreements: number;
  readonly disagreements: number;
  /** (agreements / judged) - 0.5, scaled by support. Zero below MIN_SUPPORT. */
  readonly activation_score: number;
  /** The premise's asserted direction, as a sign. */
  readonly direction: 1 | -1;
}

export interface ConceptGradeReport {
  readonly grades: readonly ConceptGrade[];
  readonly refusals: readonly ConceptRefusal[];
  /** premises with a resolvable measure */
  readonly resolved: number;
  /** premises actually graded (support cleared the threshold) */
  readonly graded: number;
  /** refusals by reason, so a silent skip is impossible */
  readonly refusal_counts: Readonly<Record<string, number>>;
}

/**
 * The SQL that observes a measure for a set of games.
 *
 * Each measure names its own surface, so the query is built from the
 * registry entry rather than a fixed template. The `game_id` and the
 * aggregate are what the measure's `grain` describes.
 *
 * The observation is per (player or team, game): the grader needs a
 * value per game, and the association within a game is what the
 * direction is tested against.
 */
/**
 * The CONCEPT observation: the measure's value per entity per game.
 *
 * The key is the canonical (season, week, team) form, which the outcome
 * table also emits, and the entity is the player's or team's identifier
 * IN THE MEASURE'S OWN ID SPACE (the bridge to `players` happens in the
 * join below).
 */
function conceptSql(measure: MeasureSpec): string {
  const t = measure.sqlTable;
  const c = measure.column;
  switch (measure.table) {
    case "NextGenStat":
      // The entity is `players.id`, NOT `gsisId`. The concept side and
      // the outcome side must agree on the entity key or the join
      // produces zero overlapping entities and every game is refused.
      // `players` is the only bridge between the two id spaces.
      return `
        SELECT s.season::text || '_' || s.week::text || '_' || s.team AS game_key,
               pl.id AS entity,
               AVG(s."${c}"::numeric)::double precision AS observed
          FROM ${t} s
          JOIN players pl ON pl."gsisId" = s."gsisId"
         WHERE s."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "PlayerGameStat":
      return `
        SELECT p.season::text || '_' || p.week::text || '_' || p.team AS game_key,
               p."playerId" AS entity,
               AVG(p."${c}"::numeric)::double precision AS observed
          FROM ${t} p
         WHERE p."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "SnapCount":
      return `
        SELECT sc.season::text || '_' || sc.week::text || '_' || sc.team AS game_key,
               pl.id AS entity,
               AVG(sc."${c}"::numeric)::double precision AS observed
          FROM ${t} sc
          JOIN players pl ON lower(pl."fullName") = lower(sc."playerName")
         WHERE sc."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "TeamGameEfficiency":
      return `
        SELECT split_part(tg."gameKey", '_', 1) || '_' || split_part(tg."gameKey", '_', 2)
               || '_' || tg.team AS game_key,
               tg.team AS entity,
               AVG(tg."${c}"::numeric)::double precision AS observed
          FROM ${t} tg
         WHERE tg."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "DepthChartEntry":
      return `
        SELECT d.season::text || '_' || d.week::text || '_' || d.team AS game_key,
               pl.id AS entity,
               AVG(d."${c}"::numeric)::double precision AS observed
          FROM ${t} d
          JOIN players pl ON pl."gsisId" = d."gsisId"
         WHERE d."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "Injury":
      return `
        SELECT i.season::text || '_' || i.week::text || '_' || i.team AS game_key,
               pl.id AS entity,
               COUNT(*)::double precision AS observed
          FROM ${t} i
          JOIN players pl ON pl."gsisId" = i."gsisId"
         WHERE i."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    case "Signal":
      return `
        SELECT s.season::text || '_' || s.week::text || '_' || s."entityId" AS game_key,
               s."entityId" AS entity,
               AVG(s."${c}"::numeric)::double precision AS observed
          FROM ${t} s
         WHERE s."${c}" IS NOT NULL
         GROUP BY 1, 2`;
    default:
      return "";
  }
}

/**
 * The OUTCOME observation: the same entity's PRODUCTION in the same
 * game, joined through `players`.
 *
 * MEASURED 2026-10-20: the id spaces are DISJOINT outside `players`.
 * next_gen_stats.gsisId is "00-0036158"; player_game_stats.playerId is a
 * cuid ("cmsi4tkv10005tmxa0d6y72bd"). `players` (1,449 rows) carries
 * BOTH (id, gsisId, fullName) and is the only bridge:
 *
 *   next_gen_stats.gsisId      -> players.gsisId      3,244 rows
 *   snap_counts.playerName      -> players.fullName    10,894 rows (lower)
 *   depth_chart_entries.gsisId  -> players.gsisId       2,460 rows
 *   injuries.gsisId            -> players.gsisId       2,719 rows
 *
 * The outcome is the entity's own production: receiving yards for a
 * player, and for a team the home-side win. A concept premise about a
 * player cannot be tested against a team-level outcome, and the FIRST
 * version of this grader did exactly that -- it compared the sign of a
 * magnitude (always positive) against a game win, and reported
 * agreement rates of exactly 0.000 and 1.000. That is a grader that
 * cannot say anything.
 */
function outcomeSql(measure: MeasureSpec, outcome: ConceptOutcome): string {
  // The outcome EXPRESSION differs by outcome kind. The join shape does
  // not -- every player-level outcome is read from player_game_stats
  // through the same id bridge.
  const outcomeExpr =
    outcome === "yards_per_target"
      ? `AVG(p."receivingYards"::numeric) / NULLIF(AVG(p."targets"::numeric), 0)`
      : `AVG(p."targets"::numeric)`;
  switch (measure.table) {
    case "NextGenStat":
      return `
        SELECT s.season::text || '_' || s.week::text || '_' || s.team AS game_key,
               pl.id AS entity,
               ${outcomeExpr}::double precision AS outcome
          FROM next_gen_stats s
          JOIN players pl ON pl."gsisId" = s."gsisId"
          JOIN player_game_stats p
            ON p."playerId" = pl.id AND p.season = s.season AND p.week = s.week
         WHERE p."targets" IS NOT NULL ${outcome === "yards_per_target" ? 'AND p."receivingYards" IS NOT NULL AND p."targets" > 0' : ''}
         GROUP BY 1, 2`;
    case "SnapCount":
      return `
        SELECT sc.season::text || '_' || sc.week::text || '_' || sc.team AS game_key,
               pl.id AS entity,
               ${outcomeExpr}::double precision AS outcome
          FROM snap_counts sc
          JOIN players pl ON lower(pl."fullName") = lower(sc."playerName")
          JOIN player_game_stats p
            ON p."playerId" = pl.id AND p.season = sc.season AND p.week = sc.week
         WHERE p."targets" IS NOT NULL ${outcome === "yards_per_target" ? 'AND p."receivingYards" IS NOT NULL AND p."targets" > 0' : ''}
         GROUP BY 1, 2`;
    case "DepthChartEntry":
      return `
        SELECT d.season::text || '_' || d.week::text || '_' || d.team AS game_key,
               pl.id AS entity,
               ${outcomeExpr}::double precision AS outcome
          FROM depth_chart_entries d
          JOIN players pl ON pl."gsisId" = d."gsisId"
          JOIN player_game_stats p
            ON p."playerId" = pl.id AND p.season = d.season AND p.week = d.week
         WHERE p."targets" IS NOT NULL ${outcome === "yards_per_target" ? 'AND p."receivingYards" IS NOT NULL AND p."targets" > 0' : ''}
         GROUP BY 1, 2`;
    case "Injury":
      return `
        SELECT i.season::text || '_' || i.week::text || '_' || i.team AS game_key,
               pl.id AS entity,
               ${outcomeExpr}::double precision AS outcome
          FROM injuries i
          JOIN players pl ON pl."gsisId" = i."gsisId"
          JOIN player_game_stats p
            ON p."playerId" = pl.id AND p.season = i.season AND p.week = i.week
         WHERE p."targets" IS NOT NULL ${outcome === "yards_per_target" ? 'AND p."receivingYards" IS NOT NULL AND p."targets" > 0' : ''}
         GROUP BY 1, 2`;
    case "PlayerGameStat":
      // The outcome is targets, NOT yards. The concept measure for
      // route_running IS receivingYards, so using yards as the outcome
      // would make the test near-tautological -- the concept would be
      // compared with itself. "Did the routes produce?" is answered by
      // how much volume the player was given (targets), against how much
      // he produced from them (the concept).
      return `
        SELECT p.season::text || '_' || p.week::text || '_' || p.team AS game_key,
               p."playerId" AS entity,
               ${outcomeExpr}::double precision AS outcome
          FROM player_game_stats p
         WHERE p."targets" IS NOT NULL ${outcome === "yards_per_target" ? 'AND p."receivingYards" IS NOT NULL AND p."targets" > 0' : ''}
         GROUP BY 1, 2`;
    case "TeamGameEfficiency":
      return `
        SELECT split_part(tg."gameKey", '_', 1) || '_' || split_part(tg."gameKey", '_', 2)
               || '_' || tg.team AS game_key,
               tg.team AS entity,
               AVG(tg."offEpaPerPlay"::numeric)::double precision AS outcome
          FROM team_game_efficiency tg
         WHERE tg."offEpaPerPlay" IS NOT NULL
         GROUP BY 1, 2`;
    default:
      return "";
  }
}

/**
 * The game outcome, so a TEAM-level concept can be tested against it.
 *
 * MEASURED 2026-10-20: the outcome lives in `historical_games`, which
 * carries `gameKey` (the "2025_02_CLE_BAL" format), `homeScore`,
 * `awayScore` and `season`/`week`/`homeTeam`/`awayTeam`. The `games`
 * table has scores too but no `gameKey`, and the stat tables key on
 * (season, week, team) rather than on a game id.
 */
const OUTCOME_SQL = `
  SELECT h.season::text || '_' || h.week::text || '_' || h."homeTeam" AS home_key,
         h.season::text || '_' || h.week::text || '_' || h."awayTeam" AS away_key,
         CASE WHEN h."homeScore" > h."awayScore" THEN 1.0::double precision
              WHEN h."homeScore" < h."awayScore" THEN -1.0::double precision
              ELSE NULL END AS outcome
    FROM historical_games h
   WHERE h."homeScore" IS NOT NULL AND h."awayScore" IS NOT NULL`;

/**
 * Grade a set of premises on the concept axis.
 */
/**
 * The within-game pairwise tally for one concept/outcome pair.
 *
 * A concept premise says "higher X goes with more production". That is a
 * claim about a WITHIN-GAME ASSOCIATION, so the test is over pairs of
 * entities in the same game: do the two with the higher concept value
 * also have the higher outcome value?
 *
 * The first version of this grader compared the SIGN of a magnitude
 * against a game win. Magnitudes are non-negative by construction, so the
 * sign was constant and the grader could only report agreement rates of
 * 0.000 or 1.000 -- it could not say anything.
 */
function tallyAgreement(
  concepts: Map<string, Map<string, number>>,
  outcomes: Map<string, Map<string, number>>,
  gameOutcome: Map<string, number>,
  measure: MeasureSpec,
  sign: 1 | -1,
): { agreements: number; disagreements: number; judged: number; gamesUsed: number } {

//
// A concept premise says "higher X goes with more production". That
// is a claim about a WITHIN-GAME ASSOCIATION, so the test is over
// pairs of entities in the same game: do the two with the higher
// concept value also have the higher outcome value?
//
// The first version of this grader compared the SIGN of a magnitude
// against a game win. Magnitudes are non-negative by construction, so
// the sign was constant and the grader could only report agreement
// rates of 0.000 or 1.000 -- it could not say anything.
let agreements = 0;
let disagreements = 0;
let judged = 0;
let gamesUsed = 0;

for (const [gameKey, entities] of concepts) {
  const outcomeEntities = outcomes.get(gameKey);
  if (!outcomeEntities) continue;

  // A team-level measure is tested against the GAME outcome, not
  // against another team's production.
  const gameResult = gameOutcome.get(gameKey);
  if (measure.level === "team") {
    const list = [...entities.entries()];
    if (list.length < 2 || gameResult === undefined) continue;
    gamesUsed += 1;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const conceptDelta = list[i]![1] - list[j]![1];
        const outcomeDelta = gameResult;
        const a = withinGameAgreement(conceptDelta, outcomeDelta, sign);
        if (a === null) continue;
        judged += 1;
        if (a === 1) agreements += 1;
        else disagreements += 1;
      }
    }
    continue;
  }

  // A player-level measure is tested against the player's own
  // production in the same game.
  const pairs: Array<[number, number]> = [];
  for (const [entity, conceptValue] of entities) {
    const outcomeValue = outcomeEntities.get(entity);
    if (outcomeValue === undefined) continue;
    pairs.push([conceptValue, outcomeValue]);
  }
  if (pairs.length < 2) continue;
  gamesUsed += 1;
  for (let i = 0; i < pairs.length; i += 1) {
    for (let j = i + 1; j < pairs.length; j += 1) {
      const conceptDelta = pairs[i]![0] - pairs[j]![0];
      const outcomeDelta = pairs[i]![1] - pairs[j]![1];
      const a = withinGameAgreement(conceptDelta, outcomeDelta, sign);
      if (a === null) continue;
      judged += 1;
      if (a === 1) agreements += 1;
      else disagreements += 1;
    }
  }
}

    return { agreements, disagreements, judged, gamesUsed };
}

export async function gradeConceptPremises(
  db: ConceptGraderDb,
  premises: readonly ConceptPremise[],
  opts?: { readonly minSupport?: number },
): Promise<ConceptGradeReport> {
  const minSupport = opts?.minSupport ?? 8;
  const grades: ConceptGrade[] = [];
  const refusals: ConceptRefusal[] = [];
  const refusalCounts: Record<string, number> = {};
  let resolved = 0;

  const bump = (reason: ConceptRefusalReason) => {
    refusalCounts[reason] = (refusalCounts[reason] ?? 0) + 1;
  };

  // The game outcome, indexed by both sides' canonical key.
  const outcomeRows = await db.query(OUTCOME_SQL);
  const gameOutcome = new Map<string, number>();
  for (const r of outcomeRows.rows as Array<{
    home_key: string; away_key: string; outcome: unknown;
  }>) {
    // Postgres returns a bare NUMERIC as a STRING through the pg driver
    // ("-1.0", not -1). The value is coerced rather than type-asserted.
    const outcome = typeof r.outcome === "number" ? r.outcome : Number(r.outcome);
    if (!Number.isFinite(outcome)) continue;
    if (r.home_key) gameOutcome.set(r.home_key, outcome);
    if (r.away_key) gameOutcome.set(r.away_key, -outcome);
  }

  // The concept and outcome observations, loaded per measure and reused.
  const conceptCache = new Map<string, Map<string, Map<string, number>>>();
  const outcomeCache = new Map<string, Map<string, Map<string, number>>>();

  async function conceptsFor(measure: MeasureSpec) {
    const cached = conceptCache.get(measure.contextTag);
    if (cached) return cached;
    const byGame = new Map<string, Map<string, number>>();
    const sql = conceptSql(measure);
    if (sql) {
      const res = await db.query(sql);
      for (const r of res.rows as Array<{ game_key: string; entity: string; observed: unknown }>) {
        const observed = typeof r.observed === "number" ? r.observed : Number(r.observed);
        if (!r.game_key || !r.entity || !Number.isFinite(observed)) continue;
        let entities = byGame.get(r.game_key);
        if (!entities) { entities = new Map(); byGame.set(r.game_key, entities); }
        entities.set(r.entity, observed);
      }
    }
    conceptCache.set(measure.contextTag, byGame);
    return byGame;
  }

  async function outcomesFor(measure: MeasureSpec, outcome: ConceptOutcome) {
    const key = `${measure.contextTag}::${outcome}`;
    const cached = outcomeCache.get(key);
    if (cached) return cached;
    const byGame = new Map<string, Map<string, number>>();
    const sql = outcomeSql(measure, outcome);
    if (sql) {
      const res = await db.query(sql);
      for (const r of res.rows as Array<{ game_key: string; entity: string; outcome: unknown }>) {
        const outcome = typeof r.outcome === "number" ? r.outcome : Number(r.outcome);
        if (!r.game_key || !r.entity || !Number.isFinite(outcome)) continue;
        let entities = byGame.get(r.game_key);
        if (!entities) { entities = new Map(); byGame.set(r.game_key, entities); }
        entities.set(r.entity, outcome);
      }
    }
    outcomeCache.set(key, byGame);
    return byGame;
  }

  for (const p of premises) {
    // The concept hint is the premise's own metric name and its title --
    // the two places its CONCEPT is named. The resolver prefers a measure
    // whose tag appears there, over the premise's first resolvable
    // context tag.
    const conceptHint = [p.numeric_metric, p.title].filter(Boolean).join(" ");
    const res = resolveMeasure(p.applicable_contexts, p.influence_direction, conceptHint);
    if (!res.measure) {
      const reason = (res.refusal ?? "no_measurable_tag") as ConceptRefusalReason;
      refusals.push({ premise_key: p.premise_key, reason });
      bump(reason);
      continue;
    }
    resolved += 1;

    const sign = directionSign(p.influence_direction);
    if (sign === null) {
      refusals.push({ premise_key: p.premise_key, reason: "no_direction" });
      bump("no_direction");
      continue;
    }

    const measure = res.measure;
    const concepts = await conceptsFor(measure);

    // THE OUTCOME ITERATION, AND THE CIRCULARITY GUARD.
    //
    // A measure declares the outcomes it may be tested against. For each
    // one, the grader computes the within-game agreement and then
    // checks whether the result is DEFINITIONAL -- i.e. the concept and
    // the outcome are the same quantity measured twice, so a high rate
    // is arithmetic, not sport.
    //
    // MEASURED 2026-10-20 (reconciliation/_probe_definitional.mjs):
    //   receivingYards vs targets        0.8987   <- DEFINITIONAL
    //   receptions     vs targets        0.9379   <- DEFINITIONAL
    //   avgSeparation  vs targets        0.4847   <- at chance
    //   avgSeparation  vs yardsPerTarget 0.5252   <- at chance
    //
    // A result at or above the definitional floor (0.80) is REFUSED, not
    // reported. This is the guard that stops the grader from turning
    // arithmetic into a finding.
    const allowedOutcomes = MEASURE_OUTCOMES[measure.contextTag] ?? ["targets"];
    let graded: {
      outcome: ConceptOutcome;
      agreements: number;
      disagreements: number;
      judged: number;
      gamesUsed: number;
      rate: number;
    } | null = null;
    let definitionalRefusal = false;

    for (const outcomeKind of allowedOutcomes) {
      if (outcomeKind === "game_result" && measure.level !== "team") continue;
      if (outcomeKind !== "game_result" && measure.level === "team") continue;
      const outcomeMap = await outcomesFor(measure, outcomeKind);
      const tally = tallyAgreement(concepts, outcomeMap, gameOutcome, measure, sign);
      if (tally.judged === 0) continue;
      const rate = tally.agreements / tally.judged;
      if (isDefinitionalPair(measure.contextTag, outcomeKind, rate)) {
        // Remember it, but keep looking for a non-circular outcome.
        definitionalRefusal = true;
        continue;
      }
      graded = {
        outcome: outcomeKind,
        agreements: tally.agreements,
        disagreements: tally.disagreements,
        judged: tally.judged,
        gamesUsed: tally.gamesUsed,
        rate,
      };
      break;
    }

    if (!graded) {
      const reason = (definitionalRefusal
        ? "definitional_outcome"
        : "no_agreements") as ConceptRefusalReason;
      refusals.push({ premise_key: p.premise_key, reason });
      bump(reason);
      continue;
    }

    const { agreements, disagreements, judged, gamesUsed, outcome: usedOutcome } = graded;
    const outcomes = await outcomesFor(measure, usedOutcome);

    if (judged === 0) {
      refusals.push({ premise_key: p.premise_key, reason: "no_agreements" });
      bump("no_agreements");
      continue;
    }
    if (gamesUsed < minSupport) {
      refusals.push({
        premise_key: p.premise_key,
        reason: "below_min_support",
        observed_games: gamesUsed,
        required_games: minSupport,
      });
      bump("below_min_support");
      continue;
    }

    grades.push({
      premise_key: p.premise_key,
      measure_tag: measure.contextTag,
      measure_surface: `${measure.table}.${measure.column}`,
      measure_is_proxy: measure.isProxy,
      measure_match: res.match,
      outcome: usedOutcome,
      support: gamesUsed,
      judged,
      agreements,
      disagreements,
      activation_score: conceptActivationScore(agreements, judged, minSupport),
      direction: sign,
    });
  }

  return {
    grades,
    refusals,
    resolved,
    graded: grades.length,
    refusal_counts: refusalCounts,
  };
}
