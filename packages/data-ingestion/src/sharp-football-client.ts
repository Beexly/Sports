/**
 * Sharp Football Analysis team stats pages (sharpfootballanalysis.com).
 *
 * NOTE: this is a DIFFERENT company from SharpAPI (api.sharpapi.io, the paid
 * odds vendor behind sharp-api-client.ts). Sharp Football Analysis publishes
 * free NFL team stat tables at /stats-nfl/<page>/.
 *
 * HOW (regex HTML table scrape, no DOM library):
 *   Each page carries one 32-row table whose header row names the team column
 *   ("Team" or "Offense"). The parser takes the first table with such a
 *   header, normalizes each column header to a snake_case metric key
 *   ("Play Clock Used" -> play_clock_used, "EPA/Play" -> epa_play), and reads
 *   every other cell as a number ("%"/commas stripped; dash or empty -> null).
 *   The team column is found by header name (the pace page leads with a Rank
 *   column, so the team cell is not always first).
 *
 * VERIFIED LIVE 2026-09-18: all 7 pages returned HTTP 200 with 32 team rows
 * each. Registry ids wired here (all verdict use-with-caution):
 *   sharp-football-pace, sharp-football-offensive-tendencies,
 *   sharp-football-personnel, sharp-football-coverage,
 *   sharp-football-offensive-line, sharp-football-defensive-line,
 *   sharp-football-offensive-efficiency.
 *
 * LEGAL: the Sharp Football Analysis terms are restrictive (no reproducing,
 * storing, or downloading site content). This client extracts numeric facts
 * only and never copies prose. Default OFF behind SHARP_FOOTBALL_INGEST.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const SHARP_FOOTBALL_BASE = "https://www.sharpfootballanalysis.com/stats-nfl";
export const SHARP_FOOTBALL_ATTRIBUTION = "Team stats via Sharp Football Analysis.";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

/** Registry id -> page path under SHARP_FOOTBALL_BASE. */
export const PAGE_PATHS = {
  "sharp-football-pace": "nfl-team-pace-stats",
  "sharp-football-offensive-tendencies": "nfl-offensive-tendencies-stats",
  "sharp-football-personnel": "nfl-offensive-personnel",
  "sharp-football-coverage": "nfl-coverage-schemes",
  "sharp-football-offensive-line": "nfl-offensive-line-stats",
  "sharp-football-defensive-line": "nfl-defensive-line-stats",
  "sharp-football-offensive-efficiency": "nfl-offensive-stats",
} as const;

export type SharpFootballSourceId = keyof typeof PAGE_PATHS;

export function isSharpFootballIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "SHARP_FOOTBALL_INGEST");
}

export class SharpFootballError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SharpFootballError";
  }
}

/** One team row: the team name plus numeric metrics keyed by normalized column header. */
export interface SharpFootballRow {
  readonly team: string;
  readonly metrics: Record<string, number | null>;
}

export interface SharpFootballPage {
  readonly sourceId: SharpFootballSourceId;
  readonly path: string;
  readonly seasonLabel: string | null;
  readonly rows: SharpFootballRow[];
}

const TABLE_RE = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
const ROW_RE = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const HEADER_CELL_RE = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
const DATA_CELL_RE = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

/**
 * Tokens that mark a missing value on these pages (plain, en, and em dash).
 * Written as escapes so the source never carries a literal dash character.
 */
const MISSING_TOKENS = new Set(["", "-", "\u2013", "\u2014"]);

function cellText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

/** "Play Clock Used" -> "play_clock_used", "EPA/Play" -> "epa_play", "11" -> "11". */
function headerKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isTeamHeaderCell(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "team" || t === "offense" || t === "defense";
}

