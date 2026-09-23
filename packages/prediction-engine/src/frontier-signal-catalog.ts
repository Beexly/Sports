/**
 * Frontier signal catalog — every learned signal, in the engine.
 *
 * A failed market test is not a deletion. Each entry is a ledger row the
 * shadow path always speaks for. An absent observation does not vote
 * (confidence 0). A present observation votes at least at the floor, so
 * nothing we have learned is ignored. Family collapse means five copies
 * of one fact cast one vote.
 *
 * This module does not publish a pick, bump MODEL_VERSION, or read a
 * database. Book A is untouched. Book B is a later rescore of these rows.
 */

import { composeLedger, type LedgerSignalRow } from "./signal-ledger.js";
import type { CompositeScore } from "./composite-score.js";

/** Importance floor once an observation exists. Never zero. */
export const SIGNAL_WEIGHT_FLOOR = 0.05;

/** Stronger prior for a candidate whose outcome interval already excluded zero. */
export const SIGNAL_WEIGHT_CANDIDATE = 0.25;

export interface FrontierSignal {
  readonly key: string;
  readonly family: string;
  readonly job: string;
  /** Importance once observed. Always >= SIGNAL_WEIGHT_FLOOR. */
  readonly priorWeight: number;
  /** Signed measured effect, if a run exists. Informational. Not a fabricated value. */
  readonly measuredEffect: number | null;
  readonly source: string;
}

