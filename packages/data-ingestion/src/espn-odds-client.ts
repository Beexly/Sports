/**
 * Free ESPN public odds → OddsApiEvent shape (zero keys).
 *
 * Galaxy Sports API formula (verified 2026-08-27 from this IP):
 *   1. site.web.api.espn.com scoreboard (site.api + sports.core are Akamai-blocked)
 *   2. Read INLINE competition.odds (DraftKings block) — one keyless call, no vendor key
 *   3. Never invent spread prices (point only when ESPN omits American price)
 *   4. Core /odds remains a fallback when inline odds are absent
 *
 * Law:
 *  - Never invent quotes — empty when no ML
 *  - Does not flip LIVE_BOARD / invent PROVEN
 *  - Rights: ESPN public JSON is undocumented and ESPN's ToU favors personal
 *    use; this path runs ONLY under the "galaxy-espn-inline" registry entry
 *    (founder decision 2026-08-27, low-volume odds facts only) and soft-fails
 *    empty if that entry is ever revoked. Prefer licensed feeds when keyed.
 *  - Every fetch carries a timeout — a blackholed host must never stall the
 *    ingestion cron.
 */

import type { OddsApiEvent, OddsApiBookmaker, OddsApiMarket } from "@sports/types";
import { deVigFairProbs } from "./galaxy-devig.js";
import { kalshiH2hBookmaker } from "./galaxy-kalshi-book.js";
import { sportKeyToKalshiLeagueCode } from "./kalshi-series.js";
import { isIngestible } from "./source-registry.js";
import type { KalshiFairValue, KalshiGameRef } from "./kalshi-client.js";

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

/** YYYYMMDD UTC for ESPN dates= param. */
function espnDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Today + next N days (default 3) so night-slate games after evening UTC still appear.
 * Empty string first = ESPN default "today" board (may include late/live).
 */