/** Numeric facts only: strips %, commas, and whitespace; dash or empty -> null. */
function parseMetricCell(raw: string): number | null {
  const clean = raw
    .trim()
    .replace(/[% ,]/g, "")
    .trim();
  if (MISSING_TOKENS.has(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** Indexed access under noUncheckedIndexedAccess yields string | undefined; normalize to string. */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function extractCells(rowHtml: string, cellRe: RegExp): string[] {
  const out: string[] = [];
  cellRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(rowHtml)) !== null) {
    out.push(cellText(typeof m[1] === "string" ? m[1] : ""));
  }
  return out;
}

function buildRow(headers: string[], teamIndex: number, cells: string[]): SharpFootballRow {
  const team = asString(cells[teamIndex]).trim();
  const metrics: Record<string, number | null> = {};
  for (let i = 0; i < headers.length; i++) {
    if (i === teamIndex) continue;
    const key = headerKey(asString(headers[i]));
    if (key.length === 0) continue;
    metrics[key] = parseMetricCell(asString(cells[i]));
  }
  return { team, metrics };
}

interface ParsedTable {
  headers: string[];
  teamIndex: number;
  rows: SharpFootballRow[];
}

/**
 * Parses the first <table> whose header row names the team column
 * ("Team"/"Offense"/"Defense"). Returns null when no such table exists,
 * which the caller turns into an empty page rather than an error.
 */
function parseTable(tableHtml: string): ParsedTable | null {
  const rowInners: string[] = [];
  ROW_RE.lastIndex = 0;
  let rm: RegExpExecArray | null;
  while ((rm = ROW_RE.exec(tableHtml)) !== null) {
    rowInners.push(typeof rm[1] === "string" ? rm[1] : "");
  }

  let headerIdx = -1;
  let headers: string[] = [];
  let teamIndex = -1;
  for (let i = 0; i < rowInners.length; i++) {
    const rowHtml = asString(rowInners[i]);
    const ths = extractCells(rowHtml, HEADER_CELL_RE);
    if (ths.length === 0) continue;
    const idx = ths.findIndex(isTeamHeaderCell);
    if (idx >= 0) {
      headerIdx = i;
      headers = ths;
      teamIndex = idx;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const rows: SharpFootballRow[] = [];
  for (let i = headerIdx + 1; i < rowInners.length; i++) {
    const rowHtml = asString(rowInners[i]);
    const tds = extractCells(rowHtml, DATA_CELL_RE);
    if (tds.length === 0) continue;
    rows.push(buildRow(headers, teamIndex, tds));
  }
  return { headers, teamIndex, rows };
}

/** Best-effort season label ("Through Week 2", "2026 season"); null when not found. */
function extractSeasonLabel(html: string): string | null {
  const head = html.slice(0, 20_000);
  const through = /through\s+week\s+(\d{1,2})/i.exec(head);
  const week = through && typeof through[1] === "string" ? through[1] : null;
  if (week) return `Through Week ${week}`;
  const season = /(20\d{2})\s+season/i.exec(head);
  const year = season && typeof season[1] === "string" ? season[1] : null;
  if (year) return `${year} season`;
  return null;
}

function parseSharpFootballHtml(html: string): { seasonLabel: string | null; rows: SharpFootballRow[] } {
  const seasonLabel = extractSeasonLabel(html);
  TABLE_RE.lastIndex = 0;
  let tm: RegExpExecArray | null;
  while ((tm = TABLE_RE.exec(html)) !== null) {
    const tableHtml = typeof tm[1] === "string" ? tm[1] : "";
    const parsed = parseTable(tableHtml);
    if (parsed) return { seasonLabel, rows: parsed.rows };
  }
  return { seasonLabel, rows: [] };
}

export class SharpFootballClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * Fetches one stats page and parses its team table. Returns null when the
   * ingest flag is off. Throws (no network) for an unregistered sourceId or
   * on HTTP failure. Numeric facts only, never prose.
   */
  async getPage(sourceId: SharpFootballSourceId): Promise<SharpFootballPage | null> {
    if (!isSharpFootballIngestEnabled(this.env)) return null;
    assertIngestible(sourceId);
    const path = PAGE_PATHS[sourceId];
    const url = `${SHARP_FOOTBALL_BASE}/${path}/`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new SharpFootballError(`Sharp Football HTTP ${res.status} (${sourceId})`, res.status);
      const html = await res.text();
      const { seasonLabel, rows } = parseSharpFootballHtml(html);
      return { sourceId, path, seasonLabel, rows };
    } finally {
      clearTimeout(timer);
    }
  }
}
