/**
 * nflverse free SETTLEMENT score provider (keyless, open data).
 *
 * Source: nflverse-data `schedules` release → `games.csv` (Lee Sharpe's nfldata).
 * Rights-registry source_id "nflverse" — status `approved_open_license`
 * (CC-BY-4.0). All flags true (storage + derived_analytics + commercial display),
 * attribution REQUIRED: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0".
 *
 * SCOPE: NFL only (americanfootball_nfl). The schedules file is the authoritative
 * NFL game master with final scores — ideal for settlement when the paid odds
 * key is unavailable. Other sports return `{ healthy: false }` so the pool moves on.
 *
 * SAFETY: GET only, no key, no writes. Parses defensively (reuses the tested
 * quote-aware CSV parser). Never throws — returns `{ healthy: false }` on
 * clearance denial, network error, non-2xx, or unparseable CSV.
 */

import {
  type ScoreProvider,
  type ScoreProviderOptions,
  type NormalizedScore,
  type NormalizedScoreResult,
  type ScoreClearanceRequest,
  coerceScore,
  resolveClearance,
  unhealthyScoreResult,
} from "../score-provider.js";
import { nflverseUrl, parseCsv, type CsvTable } from "../nflverse-source.js";

const NFLVERSE_TIMEOUT_MS = 20 * 1000;

export const NFLVERSE_SCORES_SOURCE_ID = "nflverse";

/**
 * Clearance request for nflverse scores.
 * Mode: open_dataset_ingest — requires approved_open_license (nflverse qualifies).
 * Tool: fetch-native — approved for this mode.
 * Intents: storage + derived_analytics — both permitted (all flags true).
 */
const NFLVERSE_CLEARANCE_REQUEST: ScoreClearanceRequest = {
  source_id: NFLVERSE_SCORES_SOURCE_ID,
  mode: "open_dataset_ingest",
  tool_id: "fetch-native",
  intents: ["storage", "derived_analytics"],
};

/** Only NFL is served by this dataset. */
const SUPPORTED_SPORT = "americanfootball_nfl";

/** Columns we read from games.csv (projection keeps the parse lean). */
const COLUMNS = [
  "game_id",
  "gameday",
  "gametime",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
] as const;

/** A non-empty, parseable score field means the game has a recorded result. */
function isCompleted(home: number | null, away: number | null): boolean {
  return home !== null && away !== null;
}

/**
 * Build an ISO commence time from nflverse `gameday` (YYYY-MM-DD) + optional
 * `gametime` (HH:MM, US/Eastern in the source — kept as a naive local marker).
 * Returns null when gameday is missing/malformed (never throws).
 */
function toCommenceTime(gameday: string, gametime: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameday)) return null;
  const time = /^\d{2}:\d{2}$/.test(gametime) ? `${gametime}:00` : "00:00:00";
  return `${gameday}T${time}Z`;
}

/** Lower-bound the window: keep games whose gameday is within [today-daysBack, today]. */
function withinWindow(gameday: string, daysBack: number, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameday)) return false;
  const gameMs = Date.parse(`${gameday}T00:00:00Z`);
  if (!Number.isFinite(gameMs)) return false;
  const days = Number.isFinite(daysBack) ? Math.max(0, Math.floor(daysBack)) : 0;
  const lower = now.getTime() - (days + 1) * 24 * 60 * 60 * 1000;
  const upper = now.getTime() + 24 * 60 * 60 * 1000; // include today fully
  return gameMs >= lower && gameMs <= upper;
}

/**
 * Pure parser: a parsed games.csv table → normalized scores within the window.
 * Exported for unit tests (no network). Never throws.
 */
export function parseNflverseScores(
  table: CsvTable,
  daysBack: number,
  now: Date,
): NormalizedScore[] {
  const out: NormalizedScore[] = [];
  for (const row of table.records) {
    const gameday = row["gameday"] ?? "";
    if (!withinWindow(gameday, daysBack, now)) continue;

    const homeTeam = row["home_team"] ?? "";
    const awayTeam = row["away_team"] ?? "";
    if (homeTeam === "" || awayTeam === "") continue;

    const homeScore = coerceScore(row["home_score"]);
    const awayScore = coerceScore(row["away_score"]);

    out.push({
      gameKey: row["game_id"] ?? `${gameday}-${awayTeam}-${homeTeam}`,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      completed: isCompleted(homeScore, awayScore),
      commenceTime: toCommenceTime(gameday, row["gametime"] ?? ""),
    });
  }
  return out;
}

export const nflverseScoreProvider: ScoreProvider = {
  name: "nflverse schedules (open data)",
  sourceId: NFLVERSE_SCORES_SOURCE_ID,

  async fetchScores(
    sportKey: string,
    daysBack: number,
    options: ScoreProviderOptions = {},
  ): Promise<NormalizedScoreResult> {
    const provider = NFLVERSE_SCORES_SOURCE_ID;

    // ── 1. Clearance (fail-closed) ───────────────────────────────────────────
    const clearance = resolveClearance(NFLVERSE_CLEARANCE_REQUEST, options.checkClearance);
    if (!clearance.allowed) {
      return unhealthyScoreResult(provider, clearance.reason);
    }
    const rightsSnapshot = clearance.rightsSnapshot;

    // ── 2. Sport mapping ─────────────────────────────────────────────────────
    if (sportKey !== SUPPORTED_SPORT) {
      return unhealthyScoreResult(provider, `unsupported-sport:${sportKey}`, rightsSnapshot);
    }

    const fetchFn = options.fetchFn ?? globalThis.fetch;
    const url = nflverseUrl("schedules", new Date().getUTCFullYear());

    // ── 3. Fetch + parse defensively ─────────────────────────────────────────
    let csvText: string;
    try {
      const res = await fetchFn(url, {
        headers: { accept: "text/csv" },
        signal: AbortSignal.timeout(NFLVERSE_TIMEOUT_MS),
      });
      if (!res.ok) {
        return unhealthyScoreResult(provider, `http-${res.status}`, rightsSnapshot);
      }
      csvText = await res.text();
    } catch (err) {
      return unhealthyScoreResult(
        provider,
        `fetch-failed:${err instanceof Error ? err.name : "unknown"}`,
        rightsSnapshot,
      );
    }

    let table: CsvTable;
    try {
      table = parseCsv(csvText, { columns: [...COLUMNS] });
    } catch {
      return unhealthyScoreResult(provider, "csv-parse-failed", rightsSnapshot);
    }
    if (table.records.length === 0) {
      return unhealthyScoreResult(provider, "empty-csv", rightsSnapshot);
    }

    const scores = parseNflverseScores(table, daysBack, new Date());
    return {
      provider,
      scores,
      healthy: true,
      rightsSnapshot,
    };
  },
};
