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

const RUNDOWN_BASE = "https://therundown.io/api/v2";

/** Sport key (Odds API style) → TheRundown sport_id */
export const RUNDOWN_SPORT_IDS: Record<string, number> = {
  americanfootball_nfl: 2,
  americanfootball_ncaaf: 1,
  baseball_mlb: 3,
  basketball_nba: 4,
  icehockey_nhl: 5,
  basketball_ncaab: 6,
  soccer_epl: 10,
  soccer_usa_mls: 11,
};

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

function americanFromPrice(p: unknown): number | null {
  if (typeof p === "number" && Number.isFinite(p)) return Math.round(p);
  if (typeof p === "string" && p.trim()) {
    const n = Number(p);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
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
  // lines_by_affiliate / markets / lines shapes
  const lines = (e["lines"] ?? e["markets"] ?? e["odds"] ?? null) as unknown;

  if (lines && typeof lines === "object" && !Array.isArray(lines)) {
    for (const [aff, blob] of Object.entries(lines as Record<string, unknown>)) {
      const bm = lineBlobToBookmaker(String(aff), blob, home, away);
      if (bm) bookmakers.push(bm);
    }
  } else if (Array.isArray(lines)) {
    for (const m of lines) {
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
  return {
    key: `rundown_${key}`,
    title: `Rundown ${key}`,
    last_update: new Date().toISOString(),
    markets,
  };
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
    const url = `${RUNDOWN_BASE}/sports/${sportId}/events/${date}?market_ids=1,2,3&main_line=true&hide_closed=true&key=${encodeURIComponent(apiKey)}`;
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
