# 04 — Sales, Growth, Content & SEO Leverage Audit

**Domain:** Sales / growth / marketing / SEO / content distribution / audience & community.
**Mission context:** Solo, zero-budget founder. Content/SEO flywheel is the primary acquisition channel; convert Free → Pro ($14.99) / Elite ($24.99) via a public track-record/calibration credibility play.
**Sources:** `NORMALIZED_RESOURCE_LEDGER.csv` (`approved_direct` + `owner_review` only) + `garrett-resource-dump-2026-06-15.md`.

## Scope & counts

- Domain-relevant rows surfaced (tight keyword filter, approved/owner_review): **~259**.
- After removing noise (temp-mail farms, YouTube-movie/piracy collections, hobby/roleplay forums, EXIF strippers, ad-blockers): **~55 genuinely actionable** marketing/growth resources.
- **Verified live this pass: 9** (GoatCounter, Umami, Cloudflare Web Analytics, Rybbit, RSS.app, RSSHub, AlsoAsked, Daft Page, News Minimalist, F5Bot model). Remainder assessed from description + known-product knowledge.

> Big-picture takeaway: the dump contains **no paid martech you couldn't already get free**. Its real value is (1) a **zero-cost privacy-analytics + RSS-ingestion + keyword-research stack** that powers the SEO/content flywheel, and (2) **distribution surfaces** (RSS→Discord/email/social bots, news aggregators as a model) to repurpose one piece of content across many channels. Adopt the free OSS stack now; the founder needs zero budget to run the entire growth engine.

---

## THE 7 GROWTH PLAYS (do these — the tools below are the parts)

### PLAY 1 — Programmatic SEO: auto-generated game-preview + matchup pages at scale
The single highest-leverage move for a "king of stats" site. Generate one indexable page per game/matchup/team/player from the real odds + stats you already ingest, each with: pick, line, confidence, factor trail, and historical head-to-head. Layer **schema.org structured data** (`SportsEvent`, `FAQPage`, `BreadcrumbList`) for rich results. At 7 sports × full schedules this is thousands of long-tail pages ("Lakers vs Celtics prediction tonight", "NFL Week 3 picks against the spread"). **Tools:** Meta-Mapper (OG/social thumbnails), AlsoAsked (People-Also-Ask → FAQ schema + content gaps), the keyword cluster below for title/H1 targeting. This is the flywheel; everything else feeds it.

### PLAY 2 — Sports-news RSS intake → daily AI-repurposed content engine
Wire **RSSHub** (free, OSS, 900+ routes / 200+ services — incl. Reddit, X, YouTube, team blogs) + **RSS.app / PolitePol / FiveFilters** to turn *any* sports source without a feed INTO a feed. Pipe into **Miniflux / FreshRSS** (self-hosted, free) as the intake hub, filter with **siftrss** (keyword/regex filters), and feed your existing Claude content pipeline. Output: a daily "what moved the lines / injury news / sharp money" recap post — fresh, data-backed content every single day at $0. Freshness also feeds the "no stale data" rule and SEO recency signals.

### PLAY 3 — Free public track-record widget as the viral acquisition hook
You already plan a public calibration/track-record play. Productize it as an **embeddable widget + auto-generated weekly "graded results" page** ("We went 7-3 ATS last week — here's the receipts"). This is your differentiator vs. every touts-with-no-receipts competitor. Distribute the weekly results via RSS → all channels (Play 5). Honesty + receipts = backlinks, screenshots, and word-of-mouth — the cheapest possible trust-based conversion driver.

### PLAY 4 — Reddit/HN keyword listening → organic engagement & lead-gen
Run **Reddit Comber / Sub Notification** (dump's equivalents of F5Bot — verified free model) to alert on keywords like "[team] prediction", "best picks site", "sportsbook line" across r/sportsbook, r/sportsanalytics, team subs. Reply with genuinely useful free data (a calibrated read on tonight's line) + soft link. Also **BoardReader / CrowdView / FindAForum** to discover niche sports forums to seed. Zero ad spend, pure organic top-of-funnel.

