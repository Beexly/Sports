# Galaxy Self-Provisioned Odds Architecture — "Be the Provider"

Created: 2026-08-27
Branch: `hermes/sports-intel-orientation`
Owner: Hermes (with owner directive)
Status: DRAFT — architecture decision, not yet implemented in repo packages.

## 1. Premise

We are the odds provider. We do not pay The Odds API ($30/mo), TheRundown, or
any other third-party aggregator. The blueprint research (see source extracts
in `Downloads/extract-data-2026-08-27*.json`) describes a full commercial
Sportradar-class product, but the owner's need is personal: keep his own
models fed for $0. The self-provisioned path achieves that.

## 2. Legal boundary (the hard line)

PERSONAL USE ONLY. This is not a product we sell to others.

- The Odds API's own Terms (§Market Data & Transparency) confirm their data is
  "aggregated from publicly accessible sources available to the general public
  on the public internet" and "does not circumvent authentication controls."
  We do the same: read public pages, no auth bypass, no CAPTCHA defeat.
- DraftKings, Action Network, BettingPros ToS PROHIBIT automated collection.
  We do NOT scrape them. (Source: extract-data-2026-08-27 (2).json,
  official_feed_integration → target_site_boundary.)
- NBA/MLB terms restrict commercial reproduction of content/stats. We do not
  redistribute. (Source: extract-data-2026-08-27 (2).json, derived_data_strategy.)
- Polymarket is on compliance hold (docs/agent-skills/polymarket-hold). Leave
  INDEPENDENT_POLYMARKET=OFF. It is a legal gate, not tech debt.
