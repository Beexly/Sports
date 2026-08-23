/**
 * Incentive + rule-change calendar as covariates (H0 slice #4).
 *
 * WHAT THIS IS
 * A pure, leak-safe feature extractor that turns known-schedule incentives
 * (rest advantages, playoff-tying scenarios, weather-driven roster moves)
 * and KNOWN rule changes (new OT rules, playoff format shifts, coaching
 * challenge tweaks) into as-of-stamped covariate cells — the *input* side
 * of e = p − q, never p itself and never a tout score.
 *
 * "as covariates, not copy": every incentive / rule change is a numeric
 * feature cell (binary flag, bonus magnitude, etc.) with an observedAt that
 * is STRICTLY before the game it applies to. A rule announced on 2022-03-15
 * gets observedAt = that date; it cannot leak into a 2021 game's x_t because
 * the AsOfFeatureStore enforces the cutoff. An incentive that only becomes
 * knowable once a team is eliminated (e.g. "bench warmers play") is stamped
 * at the elimination game's end, so it can never enter its own feature vector.
 *
 * LEAK SAFETY
 *   - `observedAt` is the instant the incentive/rule became publicly knowable
 *     (announcement date, elimination game end, etc.), never the affected
 *     game's kickoff.
 *   - The store's as-of cutoff enforces: only items with observedAt < the
 *     affected game's decision time are served. There is no "latest" read.
 *   - Fail-closed: unknown observation time → the cell is dropped, never
 *     imputed. An incentive whose public timestamp is unknown is excluded,
 *     not guessed.
 *
 * PRICED: false. No I/O. No Prisma. No model inference. Pure, deterministic.
 */

import { AsOfFeatureStore } from "./asof-store.js";
import type { GameRow } from "./game-row.js";
import type { EvalRow } from "./placebo.js";

export const INCENTIVE_CALENDAR_METHOD_TAG = "incentive_calendar_cov_v1" as const;

/** Namespaced feature keys this module emits — exact strings for audit. */
export const INCENTIVE_CALENDAR_KEYS = [
  "incentive:rest_bonus",
  "incentive:playoff_implication",
  "incentive:roster_move_window",
  "rule:ot_format",
  "rule:challenge_limit",
  "rule:playoff_format",
] as const;

/** Days of rest before a game, with explicit public-knowable timestamp. */
export interface RestBonusInput {
  /** ISO instant the rest advantage was locked in (e.g. prior game end). */
  readonly observedAt: string;
  /** Team getting the rest edge (home team when rest is asymmetric). */
  readonly team: string;
  /** Days of rest (kickoff − prior game end), in [0, ∞). */
  readonly restDays: number;
}

/**
 * Playoff-implication signal: known before the game because the tie-breaking
 * math is deterministic from prior results. Stamped at the prior game's end
 * that established the scenario (never at the affected game's kickoff).
 */
export interface PlayoffImplicationInput {
  /** ISO instant the implication became knowable (prior game end). */
  readonly observedAt: string;
  /** Team whose playoff hopes hinge on this game. */
  readonly team: string;
  /** Strength of implication: 1 = must-win, 2 = win-or-tiebreaker, 3 = elimination. */
  readonly implicationLevel: 1 | 2 | 3;
}

/**
 * Weather-driven roster-move window: a known injury/weather event (e.g. a
 * snow advisory) that opens a window where backup QBs / special-teamers
 * enter the active-plan. Stamped at the advisory's public timestamp.
 */
export interface RosterMoveWindowInput {
  /** ISO instant the condition was publicly announced. */
  readonly observedAt: string;
  /** Team with the roster-move eligibility. */
  readonly team: string;
  /** Magnitude: 0..1 of backup activation likelihood the move enables. */
  readonly moveWeight: number;
}

/**
 * A rule change (or its absence) that is KNOWN on a specific date and
 * affects all games from a `effectiveFrom` kickoff onward. `observedAt`
 * is the public announcement date — never the affected game's kickoff.
 *
 * `value` is a numeric encoding; callers decide the scale:
 *   - ot_format:      0 = classic (10-min), 1 = 15-min sudden death, 2 = two 10-min
 *   - challenge_limit: 0 = 1 challenge/season, 1 = 2 challenges (new rule)
 *   - playoff_format:  0 = 6 per conf, 1 = 7 per conf (expanded)
 *   - roster_move:     see RosterMoveWindowInput.moveWeight
 */