### PLAY 5 — One-to-many distribution: RSS → Discord + email + social autopost
Publish every new pick/preview/results page to an RSS feed, then fan it out automatically: **MonitoRSS / ReadyBot** (RSS → Discord channel — free), **FeedButler / Kill the Newsletter** (RSS → email digest, seeds the Elite-tier email muscle at $0), and a **Schedul**-style social scheduler for Threads/X. Write once, distribute everywhere, automatically. This is also the cheap on-ramp to building the Elite email/push channel before you pay for an ESP.

### PLAY 6 — Own a community: free Discord now, Discourse later
Stand up a **Discord** (free) as the engaged-fan hub: live game threads, a #picks-of-the-day channel auto-fed by Play 5, a #results channel for transparency. Community = retention = lower churn on subscriptions, plus a captive audience for Elite upsells and referral loops. **Discourse** (OSS, self-host free) is the SEO-friendly forum upgrade once volume justifies it — forum threads are long-tail SEO content that compounds.

### PLAY 7 — Zero-cost, privacy-first analytics for conversion optimization
Instrument from day one with **Cloudflare Web Analytics** (verified: 100% free, cookieless, no consent banner) or **GoatCounter / Umami / Rybbit** (all free/OSS, GDPR-clean) for traffic, plus **Microsoft Clarity** (free heatmaps + session recordings) to watch where the paywall/checkout funnel leaks. No Google Analytics bloat, no cookie banner killing conversion, no cost. Use the data to A/B the landing page and pricing page copy.

---

## TOP 10 SHORTLIST (ranked by revenue/growth leverage for THIS product)

| # | Resource | Play | Why it's top |
|---|---|---|---|
| 1 | **RSSHub** | 2,5 | Free OSS; turns 200+ services into feeds — the backbone of content intake + distribution. |
| 2 | **Cloudflare Web Analytics** | 7 | Verified free, cookieless, no consent banner — conversion-safe analytics at $0. |
| 3 | **Microsoft Clarity** | 7 | Free heatmaps + session replays — directly find & fix paywall/checkout funnel leaks. |
| 4 | **AlsoAsked** | 1 | People-Also-Ask data → FAQ schema + content-gap map for programmatic SEO pages. |
| 5 | **Miniflux / FreshRSS** | 2 | Free self-hosted RSS hub to aggregate all sports sources into the content pipeline. |
| 6 | **MonitoRSS / ReadyBot** | 5,6 | Free RSS→Discord — automates community feeding + distribution. |
| 7 | **Reddit Comber / Sub Notification** | 4 | Free keyword alerts → organic Reddit/forum lead-gen & listening. |
| 8 | **Kill the Newsletter / FeedButler** | 5 | RSS→email/Atom — bootstrap the Elite email channel before paying for an ESP. |
| 9 | **Keyword cluster (Soovle/KeywordSheeter/Keyword Tool/Spyfu)** | 1 | Free/freemium keyword discovery to target long-tail prediction queries. |
| 10 | **Meta-Mapper** | 1,5 | OG/social-card thumbnails so every page shares cleanly → higher social CTR. |

---

## RANKED TABLE — full domain assessment

Alignment: **ADOPT NOW** / **EVALUATE** / **FUTURE** / **SKIP**

### Analytics for growth (instrument the funnel)

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| Cloudflare Web Analytics | Free, cookieless site analytics | **ADOPT NOW** | Conversion-safe traffic data, no consent banner (banners cut conversion). Future: per-page SEO performance tracking. | **Verified live** — free, cookieless, no consent needed, works via JS beacon w/o Cloudflare proxy. |
| Microsoft (MS) Clarity | Free heatmaps + session recordings | **ADOPT NOW** | Watch real users hit the paywall/checkout; fix funnel leaks → higher Free→Pro conversion. | Assessed (known free product; ledger `approved_direct`). |
| GoatCounter | Free privacy analytics (hosted + OSS) | **ADOPT NOW** | Lightweight, GDPR-clean, no cookie banner. Backup/alt to Cloudflare. | **Verified live** — free for reasonable use, no GDPR notice needed, OSS self-host. |
| Umami | OSS privacy analytics (self-host + cloud) | **EVALUATE** | Self-host free; nicer dashboards/goals than GoatCounter for funnel/event tracking. | **Verified live** (title + known product); free OSS + free-trial cloud. |
| Rybbit | OSS cookieless analytics, GA alternative | **EVALUATE** | Modern GA replacement; self-host free, cloud trial. Pick ONE of this/Umami/GoatCounter. | **Verified live** — cookieless, GDPR, self-host OSS + cloud trial. |
| GoAccess | Real-time web log analyzer (terminal/HTML) | **FUTURE** | Server-log analytics w/o JS; useful for bot/crawler + uptime visibility once self-hosting. | Assessed (known OSS tool). |
| Prometheus + Grafana | Metrics + dashboards | **FUTURE** | App/business KPI dashboards (signups, MRR, churn) once scale warrants. Ops more than growth. | Assessed. |
| BlackTwist / MastoMetrics / OpenPodcast | Threads / Mastodon / podcast analytics | **EVALUATE** | Per-channel analytics IF you commit to those distribution channels. | Assessed. |

