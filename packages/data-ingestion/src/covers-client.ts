/**
 * Covers — season odds history archive + live NFL odds comparison.
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 *   - https://www.covers.com/sportsoddshistory/nfl-game-season/?y={season} → HTTP 200,
 *     336 season data rows.
 *   - https://www.covers.com/sport/football/nfl/odds → HTTP 200, ~2.9 MB, 431 "moneyline"
 *     mentions (ML/spread/total across books + consensus).
 *
 * Registry ids: "covers-odds-history", "covers-live-odds" — verdict
 * cleared-with-attribution for BOTH, BUT redistribution/download restricted per Covers
 * Terms: facts-as-inputs only, never re-expose as a feed. Env-gated OFF (COVERS_INGEST);
 * stays OFF until commercial reuse is confirmed.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const COVERS_ODDS_HISTORY_SOURCE_ID = "covers-odds-history";
export const COVERS_LIVE_ODDS_SOURCE_ID = "covers-live-odds";
export const COVERS_BASE = "https://www.covers.com";
/** Exact attributionText from the source registry for "covers-odds-history". */
export const COVERS_ODDS_HISTORY_ATTRIBUTION = "Historical odds via Covers.";
/** Exact attributionText from the source registry for "covers-live-odds". */
export const COVERS_LIVE_ODDS_ATTRIBUTION = "Live odds via Covers.";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isCoversIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "COVERS_INGEST");
}

export class CoversError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "CoversError";
  }
}

export interface CoversSeasonHistoryRow {
  readonly week: string;
  readonly favorites: string | null;
  readonly homeTeams: string | null;
  readonly homeFavorites: string | null;
  readonly homeUnderdogs: string | null;
  readonly overUnders: string | null;
}

export interface CoversLiveBookOdds {
  readonly book: string;
  readonly moneyline: string | null;
  readonly spread: string | null;
  readonly total: string | null;
}

export interface CoversLiveGame {
  readonly matchup: string;
  readonly consensus: string | null;
  readonly books: readonly CoversLiveBookOdds[];
}

/** Minimal regex HTML table reader. No DOM parser in this package; keep it lenient. */
interface ParsedTable {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableRe = /<table[\s\S]*?>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const inner = typeof tm[1] === "string" ? tm[1] : "";
    const rowRe = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
    const allRows: string[][] = [];
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(inner)) !== null) {
      const rowInner = typeof rm[1] === "string" ? rm[1] : "";
      const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
      const cells: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rowInner)) !== null) {
        cells.push(stripTags(typeof cm[2] === "string" ? cm[2] : ""));
      }
      allRows.push(cells);
    }
    const first = allRows[0];
    const headers = first ?? [];
    const rows = allRows.slice(1);
    tables.push({ headers, rows });
  }
  return tables;
}

