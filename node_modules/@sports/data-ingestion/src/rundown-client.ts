/**
 * TheRundown free-tier odds client (therundown.io).
 *
 * Auth: X-TheRundown-Key header or ?key= (env: RUNDOWN_API_KEY | RUNDOWN_KEY | THERUNDOWN_API_KEY).
 * Never invents quotes. Soft-fails empty on miss.
 *
 * Law: free dual-path for odds when THE_ODDS_API is ABSENT/failing; not a second
 * product stack — adapter only into OddsApiEvent shape for existing normalizer.
 */

import type { OddsApiEvent, OddsApiBookmaker, OddsApiMarket } from "@sports/types";
import { assertIngestible } from "./source-registry.js";

const RUNDOWN_BASE = "https://therundown.io/api/v2";

/**
 * Sport key (Odds API style) → TheRundown sport_id.
 * IDs from GET /api/v2/sports (no auth) as published in docs.therundown.io
 * OpenAPI 3.1, retrieved 2026-08-22. NHL is 6, NCAAB is 5 — the previous map
 * had those (and MLS/EPL) swapped, so failover was querying the wrong sport.
 */
export const RUNDOWN_SPORT_IDS: Record<string, number> = {
  americanfootball_ncaaf: 1,
  americanfootball_nfl: 2,
  baseball_mlb: 3,
  basketball_nba: 4,
  basketball_ncaab: 5,
  icehockey_nhl: 6,
  soccer_usa_mls: 10,
  soccer_epl: 11,
};

/**
 * Affiliate IDs from the unauthenticated GET /api/v2/affiliates example in the
 * same OpenAPI document (2026-08-22). Unknown IDs stay `rundown_${id}` — we
 * never invent a book name. Kalshi here is Rundown's licensed feed, not the
 * Kalshi Trade API (Dev Agreement §3 still blocks that path).
 */
export const RUNDOWN_AFFILIATE_BOOK_KEYS: Readonly<Record<string, string>> = {
  "2": "bovada",
  "3": "pinnacle",
  "4": "sportbettingag",
  "6": "betonlineag",
  "11": "lowvig",
  "19": "draftkings",
  "22": "betmgm",
  "23": "fanduel",
  "24": "thescorebet",
  "25": "kalshi",
  "28": "hardrockbet",
};

function affiliateBookKey(affiliateId: string): string {
  return RUNDOWN_AFFILIATE_BOOK_KEYS[affiliateId] ?? `rundown_${affiliateId}`;
}

/** Env names checked for free dual-path Rundown key (first non-empty wins). */
export const RUNDOWN_API_KEY_ENV_NAMES = [
  "RUNDOWN_API_KEY",
  "RUNDOWN_KEY",
  "THERUNDOWN_API_KEY",
  "THE_RUNDOWN_API_KEY",
  "THERUNDOWN_KEY",
  "THE_RUNDOWN_KEY",
  "RUNDOWN_API_TOKEN",
  "FREE_RUNDOWN_API_KEY",
  "THERUNDOWN_API",
  // Founder "switched keys" renames
  "RUNDOWN",
  "THERUNDOWN",
  "THE_RUNDOWN",
  "RUNDOWN_TOKEN",
  "THERUNDOWN_TOKEN",
  "RUNDOWN_IO_KEY",
  "THERUNDOWN_IO_KEY",
] as const;


export type RundownApiKeyEnvName = (typeof RUNDOWN_API_KEY_ENV_NAMES)[number];

export function resolveRundownApiKey(
  env: Record<string, string | undefined> = process.env,
): string {
  for (const name of RUNDOWN_API_KEY_ENV_NAMES) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return "";
}

/** Boolean presence only — never returns secret material. */
export function rundownApiKeyPresence(
  env: Record<string, string | undefined> = process.env,
): { present: boolean; matchedEnv: RundownApiKeyEnvName | null } {
  for (const name of RUNDOWN_API_KEY_ENV_NAMES) {
    if (env[name]?.trim()) return { present: true, matchedEnv: name };
  }
  return { present: false, matchedEnv: null };
}

function todayIsoUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * OpenAPI: 0.0001 means off-the-board, not a real price. Drop it.
 * Live American prices are integers like -110 / +150.
 */
