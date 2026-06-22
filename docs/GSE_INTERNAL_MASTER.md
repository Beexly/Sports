# Galaxy Sports Edge — Internal Master Document

> **CONFIDENTIAL — owner / partner / pitch use only. Not for public distribution.**
> This document describes the *entire* platform: every engine, faculty, data source, and revenue
> and engagement surface, with what each consumes and produces and whether it is live or roadmap.
> It may contain internal vocabulary, exact weight ranges, and revenue internals — keep it private.

**Model version:** `v5.0.0` · **GSE Score version:** `g1.0.0` · **Date:** 2026-06-22

### Status taxonomy (used throughout — no loose "live")
| Label | Meaning |
|---|---|
| **PRICED** | Moves the published pick score today |
| **LIVE** | Real data served to a real surface, but gated (e.g. `canPublishProjections=false`, served as fact/process-grade not a wired projection) |
| **DRAFT-ONLY** | Produces drafts; never auto-publishes/sends |
| **DEMO** | Illustrative personas/fixtures; math real, inputs not real |
| **R&D / NOT-WIRED** | Built, sometimes shadowed/surfaced, weight 0 (`priced=false`) or blocked on a missing source |
| **PLANNED / STUB** | Scaffolded, not built out |
| **ADMIN** | Operator/owner-only surface |

### Scale at a glance
~161 page routes · ~114 API routes · **~70 `apps/web/lib` subsystems** · 5 core packages · 4 workers · ~60 Prisma models. NFL is the live sport; MLB/NHL/GSN are scaffolding.

---

## Table of contents
§0 Executive summary · §1 The GSE PRICE Method & GSE Score · §2 Data ingestion & sources · §3 Prediction/scoring engine · §4 Pipeline, workers & workflows · §5 Proof, calibration & integrity · §6 Player & team intelligence (StatKing) · §7 Market intelligence · §8 News, signals & the agent council · §9 Monetization & revenue · §10 Engagement, growth & content · §11 Operator cockpit & Agent OS · §12 Governance, safety & trust · §13 Surface map (pages + APIs) · §14 Data model & types · §15 The one ladder · §16 Live-now vs. roadmap · §17 Multi-sport posture

---

## §0 Executive summary

Galaxy Sports Edge (GSE) is a **sports-intelligence operating system**. The wedge product is sports-betting intelligence; the moat is an **auditable, tamper-evident track record** plus a deep player/team analytics layer (StatKing) and an operator "Agent OS" that runs the business with honesty gates baked in.

The intelligence runs through one named method — **the GSE PRICE Method** (Proof, Read, Integrity, Context, Edge) — in a three-phase pipeline: *Read the board → Score the math → Gate the slate.* Each pick gets a flagship **GSE Score (0–100)**: the model's confidence read, adjusted by how provably we can stand behind it. It is a ranking index, **not** a win probability.

The business monetizes one unit of intelligence **five ways** (consumer subscriptions live; creator tools, B2B API/widgets, affiliate commerce, and a trust toolkit on the roadmap), priced on a **proof-gated ladder** (founding rates now, increases unlocked only by verified milestones, founding members grandfathered for life).

**The unifying thesis (the "one ladder"):** the *same* settled-and-calibrated proof milestones gate both the pricing ladder *and* the activation of model weight (turning surfaced-but-unpriced signals into priced ones). Engine maturity and revenue maturity are one ladder.

---

## §1 The GSE PRICE Method & the GSE Score

### 1.1 Pillars (PRICE)
Pipeline order is *Read → Score → Gate*; PRICE is the mnemonic. Each maps 1:1 to code (`packages/prediction-engine/src/gse-method-spec.ts → PRICE_PILLARS`).

| | Pillar | What it is | Source |
|---|---|---|---|
| **P** | Proof | CLV, Wilson intervals, isotonic calibration, tamper-evident receipts, slate Merkle commitments, readiness gates, claim compiler | `clv.ts`, `pick-proof-receipt.ts`, `slate-commitment.ts`, `proof-of-record.ts`, `calibration-apply.ts` |
| **R** | Read | Shin de-vig + MEDIAN consensus across books + Market Gravity Index | `shin-devig.ts`, `market-read.ts`, `scoring.ts:185-219` |
| **I** | Integrity | Data-quality score (coverage+freshness+breadth) as a penalty; bootstrap→canonical gating | `game-context.ts:260-307`, `platform-config.ts` |
| **C** | Context | Line movement, rest/B2B, ATS/H2H/venue form, cross-market, schedule stress, uncertainty | `game-context.ts:58-245` |
| **E** | Edge | Fair − offered → Edge Index; independent Edge Engine (Kalshi/Elo/Poisson/ML) surfaced but `priced=false` | `scoring.ts:248-301,54-79`, `edge-engine.ts` |

