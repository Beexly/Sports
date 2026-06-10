# Vision 2026 — Prioritized Program & Build Queue

**Purpose.** This is the *sequencing layer* over the Vision 2026 research docs in this folder. It does not re-audit and it does not re-specify cards that already exist elsewhere — it orders the forward-looking moves into waves, names the single most important next move, and points each item at the queue or doc that holds its detail.

**Scope discipline.** Research/doc only. Nothing here flips a gate. Every money / publish / license / age-geo / MODEL_VERSION switch stays founder- or legal-gated. The posture is preserved throughout: trust-first, reveal-less on the recipe (weights / aggregation / Signal-layer existence never public), no real-money or chance gambling, responsible-gaming, compliance-as-code.

**Two clones (the master fact this program is built around).**
- **DEPLOY** = `C:/Users/Garrett/Sports` — the launch target. Leaner ~60-route conversion funnel, OLD design system (no surface tokens, no cinematic layer, ~1696 raw-neutral classes), no CLV, no failover, no observability backend, no Player Lab / Intelligence engines / differentiator experiences, static $19/$49 monthly-only pricing.
- **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` — the full ~115-route platform. A-grade tokenized design system + cinematic cold-open + data-viz kit, Player Lab, Intelligence engine browser, the full differentiator roster (Signal Courtroom, Decision Autopsy, Agent War Room, Parlay Genome, No-Bet Radar, Slate Twin, Proof-of-Record, Bias Mirror, Airwave, Cipher, The Beat, Academy, Human, GSN), department-heads cockpit + compliance program + monetization levers + the milestone-gated pricing ladder, AND the inert-but-wired CLV pipeline, OSS observability stack, and resilience toolkit.

The dominant forward lever is therefore **convergence**, not greenfield. The richest assets that build trust (CLV, observability, failover, the matured design system, the governance layer) all live on the clone we are **not** shipping. Wave 0 closes that gap; every later wave assumes it.

---

## How this dedupes against the existing queues

This program **references, never re-specs**, the following. Where a move maps to an existing card, the card id is named in the "Existing card / doc" column and in the `dependsOn` field of the JSONL. New program ids use the `V26-*` namespace so they never collide.

| Existing queue | Location | What it owns (don't duplicate) |
|---|---|---|
| **Operational launch gates** | `docs/command-center/build-queue/real-app-build-queue.jsonl` (P0-001..P1-007) | Prod DB + ingestion green, staged review, Player Lab scope, prod-probe, route polish, leakage scan, promotions gate |
| **Audit top-10 launch blockers** | `audit-2026-06-09/00-EXECUTIVE-SUMMARY.md:110-116` | DB/ingestion, cron-vs-freshness, migrate-in-build, pricing reconcile, DEV_FAKE_ADMIN guard, design-system port, failover |
| **Proprietary Rating + Airwave + Signal mesh** | `data-mesh/13-build-cards-...jsonl` (RAT-01..09, WIN-01..03, PRF-01..02, TIER-01..02, SLATE-01, RLS-01..02, SXM-01..07, BEAT-01, AGG-01..02, VAL-01) | The rating recipe, CLV capture/scoreboard, independent estimator, reliability curve, Signal lanes, Airwave port |
| **NFL world-model R&D** | `docs/research/claude-build-queue/` (BUILD-001..120) | Source license registry, entity graph, warehouse, feature store, eval harness, per-domain models & cards |
| **Vision 2026 research detail** | this folder: `visual-motion-2026.md`, `03-ai-native-intelligent-ux.md`, `03-data-and-analytics-stack-2026.md`, `20-growth-engagement-retention-monetization.md`, `30-integrations-and-ai-run-company.md` | The full spec/rationale/benchmarks behind each program item below |
| **Launch finish-line ops** | `docs/command-center/launch/` (13-20) | Readiness scorecard, one-person finish plan, monitoring/rollback, route copy audit, Player Lab cut/verify |

If a move below is **already a card**, this program's only contribution is **where it sits in the sequence and what it unblocks**. CLV (WIN-01/02) is the clearest example: it exists as a data-mesh card AND as a canonical-only pipeline AND as a vision-doc recommendation — the program's job is to say *port it to DEPLOY in Wave 1, because the public reliability/CLV proof is the trust spine the whole growth and pricing program depends on.*

---

## The single most important next move

### V26-000 — Pick ONE deploy tree and converge the clones (the unlock for everything)

Until this is decided, every other item either lands on the wrong clone or has to be built twice. The launch target (DEPLOY) is today a strict subset of CANONICAL on exactly the surfaces that build trust and conversion: design system, CLV, observability, failover, the differentiator roster, and the governance layer. No amount of 2026 polish matters if users see the un-converged clone.

**This is a founder decision, not an autonomous flip.** The recommendation, grounded in the audit and recon: **make DEPLOY inherit CANONICAL's matured layers** (design system + the inert-but-safe machinery), because DEPLOY already holds the genuinely-better launch-hardening (fail-closed truth contract `refresh-odds/route.ts:139-157`, the superset CI guardrails, `DEV_FAKE_ADMIN` production guard `d26c306`) that CANONICAL still lacks. Converge *toward DEPLOY as the trunk*, porting CANONICAL's matured surfaces into it — do not switch the deploy target to CANONICAL (it carries the masked-success bug and the unguarded admin flag).

Everything in Wave 0 below is the concrete content of this decision.

---

## The waves

### Wave 0 — Two-clones convergence (the unlock)
*Goal: the launch target inherits the matured platform without inheriting CANONICAL's regressions. Mostly safe-now ports of inert/no-op machinery; two founder decisions (deploy tree, pricing source of truth).*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| **V26-000** | Decide deploy tree + converge toward DEPLOY trunk | both | L | founder-gated | audit 00:115, 195-197 |
| V26-001 | Close the 4 operational launch blockers (DB+ingestion, cron-vs-freshness, migrate-in-build, prod-probe green) | deploy | M | founder-gated | real-app P0-001/004; audit 00:110-113 |
| V26-002 | Reconcile pricing + Stripe-wiring to ONE source of truth (CANONICAL `pricing-phases.ts`: Founding $14.99/$24.99 + annual + 4-var schema) before any Stripe price object | both | M | founder-gated | audit 00:113; growth-doc §D |
| V26-003 | Port the matured design system into DEPLOY (surface/paper/data tokens + Tailwind scale + cinematic-entrance + Reveal/Atmosphere + dataviz kit) | deploy | L | safe-now | audit 00:115; visual-motion-2026.md |
| V26-004 | Port the inert observability + product-analytics scaffold into DEPLOY (OTel/SigNoz init, PostHog provider, error sink + `global-error.tsx`) — no-op without keys | deploy | M | safe-now | data-and-analytics §Tier0; integrations §A |
| V26-005 | Port the CLV pipeline into DEPLOY (clv-capture, settle-sport CLV grading, `Pick.clv*` schema + migration) | deploy | M | safe-now | data-mesh WIN-01/02; data-analytics §Tier1 |
| V26-006 | Port the resilience toolkit into DEPLOY inert (odds-failover, source-health circuit breaker, source-registry + `assertIngestible`) | deploy | M | safe-now | data-mesh (source guard); audit 07 P0-2 |
| V26-007 | Port the governance layer into DEPLOY (department-heads cockpit, compliance-program, monetization-levers, mission-control) | deploy | M | safe-now | integrations §Part2; audit 05 |
| V26-008 | Port `DEV_FAKE_ADMIN` production guard INTO CANONICAL (the one regression flowing the other way) | canonical | S | safe-now | audit 00:114 |
| V26-009 | Fix the CI push-trigger SPOF so the launch branch actually runs guardrails | deploy | S | safe-now | audit 05 / 08 |

### Wave 1 — Activate the trust spine (intelligence + accuracy)
*Goal: turn the now-ported-but-inert machinery into live, provable trust. CLV proof, calibration depth, the de-circularized edge. Engine-input wire-ins stay founder-gated MODEL_VERSION steps; shadow-first is safe-now.*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| V26-101 | Publish the reliability curve as the public trust artifact (results, not method) | deploy | S | safe-now | data-mesh PRF-01 |
| V26-102 | Write real `currentEdgeIndex` + `GateDecision` rows; partition slate by quality tier (lead Elite/Strong) | deploy | M | founder-gated | data-mesh SLATE-01; audit 06 |
| V26-103 | Stand up the walk-forward / frozen-holdout validation harness | deploy | M | safe-now | data-mesh VAL-01; data-analytics §Tier1 |
| V26-104 | Activate the shadow independent estimator + de-circularize the edge (first non-market `fairProbability`) | deploy | L | founder-gated | data-mesh WIN-03; data-analytics §Tier3 keystone |
| V26-105 | Fix the rating calibration defects (null→0 percentile coercion, absolute Elite floor, shrinkage) | both | M | founder-gated | data-mesh RAT-05/06/07 |
| V26-106 | Add Brier resolution decomposition to the calibration engine | deploy | S | safe-now | data-analytics §Tier1 |

### Wave 2 — AI-native & adaptive surface (intelligence UX + creative/design)
*Goal: make the substance visible and interrogable. GSE is substance-ahead / surface-behind here — almost all safe-now because it exposes results + grounding, never the recipe.*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| V26-201 | Ambient "Ask the Edge" — route the existing Model Court engine onto board / pick / rating / front-door | both | M | safe-now | ai-native-ux §4.1 |
| V26-202 | Citation chips + suggested follow-ups (Perplexity-grade inspectability on already-enforced citations) | both | S | safe-now | ai-native-ux §4.2 |
| V26-203 | Generative UI inside answers (render factor bars / calibration curve inline; show breakdown, never weights) | both | M | founder-gated | ai-native-ux §4.3 |
| V26-204 | Confidence + honesty chips + public successful-fallback/refusal rate | both | S | safe-now | ai-native-ux §4.4 |
| V26-205 | Scroll choreography + editorial display moments (Lenis + CSS scroll-driven + the "Rating-assembly" scrollytelling) | deploy | M | safe-now | visual-motion-2026 Tier1 |
| V26-206 | Tokenize the cinematic cold-open hex; data-driven generative hero (illustrative scaffold) | deploy | S | safe-now | visual-motion-2026 (quick win) |
| V26-207 | Personalization / adaptive layout primitive (lens memory → adaptive nav/section-reorder) — the one 2026 trend with no foundation today | both | L | aspirational | recon §7; ai-native-ux §4.6 |

### Wave 3 — Data depth & resilience (data/analytics)
*Goal: move past 100%-odds-derived. Wire the marketing/analytics MCPs, stand up the read-only warehouse, then the founder-gated source expansion.*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| V26-301 | Wire a second odds provider + activate failover (odds-api.io secondary) | deploy | M | founder-gated | audit 07 P0-2; BUILD-031 |
| V26-302 | Read-only warehouse mirror so backtests never touch prod | deploy | L | aspirational | data-analytics §Tier2 |
| V26-303 | Connect marketing MCPs (Ahrefs / SimilarWeb / Supermetrics) → make the static competitor war-room live | both | S | founder-gated | data-analytics §Tier2; integrations §C |
| V26-304 | Activate nflverse injuries + EPA as scoring inputs (sequenced after V26-104) | deploy | L | founder-gated | BUILD-009/041/053; data-analytics §Tier3 |
| V26-305 | External uptime probe → `/api/ready` so the truth contract actually pages | deploy | S | safe-now | audit 11:118 |

### Wave 4 — Growth, engagement & monetization
*Goal: wire the ~70%-built-but-inert growth engine. Loop wiring, not new infra.*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| V26-401 | Port Beat the Model to DEPLOY + add identity/streak/leaderboard spine (measure reasoning, not wagering) | deploy | M | safe-now | growth-doc §A; BUILD-112 |
| V26-402 | Trigger the dormant Novu daily-digest workflows + promote Cipher/Brief into the daily cadence | both | S | founder-gated | growth-doc §A |
| V26-403 | Klaviyo lifecycle email program (welcome / upsell / winback tied to dunning grace) — specs safe-now, connect gated | both | M | founder-gated | growth-doc §B |
| V26-404 | Close the Dub referral loop with double-sided non-cash reward (+PRO days) + shareable season scorecard | both | M | founder-gated | growth-doc §C |
| V26-405 | Add annual plan + escalator to the launch tree; hold the proof-gated ladder as the anti-dark-pattern moat | both | S | founder-gated | growth-doc §D; audit 04 |
| V26-406 | Instrument the engagement loop (DAU/MAU, D1/D7/D30 by cohort, activation time) via PostHog/Amplitude | both | S | safe-now | growth-doc §B; data-analytics §Tier0 |

### Wave 5 — Departments / AI-run-company maturity
*Goal: turn the governance layer from read-time-only into measured + auditable.*

| id | Move | Clone | Effort | Gating | Existing card / doc |
|---|---|---|---|---|---|
| V26-501 | Persist the approval-queue as an audit ledger (turns "human-gated" into "auditable") | both | M | safe-now | integrations §Part2 |
| V26-502 | Instrument the department heads (Stripe→Growth, freshness→Data, Formbricks→Support) so metrics are measured not modeled | both | M | founder-gated | integrations §B |
| V26-503 | Langfuse on every Claude call (cost + LLM-as-judge evals) + fix the hard-coded Sonnet token-price (undercounts Opus 4.8) | both | S | safe-now | integrations §D; audit 04 F2 |
| V26-504 | Airwave port into DEPLOY inert (accountability-weighted Signal moat) — capture stays legal-gated | deploy | M | legal-gated | data-mesh SXM-01..07 |
| V26-505 | Tiered-autonomy ladder (AUTO/NOTIFY/APPROVE); regulated triggers never leave APPROVE | both | M | aspirational | integrations §Part2 |

---

## Gating ledger (honest tagging)

- **safe-now** (port inert machinery, expose results/grounding, instrument, build specs): V26-003/004/005/006/007/008/009, 101, 103, 106, 201, 202, 204, 205, 206, 305, 401, 406, 501, 503.
- **founder-gated** (keys/$, MODEL_VERSION bump, pricing numbers, deploy decision, enabling a lever): V26-000, 001, 002, 102, 104, 105, 203, 301, 303, 304, 402, 403, 404, 405, 502.
- **legal-gated** (license / capture / regulated copy): V26-504.
- **aspirational** (net-new foundation, post-launch): V26-207, 302, 505.

## Guardrails carried into every item
Reveal-less recipe (weights/aggregation/Signal-layer never public); refusals first-class; numeric-guard on every generated claim; cost-governed AI; no real-money/chance gambling and no betting instruction; responsible-gaming copy resolved (the 1-800-GAMBLER vs 1-800-522-4700 inconsistency must be fixed before any regulated email/push ships); every regulated trigger stays human-gated.

---

*Companion machine-readable queue: `03-program-build-queue.jsonl` (one object per line).*
