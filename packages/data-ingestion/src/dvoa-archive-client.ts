/**
 * DVOA archive — FTN/Football Outsiders weekly timeseries + historical season
 * finals (local CSV extracts) and the 1983 season-final table via Wayback.
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 *   - dvoa-timeseries-local: 1,993 rows, seasons 2023–2026, 18 columns
 *     (total/off/def/ST DVOA + DAVE).
 *   - dvoa-historical-local: 112 rows (1977–1980 season finals, pre-1981).
 *   - dvoa-fo-finals-local: 1,673 rows from 57 web.archive.org snapshots
 *     (weekly + season-final 1981–2022).
 *   - fo-wayback-dvoa-1983 → https://web.archive.org/web/20210308/
 *     https://footballoutsiders.com/dvoa-ratings/2021/1983-dvoa-ratings-and-commentary :
 *     HTTP 200 (after one 302), 176,257 bytes, full 1983 season-final table
 *     (TOTAL/NON-ADJ DVOA, W-L, OFF/DEF/ST + ranks).
 *     Verified fixture row: 1 | WAS | 37.2% | 38.8% | 14-2 |
 *     24.7% | 1 | -9.5% | 5 | 3.0% | 6.
 *
 * LOCAL CSV NOTE: the extracts live at /tmp/dvoa/*.csv, which is EPHEMERAL.
 * The durable interface here is parseDvoaCsv(); before relying on these rows,
 * copy the CSVs to a durable repo path (out of this task's scope).
 *
 * LEGAL (registry: cleared-with-attribution, DEFAULT ON — no env gate):
 *   - "DVOA data via FTN Fantasy / Football Outsiders."
 *   - "Historical DVOA via FTN Fantasy."
 *   - "DVOA data via Football Outsiders (archived)."
 *   - "1983 DVOA via Football Outsiders (archived)."
 *   - assertIngestible(<id>) runs before any network (getFo1983Final); the CSV
 *     parsers are pure (no network). GET only, no-store fetch.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const DVOA_TIMESERIES_LOCAL_SOURCE_ID = "dvoa-timeseries-local";
export const DVOA_HISTORICAL_LOCAL_SOURCE_ID = "dvoa-historical-local";
export const DVOA_FO_FINALS_LOCAL_SOURCE_ID = "dvoa-fo-finals-local";
export const FO_WAYBACK_DVOA_1983_SOURCE_ID = "fo-wayback-dvoa-1983";

export const DVOA_TIMESERIES_ATTRIBUTION = "DVOA data via FTN Fantasy / Football Outsiders.";
export const DVOA_HISTORICAL_ATTRIBUTION = "Historical DVOA via FTN Fantasy.";
export const DVOA_FO_FINALS_ATTRIBUTION = "DVOA data via Football Outsiders (archived).";
export const FO_WAYBACK_DVOA_1983_ATTRIBUTION = "1983 DVOA via Football Outsiders (archived).";

/** NOTE: local extracts live at /tmp/dvoa/*.csv (ephemeral) — see header. */
export const DVOA_LOCAL_CSV_DIR = "/tmp/dvoa";

export const FO_WAYBACK_DVOA_1983_URL =
  "https://web.archive.org/web/20210308/https://footballoutsiders.com/dvoa-ratings/2021/1983-dvoa-ratings-and-commentary";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class DvoaArchiveError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DvoaArchiveError";
  }
}

/* ---------------- local CSV timeseries ---------------- */

/** One row of the 18-column local DVOA CSV extract. */
export interface DvoaRow {
  readonly season: number | null;
  readonly week: number | null;
  readonly articleDate: string | null;
  readonly team: string;
  readonly variant: string | null;
  readonly rank: number | null;
  /** Raw string form, e.g. "81.5%" (null when absent). */
  readonly totalDvoa: string | null;
  /** Parsed numeric form, e.g. 81.5 (null when absent/unparseable). */
  readonly totalDvoaPct: number | null;
  readonly prevRank: number | null;
  readonly dave: string | null;
  readonly davePct: number | null;
  readonly daveRank: number | null;
  readonly wl: string | null;
  readonly offDvoa: string | null;
  readonly offDvoaPct: number | null;
  readonly offRank: number | null;
  readonly defDvoa: string | null;
  readonly defDvoaPct: number | null;
  readonly defRank: number | null;
  readonly stDvoa: string | null;
  readonly stDvoaPct: number | null;
  readonly stRank: number | null;
  readonly sourceUrl: string | null;
}

