# The Legal Data Edge Map — what we can already use, ranked by pick value

You asked about crawlers as a legal weapon. Here is the truth that beats any
blueprint: **the legal survey is already done, inside your own codebase.**
`packages/data-ingestion/src/source-registry.ts` is a rights-enforced registry
where ingestion code physically cannot fetch a forbidden source
(`assertIngestible()` throws). Ten lanes are already cleared. The domination
move is not finding new crawlers — it is EXPLOITING the cleared lanes nobody
is using yet.

## Cleared and ingestible today (the legal arsenal)

| Source | Verdict | Signal value for picks | Status |
|---|---|---|---|
| **nws-weather** (US National Weather Service) | cleared (US-gov public domain) | **HIGH — the #1 unexploited edge.** Wind speed/direction + temp at game time moves MLB totals measurably (wind out at Wrigley is a classic sharp play). Public domain, zero legal risk, real-time API. | `lib/weather/game-weather.ts` exists; scoring slot (VENUE_ENVIRONMENT) sits in SHADOW mode marked "no licensed context provider" — WRONG, we have one cleared. Wire it shadow-first. |
| **nflverse** | cleared w/ attribution | HIGH (NFL season) — already the analytics backbone | Wired (player lab, engines) |
| **the-odds-api** | licensed | Core odds spine | Wired |
| **sleeper** | use-with-caution | Market/ownership momentum | Wired (waiver trends) |
| **moneypuck** | cleared w/ attribution | NHL model priors | Wired (NHL stats) |
| **retrosheet** | cleared w/ attribution | MLB historical splits: park factors, ump tendencies, day/night splits | UNWIRED — park-factor priors for totals are sitting here free |
| **lahman-db** | cleared w/ attribution | MLB historical | Partially wired |
| **openfootball** | cleared | Soccer schedules/results | Wired for MLS results |
| **football-data-uk** | use-with-caution | Soccer odds history for calibration backtests | Unwired |
| **cricsheet** | cleared w/ attribution | Cricket (future market) | Parked |

## Vetted and refused — the discipline that protects the company
espn-hidden-api, pro-football-reference, sports-reference, fangraphs, PFF,
understat, draftkings-unofficial, nfelo, statsbomb-free, ergast: all marked
**forbidden** with the ToS reason recorded. This is not timidity — it is what
lets us say "every datapoint traces to a source we have the right to use" while
competitors quietly build on stolen feeds they can be cut off from (or sued
over) at any moment. The moat is that our edge SURVIVES scrutiny.

## The play, in order

1. **Weather → MLB totals (this week, biggest free win).** NWS is cleared,
   public domain, and the engine already has the VENUE_ENVIRONMENT shadow slot
   waiting. Phase 1: ingest game-time wind/temp per MLB game, store as
   GameSignal evidence, DISPLAY on pick cards ("12 mph out to CF") — no scoring
   change. Phase 2 (founder-gated MODEL_VERSION bump, per doctrine): weight it
   in totals scoring once the shadow data proves predictive on settled games.
2. **Retrosheet park factors (next).** Free historical MLB: park run-scoring
   factors + ump strike-zone tendencies as totals priors. Same shadow-first
   pattern.
3. **football-data-uk for calibration backtests.** More settled-outcome volume
   to harden the calibrator without touching live picks.
4. **New candidates** go through `lib/scraping/sports-data-candidates.ts` — the
   gated intake where approval flags are literally typed `false` so nothing
   skips review. That is where any crawler idea (RSS, public news, podcast
   metadata) enters: legal check first, wire second, always.

## The one-line doctrine
Facts (scores, odds, weather) are not copyrightable in the US; HOW you obtain
them (ToS, robots.txt, licenses) is what makes you legal or dead. We take
every fact the law gives us and not one byte more — and that restraint is
exactly why the edge compounds instead of collapsing.
