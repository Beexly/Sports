/**
 * Kalshi series ticker maps — sport → series list (game-winner first).
 *
 * Harvested from sports-skills KALSHI_SERIES (machina-sports) and verified
 * against live Trade API 2026-08-09. Game-winner series carry two-sided
 * (or soccer three-sided incl. Tie) moneyline contracts used as independent
 * fair values. Futures/props series are listed for discovery but not used
 * for moneyline fair-value by default.
 *
 * Constructed event tickers alone are insufficient: MLB (and some others)
 * encode local start time into the event stem (e.g. KXMLBGAME-26AUG121610MILSD).
 * Series-aware search is the honest coverage path.
 */

/** Canonical sport codes used for series lookup. */
export type KalshiSportCode =
  | "nfl"
  | "nba"
  | "mlb"
  | "nhl"
  | "wnba"
  | "cfb"
  | "cbb"
  | "epl"
  | "ucl"
  | "laliga"
  | "bundesliga"
  | "seriea"
  | "ligue1"
  | "mls"
  | "worldcup";

/**
 * League codes accepted by KalshiGameRef / team abbr tables.
 * US majors + college + primary soccer series with game markets.
 */
export type KalshiLeagueCode =
  | "NFL"
  | "NBA"
  | "MLB"
  | "NHL"
  | "WNBA"
  | "CFB"
  | "CBB"
  | "EPL"
  | "UCL"
  | "LALIGA"
  | "BUNDESLIGA"
  | "SERIEA"
  | "LIGUE1"
  | "MLS";

/** Full series map (game + props/futures). Single source of truth. */
export const KALSHI_SERIES: Readonly<Record<KalshiSportCode, readonly string[]>> = {
  nfl: [
    "KXNFL",
    "KXNFLGAME",
    "KXNFLSPREAD",
    "KXNFLTOTAL",
    "KXNFLTEAMTOTAL",
    "KXNFLANYTD",
    "KXNFL1HWINNER",
    "KXNFL2HWINNER",
  ],
  nba: [
    "KXNBA",
    "KXNBAGAME",
    "KXNBASPREAD",
    "KXNBATOTAL",
    "KXNBATEAMTOTAL",
    "KXNBAPTS",
    "KXNBAPRA",
    "KXNBAREB",
    "KXNBAAST",
    "KXNBA3PT",
  ],
  mlb: ["KXMLB", "KXMLBGAME", "KXMLBSPREAD", "KXMLBTOTAL", "KXMLBTEAMTOTAL", "KXMLBHR", "KXMLB1H"],
  nhl: ["KXNHL", "KXNHLGAME", "KXNHLSPREAD", "KXNHLTOTAL", "KXNHLTEAMTOTAL", "KXNHLPTS", "KXNHLGOAL"],
  wnba: ["KXWNBA", "KXWNBAGAME", "KXWNBASPREAD", "KXWNBATOTAL", "KXWNBAPTS"],
  cfb: ["KXCFB", "KXCFBGAME", "KXCFBSPREAD", "KXCFBTOTAL"],
  cbb: ["KXCBB", "KXCBBSPREAD", "KXCBBCGAME", "KXCBBTOTAL"],
  epl: ["KXEPLGAME", "KXEPLTOTAL", "KXEPLBTTS", "KXEPLSPREAD", "KXEPLGOAL"],
  ucl: ["KXUCL", "KXUEFAGAME"],
  laliga: ["KXLALIGA"],
  bundesliga: ["KXBUNDESLIGA"],
  seriea: ["KXSERIEA"],
  ligue1: ["KXLIGUE1"],
  mls: ["KXMLSGAME"],
  worldcup: [
    "KXMENWORLDCUP",
    "KXWCGAME",
    "KXWCGROUPQUAL",
    "KXWCGROUPORDER",
    "KXWCSTAGE",
    "KXWCHOSTSTAGE",
    "KXWCBESTHOST",
    "KXWCNOEURSA",
    "KXWCREGIONKO",
    "KXWCEVERYTEAMGOAL",
  ],
};

/**
 * Series used for game-winner moneyline fair values only.
 * Prefer *GAME (or CBB's KXCBBCGAME) stems; skip futures-only when a game series exists.
 */
export const KALSHI_GAME_SERIES: Readonly<Record<KalshiSportCode, readonly string[]>> = {
  nfl: ["KXNFLGAME"],
  nba: ["KXNBAGAME"],
  mlb: ["KXMLBGAME"],
  nhl: ["KXNHLGAME"],
  wnba: ["KXWNBAGAME"],
  cfb: ["KXCFBGAME"],
  cbb: ["KXCBBCGAME"],
  epl: ["KXEPLGAME"],
  ucl: ["KXUEFAGAME"],
  laliga: ["KXLALIGA"],
  bundesliga: ["KXBUNDESLIGA"],
  seriea: ["KXSERIEA"],
  ligue1: ["KXLIGUE1"],
  mls: ["KXMLSGAME"],
  worldcup: ["KXWCGAME"],
};

