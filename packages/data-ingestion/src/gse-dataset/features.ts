/**
 * Stage C -- feature engineering over the normalized game master.
 *
 * ## NO LOOKAHEAD is the contract, not a caveat
 *
 * A row's features may use ONLY STRICTLY EARLIER rows. Concretely, every
 * feature here is built from games whose `gameday` is STRICTLY LESS THAN the
 * row's own `gameday` -- not merely "earlier in the input array". Two things
 * follow, and both matter:
 *
 *  - The row's OWN outcome is never a feature. Predicting a game's margin from
 *    its margin is the crudest possible leak, and a trailing window that
 *    included the current row would do it silently.
 *  - Same-day games never inform each other. Ordering by array position alone
 *    would let a 1pm game's result leak into an 8pm game's features, because
 *    the 1pm row sorts first. Gameday strictness closes that. (Two teams never
 *    play each other on the same day, so this costs nothing real.)
 *
 * `features.test.ts` proves this by perturbation: mutate a late row and assert
 * every earlier row's feature block is byte-identical. That is the test that
 * matters; a shape check is not evidence of no-lookahead.
 *
 * ## Interaction with the Stage B holdout
 *
 * Stage C computes features over the WHOLE dataset, which is safe precisely
 * because the two mechanisms are independent and compose: the split is by
 * SEASON (train is seasons strictly earlier than the holdout season) and
 * features are strictly backward-looking in `gameday`. A train row's `gameday`
 * is at or before the end of its own season, so it can never reach a holdout
 * row, which is dated in a later season. No train feature can contain a
 * holdout outcome -- the property holds for reasons of arithmetic, not
 * bookkeeping.
 *
 * ## Fail-closed on thin evidence
 *
 * A rolling mean with no prior games is emitted as `null`, never as `0`. Zero
 * is a real value (a team genuinely can score zero), so substituting it for
 * "unknown" would be a fabricated feature. Every rolling mean ships with its
 * own `*_games_prior` count so a consumer can require a minimum sample instead
 * of trusting a mean built from one game.
 *
 * ## Matchup pairing and phases
 *
 * The schema supports both, so both are used:
 *  - MATCHUP PAIRING (`away_team` / `home_team`) drives the opponent-adjusted
 *    metrics: a team's scoring mean is adjusted by how stingy the defenses it
 *    actually faced were, and its conceding mean by how potent the offenses it
 *    actually faced were. The adjustment terms are themselves built from
 *    strictly-earlier games, so the adjustment is leak-free at both levels.
 *  - PHASE (`season_phase` REG/POST, refined by `game_type`) drives
 *    phase-conditional rolling windows, because postseason games are a
 *    genuinely different sample from regular-season games and pooling them
 *    would let a playoff roster's small sample dominate a 17-game mean.
 *
 * Pure and deterministic: no clock, no network, no filesystem, and no
 * dependence on the input array's order. O(n log n) via a per-team index.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { GSE_DATA_DIR, sha256Hex } from "./fetch-games.js";
import type { NormalizedGame, SeasonPhase } from "./normalize.js";

/** Trailing window, in a team's prior games. */
export const TRAILING_WINDOW = 8;

/** Input artifact: the Stage A normalized game master. */
export const GSE_GAMES_JSONL_PATH = join(GSE_DATA_DIR, "games.jsonl");
/** Where the feature matrix lands. */
export const GSE_FEATURES_JSONL_PATH = join(GSE_DATA_DIR, "features.jsonl");

