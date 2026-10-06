/**
 * VSiN — betting splits weekly analysis articles.
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence): article pages → HTTP 200,
 * server-rendered, no login; carry handle/bets% records and system-definition lines
 * (e.g. "majority handle on spreads 141-138 ATS", "majority bets 133-145",
 * ">68% handle on road side ATS: 70-50 ATS").
 *
 * Registry id: "vsin-betting-splits" — verdict cleared-with-attribution, BUT the
 * VSiN terms page 404s, so terms are unclear: attribute every use and keep to
 * facts (splits records, system definitions); env-gated OFF (VSIN_INGEST) pending
 * terms clarity.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const VSIN_SOURCE_ID = "vsin-betting-splits";
export const VSIN_BASE = "https://vsin.com";
/** Exact attributionText from the source registry for "vsin-betting-splits". */
export const VSIN_ATTRIBUTION = "Betting splits analysis via VSiN (splits data via DraftKings Sportsbook).";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isVsinIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "VSIN_INGEST");
}

export class VsinError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "VsinError";
  }
}

export interface VsinSplitsTable {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface VsinSplitsArticle {
  readonly headline: string;
  /** ISO timestamp from page meta, or null when the page carries none. */
  readonly publishedAt: string | null;
  readonly tables: readonly VsinSplitsTable[];
  /** Article paragraphs mentioning "%" — the splits-relevant lines. */
  readonly splitsLines: readonly string[];
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

function extractHeadline(html: string): string {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const h1Text = h1 && typeof h1[1] === "string" ? stripTags(h1[1]) : "";
  if (h1Text) return h1Text;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const titleText = title && typeof title[1] === "string" ? stripTags(title[1]) : "";
  return titleText;
}

function extractPublishedAt(html: string): string | null {
  const metaRe = /<meta[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    const attrs: Record<string, string> = {};
    const attrRe = /(\w[\w:-]*)\s*=\s*["']([^"']*)["']/gi;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(tag)) !== null) {
      const name = a[1];
      const value = a[2];
      if (typeof name === "string" && typeof value === "string") attrs[name.toLowerCase()] = value;
    }
    const property = attrs["property"] ?? "";
    const name = attrs["name"] ?? "";
    if (property === "article:published_time" || property === "og:published_time") {
      const content = attrs["content"] ?? "";
      if (content) return content;
    }
    if (["pubdate", "publish_date", "published_date", "date", "dc.date"].includes(name)) {
      const content = attrs["content"] ?? "";
      if (content) return content;
    }
  }
  return null;
}

function extractTables(html: string): VsinSplitsTable[] {
  const tables: VsinSplitsTable[] = [];
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
    const headers = allRows[0] ?? [];
    tables.push({ headers, rows: allRows.slice(1) });
  }
  return tables;
}

/** Paragraphs that carry splits signal: %-mentioning lines plus the verified
 *  splits-record phrasings (e.g. "majority handle on spreads 141-138 ATS",
 *  "majority bets 133-145") that carry no literal "%". */
const SPLITS_LINE_RE = /%|\bATS\b|majority\s+(handle|bets)/i;

function extractSplitsLines(html: string): string[] {
  const lines: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(html)) !== null) {
    const text = stripTags(typeof m[1] === "string" ? m[1] : "");
    if (SPLITS_LINE_RE.test(text)) lines.push(text);
  }
  return lines;
}

export class VsinClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * Fetch a VSiN betting-splits article and extract its headline, publish date,
   * generic tables, and splits-signal paragraphs. Returns null when the ingest
   * flag is off. Never throws on page shape — absent elements come back empty.
   */
  async getSplitsArticle(url: string): Promise<VsinSplitsArticle | null> {
    if (!isVsinIngestEnabled(this.env)) return null;
    assertIngestible(VSIN_SOURCE_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new VsinError(`VSiN HTTP ${res.status}`, res.status);
      const html = await res.text();
      return {
        headline: extractHeadline(html),
        publishedAt: extractPublishedAt(html),
        tables: extractTables(html),
        splitsLines: extractSplitsLines(html),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