### 1.2 The confidence sum (exact — `scoring.ts:456-464`)
Thirteen components + a baseline, clamped 0–100. Ranges are encoded in `SCORE_COMPONENTS` and **drift-guarded** against `constants.ts` by `gse-method-spec.test.ts`.

| Component | Pillar | Range | Const |
|---|---|---|---|
| Market consensus | R | 0…+30 | `CONSENSUS_COMPONENT_MAX` |
| Market depth | R | 0…+20 | `MARKET_DEPTH_COMPONENT_MAX` |
| Edge (pricing) | E | 0…+25 | `EDGE_COMPONENT_MAX` |
| Volatility penalty | I | −15…0 | `VOLATILITY_PENALTY_MAX` |
| Line movement | C | −15…+15 | `LINE_MOVEMENT_COMPONENT_MAX` |
| Rest advantage | C | −10…+10 | — |
| ATS form | C | −10…+10 | — (gated) |
| Data-quality penalty | I | −20…0 | — |
| Head-to-head | C | −5…+5 | `HEAD_TO_HEAD_COMPONENT_MAX` (gated) |
| Venue form | C | −5…+5 | `VENUE_FORM_COMPONENT_MAX` (gated) |
| Uncertainty penalty | I | −8…0 | `UNCERTAINTY_PENALTY_MAX` |
| Cross-market | E | −3…+4 | `CROSS_MARKET_AGREE/DISAGREE` |
| Schedule stress | C | −5…+5 | `SCHEDULE_STRESS_COMPONENT_MAX` |
| Baseline | — | +10 | `scoring.ts:461` |

Supporting math: **Shin de-vig** (`shin-devig.ts`, balanced −110/−110 → 50/50, ~4.76% hold); **median consensus** across books; **Market Gravity Index** = `round(conviction × quality × 100)`; **Edge Index** = `clamp(round((edgeComponentScore/25)×100),0,100)` (a vanilla −110/−110 market ≈ 26). **Grades** (`constants.ts:13-18`): ELITE ≥85/≥80, STRONG ≥75/≥65, SOLID ≥65/≥50, else LEAN. Publish ≥50; PREMIUM ≥70. **Risk**: LINE_STEAM |move|≥12; HIGH_VARIANCE books<3 or consensus<0.58; LOW_RISK consensus≥0.70 & books≥7; else MODERATE.

### 1.3 The flagship GSE Score (`gse-score.ts`)
```
GSE Score (g1.0.0) = round( confidence × M )
M = 0.80 + 0.20·P                                   // ∈ [0.80, 1.00]
P = (proof receipt ?0.34:0) + (slate commitment ?0.33:0) + (canonical & fresh ?0.33:0)   // cap 1.0
```
Confidence already folds Read+Integrity+Context+Edge; the GSE Score adds the one thing it can't contain — **how provably we can stand behind the pick** (the Proof pillar). Fully proven/committed/canonical/fresh → M=1.0 → GSE Score = confidence; unproven/bootstrap/stale → discounted to 80%. **Non-double-counting** (provenance is orthogonal to the data-quality penalty), **versioned**, **tested**, and the scoring engine is untouched. It is a **ranking/presentation index, not a win probability**; confidence and Edge Index always ride alongside it (the `GseScoreCard`).

**Worked example** (verified by `gse-score.test.ts`): confidence 78, Edge Index 64 → SOLID_PLAY, PREMIUM, MODERATE. Fully proven → **78**; receipt only → **68**; unproven → **62**.

---

## §2 Data ingestion & sources

All facts come from real sources; nothing is fabricated. (`packages/data-ingestion/`, `packages/ingestion-pipeline/`, `apps/web/lib/{ingestion,nflverse,scraping,data-reliability,sources,resource-intelligence,cost}/`.)

| Source / faculty | What it brings in | Status |
|---|---|---|
| The Odds API (`odds-api-client.ts`) | live odds, 7 sports, h2h/spreads/totals, up to ~7 books, scores for settlement | **PRICED** (primary) |
| nflverse catalog (`nflverse-source.ts`, 25+ CC-BY-4.0 datasets) | PBP/EPA, weekly player stats, snap counts, Next Gen Stats, PFR adv, combine, injuries, depth charts | **LIVE** (served; not wired into pick confidence) |
| Kalshi (`kalshi-client.ts`) | independent exchange fair value | **R&D** (surfaced, `priced=false`) |
| ESPN results (`espn-results-client.ts`) | final scores | **PRICED** (settlement) |
| Team rates (`team-rates-source.ts`) | scoring rates for Poisson | **R&D / blocked** (`TEAM_RATES_AVAILABLE`) |
| Reddit narrative (`reddit-narrative-source.ts`) | morale/role signals | **R&D / shadow** |
| Sleeper (`lib/sleeper/`, `lib/integrations/`) | trending add/drops, player map, league sync (read-only) | **LIVE** (fantasy) |
| DFS providers (`lib/dfs/salaries.ts`: SportsDataIO, FantasyData) | reconciled DFS salaries (agreement-checked) | **LIVE** (licensed) |
| MoneyPuck (`lib/moneypuck/`), Lahman (`lib/lahman/`) | NHL advanced metrics; MLB historical | **R&D / LIVE-partial** |