function scoreboardDateParams(now: Date, horizonDays: number): string[] {
  const keys: string[] = [""];
  for (let i = 0; i <= horizonDays; i++) {
    const d = new Date(now.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    keys.push(espnDateKey(d));
  }
  return [...new Set(keys)];
}

export type EspnOddsFetchResult = {
  readonly events: OddsApiEvent[];
  readonly error?: string;
  readonly provider: "espn_public";
};

type Candidate = {
  id: string;
  home: string;
  away: string;
  homeAbbr: string;
  awayAbbr: string;
  commence: string;
  completed: boolean;
  inlineOdds: Loose | null;
};

function pickInlineOddsBlock(comp: Loose): Loose | null {
  const blocks = (comp["odds"] as Loose[] | undefined) ?? [];
  if (blocks.length === 0) return null;
  const dk = blocks.find((o) => {
    const name = String(((o["provider"] as Loose | undefined)?.["name"] as string | undefined) ?? "");
    return name === "DraftKings";
  });
  return dk ?? blocks[0] ?? null;
}

function mlFromClose(side: Loose | undefined): number | null {
  if (!side) return null;
  const close = (side["close"] as Loose | undefined) ?? side;
  return americanNum(close["odds"] ?? close["american"]);
}

function eventFromInlineOdds(
  sportKey: string,
  title: string,
  ev: Candidate,
  lastUpdate: string,
): OddsApiEvent | null {
  const blk = ev.inlineOdds;
  if (!blk) return null;
  const ml = (blk["moneyline"] as Loose | undefined) ?? {};
  const homeMl = mlFromClose(ml["home"] as Loose | undefined);
  const awayMl = mlFromClose(ml["away"] as Loose | undefined);
  if (homeMl == null || awayMl == null) return null;

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
  const fair = deVigFairProbs(markets[0]!.outcomes);
  for (const o of markets[0]!.outcomes) {
    const fp = fair[o.name];
    if (fp != null) o.fair_prob = fp;
  }
  if (blk["spread"] != null) {
    const s = Number(blk["spread"]);
    if (Number.isFinite(s)) {
      markets.push({
        key: "spreads",
        last_update: lastUpdate,
        outcomes: [
          // Full display names, never abbreviations: DataNormalizer matches
          // spreads outcomes by exact event.home_team/away_team, which carry
          // the display names. An abbreviation here normalizes to a row with
          // spread and both prices undefined (all-NULL Odds row).
          { name: ev.home, point: s },
          { name: ev.away, point: -s },
        ],
      });
    }
  }
  if (blk["overUnder"] != null) {
    const ou = Number(blk["overUnder"]);
    if (Number.isFinite(ou)) {
      markets.push({
        key: "totals",
        last_update: lastUpdate,
        outcomes: [
          { name: "Over", point: ou },
          { name: "Under", point: ou },
        ],
      });
    }
  }
  const providerName = String(
    ((blk["provider"] as Loose | undefined)?.["name"] as string | undefined) ?? "DraftKings",
  );
  const book: OddsApiBookmaker = {
    key: "espn_public",
    title: `ESPN/${providerName}`,
    last_update: lastUpdate,
    markets,
  };
  return {
    id: `espn:${sportKey}:${ev.id}`,
    sport_key: sportKey,
    sport_title: title,
    commence_time: ev.commence,
    home_team: ev.home,
    away_team: ev.away,
    bookmakers: [book],
  };
}

function parseCandidates(scoreboard: Loose): Candidate[] {
  const rawEvents = (scoreboard["events"] as Loose[] | undefined) ?? [];
  const out: Candidate[] = [];
  for (const e of rawEvents) {
    const comps = (e["competitions"] as Loose[] | undefined) ?? [];
    const c = comps[0] ?? {};
    const status = ((c["status"] as Loose | undefined)?.["type"] as Loose | undefined) ?? {};
    const competitors = (c["competitors"] as Loose[] | undefined) ?? [];
    let home = "";
    let away = "";
    let homeAbbr = "";
    let awayAbbr = "";
    for (const t of competitors) {
      const team = (t["team"] as Loose | undefined) ?? {};
      const name = String(team["displayName"] ?? team["name"] ?? "").trim();
      const abbr = String(team["abbreviation"] ?? "").trim();
      if (String(t["homeAway"] ?? "") === "home") {
        home = name;
        homeAbbr = abbr;
      }
      if (String(t["homeAway"] ?? "") === "away") {
        away = name;
        awayAbbr = abbr;
      }
    }
    const commence = String(c["date"] ?? e["date"] ?? new Date().toISOString());
    out.push({
      id: String(e["id"] ?? ""),
      home,
      away,
      homeAbbr,
      awayAbbr,
      commence,
      completed: Boolean(status["completed"]),
      inlineOdds: pickInlineOddsBlock(c),
    });
  }
  return out;
}

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
    /** Days ahead for scoreboard dates= (default 3). */
    readonly horizonDays?: number;
    /** Per-request timeout (ms, default 8000) — blocked hosts fail fast. */
    readonly fetchTimeoutMs?: number;
    /**
     * Optional Kalshi exchange client. When provided (and the sport maps to a
     * Kalshi league), each event gains a second REAL bookmaker from the
     * exchange's live two-way H2H quote — the honest path past
     * MIN_BOOKMAKERS=2 on the keyless plane. Failures are per-event soft
     * misses; Kalshi can never break the ESPN board.
     */
    readonly kalshi?: {
      getFairValue(game: KalshiGameRef): Promise<KalshiFairValue | null>;
    };
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
  // Clearance gate: this keyless path exists only under its registry entry.
  if (!isIngestible("galaxy-espn-inline")) {
    return {
      events: [],
      provider: "espn_public",
      error: "espn odds: source not cleared (galaxy-espn-inline)",
    };
  }
  const fetchImpl = options?.fetchImpl ?? fetch;
  const fetchTimeoutMs = Math.min(30000, Math.max(1000, options?.fetchTimeoutMs ?? 8000));
  const maxEvents = Math.min(40, Math.max(1, options?.maxEvents ?? 24));
  const interEventMs = Math.max(0, options?.interEventMs ?? 120);
  const horizonDays = Math.min(7, Math.max(0, options?.horizonDays ?? 3));
  const errors: string[] = [];
  const now = new Date();
  const dateParams = scoreboardDateParams(now, horizonDays);
  const byId = new Map<string, Candidate>();

  const scoreboardHosts = [
    "https://site.web.api.espn.com/apis/site/v2/sports",
    "https://site.api.espn.com/apis/site/v2/sports",
  ];

  for (let di = 0; di < dateParams.length; di++) {
    const dates = dateParams[di]!;
    let gotBoard = false;
    for (const host of scoreboardHosts) {
      const scoreboardUrl =
        `${host}/${meta.sitePath}/scoreboard` +
        `?lang=en&region=us&limit=50` +
        (dates ? `&dates=${dates}` : "");
      try {
        if (di > 0 || gotBoard) await new Promise((r) => setTimeout(r, 80));
        const res = await fetchImpl(scoreboardUrl, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(fetchTimeoutMs),
        });
        if (!res.ok) {
          errors.push(`scoreboard${dates ? ` ${dates}` : ""}:${host}:HTTP ${res.status}`);
          continue;
        }
        const scoreboard = (await res.json()) as Loose;
        for (const c of parseCandidates(scoreboard)) {
          if (!c.id || !c.home || !c.away || c.completed) continue;
          if (!byId.has(c.id)) byId.set(c.id, c);
        }
        gotBoard = true;
        break;
      } catch (err) {
        errors.push(
          `scoreboard${dates ? ` ${dates}` : ""}:${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  const candidates = [...byId.values()]
    .sort((a, b) => Date.parse(a.commence) - Date.parse(b.commence))
    .slice(0, maxEvents);

  if (candidates.length === 0) {
    return {
      events: [],
      provider: "espn_public",
      error: errors.length
        ? `espn odds empty board: ${errors.slice(0, 4).join("; ")}`
        : "espn odds empty board: no upcoming events",
    };
  }

  const out: OddsApiEvent[] = [];
  const lastUpdate = new Date().toISOString();
  const nowMs = now.getTime();

  for (let i = 0; i < candidates.length; i++) {
    const ev = candidates[i]!;
    if (i > 0 && interEventMs > 0) {
      await new Promise((r) => setTimeout(r, interEventMs));
    }

    const inline = eventFromInlineOdds(sportKey, meta.title, ev, lastUpdate);
    if (inline) {
      out.push(inline);
      continue;
    }

    const oddsUrl =
      `https://sports.core.api.espn.com/v2/sports/${meta.coreSport}/leagues/${meta.coreLeague}` +
      `/events/${ev.id}/competitions/${ev.id}/odds`;
    try {
      const res = await fetchImpl(oddsUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(fetchTimeoutMs),
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

  // Keep live + upcoming within -6h..+21d (night slate / late games)
  const filtered = out.filter((e) => {
    const t = Date.parse(e.commence_time);
    if (!Number.isFinite(t)) return true;
    const hours = (t - nowMs) / 3600000;
    return hours >= -6 && hours <= 21 * 24;
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

  // Second real book: Kalshi exchange H2H (cleared registry entry "kalshi").
  // Per-event soft miss — a Kalshi failure or unmapped matchup never drops
  // the ESPN book, it just leaves that event single-book (and un-mintable).
  const kalshi = options?.kalshi;
  const kalshiLeague = kalshi && isIngestible("kalshi") ? sportKeyToKalshiLeagueCode(sportKey) : null;
  const events = !kalshiLeague
    ? filtered
    : await (async () => {
        const withBooks: OddsApiEvent[] = [];
        for (const e of filtered) {
          const evId = e.id.slice(e.id.lastIndexOf(":") + 1);
          const cand = byId.get(evId);
          if (!cand || !cand.homeAbbr || !cand.awayAbbr) {
            withBooks.push(e);
            continue;
          }
          try {
            const fv = await kalshi!.getFairValue({
              league: kalshiLeague,
              dateUtc: e.commence_time,
              homeAbbr: cand.homeAbbr,
              awayAbbr: cand.awayAbbr,
            });
            const book = fv
              ? kalshiH2hBookmaker({
                  fairValue: fv,
                  homeAbbr: cand.homeAbbr,
                  awayAbbr: cand.awayAbbr,
                  homeTeam: e.home_team,
                  awayTeam: e.away_team,
                })
              : null;
            withBooks.push(book ? { ...e, bookmakers: [...e.bookmakers, book] } : e);
          } catch (err) {
            errors.push(`kalshi:${evId}:${err instanceof Error ? err.message : String(err)}`);
            withBooks.push(e);
          }
        }
        return withBooks;
      })();

  return {
    events,
    provider: "espn_public",
    error: errors.length
      ? `partial: ${errors.slice(0, 3).join("; ")}`
      : undefined,
  };
}
