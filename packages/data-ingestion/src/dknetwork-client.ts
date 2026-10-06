/**
 * DraftKings Network — official betting splits (DraftKings Sportsbook).
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 * GET https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/?tb_eg=NFL
 * → HTTP 200, server-rendered, per-game ML/spread/total with % handle + % bets per side.
 * Spot-checked on the live page: PHI @ TEN — ML: TEN +250 (2% handle / 2% bets),
 * PHI -310 (98% / 98%); Spread: PHI -7 -110 (94% / 93%).
 *
 * Registry id: "dkn-betting-splits" — verdict cleared-with-attribution, BUT the DK
 * Network Terms of Use limit to personal, non-commercial use: non-commercial lane
 * only. Env-gated OFF (DKN_SPLITS_INGEST); default OFF.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const DKN_SOURCE_ID = "dkn-betting-splits";
export const DKN_BASE = "https://dknetwork.draftkings.com";
/** Exact attributionText from the source registry for "dkn-betting-splits". */
export const DKN_ATTRIBUTION = "Betting splits via DraftKings Network.";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isDknSplitsIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "DKN_SPLITS_INGEST");
}

export class DknSplitsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DknSplitsError";
  }
}

export interface DknSplitSide {
  readonly side: string;
  readonly odds: string | null;
  readonly handlePct: number | null;
  readonly betsPct: number | null;
}

export interface DknGameSplits {
  readonly matchup: string;
  readonly gameDate: string | null;
  readonly moneyline: readonly DknSplitSide[];
  readonly spread: readonly DknSplitSide[];
  readonly total: readonly DknSplitSide[];
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

/** "98%" / "2 %" → 98 / 2; null when not a percentage. */
function asPct(v: string | null): number | null {
  if (!v) return null;
  const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(v);
  if (!m || typeof m[1] !== "string") return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

interface RawTable {
  readonly openTag: string;
  readonly before: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

function extractTablesWithContext(html: string): RawTable[] {
  const tables: RawTable[] = [];
  const tableRe = /(<table[^>]*>)([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const openTag = typeof tm[1] === "string" ? tm[1] : "";
    const before = html.slice(Math.max(0, (tm.index ?? 0) - 400), tm.index ?? 0);
    const inner = typeof tm[2] === "string" ? tm[2] : "";
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
    const headers = allRows[0] ?? [];
    tables.push({ openTag, before, headers, rows: allRows.slice(1) });
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

type Market = "moneyline" | "spread" | "total";

function detectMarket(table: RawTable): Market | null {
  const dataMarket = /data-market\s*=\s*["']([^"']+)["']/i.exec(table.openTag);
  const tagValue = dataMarket && typeof dataMarket[1] === "string" ? dataMarket[1].toLowerCase() : "";
  if (tagValue.includes("moneyline") || tagValue === "ml") return "moneyline";
  if (tagValue.includes("spread")) return "spread";
  if (tagValue.includes("total")) return "total";
  const text = (table.before + " " + table.headers.join(" ")).toLowerCase();
  if (text.includes("moneyline")) return "moneyline";
  if (text.includes("spread")) return "spread";
  if (text.includes("total")) return "total";
  return null;
}

function asSplitSide(row: readonly string[], h: readonly string[]): DknSplitSide | null {
  const sideIdx = colIndex(h, [/\bside\b/, /\bteam\b/, /\bpick\b/]);
  const oddsIdx = colIndex(h, [/\bodds\b/, /\bprice\b/, /\bline\b/]);
  const handleIdx = h.findIndex((x) => /handle/.test(x.toLowerCase()) && x.includes("%"));
  const betsIdx = h.findIndex((x) => /bet/.test(x.toLowerCase()) && x.includes("%"));
  const side = cellAt(row, sideIdx);
  if (!side) return null;
  return {
    side,
    odds: cellAt(row, oddsIdx),
    handlePct: asPct(cellAt(row, handleIdx)),
    betsPct: asPct(cellAt(row, betsIdx)),
  };
}

/** Per-game section → matchup, date, and its market tables. */
function parseGameSections(html: string): DknGameSplits[] {
  const sectionRe = /<section[^>]*\bdata-game\b[^>]*>([\s\S]*?)<\/section>/gi;
  const chunks: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionRe.exec(html)) !== null) {
    if (typeof sm[1] === "string") chunks.push(sm[1]);
  }
  // Fallback: split at h2/h3 headings that look like "PHI @ TEN" when no data-game sections exist.
  if (chunks.length === 0) {
    const parts = html.split(/<h[23][^>]*>/gi);
    for (const part of parts.slice(1)) {
      if (/[A-Z]{2,4}\s*@\s*[A-Z]{2,4}/.test(stripTags(part.slice(0, 200)))) chunks.push(part);
    }
  }
  const games: DknGameSplits[] = [];
  for (const chunk of chunks) {
    const heading = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i.exec(chunk);
    let matchup = heading && typeof heading[1] === "string" ? stripTags(heading[1]) : "";
    if (!matchup) {
      const at = /([A-Z]{2,4}\s*@\s*[A-Z]{2,4})/.exec(stripTags(chunk.slice(0, 500)));
      matchup = at && typeof at[1] === "string" ? at[1] : "";
    }
    if (!matchup) continue;
    let gameDate: string | null = null;
    const timeTag = /<time[^>]*datetime\s*=\s*["']([^"']+)["']/i.exec(chunk);
    if (timeTag && typeof timeTag[1] === "string") {
      gameDate = timeTag[1];
    } else {
      const dateEl = /<[^>]*class=["'][^"']*\b(game-date|date|gamedate)\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i.exec(chunk);
      if (dateEl && typeof dateEl[2] === "string") {
        const t = stripTags(dateEl[2]);
        gameDate = t.length > 0 ? t : null;
      }
    }
    const moneyline: DknSplitSide[] = [];
    const spread: DknSplitSide[] = [];
    const total: DknSplitSide[] = [];
    for (const table of extractTablesWithContext(chunk)) {
      const market = detectMarket(table);
      if (!market) continue;
      const sides: DknSplitSide[] = [];
      for (const row of table.rows) {
        const side = asSplitSide(row, table.headers);
        if (side) sides.push(side);
      }
      if (market === "moneyline") moneyline.push(...sides);
      else if (market === "spread") spread.push(...sides);
      else total.push(...sides);
    }
    games.push({ matchup, gameDate, moneyline, spread, total });
  }
  return games;
}

export class DknNetworkClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * DraftKings Sportsbook betting splits for a sport tab (default "NFL").
   * Returns null when the ingest flag is off. Empty array when the page carries
   * no parseable game sections — never throws on page shape.
   */
  async getBettingSplits(sport: string = "NFL"): Promise<DknGameSplits[] | null> {
    if (!isDknSplitsIngestEnabled(this.env)) return null;
    assertIngestible(DKN_SOURCE_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(
        `${DKN_BASE}/draftkings-sportsbook-betting-splits/?tb_eg=${encodeURIComponent(sport)}`,
        {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          signal: controller.signal,
        },
      );
      if (!res.ok) throw new DknSplitsError(`DK Network HTTP ${res.status}`, res.status);
      const html = await res.text();
      return parseGameSections(html);
    } finally {
      clearTimeout(timer);
    }
  }
}