function colIndex(headers: readonly string[], matchers: readonly RegExp[]): number {
  for (const re of matchers) {
    const idx = headers.findIndex((h) => re.test(h.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cellAt(row: readonly string[], idx: number): string | null {
  if (idx < 0) return null;
  const v = row[idx];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Cells read like "Favorites 13-3 (81.3%)" / "O/U 9-7 (56.3%)": strip the leading
 * label word(s) so the stored value is the record itself ("13-3 (81.3%)").
 * Matches the full header first ("Home Teams 8-8..." -> "8-8"), then falls back
 * to the header's first word.
 */
function stripLeadingLabel(cell: string, header: string): string | null {
  const t = cell.trim();
  if (!t) return null;
  const low = t.toLowerCase();
  const full = header.trim().toLowerCase();
  if (full.length > 0 && low.startsWith(full + " ")) {
    const rest = t.slice(header.trim().length).trim();
    return rest.length > 0 ? rest : null;
  }
  const firstWord = full.split(/\s+/)[0] ?? "";
  if (firstWord.length > 0 && low.startsWith(firstWord + " ")) {
    const rest = t.slice(firstWord.length).trim();
    return rest.length > 0 ? rest : null;
  }
  return t;
}

/** Season history: map header text to the six known columns, then read rows. */
function parseSeasonHistory(html: string): CoversSeasonHistoryRow[] {
  const out: CoversSeasonHistoryRow[] = [];
  for (const table of extractTables(html)) {
    const h = table.headers.map((x) => x.toLowerCase());
    const weekIdx = colIndex(h, [/^week\b/]);
    const homeFavIdx = colIndex(h, [/home favorite/]);
    const homeDogIdx = colIndex(h, [/home underdog/]);
    // "Favorites" must not land on the "Home Favorites" column.
    const favIdx = h.findIndex((x) => !x.includes("home") && /\bfavorites?\b/.test(x));
    const homeTeamsIdx = colIndex(h, [/home team/]);
    const ouIdx = colIndex(h, [/\bo\/u\b/, /over[\s/]*under/, /\btotals?\b/]);
    if (weekIdx < 0 && favIdx < 0 && ouIdx < 0) continue;
    const favLabel = h[favIdx] ?? "";
    const ouLabel = h[ouIdx] ?? "";
    const homeTeamsLabel = h[homeTeamsIdx] ?? "";
    const homeFavLabel = h[homeFavIdx] ?? "";
    const homeDogLabel = h[homeDogIdx] ?? "";
    for (const row of table.rows) {
      const week = cellAt(row, weekIdx);
      if (!week) continue;
      out.push({
        week,
        favorites: cleanStatCell(row, favIdx, favLabel),
        homeTeams: cleanStatCell(row, homeTeamsIdx, homeTeamsLabel),
        homeFavorites: cleanStatCell(row, homeFavIdx, homeFavLabel),
        homeUnderdogs: cleanStatCell(row, homeDogIdx, homeDogLabel),
        overUnders: cleanStatCell(row, ouIdx, ouLabel),
      });
    }
  }
  return out;
}

function cleanStatCell(row: readonly string[], idx: number, header: string): string | null {
  const cell = cellAt(row, idx);
  return cell ? stripLeadingLabel(cell, header) : null;
}

/** Live odds: one row per book; an empty matchup cell inherits the previous row's game. */
function parseLiveOdds(html: string): CoversLiveGame[] {
  const games: CoversLiveGame[] = [];
  for (const table of extractTables(html)) {
    const h = table.headers;
    const matchupIdx = colIndex(h, [/matchup/, /\bgame\b/, /\bteams?\b/]);
    const consensusIdx = colIndex(h, [/consensus/]);
    const bookIdx = colIndex(h, [/sportsbook/, /\bbook\b/, /\bsite\b/]);
    const mlIdx = colIndex(h, [/moneyline/, /\bml\b/]);
    const spreadIdx = colIndex(h, [/spread/, /point spread/]);
    const totalIdx = colIndex(h, [/\btotal\b/, /\bo\/u\b/]);
    if (matchupIdx < 0 && bookIdx < 0) continue;
    let current: { matchup: string; consensus: string | null; books: CoversLiveBookOdds[] } | null = null;
    for (const row of table.rows) {
      const matchup = cellAt(row, matchupIdx);
      if (matchup) {
        current = { matchup, consensus: cellAt(row, consensusIdx), books: [] };
        games.push(current);
      }
      if (!current) continue;
      const book = cellAt(row, bookIdx);
      if (!book) continue;
      current.books.push({
        book,
        moneyline: cellAt(row, mlIdx),
        spread: cellAt(row, spreadIdx),
        total: cellAt(row, totalIdx),
      });
    }
  }
  return games;
}

export class CoversClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async fetchHtml(url: string, sourceId: string): Promise<string> {
    assertIngestible(sourceId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new CoversError(`Covers HTTP ${res.status}`, res.status);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Season odds history (e.g. "Week 1: Favorites 13-3 (81.3%), O/U 9-7 (56.3%)").
   * Returns null when the ingest flag is off. Empty array when no table is found.
   */
  async getOddsHistory(season: number): Promise<CoversSeasonHistoryRow[] | null> {
    if (!isCoversIngestEnabled(this.env)) return null;
    const html = await this.fetchHtml(
      `${COVERS_BASE}/sportsoddshistory/nfl-game-season/?y=${encodeURIComponent(String(season))}`,
      COVERS_ODDS_HISTORY_SOURCE_ID,
    );
    return parseSeasonHistory(html);
  }

  /**
   * Live NFL odds comparison. Returns null when the ingest flag is off.
   * Empty array when no odds table is found — the live page is ~2.9 MB, so the
   * parser stays lenient and skips tables it cannot map.
   */
  async getLiveOdds(): Promise<CoversLiveGame[] | null> {
    if (!isCoversIngestEnabled(this.env)) return null;
    const html = await this.fetchHtml(
      `${COVERS_BASE}/sport/football/nfl/odds`,
      COVERS_LIVE_ODDS_SOURCE_ID,
    );
    return parseLiveOdds(html);
  }
}
