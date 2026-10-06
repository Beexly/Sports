/**
 * TeamRankings NFL power ratings + win trends (HTML scrape, no official API).
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 *   - teamrankings-ratings → https://www.teamrankings.com/nfl/ : HTTP 200,
 *     321,517 bytes. First HTML table carries Rank / Rating / Team headers
 *     plus projected W/L, make-playoffs % and win-Super-Bowl % columns.
 *     Verified fixture row: Buffalo, rank 1, rating 5.8, proj 11.7–5.3,
 *     playoffs 88.1%, SB 11.6%.
 *   - teamrankings-trends → https://www.teamrankings.com/nfl/trends : HTTP 200,
 *     315,324 bytes, team win-trends table (trend columns vary by week, so the
 *     parser is generic: team + string[] values).
 *
 * LEGAL (registry: cleared-with-attribution, DEFAULT ON — no env gate):
 *   - "Power ratings via TeamRankings." / "Win trends via TeamRankings."
 *   - Public free pages, no explicit API terms; scrape politely
 *     (rate limit: weekly in-season; cache 24h — enforced by the caller).
 *   - assertIngestible(<id>) runs before any network; GET only, no-store fetch.
 *
 * Parsing: generic regex table parser (no DOM lib) — <th> header row, <tr>/<td>
 * rows, tags stripped from cell text, numbers parsed with % stripped.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const TEAMRANKINGS_RATINGS_SOURCE_ID = "teamrankings-ratings";
export const TEAMRANKINGS_TRENDS_SOURCE_ID = "teamrankings-trends";
export const TEAMRANKINGS_BASE = "https://www.teamrankings.com/nfl";
export const TEAMRANKINGS_RATINGS_ATTRIBUTION = "Power ratings via TeamRankings.";
export const TEAMRANKINGS_TRENDS_ATTRIBUTION = "Win trends via TeamRankings.";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class TeamRankingsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TeamRankingsError";
  }
}

/** One row of the NFL power-ratings table. */
export interface TrRating {
  readonly rank: number;
  readonly rating: number | null;
  readonly team: string;
  readonly projW: number | null;
  readonly projL: number | null;
  readonly playoffsPct: number | null;
  readonly winSbPct: number | null;
}

/** One row of the trends table: team plus the (week-varying) trend columns as strings. */
export interface TrTrendRow {
  readonly team: string;
  readonly values: readonly string[];
}

/* ---------------- HTML helpers ---------------- */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(/%/g, "").replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "–" || cleaned === "—" || /^n\/a$/i.test(cleaned)) {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface HtmlTable {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** Parse every <table> in the page into header rows + data rows (regex only). */
export function parseHtmlTables(html: string): HtmlTable[] {
  const tables: HtmlTable[] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const body = tm[1] ?? "";
    const rows: string[][] = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(body)) !== null) {
      const rowHtml = rm[1] ?? "";
      const cellRe = /<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi;
      const cells: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rowHtml)) !== null) {
        cells.push(stripTags(cm[2] ?? ""));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length === 0) continue;
    const head = rows[0];
    if (!head) continue;
    const rest = rows.slice(1);
    tables.push({ headers: head, rows: rest });
  }
  return tables;
}

/** Normalize a header for column matching: lowercased, punctuation stripped. */
function normHeader(h: string): string {
  return h.toLowerCase().replace(/[%.:]/g, "").replace(/\s+/g, " ").trim();
}

function findRatingsTable(tables: readonly HtmlTable[]): HtmlTable | null {
  for (const t of tables) {
    const hs = new Set(t.headers.map(normHeader));
    if (hs.has("rank") && hs.has("rating") && hs.has("team")) return t;
  }
  return null;
}

interface RatingColumnMap {
  readonly rank: number;
  readonly team: number;
  readonly rating: number;
  readonly projW: number;
  readonly projL: number;
  readonly playoffsPct: number;
  readonly winSbPct: number;
}

