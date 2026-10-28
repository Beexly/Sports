# NFL Source Login Walls — Free Access Routes

2026-10-28. For each of the 9 login-walled hosts from `nfl-source-last12-2026-10-28.md`, this document records every route that does not require a paid account: free tiers, documented signups, public GitHub data mirrors, RSS feeds, dataset mirrors. "Nothing" is a valid and useful finding.

---

## 1. betmgm.com (sportsbook)

| Route | Status | Details |
|-------|--------|---------|
| **Third-party free odds API (OddsPapi / OpticOdds / TheRundown)** | ✅ Exists | Aggregators expose BetMGM odds with free tiers: OddsPapi (250 req/mo, no CC), TheRundown (free key, 20k data points/day), OpticOdds (demo). Not direct BetMGM API, but gets the data. |
| **Blog RSS feed** | ✅ Exists | `sports.betmgm.com/en/blog` has RSS feeds per category (NFL, NBA, etc.). Feedspot indexes them. No auth required. |
| **Public sitemaps (content, not odds)** | ✅ Exists | 66 sitemaps walked, 24,125 URLs — blog articles, previews, team pages. All public HTML. |
| **Direct BetMGM developer API** | ❌ Nothing | No self-serve developer portal. Requires commercial partnership. |

**Worth a signup?** No — aggregator free tiers cover odds; blog RSS covers content. No direct API to sign up for.

---

## 2. betrivers.com (sportsbook)

| Route | Status | Details |
|-------|--------|---------|
| **BetRivers Network blog** | ✅ Exists | `betriversnetwork.com/blogs` — public articles, analysis, picks. No login. |
| **Third-party odds aggregators** | ✅ Exists | BetStamp, OpticOdds, TheRundown expose BetRivers odds via free tiers. |
| **Direct BetRivers API** | ❌ Nothing | No public developer docs, no self-serve signup. Sitemaps return 404. |
| **RSS feed** | ❌ Nothing | No discoverable RSS for betriversnetwork.com/blogs. |
| **Play-for-fun .NET site** | ⚠️ Partial | `us.betrivers.net` / `can.betrivers.net` — free casino games, no real odds/data API. |

**Worth a signup?** No — blog is public, odds via aggregators. No direct API access route.

---

## 3. mojo.com (fantasy)

| Route | Status | Details |
|-------|--------|---------|
| **Public technical documentation** | ✅ Exists | `mojo.com/technical-overview/*` — 24 URLs covering API overview, REST, authentication, Kafka, markets (NFL, MLB, NBA), parlays. All accessible without login. |
| **Blog** | ✅ Exists | `mojo.com/blog` — 6 public posts (updates, dry runs). |
| **Direct API (requires auth)** | ⚠️ Partial | Docs describe REST + Kafka APIs with auth, but no self-serve free tier or signup found. Authentication section exists but no "get started free" flow. |
| **RSS feed** | ❌ Nothing | No discoverable RSS. |
| **GitHub mirror** | ❌ Nothing | No public GitHub repo with data. |

**Worth a signup?** **Maybe** — the technical docs are unusually open for a betting exchange. If you need their specific market data (NFL/MLB/NBA markets, Kafka feed), the docs suggest a developer pathway exists, but no free tier is advertised. Worth contacting if you need exchange-style data.

---

## 4. myfantasyleague.com (fantasy)

| Route | Status | Details |
|-------|--------|---------|
| **Free trial (preseason → Week 4)** | ✅ Exists | Full platform access free through preseason until Week 4 of regular season. No CC required for trial. |
| **Public REST API (with trial key)** | ✅ Exists | Extensive read-only API: users, leagues, players, rosters, scores, drafts, ADP, transactions. Documented at `fantasy-football-tools.php`. |
| **Multiple open-source client libraries** | ✅ Exists | Python (`pymfl`, `python-mfl`), C# (`MFL-API`), PHP (`mfl-api`), R (`ffscrapr` via ffverse). All on GitHub, MIT/BSD licensed. |
| **RSS feed (blog)** | ✅ Exists | `myfantasyleague.com/blog/?m=YYYYMM` — monthly archives, tag feeds (e.g., `?tag=nfl-draft`). |
| **Public sitemap** | ✅ Exists | 613 URLs — blog, tools, learn-more, community pages. |

**Worth a signup?** **YES — Highest priority.** Free trial gives full API access for months. Multiple mature client libraries. Only fantasy platform of the 9 with a genuine, documented, no-CC free tier + public API.

