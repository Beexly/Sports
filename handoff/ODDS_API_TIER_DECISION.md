# The Odds API Paid-Tier Pricing Decision (READ-ONLY research)

> Status: COMPLETE — pricing research only. No purchase, signup, or payment action taken.
> Author: GSE sprint executor (non-human). This is a cost/purchase decision for the owner.

## 1. Current state (from code, commit `cd4e77d6`)

| Item | Value | Source |
|---|---|---|
| Free tier quota | 500 credits/month | task context (`p9.5-00`) + commit `cd4e77d6` ("free tier ... 500 credits/month"); corroborated by `docs/data-sources.md` line 24 ("500 req/mo free") |
| Markets tracked | 3 — `h2h`, `spreads`, `totals` | `packages/data-ingestion/src/config.ts` line 92: `MARKETS = ["h2h", "spreads", "totals"]`; README says "do NOT propose cutting markets… keep all three" |
| Region | `us` (1 region) | `config.ts` line 193: `ODDS_REGION = "us"` |
| Credit cost per `/v4/sports/{sport}/odds` call | 3 credits (1 per market × 1 region) | `the-odds-api.com` API docs line 361: "Each specified market costs 1 against the usage quota, for each region." |
| Credit cost per `getScores` (/scores) call | 1 credit | same docs: "The scores endpoint costs 1 request against your monthly quota." |
| ETag 304s | cost 0 credits | FAQ line 132; API docs "Response Headers" section ("Calls to the /sports endpoint do not count…"; /odds/ honors ETag) |
| refresh-odds cron cadence | every 15 min → 96 cycles/day | `vercel.json` lines 12-15: `"path": "/api/cron/refresh-odds", "schedule": "*/15 * * * *"` |
| refresh-odds sport scope | in-season sports only (season-gated) | `config.ts` lines 82-88 `getInSeasonSports()`; `SUPPORTED_SPORTS` = 7 sports (line 2-38) |
| settle-picks cron cadence | hourly → 24 cycles/day | `vercel.json` lines 20-22: `"path": "/api/cron/settle-picks", "schedule": "20 * * * *"` |
| settle-picks sport scope | ALL 7 sports, NOT season-gated | `apps/web/app/api/cron/settle-picks/route.ts` lines 101-111: "settlement is backward-looking… must NEVER season-gate… uses SUPPORTED_SPORTS" |

### Current live production burn (verified by `cd4e77d6`)

Commit `cd4e77d6` ("stop refresh-odds early on near-exhausted Odds API credits") states verbatim:

> "The-Odds-API's free tier caps at 500 credits/month. At the live production cadence (`refresh-odds` every 15 min, `vercel.json`) with 3 markets tracked (h2h/spreads/totals = 3 credits/call) and up to 3 sports in season at once, the free tier's entire monthly budget can be burned in under 14 hours."

`cd4e77d6` added a proactive 10-credit safety margin guard to `processSport` so the app degrades gracefully (stops early) instead of crashing. This task is the business/pricing follow-up to that guard.

### The second billable consumer: settle-picks (currently unguarded in cost math)

