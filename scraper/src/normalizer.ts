/**
 * NORMALIZER
 *
 * Converts raw API responses / DOM extractions into the canonical NormalizedPick schema.
 *
 * Because we don't know scores24.live's exact response shape until discovery runs,
 * this module uses a layered heuristic approach:
 *
 *   1. Try known structural patterns (array of events with nested predictions)
 *   2. Try Next.js page props shape
 *   3. Try flat array of picks
 *   4. DOM extraction fallback (plain text records from HTML)
 *
 * Add concrete mappers in the `KNOWN_SHAPES` array once you've run discovery
 * and identified the actual response structure.
 */

import type { NormalizedPick } from "./types.js";
import { nowIso } from "./utils.js";

const SOURCE = "scores24" as const;

// ── Normalizer entry point ────────────────────────────────────

/**
 * Convert a raw JSON payload + metadata into zero or more NormalizedPick records.
 */
export function normalizePayload(
  raw: unknown,
  options: {
    sourceUrl: string;
    pageType: string;
    sport?: string;
    league?: string;
  }
): NormalizedPick[] {
  const { sourceUrl, pageType, sport = "", league = "" } = options;

  if (!raw || typeof raw !== "object") return [];

  const picks: NormalizedPick[] = [];

  // Try each extraction strategy in order; combine all results
  for (const strategy of EXTRACTION_STRATEGIES) {
    const found = strategy(raw, sourceUrl, pageType, sport, league);
    picks.push(...found);
  }

  return picks;
}

type ExtractionStrategy = (
  raw: unknown,
  sourceUrl: string,
  pageType: string,
  sport: string,
  league: string
) => NormalizedPick[];

// ── Strategy 1: Shape A — { events: [{ homeTeam, awayTeam, predictions: [...] }] }
// Common in sports data APIs
const strategyEventsList: ExtractionStrategy = (raw, sourceUrl, pageType, sport, league) => {
  const obj = raw as Record<string, unknown>;
  const events = asArray(obj["events"] ?? obj["matches"] ?? obj["games"] ?? obj["fixtures"]);
  if (!events.length) return [];

  const picks: NormalizedPick[] = [];
  for (const event of events) {
    if (!isObj(event)) continue;
    picks.push(...extractPicksFromEventObject(event, sourceUrl, pageType, sport, league));
  }
  return picks;
};

// ── Strategy 2: Shape B — { data: { predictions: [...] } } or { data: [...] }
const strategyDataWrapper: ExtractionStrategy = (raw, sourceUrl, pageType, sport, league) => {
  const obj = raw as Record<string, unknown>;
  const data = obj["data"] ?? obj["result"] ?? obj["response"] ?? obj["payload"];
  if (!data) return [];
  if (Array.isArray(data)) {
    return strategyEventsList(
      { events: data },
      sourceUrl,
      pageType,
      sport,
      league
    );
  }
  if (isObj(data)) {
    return strategyEventsList(data, sourceUrl, pageType, sport, league);
  }
  return [];
};

// ── Strategy 3: Shape C — Next.js page props (__NEXT_DATA__)
// { props: { pageProps: { predictions: [...] } } }
const strategyNextData: ExtractionStrategy = (raw, sourceUrl, pageType, sport, league) => {
  const obj = raw as Record<string, unknown>;
  const props = obj["props"];
  if (!isObj(props)) return [];
  const pageProps = (props as Record<string, unknown>)["pageProps"];
  if (!isObj(pageProps)) return [];

  // Try common pageProps shapes
  const sub = pageProps as Record<string, unknown>;
  const list =
    asArray(sub["predictions"]) ||
    asArray(sub["picks"]) ||
    asArray(sub["events"]) ||
    asArray(sub["matches"]) ||
    asArray(sub["games"]);

  if (!list.length) return [];

  const picks: NormalizedPick[] = [];
  for (const item of list) {
    if (!isObj(item)) continue;
    picks.push(...extractPicksFromEventObject(item, sourceUrl, pageType, sport, league));
  }
  return picks;
};

