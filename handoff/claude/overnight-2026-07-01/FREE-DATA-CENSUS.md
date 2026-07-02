# The Free Sports Data Census — every usable source, mapped and ranked

The complete map of free and free-tier sports data on the open internet,
evaluated for GSE. Each entry: what it gives, the legal read, the pick value,
and the wiring effort. Entries marked **[verify live]** have details that must
be confirmed against the live docs before an adapter is written (the
no-fabrication rule applies to rate limits too). Promotion path for everything
here: `lib/scraping/sports-data-candidates.ts` (gated intake) → verified entry
in `packages/data-ingestion/src/source-registry.ts` → adapter.

Legend: value = signal value for picks/analytics (H/M/L). effort = wiring cost
(S/M/L). Existing registry verdicts are noted where already ruled.

---

## 1. Official league and public endpoints (the crown jewels)

| Source | What it gives | Access | Legal read | Value | Effort |
|---|---|---|---|---|---|
| **MLB Stats API** (statsapi.mlb.com) | Schedules, probable pitchers, LINEUPS, live scores, player stats, weather at park | Free, no key, JSON | Publicly documented endpoints; MLB's terms restrict commercial redistribution of raw feeds — using facts (lineups/probables) as model INPUTS is the defensible pattern (facts aren't copyrightable, Feist v. Rural); do not re-serve the feed. **[verify live: current ToS]** | **H — probable pitchers + confirmed lineups are the single sharpest free MLB signal** | M |
| **NHL API** (api-web.nhle.com) | Schedules, rosters, live boxscores, shift charts | Free, no key | Same fact-input pattern; widely used by hockey analytics community for years | H (NHL season) | M |
| **NBA Stats** (stats.nba.com) | Deep player/team stats | Free but aggressively bot-protected | ToS prohibits automated access; community wrappers exist but this is the espn-hidden-api pattern the registry already forbids | M | — treat as **forbidden** unless terms change |
| **ESPN public RSS feeds** | News headlines per sport/team | Free RSS | RSS is a published syndication feed — designed for machine consumption; headlines/links only, no article scraping | M (news timing signal) | S |
| **NCAA stats (stats.ncaa.org)** | College box scores | Free web | No API; scraping ToS-gray | M | — park |

## 2. Open-data projects (already the backbone — use MORE of them)

| Source | What it gives | Legal | Value | Status |
|---|---|---|---|---|
| **nflverse** (nflverse.com, GitHub releases) | PBP, NGS, injuries, depth charts, snap counts, rosters, draft, combine | CC-BY-4.0, registry: **cleared-with-attribution** | H | Wired; more datasets available than currently used (participation, officials, stadium/weather history) |
| **Baseball Savant / Statcast CSV** (baseballsavant.mlb.com) | Pitch-level Statcast: barrel%, xwOBA, sprint speed | Free CSV export endpoints; MLBAM data, same facts-as-inputs pattern **[verify live]** | **H — MLB totals/props edge** | Unwired; pybaseball (MIT) documents the endpoints |
| **Retrosheet** | Every MLB game ever: park factors, ump assignments, splits | Registry: **cleared-with-attribution** (notice required) | H (park/ump priors) | Unwired — in the edge map |
| **Chadwick Bureau register** (GitHub) | Player ID crosswalk (MLBAM↔Retrosheet↔FanGraphs IDs) | Open data | M (plumbing for joins) | Unwired; needed the moment two MLB sources join |
| **MoneyPuck** | NHL model outputs, shot data | Registry: **cleared-with-attribution** | H (NHL) | Wired |
| **Lahman** | MLB historical | Registry: cleared-with-attribution | M | Partially wired |
| **openfootball / football-data-uk** | Soccer schedules/results/odds history | Registry: cleared / use-with-caution | M | Partially wired |
| **sportsdataverse ecosystem** (hoopR, cfbfastR, wehoop — GitHub) | College BB/FB, WNBA play-by-play archives (parquet releases) | MIT-licensed code; data releases mirror public feeds **[verify per-dataset]** | H for NCAAB/CFB season | Unwired — biggest college unlock |
| **KenPom** | College BB ratings | Paid + scraping forbidden | — | forbidden |
| **Natural Stat Trick / Evolving Hockey** | NHL advanced | Scrape-only / paid | — | park / forbidden |

## 3. Community & freemium APIs

| Source | What it gives | Free tier | Legal | Value |
|---|---|---|---|---|
| **balldontlie.io** | NBA players/games/stats, historical | Free tier w/ key **[verify live: current limits]** | Legit public API with ToS permitting apps | M-H (NBA season) |
| **TheSportsDB** | Multi-sport metadata, schedules, artwork | Free tier (donation-keyed) | Community DB, permissive | M (metadata/art) |
| **API-Sports** (api-sports.io) | Multi-sport incl. odds | 100 req/day free per API | Commercial freemium; already in memory as part of the decided stack | M-H |
| **football-data.org** | Soccer competitions | 10 req/min free | Free tier explicitly for development; attribution | M |
| **SportsDataIO / FantasyData** | Everything | Trial only | Registry: **paid-required** | — |
| **Sleeper API** | Fantasy trends, ownership | Free, public docs | Registry: **use-with-caution** | Wired |
| **Sportradar** | Everything | Trial keys | Paid-required | — future |