### RSS / content intake & distribution (the flywheel engine)

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| RSSHub | Free OSS feed generator, 900+ routes / 200+ services | **ADOPT NOW** | Turn Reddit/X/YouTube/team-blogs into feeds → content intake + auto-distribution backbone. | **Verified** (WebSearch: free OSS, 900+ routes, 200+ services). |
| RSS.app | Hosted "any site/social → RSS" generator | **EVALUATE** | Easiest no-code feed creation for sources RSSHub misses. Free trial only — prefer RSSHub/PolitePol for $0. | **Verified live** — free 7-day trial (not free forever). |
| PolitePol / FiveFilters / FetchRSS | Make RSS from arbitrary web pages | **ADOPT NOW** | Free fallback to feed any odd source page into the pipeline. | Partially verified (PolitePol redirects to politepaul.com; known-free tools). |
| Miniflux | Lightweight self-hosted RSS reader | **ADOPT NOW** | The central intake hub; minimal, fast, API for piping into Claude content gen. | Assessed (known OSS). |
| FreshRSS | Self-hosted RSS aggregator (PHP) | **ADOPT NOW** | Heavier alt to Miniflux; good web UI + extensions/scraping. Pick one. | Assessed (known OSS). |
| CommaFeed / selfoss / NewsPipe / Fusion | Self-hosted RSS readers | **SKIP** (dupes) | Redundant with Miniflux/FreshRSS — pick one hub, ignore the rest. | Assessed. |
| siftrss | RSS feed filters (keyword/regex) | **ADOPT NOW** | Filter the firehose to only sports-relevant items before AI repurposing. | Assessed. |
| Kill the Newsletter | Email newsletter → Atom feed | **EVALUATE** | Ingest competitors'/leagues' email newsletters as feeds; reverse-engineer content angles. | Assessed (known free tool). |
| FeedButler | RSS → email | **EVALUATE** | Bootstrap a free email digest of your picks → seeds the Elite email muscle pre-ESP. | Assessed. |
| MonitoRSS / ReadyBot | RSS → Discord bots | **ADOPT NOW** | Auto-post new picks/results to your Discord — distribution + community feeding free. | Assessed (MonitoRSS is well-known free Discord RSS bot). |
| Feedly / Inoreader | Polished RSS readers (freemium) | **EVALUATE** | Manual market/competitor monitoring; free tiers fine. Not for automated pipeline. | Assessed. |
| TwitchRSS / Hacker News RSS / HiveRSS | Niche feed generators | **SKIP** | Off-topic for sports (Twitch/HN/Hive crypto). | Assessed. |
| All about RSS / RSSTango / Feedle / RSS (indexes) | Directories of RSS tools | **EVALUATE** (reference) | Reference indexes to find more feed sources; not tools themselves. | Assessed. |