// ── Strategy 4: Shape D — flat array of picks at root
const strategyFlatArray: ExtractionStrategy = (raw, sourceUrl, pageType, sport, league) => {
  if (!Array.isArray(raw)) return [];
  const picks: NormalizedPick[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    picks.push(...extractPicksFromEventObject(item, sourceUrl, pageType, sport, league));
  }
  return picks;
};

// ── Strategy 5: Shape E — single event object at root
const strategySingleEvent: ExtractionStrategy = (raw, sourceUrl, pageType, sport, league) => {
  if (!isObj(raw)) return [];
  const obj = raw as Record<string, unknown>;
  // If it directly has team fields, treat as a single event
  if (
    (getString(obj, "home_team") || getString(obj, "homeTeam") || getString(obj, "home")) &&
    (getString(obj, "away_team") || getString(obj, "awayTeam") || getString(obj, "away"))
  ) {
    return extractPicksFromEventObject(obj, sourceUrl, pageType, sport, league);
  }
  return [];
};

const EXTRACTION_STRATEGIES: ExtractionStrategy[] = [
  strategyEventsList,
  strategyDataWrapper,
  strategyNextData,
  strategyFlatArray,
  strategySingleEvent,
];

// ── Core event extractor ──────────────────────────────────────

/**
 * Given an object that likely represents a single match/event,
 * extract one NormalizedPick per market found.
 */
function extractPicksFromEventObject(
  event: Record<string, unknown>,
  sourceUrl: string,
  pageType: string,
  inSport: string,
  inLeague: string
): NormalizedPick[] {
  const homeTeam = extractTeam(event, "home");
  const awayTeam = extractTeam(event, "away");

  if (!homeTeam && !awayTeam) return []; // not an event object

  const eventStr = homeTeam && awayTeam
    ? `${homeTeam} vs ${awayTeam}`
    : homeTeam || awayTeam || "";
  const eventTime = extractEventTime(event);
  const sport = inSport || extractSport(event);
  const league = inLeague || extractLeague(event);
  const scraped_at = nowIso();

  // Collect all picks/predictions within this event
  const picks: NormalizedPick[] = [];

  // Look for nested predictions/picks arrays
  const predList =
    asArray(event["predictions"]) ||
    asArray(event["picks"]) ||
    asArray(event["tips"]) ||
    asArray(event["markets"]);

  if (predList.length > 0) {
    for (const pred of predList) {
      if (!isObj(pred)) continue;
      const p = buildPickFromPredObject(pred, {
        homeTeam, awayTeam, eventStr, eventTime, sport, league,
        sourceUrl, pageType, scraped_at, rawEvent: event,
      });
      if (p) picks.push(p);
    }
  } else {
    // Flat event object: try to extract a single pick directly
    const p = buildPickFromFlatEvent(event, {
      homeTeam, awayTeam, eventStr, eventTime, sport, league,
      sourceUrl, pageType, scraped_at,
    });
    if (p) picks.push(p);
  }

  return picks;
}

interface PickCtx {
  homeTeam: string;
  awayTeam: string;
  eventStr: string;
  eventTime: string;
  sport: string;
  league: string;
  sourceUrl: string;
  pageType: string;
  scraped_at: string;
  rawEvent?: Record<string, unknown>;
}

function buildPickFromPredObject(
  pred: Record<string, unknown>,
  ctx: PickCtx
): NormalizedPick | null {
  const market = normalizeMarket(
    getString(pred, "market") ||
    getString(pred, "market_type") ||
    getString(pred, "type") ||
    getString(pred, "bet_type") ||
    ""
  );
  const pick =
    getString(pred, "pick") ||
    getString(pred, "recommendation") ||
    getString(pred, "tip") ||
    getString(pred, "selection") ||
    getString(pred, "outcome") ||
    "";

  if (!market && !pick) return null;

  const odds = extractOdds(pred);
  const confidence = extractConfidence(pred);

  return {
    source: SOURCE,
    sport: ctx.sport,
    league: ctx.league,
    event: ctx.eventStr,
    home_team: ctx.homeTeam,
    away_team: ctx.awayTeam,
    market: market || "unknown",
    pick,
    odds,
    confidence,
    event_time: ctx.eventTime,
    scraped_at: ctx.scraped_at,
    page_type: ctx.pageType,
    source_url: ctx.sourceUrl,
    raw: { event: ctx.rawEvent ?? {}, prediction: pred },
  };
}