**Reliability & governance:** `normalizer.ts` standardizes odds; `source-registry.ts`/`source-health.ts`/`odds-failover.ts`/`fetch-failover.ts` handle freshness SLAs and failover; `lib/data-reliability/` sets warn=120min / stale=240min thresholds and feeds the board kill-switch; `lib/sources/source-reliability.ts` tiers sources. **Rights:** `lib/scraping/clearance-engine.ts` must clear every extraction (`allowed=false` stops the job; each record carries a `RightsSnapshot`); `source-rights-registry.ts` classifies sources (`approved_api`/`approved_open_license`/`permission_required`/`excluded`, etc.). **Cost discipline:** `lib/cost/cost-governor.ts` blocks every paid operation by default unless justified (free-first doctrine); `lib/resource-intelligence/` normalizes the owner's resource inventory into a rights-gated ledger (implement-now / owner-review / hard-quarantine queues).

---

## §3 Prediction / scoring engine (`packages/prediction-engine/src/*`)

**PRICED core:** `scoring.ts` (13-component confidence, Edge Index, grade, risk → `ScoredPick`), `game-context.ts` (situational signals; ATS/H2H/venue gated by `DERIVED_MODEL_HISTORY_ENABLED`), `shin-devig.ts`, `market-read.ts`, `consensus.ts`/`consensus-view.ts`, `composite-score.ts`, `settlement.ts`, `constants.ts`, `platform-config.ts`, `readiness.ts`.

**Methodology layer (PRICED, new):** `gse-method-spec.ts` (typed source of truth), `gse-score.ts` (flagship score + Score Card), drift-guard + worked-example tests.

**Edge engine (R&D / `priced=false`):** `edge-engine.ts` (independent estimators vs book fair value; SPEAK +2.5%, LEAN +1.2%), `team-rates.ts`+`poisson.ts` (blocked by `assertTeamRatesAvailable`), `elo-estimator.ts`/`elo-backtest.ts`, `ml-estimator.ts` (GBM scaffold + honesty gate), `opponent-adjusted.ts`, `edge-significance.ts`.

**Conviction & calibration (R&D / gated):** `conviction-tier.ts` (the "70% tier" — needs calibrated P + CLV history), `calibration-apply.ts` (activates only at sample ≥100 with non-worsening ECE), `calibration-drift.ts`, `probability-calibration.ts` (PAVA isotonic, Brier/Murphy decomposition, ECE, reliability curve).

**CLV / proof (PRICED):** `clv.ts`, `clv-capture.ts`, `proof-of-record.ts`, `pick-proof-receipt.ts`, `slate-commitment.ts`.

**Signals/limits/bankroll:** `signal-snapshot.ts`, `signal-ledger.ts`, `provenance.ts`, `evidence-readiness-matrix.ts`, `model-limitations.ts` (incl. `wilsonInterval`), `trend-discovery.ts`, `performance-analytics.ts`, `kelly.ts` (quarter-Kelly, cap 3u), `bankroll.ts`, `contest-scoring.ts`, `responsible-gaming.ts`, `narrative-signal.ts` (R&D), player models (`player-projection.ts`, `player-archetype.ts`, `player-rush-scheme.ts` — see §6).

---

## §4 Pipeline, workers & workflows

**Single source of truth (`packages/ingestion-pipeline/src/`):** `process-sport.ts → processSport()` (fetch odds → normalize/upsert → enrich context → gates → `scoreGames()` → upsert picks + `PickSignalSnapshot` → build receipts + slate commitment) — called by both the worker and the admin trigger so they can't diverge; `settle-sport.ts → settleSport()` (final scores → match → grade CLV → write results + `eligibleForLearning` → grade `LossAutopsy`); `source-snapshot.ts`, `settlement-snapshots.ts`.

**Workers (`workers/`):** `data-refresh` (~30-min heartbeat, **PRICED**); `pick-generation` (**legacy**, folded in); `content-publishing` (**DRAFT-ONLY**, hard kill switch `INTERNAL_CALIBRATION_ONLY` on); `airwave-listener` (**R&D**).

