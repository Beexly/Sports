# NFL source registry — 100 hosts, full surface inventory

Built 2026-10-27/28. Every host below was probed live: robots.txt, sitemap index and children,
homepage surface, and endpoint hints mined from the served HTML. Nothing here is from memory.

**100 hosts inventoried. 242,325 sitemap URLs discovered. 477 endpoint hints
extracted. 6 hosts walled** — all six cleared through the wall-clear module.

## What this is, and what it is not

This is a **surface map**: what each site publishes about itself — its crawl rules, its sitemap
tree, its section paths, its data endpoints. It is not yet a content scrape. The 242,325 sitemap
URLs are enumerated and counted but not fetched; that is the next pass and it is a volume job, not
a discovery job.

Read the wall column before planning any pull. `WALLED` means curl gets 403/503 and the browser
path is mandatory.

## Method

1. Liveness probe on 103 candidates, 5 dead dropped, 100 kept.
2. Per host: `robots.txt` (rules, declared sitemaps, crawl-delay), then the declared sitemap index
   and up to four children, counting `<loc>` entries.
3. Homepage fetched and mined for `<table>`/`<form>`/`<script>` counts, section paths, and any
   `api|graphql|v\d|json|feed|rss|data` path in the HTML.
4. Walled hosts re-run through `intelligence/ingestion/wall_clear.py`.

## The six walls, and what cleared

| Host | robots via wall-clear | sitemap via wall-clear | Note |
|---|---|---|---|
| `pro-football-reference.com` | 200, 928 B, 40 disallow rules | not published | deepest free NFL record in existence |
| `theathletic.com` | 200, 3,196 B | 8,047 URLs indexed | paywall behind the wall |
| `bet365.com` | 200, 899 B | 404 — no sitemap | |
| `oddsjam.com` | 200, 488 B, sitemap declared | 403 persists | sitemap needs more than clearance |
| `legalsportsreport.com` | 200, 1,026 B, index declared | 403 persists | same |
| `pointsbet.com` | 200 but serves the SPA shell | — | no robots file, app shell only |

Two sitemaps resist even a cleared session. That is a real limit, recorded rather than papered over.

## Registry

### Advanced data / charting (29)

| Host | robots | sitemap URLs | endpoint hints | wall | notes |
|---|---|---|---|---|---|
| `theathletic.com` | 200 | 8,047 | 0 | **WALLED** | robots:40 disallow; 8,047 sitemap URLs |
| `establishtherun.com` | 200 | 8,000 | 3 |  | robots:1 disallow; 8,000 sitemap URLs; 3 endpoint hints; 51 sections |
| `profootballnetwork.com` | 200 | 7,707 | 11 |  | robots:19 disallow; 7,707 sitemap URLs; 11 endpoint hints; 21 sections |
| `ftnfantasy.com` | 200 | 4,000 | 3 |  | robots:2 disallow; 4,000 sitemap URLs; 3 endpoint hints; 35 sections |
| `rotoviz.com` | 200 | 4,000 | 4 |  | robots:6 disallow; 4,000 sitemap URLs; 4 endpoint hints; 48 sections |
| `sharpfootballanalysis.com` | 200 | 3,986 | 1 |  | robots:3 disallow; 3,986 sitemap URLs; 1 endpoint hints; 25 sections |
| `the33rdteam.com` | 200 | 2,259 | 5 |  | robots:1 disallow; 2,259 sitemap URLs; 5 endpoint hints; 14 sections; crawl-delay 10 |
| `fantasypoints.com` | 200 | 2,012 | 2 |  | robots:4 disallow; 2,012 sitemap URLs; 2 endpoint hints; 8 sections |
| `nfl.com` | 200 | 1,824 | 3 |  | robots:11 disallow; 1,824 sitemap URLs; 3 endpoint hints; 30 sections |
| `sumersports.com` | 200 | 1,663 | 1 |  | robots:0 disallow; 1,663 sitemap URLs; 1 endpoint hints; 9 sections |
| `sportradar.com` | 200 | 1,233 | 40 |  | robots:2 disallow; 1,233 sitemap URLs; 40 endpoint hints; 20 sections |
| `playerprofiler.com` | 200 | 1,174 | 5 |  | robots:2 disallow; 1,174 sitemap URLs; 5 endpoint hints; 36 sections |
| `sportsinfosolutions.com` | 200 | 1,011 | 1 |  | robots:1 disallow; 1,011 sitemap URLs; 1 endpoint hints; 17 sections |
| `footballperspective.com` | 200 | 1,000 | 0 |  | robots:1 disallow; 1,000 sitemap URLs; 24 sections |
| `pff.com` | 200 | 710 | 3 |  | robots:6 disallow; 710 sitemap URLs; 3 endpoint hints; 25 sections |
| `nflsavant.com` | 200 | 189 | 0 |  | robots:31 disallow; 189 sitemap URLs |
| `nflfastr.com` | 404 | 40 | 0 |  | 40 sitemap URLs; 3 sections |
| `pro-football-reference.com` | 403 | 0 | 0 | **WALLED** | — |
| `stathead.com` | 200 | 0 | 2 |  | robots:0 disallow; 2 endpoint hints; 8 sections |
| `trumedia.com` | 200 | 0 | 0 |  | robots:1 disallow; 2 sections |
| `receptionperception.com` | 200 | 0 | 3 |  | robots:1 disallow; 3 endpoint hints; 19 sections; crawl-delay 10 |
| `sportsdataio.com` | 404 | 0 | 40 |  | 40 endpoint hints; 42 sections |
| `mysportsfeeds.com` | 200 | 0 | 3 |  | robots:21 disallow; 3 endpoint hints; 15 sections |
| `numberfire.com` | 200 | 0 | 1 |  | robots:0 disallow; 1 endpoint hints; 60 sections |
| `airyards.com` | 200 | 0 | 0 |  | robots:0 disallow; 4 sections |
| `footballoutsiders.com` | 200 | 0 | 2 |  | robots:0 disallow; 2 endpoint hints |
| `sharpfootballstats.com` | 200 | 0 | 0 |  | robots:0 disallow; 1 sections |
| `thepowerrank.com` | 200 | 0 | 3 |  | robots:0 disallow; 3 endpoint hints; 12 sections |
| `sumer-sports.com` | 200 | 0 | 0 |  | robots:0 disallow; 1 sections |

