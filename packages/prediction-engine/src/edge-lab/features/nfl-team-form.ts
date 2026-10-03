/**
 * NFL team-form candidate features from real nflverse play-by-play — the
 * registered path out of FIRE_NOTHING (handoff §2 P3 / §5).
 *
 * Phase-0/1 established that the schedule-derived reference features carry no
 * information beyond the closing price (MI probe p = 0.060; logit-pool β CI
 * spans 0 → FIRE_NOTHING). This module connects the repo's richer NFL
 * substrate — per-play EPA from nflverse play-by-play — to the edge-lab spine
 * as CANDIDATE features. Candidacy is decided ONLY by the registered
 * admission flow (trials-registry.ts: per-feature conditional-MI trial +
 * family-level BH-FDR), never here.
 *
 * ── The five candidates (each home-minus-away per game row) ──
 *   form:off_epa_pp_diff          offensive EPA per play
 *   form:def_epa_pp_allowed_diff  defensive EPA per play allowed
 *   form:off_success_rate_diff    offensive success rate (EPA > 0 share)
 *   form:pass_rate_diff           pass share of scrimmage plays
 *   form:net_epa_pp_diff          net EPA/play (off − def allowed), home − away
 *
 * ── Approach: precomputed per-team-per-GAME aggregates, windowed after ──
 * Recomputing from raw play-by-play per featured game would rescan ~48k rows
 * per season per game. Instead `aggregateNflPbpTeamGames` folds the projected
 * pbp rows ONCE into per-team-per-game sums (plays, EPA, successes, passes —
 * a few KB per season), and `buildTeamFormFeatureRows` windows over those
 * aggregates. NFL teams play at most once per week, so per-game aggregates
 * are exactly the per-team-per-week EPA table the windowing needs.
 *
 * ── Honesty discipline (mirrors ../schedule-features.ts exactly) ──
 *   - PRIOR-GAMES WINDOW: each side's aggregate pools the last N COMPLETED
 *     games whose (assumed) end time is STRICTLY BEFORE the featured game's
 *     decision cutoff (kickoff − 1h). Pooled per-play, not mean-of-rates: a
 *     12-play weather game must not weigh like a 75-play shootout.
 *   - SELF-EXCLUSION: a game's own aggregate is appended to team history only
 *     AFTER that game has been evaluated, and the endMs < decision filter
 *     re-enforces it — its own plays can never enter its own features.
 *   - observedAt = the end timestamp of the LAST game included in the window
 *     (the instant the window became knowable), so the AsOfFeatureStore's
 *     served-audit tripwire genuinely covers these features.
 *   - SKIP COUNTERS: every unfeatured game is counted with a reason — the
 *     denominator stays explainable.
 *
 * ── EPA source caveat (documented judgment call) ──
 * The `epa` column is nflverse's published expected-points-added value
 * (CC-BY-4.0; attribution: "Data via nflverse, licensed CC BY 4.0"). Its EP
 * model is a static play-value function of the play's own state/outcome —
 * it cannot encode the FEATURED game's result (only PRIOR games' plays enter
 * a window), so it cannot leak Y. The repo's own expected-metrics engine
 * treats nflverse ep/epa as referee-only within ITS calibration contract;
 * using the column as a raw historical fact about completed games is a
 * different, legitimate use.
 *
 * Team-code note: nflverse pbp retroactively keys relocated franchises by
 * their CURRENT code (verified against the live 2019 asset: every 2019
 * Raiders play carries posteam/defteam "LV" while nfldata games.csv says
 * "OAK" — 16 systematically unjoined games before this was handled). GameRow
 * team codes are therefore canonicalized (OAK→LV, SD→LAC, STL→LA) before any
 * aggregate lookup or history keying, so a franchise's window is continuous
 * across relocation instead of silently dropping a season of pbp.
 *
 * Pure, deterministic, no I/O — fetching lives in the runner
 * (scripts/edge-lab/feature-admission.ts), mirroring the loader convention.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

export const NFL_TEAM_FORM_FEATURE_KEYS = [
  "form:off_epa_pp_diff",
  "form:def_epa_pp_allowed_diff",
  "form:off_success_rate_diff",
  "form:pass_rate_diff",
  "form:net_epa_pp_diff",
] as const;

export type NflTeamFormFeatureKey = (typeof NFL_TEAM_FORM_FEATURE_KEYS)[number];

/**
 * The ONLY pbp columns this module reads (pass to `parseCsv(text, { columns })`
 * so the projecting parser never materializes the ~372-column matrix — same
 * OOM defense as expected-metrics/nflverse-pbp-mapper.ts). Deliberately
 * excludes every FTN/participation column.
 */