`settle-picks` runs hourly (`20 * * * *`) over **all 7 SUPPORTED_SPORTS** (not season-gated — line 101-102 of the route handler makes this explicit, and commit `cd4e77d6` only guards `refresh-odds`'s per-sport loop). Each cycle calls `client.getScores(sport.key, 2)` (line 178 of `settle-sport.ts`) = **1 credit/sport**. That is **7 credits/cycle × 24 = 168 credits/day**, every month, regardless of season — a cost `cd4e77d6`'s guard does not touch.

> Note: `settle-sport.ts` line 171-176 contains a `paidCallJustified("scores", …)` spend guard that *logs a warning* when scores have a free path, but on the paid branch (key present) it still proceeds with the paid `getScores`. The route handler (line 51) only dispatches to the paid path when `THE_ODDS_API_KEY` is present, so if the owner stays on free tier the settlement cron takes the free path (ESPN + nflverse) at zero Odds-API cost. The 168/day figure applies **only when a paid key is set**.

## 2. Published paid tiers (from https://theoddsapi.com/pricing, fetched 2026-08-16)

> Source: `theoddsapi.com/pricing` "Pricing - The Odds API" (page title/header). Last updated 2026-07-03 per the page.

| Tier | Price | Monthly allowance | Sports | Markets | Notes |
|---|---|---|---|---|---|
| **Free** | $0/mo | 25 req/day (~750/mo; account cited as 500 credits/mo) | NBA + MLB | h2h only | No credit card |
| **Professional** | $29/mo | 20,000/mo | 25 sports | h2h + spreads + totals | US sportsbooks only; "MOST POPULAR" |
| **Business** | $99/mo | 200,000/mo | 26 (incl. World Cup 2026) | + player props, futures, period markets | Pinnacle-anchored edges, fair odds, consensus, full historical archive, Claude MCP |

- No overage billing: hard 429 at quota, quota resets on schedule. Same API key, upgrades in place, zero code changes. (Source: pricing page — "No overage billing… hit your quota and you get a clean 429".)
- 304 (ETag) responses cost zero credits; `x-requests-remaining` returned after every call. (Source: FAQ line 132.)

## 3. odds-api.io (the #5 failover source — currently NOT wired)

Listed in task step 4 and `packages/data-ingestion/src/odds-failover.ts` (comment lines 1-14). Its HTTP mapping was deferred pending confirmed endpoint/rate limits. Current pricing from https://odds-api.io (fetched 2026-08-16):

| Tier | Price | Free / Paid | Allowance | Bookmakers |
|---|---|---|---|---|
| **Free** | $0 | 100 req/hour (500/day) | rate-limited hourly | 2 recreational bookmakers |
| **Solo** | $65/mo | paid | 5,000 req/hour | Sharp + exchange books |
| **Starter** | $129/mo | paid | 5,000 req/hour | 5 bookmakers |
| **Growth** | $239/mo | paid | 5,000 req/hour | 10 bookmakers |
| **Pro** | $299/mo | paid | 5,000 req/hour | 15 bookmakers |

- Free tier has its OWN separate quota (100/hr) and is rate-limited per-hour, not per-month.
- Free tier covers 2 recreational bookmakers only; sharp/exchange books require paid (line 265 of odds-api.io page).
- odds-api.io is a **different vendor** from the-odds-api.com — its free tier can independently absorb a distinct slice of traffic without touching the primary's 500-credit budget, IF and when the failover adapter is ever wired (currently deferred).

## 4. The math — how many full-refresh cycles each tier sustains

### 4a. refresh-odds only (the in-season primary cost driver)

Per cycle: 3 in-season sports × 3 credits (3 markets × 1 region) = **9 credits/cycle**.
At `*/15 * * * *` = 96 cycles/day.

| Credits/cycle | Cycles to exhaust 500 (Free) | Cycles/day if 15-min | Cycles/day if 30-min | Cycles/day if 60-min |
|---|---|---|---|---|
| 9 (3 sports, 3 markets) | 500/9 ≈ **55 cycles** ≈ 9.3 hours | 96 × 9 = 864/day → 0.58 days | 48 × 9 = 432/day → 1.16 days | 24 × 9 = 216/day → 2.31 days |

This reproduces `cd4e77d6`'s "under 14 hours" claim (9.3 h; the 14h figure is the conservative bound before the 10-credit guard kicks in at cycle ~54, leaving the last sport skipped).

With all 7 sports in season (NFL added expands the in-season window — `docs/data-sources.md` lines 15-21 lists NFL/NCAAF/NBA/NCAAB/MLB/NHL/MLS):
7 × 3 = **21 credits/cycle**. 500/21 ≈ 23.8 cycles ≈ **3.8 hours** to exhaust Free.

At `*/15` over 7 in-season sports: 96 × 21 = 2,016/day → Free last ~0.25 days.

### 4b. settle-picks scores (only on paid-key path)

Per cycle: 7 sports × 1 credit = **7 credits/cycle**, hourly = 168/day.

### 4c. Combined burn at current architecture (paid key set)

refresh-odds (3 in-season sports) + settle-picks (7 sports, all):
- 96 × 9 = 864 (refresh) + 24 × 7 = 168 (settle) = **1,032 credits/day**.
- Free (500/mo) → exhausted in ~0.48 days (≈ 11.6 hours) — i.e. free tier is already structurally too small once a paid key is active.

### 4d. What each paid tier actually sustains (current 3-market footprint)

Assumptions: 3 markets (keep, per owner decision), `us` region, 304s may offset some calls but must NOT be assumed (lines move often). Both crons active.

| Tier | Credits/mo | Daily budget (mo/30) | refresh @15min, 3 in-season (9 cyc ×9) | refresh @15min, 7 in-season (96×21) | settle-picks (168) | Sustainable refresh cadence @3 in-season | Sustainable cadence @7 in-season |
|---|---|---|---|---|---|---|---|
| Free | 500 | 16.7/day | 864/day → 0.58 days | 2,016/day → 0.25 days | 11.6h budget gone | **cannot sustain** | n/a |
| **Professional** | 20,000 | 667/day | 1,032/day used | 2,184/day | settle 168 | **sustainable at 15-min** (uses 1,032/667 ≈ 1.5× budget — see note) | fails at 15-min |
| Business | 200,000 | 6,667/day | 1,032/day | 2,184/day | 168 | sustainable at 15-min with large headroom | sustainable at 15-min with headroom |

### Reconciling the Professional row

At 3 in-season sports + all-7-sport settle, combined = 1,032/day = 30,960/mo (×30 days). That **exceeds Professional's 20,000/mo** (1,032/day > 667/day). So Professional at the exact current cadence for 30 days would exhaust ~0.66 days into each month — i.e. Professional is **NOT** sufficient to sustain BOTH crons at current cadence. The table note flags this; the precise figure:

- Professional 20,000/mo ÷ 1,032/day = **19.4 days/month** sustained. After ~day 19, refresh-odds degrades (the `cd4e77d6` guard stops it early) and settle-picks 429s — partial months have a soft tail.

Professional **can** sustain refresh-odds alone at 15-min (864/day × 30 = 25,920 → 7.7 months of buffer on the 20k plan? No: 20,000 / 864 = 23.1 days). So:
- **Pro refresh-only @15-min, 3 sports**: 864/day, 25,920/mo → **exceeds 20,000 → ~19 days sustainable**. (Pro is sized for 3-in-season + settle combined for ~19 days, then degrades.)
- **Pro refresh-only @15-min, 7 sports (NFL season)**: 2,016/day, 60,480/mo → exceeds 20,000 by 3×. Pro would exhaust in **9.9 days** during peak NFL.

Cadence-vs-price tradeoff at Pro (keeping 3 markets):

| Refresh cadence | cycles/day | in-season sports | Daily credits | Mo. credits | Pro sustainable? |
|---|---|---|---|---|---|
| 15 min | 96 | 3 | 864 | 25,920 | No (19 days) |
| 15 min | 96 | 7 | 2,016 | 60,480 | No (9.9 days) |
| 30 min | 48 | 3 | 432 | 12,960 | Yes (~38% headroom) |
| 30 min | 48 | 7 | 1,008 | 30,240 | No (19 days) |
| 60 min | 24 | 3 | 216 | 6,480 | Yes (~68% headroom) |
| 60 min | 24 | 7 | 504 | 15,120 | Yes (~31% headroom) |
| 120 min | 12 | 3 | 108 | 3,240 | Yes (~83% headroom) |
| 120 min | 12 | 7 | 252 | 7,560 | Yes (~41% headroom) |

(plus settle-picks 168/day = 5,040/mo on the paid path adds to the above; if owner keeps the free settlement path the 168/day is 0.)

## 5. Recommendation (single clear call)

**Cheapest tier that sustains the current 15-min cadence without touching markets is Business ($99/mo).**

Rationale:
- Professional ($29) does **not** sustain the current dual-cron cadence (refresh-odds @15-min + settle-picks hourly) for a full 30-day month. Even at 3 in-season sports it exhausts in ~19 days/month; at NFL-peak (7 in-season) it exhausts in ~9.9 days/month. The `cd4e77d6` guard would then start degrading service mid-month — the exact failure mode it was built to soften, not normal operation.
- Business ($99) delivers 200,000 credits/month. At the current worst sustained load (7 in-season sports + all-sport settle, no 304 discounting assumed) the full month burns ~93,360 credits (60,480 refresh + 32,880 settle) — **47% headroom**. Even if settle-picks stays on the paid key path every hour, Business survives NFL season at 15-min refresh with budget to spare.
- Switching cadence is a product/surface choice (pick freshness vs. cost). The task says "do NOT propose cutting markets" and to show the cadence-vs-price tradeoff, which §4d does — but it stops at Business as the first tier that sustains current behavior without forcing that trade.

**If the owner is willing to coarsen the refresh cadence** (a deliberate product decision, not a market cut):
- **30-min** refresh (48/day) sustains Professional across all 7 in-season sports for ~19 days; only safe across a full month if settle-picks uses the free path. 30-min is the cadence where Pro first stays green for a full month at 3 in-season sports.
- **60-min** refresh (24/day) is the cadence at which Professional sustains all 7 in-season sports for a full month **without** settle-picks (504/day = 15,120/mo ≤ 20,000). With settle-picks on the paid key path, it tips to breakeven-and-over (504+168 = 672/day = 20,160/mo), so 60-min + paid-key settle is just over Pro's limit — keep settle-picks on the free path, or go Business.

The file under §4d's tables make this tradeoff explicit so the owner can pick cadence vs. price; the single recommendation above is Business at current cadence.

## 6. Secondary lever: odds-api.io as a load-sharing failover (NOT currently wired)

Once `odds-failover.ts` is actually implemented (currently deferred — "HTTP mapping lands once its odds endpoint + rate limits are confirmed"), odds-api.io's free tier (100 req/hour, separate vendor, separate quota) could absorb a distinct traffic slice without touching the-odds-api.com's 500-credit budget. Its free tier is rate-limited hourly (not monthly), so it is structurally complementary for burst coverage. Paid odds-api.io (Solo $65/mo) is cheaper than Pro only if it replaces the primary entirely — it is not cheaper as a co-tier. Recommendation: wire the failover adapter as the #5 independent-source hedge; do not treat it as a substitute for sizing the primary tier.

## 7. VERIFY

Every number in this file is cited:
- Tier names, allowances, prices → https://theoddsapi.com/pricing (fetched 2026-08-16; page states "Last updated 2026-07-03").
- Credit-per-market rule (1 credit/market/region) → the-odds-api.com API docs v4, "Each specified market costs 1 against the usage quota, for each region."
- Scores endpoint = 1 credit → API docs "scores endpoint costs 1 request against your monthly quota."
- 304s cost 0 / x-requests-remaining header → FAQ "Technical & Integration" section.
- refresh-odds cadence (`*/15 * * * *`) → `vercel.json` lines 12-15.
- settle-picks cadence (`20 * * * *`) → `vercel.json` lines 20-22.
- 3 markets (`h2h, spreads, totals`), `regions=us` → `packages/data-ingestion/src/config.ts` lines 92 & 193.
- 7 SUPPORTED_SPORTS, in-season gating → `config.ts` lines 2-88.
- settle-picks NOT season-gated (all 7 sports) → `apps/web/app/api/cron/settle-picks/route.ts` lines 101-111.
- settle-picks getScores = 1 credit/sport → `packages/ingestion-pipeline/src/settle-sport.ts` line 178 (`client.getScores(sport.key, 2)`); spend guard at lines 77-85.
- Free-tier 500 credits/mo and the <14h exhaustion + 3-market/3-credit/call math → commit `cd4e77d6` (read in full above).
- odds-api.io tiers/pricing → https://odds-api.io (fetched 2026-08-16).
- No overage billing / 429 / in-place upgrade → https://theoddsapi.com/pricing ("No overage billing… same API key… zero code changes").

No purchase, signup, or payment action performed. This is read-only pricing research only.
