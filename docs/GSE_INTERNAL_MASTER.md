# Galaxy Sports Edge — Internal Master Document

> **CONFIDENTIAL — owner / partner / pitch use only. Not for public distribution.**
> This document describes the *entire* platform: every engine, faculty, data source, and revenue
> and engagement surface, with what each consumes and produces and whether it is live or roadmap.
> It may contain internal vocabulary, exact weight ranges, and revenue internals — keep it private.

**Model version:** `v5.0.0` · **GSE Score version:** `g1.0.0` · **Date:** 2026-06-22 · **Updated:** 2026-06-26 (see §19)

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
§0 Executive summary · §1 The GSE PRICE Method & GSE Score · §2 Data ingestion & sources · §3 Prediction/scoring engine · §4 Pipeline, workers & workflows · §5 Proof, calibration & integrity · §6 Player & team intelligence (StatKing) · §7 Market intelligence · §8 News, signals & the agent council · §9 Monetization & revenue · §10 Engagement, growth & content · §11 Operator cockpit & Agent OS · §12 Governance, safety & trust · §13 Surface map (pages + APIs) · §14 Data model & types · §15 The one ladder · §16 Live-now vs. roadmap · §17 Multi-sport posture · §18 Integration, the Decision Genome spine & the 2026-06-25 verification + launch ledger · §19 The Frontier Institution — Meaning Compiler, Public Observer Ledger & Data Genesis Engine (2026-06-26)

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

## §18 Integration, the Decision Genome spine & the 2026-06-25 verification + launch ledger

This section records the consolidation of the scattered session/Codex branches into one
verified, deployable line, the research integration that reframes GSE around a pre-result
truth protocol, and the adversarial verification pass. Branch: `claude/stoic-dirac-20h11q`
(`main` is a strict ancestor → a clean PR with no force-push). Nothing here flips a publish
gate; `canPublishProjections`/`priced` stay shadow.

### 18.1 Consolidation — one verified deployable line
A read-only reconciliation found `origin/main` had been force-updated with **45 commits** of
independent **Proven-edge + Advanced-Systems** work (CLV proof receipts, commit-reveal slates,
Integrity Ledger, Public Claim Compiler, Signal Lineage, Market Memory, Source Reliability,
No-Bet Adversary, Proof Graph) that the engine branch lacked. Resolution (owner-approved):
**base the integration on `main`** and merge the rest in, so nothing is orphaned.

| Line merged | Tip | Brings |
|---|---|---|
| `main` (base) | `5687b411` | Proven-edge + Advanced Systems |
| `codex/intelligence-core` | `30f8c455` | engine slices A1→B5 (ladder reducer, settled-game heartbeat, replay-harness, feature-store, player-rate posteriors/shrinkage, **market-anchored reconciliation** [conserves team yards/TDs, fantasy derived], Tweedie baseline + ACI + Clark-West, earned-weight ensemble, conformal intervals) + the keystone backtest + the Newton/Tweedie anti-divergence fix + the nflverse currency guard |
| `claude/sweet-fermi-sk9gws` | `9198f20f` | fantasy-launch polish |

One add/add conflict (`apps/web/lib/cache/public-read-model-policy.ts`) was resolved to main's
wired version (it backs the Integrity-Ledger evidence chain). Branch archaeology over ~80
branches found the rest superseded; the only genuinely valuable un-integrated work is captured as
post-launch recovery items (see `docs/ops/LAUNCH_BACKLOG_2026-06-24.md`): a full DFS-optimizer
subsystem (`claude/laughing-wozniak-gyryjx`), the Galaxy Dynasty gamification surface
(`codex/galaxy-dynasty-studio-rescue-v2`, 157 commits behind — a parallel track), and a partial
`lib/gse/` decision-intelligence layer.