**Backfill crons (`lib/ingestion/*`, `/api/cron/*`):** player-data, team-efficiency (EPA/play), historical-games, snap-counts, injuries, next-gen, PFR adv, depth-charts; plus `refresh-odds`, `refresh-player-stats`, `settle-picks`, `jarvis-snapshot`. Cron access is Bearer-gated with constant-time compare (`lib/cron/authorize.ts`).

**Workflow engine (`lib/workflows/`):** 14 registered workflows (daily-intelligence-brief, picks-intelligence, market-intelligence, settlement, calibration, historical-intelligence, content, revenue, support-trust, memory, claude-handoff, source-intelligence, airwave-claim, film-room), each with triggers, stages, gates, and approval rules; event-sourced (`workflow-event-store.ts`), with a runner/runtime/queue and a task bridge. **LIVE** (orchestration; external actions still require approval).

**Bootstrap→canonical ladder** (`platform-config.ts`): `PUBLIC_PICKS_ENABLED` → `CANONICAL_HISTORY_ENABLED` → `DERIVED_MODEL_HISTORY_ENABLED` → `OUTCOME_LEARNING_ENABLED` → `FEATURED_PICK_PROMOTION_ENABLED` → `PERFORMANCE_STATS_ENABLED`.

---

## §5 Proof, calibration & integrity

| Faculty | Role | Status |
|---|---|---|
| `pick-proof-receipt.ts` | pre-kickoff SHA-256 receipt; tamper-evident | **PRICED** |
| `slate-commitment.ts` | pre-kickoff Merkle root + fixed count; kills cherry-picking | **PRICED** |
| `proof-of-record.ts` | Merkle canonical payload / inclusion proof / verify | **PRICED** |
| `clv.ts` / `clv-capture.ts` | beat-the-close grading | **PRICED** |
| `lib/performance/*` (clv-coverage, segments, anchor, settlement-health, wilson-interval, public-clv-policy, proof-hash) | publication gates + statistical rigor | **LIVE (gated)** |
| `lib/calibration/*`, `probability-calibration.ts` | Brier/ECE/reliability metrics | **LIVE** (compute) / **R&D** (apply) |
| `readiness.ts` | runtime gate decisions + bootstrap response | **PRICED** |
| `lib/platform/integrity-ledger.ts` | append-only audit of scores/settlements/claims | **LIVE** |
| `lib/model/model-court.ts` | every scoring/factor change must survive prosecution + defense + falsifier + OOS evidence + no calibration regression + owner approval | **LIVE (governance)** |
| `lib/picks/signal-lineage.ts` | per-factor source-tier + rights + freshness audit; `publicSafe` verdict | **LIVE** |
| `lib/courtroom/` | every signal documented as claim + for/against + falsifiers + verdict | **LIVE** |
| `lib/premortem/`, `lib/pre-mortem/` | "imagine it failed" fragility analysis | **LIVE** |
| `lib/loss-autopsy/` | budget-gated grounded loss-autopsy drafts | **DRAFT-ONLY** |

---

## §6 Player & team intelligence (StatKing)

A three-layer stack: **nflverse foundation → proprietary models → composite Galaxy Index.** Served to `/stats/*`, `/intelligence/*`, `/players/*`. **All player intelligence is `canPublishProjections=false`** — served as historical fact or "process grade," never as a wired point projection inside pick confidence.

**Glossary metrics:** GPI (Galaxy Index, 0–100 composite), King Standard (engine honesty score), WOPR (1.5·targetShare + 0.7·airYardsShare), CPOE, RYOE, EPA, snap share, target share, air yards.

| Faculty | File | Computes | Status |
|---|---|---|---|
| Composite Galaxy Index | `lib/scoring/player-composite.ts` | production (PPR z-score) + workload + momentum + availability → 0–100 with drivers | **LIVE** |
| Player projection | `prediction-engine/player-projection.ts`, `lib/projections/` | recency-weighted regressed next-season PPR/g + backtest MAE/bias | **LIVE** (premium, not in scoring) |
| Usage archetype | `player-archetype.ts` | role + workload tier (bell-cow/lead/rotational/depth) | **LIVE** |
| Rush scheme | `player-rush-scheme.ts` | gap/power vs outside/zone (direction proxy) | **LIVE** (honest proxy) |
| Opponent-adjusted | `opponent-adjusted.ts` | DVOA-family adjOff/adjDef via iterative schedule adjustment | **LIVE** |
| Receiving opportunity | `lib/intelligence/receiving-opportunity.ts` | WOPR + buy-low/sell-high divergence | **LIVE** |
| Player model | `lib/intelligence/player-model.ts` | position-aware process grade (EPA/WOPR/DAKOTA/PACR) | **LIVE** |
| QB consensus | `lib/intelligence/qb-consensus.ts` | EPA/DAKOTA/PACR/QBR percentiles | **LIVE** |
| Predictiveness | `lib/intelligence/predictiveness.ts` | which metrics actually drove outcomes | **LIVE** |
| nflverse advanced lib | `lib/nflverse/*` | PBP, snap share, NGS, pressure/coverage, usage-pulse, edge-signals, age/trend signals | **LIVE / R&D** (per signal) |

