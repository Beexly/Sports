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

// ── Season windows (cost control) ───────────────────────────────────────────────
// The Odds API free tier is 500 credits/month across ALL sports. Refreshing
// out-of-season sports burns credits for empty slates. Each window is an inclusive
// [startMonth, endMonth] (1–12) that may wrap the year end (e.g. NFL Sep→Feb).
// Approximate US-league calendars — intentionally generous at the edges so we never
// miss a real game; tighten later with a schedule-driven check if needed.

type SeasonWindow = { readonly startMonth: number; readonly endMonth: number };

const SEASON_WINDOWS: Record<SupportedSportKey, SeasonWindow> = {
  // August included deliberately. Regular-season Week 1 lines are posted well
  // before September, and a Sep→Feb window meant the refresh skipped NFL for the
  // whole of August — the exact weeks the market is warming up. Measured cost of
  // this fix: the L-14 census (2026-08-20) found NFL's last odds snapshot was
  // 2026-06-17 and ZERO clean closes, while 84 future NFL games sat in the DB
  // with no odds attached.
  // NOTE: this does NOT pick up preseason games. The Odds API serves those under
  // a separate `americanfootball_nfl_preseason` key, which we do not ingest —
  // see the ledger row on the key-to-sport mapping that work needs.
  americanfootball_nfl: { startMonth: 8, endMonth: 2 },
  americanfootball_ncaaf: { startMonth: 8, endMonth: 1 },
  basketball_nba: { startMonth: 10, endMonth: 6 },
  basketball_ncaab: { startMonth: 11, endMonth: 4 },
  baseball_mlb: { startMonth: 3, endMonth: 10 },
  icehockey_nhl: { startMonth: 10, endMonth: 6 },
  soccer_usa_mls: { startMonth: 2, endMonth: 12 },
};

function monthInWindow(month: number, w: SeasonWindow): boolean {
  return w.startMonth <= w.endMonth
    ? month >= w.startMonth && month <= w.endMonth
    : month >= w.startMonth || month <= w.endMonth; // wraps year-end
}

/** True if the sport is plausibly in season on `date` (UTC month). */
export function isSportInSeason(
  key: SupportedSportKey,
  date: Date = new Date(),
): boolean {
  const w = SEASON_WINDOWS[key];
  if (!w) return true;
  return monthInWindow(date.getUTCMonth() + 1, w);
}

/**
 * Sports to refresh right now. Defaults to in-season only (cost control).
 * Set `ODDS_REFRESH_ALL_SPORTS=true` to force all sports (e.g. a backfill).
 */
export function getInSeasonSports(
  date: Date = new Date(),
): typeof SUPPORTED_SPORTS[number][] {
  if (process.env["ODDS_REFRESH_ALL_SPORTS"] === "true") {
    return [...SUPPORTED_SPORTS];
  }
  return SUPPORTED_SPORTS.filter((s) => isSportInSeason(s.key, date));
}

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

// Data freshness threshold (ms) — a game whose bookmaker odds are older than
// this is dropped as stale; if EVERY game is stale the whole run is rejected
// ("Upstream odds are stale") and no picks are generated.
//
// Was a hard 1h. That silently starved the board: the deployed Vercel
// `refresh-odds` cron runs ONCE daily at 10:00 UTC (6am ET) — ~13h before MLB
// first pitch — so bookmaker `last_update` timestamps are routinely >1h old at
// fetch time. Every game got dropped → 0 picks, every day. This 1h value also
// contradicted the platform's own shared Refresh SLA, which already declares 4h
// the staleness line for the daily cron (REFRESH_STALE_AFTER_MINUTES, see
// refresh-sla.ts). Aligned here so the odds gate and the SLA speak with one
// voice, and exposed as ODDS_FRESHNESS_MAX_HOURS so the freshness-vs-availability
// trade is an explicit owner knob, not a buried constant.
//
// TRUST NOTE: this is the maximum age of a published pregame line. Keep it tight
// enough that a genuinely dead/cached board is still rejected; the honest fix for
// consistently-fresh picks is to fetch closer to game time (more cron cycles),
// not to widen this indefinitely.
export const FRESHNESS_THRESHOLD_MS =
  (Number(process.env["ODDS_FRESHNESS_MAX_HOURS"]) || 4) * 60 * 60 * 1000;

// Upstream request timeout (ms) — a hung Odds API call must never block the
// ingestion/settlement cron. Comfortably above normal latency (<1s) while
// staying well under the cron's maxDuration so remaining sports still process.
export const ODDS_API_TIMEOUT_MS = 15 * 1000; // 15 seconds

export const THE_ODDS_API_PRODUCTION_BASE_URL = "https://api.the-odds-api.com/v4";

/**
 * The Odds API base URL.
 *
 * Default: production The Odds API.
 * Staging chaos: point at the Toxiproxy listen URL, e.g.
 *   ODDS_API_BASE_URL=http://127.0.0.1:8475/odds-api/v4
 * (see docker/chaos/README.md). Never invent quotes when upstream fails.
 *
 * THE OVERRIDE IS REFUSED IN PRODUCTION — enforced here, not left to
 * convention. This variable decides where every sportsbook quote in the system
 * comes from, and whatever it returns is written as a real, certifiable price.
 * A single mis-set env var in the production project would therefore fabricate
 * the entire quote plane while every downstream freshness, de-vig and gate
 * check kept reporting healthy, because each of them would be operating on
 * data that looks structurally perfect. That is precisely the "no invented
 * quotes" line this codebase refuses to cross, and it is the one failure mode
 * the chaos stack itself exists to prove we handle honestly.
 *
 * Falling back to the real upstream (rather than throwing) is the fail-safe
 * direction: a chaos variable left set in production degrades to correct
 * behavior instead of taking the ingestion path down.
 */
function resolveOddsApiBaseUrl(): string {
  const override = process.env["ODDS_API_BASE_URL"]?.trim().replace(/\/$/, "");
  if (!override) return THE_ODDS_API_PRODUCTION_BASE_URL;

  // Resolve the environment by FIRST NON-EMPTY value, not with `??`.
  //
  // `??` falls through only on null/undefined, so a declared-but-BLANK
  // VERCEL_ENV="" short-circuited the chain to "", NODE_ENV was never
  // consulted, and the production refusal below silently did not fire — the
  // exact failure this guard exists to prevent. Reachable in any non-Vercel
  // production runtime that declares the variable without a value, which is a
  // common container/CI shape. Reproduced before fixing: VERCEL_ENV="" with
  // NODE_ENV=production honored the override, while unset VERCEL_ENV refused
  // it. Whitespace-only behaved the same way.
  //
  // Fail-closed direction: any environment signal that trims to "production"
  // refuses the override.
  const envClass = [process.env["VERCEL_ENV"], process.env["NODE_ENV"]]
    .map((v) => v?.trim().toLowerCase())
    .find((v) => v !== undefined && v.length > 0);
  const isProduction = envClass === "production";

  if (isProduction) {
    console.warn(
      "[data-ingestion] ODDS_API_BASE_URL override IGNORED in production — " +
        "quotes must come from the real upstream. Using " +
        `${THE_ODDS_API_PRODUCTION_BASE_URL}. Unset the variable to silence this.`,
    );
    return THE_ODDS_API_PRODUCTION_BASE_URL;
  }

  return override;
}

export const ODDS_API_BASE_URL = resolveOddsApiBaseUrl();

// Region preference for odds format
export const ODDS_REGION = "us";
export const ODDS_FORMAT = "american";