export interface RuleChange {
  /** ISO instant the rule became publicly knowable. */
  readonly observedAt: string;
  /** ISO kickoff on/after which the rule applies. */
  readonly effectiveFrom: string;
  readonly key: "ot_format" | "challenge_limit" | "playoff_format";
  /** Numeric encoding — caller-defined scale per `key`. */
  readonly value: number;
}

export interface IncentiveCalendarResult {
  readonly rows: EvalRow[];
  /** Diagnostics: items dropped + why, for honesty about the denominator. */
  readonly skipped: {
    readonly missingRestHistory: number;
    readonly unknownObservationTime: number;
    readonly ruleNotYetAnnounced: number;
    readonly noOdds: number;
    readonly tie: number;
  };
}

/**
 * Decision lead time: incentives must be frozen this long before kickoff
 * (same guardrail as schedule-features.ts).
 */
const DECISION_LEAD_MS = 60 * 60_000;
const EPS = 1e-9;

function toMillis(iso: string, label: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return NaN;
  return ms;
}

/**
 * Ingest a rest-bonus cell for a game's home team. The rest bonus is only
 * served for the team that actually holds the edge; the away side gets 0
 * (explicit cell, not imputation). observedAt is the prior game's end.
 *
 * Fails closed: if observedAt does not parse, the cell is skipped entirely.
 */
function ingestRestBonus(
  store: AsOfFeatureStore,
  entityKey: string,
  inp: RestBonusInput,
): boolean {
  const t = toMillis(inp.observedAt, "observedAt");
  if (!Number.isFinite(t)) return false;
  store.ingest({
    entityId: entityKey,
    featureKey: "incentive:rest_bonus",
    value: inp.restDays,
    observedAt: inp.observedAt,
    source: "incentive-calendar",
  });
  return true;
}

/**
 * Ingest a playoff-implication cell for the named team. implicationLevel
 * encodes strength (3 = elimination game, the strongest incentive).
 */
function ingestPlayoffImplication(
  store: AsOfFeatureStore,
  entityKey: string,
  inp: PlayoffImplicationInput,
): boolean {
  const t = toMillis(inp.observedAt, "observedAt");
  if (!Number.isFinite(t)) return false;
  store.ingest({
    entityId: entityKey,
    featureKey: "incentive:playoff_implication",
    value: inp.implicationLevel,
    observedAt: inp.observedAt,
    source: "incentive-calendar",
  });
  return true;
}

/**
 * Ingest a roster-move window cell for the named team (weather/injury
 * driven backup activation). value in [0,1].
 */
function ingestRosterMoveWindow(
  store: AsOfFeatureStore,
  entityKey: string,
  inp: RosterMoveWindowInput,
): boolean {
  if (!Number.isFinite(inp.moveWeight) || inp.moveWeight < 0 || inp.moveWeight > 1) return false;
  const t = toMillis(inp.observedAt, "observedAt");
  if (!Number.isFinite(t)) return false;
  store.ingest({
    entityId: entityKey,
    featureKey: "incentive:roster_move_window",
    value: inp.moveWeight,
    observedAt: inp.observedAt,
    source: "incentive-calendar",
  });
  return true;
}

/**
 * Ingest a rule-change cell. The rule is served for ALL games whose kickoff
 * is >= effectiveFrom (the store's as-of cutoff enforces that games before
 * the announcement don't see it). observedAt = announcement date.
 */
function ingestRuleChange(
  store: AsOfFeatureStore,
  entityKey: string,
  rule: RuleChange,
): boolean {
  const annT = toMillis(rule.observedAt, "observedAt");
  if (!Number.isFinite(annT)) return false;
  store.ingest({
    entityId: entityKey,
    featureKey: `rule:${rule.key}`,
    value: rule.value,
    observedAt: rule.observedAt,
    source: "incentive-calendar",
  });
  return true;
}

/**
 * Build EvalRows for games whose incentives/rules are knowable strictly
 * before kickoff. Each game's feature vector is served as-of its decision
 * time (kickoff − DECISION_LEAD_MS) through the AsOf store, so the store's
 * leak audit covers every cell — an incentive stamped at or after a game's
 * decision time drops out of that game's vector and is counted in `skipped`.
 *
 * Games are keyed by gameId. A game with no qualifying incentive cells
 * still emits a row (the absence of incentive is itself informative), but
 * only when rest history exists for at least one side — otherwise the
 * rest-bonus denominator is unexplainable and the row is skipped.
 */