function buildPickFromFlatEvent(
  event: Record<string, unknown>,
  ctx: Omit<PickCtx, "rawEvent">
): NormalizedPick | null {
  const market = normalizeMarket(
    getString(event, "market") ||
    getString(event, "market_type") ||
    getString(event, "type") ||
    getString(event, "bet_type") ||
    inferMarket(event) ||
    ""
  );
  const pick =
    getString(event, "pick") ||
    getString(event, "recommendation") ||
    getString(event, "tip") ||
    getString(event, "selection") ||
    getString(event, "predicted_winner") ||
    getString(event, "winner") ||
    "";

  // If we have no actionable pick, skip
  if (!pick && !market) return null;

  return {
    source: SOURCE,
    sport: ctx.sport,
    league: ctx.league,
    event: ctx.eventStr,
    home_team: ctx.homeTeam,
    away_team: ctx.awayTeam,
    market: market || "unknown",
    pick,
    odds: extractOdds(event),
    confidence: extractConfidence(event),
    event_time: ctx.eventTime,
    scraped_at: ctx.scraped_at,
    page_type: ctx.pageType,
    source_url: ctx.sourceUrl,
    raw: event,
  };
}

// ── Field extractors ──────────────────────────────────────────

function extractTeam(obj: Record<string, unknown>, side: "home" | "away"): string {
  const alt = side === "home" ? ["home_team", "homeTeam", "home", "home_name", "team1", "localTeam"]
                              : ["away_team", "awayTeam", "away", "away_name", "team2", "visitorTeam"];
  for (const key of alt) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (isObj(v)) {
      const name = getString(v as Record<string, unknown>, "name") || getString(v as Record<string, unknown>, "title");
      if (name) return name;
    }
  }
  return "";
}

function extractEventTime(obj: Record<string, unknown>): string {
  const keys = ["commence_time", "start_time", "event_time", "kickoff", "date", "game_date",
                "scheduled", "startTime", "commenceTime", "eventTime", "gameTime", "timestamp"];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && /\d{4}/.test(v)) return v;
    if (typeof v === "number" && v > 1_000_000_000) return new Date(v * 1000).toISOString();
  }
  return "";
}

function extractSport(obj: Record<string, unknown>): string {
  return (
    getString(obj, "sport") ||
    getString(obj, "sport_key") ||
    getString(obj, "sport_title") ||
    getString(obj, "category") ||
    ""
  ).toUpperCase();
}

function extractLeague(obj: Record<string, unknown>): string {
  return (
    getString(obj, "league") ||
    getString(obj, "competition") ||
    getString(obj, "tournament") ||
    getString(obj, "league_name") ||
    ""
  );
}

function extractOdds(obj: Record<string, unknown>): number | null {
  const keys = ["odds", "price", "american_odds", "us_odds", "ml_odds", "moneyline"];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && v !== 0) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (!isNaN(n) && n !== 0) return n;
    }
  }
  return null;
}

function extractConfidence(obj: Record<string, unknown>): number | null {
  const keys = ["confidence", "probability", "pct", "percent", "score", "strength",
                "confidence_pct", "win_probability"];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") {
      // Normalize 0–1 range to 0–100
      return v <= 1 ? Math.round(v * 100) : Math.round(v);
    }
    if (typeof v === "string") {
      const n = parseFloat(v.replace("%", ""));
      if (!isNaN(n)) return n <= 1 ? Math.round(n * 100) : Math.round(n);
    }
  }
  return null;
}

