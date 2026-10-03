/**
 * 4for4 fantasy football cheat sheets (registry id "fourforfour-cheatsheet").
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200, 9 tables (overall/positional/
 * superflex/flex/K/DEF; page stamped 2026-09-09).
 *
 * DEFAULT ON (no env gate): public free page, robots.txt allows the path, no
 * login required, registry verdict "cleared-with-attribution" with genuinely
 * permissive terms. We still call assertIngestible("fourforfour-cheatsheet")
 * before any network, and public surfaces must carry the attribution text
 * ("Rankings via 4for4.").
 *
 * HOW: GET /{variant}/{season} (variant = standard | espn | fanduel),
 * generic regex table parser (no DOM lib): section title from <caption> or
 * the nearest preceding heading, headers from <th>, rows from <td>, columns
 * mapped by header name case-insensitively. GET only, 15s timeout,
 * User-Agent "GSE-DataIngestion/1.0". Pages with no parseable tables ->
 * empty sections, never a throw.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const FOURFORFOUR_SOURCE_ID = "fourforfour-cheatsheet";
export const FOURFORFOUR_BASE = "https://www.4for4.com/fantasy-football-cheat-sheet";
export const FOURFORFOUR_ATTRIBUTION = "Rankings via 4for4.";

export type CheatsheetVariant = "standard" | "espn" | "fanduel";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class FourforFourError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FourforFourError";
  }
}

export interface CheatsheetEntry {
  readonly rank: number;
  readonly pos: string;
  readonly player: string;
  readonly bye: number | null;
  readonly ffPts: number | null;
  readonly adp: number | null;
}

export interface CheatsheetSection {
  readonly title: string;
  readonly entries: readonly CheatsheetEntry[];
}

export interface CheatsheetResult {
  readonly sections: readonly CheatsheetSection[];
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

type ColumnKey = "rank" | "pos" | "player" | "bye" | "ffPts" | "adp";

/** Map a <th> label to a column key, case/punctuation-insensitive. */
function headerKey(label: string): ColumnKey | null {
  const k = label.toLowerCase().replace(/[^a-z]/g, "");
  if (k === "rank" || k === "rk") return "rank";
  if (k === "pos" || k === "position") return "pos";
  if (k === "player" || k === "name") return "player";
  if (k === "bye" || k === "byeweek") return "bye";
  if (k === "ffpts" || k === "proj" || k === "projpts" || k === "ffpoints") return "ffPts";
  if (k === "adp") return "adp";
  return null;
}

/** Section title: <caption> first, else the nearest preceding heading, else a fallback. */
function extractTitle(html: string, tableStart: number, tableBody: string): string {
  const cap = /<caption\b[^>]*>([\s\S]*?)<\/caption>/i.exec(tableBody);
  const capRaw = cap?.[1];
  if (capRaw !== undefined) {
    const t = stripTags(capRaw);
    if (t) return t;
  }
  const before = html.slice(Math.max(0, tableStart - 2000), tableStart);
  const heads = [...before.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  const last = heads[heads.length - 1];
  const headRaw = last?.[1];
  if (headRaw !== undefined) {
    const t = stripTags(headRaw);
    if (t) return t;
  }
  return "cheatsheet";
}

function buildEntry(colMap: readonly (ColumnKey | null)[], cells: readonly string[]): CheatsheetEntry | null {
  const get = (key: ColumnKey): string | null => {
    for (let i = 0; i < colMap.length; i++) {
      if (colMap[i] === key) {
        const v = cells[i];
        return v === undefined ? null : v;
      }
    }
    return null;
  };
  const rankRaw = get("rank");
  const pos = get("pos");
  const player = get("player");
  const rank = rankRaw === null ? null : intOrNull(rankRaw);
  if (rank === null || !pos || !player) return null;
  return {
    rank,
    pos,
    player,
    bye: intOrNull(get("bye")),
    ffPts: numOrNull(get("ffPts")),
    adp: numOrNull(get("adp")),
  };
}

function parseTable(body: string): CheatsheetEntry[] {
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  let colMap: (ColumnKey | null)[] | null = null;
  const entries: CheatsheetEntry[] = [];
  for (const row of rows) {
    const inner = row[1];
    if (inner === undefined) continue;
    const ths = [...inner.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => stripTags(m[1] ?? ""));
    if (ths.length > 0 && colMap === null) {
      colMap = ths.map(headerKey);
      continue;
    }
    if (colMap === null) continue; // no header row seen yet; cannot map columns
    const tds = [...inner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1] ?? ""));
    if (tds.length === 0) continue;
    const entry = buildEntry(colMap, tds);
    if (entry) entries.push(entry);
  }
  return entries;
}

function parseSections(html: string): CheatsheetSection[] {
  const sections: CheatsheetSection[] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const body = tm[1];
    const start = tm.index;
    if (body === undefined) continue;
    const title = extractTitle(html, start, body);
    sections.push({ title, entries: parseTable(body) });
  }
  return sections;
}

export class FourforFourClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /**
   * Cheat sheet for a platform variant and season. Parses every HTML table
   * on the page into sections. No parseable tables -> empty sections.
   */
  async getCheatsheet(
    variant: CheatsheetVariant = "standard",
    season: number = 2026,
  ): Promise<CheatsheetResult> {
    assertIngestible(FOURFORFOUR_SOURCE_ID);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${FOURFORFOUR_BASE}/${variant}/${season}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: controller.signal,
      });
      if (!res.ok) throw new FourforFourError(`4for4 HTTP ${res.status}`, res.status);
      const html = await res.text();
      return { sections: parseSections(html) };
    } finally {
      clearTimeout(timer);
    }
  }
}