---

## 5. spankodds.com (sportsbook) → now **SpotOdds.com**

| Route | Status | Details |
|-------|--------|---------|
| **SpotOdds.com (new brand)** | ✅ Exists | `spankodds.com` redirects to `spotodds.com` — "Track live odds from 110+ sportsbooks, monitor limits, real-time injury and line-move alerts." |
| **Free tier on SpotOdds?** | ❓ Unknown | Site markets to consumers (alerts, tracking), not developers. No API docs found. |
| **Third-party aggregators** | ✅ Exists | The Odds API, OddsPapi, SharpAPI, SportsGameOdds, TheRundown all cover odds from major books including whatever SpotOdds tracks. |
| **Direct API** | ❌ Nothing | No developer portal, no public docs. |
| **RSS feed** | ❌ Nothing | None found. |

**Worth a signup?** No — it's a consumer odds-tracking UI now. Aggregators cover the data.

---

## 6. sportsdataio.com (advanced data)

| Route | Status | Details |
|-------|--------|---------|
| **Free Trial (scrambled data)** | ✅ Exists | Self-serve, instant, no CC. All 13 sports, all endpoints. Data is structurally identical but player names/stats scrambled. Good for integration testing only. |
| **Discovery Lab (real data, delayed, paid tiers + free)** | ✅ Exists | Self-serve purchase at `discoverylab.sportsdata.io`. **Free tier: last season's data, 8 sports (NFL, NBA, MLB, NHL, CFB, CBB, Golf, NASCAR), 100–1000 calls/day.** Next-day delay. |
| **Replay (real historical data, simulated live)** | ✅ Exists | Self-serve. Real historical games replayed on live schedule. Off-season testing. Select sports. |
| **GitHub (API Evangelist profile)** | ✅ Exists | `github.com/api-evangelist/sportsdataio` — machine-readable OpenAPI specs for 33 APIs (NFL v3, NBA v3, MLB v3, etc.). Not data, but contract definitions. |
| **Client SDKs** | ✅ Exists | Multiple languages (C#, Python, JS, Go, PHP, Ruby, Java) — free to use with any key. |
| **RSS feed** | ❌ Nothing | No blog/news RSS found. |

**Worth a signup?** **YES — High priority.** Discovery Lab free tier gives real NFL data (delayed, last season) with no CC. Free Trial gives full endpoint exploration. Best "real data for free" option of the 9.

---

## 7. sumersports.com (advanced data)

| Route | Status | Details |
|-------|--------|---------|
| **Public content ("The Zone")** | ✅ Exists | `sumersports.com/the-zone/*` — 618 articles: analysis, podcasts, draft coverage, SumerBrain features. All public HTML. |
| **Player pages** | ✅ Exists | 1,136 player profile URLs (e.g., `/players/<id>/<name>/`) — public, no auth. |
| **Newsletter / email capture** | ✅ Exists | "Excellence Delivered to Your Inbox Weekly" signup forms on articles. Free content delivery. |
| **Podcasts (RSS via platforms)** | ✅ Exists | SumerSports Show on Apple Podcasts, iHeart, YouTube — public RSS feeds via those platforms. |
| **GitHub org** | ⚠️ Exists but empty | `github.com/SumerSports` — exists, "no public members," no public repos with data. |
| **Direct API / data export** | ❌ Nothing | No developer portal, no API docs, no data download. SumerBrain is a product, not a public API. |
| **RSS feed (native)** | ❌ Nothing | No native RSS on `sumersports.com` — only via podcast platforms. |

**Worth a signup?** **For content: YES (newsletter). For data: NO.** The Zone articles + player pages + podcasts are genuinely free and high-quality. But no programmatic data access — it's a content/product site, not a data API.

---

## 8. footballoutsiders.com (advanced data)

| Route | Status | Details |
|-------|--------|---------|
| **Archive returning (announced)** | ✅ Exists | Aaron Schatz note (Oct 2026): "Football Outsiders is coming back as an archive — two decades of articles, analysis, research." |
| **DVOA data at FTN** | ⚠️ Partial | Current DVOA ratings, analysis, writing at FTN (Fantasy Trade Network / FTN Fantasy) — paid subscription. |
| **Historical DVOA in academic papers / GitHub** | ✅ Exists | `github.com/ksdisch/NFL_Totals-MachineLearningModel` — "Yearly Data from Football Outsiders' Team DVOA and Pace Stats pages were downloaded as CSV's." Other repos reference FO data. |
| **nflverse / nflreadr** | ✅ Exists | `nflverse` ecosystem (R/Python) has play-by-play, rosters, stats — but **not DVOA** (FO proprietary). |
| **RSS feed (historical)** | ⚠️ Partial | NIH/PMC citations show RSS existed historically. Current site returns nothing; archive not yet live. |
| **Glossary / public reference pages** | ✅ Exists | `/info/glossary` and stat pages were public pre-shutdown; may return with archive. |

**Worth a signup?** **Wait for archive launch.** No current free data API. The archive (when live) will give 20 years of articles — valuable for research. DVOA itself remains paywalled at FTN. Sign up for FTN only if you need current DVOA.

---

## 9. tipico.com (sportsbook)

| Route | Status | Details |
|-------|--------|---------|
| **Third-party odds aggregators** | ✅ Exists | OpticOdds, The Odds API, OddsPapi, TheRundown, SharpAPI all expose Tipico odds via free tiers. |
| **Direct Tipico API** | ❌ Nothing | No public developer portal. OpticOdds says "Get access to Tipico's sportsbook API" but requires their commercial agreement. |
| **Sitemaps** | ⚠️ SPA shell | All 6 sitemap paths return 200 but with 0 entries — identical SPA shell, no real URLs. |
| **RSS feed** | ❌ Nothing | None found. |
| **GitHub mirror** | ❌ Nothing | None. |

**Worth a signup?** No — aggregator free tiers cover odds. No direct API access.

---

## Ranked Shortlist: Worth an Actual Signup

| Rank | Host | Why | What You Get |
|------|------|-----|--------------|
| **1** | **myfantasyleague.com** | Only genuine free tier + public API + mature client libs | Full fantasy platform API (leagues, rosters, players, drafts, ADP) free through preseason + Week 4; Python/C#/PHP/R clients ready |
| **2** | **sportsdataio.com** | Discovery Lab free tier = real NFL data (delayed, last season) | 8 sports, 100–1000 calls/day, real scores/stats/odds/fantasy projections; Free Trial for integration testing (scrambled) |
| **3** | **sumersports.com** | High-quality free content, not data | The Zone articles (600+), player pages (1100+), podcasts, newsletter — all public, no auth |
| **4** | **mojo.com** | Unusually open technical docs | REST + Kafka API docs, auth flows, market definitions public — if you need exchange data, pathway exists (but no advertised free tier) |
| **5** | **footballoutsiders.com** | Archive coming (20 years of articles) | Wait for launch; then free historical analysis archive. DVOA stays paid at FTN. |
| **6–9** | betmgm, betrivers, tipico, spankodds | Nothing direct worth signing up for | All odds available via aggregator free tiers (OddsPapi, TheRundown, OpticOdds, SharpAPI, The Odds API). Blogs public where they exist. |

---

## Aggregator Free Tiers (covers betmgm, betrivers, tipico, spankodds odds)

| Aggregator | Free Tier | Sportsbooks Covered |
|------------|-----------|---------------------|
| **OddsPapi** | 250 req/mo, no CC | 350+ including BetMGM, Tipico, BetRivers |
| **TheRundown** | Free key, 20k data pts/day | 25+ books incl. BetMGM, DraftKings, FanDuel |
| **The Odds API** | 500 req/mo | ~40 soft books |
| **SharpAPI** | 12 req/min (17k/day) | 2 books on free tier |
| **OpticOdds** | Demo / request access | 200+ books incl. BetMGM, BetRivers, Tipico |
| **SportsGameOdds** | Free tier with real data | 30+ books |

Use these instead of signing up at individual sportsbooks.

---

## Summary

- **2/9 have genuine free tiers with API access**: myfantasyleague.com, sportsdataio.com
- **1/9 has high-value free content**: sumersports.com
- **1/9 has open technical docs but no free tier**: mojo.com
- **1/9 has a promised archive (not yet live)**: footballoutsiders.com
- **4/9 have nothing direct — use aggregators**: betmgm, betrivers, tipico, spankodds

**Action:** Sign up for myfantasyleague.com free trial and sportsdata.io Discovery Lab free tier first. Subscribe to SumerSports newsletter. Watch for Football Outsiders archive launch. Skip the sportsbooks — aggregators cover their odds.