/** Map KalshiLeagueCode → sport code for series lookup. */
export function leagueToSportCode(league: KalshiLeagueCode): KalshiSportCode {
  const map: Record<KalshiLeagueCode, KalshiSportCode> = {
    NFL: "nfl",
    NBA: "nba",
    MLB: "mlb",
    NHL: "nhl",
    WNBA: "wnba",
    CFB: "cfb",
    CBB: "cbb",
    EPL: "epl",
    UCL: "ucl",
    LALIGA: "laliga",
    BUNDESLIGA: "bundesliga",
    SERIEA: "seriea",
    LIGUE1: "ligue1",
    MLS: "mls",
  };
  return map[league];
}

/**
 * Map Odds-API sport keys → Kalshi league codes.
 * Null = no Kalshi game series mapping (honest no-opinion).
 */
export function sportKeyToKalshiLeagueCode(sportKey: string): KalshiLeagueCode | null {
  const k = sportKey.trim().toLowerCase();
  if (k === "americanfootball_nfl" || k === "nfl") return "NFL";
  if (k === "basketball_nba" || k === "nba") return "NBA";
  if (k === "baseball_mlb" || k === "mlb") return "MLB";
  if (k === "icehockey_nhl" || k === "nhl") return "NHL";
  if (k === "basketball_wnba" || k === "wnba") return "WNBA";
  if (
    k === "americanfootball_ncaaf" ||
    k === "ncaaf" ||
    k.includes("college_football") ||
    k.includes("ncaaf")
  ) {
    return "CFB";
  }
  if (
    k === "basketball_ncaab" ||
    k === "ncaab" ||
    k.includes("ncaab") ||
    k.includes("college_basketball")
  ) {
    return "CBB";
  }
  // Soccer — Odds API keys vary; match common patterns.
  if (k === "soccer_epl" || k.includes("epl") || k.includes("premier_league")) return "EPL";
  if (k === "soccer_uefa_champs_league" || k.includes("uefa_champs") || k === "soccer_ucl") {
    return "UCL";
  }
  if (k.includes("la_liga") || k.includes("laliga") || k === "soccer_spain_la_liga") return "LALIGA";
  if (k.includes("bundesliga") || k === "soccer_germany_bundesliga") return "BUNDESLIGA";
  if (k.includes("serie_a") || k.includes("seriea") || k === "soccer_italy_serie_a") return "SERIEA";
  if (k.includes("ligue_1") || k.includes("ligue1") || k === "soccer_france_ligue_one") return "LIGUE1";
  if (k === "soccer_usa_mls" || k === "soccer_mls" || k.endsWith("_mls") || k === "mls") return "MLS";
  return null;
}

/** Game-winner series tickers for a league (may be empty). */
export function gameSeriesForLeague(league: KalshiLeagueCode): readonly string[] {
  return KALSHI_GAME_SERIES[leagueToSportCode(league)] ?? [];
}

/**
 * Legacy constructed-ticker stem: KX<LEAGUE>GAME for US majors.
 * College / soccer use series search primarily; stem still useful as prefix filter.
 */
export function constructedEventSeriesStem(league: KalshiLeagueCode): string {
  const stems: Record<KalshiLeagueCode, string> = {
    NFL: "KXNFLGAME",
    NBA: "KXNBAGAME",
    MLB: "KXMLBGAME",
    NHL: "KXNHLGAME",
    WNBA: "KXWNBAGAME",
    CFB: "KXCFBGAME",
    CBB: "KXCBBCGAME",
    EPL: "KXEPLGAME",
    UCL: "KXUEFAGAME",
    LALIGA: "KXLALIGA",
    BUNDESLIGA: "KXBUNDESLIGA",
    SERIEA: "KXSERIEA",
    LIGUE1: "KXLIGUE1",
    MLS: "KXMLSGAME",
  };
  return stems[league];
}