- Product boundary: if anything is ever sold, sell TRANSFORMED analytics
  (posterior probs, model scores, alerts), NEVER raw odds rows. Raw odds are
  inputs, not products. (Galaxy data doctrine: "We win on interpretation, not
  collection.")

## 3. Source inventory — what we CAN use (keyless, ToS-permitting)

### Tier 1: Live odds (primary)

| Source | Endpoint | Auth | Coverage | Status in repo |
|---|---|---|---|---|
| ESPN site.web.api | `site.web.api.espn.com/apis/site/v2/sports/{sport}/scoreboard` | None | NFL, NCAAF, MLB, NBA, NCAAB, NHL, MLS, EPL — DraftKings spread/total/ML | `espn-odds-client.ts` EXISTS but uses `sports.core.api.espn.com` (BLOCKED). Fix to `site.web.api`. |
| BetOnline.ag | Public odds pages | None (public) | US sports, full market | NOT built — needs adapter |
| BetUS | Public odds pages | None (public) | US sports | NOT built — needs adapter |
| Pinnacle | Public odds pages | None (public) | US + intl | NOT built — needs adapter |
| Bovada | Public odds pages | None (public) | US sports | NOT built — needs adapter |

Note: The Odds API's bookmaker list (extract zip → bookmaker-apis.html.json)
shows 15+ US bookmakers. We don't need all — 3-4 independent books give enough
for no-vig consensus. ESPN (DraftKings-routed) + BetOnline + Pinnacle + Bovada
would give 4 independent sources.

### Tier 2: Exchange consensus (free, keyless, compliance-gated)

| Source | Endpoint | Auth | Status |
|---|---|---|---|
| Polymarket Gamma | `gamma-api.polymarket.com/events` | None | Client EXISTS (`polymarket-independent-client.ts`), COMPLIANCE HOLD — OFF by default |
| Kalshi | API (auth required) | RSA key | Client EXISTS (`kalshi-client.ts`), Dev Agreement blocks trading; read-only possible |

### Tier 3: Historical lines (backfill — the critical gap)

| Source | What | Auth | Status |
|---|---|---|---|
| slieb74/NFL-Betting-Data | CSV: spread_favorite + over_under_line, 1968-2017 | None (GitHub raw) | Probed live 2026-08-27, 200 OK. NOT ingested. |
| Covers.com | Historical closing lines | Public HTML | NOT built — needs Playwright scrape (personal/research) |
| SportsOddsHistory.com | Historical lines | Public HTML | NOT built — needs Playwright scrape |

### Tier 4: Free data (schedule, scores, stats — already wired)

| Source | What | Status |
|---|---|---|
| nflverse | PBP, snap share, NGS, pressure, injuries, QBR | LIVE (packages/data-ingestion) |
| ESPN site.web.api | Scores, schedules | LIVE (but odds endpoint mismatch) |
| MLB StatsAPI | Pitch-by-pitch | Client EXISTS (`mlb-statsapi-client.ts`) |
| TheSportsDB | Fixtures, scores | Probed 200 OK, no odds |
| ClubElo | Soccer ratings | Client EXISTS (`clubelo-client.ts`) |

## 4. Architecture — what to build in the repo

All production code goes in `packages/data-ingestion/src/` as TypeScript so
Claude Code and all agents can reach it. The local `odds_feed.py` is
proof-of-concept only.

### 4a. Fix the ESPN client (immediate)

`espn-odds-client.ts` currently targets `sports.core.api.espn.com` (BLOCKED).
The live endpoint is `site.web.api.espn.com`. Either:
- Switch the base URL, OR
- Add `site.web.api` as primary with `sports.core.api` as fallback in the
  existing `odds-failover.ts` chain.

This is the single highest-leverage fix — it reactivates a free keyless odds
source that's already 80% built.

### 4b. Bookmaker direct adapters (new, ~4 sources)

Each adapter:
- Implements the existing `OddsProvider` interface from `odds-failover.ts`
- Fetches a single bookmaker's public odds page (HTML or JSON)
- Parses to `OddsApiEvent` shape via existing `DataNormalizer`
- Soft-fails on error (never invents quotes)
- Includes source tag (e.g. `betonline_public`, `pinnacle_public`)
- Respects robots.txt and rate limits (1 req/min per source max)
- `certifiableForLiveGate: false` until validated against a known source

Build order: BetOnline → Pinnacle → Bovada → BetUS (by data richness).

### 4c. Historical backfill pipeline (new, the analytical gap)

The blueprint demands Bayesian walk-forward backtesting on 2018-2025 data.
Without historical lines, no ROI claim is valid. Build:
- One-time Playwright scrape of Covers/sportsoddshistory for 2018-2025
  closing lines (personal/research use)
- Ingest slieb74/NFL-Betting-Data CSV (1968-2017) as the pre-2018 extension
- Store in the existing Prisma `Odds` model with `source: "historical_scrape"`
- Freeze as immutable snapshots; never overwrite

### 4d. What NOT to build

- No Kafka/Flink/Spark/K8s (enterprise infra for a personal need)
- No OAuth gateway / multi-tenant API (we're not selling access)
- No CV/tracking pipelines (broadcast video tracking is a venture product)
- No TheRundown integration (third-party aggregator we don't need)
- No The Odds API integration (third-party aggregator we don't need)
- No Polymarket enablement (compliance hold)
- No Kafka topic pipeline

## 5. What already exists in the repo (don't rebuild)

| Component | File | State |
|---|---|---|
| Odds API client | `packages/data-ingestion/src/odds-api-client.ts` | FULL — but we're deprecating the dependency |
| TheRundown client | `packages/data-ingestion/src/rundown-client.ts` | FULL — DEPRECATE (don't delete, but don't wire as required) |
| ESPN odds client | `packages/data-ingestion/src/espn-odds-client.ts` | PARTIAL — fix endpoint to `site.web.api` |
| Polymarket client | `packages/data-ingestion/src/polymarket-independent-client.ts` | FULL — compliance hold, OFF |
| Kalshi client | `packages/data-ingestion/src/kalshi-client.ts` | FULL — auth required, read-only possible |
| Odds failover/merge | `packages/data-ingestion/src/odds-failover.ts` | FULL — reuse for multi-source merge |
| Provider adapter | `packages/data-ingestion/src/odds-provider-adapter.ts` | FULL — extend with new providers |
| Circuit breaker | `packages/data-ingestion/src/odds-api-circuit-breaker.ts` | FULL — generalize for any provider |
| Normalizer | `packages/data-ingestion/src/normalizer.ts` | FULL — reuse for all sources |
| Source registry | `data/source-atlas/source_registry_core.yaml` | FULL — add new sources here |
| Data doctrine | `docs/data/galaxy-data-doctrine.md` | FULL — interpretation, not collection |
| Staleness guard (repo) | `apps/web/lib/data-reliability/odds-fetchedat-staleness.ts` | FULL — 6h gate budget |
| Staleness guard (local) | `C:\Users\Garrett\galaxy-sports-api\odds_feed.py` | PROOF ONLY — not in repo |

## 6. Gap analysis — what we're missing or forgetting

### A. CRITICAL: ESPN endpoint is broken in repo
The repo's ESPN client uses a blocked endpoint. The local Galaxy script uses the
working one. This is the #1 fix — it's 80% built, just pointed at the wrong URL.

### B. CRITICAL: No historical 2018-2025 lines
Without these, no walk-forward backtest is possible. The blueprint's rigor
(chronological walk-forward, no shuffled CV) is impossible without this window.
Any ROI claim until this exists is in-sample/leaky. The earlier "+3.5% ROI on
570 games" was a single-season Kaggle sample, NOT walk-forward validated.

### C. HIGH: No bankroll/Kelly guardrail
The feed supplies prices O. The Kelly/correlation guardrail
(f=omega*f with drawdown protection Pr(min W_t < alpha W_ref) <= beta) is a
SEPARATE component. At -$580 bankroll, unit sizing matters more than the feed.
Flag as required before any real-money betting.

### D. HIGH: No bookmaker-direct adapters
We have the failover/merge infrastructure but only one working free source
(ESPN). Need 3-4 independent books for no-vig consensus. BetOnline, Pinnacle,
Bovada are the priority targets.

### E. MEDIUM: Data drift / retraining cadence not modeled
Book pricing models shift. A static model decays. Needs a monitoring + retraining
schedule. Not a blocker for ingestion but a blocker for sustained edge.

### F. MEDIUM: Account limiting risk
If models win, sportsbooks limit/ban accounts. A model that wins needs
account/broker diversity. Not a code issue but a strategy prerequisite.

### G. LOW: Territory/jurisdiction unknown
Some data rights are US-specific. If the user is in another territory the ToS
map changes. Needs confirmation.

### H. LOW: Tax interaction
Betting wins are taxable. At -$580 this is a real personal-finance interaction.
Not a code issue but flagged for awareness.

## 7. Build order (priority sequence)

1. **Fix ESPN endpoint** — switch `espn-odds-client.ts` to `site.web.api.espn.com`
   or add as primary in failover chain. Immediate, highest leverage.
2. **Build BetOnline adapter** — first independent book beyond ESPN.
3. **Build Pinnacle adapter** — second independent book (sharp lines, good for
   no-vig consensus).
4. **Historical backfill** — slieb74 CSV (1968-2017) + Covers scrape (2018-2025).
   Unblocks walk-forward backtesting.
5. **Build Bovada adapter** — third independent book.
6. **Deprecate TheRundown** — mark as deprecated in source registry, remove from
   required failover chain. Keep code (don't delete) but don't wire as required.
7. **Bankroll/Kelly guardrail** — separate component, not in Galaxy. Needed
   before any real-money betting.
8. **Data drift monitoring** — schedule for model re-evaluation.

## 8. Source extract reference

The four files the owner provided on 2026-08-27 contain the full blueprint:

| File | Content |
|---|---|
| `Downloads/extract-data-2026-08-27.json` | The Odds API: provider details, API key config, endpoint specs, rate limits, odds formats |
| `Downloads/extract-data-2026-08-27 (2).json` | Tracking/ingestion systems, commercial/legal framework, data lifecycle, prop modeling, mathematical core |
| `Downloads/extract-data-2026-08-27 (3).json` | CV pipeline specs, official feed integration, DFS/prop modeling, market intelligence, tech stack |
| `Downloads/769a3bce-*.zip` | 9 raw scraped pages from the-odds-api.com: terms, bookmaker list, betting markets, API guide |

These are REFERENCE. They describe a commercial product we are NOT building.
Extract the leverage (source list, legal boundaries, math) and discard the
enterprise infra (Kafka/Flink/Spark/K8s/OAuth).
