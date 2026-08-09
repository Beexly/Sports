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

/** Kalshi date fragment: 26AUG12 from a UTC date. */
export function toKalshiDateFragment(dateUtc: string): string {
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid game date: ${dateUtc}`);
  }
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
  const yy = String(d.getUTCFullYear()).slice(2);
  const mon = MONTHS[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mon}${dd}`;
}

/**
 * Optional local kickoff HHMM for MLB-style time-encoded tickers.
 * Uses the local wall components of the ISO commence when present;
 * for pure date-only strings returns null (series search by date + teams).
 */
export function toKalshiTimeFragment(dateUtc: string): string | null {
  // Only encode when the input carries a real time component (not midnight-only date).
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateUtc.trim())) return null;
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) return null;
  // Kalshi MLB uses local ET wall time in many tickers; try UTC first as a candidate.
  // Series search will still match without it.
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (hh === "00" && mm === "00") return null;
  return `${hh}${mm}`;
}