/** One feature row, keyed by `game_id` to the game it describes. */
export type GameFeatures = {
  readonly game_id: string;
  readonly season: number;
  readonly week: number;
  readonly gameday: string;
  readonly season_phase: SeasonPhase;
  readonly game_type: string;

  // ---- Identity / context, knowable at kickoff (never outcome-derived) ----
  readonly away_team: string;
  readonly home_team: string;
  readonly neutral_site: boolean;
  readonly is_dome: boolean;
  readonly is_divisional: boolean;
  readonly rest_diff: number | null;

  // ---- Outcome passthrough: for LABELING only, never an input feature ----
  readonly settled: boolean;
  readonly home_win: boolean | null;
  readonly margin: number | null;
  readonly total_points: number | null;

  // ---- Trailing rolling means (all phases), strictly earlier gameday ----
  readonly home_games_prior: number;
  readonly home_pts_scored_avg: number | null;
  readonly home_pts_allowed_avg: number | null;
  readonly home_margin_avg: number | null;
  readonly away_games_prior: number;
  readonly away_pts_scored_avg: number | null;
  readonly away_pts_allowed_avg: number | null;
  readonly away_margin_avg: number | null;

  // ---- Opponent-adjusted: net of the quality of the teams actually faced ----
  /** Mean points allowed by the defenses this team faced, over its prior games. */
  readonly home_opp_def_strength_avg: number | null;
  /** Mean points scored by the offenses this team faced, over its prior games. */
  readonly home_opp_off_strength_avg: number | null;
  /** `home_pts_scored_avg` minus the opponent-defense term, league-relative. */
  readonly home_opp_adj_pts_scored: number | null;
  /** `home_pts_allowed_avg` minus the opponent-offense term, league-relative. */
  readonly home_opp_adj_pts_allowed: number | null;
  readonly away_opp_def_strength_avg: number | null;
  readonly away_opp_off_strength_avg: number | null;
  readonly away_opp_adj_pts_scored: number | null;
  readonly away_opp_adj_pts_allowed: number | null;

  // ---- Phase-conditional rolling means ----
  readonly home_games_prior_reg: number;
  readonly home_pts_scored_avg_reg: number | null;
  readonly away_games_prior_reg: number;
  readonly away_pts_scored_avg_reg: number | null;
  readonly home_games_prior_post: number;
  readonly home_pts_scored_avg_post: number | null;
  readonly away_games_prior_post: number;
  readonly away_pts_scored_avg_post: number | null;
};

/** How a feature set was built, for the run log. */
export type FeaturesStats = {
  readonly inputRows: number;
  readonly emittedRows: number;
  readonly settledRows: number;
  /** Games skipped for history purposes (no outcome to learn from). */
  readonly skippedUnsettled: number;
  readonly rowsWithAnyRollingHistory: number;
  readonly rowsWithNoRollingHistory: number;
  readonly window: number;
  readonly teams: number;
};

/** A team's single appearance in one settled game. */
type Appearance = {
  readonly team: string;
  readonly opponent: string;
  readonly gameId: string;
  readonly gameday: string;
  readonly phase: SeasonPhase;
  readonly scored: number;
  readonly allowed: number;
  readonly margin: number;
};

export type BuildFeaturesOptions = {
  /** Trailing window in a team's prior games. */
  readonly window?: number;
};

/** Mean of a numeric list, or null when the list is empty. */
function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function subtract(value: number | null, adjustment: number | null): number | null {
  if (value === null || adjustment === null) return null;
  return value - adjustment;
}

/** Trailing mean over the last `window` entries of `[0, end)`. */
function trailingMean(source: readonly number[], end: number, window: number): number | null {
  const start = Math.max(0, end - window);
  return mean(source.slice(start, end));
}

/**
 * Build the feature matrix.
 *
 * Three passes, each able to see only strictly-earlier information:
 *  1. Order the games and expand each settled one into two team appearances.
 *     An unsettled game has no outcome, so it contributes no history for anyone.
 *  2. For each team, walk its appearances in chronological order and record that
 *     team's own trailing means over its STRICTLY EARLIER games.
 *  3. For each game, combine the two appearances' baselines with opponent
 *     adjustment terms drawn from the opponents' own (already-final) baselines.
 */