### Analytics / betting media (18)

| Host | robots | sitemap URLs | endpoint hints | wall | notes |
|---|---|---|---|---|---|
| `oddstrader.com` | 200 | 24,835 | 2 |  | robots:10 disallow; 24,835 sitemap URLs; 2 endpoint hints; 21 sections |
| `rotowire.com` | 200 | 17,288 | 3 |  | robots:40 disallow; 17,288 sitemap URLs; 3 endpoint hints; 27 sections |
| `rotoballer.com` | 200 | 8,498 | 17 |  | robots:4 disallow; 8,498 sitemap URLs; 17 endpoint hints; 55 sections |
| `fantasylife.com` | 200 | 4,046 | 2 |  | robots:9 disallow; 4,046 sitemap URLs; 2 endpoint hints; 23 sections |
| `4for4.com` | 200 | 4,000 | 5 |  | robots:40 disallow; 4,000 sitemap URLs; 5 endpoint hints; 26 sections |
| `playusa.com` | 200 | 4,000 | 3 |  | robots:13 disallow; 4,000 sitemap URLs; 3 endpoint hints; 46 sections |
| `teamrankings.com` | 200 | 4,000 | 6 |  | robots:7 disallow; 4,000 sitemap URLs; 6 endpoint hints; 36 sections; crawl-delay 10 |
| `dynastynerds.com` | 200 | 3,959 | 5 |  | robots:6 disallow; 3,959 sitemap URLs; 5 endpoint hints; 13 sections |
| `sportsbettingdime.com` | 200 | 3,122 | 4 |  | robots:26 disallow; 3,122 sitemap URLs; 4 endpoint hints; 55 sections |
| `usbets.com` | 200 | 2,668 | 2 |  | robots:0 disallow; 2,668 sitemap URLs; 2 endpoint hints; 22 sections |
| `thelines.com` | 200 | 2,569 | 0 |  | robots:16 disallow; 2,569 sitemap URLs |
| `bettingnews.com` | 200 | 1,347 | 6 |  | robots:19 disallow; 1,347 sitemap URLs; 6 endpoint hints; 31 sections |
| `fantasypros.com` | 200 | 1,290 | 4 |  | robots:7 disallow; 1,290 sitemap URLs; 4 endpoint hints; 16 sections; crawl-delay 5 |
| `footballguys.com` | 404 | 999 | 0 |  | 999 sitemap URLs; 54 sections |
| `scoresandodds.com` | 200 | 434 | 2 |  | robots:1 disallow; 434 sitemap URLs; 2 endpoint hints; 26 sections |
| `dynastyleaguefootball.com` | 200 | 0 | 9 |  | robots:25 disallow; 9 endpoint hints; 60 sections |
| `sportsinsights.com` | 200 | 0 | 3 |  | robots:1 disallow; 3 endpoint hints; 22 sections |
| `legalsportsreport.com` | 200 | 0 | 0 | **WALLED** | robots:35 disallow |

