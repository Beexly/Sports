/**
 * MLB historical game loader — the "games" edge-lab feed (edge-lab handoff
 * §6: per-sport loaders map onto the shared, sport-agnostic `GameRow`; see
 * ../game-row.ts).
 *
 * Source: the MLB Stats API (statsapi.mlb.com) — free, keyless, public JSON,
 * approved for ingestion per the edge-lab handoff §4:
 *
 *   GET https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=YYYY&gameType=R
 *
 * `dates[].games[]` gives one entry per game: `gamePk` (stable numeric id),
 * `gameDate` (kickoff/first-pitch, already ISO 8601 UTC — no timezone
 * conversion needed, unlike the NFL loader), `teams.home` / `teams.away`
 * (`.team.name`, `.score`), and `status.abstractGameState`
 * ("Preview" | "Live" | "Final"). Verified live against both a completed
 * date (2024-03-28: e.g. gamePk 747060, Los Angeles Angels @ Baltimore
 * Orioles, final 3-11, `abstractGameState: "Final"`) and a not-yet-played
 * date (2026-08-01: `teams.home`/`teams.away` carry NO `score` field at all
 * — not even `0` — while `abstractGameState: "Preview"`). This loader keys
 * off `abstractGameState === "Final"` rather than "a score field is present"
 * so a `Live` in-progress game's partial score is never reported as a
 * settled result.
 *
 * ── This loader ships STATS-ONLY rows: `closing` is always all-null ──
 * MLB historical CLOSING ODDS are not a freely/openly licensed dataset the
 * way nflverse's schedule lines are — there is no MLB analogue to nfldata's
 * CC-BY-4.0 games.csv with baked-in spread/total/moneyline columns. Per
 * CLAUDE.md rule #1 ("no fake data") this loader does NOT synthesize or
 * estimate a closing line: every `closing.*` field on an MLB `GameRow` is
 * `null` today. The intended path forward (see the edge-lab handoff) is a
 * founder-applied MLB line archive accumulated over time from a properly
 * licensed odds source; once that lands, a later change can populate these
 * fields for the games it covers. Until then, `null` here is the honest
 * answer, not a placeholder bug.
 *
 * ── Why this file doesn't call `assertIngestible` / the data-ingestion
 *    source registry ──
 * packages/prediction-engine/package.json does NOT declare a dependency on
 * @sports/data-ingestion (only "@sports/types"), and prediction-engine's
 * tsconfig.json has no path mapping for it either — by the letter of the
 * package.json manifest, prediction-engine cannot import
 * packages/data-ingestion/src/source-registry.ts's `assertIngestible`.
 * (Editing package.json, or any existing file, was explicitly out of scope
 * for this task, so a `mlb-stats-api` entry was NOT added to
 * source-registry.ts either — the intended follow-up, once a loader in this
 * position is wired into a package that *does* depend on data-ingestion, is
 * to register it there mirroring the `nws-weather` entry: `kind:
 * "public-api"`, `commercialUse: true`, `attributionRequired: false`,
 * `verdict: "cleared"` or `"use-with-caution"` — free, keyless, public JSON,
 * no ToS-prohibited automation, matching the edge-lab handoff §4 approval.)
 * This loader's own legal posture is documented here instead, per that
 * fallback: MLB Stats API is a public, unauthenticated, read-only JSON
 * endpoint (no login, no paywall, no CAPTCHA) — the same category as this
 * repo's `nws-weather` / `sleeper` registry entries — and only facts
 * (scores, team names, schedule, game state) are extracted, never
 * proprietary predictions or article content, consistent with
 * apps/web/lib/scraping/data-rules.ts's "what may be extracted" doctrine.
 * No RightsSnapshot/ClearanceResult is produced because this is an ingestion
 * loader (data-ingestion's governance surface), not a scraping job (that
 * doctrine's Scraping Clearance Engine governs apps/web/lib/scraping/*
 * extraction jobs specifically).
 */

import type { GameRow } from "../game-row.js";

export interface LoadMlbGamesOptions {
  readonly seasons: readonly number[];
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetcher?: typeof fetch;
}

/** Build the MLB Stats API schedule URL for one regular season. */
export function mlbScheduleUrl(season: number): string {
  return `https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${season}&gameType=R`;
}

// ── MLB Stats API response shape (only the fields this loader reads) ──────

interface MlbTeamSide {
  readonly team?: { readonly name?: string };
  readonly score?: number;
}

interface MlbScheduleGame {
  readonly gamePk?: number;
  readonly gameDate?: string;
  readonly status?: { readonly abstractGameState?: string };
  readonly teams?: {
    readonly home?: MlbTeamSide;
    readonly away?: MlbTeamSide;
  };
}

interface MlbScheduleDate {
  readonly games?: readonly MlbScheduleGame[];
}

interface MlbScheduleResponse {
  readonly dates?: readonly MlbScheduleDate[];
}

/**
 * Load regular-season ("R") MLB games for the requested seasons as
 * sport-agnostic `GameRow`s. One request per season (the API's `season`
 * query param is single-valued).
 */
export async function loadMlbGames(opts: LoadMlbGamesOptions): Promise<GameRow[]> {
  const doFetch = opts.fetcher ?? fetch;
  const rows: GameRow[] = [];

  for (const season of opts.seasons) {
    const url = mlbScheduleUrl(season);
    const res = await doFetch(url);
    if (!res.ok) {
      throw new Error(`MLB Stats API schedule fetch failed (${res.status}) for ${url}`);
    }
    const payload = (await res.json()) as MlbScheduleResponse;
    for (const date of payload.dates ?? []) {
      for (const game of date.games ?? []) {
        const row = mapMlbGame(game, season);
        if (row !== null) rows.push(row);
      }
    }
  }

  return rows;
}

// ── row mapping ────────────────────────────────────────────────────────────

function mapMlbGame(game: MlbScheduleGame, season: number): GameRow | null {
  const gamePk = game.gamePk;
  if (typeof gamePk !== "number" || !Number.isFinite(gamePk)) return null;

  const startTime = game.gameDate;
  if (startTime === undefined || Number.isNaN(Date.parse(startTime))) return null;

  const homeTeam = game.teams?.home?.team?.name;
  const awayTeam = game.teams?.away?.team?.name;
  if (homeTeam === undefined || homeTeam === "" || awayTeam === undefined || awayTeam === "") return null;

  // Only a genuinely settled game gets a numeric score — a "Preview"/"Live"
  // game's score field (if present at all) is provisional/absent, never the
  // real final result.
  const isFinal = game.status?.abstractGameState === "Final";

  return {
    sport: "mlb",
    gameId: `mlb-${gamePk}`,
    season,
    week: null,
    startTime,
    homeTeam,
    awayTeam,
    homeScore: isFinal ? numOrNull(game.teams?.home?.score) : null,
    awayScore: isFinal ? numOrNull(game.teams?.away?.score) : null,
    // MLB historical closing odds are not freely licensed — see header.
    closing: {
      spreadHome: null,
      total: null,
      moneylineHomeDecimal: null,
      moneylineAwayDecimal: null,
    },
  };
}

function numOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