## 4. Odds & market data

| Source | What it gives | Free tier | Legal | Value |
|---|---|---|---|---|
| **The Odds API** | Multi-book US odds | LICENSED (current spine, 6.4k credits) | Registry: licensed | Core |
| **Pinnacle API** | The sharpest single book's lines | Requires funded account; API for customers **[verify eligibility by jurisdiction]** | Customer-only API | H someday — the market-truth reference |
| **Betfair Exchange API** | True exchange prices (no vig) | Free key w/ account; jurisdiction-limited | Licensed-with-account | M |
| **Kalshi** | Event/exchange prices incl. sports adjacent | Free read API (already decided in stack for CLV read-only) | Cleared per prior decision | M |
| **OddsJam/Unabated/etc.** | Aggregated sharp odds | Paid | paid-required | — |
| **Scraping sportsbook sites directly** | — | — | **forbidden** (registry precedent: draftkings-unofficial) — books' ToS + account risk | — |

## 5. Datasets: Kaggle, HuggingFace, academic

| Source | What's there | Legal | Value |
|---|---|---|---|
| **Kaggle** | MLB (Statcast dumps), NFL Big Data Bowl tracking data, soccer (StatsBomb open), historical odds archives | Per-dataset license — check each; Big Data Bowl data is competition-licensed (usually non-commercial: **verify before product use**) | M-H for model R&D (offline training/calibration), NOT for live features without license check |
| **HuggingFace datasets** | Sports play-by-play corpora, sports-news text corpora, commentary datasets | Per-dataset license tags (filter by license:mit/cc-by) | M — mainly for the narrative/NLP signal lane and calibration research |
| **StatsBomb Open Data** (GitHub) | Soccer event data | Free for research w/ attribution; registry already marks statsbomb-free **forbidden** for product use — RESEARCH ONLY | R&D |
| **Retrosheet/Chadwick archives** | above | cleared | H |
| **Academic: UMass/armchair analysis dumps** | Historical NFL | Mostly paid or stale | L |

**HuggingFace rule of thumb:** filter by explicit license tag; anything scraped-from-web without a license tag is radioactive for a commercial product. Use for offline calibration research first, product features never-without-license.

## 6. Weather & environment (free, public domain, underused)

| Source | Legal | Value |
|---|---|---|
| **NWS/NOAA API** (api.weather.gov) | US-gov public domain — registry: **cleared** | **H — wind/temp for MLB totals; the edge map's #1 play** |
| **Open-Meteo** | Free tier is non-commercial → registry: paid-required (their commercial tier is cheap) | M |
| **Meteostat** | Historical weather, CC-BY-NC → non-commercial | R&D only |

## 7. News, text, and audio signals (the narrative lane, rights-gated by Airwave)

| Source | What it gives | Legal | Value |
|---|---|---|---|
| **Team/league official RSS** | Injury/roster news | Published syndication feeds | M-H (timing) |
| **Podcast RSS feeds** | Show metadata + audio URLs | RSS is public; TRANSCRIBING for internal signal = the Airwave lane, which you already built with rights gating (AIRWAVE_PODCAST_RSS_ENABLED) | M — the lane exists, whitelist feeds and flip its env |
| **YouTube Data API** | Video metadata/captions where owner-enabled | Free quota (10k units/day), official API | M — feeds the AIRWAVE_YOUTUBE_FEEDS lane |
| **Reddit API** | r/sportsbook, r/fantasybaseball sentiment | Free tier for low-volume OAuth apps **[verify current terms]** | M — sentiment divergence signal; internal-only, never quoted |
| **Google Trends (pytrends)** | Search interest spikes | Unofficial wrapper; gray | L-M — park |
| **X/Twitter API** | Beat reporter posts | Free tier is write-only; read is paid | — paid-required |

## 8. Legal "crawler" tooling (the wrappers, all MIT/Apache open source)

pybaseball (Statcast/BRef access — use only its Savant endpoints, BRef is
forbidden), sportsdataverse (R/Python college wrappers), hockey_scraper (NHL
official API), nba_api (hits stats.nba.com — forbidden endpoint, skip),
Crawl4AI/Maxun (generic crawlers — only ever pointed at cleared sources via the
candidates intake). The tool is never the legal question; the TARGET is.

---

## The priority queue this census produces

1. **NWS weather → MLB totals** (cleared, slot waiting) — this week
2. **MLB Stats API probables/lineups** (facts-as-inputs) — this week, biggest MLB edge
3. **Baseball Savant/Statcast** (barrel%, xwOBA for props/totals) — next
4. **Retrosheet park+ump priors** — next
5. **sportsdataverse college archives** — before CFB/NCAAB season
6. **Airwave RSS/YouTube lanes** — flip the built lanes with a whitelist (your env keys, already designed)
7. **balldontlie + API-Sports NBA** — before NBA season
8. **HuggingFace/Kaggle** — calibration R&D corpus, offline only

Every one of these enters through the gated candidates file, gets a live-terms
verification, and lands in the rights registry before a single byte flows.
That's how the moat stays a moat.