export const NFL_TEAM_FORM_PBP_COLUMNS = [
  "game_id",
  "season_type",
  "posteam",
  "defteam",
  "play_type",
  "epa",
] as const;

/** One projected pbp row record, exactly as `parseCsv` emits it. */
export type TeamFormPbpRow = Readonly<Record<string, string>>;

/** Additive per-team-per-game sums (pooled later by the windower). */
export interface TeamGamePbpAggregate {
  readonly gameId: string;
  readonly team: string;
  /** Scrimmage (pass/run) plays with finite EPA, this team on offense. */
  readonly offPlays: number;
  readonly offEpaSum: number;
  /** nflverse success definition: EPA > 0. */
  readonly offSuccessPlays: number;
  readonly offPassPlays: number;
  /** Scrimmage plays with finite EPA, this team on defense. */
  readonly defPlays: number;
  readonly defEpaAllowedSum: number;
}

export interface PbpAggregationResult {
  /** gameId -> team -> aggregate (exactly two teams per well-formed game). */
  readonly byGame: ReadonlyMap<string, ReadonlyMap<string, TeamGamePbpAggregate>>;
  /** Row accounting — sourceRows = usableRows + the three dropped counters. */
  readonly counts: {
    readonly sourceRows: number;
    readonly droppedNonReg: number;
    /** Not a pass/run row, or missing game_id/posteam/defteam. */
    readonly droppedNotScrimmage: number;
    readonly droppedNoEpa: number;
    readonly usableRows: number;
    readonly games: number;
  };
}