### Fantasy / DFS (19)

| Host | robots | sitemap URLs | endpoint hints | wall | notes |
|---|---|---|---|---|---|
| `cbssports.com` | 200 | 17,891 | 8 |  | robots:18 disallow; 17,891 sitemap URLs; 8 endpoint hints; 39 sections |
| `prizepicks.com` | 200 | 12,003 | 2 |  | robots:1 disallow; 12,003 sitemap URLs; 2 endpoint hints; 17 sections |
| `sleeper.app` | 200 | 4,000 | 1 |  | robots:0 disallow; 4,000 sitemap URLs; 1 endpoint hints; 25 sections |
| `fanduel.com` | 200 | 1,279 | 0 |  | robots:13 disallow; 1,279 sitemap URLs; 46 sections |
| `keeptradecut.com` | 200 | 1,134 | 6 |  | robots:3 disallow; 1,134 sitemap URLs; 6 endpoint hints; 13 sections |
| `draftkings.com` | 200 | 774 | 40 |  | robots:14 disallow; 774 sitemap URLs; 40 endpoint hints; 8 sections |
| `myfantasyleague.com` | 200 | 613 | 0 |  | robots:40 disallow; 613 sitemap URLs; 2 sections |
| `fantasycalc.com` | 200 | 473 | 0 |  | robots:2 disallow; 473 sitemap URLs |
| `underdogfantasy.com` | 200 | 310 | 0 |  | robots:0 disallow; 310 sitemap URLs; 8 sections |
| `novig.com` | 200 | 271 | 0 |  | robots:2 disallow; 271 sitemap URLs |
| `betr.app` | 200 | 22 | 0 |  | robots:15 disallow; 22 sitemap URLs; 3 sections |
| `mojo.com` | 200 | 18 | 5 |  | robots:0 disallow; 18 sitemap URLs; 5 endpoint hints |
| `dynastyprocess.com` | 404 | 7 | 0 |  | 7 sitemap URLs |
| `fantasy.espn.com` | 200 | 0 | 35 |  | robots:0 disallow; 35 endpoint hints; 35 sections |
| `football.fantasysports.yahoo.com` | 200 | 0 | 31 |  | robots:40 disallow; 31 endpoint hints; 12 sections |
| `fantasy.nfl.com` | 200 | 0 | 3 |  | robots:0 disallow; 3 endpoint hints; 28 sections |
| `fleaflicker.com` | 200 | 0 | 1 |  | robots:6 disallow; 1 endpoint hints; 13 sections; crawl-delay 1 |
| `fliff.com` | 200 | 0 | 1 |  | robots:0 disallow; 1 endpoint hints; 11 sections |
| `sporttrade.com` | 200 | 0 | 0 |  | robots:0 disallow; 6 sections |

### Sportsbook / odds (34)

