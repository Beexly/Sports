# 21 — Category Source Map (the 8 Rating Categories) + the No-Odds Product

> **Status:** Design doc (research + product spec). Written 2026-06-10 against the deploy
> clone `C:/Users/Garrett/Sports`. No code/schema/env change. EXISTS vs PROPOSED is marked
> on every row. Companion to doc 20 (registry/resilience) and doc 22 (verdicts/compliance).
>
> **Scope rules inherited:** only free or already-configured sources are mapped as
> recommended primaries/fallbacks; High-risk sources require owner/legal approval before
> automation (`docs/research/gse-source-risk-register.md:17-19`); The Odds API remains the
> odds primary (founder decision; `provider-registry.ts:96-105`).
>
> **Two-clones caveat:** product-surface claims below are grounded to THIS clone. Canonical-
> clone surfaces (Player Lab etc.) are marked as such and are not asserted as deployed.

---

## 1. The eight categories (source of truth: doc 10)

The GSE Rating composite is eight weighted categories — Market Structure (28), Production
(14), Efficiency (16), Next Gen/Tracking (10), Trenches/Protection (10), Availability (8),
Environment/Matchup (8), Signal (6) — with only Market live at weight today
(`docs/command-center/data-mesh/10-gse-rating-proprietary-architecture.md:105-114`). Every
non-Market category enters shadow-first at `weight:0` (`10-…md:71-74`; the shipped pattern at
`packages/ingestion-pipeline/src/process-sport.ts:73-99`).

Cross-cutting rules applied to every row below:

- **One provider per truth domain, cross-checks not duplicate votes**
  (`docs/research/gse-current-data-state.md:83`; `gse-nfl-signal-taxonomy.md:34`).
- **No-data policy comes from the fallback map** — P0/P1 domains WITHHOLD, soft domains are
  SHADOW_ONLY (`docs/research/gse-source-fallback-map.jsonl:1-27`).
- **License posture comes from the inventory + risk register** (SRC IDs cite
  `docs/research/gse-free-source-inventory.md`; family rules cite
  `gse-source-risk-register.md:5-15`).

## 2. Per-category source map

