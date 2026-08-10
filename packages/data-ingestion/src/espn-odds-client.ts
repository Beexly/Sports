/**
 * Free ESPN public odds → OddsApiEvent shape (zero keys).
 *
 * Source: sports.core.api.espn.com odds + site scoreboard for team names.
 * Docs community: github.com/pseudo-r/Public-ESPN-API
 *
 * Law:
 *  - Never invent quotes — empty when ESPN has no items / missing ML
 *  - Free tertiary path when THE_ODDS_API + Rundown fail/empty/429
 *  - Bookmaker key `espn_public` (labels DraftKings lines as ESPN-routed public feed)
 *  - Rate-friendly: scoreboard once + odds per event with small delay
 *  - Does not flip LIVE_BOARD / invent PROVEN
 *
 * ToU note: ESPN public JSON is undocumented; use sparingly (in-season sports only,
 * cached fetch window). Prefer licensed Odds API / Rundown when keys work.
 */

import type { OddsApiEvent, OddsApiBookmaker, OddsApiMarket } from "@sports/types";

/** Odds-API sport key → ESPN site path + core league path */
export const ESPN_ODDS_SPORT_MAP: Record<
  string,
  { sitePath: string; coreSport: string; coreLeague: string; title: string }
> = {
  americanfootball_nfl: {
    sitePath: "football/nfl",
    coreSport: "football",
    coreLeague: "nfl",
    title: "NFL",
  },
  americanfootball_ncaaf: {
    sitePath: "football/college-football",
    coreSport: "football",
    coreLeague: "college-football",
    title: "NCAAF",
  },
  baseball_mlb: {
    sitePath: "baseball/mlb",
    coreSport: "baseball",
    coreLeague: "mlb",
    title: "MLB",
  },
  basketball_nba: {
    sitePath: "basketball/nba",
    coreSport: "basketball",
    coreLeague: "nba",
    title: "NBA",
  },
  basketball_ncaab: {
    sitePath: "basketball/mens-college-basketball",
    coreSport: "basketball",
    coreLeague: "mens-college-basketball",
    title: "NCAAB",
  },
  icehockey_nhl: {
    sitePath: "hockey/nhl",
    coreSport: "hockey",
    coreLeague: "nhl",
    title: "NHL",
  },
  soccer_usa_mls: {
    sitePath: "soccer/usa.1",
    coreSport: "soccer",
    coreLeague: "usa.1",
    title: "MLS",
  },
  soccer_epl: {
    sitePath: "soccer/eng.1",
    coreSport: "soccer",
    coreLeague: "eng.1",
    title: "EPL",
  },
};

type Loose = Record<string, unknown>;

function americanNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v !== 0) return Math.round(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/^\+/, ""));
    if (Number.isFinite(n) && n !== 0) return Math.round(n);
  }
  return null;
}

function pointFromOdds(side: Loose | undefined, field: "pointSpread" | "spread"): number | null {
  if (!side) return null;
  const current = (side["current"] as Loose | undefined) ?? side;
  const ps = current[field] as Loose | undefined;
  if (!ps) return null;
  const alt = ps["alternateDisplayValue"] ?? ps["american"] ?? ps["displayValue"];
  if (typeof alt === "string") {
    const n = Number(alt.replace(/^\+/, ""));
    if (Number.isFinite(n)) return n;
  }
  if (typeof alt === "number" && Number.isFinite(alt)) return alt;
  // moneyline-only rows
  return null;
}

function mlFromSide(side: Loose | undefined): number | null {
  if (!side) return null;
  const direct = americanNum(side["moneyLine"]);
  if (direct != null) return direct;
  const current = side["current"] as Loose | undefined;
  if (current) {
    const ml = current["moneyLine"] as Loose | undefined;
    if (ml) {
      const a = americanNum(ml["american"] ?? ml["alternateDisplayValue"]);
      if (a != null) return a;
    }
  }
  return null;
}

function spreadPriceFromSide(side: Loose | undefined): number | null {
  if (!side) return null;
  const current = (side["current"] as Loose | undefined) ?? side;
  const sp = current["spread"] as Loose | undefined;
  if (!sp) return null;
  return americanNum(sp["american"] ?? sp["alternateDisplayValue"]);
}

function spreadPointFromSide(side: Loose | undefined): number | null {
  if (!side) return null;
  const current = (side["current"] as Loose | undefined) ?? side;
  const ps = current["pointSpread"] as Loose | undefined;
  if (!ps) return null;
  const alt = ps["alternateDisplayValue"] ?? ps["american"];
  if (typeof alt === "string") {
    const n = Number(String(alt).replace(/^\+/, ""));
    if (Number.isFinite(n)) return n;
  }
  if (typeof alt === "number" && Number.isFinite(alt)) return alt;
  return null;
}

export type EspnOddsFetchResult = {
  readonly events: OddsApiEvent[];
  readonly error?: string;
  readonly provider: "espn_public";
};

/**
 * Fetch free ESPN public odds for one sport key (Odds-API style).
 * Soft-fails empty — never invents.
 */