/**
 * Tokenize one CSV line, honoring quoted fields (RFC 4180): commas inside
 * double quotes are literal, doubled quotes ("") are an escaped quote.
 */
function tokenizeCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function col(cols: readonly string[], i: number): string {
  return (i >= 0 && i < cols.length ? cols[i] : "") ?? "";
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

function intOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

/** Parse a DVOA percent string like "81.5%" or "-45.6%" to a number. */
function pctOrNull(s: string): number | null {
  const t = s.trim().replace(/%/g, "");
  if (t === "" || t === "-" || t === "–" || t === "—") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Heuristic: first non-empty line whose first field is non-numeric is a header. */
function isHeaderLine(line: string): boolean {
  const first = col(tokenizeCsvLine(line), 0).trim().toLowerCase();
  if (first === "") return false;
  return Number.isNaN(Number(first)) || first.includes("season");
}

/**
 * Parse the 18-column local DVOA CSV into rows.
 * Column order: season, week, articleDate, team, variant, rank, totalDvoa,
 * prevRank, dave, daveRank, wl, offDvoa, offRank, defDvoa, defRank, stDvoa,
 * stRank, sourceUrl.
 */
export function parseDvoaCsv(csvText: string): DvoaRow[] {
  const out: DvoaRow[] = [];
  for (const rawLine of csvText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (isHeaderLine(line)) continue;
    const cols = tokenizeCsvLine(line);
    const totalRaw = col(cols, 6);
    const daveRaw = col(cols, 8);
    const offRaw = col(cols, 11);
    const defRaw = col(cols, 13);
    const stRaw = col(cols, 15);
    out.push({
      season: intOrNull(col(cols, 0)),
      week: intOrNull(col(cols, 1)),
      articleDate: emptyToNull(col(cols, 2)),
      team: col(cols, 3).trim(),
      variant: emptyToNull(col(cols, 4)),
      rank: intOrNull(col(cols, 5)),
      totalDvoa: emptyToNull(totalRaw),
      totalDvoaPct: pctOrNull(totalRaw),
      prevRank: intOrNull(col(cols, 7)),
      dave: emptyToNull(daveRaw),
      davePct: pctOrNull(daveRaw),
      daveRank: intOrNull(col(cols, 9)),
      wl: emptyToNull(col(cols, 10)),
      offDvoa: emptyToNull(offRaw),
      offDvoaPct: pctOrNull(offRaw),
      offRank: intOrNull(col(cols, 12)),
      defDvoa: emptyToNull(defRaw),
      defDvoaPct: pctOrNull(defRaw),
      defRank: intOrNull(col(cols, 14)),
      stDvoa: emptyToNull(stRaw),
      stDvoaPct: pctOrNull(stRaw),
      stRank: intOrNull(col(cols, 16)),
      sourceUrl: emptyToNull(col(cols, 17)),
    });
  }
  return out;
}

/* ---------------- 1983 season-final table (Wayback) ---------------- */

/** One row of the 1983 Football Outsiders season-final DVOA table. */
export interface Dvoa1983Row {
  readonly rank: number;
  readonly team: string;
  readonly totalDvoa: string | null;
  readonly nonAdjDvoa: string | null;
  readonly wl: string | null;
  readonly offDvoa: string | null;
  readonly offRank: number | null;
  readonly defDvoa: string | null;
  readonly defRank: number | null;
  readonly stDvoa: string | null;
  readonly stRank: number | null;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[%.:]/g, "").replace(/\s+/g, " ").trim();
}

interface HtmlTable1983 {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

function parseHtmlTables(html: string): HtmlTable1983[] {
  const tables: HtmlTable1983[] = [];
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
    tables.push({ headers: head, rows: rows.slice(1) });
  }
  return tables;
}

function cellOf(row: readonly string[], i: number): string | null {
  return i >= 0 && i < row.length ? (row[i] ?? null) : null;
}

function find1983Table(tables: readonly HtmlTable1983[]): HtmlTable1983 | null {
  for (const t of tables) {
    const hs = t.headers.map(normHeader);
    if (hs.includes("team") && hs.some((h) => h.includes("dvoa"))) return t;
  }
  return null;
}

interface Col1983 {
  readonly rank: number;
  readonly team: number;
  readonly totalDvoa: number;
  readonly nonAdjDvoa: number;
  readonly wl: number;
  readonly offDvoa: number;
  readonly offRank: number;
  readonly defDvoa: number;
  readonly defRank: number;
  readonly stDvoa: number;
  readonly stRank: number;
}

function map1983Columns(headers: readonly string[]): Col1983 | null {
  let rank = -1;
  let team = -1;
  let totalDvoa = -1;
  let nonAdjDvoa = -1;
  let wl = -1;
  let offDvoa = -1;
  let offRank = -1;
  let defDvoa = -1;
  let defRank = -1;
  let stDvoa = -1;
  let stRank = -1;
  headers.forEach((h, i) => {
    const n = normHeader(h);
    const toks = n.split(" ");
    if ((n === "rank" || n === "rk") && rank === -1) rank = i;
    else if (n === "team" && team === -1) team = i;
    else if (n === "off rk" || n === "off rank" || n === "offense rank") offRank = i;
    else if (n === "def rk" || n === "def rank" || n === "defense rank") defRank = i;
    else if (n === "st rk" || n === "st rank" || n === "special rk" || n === "special rank") stRank = i;
    else if (n.includes("dvoa")) {
      if ((toks.includes("non-adj") || toks.includes("nonadj")) && nonAdjDvoa === -1) nonAdjDvoa = i;
      else if (toks.includes("total") && totalDvoa === -1) totalDvoa = i;
      else if ((toks.includes("off") || toks.includes("offense")) && offDvoa === -1) offDvoa = i;
      else if ((toks.includes("def") || toks.includes("defense")) && defDvoa === -1) defDvoa = i;
      else if ((toks.includes("st") || toks.includes("special")) && stDvoa === -1) stDvoa = i;
    } else if ((n === "w-l" || n === "w/l" || n.includes("record")) && wl === -1) wl = i;
  });
  if (rank === -1 || team === -1) return null;
  return { rank, team, totalDvoa, nonAdjDvoa, wl, offDvoa, offRank, defDvoa, defRank, stDvoa, stRank };
}

/** Parse the 1983 season-final table from page HTML. Pure: exported for testing. */
export function parseDvoa1983Table(html: string): Dvoa1983Row[] | null {
  const table = find1983Table(parseHtmlTables(html));
  if (!table) return null;
  const cols = map1983Columns(table.headers);
  if (!cols) return null;
  const out: Dvoa1983Row[] = [];
  for (const row of table.rows) {
    const rankRaw = cellOf(row, cols.rank);
    const teamRaw = cellOf(row, cols.team);
    if (rankRaw === null || teamRaw === null) continue;
    const rank = intOrNull(rankRaw);
    const team = teamRaw.trim();
    if (rank === null || team === "") continue;
    out.push({
      rank,
      team,
      totalDvoa: emptyToNull(cellOf(row, cols.totalDvoa) ?? ""),
      nonAdjDvoa: emptyToNull(cellOf(row, cols.nonAdjDvoa) ?? ""),
      wl: emptyToNull(cellOf(row, cols.wl) ?? ""),
      offDvoa: emptyToNull(cellOf(row, cols.offDvoa) ?? ""),
      offRank: intOrNull(cellOf(row, cols.offRank) ?? ""),
      defDvoa: emptyToNull(cellOf(row, cols.defDvoa) ?? ""),
      defRank: intOrNull(cellOf(row, cols.defRank) ?? ""),
      stDvoa: emptyToNull(cellOf(row, cols.stDvoa) ?? ""),
      stRank: intOrNull(cellOf(row, cols.stRank) ?? ""),
    });
  }
  return out;
}

export class DvoaArchiveClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /**
   * 1983 Football Outsiders season-final DVOA table via the Wayback snapshot.
   * Returns null when the page carries no parseable DVOA table. Throws
   * DvoaArchiveError on HTTP failure.
   */
  async getFo1983Final(): Promise<Dvoa1983Row[] | null> {
    assertIngestible(FO_WAYBACK_DVOA_1983_SOURCE_ID);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(FO_WAYBACK_DVOA_1983_URL, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new DvoaArchiveError(`DVOA 1983 archive HTTP ${res.status}`, res.status);
      const html = await res.text();
      return parseDvoa1983Table(html);
    } finally {
      clearTimeout(timer);
    }
  }
}