function americanFromPrice(p: unknown): number | null {
  const n = typeof p === "number" ? p : typeof p === "string" && p.trim() ? Number(p) : NaN;
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) < 0.01) return null;
  return Math.round(n);
}

type Loose = Record<string, unknown>;

/**
 * Best-effort map of a Rundown event blob → OddsApiEvent.
 * Schema varies by plan; we only extract what is finite.
 */
export function rundownEventToOddsApiEvent(raw: unknown, sportKey: string): OddsApiEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Loose;
  const eventId = String(e["event_id"] ?? e["id"] ?? e["eventId"] ?? "");
  if (!eventId) return null;

  const teams = Array.isArray(e["teams"]) ? (e["teams"] as Loose[]) : [];
  let home = "";
  let away = "";
  for (const t of teams) {
    const name = String(t["name"] ?? t["team_name"] ?? "");
    if (!name) continue;
    if (t["is_away"] === true || t["is_home"] === false) away = name;
    else home = name;
  }
  // fallback fields
  home = home || String(e["home_team"] ?? e["team_home"] ?? "");
  away = away || String(e["away_team"] ?? e["team_away"] ?? "");
  if (!home || !away) return null;

  const commence =
    String(e["event_date"] ?? e["date_event"] ?? e["commence_time"] ?? e["schedule"] ?? "") ||
    new Date().toISOString();

  const bookmakers: OddsApiBookmaker[] = [];
  const marketsField = e["markets"];
  const linesField = e["lines"] ?? e["odds"] ?? null;

  // V2 (current events endpoint): markets[] with participants[].lines[].prices[affiliateId]
  if (Array.isArray(marketsField) && marketsField.some(isV2Market)) {
    bookmakers.push(...v2MarketsToBookmakers(marketsField, home, away));
  } else if (linesField && typeof linesField === "object" && !Array.isArray(linesField)) {
    for (const [aff, blob] of Object.entries(linesField as Record<string, unknown>)) {
      const bm = lineBlobToBookmaker(String(aff), blob, home, away);
      if (bm) bookmakers.push(bm);
    }
  } else if (Array.isArray(linesField)) {
    for (const m of linesField) {
      const bm = lineBlobToBookmaker("default", m, home, away);
      if (bm) bookmakers.push(bm);
    }
  }

  if (bookmakers.length === 0) {
    // still emit event shell with empty books — normalizer may drop; honest empty
    return {
      id: eventId,
      sport_key: sportKey,
      sport_title: sportKey,
      commence_time: commence,
      home_team: home,
      away_team: away,
      bookmakers: [],
    };
  }

  return {
    id: eventId,
    sport_key: sportKey,
    sport_title: sportKey,
    commence_time: commence,
    home_team: home,
    away_team: away,
    bookmakers,
  };
}

function lineBlobToBookmaker(
  key: string,
  blob: unknown,
  homeTeam: string,
  awayTeam: string,
): OddsApiBookmaker | null {
  if (!blob || typeof blob !== "object") return null;
  const b = blob as Loose;
  const markets: OddsApiMarket[] = [];

  // moneyline
  const ml = (b["moneyline"] ?? b["ml"] ?? null) as Loose | null;
  if (ml) {
    const home = americanFromPrice(ml["moneyline_home"] ?? ml["home"] ?? ml["home_od"]);
    const away = americanFromPrice(ml["moneyline_away"] ?? ml["away"] ?? ml["away_od"]);
    if (home != null && away != null) {
      markets.push({
        key: "h2h",
        last_update: new Date().toISOString(),
        outcomes: [
          { name: homeTeam, price: home },
          { name: awayTeam, price: away },
        ],
      });
    }
  }

  // spread
  const sp = (b["spread"] ?? b["line"] ?? null) as Loose | null;
  if (sp) {
    const point = Number(sp["point"] ?? sp["spread_home"] ?? sp["home"]);
    const homeP = americanFromPrice(sp["spread_home_price"] ?? sp["home_od"] ?? sp["price_home"]);
    const awayP = americanFromPrice(sp["spread_away_price"] ?? sp["away_od"] ?? sp["price_away"]);
    if (Number.isFinite(point) && homeP != null && awayP != null) {
      markets.push({
        key: "spreads",
        last_update: new Date().toISOString(),
        outcomes: [
          { name: homeTeam, price: homeP, point },
          { name: awayTeam, price: awayP, point: -point },
        ],
      });
    }
  }

  // total
  const tot = (b["total"] ?? b["totals"] ?? null) as Loose | null;
  if (tot) {
    const point = Number(tot["total"] ?? tot["point"] ?? tot["points"]);
    const over = americanFromPrice(tot["total_over"] ?? tot["over"] ?? tot["over_od"]);
    const under = americanFromPrice(tot["total_under"] ?? tot["under"] ?? tot["under_od"]);
    if (Number.isFinite(point) && over != null && under != null) {
      markets.push({
        key: "totals",
        last_update: new Date().toISOString(),
        outcomes: [
          { name: "Over", price: over, point },
          { name: "Under", price: under, point },
        ],
      });
    }
  }

  if (markets.length === 0) return null;
  const bookKey = affiliateBookKey(key);
  return {
    key: bookKey,
    title: bookKey,
    last_update: new Date().toISOString(),
    markets,
  };
}