export function buildFeatures(
  games: readonly NormalizedGame[],
  options: BuildFeaturesOptions = {},
): { readonly features: readonly GameFeatures[]; readonly stats: FeaturesStats } {
  const window = options.window ?? TRAILING_WINDOW;
  if (!Number.isInteger(window) || window < 1) {
    throw new Error(`window must be a positive integer, got ${window}`);
  }

  // Strict total order: gameday is the causal clock, game_id breaks ties so the
  // result never depends on the input array's order. Features compare gameday
  // STRICTLY, so this tiebreak affects only output row order, never visibility.
  const ordered = [...games].sort((a, b) => {
    if (a.gameday !== b.gameday) return a.gameday < b.gameday ? -1 : 1;
    return a.game_id < b.game_id ? -1 : a.game_id > b.game_id ? 1 : 0;
  });

  // ---- Pass 1: appearances, in global chronological order ----
  const appearances: Appearance[] = [];
  const byTeam = new Map<string, Appearance[]>();
  const indexByTeamGame = new Map<string, number>();
  let skippedUnsettled = 0;

  const add = (ap: Appearance): void => {
    indexByTeamGame.set(`${ap.team} ${ap.gameId}`, appearances.length);
    appearances.push(ap);
    const list = byTeam.get(ap.team);
    if (list === undefined) byTeam.set(ap.team, [ap]);
    else list.push(ap);
  };

  for (const game of ordered) {
    if (!game.settled || game.away_score === null || game.home_score === null) {
      skippedUnsettled++;
      continue;
    }
    const margin = game.margin ?? game.home_score - game.away_score;
    add({
      team: game.home_team,
      opponent: game.away_team,
      gameId: game.game_id,
      gameday: game.gameday,
      phase: game.season_phase,
      scored: game.home_score,
      allowed: game.away_score,
      margin,
    });
    add({
      team: game.away_team,
      opponent: game.home_team,
      gameId: game.game_id,
      gameday: game.gameday,
      phase: game.season_phase,
      scored: game.away_score,
      allowed: game.home_score,
      margin: -margin,
    });
  }

  // ---- Pass 2: each team's own strictly-earlier trailing baselines ----
  type Baseline = {
    scored: number | null;
    allowed: number | null;
    margin: number | null;
    n: number;
    nReg: number;
    scoredReg: number | null;
    nPost: number;
    scoredPost: number | null;
  };
  const baselineOf = new Map<number, Baseline>();

  for (const [team, list] of byTeam) {
    // `list` is already chronological: the global sort in pass 1 preserved
    // per-team order. For entry i, the entries with a STRICTLY earlier gameday
    // form the prefix [0, k). `k` is monotone in i, so one advancing pointer
    // finds every k in total O(m) for the team.
    let k = 0;
    for (let i = 0; i < list.length; i++) {
      const ap = list[i]!;
      while (k < list.length && list[k]!.gameday < ap.gameday) k++;
      const prior = list.slice(0, k);
      const priorReg = prior.filter((p) => p.phase === "REG");
      const priorPost = prior.filter((p) => p.phase === "POST");
      baselineOf.set(indexByTeamGame.get(`${team} ${ap.gameId}`)!, {
        scored: trailingMean(prior.map((p) => p.scored), k, window),
        allowed: trailingMean(prior.map((p) => p.allowed), k, window),
        margin: trailingMean(prior.map((p) => p.margin), k, window),
        n: prior.length,
        nReg: priorReg.length,
        scoredReg: trailingMean(priorReg.map((p) => p.scored), priorReg.length, window),
        nPost: priorPost.length,
        scoredPost: trailingMean(priorPost.map((p) => p.scored), priorPost.length, window),
      });
    }
  }

  /** Opponent-quality term over this appearance's strictly-earlier games. */
  const opponentTerm = (
    ap: Appearance,
    field: "allowed" | "scored",
  ): number | null => {
    const list = byTeam.get(ap.team);
    if (list === undefined) return null;
    const k = list.filter((p) => p.gameday < ap.gameday).length;
    const prior = list.slice(Math.max(0, k - window), k);
    const terms: number[] = [];
    for (const p of prior) {
      const oppIndex = indexByTeamGame.get(`${p.opponent} ${p.gameId}`);
      if (oppIndex === undefined) continue;
      const oppBaseline = baselineOf.get(oppIndex);
      if (oppBaseline === undefined) continue;
      const value = oppBaseline[field];
      if (value !== null) terms.push(value);
    }
    return mean(terms);
  };

  // ---- Pass 3: assemble one feature row per input game ----
  const features: GameFeatures[] = [];
  let rowsWithAnyRollingHistory = 0;
  let rowsWithNoRollingHistory = 0;

  for (const game of ordered) {
    const homeIndex = indexByTeamGame.get(`${game.home_team} ${game.game_id}`);
    const awayIndex = indexByTeamGame.get(`${game.away_team} ${game.game_id}`);
    const homeAp = homeIndex === undefined ? undefined : appearances[homeIndex];
    const awayAp = awayIndex === undefined ? undefined : appearances[awayIndex];
    const homeBase = homeIndex === undefined ? undefined : baselineOf.get(homeIndex);
    const awayBase = awayIndex === undefined ? undefined : baselineOf.get(awayIndex);

    const homeOppDef = homeAp === undefined ? null : opponentTerm(homeAp, "allowed");
    const homeOppOff = homeAp === undefined ? null : opponentTerm(homeAp, "scored");
    const awayOppDef = awayAp === undefined ? null : opponentTerm(awayAp, "allowed");
    const awayOppOff = awayAp === undefined ? null : opponentTerm(awayAp, "scored");

    const homeN = homeBase?.n ?? 0;
    const awayN = awayBase?.n ?? 0;
    if (homeN > 0 || awayN > 0) rowsWithAnyRollingHistory++;
    else rowsWithNoRollingHistory++;

    features.push({
      game_id: game.game_id,
      season: game.season,
      week: game.week,
      gameday: game.gameday,
      season_phase: game.season_phase,
      game_type: game.game_type,

      away_team: game.away_team,
      home_team: game.home_team,
      neutral_site: game.neutral_site,
      is_dome: game.is_dome,
      is_divisional: game.is_divisional,
      rest_diff: game.rest_diff,

      settled: game.settled,
      home_win: game.home_win,
      margin: game.margin,
      total_points: game.total_points,

      home_games_prior: homeN,
      home_pts_scored_avg: homeBase?.scored ?? null,
      home_pts_allowed_avg: homeBase?.allowed ?? null,
      home_margin_avg: homeBase?.margin ?? null,
      away_games_prior: awayN,
      away_pts_scored_avg: awayBase?.scored ?? null,
      away_pts_allowed_avg: awayBase?.allowed ?? null,
      away_margin_avg: awayBase?.margin ?? null,

      home_opp_def_strength_avg: homeOppDef,
      home_opp_off_strength_avg: homeOppOff,
      home_opp_adj_pts_scored: subtract(homeBase?.scored ?? null, homeOppDef),
      home_opp_adj_pts_allowed: subtract(homeBase?.allowed ?? null, homeOppOff),
      away_opp_def_strength_avg: awayOppDef,
      away_opp_off_strength_avg: awayOppOff,
      away_opp_adj_pts_scored: subtract(awayBase?.scored ?? null, awayOppDef),
      away_opp_adj_pts_allowed: subtract(awayBase?.allowed ?? null, awayOppOff),

      home_games_prior_reg: homeBase?.nReg ?? 0,
      home_pts_scored_avg_reg: homeBase?.scoredReg ?? null,
      away_games_prior_reg: awayBase?.nReg ?? 0,
      away_pts_scored_avg_reg: awayBase?.scoredReg ?? null,
      home_games_prior_post: homeBase?.nPost ?? 0,
      home_pts_scored_avg_post: homeBase?.scoredPost ?? null,
      away_games_prior_post: awayBase?.nPost ?? 0,
      away_pts_scored_avg_post: awayBase?.scoredPost ?? null,
    });
  }

  const teams = byTeam.size;

  return {
    features,
    stats: {
      inputRows: ordered.length,
      emittedRows: features.length,
      settledRows: features.filter((f) => f.settled).length,
      skippedUnsettled,
      rowsWithAnyRollingHistory,
      rowsWithNoRollingHistory,
      window,
      teams,
    },
  };
}