export const FRONTIER_SIGNALS: readonly FrontierSignal[] = [
  { key: "narrative.birthday", family: "narrative", job: "residual versus usage, not a fake target bump", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.1349, source: "A1 nflverse roster birth_date" },
  { key: "narrative.former_team", family: "narrative", job: "former-team flag on the player-week", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.1349, source: "A1 roster history" },
  { key: "narrative.contract_expiry", family: "narrative", job: "expiry window, not a magic clause", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.3319, source: "A15 OTC-style contract tables" },
  { key: "narrative.milestone", family: "narrative", job: "sourced milestone only, never inferred", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage contract-incentives-milestones" },
  { key: "narrative.rookie_draft_round", family: "narrative", job: "level prior on rookie target share, not a growth slope", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0082, source: "A28 draft round" },
  { key: "officials.crew_id", family: "officials", job: "partial-pool random effect, no named lean on a card", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -2.9222, source: "A3 nflverse officials" },
  { key: "officials.penalty_rate", family: "officials", job: "crew penalty yards per game", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0378, source: "A27 play-by-play" },
  { key: "travel.time_zones", family: "travel", job: "continuous zones crossed, pooled with rest", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -3.2921, source: "A4 schedule" },
  { key: "travel.kickoff_hour_local", family: "travel", job: "local kickoff hour", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "A4 schedule" },
  { key: "travel.circadian", family: "travel", job: "body-clock fatigue beside rest", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage circadian-travel-fatigue" },
  { key: "travel.short_week_road", family: "travel", job: "short-week road deficit", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage short-week-road-deficit" },
  { key: "weather.team_total_wind", family: "weather", job: "team-total wind stays, coefficient near the measured null", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 6.7048, source: "A5" },
  { key: "weather.player_wind_yards", family: "weather", job: "wind suppresses player pass and receiving yards", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: -4.2374, source: "A25 n=7196" },
  { key: "weather.wind_elasticity", family: "weather", job: "completion and yard elasticity by wind band", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage wind-elasticity" },
  { key: "weather.temperature_precipitation", family: "weather", job: "temperature and precipitation decay", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage temperature-precipitation-decay" },
  { key: "weather.altitude", family: "weather", job: "altitude fatigue, weight starts at the floor", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage high-altitude-fatigue-decay" },
  { key: "persistence.dfa", family: "persistence", job: "shrinkage speed, not a spread addend", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0002, source: "A9" },
  { key: "geometry.play_mix_distance", family: "geometry", job: "neighbor kernel for empirical-Bayes borrowing", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0001, source: "A10" },
  { key: "regime.hmm_state", family: "regime", job: "Mondrian bin, not a second probability", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0003, source: "A11" },
  { key: "coach.go_minus_optimal", family: "coach", job: "fourth-down residual, Prelec form dropped", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.2574, source: "A12" },
  { key: "coach.tendencies", family: "coach", job: "coaching tendency vector", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage coaching-tendencies" },
  { key: "coach.second_and_ten", family: "coach", job: "Lopez second-and-ten tendency, same coach family", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage lopez-second-and-ten" },
  { key: "complexity.permutation_entropy", family: "complexity", job: "play-call unpredictability beyond pass_oe", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.0961, source: "A6" },
  { key: "complexity.intrinsic_dim", family: "complexity", job: "play-call manifold dimension", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.0249, source: "A7" },
  { key: "complexity.homology", family: "complexity", job: "same family as entropy, cannot vote twice", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.0021, source: "A13" },
  { key: "strength.bradley_terry", family: "strength", job: "prior before the market offset, not a second price", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0, source: "A16" },
  { key: "strength.elo", family: "strength", job: "Elo from results, one vote with Bradley-Terry", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "elo-from-results" },
  { key: "strength.standings", family: "strength", job: "opening-week prior when Elo has no games", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "standings-strength" },
  { key: "strength.opp_adj_epa", family: "strength", job: "opponent-adjusted EPA feature, scale fit before it prices", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "nfl-epa-fair-value" },
  { key: "strength.turnover_luck", family: "strength", job: "occurrence modeled, recovery regressed", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage turnover-luck" },
  { key: "chemistry.games_together", family: "chemistry", job: "stability of target share, mean starts at the measured slope", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.0608, source: "A17" },
  { key: "window.kickoff", family: "window", job: "primetime versus afternoon, insufficient n is not a deletion", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.2123, source: "A18" },
  { key: "usage.wr1_out", family: "usage", job: "target redistribution when WR1 is out", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 1.1984, source: "A19" },
  { key: "usage.backup_qb", family: "usage", job: "WR1 share under a backup, shrunk, not hard-zeroed", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.568, source: "A20" },
  { key: "usage.snap_slope", family: "usage", job: "trailing snap-share slope beyond the trailing mean", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.2937, source: "A23" },
  { key: "trench.ol_continuity", family: "trench", job: "starters retained into the pressure path, not YPC", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.0188, source: "A21" },
  { key: "rest.days", family: "rest", job: "days of rest, separate from age", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "A24" },
  { key: "rest.age", family: "rest", job: "age, separate from rest", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: -0.0057, source: "A24 interaction" },
  { key: "coverage.ftn_pressure", family: "coverage", job: "FTN pressure, coverage, motion beyond box score", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: -0.0009, source: "A14 nflverse-ftn" },
  { key: "coverage.man_zone", family: "coverage", job: "slot versus boundary by coverage shell, same FTN feed", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "A26 load_ftn_charting" },
  { key: "props.redzone_target_share", family: "redzone", job: "anytime-TD hit rate beyond base rate", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.3158, source: "A22" },
  { key: "props.redzone_conversion", family: "redzone", job: "red-zone opportunity conversion, same family", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage redzone-opportunity-conversion" },
  { key: "props.negbin_td", family: "redzone", job: "negative-binomial TD, same family, one vote", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage negative-binomial-redzone-td" },
  { key: "market.shrinkage", family: "market", job: "market is one fixed offset, not the seal on the ledger", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: 0.1, source: "A2 w=0.10 on paired rows" },
  { key: "calibration.temperature", family: "calibration", job: "one temperature on pre-game receipts, isotonic cannot invert", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: 0.041, source: "A8 log-loss-optimize" },
  { key: "lowscore.dixon_coles", family: "lowscore", job: "low-score correlation beside Poisson, one family", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "dixon-coles" },
  { key: "lowscore.poisson", family: "lowscore", job: "independent Poisson joint", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "poisson" },
  { key: "injury.return_spell", family: "injury", job: "practice status and return curve, no guessed calories", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "availability-role-tenure" },
  { key: "injury.trajectory", family: "injury", job: "injury trajectory, same family", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage injury-trajectory" },
  { key: "surface.turf_fatigue", family: "surface", job: "turf fatigue, new row, floor until the fitter sees it", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage turf-surface-fatigue" },
  { key: "tactical.early_down_pass", family: "tactical", job: "early-down pass-rate momentum", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage early-down-pass-rate-momentum" },
  { key: "tactical.two_minute", family: "tactical", job: "two-minute efficiency", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage two-minute-hurry-up" },
  { key: "tactical.redzone_personnel", family: "tactical", job: "red-zone personnel grouping", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage redzone-personnel-grouping" },
  { key: "schematic.bye_install", family: "schematic", job: "bye-week defensive installation", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "salvage bye-week-defensive-installation" },
  { key: "player.archetype", family: "player", job: "usage profile, not charted scheme", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "player-archetype" },
  { key: "player.rush_scheme", family: "player", job: "run-direction proxy from public play-by-play", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "player-rush-scheme" },
  { key: "player.rate_posterior", family: "player", job: "small-sample shrinkage, does not fabricate a rate", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "player-rate-posteriors" },
  { key: "market.book_depth", family: "depth", job: "depth is a feature that can be a penalty, not a +20 confidence bonus", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "picks.bookmakerCount measured anti-predictive direction on MLB spreads" },
  { key: "market.side_agreement", family: "agreement", job: "share of books whose price favours the side, not a pinned line", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "consensus.ts" },
  { key: "market.in_play", family: "timing", job: "generated at or after kickoff, exclude from training, keep on the row", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "in-play-exclusion" },
  { key: "market.kalshi_divergence", family: "exchange", job: "exchange versus book, a second price not a second confirmation of the same books", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "edge-lab/kalshi-book-divergence.ts" },
  { key: "market.cross_book_outlier", family: "outlier", job: "Kaunitz-style outlier versus the consensus", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "edge-lab/kaunitz-outlier.ts" },
  { key: "market.close_target", family: "close", job: "predict the close as a label, do not use it as an admission gate", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "edge-lab/close-distillation.ts" },
  { key: "props.hierarchical_bayes", family: "props-model", job: "fit on prior-season player results already on disk, not on our own thin slate", priorWeight: SIGNAL_WEIGHT_CANDIDATE, measuredEffect: null, source: "edge-lab/props-hb.ts plus nflverse player stats" },
  { key: "props.adot_separation", family: "props-air", job: "air yards and separation into the prop prior", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "props-hb-adot-sep.ts" },
  { key: "props.air_yac", family: "props-yac", job: "air versus YAC split", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "props-hb-air-yac.ts" },
  { key: "props.context", family: "props-context", job: "rest, body clock, weather bound into the prop stack", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "props-context-bind.ts" },
  { key: "mlb.statcast_batter", family: "mlb-batter", job: "exit velo, barrel, whiff as a batter prior", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "apps/web/lib/statcast" },
  { key: "mlb.statcast_pitcher", family: "mlb-pitcher", job: "pitcher underlying, a different entity from the batter row", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "apps/web/lib/statcast" },
  { key: "parlay.same_game", family: "parlay", job: "same-game dependence, not independence", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "parlay/correlationAdjuster.ts" },
  { key: "fantasy.gse_score", family: "fantasy", job: "one player ranking for trade, draft, and waivers", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "gse-score.ts" },
  { key: "fantasy.ownership", family: "fantasy", job: "projected ownership minus optimal share, leverage", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "dfs slate ownership field" },
  { key: "fantasy.salary_value", family: "fantasy", job: "points per salary dollar", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "dfs optimizer" },
  { key: "special.hidden_yards", family: "special", job: "ST EPA plus penalty EPA plus field position", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab special_teams csv" },
  { key: "kicker.distance_bucket", family: "kicker", job: "make rate by distance, volume separate from skill", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab kicker_metrics" },
  { key: "drive.outcomes", family: "drive", job: "TD, three-and-out, turnover-drive rates as a second scoring model", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab drive_stats" },
  { key: "down.early_vs_late", family: "down", job: "early-down success, not raw third-down conversion", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab down_splits" },
  { key: "qb.adot_cpoe", family: "qb", job: "depth and completion over expected, throwaways excluded", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab qb_aggressiveness" },
  { key: "pressure.creation", family: "pressure", job: "pressure created, not sack conversion luck", priorWeight: SIGNAL_WEIGHT_FLOOR, measuredEffect: null, source: "lab rush_pressure" },
] as const;

export interface FrontierObservation {
  readonly key: string;
  /** Directional reading. Absent means we do not have it. Never invent one. */
  readonly value: number;
  readonly capturedAt: string;
  /** Reliability of this observation. Defaults to 1 when the value is supplied. */
  readonly confidence?: number;
}

export interface FrontierLedger {
  readonly rows: readonly LedgerSignalRow[];
  /** One voter per family. This is what the composite sees. */
  readonly votingRows: readonly LedgerSignalRow[];
  readonly score: CompositeScore;
  readonly families: number;
  readonly observed: number;
}

function byKey(): ReadonlyMap<string, FrontierSignal> {
  return new Map(FRONTIER_SIGNALS.map((s) => [s.key, s]));
}

/**
 * Every catalog key becomes a row. Missing observations are spoken for at
 * confidence 0 so they cannot vote as facts. Present observations vote at
 * the signal's prior weight, which is never below the floor.
 */
export function buildFrontierRows(
  observations: readonly FrontierObservation[],
  capturedAtFallback: string,
): LedgerSignalRow[] {
  const catalog = byKey();
  const seen = new Map<string, FrontierObservation>();
  for (const obs of observations) {
    if (!catalog.has(obs.key)) continue;
    if (!Number.isFinite(obs.value)) continue;
    seen.set(obs.key, obs);
  }
  return FRONTIER_SIGNALS.map((signal) => {
    const obs = seen.get(signal.key);
    if (!obs) {
      return {
        key: signal.key,
        value: 0,
        weight: signal.priorWeight,
        confidence: 0,
        capturedAt: capturedAtFallback,
      };
    }
    return {
      key: signal.key,
      value: obs.value,
      weight: Math.max(SIGNAL_WEIGHT_FLOOR, signal.priorWeight),
      confidence: obs.confidence ?? 1,
      capturedAt: obs.capturedAt,
    };
  });
}

/** Highest |value| × confidence in the family votes. The others stay in `rows`. */
export function collapseFamilies(rows: readonly LedgerSignalRow[]): LedgerSignalRow[] {
  const catalog = byKey();
  const winner = new Map<string, LedgerSignalRow>();
  for (const row of rows) {
    const family = catalog.get(row.key)?.family ?? row.key;
    const prev = winner.get(family);
    const score = Math.abs(row.value) * (row.confidence ?? 1);
    const prevScore = prev ? Math.abs(prev.value) * (prev.confidence ?? 1) : -1;
    if (!prev || score > prevScore) winner.set(family, row);
  }
  return [...winner.values()];
}

/**
 * Shadow composite. Inject `now` for replay. Does not read the clock when
 * `now` is passed. Does not publish.
 */
export function composeFrontierLedger(
  observations: readonly FrontierObservation[],
  now: string,
): FrontierLedger {
  const rows = buildFrontierRows(observations, now);
  const votingRows = collapseFamilies(rows).filter((r) => (r.confidence ?? 0) > 0 && r.value !== 0);
  const score = composeLedger(votingRows, { now });
  const families = new Set(FRONTIER_SIGNALS.map((s) => s.family)).size;
  const observed = rows.filter((r) => (r.confidence ?? 0) > 0).length;
  return { rows, votingRows, score, families, observed };
}