### 18.2 Keystone backtest — the honest frontier verdict (unchanged)
2021–2025, **18,344 out-of-sample player-weeks** (current data incl. 2025): model **MAE 5.3087
vs naive 4.9064 → beats naive = false** (Clark-West t≈18.8, but the gate correctly withholds
because the model's error is *higher*). The projection engine does **not** beat naive
points-persistence yet, so projections stay `priced=false`/shadow. That discipline is the moat;
the backtest is now an ablation harness for the real ML work (regularization, orthogonal
role/game-script features, proper CV).

### 18.3 Research integration — the Decision Genome & Epistemic Alpha spine
The *GSE/GSN Master Research* package's central ask — reframe GSE around a **Decision Genome**
(the atomic object behind every play/pass/wait/suppress/publish/quarantine/pricing decision) and
an **Epistemic Alpha** ledger (*was the confidence deserved before the outcome?*) — is implemented
as a pure, fully-tested TypeScript spine that **composes** existing primitives
(`compilePublicClaim`, `scanForBannedPhrases`, the agent registry) rather than rebuilding them.
`apps/web/lib/decision-genome/` (+ an ADMIN-gated `/api/decision-genome` that runs it end-to-end
on illustrative fixtures). **97 tests.** Build order A–I + dark-corner engines:

| Module | Role | Status |
|---|---|---|
| `claim-lang.ts` | Typed claims with proof obligations; public/perf claims delegate to the Public Claim Compiler | **LIVE (lib)** |
| `decision-genome.ts` | The atomic object + 10 genome layers (time/market/evidence/model/agents/user/compliance/proof/learning) | **LIVE (lib)** |
| `knowability.ts` | Point-in-time kernel — leakage after decision-lock is a checkable violation (fail-safe) | **LIVE (lib)** |
| `candidate-ledger.ts` | CandidateDenominatorLedger — tracks every candidate, kills survivorship bias | **LIVE (lib)** |
| `aperture.ts` | ApertureStateMachine — Signal/Shadow/Wait/Pass/Quarantine; refusal as a product | **LIVE (lib)** |
| `agent-court.ts` | SCOUT/TAL/AVA/BOBBY/SARAH/JARVIS stake Brier-scored falsifiable claims; no new autonomy | **LIVE (lib)** |
| `decision-replay.ts` | Recompute from frozen inputs; divergence = drift | **LIVE (lib)** |
| `proof-card.ts` | Draft-only, banned-phrase-scanned, human-gated; built only from settled genomes | **DRAFT-ONLY** |
| `epistemic-alpha.ts` | Scores timing/truth/uncertainty/restraint/availability/proof | **LIVE (lib)** |
| `conformal.ts` | ConformalDecisionGate — the principled basis for `model.refused` | **LIVE (lib)** |
| `market-physics.ts` | Market Physics Engine — temperature/pressure/gravity/viscosity/entropy/friction/toxicity | **LIVE (lib)** |
| `claim-independence.ts` | ClaimIndependenceIndex — collapses echoes so source-count can't inflate | **LIVE (lib)** |
| `rumor-quarantine.ts` | RumorQuarantine — known/reported/rumored/contradicted/expired/unsafe; fail-safe to quarantine | **LIVE (lib)** |

Acceptance invariants enforced in code + tests: no fabricated data, no public claim without the
proof gate, no confidence without calibration context, agents draft/escalate only, no leakage
across decision-lock, `ProofState.priced` typed `false`. North star: *GSE is the proof layer for
sports decisions — what was known, what changed, what deserved confidence, and what should have
been left alone.*

### 18.4 No-stale-data, enforced on real upstream age
The ingestion freshness gate was a tautology — it validated our *fetch clock*
(`new Date()`), never the upstream odds age, so a cached/stale board passed. `NormalizedOdds` now
carries the bookmaker's own `last_update`; `DataNormalizer.freshGameIds()` validates freshness
**per game** (a fresh game can't mask a stale one), `process-sport` drops stale games and fails
the job only on a fully dead feed. The "no stale data" non-negotiable is now enforced on real
data age. (`packages/data-ingestion/src/normalizer.ts`, `packages/ingestion-pipeline/src/process-sport.ts`.)

### 18.5 Adversarial bug-hunt — 8 real correctness bugs found and fixed
A 24-agent hunt across the 7 highest-stakes subsystems — each candidate required to survive **two
independent refutation attempts** — found 8 real bugs (incl. two in this session's own new work;
the self-audit lens worked). All fixed with regression tests:

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | **High** | Settlement graded SPREAD/TOTAL against the *drifted* `pick.line` — a published WIN at −3.5 could settle as a LOSS at a refreshed −7, contradicting its own CLV verdict | Grade against the frozen `clvLockLine` (`settle-sport.ts`) |
| 2 | **High** | Proof-of-record Merkle root + `totalSettled` silently capped at 500 while `/proof` claims "over ALL settled picks" — the oldest picks fell out of the committed denominator | Commit over the COMPLETE set (lightweight no-odds query, no cap) + true count; enrich only displayed rows (`load-proof-of-record.ts`) |
| 3 | **High** | Banned-phrase gate missed smart apostrophes/fancy hyphens — "can't lose" (U+2019) sailed through the only public-copy chokepoint | Unicode-normalize before matching (`trust-claims.ts`) |
| 4 | **High** | Upstream-freshness gate used a single global max (this session's own §18.4 fix) — a stale game passed if any book anywhere was fresh | Per-game freshness (`normalizer.ts`) |
| 5 | **High** | Out-of-order Stripe webhooks (delete then a delayed active snapshot) reactivated a cancelled subscription — premium re-granted for free | Terminal cancelled-by-delete rows are never resurrected; genuine resubscribes still sync (`webhooks/stripe/route.ts`) |
| 6 | **Medium** | `modelVsMarketPp` compared confidence to fair *home* prob for every pick (wrong for away/spread/total) | Moneyline-only, correct side, else null (`load-proof-of-record.ts`) |
| 7 | **High** | Decision-genome aperture ignored `evidence.rightsCleared` (this session's own spine) — an uncleared evidence snapshot could reach Signal | Quarantine terminally (`aperture.ts`) |
| 8 | **Low** | A banned-phrase doc-note claimed a temporal-idiom carve-out the library scanner never performs | Corrected the note to match the safe, conservative behavior |

### 18.6 Verification ledger (green gate)
typecheck (all workspaces, strict + `noUncheckedIndexedAccess`) · lint (`max-warnings=0`) ·
**~6,892 tests** (web ~6,165 + data-ingestion 111 + ingestion-pipeline 45 + prediction-engine 540
+ types 31) · keystone backtest reproduces 5.31 vs 4.91 · production build (exit 0, full route
table) · guardrails (trust-gate / model-freeze / draft-only / claude-api / secret-scan /
eval-contracts). Defense-in-depth hardening also landed this pass: `DEV_FAKE_ADMIN` is now
NODE_ENV-gated in all three spots; `.gitignore` ignores real `.env.*` (templates kept); the
Stripe webhook returns a generic signature error and acks an idempotency-race P2002 with 200; an
unmapped price-ID now alerts before failing closed to FREE.

### 18.7 Owner-gated remainder (config, not code)
Live Stripe Fantasy prices + secret key + webhook registration; confirm `PRICING_PHASE=FOUNDING`
and prod `NEXT_PUBLIC_APP_URL`; TikTok domain-verification file (privacy/terms pages exist).
Preview → production are owner-gated. Projections stay shadow until a backtest beats the baseline.
Documented follow-up: ~9 read-only intelligence boards still fetch nflverse directly and bypass
the merge-aware loader (doesn't bite until the 2025 season kicks off, Sept 2026). Full record:
`docs/ops/INTEGRATION_LAUNCH_2026-06-24.md` + `docs/ops/LAUNCH_BACKLOG_2026-06-24.md`.

### 18.8 Launch execution — branch → PR → preview (2026-06-25)
Taking the verified-green line from "green" to "live." The green gate was **re-verified from a
clean install** this session: typecheck (all workspaces) · lint (`max-warnings=0`) · **6,892
tests** (web 6,165 + data-ingestion 111 + ingestion-pipeline 45 + prediction-engine 541 + types
31) · keystone backtest **18,344 OOS, MAE 5.3087 vs naive 4.9064, beats naive = false,
priced = false** · build (exit 0, 194/194) · guardrails. *Env reproduction notes for the next
runner:* Prisma's engine downloader is reset by the egress proxy — fetch the `debian-openssl-3.0.x`
engines via `curl` and point Prisma at them; the gate needs `DATABASE_URL=stub` (the literal
sentinel `@sports/db` keys on, **not** a fake URL — a real-looking URL engages the live client and
two DB-integration tests fail).

**PR #53** `claude/stoic-dirac-20h11q → main` — the launch consolidation. CI green; **not merged**
(owner-gated for production). A **Vercel preview** auto-deploys via the GitHub integration; it sits
behind Vercel deployment-protection (SSO), so every path 302s to the auth wall — runtime smoke is
owner-only. Route code verified from source: `/api/decision-genome` returns **403 without ADMIN**;
checkout (`/api/subscriptions/checkout`) returns a clean **503** when Stripe is unconfigured.
**Phase 3 readiness** (`check-deploy-readiness.mjs`): 17 env vars + live Stripe remain owner-gated
(a session-local run can't see Vercel "Sensitive" secrets — authoritative check runs in the Vercel
build).

**Phase 5 backlog progress (one gate-green PR each, → the launch line):**
- **#2 secret-scan CI no-op → fixed (PR #54).** The §18.6 secret-scan gate scanned the *empty* git
  stage in CI (always passed on 0 files). Added an `--all` (full-tree, `git ls-files`) mode + a
  dedicated `secret-scan` CI job; the composite `guardrails` now scans `--all` too. Regression
  tests + a planted-key negative test. Scans 2,686 tracked files clean.
- **Codex review on #53 → 4 verified findings fixed (PR #55),** each with a regression test:
  *P1* — fantasy SSR pages (`/fantasy/lineup`, `/waivers`, `/trade`) served the **live pool
  ungated**, a server-side paywall gap (latent under shadow projections, live the moment
  `PROJECTIONS_PROVIDER` is on); now gated via `poolForViewer()` like draft/optimizer.
  *P1* — the settled-game heartbeat counted the PROOF stage **globally**, freezing `settledSamples`
  after the first game (stalling rung/projection unlocks); now per game.
  *P2* — `guard:nflverse-currency` ran an unpinned `tsx`; **`tsx` declared as a locked
  devDependency**, invoke the local binary.
  *P2* — the calibration-tournament eligibility threshold was defeated by `Math.min(1, …)` →
  `Math.max`.
- **#1 cache-policy wiring — DEFERRED (owner-confirmed).** Not the mechanical wire-up the backlog
  implied: the public proof pages are `force-dynamic` *by necessity* because the shared `<Nav>` is
  a server component that reads the session (`auth()`), so a page-level `revalidate` is void. The
  real fix caches the **data loaders** (`unstable_cache` with the policy's TTL + cache-tag) — a
  deliberate staleness/perf design pass, its own ticket.

Doctrine held throughout: no publish gate flipped, projections stay shadow, no secrets in code, no
force-push, `main` untouched (PR only). Production (merge → main + Vercel prod) remains gated on the
§18.7 owner config + preview approval.

---

## §19 The Frontier Institution — Meaning Compiler, Public Observer Ledger & Data Genesis Engine

> **Branch provenance.** Everything in §19 was built on the frontier branch
> `claude/keen-ptolemy-t38f1g` (≈90+ commits ahead of `main`; `main` untouched, no merge, no deploy).
> It is **additive, shadow/fixture-only, and CI-green per checkpoint.** Nothing here flips a publish
> gate, bumps `MODEL_VERSION` (frozen `v5.1.0`), touches the live scoring path, reads a key, hits a
> live/paid API, or scrapes a source. On fixture data every authority ceiling binds at `INFO_ONLY`.
> This section is the record of *what was built*; the code lives on the frontier branch, not yet on
> `research/proven-edge`.

### 19.0 The frame — from page factory to a compiler for meaning

The §18 line proved GSE could *launch*. §19 answers the deeper ask: make GSE **first-of-its-kind**, not
a better picks page. The throughline across three movements is a single shift of frame — **GSE does not
build pages; GSE governs meaning.** Every sports object becomes a typed claim that passes through one
law, and the institution's strongest statement is *"this cannot yet be shown,"* said precisely and
provably. Three new packages/lib-layers were added — the **Meaning Compiler** (a universal claim
grammar), the **Public Observer Ledger** (a sixth ledger for public-display truth), and the **Data
Genesis Engine** (a law layer for synthetic intelligence) — each with a machine-checked *conservation
theorem* in the lineage of the existing authority-tensor theorem.

### 19.1 The GSE Frontier Institution (N1–N9) — multi-sport decision-state surface

A proof-governed page factory where every match, **trend**, **bonus**, prediction, stat, and market
carries source status, rights status, authority status, freshness, decision-use, weakness, a receipt,
and an autopsy path. Category: *Sports Decision-State Infrastructure*; enemy: *fake certainty*. Proof
cases: **Ecuador 2–Germany 1** (soccer), **Rays 13–Royals 2** (MLB), **Roughriders–Argonauts** (CFL).
Built by **reuse** of the §18 engine (no parallel grammar). (`packages/decision-field-runtime/src/*`,
`packages/data-intelligence/src/*`, fixture-only Next routes under `apps/web/app/{matches,trends,bonuses,tools}/preview`.)

| # | Module | Brings | Status |
|---|---|---|---|
| N1 | `universal-event-genome.ts` + soccer/baseball/football-CFL adapters + `event-genome-fixtures.ts` + `match-derived-stats.ts` | multi-sport core (period schema, score state, status, fixture watermark); 20 soccer derived stats each with a reused passport | **R&D / FIXTURE** |
| N2 | `trend-passport.ts` | `TrendPassport` (sampleSize, fragility, overfitRisk, correlated-trends, knownAt, ceiling, falsifier) + `TrendTrial` | **R&D / FIXTURE** |
| N3 | `prediction-court.ts` | `PredictionTrial` — process ≠ outcome grading; one result never upgrades authority | **R&D / FIXTURE** |
| N4 | `data-intelligence/bonus-passport.ts` | `BonusPassport` + `BookmakerRatingPassport` (jurisdiction, rollover, lastVerifiedAt, legality, affiliate-config, RG disclaimer); no live affiliate link unless owner-configured | **R&D / FIXTURE** |
| N5 | `route-authority-registry.ts`, `market-bloom.ts` (9 stages), `authority-flight-record.ts`, `slip-mri.ts`, `watchlist-alerts.ts` | every route → an authority verdict; parlay = risk diagnosis, never "best parlay"; every alert has reason + proof | **R&D / FIXTURE** |
| N6 | offline `observatory/EVENT_GENOME_PAGE.html` (Chromium render-verified) + Next preview routes | the vertical slice — multi-sport tabs × inner faculties, fixture-watermarked, no live affiliate CTA | **FIXTURE** |
| N7 | `scripts/odds-plan.ts` + `odds:plan` + `data-intelligence/{source-value-score,data-cost-governor,odds-api-economics}.ts` | odds-credit intelligence (endpoint economics, modes, JSON; no network/keys; capped historical-prop) | **R&D** |
| N8 | `docs/{frontier-night,competitive,product,data-kingdom,launch}/*` | institution architecture + Scores24 business-machine teardown (12-system map) + product/data/brand/launch docs | **DOC** |
| N9 | `frontier-night/ADVERSARIAL_AUDIT.md` + `OVERNIGHT_OWNER_BRIEF.md` | skeptic audit ×2 + the 24+10 owner questions + verdict | **DOC** |

### 19.2 The Meaning Compiler — the Einstein frame (`packages/decision-field-runtime/src/meaning/*`)

The leap from modules to a **company-as-compiler**: every sports object — match/derived stat, trend,
prediction, odds price, market state, bonus, bookmaker rating, API provider, resource, web evidence,
alert, decision card — lifts into one typed **`ClaimObject`** (seven anatomical organs: source / rights
/ time / semantic / decision / authority / memory) and passes through one ordered, **downgrade-only**
pipeline: *raw observation → source passport → rights envelope → time envelope → semantic meaning →
decision effect → authority ceiling → public expression → autopsy hook → memory update.*

**The design law — No Parallel Systems.** The compiler owns **no** authority math, knowability math,
strength lattice, status lifecycle, or route vocabulary; it *composes* the canonical engines
(`composeAuthority`, `knowableAt`, `strengthMin`, `clampStatus`, `isForbidden`, `projectToLedgers`). The
keystone **Conservation Theorem** (`meaning/__tests__/meaning-conservation.theorem.test.ts`) proves all
eight laws — Authority, Lineage, Time/no-future-leakage, Rights, Fixture-ceiling, Evidence,
Monotonic-downgrade, and **No-Parallel-Systems** (every downgrade the compiler emits is reproducible by
re-invoking its named engine with the recorded inputs).

| Module | Role | Status |
|---|---|---|
| `meaning/claim-object.ts` | the 17-member `ObjectType`, the 7 envelopes, the lifecycle, `publicExpression` (computed meet, never assigned), `RightsEnvelope` defined in-package | **R&D / lib** |
| `meaning/meaning-compiler.ts` | `compileClaimObject` (the downgrade-only pipeline) + `explainClaim` (the 10-question core law) | **R&D / lib** |
| `meaning/morphology-adapters.ts` | the lossless lifts (stat/trend/prediction/odds/market/bonus/provider/web-evidence/alert/public-observer → ClaimObject) | **R&D / lib** |
| `meaning/meaning-lenses.ts` | eight Galileo lenses (Source Race · Market Lifecycle · Trend Fragility · Prediction Trial · Bonus Integrity · Web Evidence · Authority Flight Recorder · Autopsy Memory) — pure projections | **R&D / lib** |
| `meaning/page-factory-contract.ts` | `validatePageRender` composing the route-authority registry (render-time enforcement, no new enums) | **R&D / lib** |
| `apps/web/lib/meaning/rights-snapshot-to-envelope.ts` | the app→package rights-boundary adapter (the package never imports apps/web) | **LIB** |
| `apps/web/app/meaning/preview` + `components/meaning/meaning-preview-view.tsx` | instrument-grade dark `/meaning/preview` route (robots noindex, DB-free, INFO_ONLY-capped) | **FIXTURE** |
| `docs/gse-packet/observatory/MEANING_COMPILER.html` | cinematic offline observatory (Chromium render-verified; 0 offsite requests) | **FIXTURE** |
| `scripts/meaning-audit.ts` + `meaning:audit` | runnable 10-invariant integrity check — verdict **CLEAN** at 61 compiled objects, all INFO_ONLY, 1 visible refusal | **TOOL** |
| `docs/product/GSE_MEANING_COMPILER.md`, `docs/competitive/SCORES24_TO_GSE_INVARIANTS.md`, `docs/frontier-night/MEANING_INTEGRITY_AUDIT.md` | spec + competitor-invariant map + the 10-question audit (×2) | **DOC** |

### 19.3 Data Intelligence Mesh — Public Observer additions (`packages/data-intelligence/src/*`)

- **`serpapi-google-sports.ts`** — a no-network, no-key parser for the SerpApi Google Sports payload
  (spotlight / standings / athlete / kgmid / highlight extractors; query recipes capped at `WATCH`,
  `FIXTURE_ONLY`, owner-gated; deterministic cost model; allowed-use validator that forbids settlement /
  production-truth / betting-trigger). **R&D / FIXTURE.**
- **`entity-graph.ts`** — identity resolution on Google's `kgmid` (built atop `entity-spine`): the ladder
  `DISCOVERED → ALIAS_ONLY → CROSS_VERIFIED → CANONICAL` (+ `CONFLICTED`/`RETIRED`); a kgmid creates a
  candidate (confidence 0.4), aliases resolve **only** with sport/league context, ambiguity is refused,
  conflicts are flagged (never auto-merged), and only cross-verification reaches canonical. **R&D / lib.**
- **`public-observer-providers.ts`** — the **Provider Trial Court** verdicts, by *role* not just cost
  (≈21 providers). Machine-checked invariants: a public observer can never settle; a discovery-only
  source can never be LIVE; sportsbook execution APIs are `DO_NOT_USE_FOR_EXECUTION`; **no provider may
  execute**; every LIVE-capable provider must declare a fact-supply path. **R&D / governance.**

### 19.4 The Public Observer Ledger — the sixth ledger (Addendum III)

Next to the five ledgers (Reality, Belief, Decision, Authority, Learning), a **sixth** records exactly
one thing: **what dominant discovery systems SHOW the public** (Google's sports one-box, SERP snippets,
score widgets, standings one-boxes, knowledge-graph entities, highlight carousels). This is **public
DISPLAY truth** — never official truth, never settlement, never a price, never a trigger. SerpApi /
Google Sports is framed as **one observer in the Observer Arena**, alongside the official feed, the
market, and GSE. (`packages/decision-field-runtime/src/{public-observer-ledger,highlight-passport,public-consensus-lag}.ts`.)

| Sub-instrument | Role | Status |
|---|---|---|
| `public-observer-ledger.ts` | `PublicObserverRecord` (`canSettle:false`, `authorityImpact:PUBLIC_OBSERVER_ONLY`, ceiling `WATCH`; requires a capture time or it throws); `PUBLIC_OBSERVER_RIGHTS` = permission_required / derived-use-only / owner-approval-required; compiles to a `PUBLIC_OBSERVER_RESULT` ClaimObject capped at INFO_ONLY | **R&D / FIXTURE** |
| `public-consensus-lag.ts` | the **Chronos clock chain** (event → official source → market → public observer → GSE) and the lag family (`publicConsensusLag`, `publicScoreboardDelay`, …) — stamped `canImplyEdge:false`, `canCreateAction:false`; a missing clock is `null`, never a fabricated 0; + `googleVisibilityIndex` / `knowledgeGraphCoverage` / `serpSportsConfidence` | **R&D / FIXTURE** |
| `highlight-passport.ts` | rights-gated video highlight — gates closed by default; on `UNKNOWN` rights non-displayable / non-embeddable / non-reusable / non-public. **Discovery is never ownership.** | **R&D / FIXTURE** |
| `/meaning/preview?view=observers` | the Public Observer Arena panels (Chronos chain, visibility cards marked "can settle: never", the entity ladder built live from the fixture kgmids, rights-gated highlights) | **FIXTURE** |
| `docs/product/PUBLIC_OBSERVER_LEDGER.md`, `docs/data-kingdom/GSE_DATA_API_ROADMAP.md` | the sixth-ledger spec (7 machine-checked invariants) + a future read-only **meaning API** contract (no public API exists yet; envelope-complete, authority-capped, no bet/settle/price/execute endpoints) | **DOC** |

**The Sixth-Ledger Conservation Theorem** (`__tests__/public-observer-conservation.theorem.test.ts`, 17
proofs) shows the public observer lives under the *same* authority law with no escape hatch: T1
Containment (every record compiles to INFO_ONLY), T2 No-settlement (structural + via the guarantee), T3
Bounded ceiling (≤ WATCH), **T4 Keystone** (the cap the compiler records *is* `composeAuthority`'s meet —
the ledger composes the engine, never forks it), T5 Chronos inertia (across a clock sweep, lag can never
imply an edge or action), T6 lag-is-arithmetic, T7 visibility stats bounded + reproducible.

### 19.5 The Data Genesis Engine — the law layer for synthetic intelligence (`packages/data-genesis/`)

A new, dependency-light, lower-level package: **a generated / inferred / modeled / AI-assisted signal
may not become operational truth until it carries a receipt, structured doubt, meta-doubt, calibration
evidence where applicable, and passes one narrow promotion gate.** It makes the system *stricter, not
louder*. prediction-engine depends on data-genesis (never the reverse).

| Module | Role | Status |
|---|---|---|
| `brands.ts` | template-literal branded ids (`signal:`/`receipt:`/`doubt:`/`meta:`/`curve:`/`calibration:`/`promotion:`) + validators + prefixing constructors | **lib** |
| `canonical.ts` | stable sorted-key serialization (Date→ISO; rejects undefined/fn/symbol/bigint/non-finite, **non-plain objects** like Map/Set/class instances, and cycles) so receipt hashes never drift | **lib** |
| `receipt.ts` | `GenesisReceipt` with an **injected** hash fn (proof-of-record discipline); deterministic input/transformation/output hashing; `receiptIntegrity` flag | **lib** |
| `signal.ts` | `SyntheticSignal` ([0,1]-validated confidence/uncertainty, explicit `validationStatus`, **born draft, never born promoted**) | **lib** |
| `doubt.ts` / `meta-doubt.ts` | `StructuredDoubt` (licensing + model_leakage block by default unless mitigated; critical blocks until resolved) and **MetaDoubt** (the anti-fake-rigor layer: coverage score + overconfidence flag) | **lib** |
| `calibration.ts` | `CalibrationCurveResult` + Beta-Binomial posterior with an **exact** credible interval (regularized incomplete beta + bisection, not a normal approximation); small samples can never be "excellent" | **lib** |
| `promotion.ts` | `promoteSignal` — the **only** path to `PromotedSignal` (the single `as PromotedSignal` in the codebase); `Promotable` / `WithMetaDoubt` / `Calibrated` utilities; returns explicit failures, never half-promotes | **lib** |
| `prediction-engine/src/data-genesis-adapter.ts` | **shadow** wrappers for `EdgeAssessment` / `ClvGrade` / `reliabilityCurve` / `PickSignalSnapshot` → receipted signals (reuses prediction-engine's calibration math); exported from the barrel, **NOT wired into live scoring** | **R&D / SHADOW** |
| `docs/strategy/DATA_GENESIS_ENGINE.md` | the founder-grade spec (proof-bearing signal · promotion gate · calibration before influence · shadow until proven · future activation path, owner-gated) | **DOC** |

**The Genesis Promotion Conservation Theorem** (`__tests__/genesis-conservation.theorem.test.ts`, 16
proofs) runs an adversarial grid through `promoteSignal` and proves, for every input, that its verdict
and exact failure set equal an *independent* re-derivation of every gate — the keystone *one-door /
no-parallel-path* law (exercises all ten failure codes; confirms determinism + no-forgery). A **Da Vinci
quality pass** sharpened it: the exact Beta interval, the hardened canonical guard, and this theorem.

### 19.6 Verification ledger & doctrine held

- **Tests green per checkpoint** (run from each package dir, mirroring CI `--workspaces`):
  decision-field-runtime **280** · data-intelligence **90** · data-genesis **76** · prediction-engine
  **639** (incl. the new adapter suite). `meaning:audit` verdict **CLEAN** (61 objects, all INFO_ONLY).
- **Typecheck clean** for every new package (`tsc --noEmit` per package). The full `apps/web` typecheck
  is `ENVIRONMENT_BLOCKED` in-sandbox (Prisma client not generated) — pre-existing, resolves on CI.
- **Guardrails green:** trust-gate (1249 files, no banned phrases), model-freeze (`v5.1.0` unchanged),
  draft-only, claude-api-usage, secret-scan (3110 files), eval-contracts (34).
- **CI confirmed green** on the Addendum III + Sixth-Ledger-theorem commits; the Data Genesis commit's
  run was verified locally end-to-end (lockfile committed so `npm ci` resolves the new workspace).
- **Doctrine held throughout:** branch-only, `main` untouched, no merge/deploy/spend/secret-read, no
  live/paid API, no network in tests, the package never imports apps/web, fixture-watermarked
  (everything caps at INFO_ONLY), deterministic (no `Date.now`/`Math.random`/`new Date()`), no competing
  DecisionState/authority grammar (compose only), no Scores24 scrape/copy/derive, no Google scrape, no
  `priced=true`, no public-performance gate, no entitlement/trust/brand weakening, no
  lock/guarantee/sure-thing/risk-free language. **`MODEL_VERSION` not bumped; no public claim changed;
  no live pick behavior changed.**

> **Net.** Three conservation theorems now stand beside the original authority-tensor theorem
> (Meaning-Compiler · Sixth-Ledger · Genesis-Promotion), each proving a different organ of the
> institution cannot escape its own law. The frontier branch is the proof that GSE's category is not
> "better picks" but *governed meaning* — the data only ever means what its source, rights, time,
> authority, doubt, and calibration permit, and the system says so, out loud, with a receipt.

---

*Internal reference. Companion public document: `docs/GSE_PUBLIC_OVERVIEW.md`. Method implemented and drift-guarded in `packages/prediction-engine/src/{gse-method-spec,gse-score}.ts`.*