// ── Market normalization ──────────────────────────────────────

const MARKET_MAP: Record<string, string> = {
  spread: "SPREAD",
  ats: "SPREAD",
  handicap: "SPREAD",
  "point spread": "SPREAD",
  moneyline: "MONEYLINE",
  ml: "MONEYLINE",
  h2h: "MONEYLINE",
  "head to head": "MONEYLINE",
  winner: "MONEYLINE",
  "match winner": "MONEYLINE",
  total: "TOTAL",
  "over/under": "TOTAL",
  ou: "TOTAL",
  over: "TOTAL",
  under: "TOTAL",
};

function normalizeMarket(raw: string): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim();
  return MARKET_MAP[key] ?? raw.toUpperCase();
}

// Try to infer market from other fields in the event
function inferMarket(obj: Record<string, unknown>): string {
  if ("spread" in obj || "line" in obj) return "SPREAD";
  if ("total" in obj || "over_under" in obj) return "TOTAL";
  if ("moneyline" in obj || "ml" in obj) return "MONEYLINE";
  return "";
}

// ── DOM extraction fallback ───────────────────────────────────

/**
 * Extracts picks from raw HTML when no JSON API is available.
 * Uses broad CSS selectors; update once discovery reveals the actual structure.
 *
 * THIS IS THE FRAGILE FALLBACK. Prefer JSON API extraction.
 */
export async function extractFromDom(
  page: import("playwright").Page,
  sourceUrl: string,
  sport: string
): Promise<NormalizedPick[]> {
  const scraped_at = nowIso();

  // Attempt to find pick cards / prediction rows in the DOM
  const records = await page.evaluate(() => {
    const results: Array<Record<string, string>> = [];

    // Common selectors for prediction cards on sports sites
    const cardSelectors = [
      ".prediction-card",
      ".pick-card",
      ".tip-card",
      ".match-prediction",
      "[data-prediction]",
      "[data-pick]",
      ".forecast-card",
      ".match-card",
      ".event-card",
      ".game-card",
      "article.match",
    ];

    let cards: Element[] = [];
    for (const sel of cardSelectors) {
      cards = Array.from(document.querySelectorAll(sel));
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const getText = (sel: string): string =>
        card.querySelector(sel)?.textContent?.trim() ?? "";

      results.push({
        home: getText(".home-team, [class*='home'], [data-team='home']"),
        away: getText(".away-team, [class*='away'], [data-team='away']"),
        pick: getText(".pick, .recommendation, .tip, [class*='pick'], [class*='tip']"),
        odds: getText(".odds, [class*='odds']"),
        confidence: getText(".confidence, [class*='confidence'], [class*='percent']"),
        market: getText(".market, [class*='market'], [class*='bet-type']"),
        eventTime: getText(".time, .date, [class*='time'], [class*='date']"),
        raw: card.innerHTML.slice(0, 400),
      });
    }

    return results;
  });

  return records
    .filter((r) => r["home"] || r["away"] || r["pick"])
    .map((r) => ({
      source: SOURCE,
      sport: sport.toUpperCase(),
      league: "",
      event: r["home"] && r["away"] ? `${r["home"]} vs ${r["away"]}` : r["pick"] ?? "",
      home_team: r["home"] ?? "",
      away_team: r["away"] ?? "",
      market: normalizeMarket(r["market"] ?? ""),
      pick: r["pick"] ?? "",
      odds: r["odds"] ? parseFloat(r["odds"]) || null : null,
      confidence: r["confidence"] ? parseFloat(r["confidence"]) || null : null,
      event_time: r["eventTime"] ?? "",
      scraped_at,
      page_type: "dom-fallback",
      source_url: sourceUrl,
      raw: r as unknown as Record<string, unknown>,
    }));
}

// ── Helpers ───────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return [];
}

function getString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v === "string") return v.trim();
  return "";
}