function toFinite(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fold projected nflverse pbp rows into per-team-per-game additive sums.
 * REG rows only; a usable row is a pass/run scrimmage play with a finite
 * `epa` and non-empty game/posteam/defteam identity. Records from multiple
 * seasons may be concatenated — aggregation is keyed purely by game/team.
 */
export function aggregateNflPbpTeamGames(
  records: readonly TeamFormPbpRow[],
): PbpAggregationResult {
  interface MutableAggregate {
    gameId: string;
    team: string;
    offPlays: number;
    offEpaSum: number;
    offSuccessPlays: number;
    offPassPlays: number;
    defPlays: number;
    defEpaAllowedSum: number;
  }
  const byGame = new Map<string, Map<string, MutableAggregate>>();
  let droppedNonReg = 0;
  let droppedNotScrimmage = 0;
  let droppedNoEpa = 0;
  let usableRows = 0;

  const slot = (gameId: string, team: string): MutableAggregate => {
    let teams = byGame.get(gameId);
    if (!teams) {
      teams = new Map();
      byGame.set(gameId, teams);
    }
    let agg = teams.get(team);
    if (!agg) {
      agg = {
        gameId,
        team,
        offPlays: 0,
        offEpaSum: 0,
        offSuccessPlays: 0,
        offPassPlays: 0,
        defPlays: 0,
        defEpaAllowedSum: 0,
      };
      teams.set(team, agg);
    }
    return agg;
  };

  for (const row of records) {
    if ((row["season_type"] ?? "") !== "REG") {
      droppedNonReg += 1;
      continue;
    }
    const playType = row["play_type"] ?? "";
    const gameId = row["game_id"] ?? "";
    const posteam = row["posteam"] ?? "";
    const defteam = row["defteam"] ?? "";
    const isPass = playType === "pass";
    if ((!isPass && playType !== "run") || gameId === "" || posteam === "" || defteam === "") {
      droppedNotScrimmage += 1;
      continue;
    }
    const epa = toFinite(row["epa"]);
    if (epa === null) {
      droppedNoEpa += 1;
      continue;
    }
    usableRows += 1;

    const off = slot(gameId, posteam);
    off.offPlays += 1;
    off.offEpaSum += epa;
    if (epa > 0) off.offSuccessPlays += 1;
    if (isPass) off.offPassPlays += 1;

    const def = slot(gameId, defteam);
    def.defPlays += 1;
    def.defEpaAllowedSum += epa;
  }

  return {
    byGame,
    counts: {
      sourceRows: records.length,
      droppedNonReg,
      droppedNotScrimmage,
      droppedNoEpa,
      usableRows,
      games: byGame.size,
    },
  };
}

// ── Windowing over per-team-per-game aggregates ─────────────────────────────

/**
 * Legacy → current franchise codes (see the team-code note in the header).
 * pbp aggregates always carry the CURRENT code; games.csv carries the era
 * code — canonicalize the GameRow side wherever a team is used as a key.
 */
const TEAM_CODE_ALIASES: Readonly<Record<string, string>> = { OAK: "LV", SD: "LAC", STL: "LA" };

function canonicalTeam(team: string): string {
  return TEAM_CODE_ALIASES[team] ?? team;
}

/** Assumed game duration when stamping "this result is now knowable" (mirror of schedule-features.ts). */
const GAME_DURATION_MS = 4 * 3_600_000;
/** Decision cutoff: features frozen this long before kickoff (mirror of schedule-features.ts). */
const DECISION_LEAD_MS = 60 * 60_000;

export interface TeamFormOptions {
  /** Prior-games window length. Default 8. */
  readonly window?: number;
  /** Minimum completed prior games (per side) to emit a row. Default 4. */
  readonly minHistory?: number;
  /**
   * Minimum scrimmage plays (offense AND defense) for a game aggregate to
   * enter team history — rejects corrupt/truncated pbp games. Default 10.
   */
  readonly minPlaysPerGame?: number;
}

export interface TeamFormFeatureResult {
  readonly rows: EvalRow[];
  /** Games skipped and why — honesty requires the denominator be explainable. */
  readonly skipped: {
    readonly noOdds: number;
    readonly noScores: number;
    readonly thinHistory: number;
    readonly tie: number;
  };
  /** History-side accounting (aggregate join quality — mechanical-failure signal for the runner). */
  readonly historyCounts: {
    /** Completed games whose BOTH team aggregates entered history. */
    readonly gamesFullyJoined: number;
    /** Per-team aggregates rejected by the minPlaysPerGame floor. */
    readonly aggregatesRejectedThinPlays: number;
    /** Completed games (scores present) with no pbp aggregate for one or both teams. */
    readonly gamesMissingAggregates: number;
  };
}

interface TeamFormGameRecord {
  readonly endMs: number;
  readonly offPlays: number;
  readonly offEpaSum: number;
  readonly offSuccessPlays: number;
  readonly offPassPlays: number;
  readonly defPlays: number;
  readonly defEpaAllowedSum: number;
}

interface WindowedForm {
  readonly offEpaPerPlay: number;
  readonly defEpaAllowedPerPlay: number;
  readonly offSuccessRate: number;
  readonly passRate: number;
  /** End of the LAST constituent game — the instant the window became knowable. */
  readonly knowableAt: number;
}

/**
 * Build EvalRows over completed games with closing moneylines, each carrying
 * the five team-form diffs pooled over the last `window` completed games per
 * side (strictly before the decision cutoff), ingested into `store` at their
 * honest knowable-at instants and served back through the store's as-of read
 * path — so every emitted vector went through the real enforcement machinery.
 *
 * qClose is computed exactly as schedule-features.ts / phase-0 do:
 * proportionalDevig over the closing moneyline pair, home side, bounded to
 * (0.01, 0.99).
 */
export function buildTeamFormFeatureRows(
  games: readonly GameRow[],
  pbp: PbpAggregationResult,
  store: AsOfFeatureStore,
  opts: TeamFormOptions = {},
): TeamFormFeatureResult {
  const windowLen = opts.window ?? 8;
  const minHistory = opts.minHistory ?? 4;
  const minPlays = opts.minPlaysPerGame ?? 10;
  if (!(Number.isInteger(windowLen) && windowLen >= 1)) {
    throw new RangeError(`window must be a positive integer: ${windowLen}`);
  }
  if (!(Number.isInteger(minHistory) && minHistory >= 1 && minHistory <= windowLen)) {
    throw new RangeError(`minHistory must be in [1, window]: ${minHistory}`);
  }

  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const history = new Map<string, TeamFormGameRecord[]>();
  const rows: EvalRow[] = [];
  const skipped = { noOdds: 0, noScores: 0, thinHistory: 0, tie: 0 };
  let gamesFullyJoined = 0;
  let aggregatesRejectedThinPlays = 0;
  let gamesMissingAggregates = 0;

  const windowAsOf = (team: string, beforeMs: number): WindowedForm | null => {
    const recs = (history.get(team) ?? []).filter((r) => r.endMs < beforeMs);
    if (recs.length < minHistory) return null;
    const window = recs.slice(-windowLen);
    let offPlays = 0;
    let offEpaSum = 0;
    let offSuccessPlays = 0;
    let offPassPlays = 0;
    let defPlays = 0;
    let defEpaAllowedSum = 0;
    let knowableAt = -Infinity;
    for (const r of window) {
      offPlays += r.offPlays;
      offEpaSum += r.offEpaSum;
      offSuccessPlays += r.offSuccessPlays;
      offPassPlays += r.offPassPlays;
      defPlays += r.defPlays;
      defEpaAllowedSum += r.defEpaAllowedSum;
      if (r.endMs > knowableAt) knowableAt = r.endMs;
    }
    // minPlaysPerGame >= 1 at ingest guarantees positive denominators.
    if (offPlays <= 0 || defPlays <= 0) return null;
    return {
      offEpaPerPlay: offEpaSum / offPlays,
      defEpaAllowedPerPlay: defEpaAllowedSum / defPlays,
      offSuccessRate: offSuccessPlays / offPlays,
      passRate: offPassPlays / offPlays,
      knowableAt,
    };
  };

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const endMs = startMs + GAME_DURATION_MS;

    const evaluate = (): void => {
      if (g.homeScore === null || g.awayScore === null) {
        skipped.noScores += 1;
        return;
      }
      if (g.homeScore === g.awayScore) {
        skipped.tie += 1;
        return;
      }
      const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
      if (mh === null || ma === null) {
        skipped.noOdds += 1;
        return;
      }
      const devig = proportionalDevig([mh, ma]);
      if (!devig || devig[0] === undefined) {
        skipped.noOdds += 1;
        return;
      }
      const q = devig[0];
      if (!(q > 0.01 && q < 0.99)) {
        skipped.noOdds += 1;
        return;
      }

      const home = windowAsOf(canonicalTeam(g.homeTeam), decisionMs);
      const away = windowAsOf(canonicalTeam(g.awayTeam), decisionMs);
      if (!home || !away) {
        skipped.thinHistory += 1;
        return;
      }

      const iso = (ms: number) => new Date(ms).toISOString();
      const observedAt = iso(Math.max(home.knowableAt, away.knowableAt));
      const ingest = (featureKey: NflTeamFormFeatureKey, value: number): void => {
        store.ingest({
          entityId: g.gameId,
          featureKey,
          value,
          observedAt,
          source: "nfl-team-form",
        });
      };
      ingest("form:off_epa_pp_diff", home.offEpaPerPlay - away.offEpaPerPlay);
      ingest(
        "form:def_epa_pp_allowed_diff",
        home.defEpaAllowedPerPlay - away.defEpaAllowedPerPlay,
      );
      ingest("form:off_success_rate_diff", home.offSuccessRate - away.offSuccessRate);
      ingest("form:pass_rate_diff", home.passRate - away.passRate);
      ingest(
        "form:net_epa_pp_diff",
        home.offEpaPerPlay -
          home.defEpaAllowedPerPlay -
          (away.offEpaPerPlay - away.defEpaAllowedPerPlay),
      );

      const decisionAt = iso(decisionMs);
      rows.push({
        id: g.gameId,
        decisionAt,
        eventEndAt: iso(endMs),
        features: store.vector(g.gameId, NFL_TEAM_FORM_FEATURE_KEYS, decisionAt),
        y: g.homeScore > g.awayScore ? 1 : 0,
        qClose: q,
      });
    };
    evaluate();

    // Record THIS game's aggregates into history AFTER evaluating it (its own
    // plays are never knowable at its own decision time). Only completed games
    // are joined — a scoreless GameRow cannot have trustworthy pbp.
    if (g.homeScore !== null && g.awayScore !== null) {
      const teams = pbp.byGame.get(g.gameId);
      let joined = 0;
      for (const team of [canonicalTeam(g.homeTeam), canonicalTeam(g.awayTeam)]) {
        const agg = teams?.get(team);
        if (agg === undefined) continue;
        if (agg.offPlays < minPlays || agg.defPlays < minPlays) {
          aggregatesRejectedThinPlays += 1;
          continue;
        }
        const list = history.get(team) ?? [];
        list.push({
          endMs,
          offPlays: agg.offPlays,
          offEpaSum: agg.offEpaSum,
          offSuccessPlays: agg.offSuccessPlays,
          offPassPlays: agg.offPassPlays,
          defPlays: agg.defPlays,
          defEpaAllowedSum: agg.defEpaAllowedSum,
        });
        history.set(team, list);
        joined += 1;
      }
      if (joined === 2) gamesFullyJoined += 1;
      if (
        teams === undefined ||
        teams.get(canonicalTeam(g.homeTeam)) === undefined ||
        teams.get(canonicalTeam(g.awayTeam)) === undefined
      ) {
        gamesMissingAggregates += 1;
      }
    }
  }

  return {
    rows,
    skipped,
    historyCounts: { gamesFullyJoined, aggregatesRejectedThinPlays, gamesMissingAggregates },
  };
}