/** Read the Stage A artifact and parse it. */
export async function readGamesJsonl(path: string = GSE_GAMES_JSONL_PATH): Promise<NormalizedGame[]> {
  const text = await readFile(path, "utf8");
  const rows: NormalizedGame[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    rows.push(JSON.parse(line) as NormalizedGame);
  }
  if (rows.length === 0) throw new Error(`${path} contains no rows`);
  return rows;
}

/** Run log for the feature stage. */
export function describeFeaturesRun(
  stats: FeaturesStats,
  write: { readonly path: string; readonly rows: number; readonly bytes: number; readonly sha256: string },
  sourceSha256: string,
): readonly string[] {
  return [
    "",
    "features",
    `input rows      ${stats.inputRows}`,
    `emitted rows    ${stats.emittedRows}`,
    `settled rows    ${stats.settledRows}`,
    `skipped (open)  ${stats.skippedUnsettled}`,
    `trailing window ${stats.window} prior games, strictly earlier gameday`,
    `teams           ${stats.teams}`,
    `with history    ${stats.rowsWithAnyRollingHistory}`,
    `no history      ${stats.rowsWithNoRollingHistory} (first games of a team, or unplayed)`,
    "",
    `source sha256   ${sourceSha256}`,
    `output          ${write.path}`,
    `rows written    ${write.rows}`,
    `bytes written   ${write.bytes}`,
    `sha256          ${write.sha256}`,
  ];
}

async function main(): Promise<void> {
  const sourceText = await readFile(GSE_GAMES_JSONL_PATH, "utf8");
  const games: NormalizedGame[] = [];
  for (const line of sourceText.split("\n")) {
    if (line.trim() === "") continue;
    games.push(JSON.parse(line) as NormalizedGame);
  }
  if (games.length === 0) throw new Error(`${GSE_GAMES_JSONL_PATH} contains no rows`);
  const { features, stats } = buildFeatures(games);
  const { writeJsonl } = await import("./write-jsonl.js");
  const write = await writeJsonl(GSE_FEATURES_JSONL_PATH, features);
  for (const line of describeFeaturesRun(stats, write, sha256Hex(sourceText))) console.log(line);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