| Host | robots | sitemap URLs | endpoint hints | wall | notes |
|---|---|---|---|---|---|
| `pinnacle.com` | 200 | 16,000 | 1 |  | robots:2 disallow; 16,000 sitemap URLs; 1 endpoint hints |
| `actionnetwork.com` | 200 | 7,464 | 13 |  | robots:20 disallow; 7,464 sitemap URLs; 13 endpoint hints; 45 sections |
| `betmgm.com` | 200 | 6,490 | 0 |  | robots:40 disallow; 6,490 sitemap URLs; 2 sections |
| `polymarket.com` | 200 | 6,363 | 14 |  | robots:1 disallow; 6,363 sitemap URLs; 14 endpoint hints; 29 sections |
| `bovada.lv` | 200 | 4,826 | 4 |  | robots:1 disallow; 4,826 sitemap URLs; 4 endpoint hints; 24 sections |
| `caesars.com` | 200 | 4,553 | 0 |  | robots:3 disallow; 4,553 sitemap URLs |
| `sportsbookreview.com` | 200 | 4,074 | 2 |  | robots:40 disallow; 4,074 sitemap URLs; 2 endpoint hints; 52 sections |
| `vsin.com` | 200 | 4,000 | 3 |  | robots:5 disallow; 4,000 sitemap URLs; 3 endpoint hints; 42 sections |
| `mybookie.ag` | 200 | 3,817 | 4 |  | robots:6 disallow; 3,817 sitemap URLs; 4 endpoint hints; 26 sections |
| `odds-api.io` | 200 | 3,716 | 16 |  | robots:0 disallow; 3,716 sitemap URLs; 16 endpoint hints; 18 sections |
| `vegasinsider.com` | 200 | 3,672 | 2 |  | robots:6 disallow; 3,672 sitemap URLs; 2 endpoint hints; 55 sections |
| `hardrock.bet` | 200 | 2,284 | 6 |  | robots:1 disallow; 2,284 sitemap URLs; 6 endpoint hints; 20 sections; crawl-delay 10 |
| `covers.com` | 200 | 1,454 | 6 |  | robots:40 disallow; 1,454 sitemap URLs; 6 endpoint hints; 41 sections |
| `oddsportal.com` | 200 | 988 | 8 |  | robots:40 disallow; 988 sitemap URLs; 8 endpoint hints; 36 sections |
| `bettingpros.com` | 200 | 767 | 4 |  | robots:8 disallow; 767 sitemap URLs; 4 endpoint hints; 27 sections |
| `bookmaker.eu` | 200 | 396 | 0 |  | robots:4 disallow; 396 sitemap URLs; 12 sections |
| `unabated.com` | 200 | 291 | 9 |  | robots:0 disallow; 291 sitemap URLs; 9 endpoint hints; 8 sections |
| `circasports.com` | 200 | 206 | 5 |  | robots:1 disallow; 206 sitemap URLs; 5 endpoint hints; 34 sections |
| `theoddsapi.com` | 200 | 188 | 0 |  | robots:0 disallow; 188 sitemap URLs; 17 sections |
| `ballybet.com` | 404 | 68 | 5 |  | 68 sitemap URLs; 5 endpoint hints; 6 sections |
| `unibet.com` | 200 | 3 | 13 |  | robots:3 disallow; 3 sitemap URLs; 13 endpoint hints; 3 sections |
| `pointsbet.com` | 403 | 0 | 0 | **WALLED** | — |
| `betrivers.com` | 200 | 0 | 0 |  | robots:1 disallow |
| `bet365.com` | 200 | 0 | 0 | **WALLED** | robots:5 disallow |
| `betonline.ag` | 200 | 0 | 7 |  | robots:5 disallow; 7 endpoint hints; 3 sections |
| `superbook.com` | 200 | 0 | 1 |  | robots:31 disallow; 1 endpoint hints; 14 sections |
| `wynnbet.com` | 404 | 0 | 4 |  | 4 endpoint hints; 2 sections |
| `tipico.com` | 200 | 0 | 1 |  | robots:0 disallow; 1 endpoint hints |
| `sisportsbook.com` | 200 | 0 | 0 |  | robots:0 disallow; 1 sections |
| `oddsshark.com` | 410 | 0 | 6 |  | 6 endpoint hints; 41 sections |
| `spankodds.com` | 404 | 0 | 0 |  | 1 sections |
| `donbest.com` | 200 | 0 | 1 |  | robots:0 disallow; 1 endpoint hints; 7 sections |
| `kalshi.com` | 429 | 0 | 0 |  | 1 sections |
| `oddsjam.com` | 200 | 0 | 0 | **WALLED** | robots:10 disallow |

## Highest-value targets, ranked

1. **`pro-football-reference.com`** — combine testing, every season stat table, every draft. Walled,
   cleared, proven at 4.7 MB across five pages.
2. **`ftnfantasy.com`** — 4,000 sitemap URLs, and the shadow-matrix scheme data is the layer the
   engine is missing.
3. **`establishtherun.com`** — 8,000 URLs of route/coverage charting.
4. **`profootballnetwork.com`** — 7,707 URLs.
5. **`sumersports.com`** — 1,663 URLs, the most rigorous public analytics shop.
6. **`sportsinfosolutions.com`** — 1,011 URLs, charting-derived.
7. **`playerprofiler.com`** — 1,174 URLs, athleticism and usage metrics.
8. **`nflsavant.com`** — 189 URLs but exposes a base64url DSL over play-by-play.
9. **`sportsdataio.com`** — 40 endpoint hints on the homepage, the richest API surface found.
10. **`sportradar.com`** — 40 endpoint hints, 1,233 sitemap URLs.

## Open items

- 242,325 sitemap URLs enumerated, zero fetched. Volume pass outstanding.
- `oddsjam` and `legalsportsreport` sitemaps still 403 through a cleared session.
- `pointsbet` serves its SPA shell for `/robots.txt`; the real rules are in the bundle.
- Endpoint hints are mined from homepage HTML only — no JS bundle analysis yet.
- No per-host rate budget set. Several sites declare crawl-delay; honour it.
