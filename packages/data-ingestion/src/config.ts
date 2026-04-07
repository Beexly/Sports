// Supported sports configuration for The Odds API
export const SUPPORTED_SPORTS = [
  {
    key: "americanfootball_nfl",
    name: "NFL",
    displayName: "National Football League",
  },
  {
    key: "americanfootball_ncaaf",
    name: "NCAAF",
    displayName: "College Football",
  },
  {
    key: "basketball_nba",
    name: "NBA",
    displayName: "National Basketball Association",
  },
  {
    key: "basketball_ncaab",
    name: "NCAAB",
    displayName: "College Basketball",
  },
  {
    key: "baseball_mlb",
    name: "MLB",
    displayName: "Major League Baseball",
  },
  {
    key: "icehockey_nhl",
    name: "NHL",
    displayName: "National Hockey League",
  },
  {
    key: "soccer_usa_mls",
    name: "MLS",
    displayName: "Major League Soccer",
  },
] as const;

export type SupportedSportKey =
  (typeof SUPPORTED_SPORTS)[number]["key"];

// Markets to fetch
export const MARKETS = ["h2h", "spreads", "totals"] as const;
export type Market = (typeof MARKETS)[number];

// Bookmakers to prioritize (ordered by reliability)
export const PRIORITY_BOOKMAKERS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "caesars",
  "pointsbetus",
  "bovada",
  "mybookieag",
];

// Data freshness threshold (ms) — reject data older than this
export const FRESHNESS_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

// The Odds API base URL
export const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

// Region preference for odds format
export const ODDS_REGION = "us";
export const ODDS_FORMAT = "american";