/** Match the ratings columns by header text; required: rank/team/rating. */
function mapRatingColumns(headers: readonly string[]): RatingColumnMap | null {
  let rank = -1;
  let team = -1;
  let rating = -1;
  let projW = -1;
  let projL = -1;
  let playoffsPct = -1;
  let winSbPct = -1;
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (n === "rank") rank = i;
    else if (n === "team") team = i;
    else if (n === "rating") rating = i;
    else if (n === "proj w" || n === "projected w") projW = i;
    else if (n === "proj l" || n === "projected l") projL = i;
    else if (n.includes("playoff") && playoffsPct === -1) playoffsPct = i;
    else if ((n.includes("sb") || n.includes("super bowl")) && winSbPct === -1) winSbPct = i;
  });
  if (rank === -1 || team === -1 || rating === -1) return null;
  return { rank, team, rating, projW, projL, playoffsPct, winSbPct };
}

function cellOf(row: readonly string[], i: number): string | null {
  return i >= 0 && i < row.length ? (row[i] ?? null) : null;
}

/** Parse power-ratings rows from page HTML. Pure: exported for testing. */
export function parseTrRatings(html: string): TrRating[] {
  const table = findRatingsTable(parseHtmlTables(html));
  if (!table) return [];
  const cols = mapRatingColumns(table.headers);
  if (!cols) return [];
  const out: TrRating[] = [];
  for (const row of table.rows) {
    const rankRaw = cellOf(row, cols.rank);
    const teamRaw = cellOf(row, cols.team);
    if (rankRaw === null || teamRaw === null) continue;
    const rank = parseNum(rankRaw);
    const team = teamRaw.trim();
    if (rank === null || !Number.isInteger(rank) || team === "") continue;
    out.push({
      rank,
      team,
      rating: parseNum(cellOf(row, cols.rating) ?? ""),
      projW: parseNum(cellOf(row, cols.projW) ?? ""),
      projL: parseNum(cellOf(row, cols.projL) ?? ""),
      playoffsPct: parseNum(cellOf(row, cols.playoffsPct) ?? ""),
      winSbPct: parseNum(cellOf(row, cols.winSbPct) ?? ""),
    });
  }
  return out;
}

/** Parse the generic trends table from page HTML. Pure: exported for testing. */
export function parseTrTrends(html: string): TrTrendRow[] {
  const tables = parseHtmlTables(html);
  const table = tables[0];
  if (!table) return [];
  const teamIdx = table.headers.map(normHeader).findIndex((h) => h === "team");
  const idx = teamIdx === -1 ? 0 : teamIdx;
  const out: TrTrendRow[] = [];
  for (const row of table.rows) {
    const teamRaw = cellOf(row, idx);
    if (teamRaw === null) continue;
    const team = teamRaw.trim();
    if (team === "") continue;
    const values: string[] = [];
    row.forEach((c, i) => {
      if (i !== idx) values.push(c);
    });
    out.push({ team, values });
  }
  return out;
}

/* ---------------- client ---------------- */

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) throw new TeamRankingsError(`TeamRankings HTTP ${res.status}`, res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export class TeamRankingsClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /** NFL power ratings table from the TeamRankings homepage. */
  async getRatings(): Promise<TrRating[]> {
    assertIngestible(TEAMRANKINGS_RATINGS_SOURCE_ID);
    const html = await fetchText(`${TEAMRANKINGS_BASE}/`, this.fetchImpl);
    return parseTrRatings(html);
  }

  /** Team win-trends table; trend columns vary by week, returned generically. */
  async getTrends(): Promise<TrTrendRow[]> {
    assertIngestible(TEAMRANKINGS_TRENDS_SOURCE_ID);
    const html = await fetchText(`${TEAMRANKINGS_BASE}/trends`, this.fetchImpl);
    return parseTrTrends(html);
  }
}