/** Kalshi US sports calendar uses America/New_York wall dates. */
export const KALSHI_TICKER_TZ = "America/New_York";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function etParts(d: Date): {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KALSHI_TICKER_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string): number => {
    const v = parts.find((p) => p.type === type)?.value;
    return v != null ? Number(v) : Number.NaN;
  };
  return {
    year: get("year"),
    monthIndex: get("month") - 1,
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/**
 * Kalshi date fragment: 26AUG12.
 * - Pure YYYY-MM-DD strings are treated as calendar days (no TZ shift).
 * - Full ISO instants use America/New_York wall date (sports-skills / live Kalshi).
 */
export function toKalshiDateFragment(dateUtc: string): string {
  const trimmed = dateUtc.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [ys, ms, ds] = trimmed.split("-");
    const year = Number(ys);
    const monthIndex = Number(ms) - 1;
    const day = Number(ds);
    if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1) {
      throw new Error(`Invalid game date: ${dateUtc}`);
    }
    const yy = String(year).slice(2);
    const mon = MONTHS[monthIndex];
    const dd = String(day).padStart(2, "0");
    return `${yy}${mon}${dd}`;
  }
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid game date: ${dateUtc}`);
  }
  const p = etParts(d);
  if (!Number.isFinite(p.year) || p.monthIndex < 0 || p.monthIndex > 11) {
    throw new Error(`Invalid game date: ${dateUtc}`);
  }
  const yy = String(p.year).slice(2);
  const mon = MONTHS[p.monthIndex];
  const dd = String(p.day).padStart(2, "0");
  return `${yy}${mon}${dd}`;
}

/**
 * Optional ET kickoff HHMM for MLB-style time-encoded tickers.
 * Pure date-only strings → null (series search by date + teams).
 * Port: sports-skills markets connector uses America/New_York wall clock.
 */
export function toKalshiTimeFragment(dateUtc: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateUtc.trim())) return null;
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) return null;
  const p = etParts(d);
  if (!Number.isFinite(p.hour) || !Number.isFinite(p.minute)) return null;
  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  // Midnight ET with no meaningful clock → treat as date-only (series recovers).
  if (hh === "00" && mm === "00") return null;
  return `${hh}${mm}`;
}

/** Max |commence − market occurrence| for series attach (sports-skills: 12h). */
export const MAX_MARKET_START_SKEW_MS = 12 * 60 * 60 * 1000;

/**
 * Parse Kalshi game event ticker tail (after last hyphen of series stem):
 *   YY + MON + DD + optional HHMM + team_pair + optional Gn
 * e.g. 26AUG121610MILSD, 26AUG12NYKSAS, 26AUG121610MILSDG1
 *
 * Port of sports-skills `_parse_kalshi_event_tail`. Embedded HHMM is ET.
 * Returns null fields when grammar does not match — never invents.
 */
export type KalshiEventTail = {
  readonly dateFrag: string; // YYMMMDD
  readonly timeFrag: string | null; // HHMM or null
  readonly teamPair: string;
  readonly gameNum: number | null;
  /** Start instant from ET wall clock when HHMM present; else null. */
  readonly startUtcMs: number | null;
};

const TAIL_RE =
  /^(\d{2})([A-Z]{3})(\d{2})(\d{4})?([A-Z]+?)(?:G(\d))?$/;

const MONTH_NUM: Readonly<Record<string, number>> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

export function parseKalshiEventTail(eventTicker: string): KalshiEventTail | null {
  const upper = eventTicker.toUpperCase();
  const dash = upper.lastIndexOf("-");
  const tail = dash >= 0 ? upper.slice(dash + 1) : upper;
  const m = TAIL_RE.exec(tail);
  if (!m) return null;
  const yy = m[1]!;
  const mon = m[2]!;
  const dd = m[3]!;
  const hhmm = m[4] ?? null;
  const pair = m[5]!;
  const gameNum = m[6] != null ? Number(m[6]) : null;
  const month = MONTH_NUM[mon];
  if (month == null) return null;
  const dateFrag = `${yy}${mon}${dd}`;
  let startUtcMs: number | null = null;
  if (hhmm && hhmm.length === 4) {
    // Build ET wall time via temporal-like construction: use Date with offset probe.
    // America/New_York: format a UTC candidate and adjust — prefer Intl.
    const year = 2000 + Number(yy);
    const hour = Number(hhmm.slice(0, 2));
    const minute = Number(hhmm.slice(2));
    if (
      Number.isFinite(year) &&
      Number.isFinite(hour) &&
      Number.isFinite(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      // Binary-search UTC ms that formats to the desired ET wall components.
      // Noon UTC on that calendar day as seed, then refine.
      const seed = Date.UTC(year, month - 1, Number(dd), 12, 0, 0);
      // Walk a window of ±1 day in 15m steps is too heavy; use offset table via format.
      // Construct ISO-like local and ask: getTimezoneOffset is host-local, not ET.
      // Instead: iterate hours around seed with formatToParts.
      let best: number | null = null;
      for (let offsetH = -14; offsetH <= 14; offsetH++) {
        const cand = seed + offsetH * 3600_000;
        const d = new Date(cand);
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: KALSHI_TICKER_TZ,
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hourCycle: "h23",
        }).formatToParts(d);
        const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
        if (
          get("year") === year &&
          get("month") === month &&
          get("day") === Number(dd) &&
          get("hour") === hour &&
          get("minute") === minute
        ) {
          best = cand;
          break;
        }
      }
      // Refine minutes if hour matched but minute off — scan ±60 min around best hour
      if (best == null) {
        for (let offsetM = -14 * 60; offsetM <= 14 * 60; offsetM++) {
          const cand = seed + offsetM * 60_000;
          const d = new Date(cand);
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: KALSHI_TICKER_TZ,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hourCycle: "h23",
          }).formatToParts(d);
          const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
          if (
            get("year") === year &&
            get("month") === month &&
            get("day") === Number(dd) &&
            get("hour") === hour &&
            get("minute") === minute
          ) {
            best = cand;
            break;
          }
        }
      }
      startUtcMs = best;
    }
  }
  return {
    dateFrag,
    timeFrag: hhmm,
    teamPair: pair,
    gameNum: Number.isFinite(gameNum as number) ? gameNum : null,
    startUtcMs,
  };
}
