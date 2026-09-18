/**
 * SpreadSpoke client — historical NFL scores, lines, and weather from the static CSV.
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200 on
 * https://raw.githubusercontent.com/tobycrabtree/spreadspoke/master/spreadspoke_scores.csv
 * — 14,164 rows, seasons 1966–2025 (11,671 rows with spreads); earliest row
 * 9/2/1966 Dolphins vs Raiders. Static snapshot: fetch rarely, cache locally.
 *
 * REGISTRY ID: "spreadspoke-scores", verdict "use-with-caution".
 *
 * LEGAL NOTE: the source repo posts NO license (all rights reserved by
 * default); terms are unclear. Default OFF behind SPREADSPOKE_INGEST; every
 * call asserts registry ingestibility first. GET only, 15s timeout.
 * Attribution: "Historical scores and lines via SpreadSpoke."
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const SPREADSPOKE_SCORES_SOURCE_ID = "spreadspoke-scores";
export const SPREADSPOKE_BASE = "https://raw.githubusercontent.com/tobycrabtree/spreadspoke/master";
export const SPREADSPOKE_ATTRIBUTION = "Historical scores and lines via SpreadSpoke.";
const USER_AGENT = "GSE-DataIngestion/1.0";
const TIMEOUT_MS = 15_000;

export function isSpreadSpokeIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "SPREADSPOKE_INGEST");
}

export class SpreadSpokeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SpreadSpokeError";
  }
}

export interface SpreadSpokeGame {
  readonly scheduleDate: string | null;
  readonly season: number | null;
  readonly week: number | null;
  readonly playoff: boolean | null;
  readonly teamHome: string | null;
  readonly scoreHome: number | null;
  readonly scoreAway: number | null;
  readonly teamAway: string | null;
  readonly teamFavoriteId: string | null;
  readonly spreadFavorite: number | null;
  readonly overUnderLine: number | null;
  readonly stadium: string | null;
  readonly stadiumNeutral: boolean | null;
  readonly weatherTemperature: number | null;
  readonly weatherWindMph: number | null;
  readonly weatherHumidity: number | null;
  readonly weatherDetail: string | null;
}

function strOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function boolOrNull(value: string): boolean | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "1") return true;
  if (trimmed === "false" || trimmed === "0") return false;
  return null;
}

/**
 * Parse one CSV line honoring quoted fields: commas inside double quotes do
 * not split, and "" inside quotes is an escaped quote.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (line.charAt(i + 1) === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
    i += 1;
  }
  fields.push(current);
  return fields;
}

/** Map a (lowercased) header name to the interface field, or null when unknown. */
function fieldForHeader(header: string): keyof SpreadSpokeGame | null {
  switch (header.trim().toLowerCase()) {
    case "schedule_date":
      return "scheduleDate";
    case "schedule_season":
      return "season";
    case "schedule_week":
      return "week";
    case "schedule_playoff":
      return "playoff";
    case "team_home":
      return "teamHome";
    case "score_home":
      return "scoreHome";
    case "score_away":
      return "scoreAway";
    case "team_away":
      return "teamAway";
    case "team_favorite_id":
      return "teamFavoriteId";
    case "spread_favorite":
      return "spreadFavorite";
    case "over_under_line":
      return "overUnderLine";
    case "stadium":
      return "stadium";
    case "stadium_neutral":
      return "stadiumNeutral";
    case "weather_temperature":
      return "weatherTemperature";
    case "weather_wind_mph":
      return "weatherWindMph";
    case "weather_humidity":
      return "weatherHumidity";
    case "weather_detail":
      return "weatherDetail";
    default:
      return null;
  }
}

function asGame(
  headerFields: readonly (keyof SpreadSpokeGame | null)[],
  rawFields: readonly string[],
): SpreadSpokeGame | null {
  const game: { -readonly [K in keyof SpreadSpokeGame]?: SpreadSpokeGame[K] } = {};
  for (let i = 0; i < headerFields.length; i += 1) {
    const field = headerFields[i];
    if (field === null || field === undefined) continue;
    const raw = i < rawFields.length ? (rawFields[i] as string) : "";
    switch (field) {
      case "scheduleDate":
      case "teamHome":
      case "teamAway":
      case "teamFavoriteId":
      case "stadium":
      case "weatherDetail":
        game[field] = strOrNull(raw);
        break;
      case "season":
      case "week":
      case "scoreHome":
      case "scoreAway":
      case "spreadFavorite":
      case "overUnderLine":
      case "weatherTemperature":
      case "weatherWindMph":
      case "weatherHumidity":
        game[field] = numOrNull(raw);
        break;
      case "playoff":
      case "stadiumNeutral":
        game[field] = boolOrNull(raw);
        break;
      default:
        break;
    }
  }
  // Skip garbage rows: a real game row always names the teams and the date.
  if (game.teamHome === null && game.teamAway === null && game.scheduleDate === null) return null;
  return {
    scheduleDate: game.scheduleDate ?? null,
    season: game.season ?? null,
    week: game.week ?? null,
    playoff: game.playoff ?? null,
    teamHome: game.teamHome ?? null,
    scoreHome: game.scoreHome ?? null,
    scoreAway: game.scoreAway ?? null,
    teamAway: game.teamAway ?? null,
    teamFavoriteId: game.teamFavoriteId ?? null,
    spreadFavorite: game.spreadFavorite ?? null,
    overUnderLine: game.overUnderLine ?? null,
    stadium: game.stadium ?? null,
    stadiumNeutral: game.stadiumNeutral ?? null,
    weatherTemperature: game.weatherTemperature ?? null,
    weatherWindMph: game.weatherWindMph ?? null,
    weatherHumidity: game.weatherHumidity ?? null,
    weatherDetail: game.weatherDetail ?? null,
  };
}

function parseSpreadSpokeCsv(text: string): SpreadSpokeGame[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const headerLine = lines[0] as string;
  const headerFields = parseCsvLine(headerLine).map(fieldForHeader);
  if (!headerFields.some((field) => field !== null)) return [];
  const out: SpreadSpokeGame[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] as string;
    const game = asGame(headerFields, parseCsvLine(line));
    if (game) out.push(game);
  }
  return out;
}

export class SpreadSpokeClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /** All historical games in the CSV. Null when the ingest flag is off. */
  async getScores(): Promise<SpreadSpokeGame[] | null> {
    if (!isSpreadSpokeIngestEnabled(this.env)) return null;
    assertIngestible(SPREADSPOKE_SCORES_SOURCE_ID);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${SPREADSPOKE_BASE}/spreadspoke_scores.csv`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/csv" },
        signal: controller.signal,
      });
      if (!res.ok) throw new SpreadSpokeError(`SpreadSpoke HTTP ${res.status}`, res.status);
      return parseSpreadSpokeCsv(await res.text());
    } finally {
      clearTimeout(timer);
    }
  }
}