function isV2Market(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Loose;
  return Array.isArray(m["participants"]) && (m["market_id"] != null || typeof m["name"] === "string");
}

function v2MarketKey(name: unknown): "h2h" | "spreads" | "totals" | null {
  const n = String(name ?? "").toLowerCase();
  if (n === "moneyline" || n === "h2h") return "h2h";
  if (n === "handicap" || n === "spread" || n === "spreads") return "spreads";
  if (n === "totals" || n === "total") return "totals";
  return null;
}

function v2MarketsToBookmakers(
  markets: readonly unknown[],
  homeTeam: string,
  awayTeam: string,
): OddsApiBookmaker[] {
  type MarketKey = "h2h" | "spreads" | "totals";
  type Acc = { outcomes: Map<string, { name: string; price: number; point?: number }>; last: string };
  const byAff = new Map<string, Map<MarketKey, Acc>>();

  const touch = (aff: string, marketKey: MarketKey, name: string, price: number, point: number | undefined, updated: string) => {
    let marketsMap = byAff.get(aff);
    if (!marketsMap) {
      marketsMap = new Map();
      byAff.set(aff, marketsMap);
    }
    let acc = marketsMap.get(marketKey);
    if (!acc) {
      acc = { outcomes: new Map(), last: updated };
      marketsMap.set(marketKey, acc);
    }
    acc.outcomes.set(name, point === undefined ? { name, price } : { name, price, point });
    if (updated) acc.last = updated;
  };

  for (const raw of markets) {
    if (!raw || typeof raw !== "object") continue;
    const market = raw as Loose;
    const marketKey = v2MarketKey(market["name"]);
    if (!marketKey) continue;
    const participants = Array.isArray(market["participants"]) ? (market["participants"] as Loose[]) : [];
    for (const p of participants) {
      const rawName = String(p["name"] ?? "");
      let outcomeName = rawName;
      if (marketKey === "totals") {
        const lower = rawName.toLowerCase();
        if (lower.startsWith("over")) outcomeName = "Over";
        else if (lower.startsWith("under")) outcomeName = "Under";
        else continue;
      } else {
        const lower = rawName.toLowerCase();
        if (lower.includes(homeTeam.toLowerCase()) || homeTeam.toLowerCase().includes(lower)) outcomeName = homeTeam;
        else if (lower.includes(awayTeam.toLowerCase()) || awayTeam.toLowerCase().includes(lower)) outcomeName = awayTeam;
        else continue;
      }
      const lineRows = Array.isArray(p["lines"]) ? (p["lines"] as Loose[]) : [];
      for (const line of lineRows) {
        const pointRaw = line["value"];
        const pointNum = pointRaw === "" || pointRaw == null ? undefined : Number(pointRaw);
        const point = pointNum !== undefined && Number.isFinite(pointNum) ? pointNum : undefined;
        const prices = line["prices"];
        if (!prices || typeof prices !== "object") continue;
        for (const [aff, blob] of Object.entries(prices as Record<string, unknown>)) {
          if (!blob || typeof blob !== "object") continue;
          const pr = blob as Loose;
          const price = americanFromPrice(pr["price"]);
          if (price == null) continue;
          const updated = String(pr["updated_at"] ?? new Date().toISOString());
          touch(aff, marketKey, outcomeName, price, marketKey === "h2h" ? undefined : point, updated);
        }
      }
    }
  }

  const out: OddsApiBookmaker[] = [];
  for (const [aff, marketsMap] of byAff) {
    const apiMarkets: OddsApiMarket[] = [];
    let last = new Date().toISOString();
    for (const [mkey, acc] of marketsMap) {
      const outcomes = [...acc.outcomes.values()];
      if (outcomes.length < 2) continue;
      last = acc.last || last;
      apiMarkets.push({
        key: mkey,
        last_update: acc.last,
        outcomes,
      });
    }
    if (apiMarkets.length === 0) continue;
    const bookKey = affiliateBookKey(aff);
    out.push({ key: bookKey, title: bookKey, last_update: last, markets: apiMarkets });
  }
  return out;
}