NFL identity resolution (`lib/nfl/*`: game/player/team resolvers, season-week) keeps records joinable. Backfills (§4) populate `Player`, `PlayerGameStat`, `SnapCount`, `Injury`, `DepthChartEntry`, `NextGenStat`, `PfrAdvStat`, `TeamWeekStat`, `TeamGameEfficiency`.

---

## §7 Market intelligence (`lib/market/`, `lib/slate-twin/`, `lib/board/`, `lib/game-room/`)

- **Best-line shop** (`best-line.ts`) — most favorable price per side across captured books.
- **Game market read** (`game-market-read.ts`) — no-vig consensus + movement.
- **Line movement / snapshot / memory** — movement deltas and market-state history.
- **CLV candidate** (`clv-candidate.ts`) — flags opportunities to beat the close.
- **Pick death clock** (`pick-death-clock.ts`) — line drift since publish (price space only — never a fake time-to-zero).
- **Simulation cloud geometry** — spread-distribution visualization.
- **Slate Twin** (`lib/slate-twin/`) — the Galaxy Twin live market map; **gate-respecting** (shows a labeled DEMO until `canExposePublicPicks` opens; never fabricates).
- **Board** (`lib/board/`) — lane-organized public board (SCORING_NOW / PUBLISHED_TODAY / GATED_TODAY) with stale-data fallback.
- **Game room** (`lib/game-room/`) — single-matchup deep dive (`/room/[gameId]`).

---

## §8 News, signals & the agent council

- **News impact engine** (`lib/news/impact.ts`, `wire.ts`) — turns breaking reports into reads via *reliability tier × signal magnitude × freshness decay*; tiers Insider/Beat/Verified/Aggregator/Unconfirmed (weights 1.0/0.85/0.7/0.45/0.2); outputs urgency 0–100 + action. **LIVE**. Surfaced on `/the-beat`.
- **Narrative signal** (`prediction-engine/narrative-signal.ts`) — morale/role themes from media items. **R&D / shadow**.
- **War room** (`lib/war-room/`) — the visible council (line, sharp, public, injury, matchup, disagree, narrative, responsible agents) that cascades a PLAY / WATCHLIST / NO-BET verdict and narrates *which* agent changed and why. **DEMO** (illustrative, no real teams).
- **Expert signals** — independent referee/consensus baselines (`/stats/expert-board`, `/admin/statking/expert-signals`).

---

## §9 Monetization & revenue

**Five-way monetization** (`docs/product/monetization-map.md`): (1) consumer subscriptions **LIVE**; (2) creator tools (Phase 3); (3) B2B widgets + API (Phase 5; `lib/b2b/api-governance.ts` already governs key/domain/quota/claim-safety); (4) affiliate & sportsbook commerce (Phase 4); (5) trust-toolkit licensing (Phase 5).

**Pricing ladder (`lib/pricing/`):** `pricing-phases.ts` — FOUNDING (live: Pro $14.99/mo·$99/yr, Elite $24.99/mo·$179/yr) → PROVEN (≥100 settled + published calibration) → ESTABLISHED (≥500 settled + CLV beat ≥52.4%) → AUTHORITY (≥2000 settled + CLV beat ≥55%); grandfathered for life. `value-architecture.ts` (plain-English tier promises), `feature-gates.ts` (25+ features → min tier + lock behavior), `phase-readiness.ts` (advisory eligibility), `promo-codes.ts`.

**Stripe (`lib/stripe.ts` + routes):** checkout, customer portal, webhook (signature-verified, idempotent via `WebhookEvent`, 7-day `PAST_DUE` grace). Display prices always derive from the pricing phase — never hardcoded.

**Entitlements (server-side; no frontend-only paywalls):** `entitlements.ts → getUserEntitlements()` (grace window, fail-closed to FREE), `api-entitlement.ts → gateApi()`, `pricing/tier-access.ts`, pure `getEntitlements(tier)` in `@sports/types`. Paywall UI (`components/pricing/tier-gate-panel.tsx`) renders **in place of** gated content.