export async function fetchEspnOddsForSport(
  sportKey: string,
  options?: {
    readonly fetchImpl?: typeof fetch;
    /** Max events to price (default 24 — free-path economy). */
    readonly maxEvents?: number;
    /** Delay between event odds calls (ms). Default 120. */
    readonly interEventMs?: number;
  },
): Promise<EspnOddsFetchResult> {
  const meta = ESPN_ODDS_SPORT_MAP[sportKey];
  if (!meta) {
    return {
      events: [],
      provider: "espn_public",
      error: `espn odds: no sport map for ${sportKey}`,
    };
  }
  const fetchImpl = options?.fetchImpl ?? fetch;
  const maxEvents = Math.min(40, Math.max(1, options?.maxEvents ?? 24));
  const interEventMs = Math.max(0, options?.interEventMs ?? 120);
  const errors: string[] = [];

  const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/${meta.sitePath}/scoreboard?lang=en&region=us&limit=50`;
  let scoreboard: Loose;
  try {
    const res = await fetchImpl(scoreboardUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        events: [],
        provider: "espn_public",
        error: `espn scoreboard HTTP ${res.status}`,
      };
    }
    scoreboard = (await res.json()) as Loose;
  } catch (err) {
    return {
      events: [],
      provider: "espn_public",
      error: `espn scoreboard: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const rawEvents = (scoreboard["events"] as Loose[] | undefined) ?? [];
  const now = Date.now();
  // Prefer not-started / upcoming; include in-progress for live board
  const candidates = rawEvents
    .map((e) => {
      const comps = (e["competitions"] as Loose[] | undefined) ?? [];
      const c = comps[0] ?? {};
      const status = ((c["status"] as Loose | undefined)?.["type"] as Loose | undefined) ?? {};
      const state = String(status["state"] ?? "").toLowerCase();
      const competitors = (c["competitors"] as Loose[] | undefined) ?? [];
      let home = "";
      let away = "";
      for (const t of competitors) {
        const team = (t["team"] as Loose | undefined) ?? {};
        const name = String(team["displayName"] ?? team["name"] ?? "").trim();
        if (String(t["homeAway"] ?? "") === "home") home = name;
        if (String(t["homeAway"] ?? "") === "away") away = name;
      }
      const commence =
        String(c["date"] ?? e["date"] ?? new Date().toISOString());
      return {
        id: String(e["id"] ?? ""),
        home,
        away,
        commence,
        state,
        completed: Boolean(status["completed"]),
      };
    })
    .filter((e) => e.id && e.home && e.away && !e.completed)
    .slice(0, maxEvents);

  const out: OddsApiEvent[] = [];
  const lastUpdate = new Date().toISOString();

  for (let i = 0; i < candidates.length; i++) {
    const ev = candidates[i]!;
    if (i > 0 && interEventMs > 0) {
      await new Promise((r) => setTimeout(r, interEventMs));
    }
    const oddsUrl =
      `https://sports.core.api.espn.com/v2/sports/${meta.coreSport}/leagues/${meta.coreLeague}` +
      `/events/${ev.id}/competitions/${ev.id}/odds`;
    try {
      const res = await fetchImpl(oddsUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        errors.push(`${ev.id}:HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as Loose;
      const items = (body["items"] as Loose[] | undefined) ?? [];
      if (items.length === 0) {
        errors.push(`${ev.id}:empty`);
        continue;
      }
      const item = items[0]!;
      const providerName = String(
        ((item["provider"] as Loose | undefined)?.["name"] as string | undefined) ??
          "ESPN",
      );
      const away = item["awayTeamOdds"] as Loose | undefined;
      const home = item["homeTeamOdds"] as Loose | undefined;
      const awayMl = mlFromSide(away);
      const homeMl = mlFromSide(home);
      if (awayMl == null || homeMl == null) {
        errors.push(`${ev.id}:no_ml`);
        continue;
      }

      const markets: OddsApiMarket[] = [
        {
          key: "h2h",
          last_update: lastUpdate,
          outcomes: [
            { name: ev.away, price: awayMl },
            { name: ev.home, price: homeMl },
          ],
        },
      ];

      const awaySpreadPt = spreadPointFromSide(away);
      const homeSpreadPt = spreadPointFromSide(home);
      const awaySpreadPx = spreadPriceFromSide(away);
      const homeSpreadPx = spreadPriceFromSide(home);
      if (
        awaySpreadPt != null &&
        homeSpreadPt != null &&
        awaySpreadPx != null &&
        homeSpreadPx != null
      ) {
        markets.push({
          key: "spreads",
          last_update: lastUpdate,
          outcomes: [
            { name: ev.away, price: awaySpreadPx, point: awaySpreadPt },
            { name: ev.home, price: homeSpreadPx, point: homeSpreadPt },
          ],
        });
      }

      const ou = item["overUnder"];
      const overOdds = americanNum(item["overOdds"]);
      const underOdds = americanNum(item["underOdds"]);
      if (
        typeof ou === "number" &&
        Number.isFinite(ou) &&
        overOdds != null &&
        underOdds != null
      ) {
        markets.push({
          key: "totals",
          last_update: lastUpdate,
          outcomes: [
            { name: "Over", price: overOdds, point: ou },
            { name: "Under", price: underOdds, point: ou },
          ],
        });
      }

      const book: OddsApiBookmaker = {
        key: "espn_public",
        title: `ESPN/${providerName}`,
        last_update: lastUpdate,
        markets,
      };

      out.push({
        id: `espn:${sportKey}:${ev.id}`,
        sport_key: sportKey,
        sport_title: meta.title,
        commence_time: ev.commence,
        home_team: ev.home,
        away_team: ev.away,
        bookmakers: [book],
      });
    } catch (err) {
      errors.push(
        `${ev.id}:${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Drop absurdly old commence if clock skew (keep if within -1d..+21d)
  const filtered = out.filter((e) => {
    const t = Date.parse(e.commence_time);
    if (!Number.isFinite(t)) return true;
    const days = (t - now) / 86400000;
    return days >= -1 && days <= 21;
  });

  if (filtered.length === 0) {
    return {
      events: [],
      provider: "espn_public",
      error: errors.length
        ? `espn odds empty: ${errors.slice(0, 4).join("; ")}`
        : "espn odds empty: no events with lines",
    };
  }
  return {
    events: filtered,
    provider: "espn_public",
    error: errors.length
      ? `partial: ${errors.slice(0, 3).join("; ")}`
      : undefined,
  };
}