export type RundownFetchResult = {
  readonly events: OddsApiEvent[];
  readonly remaining: number | null;
  readonly error?: string;
};

export async function fetchRundownEventsForSport(
  sportKey: string,
  apiKey: string,
  options?: {
    readonly date?: string;
    /**
     * Inclusive day count starting at `date`.
     * Default 2 (free-tier economy). Caps at 10.
     * Env RUNDOWN_DAY_SPAN overrides default when options.daySpan omitted.
     */
    readonly daySpan?: number;
    readonly fetchImpl?: typeof fetch;
  },
): Promise<RundownFetchResult> {
  assertIngestible("therundown");
  const sportId = RUNDOWN_SPORT_IDS[sportKey];
  if (sportId == null) {
    return { events: [], remaining: null, error: `rundown: no sport_id map for ${sportKey}` };
  }
  const startDate = options?.date ?? todayIsoUtc();
  const envSpanRaw = Number(process.env["RUNDOWN_DAY_SPAN"] ?? "");
  const defaultSpan = Number.isFinite(envSpanRaw) && envSpanRaw > 0 ? envSpanRaw : 2;
  const daySpan = Math.min(10, Math.max(1, options?.daySpan ?? defaultSpan));
  const fetchImpl = options?.fetchImpl ?? fetch;
  const all: OddsApiEvent[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];
  let rateLimited = false;

  for (let i = 0; i < daySpan; i++) {
    if (rateLimited) break;
    if (i > 0) {
      // Free tier: small gap between day fan-out so we do not self-429.
      await new Promise((r) => setTimeout(r, 200));
    }
    const d = new Date(`${startDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    // GSE-SEC-028: API key sent via X-TheRundown-Key header only — not in the
    // query string, which leaks into logs, referrers, and history.
    const url = `${RUNDOWN_BASE}/sports/${sportId}/events/${date}?market_ids=1,2,3&main_line=true&hide_closed=true`;
    try {
      const res = await fetchImpl(url, {
        headers: {
          Accept: "application/json",
          "X-TheRundown-Key": apiKey,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 429) {
          rateLimited = true;
          errors.push(`${date}:HTTP 429 rate_limited (abort remaining days)`);
          break;
        }
        errors.push(`${date}:HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as Loose;
      const list = (body["events"] ?? body["data"] ?? body) as unknown;
      const arr = Array.isArray(list) ? list : [];
      for (const raw of arr) {
        const mapped = rundownEventToOddsApiEvent(raw, sportKey);
        if (mapped && mapped.bookmakers.length > 0 && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          all.push(mapped);
        }
      }
    } catch (err) {
      errors.push(`${date}:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (all.length === 0) {
    return {
      events: [],
      remaining: null,
      error: errors.length
        ? `rundown empty (${daySpan}d): ${errors.slice(0, 4).join("; ")}`
        : `rundown empty (${daySpan}d): no bookmaker lines`,
    };
  }
  return {
    events: all,
    remaining: null,
    error: errors.length ? `partial: ${errors.slice(0, 3).join("; ")}` : undefined,
  };
}