**Promotions (`lib/promotions/`):** `evaluatePromotionForPublish()` gate — blockers for missing disclosure/RG text/terms/eligible states/operator approval/hype language. **LIVE (compliance)**. `lib/billing/notice.ts` generates promo notices.

**Affiliate ledger (`lib/affiliate/ledger.ts`):** pure double-entry (accrue / clawback / payout / summarize / audit), hold windows for refunds, crypto + ad-pixel deliberately excluded. **BUILT, NOT-WIRED.**

**DFS / integrations (`lib/dfs/`, `lib/integrations/`):** licensed salary feeds, honest connector registry (Sleeper live; Yahoo/ESPN oauth-gated/unavailable; never scrapes closed platforms).

---

## §10 Engagement, growth & content

**Content pipeline:** `lib/content/workflow.ts` (8 content kinds + source-coverage gates), `lib/content-engine/*` (pure draft assembly), `lib/content-generator.ts` (Claude narrative — never picks; disclaimer + banned-phrase scan + budget). `lib/studio/*` (templates: betting-education, fantasy-angle, newsletter-block, tiktok-reels-script, x-thread, youtube-titles, sponsor-safe — **DRAFT-ONLY**). `lib/media/control-plane.ts` (Airwave→Content→Studio→Blog lanes; no auto-publish). `lib/journal/*` (weekly performance narrative, thin-week honesty). `lib/brief/compose.ts` (operator morning packet). SEO via `lib/seo/sports-jsonld.ts` (SportsEvent/FAQ/Breadcrumb JSON-LD). Blog (`/blog`, gated by `canPublishContent`).

**Engagement loops:** **Glass Box Cipher** (`lib/cipher/`, `/api/cipher/verify`) — weekly hidden-shard puzzle, server-side SHA-256 verify with rate limit, founder-gated reward pool. **Academy** (`lib/academy/`) — real curriculum (Line Literacy / Bankroll & Risk / Market Mechanics) graded on reasoning quality. **Bias Mirror** (`lib/bias-mirror/`) — private 7-dimension self-reflection (local, nothing stored). **CLV Tracker** (`lib/tracker/`) — personal bet log → CLV/ROI/calibration (local, educational). **Parlay MRI** (`lib/parlay/`) — illustrative parlay "genome" (real math, illustrative legs). Cost-of-Noise calculator + homepage world-sections. `reader-register` (explanation-style preference).

**Outbound (all DRAFT-ONLY):** `lib/bot-outbox/`, `lib/twitter-bot/`, `lib/discord-bot/` — queued drafts, never auto-sent. `lib/visual-production/` — asset candidates start `owner_review`, no spend without approval.

**Analytics:** `lib/analytics/events.ts` — typed funnel events (pricing/proof-of-value/trust/demand). **Instrumented, no provider wired.**

---

## §11 Operator cockpit & Agent OS

**Agent council (`lib/agents/`):** `AGENT_OS_REGISTRY` — 24 specialist agents (JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY, AUDIT, …) across **6 departments** (Command & Governance, Sports Intelligence, Data & Automation, Customer Surface & Quality, Growth/Community/Finance, Results & Calibration), with authority scopes, capability bounds (OBSERVE/ANALYZE/DRAFT/ROUTE/ESCALATE/…), health, queue, run-contract, and worker-dispatch. Most are DRAFT_ONLY / MANUAL by status.

**Cockpit synthesizers (`lib/cockpit/`):** `jarvis.ts` (launch status: LAUNCH_READY / NOT_READY_DATA / _VALIDATION / _SAFETY / UNKNOWN — pure, no fabrication), `ask-jarvis.ts`, `mission-control.ts`, `owner-summary.ts`, `jarvis-diff.ts`/`jarvis-alerts.ts`/`jarvis-audit-log.ts`/`history.ts`, `operator-registry.ts`, `transitions.ts`. **Command center (`lib/command-center/`)** re-ranks Jarvis + owner-summary into one owner-attention queue (urgency = cost-of-delay × severity × reversibility × trust). **Tasks (`lib/tasks/`)** route work through approval gates + priority queue + runtime. **Memory (`lib/memory/`)** routes knowledge candidates through review (never auto-approved). **Human-performance (`lib/human-performance/`)** tracks analyst availability/readiness (coaching only). **House (`lib/house/`)** runs weekly rituals.

**Admin surfaces (~39 StatKing ops + cockpit views):** ingestion runs, freshness, source-CRM/rights/trust, signal calibration/import, scouting QC, media intake (YouTube/Reddit/podcasts/RSS), King-Score audit, backtests, conflicts, user-feedback, plus `/cockpit/*` (agents, calibration, command-center, content review, market-twin, promo-desk, journal, tasks, synthetic-monitoring, api-costs). All **ADMIN**.