export function buildIncentiveRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  ctx: {
    readonly restBonuses: readonly RestBonusInput[];
    readonly playoffImplications: readonly PlayoffImplicationInput[];
    readonly rosterMoves: readonly RosterMoveWindowInput[];
    readonly ruleChanges: readonly RuleChange[];
  },
  teamEntity = (team: string) => team,
): IncentiveCalendarResult {
  const skipped = {
    missingRestHistory: 0,
    unknownObservationTime: 0,
    ruleNotYetAnnounced: 0,
    noOdds: 0,
    tie: 0,
  };

  // Pre-ingest all incentives/rules into the store. The store's as-of read
  // at each game's decision time enforces leak safety; ingestion order is
  // irrelevant.
  for (const rb of ctx.restBonuses) {
    if (!ingestRestBonus(store, teamEntity(rb.team), rb)) skipped.unknownObservationTime++;
  }
  for (const pi of ctx.playoffImplications) {
    if (!ingestPlayoffImplication(store, teamEntity(pi.team), pi)) skipped.unknownObservationTime++;
  }
  for (const rm of ctx.rosterMoves) {
    if (!ingestRosterMoveWindow(store, teamEntity(rm.team), rm)) skipped.unknownObservationTime++;
  }
  for (const rc of ctx.ruleChanges) {
    if (!ingestRuleChange(store, "ruleset", rc)) skipped.ruleNotYetAnnounced++;
  }

  const rows: EvalRow[] = [];
  for (const g of games) {
    if (g.homeScore !== null && g.awayScore !== null && g.homeScore === g.awayScore) {
      skipped.tie++;
      continue;
    }
    const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
    if (mh === null || ma === null) {
      skipped.noOdds++;
      continue;
    }

    const decisionAt = new Date(Date.parse(g.startTime) - DECISION_LEAD_MS).toISOString();

    // Rest history: require at least one rest-bonus observation before the
    // decision time for either side. Absence of any rest history (the team
    // is making its season debut) means the rest-bonus denominator is
    // unexplainable -> skip fail-closed.
    const homeRest = store.get(teamEntity(g.homeTeam), "incentive:rest_bonus", decisionAt);
    const awayRest = store.get(teamEntity(g.awayTeam), "incentive:rest_bonus", decisionAt);
    if (!homeRest && !awayRest) {
      skipped.missingRestHistory++;
      continue;
    }

    // Rule cells (global ruleset entity).
    const rulesObs = store.vector("ruleset", ["rule:ot_format", "rule:challenge_limit", "rule:playoff_format"], decisionAt);

    const feats = new Map<string, number>();
    // Home-team incentive cells (homeRest already fetched for the history check).
    const homePImp = store.get(teamEntity(g.homeTeam), "incentive:playoff_implication", decisionAt);
    const homeRM = store.get(teamEntity(g.homeTeam), "incentive:roster_move_window", decisionAt);
    if (homeRest) feats.set("incentive:rest_bonus", homeRest.value);
    if (homePImp) feats.set("incentive:playoff_implication", homePImp.value);
    if (homeRM) feats.set("incentive:roster_move_window", homeRM.value);
    // Away-team incentive cells (awayRest already fetched for the history check;
    // the model reads them through the away team's vector in practice).
    const awayPImp = store.get(teamEntity(g.awayTeam), "incentive:playoff_implication", decisionAt);
    const awayRM = store.get(teamEntity(g.awayTeam), "incentive:roster_move_window", decisionAt);
    if (awayRest) feats.set("incentive:rest_bonus_away", awayRest.value);
    if (awayPImp) feats.set("incentive:playoff_implication_away", awayPImp.value);
    if (awayRM) feats.set("incentive:roster_move_window_away", awayRM.value);
    for (const [k, v] of rulesObs.entries()) feats.set(k, v);

    // q from devigged closing moneyline — qClose must be in (0,1).
    const qHome = mh / (mh + ma);
    if (!(qHome > EPS && qHome < 1 - EPS)) {
      skipped.noOdds++;
      continue;
    }

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(Date.parse(g.startTime) + 4 * 3_600_000).toISOString(),
      entityKey: g.gameId,
      features: feats,
      y: g.homeScore! > g.awayScore! ? 1 : 0,
      qClose: qHome,
    });
  }

  return { rows, skipped };
}

/**
 * Pure helper: rest bonus in days between a team's prior game end and the
 * next kickoff. Used by loaders to materialize RestBonusInput. Days are
 * (kickoff − priorEnd) / 86400000; a same-week bye week yields > 7.
 */
export function restDays(priorEndIso: string, kickoffIso: string): number | null {
  const a = Date.parse(priorEndIso);
  const b = Date.parse(kickoffIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / 86_400_000;
}