### 2.1 Market Structure (weight 28 — LIVE today)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary | **The Odds API** — h2h/spreads/totals, 7 sports, 7 priority books | **EXISTS — live** | `packages/data-ingestion/src/config.ts:2-56`; `odds-api-client.ts:65-146`; SRC-001 (`gse-free-source-inventory.md:7`) |
| Fallback 1 | **odds-api.io** — free tier 2 books/100 req-hr; analytics use permitted, no redistribution | **EXISTS — inert registry stub; adapter PROPOSED** | `provider-registry.ts:118-127`; [pricing](https://odds-api.io/pricing); [terms](https://odds-api.io/terms) |
| Fallback 2 | **API-Sports** — odds bookmaker-sparse; treat as last-resort odds, better as schedule/stats fallback | **EXISTS — inert registry stub; adapter PROPOSED** | `provider-registry.ts:135-144`; SRC-033 (`gse-free-source-inventory.md:39`) |
| Reference | **Kalshi public market data** — market-implied probability + CLV close reference; **no-auth** read endpoints; NOT a sportsbook-line substitute | **PROPOSED** (zero Kalshi code in this clone, grep-verified) | [Get Markets `security: []`](https://docs.kalshi.com/api-reference/market/get-markets); attach point `closing-line.ts:31-44` |
| Reference | **Own closing-line archive** — `captureClosingLine()` consensus snapshots | **EXISTS — shipped, ops-gated timing** | `closing-line.ts:26-44`; `15-clv-closing-line-defer-note.md:64-84` |

No-data policy: **WITHHOLD** (FALLBACK-001, `gse-source-fallback-map.jsonl:1`). Deny-listed
forever as "fallbacks": DK/FD page scraping (SRC-038, `gse-free-source-inventory.md:44`).

### 2.2 Production (weight 14 — shadow-only today)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary | **nflverse player/team stats** (nflreadr/nflreadpy loaders or direct release-file HTTPS) — yards, TDs, touches, target share, WOPR inputs | **PROPOSED** — no adapter in this tree | SRC-002..006 (`gse-free-source-inventory.md:8-12`); [nflverse-data](https://github.com/nflverse/nflverse-data); CC-BY-4.0 ([changelog](https://nflreadr.nflverse.com/news/index.html)) |
| Fallback | Official gamebooks / manual operator entry (claim-carded) | PROPOSED | FALLBACK-005 (`gse-source-fallback-map.jsonl:5`) |

No-data: **WITHHOLD** (P0, FALLBACK-005). License note: attribution + release pinning
required; "package license ≠ underlying data rights" (`gse-free-source-inventory.md:8`).

### 2.3 Efficiency (weight 16 — shadow-only today)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary | **nflfastR play-by-play** — EPA/play, success rate, CPOE; DAKOTA/PACR derivable | **PROPOSED** | SRC-005 (`gse-free-source-inventory.md:11`); FALLBACK-011 derived-PBP chain (`gse-source-fallback-map.jsonl:11`) |
| Fallback | nflreadpy loaders of the same releases (wrapper-level redundancy only — a cross-check, never a second model vote) | PROPOSED | SRC-003 (`gse-free-source-inventory.md:9`); non-redundancy rule (`gse-nfl-signal-taxonomy.md:34`) |

No-data: **WITHHOLD** for stat claims; corrections/release lag need freshness badges
(`gse-free-source-inventory.md:11`).

### 2.4 Next Gen / Tracking (weight 10 — not present in deploy clone)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary | **NGS via the nflverse mirror** (`load_nextgen_stats`) — weekly player-level passing/receiving/rushing aggregates 2016+, nightly in-season | **PROPOSED** | [reference](https://nflreadr.nflverse.com/reference/load_nextgen_stats.html); SRC-017 marks direct scraping High-risk (`gse-free-source-inventory.md:23`) |
| R&D only | Big Data Bowl tracking slices — offline research, never live | PROPOSED (offline) | SRC-019 (`gse-free-source-inventory.md:25`) |
| NOT | Direct NFL.com NGS endpoints | — | same risk class as ESPN hidden API; mirror makes it unnecessary (doc 22 §3) |

Honest limit: **raw tracking is not free and never will be on this stack** — public NGS is
aggregate-only (`gse-free-source-inventory.md:24`). The category activates on aggregates.

### 2.5 Trenches / Protection (weight 10 — not present in deploy clone)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary | **nflverse PBP-derived proxies** — pressure/sack context, adjusted-line-yards-style derivations from open play-by-play | **PROPOSED** | SRC-005 (`gse-free-source-inventory.md:11`); FALLBACK-011 (`gse-source-fallback-map.jsonl:11`) |
| Fallback | FTN-attributed participation (2023+) for personnel/protection context — CC-BY-SA, credit "FTN Data via nflverse" | PROPOSED | SRC-012 (`gse-free-source-inventory.md:18`); [changelog](https://nflreadr.nflverse.com/news/index.html) |

Honest limit: **PBWR/RBWR are ESPN-proprietary metrics** computed on raw tracking; free
parity is unrealistic (doc 22 §4). The category ships with derived proxies, labeled as such —
doc 10's PBWR/RBWR ambition (`10-…md:111`) is a licensed-data decision for the founder.

### 2.6 Availability (weight 8 — shadow-only today: `PLAYER_AVAILABILITY`, `trustLevel:0`)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Primary (historical/backtest) | **nflreadr injuries** — historical report table | **PROPOSED** | SRC-008 (`gse-free-source-inventory.md:14`) |
| Primary (live, gated) | **Official NFL injury reports** — official-status precedence, manual/approved ingestion only; High-risk, owner/legal approval required before automation | **PROPOSED / approval-gated** | SRC-007 (`gse-free-source-inventory.md:13`); `gse-source-risk-register.md:14,17-19`; FALLBACK-007 (`gse-source-fallback-map.jsonl:7`) |
| Context | nflreadr snap counts / depth charts / rosters | PROPOSED | SRC-009/010/013 (`gse-free-source-inventory.md:15-16,19`) |

No-data: **WITHHOLD** (P0). No-diagnosis language is mandatory
(`gse-source-risk-register.md:14`). Today's shipped honesty: the category is recorded
`BLOCKED_MISSING_SOURCE` and "cannot affect confidence" (`process-sport.ts:73-99`).

### 2.7 Environment / Matchup (weight 8 — PARTIAL LIVE: rest/schedule/H2H from own DB)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Live today | **Context enrichment from own records** — opening lines, movement, rest days, schedule density, ATS/H2H | **EXISTS** | `process-sport.ts:238-278`; `gse-current-data-state.md:31` |
| Primary (weather) | **api.weather.gov** — forecasts/alerts at stadium coordinates; User-Agent required; public domain | **PROPOSED** | SRC-021 (`gse-free-source-inventory.md:27`); [NWS docs](https://www.weather.gov/documentation/services-web-api); FALLBACK-015/016 (`gse-source-fallback-map.jsonl:15-16`) |
| Fallback (weather backfill) | Open-Meteo — **conditions**: commercial terms review first | PROPOSED/conditions | SRC-022 (`gse-free-source-inventory.md:28`) |
| Venue | Wikidata (CC0) + manual stadium registry; OSM only after ODbL acceptance | PROPOSED | SRC-023/024 (`gse-free-source-inventory.md:29-30`); FALLBACK-014/017 (`jsonl:14,17`) |
| Officials | nflreadr `load_officials` — observational tendencies only, never bias claims | PROPOSED | SRC-014 (`gse-free-source-inventory.md:20`); FALLBACK-012/013 (`jsonl:12-13`) |
| Schedule | nflreadr schedules (cross-checked vs official on changes) | PROPOSED | SRC-011 (`gse-free-source-inventory.md:17`); FALLBACK-003 (`jsonl:3`) |

No-data: WITHHOLD for weather/wind/venue claims; officiating-tendency is **SHADOW_ONLY**
(`gse-source-fallback-map.jsonl:13`).

### 2.8 Signal — qualitative (weight 6, capped on purpose — DOES NOT EXIST today)

| Role | Source | Status | Grounding |
|---|---|---|---|
| Shadow (gated) | **SiriusXM Ch 87** pundit accountability — built illustrative/founder-gated; live capture needs legal sign-off | **PROPOSED/gated** | `12-siriusxm-ch87-source-catalog-and-ingestion.md`; doc 10 category 8 (`10-…md:114`) |
| Shadow | Beat-reporter claim cards via trusted-reporter registry — verification path required, quote limits | PROPOSED | FALLBACK-022 (`gse-source-fallback-map.jsonl:22`); SRC-037 (`gse-free-source-inventory.md:43`) |
| Shadow | Attention proxies: Sleeper trending, GDELT news volume, Wikimedia pageviews — "attention is not truth" | PROPOSED | SRC-025/027/030 (`gse-free-source-inventory.md:31,33,36`); ladder rung 5 (`gse-nfl-signal-taxonomy.md:29`) |
| Conditions | Reddit/YouTube — commercial terms review before any automation | PROPOSED/conditions | SRC-028/029 (`gse-free-source-inventory.md:34-35`); `gse-source-risk-register.md:11-12` |

No-data: **SHADOW_ONLY across the board** — community weak signals are "cockpit only; never
public evidence" (`gse-source-fallback-map.jsonl:25`). Signal can break ties; it never
dominates a quantitative read (`10-…md:116-120`).

---

## 3. Category → no-data behavior summary (the one-glance table)

| Category | Primary (free/legal) | Fallback | When dark |
|---|---|---|---|
| Market Structure | The Odds API (live) | odds-api.io → API-Sports (stubs); Kalshi/own-close as reference | **WITHHOLD** picks; no-odds product (§4) |
| Production | nflverse stats | gamebooks/manual | WITHHOLD stat claims |
| Efficiency | nflfastR PBP | nflreadpy same-release | WITHHOLD |
| Next Gen | NGS via nflverse mirror | none free (honest) | category stays shadow |
| Trenches | PBP-derived proxies | FTN participation slice | category stays shadow |
| Availability | nflreadr injuries (hist.) / official reports (gated) | snap counts/depth charts | WITHHOLD availability claims |
| Environment | own-DB context (live) + NWS | Open-Meteo (conditions) | WITHHOLD weather/venue claims |
| Signal | Ch87/beat/attention (all gated/shadow) | — | SHADOW_ONLY always |

---

## 4. The no-odds product — what GSE honestly shows and sells when odds are unavailable

**The trigger.** All configured odds providers fail → cron returns 502 with a classified
`failureReason` (`refresh-odds/route.ts:83-158`), `IngestionRun` goes FAILED
(`process-sport.ts:488-495`), and within 2 hours `/api/ready` 503s while `/api/picks`
withholds under-evidenced output (pipeline CSV rows 11-15). That machinery EXISTS. What
follows is the **product answer** to "what does the user see during that window?"

### 4.1 The honesty frame (binding)

1. **Never serve a stale line as fresh.** The 1-hour ingest freshness gate
   (`config.ts:59`; `process-sport.ts:150-152`) and WITHHOLD policies
   (`gse-source-fallback-map.jsonl:1`) already encode this. A no-odds state is **labeled**,
   not papered over.
2. **Never fabricate a substitute line.** Kalshi prices are event-contract probabilities,
   not sportsbook lines ([Kalshi API](https://docs.kalshi.com/api-reference/market/get-markets));
   if shown, they are labeled as market-implied probability — a *reference*, never "the line."
3. **Forward projections stay founder-gated.** Publishing projections is a separate gated
   decision (`PROJECTIONS_PROVIDER` graded-pool gate — founder's call); a no-odds outage does
   not unlock it.
4. **Public copy stays calm; classified reasons are internal/founder-only**
   (`provider-status.ts:13-16`; `refresh-odds/route.ts:127-128`).

### 4.2 The no-odds shelf (what remains genuinely sellable)

| Surface | Needs live odds? | Status | Grounding |
|---|---|---|---|
| **Settled track record + calibration receipts** — wins/losses/pushes, reliability buckets, per-pick audit trails | No (settled history) | **EXISTS** | `/api/performance`, `/api/picks/[id]/audit` (pipeline CSV rows 17-18); calibration gate `10-…md:51` |
| **CLV scoreboard** — rolling CLV-positive rate over already-settled picks (null until closes accrue, never inflated) | No (own archive) | **EXISTS — accrues over time** | `15-clv-closing-line-defer-note.md:57-59,86-92` |
| **Pick audit/autopsy reading** — immutable `PickSignalSnapshot` per published pick | No | **EXISTS** | `process-sport.ts:421-425`; CSV row 18 |
| **Board in labeled degraded state** — board state route degrades to `dataStatus: degraded`, never crashes | n/a | **EXISTS** | CSV rows 14, 21 |
| **Rating education ladder + methodology surfaces** (reveal-less) | No | **EXISTS (FREE tier)** | doc 10 public contract (`10-…md:334-351`) |
| **Stats/analytics features off the nflverse spine** — trend cards, team/player context, weekly results recaps | No | **PROPOSED** (adapters not built here; analytics work exists only as local commits per memory — verify before claiming) | §2.2-2.5 |
| **Weather/context game cards** (NWS) | No | **PROPOSED** | §2.7 |
| **Market-implied probability strip (Kalshi, labeled reference)** | No (different market) | **PROPOSED** | §2.1 |
| **"Beat the Model" free skill pick'em** — users pick vs the model on results, no odds display required | No | **PROPOSED** (sanctioned product lane: free skill game; no real-money/chance mechanics) | founder gaming stance (standing decision) |

### 4.3 What is explicitly NOT shown in a no-odds window

- No picks generated from stale odds (freshness gate throws before normalize,
  `process-sport.ts:150-152`).
- No "estimated lines" or model-invented odds — fabricating a line would violate the
  fail-closed contract the whole mesh is built on (doc 20 §3.1).
- No flipping of readiness/performance flags to keep surfaces alive
  (`gse-current-data-state.md:101-105` do-not-touch list).
- No silent sportsbook-page scraping as an "emergency" source — deny-listed regardless of
  outage (SRC-038, `gse-free-source-inventory.md:44`).

### 4.4 The honest pitch (product copy stance, PROPOSED)

When odds are dark, GSE sells **proof and intelligence, not lines**: "Live market data is
temporarily unavailable from our provider. Here's our settled record, our calibration, and
the analysis that doesn't depend on a bookmaker being awake." That is only credible because
the truth contract makes outages detectable instead of masked — the no-odds product is the
*consumer-facing face of the fail-closed architecture*, and it is the concrete payoff of
demoting the single-provider risk (doc 20 §4).

---

## 5. Grounding ledger

| Claim | Anchor |
|---|---|
| 8 categories + weights + per-category status | `10-gse-rating-proprietary-architecture.md:105-114` (verified read 2026-06-10) |
| Shadow-first principle + shipped pattern | `10-…md:71-74`; `process-sport.ts:73-99` |
| Live odds path / sports / markets / freshness | `config.ts:2-66`; `odds-api-client.ts:65-146`; `process-sport.ts:150-152` |
| Registry stubs (fallbacks) | `provider-registry.ts:118-144` |
| Context enrichment live (rest/schedule/ATS/H2H) | `process-sport.ts:238-278`; `gse-current-data-state.md:31` |
| SRC inventory rows cited per source | `docs/research/gse-free-source-inventory.md:7-48` |
| Fallback chains + WITHHOLD/SHADOW_ONLY | `docs/research/gse-source-fallback-map.jsonl:1-27` |
| Risk-register family rules + approval rule | `docs/research/gse-source-risk-register.md:5-19` |
| Quality ladder + non-redundancy | `docs/research/gse-nfl-signal-taxonomy.md:25-34` |
| Truth contract surfaces (cron 502, ready 503, withhold) | `refresh-odds/route.ts:83-158`; `current-live-data-pipeline-map.csv` rows 11-18 |
| CLV scoreboard + honesty guards | `15-clv-closing-line-defer-note.md:57-92`; `closing-line.ts:26-44` |
| Web-verified source facts (nflverse license, NGS mirror, NWS, Kalshi, odds-api.io) | URLs inline; verification debts in doc 22 §5 |
| No Kalshi code in this clone | grep across `packages/`, `apps/`, `workers/` — zero hits (2026-06-10) |