---

## §12 Governance, safety & trust

- **Trust Claim Registry (`lib/trust-claims.ts`)** — single source of truth for allowed public language; `APPROVED`/`GATED`/`BANNED`; powers `scanForBannedPhrases`. Banned certainty terms (referenced here in code so the scanner skips them): `guaranteed`, `lock`, `sure thing`, `risk-free`, `easy money`, `can't lose`, `verified track record`, `thousands of bettors`, `trusted by serious bettors`, `guaranteed profit`.
- **Public-claim compiler (`lib/claims/public-claim-compiler.ts`)** — eight gates (banned phrases, performance readiness, bootstrap status, settled-sample floor, model-version stamp, data freshness, CLV coverage, calibration publishable) → ALLOW/BLOCK + blockers.
- **Content safety (`lib/safety/content-safety.ts`)** — sexual/hate → block; profanity/violence/self-harm/PII/overclaim → review.
- **Community moderation (`lib/community/`)** — graduated ladder (NUDGE→REMOVE→MUTE_24H→MUTE_7D→SUSPEND→BAN), straight-to-BAN for hate/threats/doxxing, different-reviewer appeals, every action logged; distress-signal detection.
- **Responsible gaming** (`responsible-gaming.ts`, `RiskDisclosure`, Bias Mirror) — protective, never predatory; 1-800-GAMBLER everywhere.
- **Voice standard (`lib/voice/analyst-standard.ts`)** — calm, precise, protective tone.
- **Cost & LLM governance** — `lib/cost/cost-governor.ts` (free-first), `lib/claude-api/*` (per-surface monthly caps: e.g. BLOG $50, STUDIO $500, MODEL_COURT $2000; budget status green→hard_cap; cost ledger on success *and* failure; model router + economics).
- **Infra discipline** — `lib/cache/public-read-model-policy.ts` (sensitive surfaces never cached), `lib/cron/authorize.ts` (timing-safe secret), `lib/observability/sentry.ts` (runtime-only), `lib/synthetic-monitoring/` (health checks).

---

## §13 Surface map (pages + APIs)

**Pages (~161).** *Public/marketing:* `/`, `/board`, `/pricing`, `/methodology`, `/accountability`, `/academy`, `/brief`, `/blog`(+`[slug]`), `/cipher`, `/clv`, `/observatory`, `/proof`, `/performance`(+`/losses`), `/contact`, `/data`, `/faq`, `/integrations`, `/journal`(+`[slug]`,`/rss.xml`), `/ledger`, `/weather`, `/press`, `/about`, `/vs/tout-services`, `/changelog`, `/responsible-play`, `/privacy`, `/terms`. *Product — StatKing/Intelligence/Player Lab:* `/stats` + ~24 sub-pages, `/intelligence` + ~16, `/players` + ~11. *Fantasy:* `/fantasy/*` (~15: connect, lineup, waivers, trade, props, dfs, draft, league-twin, gm-ledger, contests, autopilot[stub], studio[stub]). *Advanced:* `/today`, `/track`, `/the-beat`, `/trends`, `/parlay-mri`, `/human`, `/room/[gameId]`, `/optimizer`, `/airwave`[demo], `/nflverse`, `/preview/[sport]/[slug]`, `/promotions`, `/mlb`·`/nhl`·`/gsn`·`/house`[stubs]. *Account:* `/dashboard`, `/today`, `/track`, `/auth/*`. *Admin/Cockpit:* `/admin/*` (+ ~31 `/admin/statking/*`), `/cockpit/*` (~31).

**APIs (~114), by domain:** picks (`/api/picks`, `/[id]/explain`, `/[id]/audit`, `/daily-slate`), board/performance/calibration, **intelligence** (~20: player-model, receiving-opportunity, archetypes, movers, qb-consensus/forward, rush-schemes, rushing-contact/efficiency, team-ratings/environment, expected-points, route-rate, roster-advice, clv-calibration, graded-pool, predictiveness, opportunity-transfer, scoring-zone, sleeper-trending), **nflverse** (~11: snap-share, next-gen-stats, player-lab, combine, injuries, qbr, edge-signals, pressure-coverage, usage-pulse, birthday-usage-trend, qb-age-rb-trend), crons (~7), health/synthetic-monitoring, subscriptions (checkout/portal) + `webhooks/stripe`, board/brief/room-model-court, airwave (~4), sources/data-sources, mlb/moneypuck/dfs/sleeper, legal/media, trends/weather, cipher/verify, cockpit (~31, ADMIN), auth. Gates: PUBLIC / FREE / PREMIUM(Pro) / ELITE / ADMIN.

---