### SEO / keyword research

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| AlsoAsked | People-Also-Ask question mapping | **ADOPT NOW** | Drives FAQ schema + content clusters for programmatic preview pages (Play 1). | **Verified live** — PAA intent mapping; limited free, Lite paid tier. |
| Soovle | Multi-engine autocomplete keyword scraper | **EVALUATE** | Free long-tail keyword discovery across Google/YouTube/Bing/Amazon. | Assessed. |
| KeywordSheeter | Bulk autocomplete keyword export | **EVALUATE** | Fast free keyword dumps for title/H1 targeting at scale. | Assessed. |
| Keyword Tool / Keyword.io | Autocomplete keyword tools | **EVALUATE** | Freemium keyword ideas; volume gated behind paywall. | Assessed. |
| Spyfu | Competitor keyword/PPC intel | **EVALUATE** | See what keywords rival picks sites rank for; limited free searches. | Assessed. |
| SearchEngineReports / ContentIdeas | Misc keyword/content tools | **SKIP** | Low-signal, ad-heavy SEO tool aggregators. | Assessed. |
| Meta-Mapper | Website metadata/OG thumbnails | **ADOPT NOW** | Generate clean OG/Twitter cards → higher social share CTR per page. | Assessed. |

### Landing page / conversion

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| Daft Page | No-code site/landing-page builder | **EVALUATE** | Free no-code microsites for campaign-specific landers / "free pick" lead magnets, separate from main app. | **Verified live** — Notion-style no-code builder, free signup. |
| lapa / SaaS Pages / SaaS Landing Page | Landing-page template/inspiration galleries | **ADOPT NOW** (reference) | Free swipe files for high-converting pricing/landing layouts — copy proven SaaS patterns. | Assessed (inspiration galleries). |
| LandingPage | Index of landing-page tools | **SKIP** | Just a directory; low marginal value. | Assessed. |

### Community / audience / listening

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| Reddit Comber / Sub Notification | Reddit keyword notifications | **ADOPT NOW** | Organic lead-gen + listening in sports/betting subs (F5Bot-class). | **Model verified** (F5Bot: free Reddit/HN keyword alerts, lead-gen use). |
| BoardReader / CrowdView / FindAForum | Forum search engines | **EVALUATE** | Discover niche sports forums to seed content + backlinks. | Assessed. |
| Discourse | OSS forum platform | **FUTURE** | Self-hosted SEO-rich community forum once Discord outgrows itself; threads = long-tail content. | Assessed (known OSS). |
| Discord (bots: Wickbot etc.) | Community hub + moderation/security bots | **ADOPT NOW** | Free engaged-fan hub → retention + Elite upsell + referral loop. | Assessed. |
| Schedul | Threads content publishing & scheduling | **EVALUATE** | Free social scheduler for Threads/X autopost (Play 5). | Assessed. |

### News aggregators (as a PRODUCT MODEL, not a tool)

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| News Minimalist | AI-ranks news by significance | **EVALUATE** (model) | Blueprint for an AI-ranked "top sports stories that move lines" feed page — sticky daily-visit hook. | **Verified live** — AI significance-ranked news, free. |
| Particle / Upstract / Kagi News | News aggregators w/ summaries | **EVALUATE** (model) | UX patterns for a single-page "sports intelligence" hub; daily-return habit driver. | Assessed. |

### AI marketing / outreach assistants

| Resource | What it is | Alignment | Growth/revenue mapping + future uses | Verification |
|---|---|---|---|---|
| Marmof | Creator / marketing AI | **SKIP** | You already have the Claude API — redundant generic AI copy tools. | Assessed. |
| Textcortext / Twain / WriteCream | AI outreach/communication assistants | **SKIP** | Redundant with your own AI layer; outreach copy is better done in-house. | Assessed. |

### Explicitly excluded as noise (sampling)

Temp-mail services (10minutemail, YOPmail, Guerrilla Mail, 50+ others) — useful only for fake-account creation, which **violates the "no fake accounts / no evasion" rule in CLAUDE.md**; **SKIP entirely**. YouTube-movie/piracy collections, RPG/roleplay & hobby forums (SpaceBattles, Photonlexicon, mechanical-pencil communities), EXIF removers, ad-blockers, Roblox/running/weight trackers — all off-domain noise.

---

## Compliance note

All distribution/repurposing plays must respect the **Scraping Clearance Engine** and source-rights registry: ingest **facts** (scores, lines, fixtures, timestamps, metadata) only, never article bodies/proprietary predictions for republication. RSS *titles + links + your own derived analysis* are safe; wholesale copying of feed article bodies is not. Temp-mail tools are out of bounds (fake-account evasion). Run every new ingestion source through `checkClearance()`.