## §14 Data model & types

**Prisma models (`packages/db/prisma/schema.prisma`, ~60 + enums):**
- *Auth/billing:* User, Account, Session, VerificationToken, Subscription, WebhookEvent.
- *Sports core:* Sport, League, Team, Game, Odds, OpeningLine, TeamGameLog, IngestionRun.
- *Picks/proof:* Pick, PickProofReceipt, SlateCommitment, GateDecision, PickSignalSnapshot, LossAutopsy (+ LossRootCause/Status enums).
- *Signals:* SourceSnapshot, GameSignal, Signal.
- *Player stats:* Player, PlayerGameStat, SnapCount, Injury, DepthChartEntry, HistoricalGame, TeamGameEfficiency, PlayerRushProfile, NextGenStat, PfrAdvStat, TeamWeekStat.
- *Content/moderation:* BlogPost, ContentDraft, ContentSource, ContentReview, CreatorAsset, ModelJournalEntry, ModerationReport, ModerationAction, ModerationAppeal.
- *Ops/agents:* CockpitTask, CockpitDecision, CockpitMediaItem, JarvisMemoryEvent, JarvisDecision, AgentHandoff, SubagentRun.
- *Revenue/brief/calibration:* Promotion, DailyBrief, DailyBriefSection, DailyBriefItem, Alert, SourceCoverageReport, PerformanceSummary, ClaudeApiCallRecord, ClaudeApiBudget, CalibrationProposal.

**Shared types (`@sports/types`):** `SubscriptionTier`, `PickType/Tier/Grade`, `RiskLevel`, `PickResult`, `Entitlements`+`getEntitlements()`, `FactorBreakdown`+`FactorDetail`, `IndependentEdgeSummary` (`priced` flag), `ScoredPick`, `PublicPick`, `AuditPayload`, `GameContextInput`, `SignalCategory`, `NarrativeSignal`.

---

## §15 The one ladder

The same proof milestones gate **both** the pricing ladder **and** model-weight activation:

```
settled, canonical picks accumulate
        └──> published calibration / CLV beat-rate
                 ├──> PRICING advances: FOUNDING → PROVEN → ESTABLISHED → AUTHORITY
                 └──> MODEL WEIGHT activates: priced=false → priced; calibration applied
```

The **PROVEN** rung (≥100 settled + published calibration) is the *same* threshold at which `calibration-apply.ts` may emit real probabilities and `PERFORMANCE_STATS_ENABLED` may open. Revenue maturity and engine maturity are one ladder — that is the core of the pitch.

---

## §16 Live-now vs. roadmap (consolidated)

| Capability | Status |
|---|---|
| Consensus, depth, book-edge, line movement, rest, schedule, cross-market, uncertainty | **PRICED** |
| ATS / head-to-head / venue form | **PRICED** (gated on `DERIVED_MODEL_HISTORY_ENABLED`) |
| StatKing player/team intelligence (GPI, WOPR, EPA, archetypes, opponent-adjusted, projections) | **LIVE** (served; `canPublishProjections=false`, not wired into pick confidence) |
| Independent edge engine (Kalshi) | **R&D** (surfaced, `priced=false`) |
| Poisson / Elo / ML estimators | **R&D / blocked** |
| Calibrated win probabilities | **BUILT** (activates at sample ≥100, non-worsening ECE) |
| Public performance & CLV stats | **BUILT** (gate-held: `PERFORMANCE_STATS_ENABLED` + sample floor) |
| Consumer subscriptions (Stripe + server-side entitlements) | **LIVE** |
| Promotions compliance gates | **LIVE** |
| Affiliate ledger | **BUILT, NOT-WIRED** |
| B2B API/widgets, creator tools, trust-toolkit licensing | **PLANNED** |
| Content auto-publish, outbound bots, real-time Elite alerts | **DRAFT-ONLY / PLANNED** |
| Workflow engine + agent council | **LIVE** (orchestration; external actions gated) |
| MLB / NHL / GSN | **STUB** |

---

## §17 Multi-sport posture

NFL is the live, fully-instrumented sport (odds + nflverse depth). The Odds API already provides odds for 7 sports, so the core pick engine generalizes; the **player/team intelligence depth is NFL-specific** today. `/mlb`, `/nhl`, `/gsn` are stubs; `lib/lahman/` (MLB historical) and `lib/moneypuck/` (NHL advanced) are early, source-gated footholds. Expansion is a data-depth and rights problem, not an engine rewrite.

---

*Internal reference. Companion public document: `docs/GSE_PUBLIC_OVERVIEW.md`. Method implemented and drift-guarded in `packages/prediction-engine/src/{gse-method-spec,gse-score}.ts`.*
