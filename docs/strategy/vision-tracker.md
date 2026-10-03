# Galaxy Vision Tracker — every commitment, one ledger

Single accounting of everything the owner has directed across the
2026-06-12 session dumps (design references, analyst standard, NFL House,
data doctrine) plus the standing POLISH_BACKLOG. States: **DONE** (shipped +
tested), **QUEUED** (next build order), **OWNER** (needs an owner decision,
credential, or purchase), **STAGED** (gated on a prerequisite), **PARKED**
(deliberate no, recorded). Update this file in the same commit as the work.

## Analyst & math standard

| Commitment | State |
|---|---|
| Five analyst questions as law | DONE — `lib/voice/analyst-standard.ts`, test-pinned |
| Desk voice (no AI-marketing register) in generation prompts | DONE — pick explainer; Journal already voice-locked |
| Calibration over accuracy as law | DONE — pre-existing law, restated in doctrine |
| Probability calibrated before EV; timestamps + freshness on outputs | DONE — pre-existing engine law |
| No-vig implied probability engine | DONE — `market-read.ts` (Shin, consensus, disagreement, gravity) |
| Market disagreement surface | DONE (first mount) — Market Fair Board on /observatory |
| Model% vs market% on pick surfaces | STAGED — audit-drawer contract bans fair-prob/EV terms until owner lifts it |
| Uncertainty bands public ("when NOT to trust us") | DONE — Honest Band on /performance |
| Simulation cloud (distribution, not fake certainty) | DONE — TWO honest clouds: data-backed per-book no-vig P(home) dots on every fair-board game (MarketCloud; real samples, labeled zoom, never invented variance) PLUS an illustrative Poisson margin distribution on /observatory (SimulationCloud, scoring-event domain) |
| Parlay correlation | DONE — Parlay MRI now shows the **Dependency Coefficient** (bound-leg share, labeled structural-not-statistical) |
| Kelly/stake guidance | PARKED from public surfaces — Elite-gated educational only |

## Product modules (10 from the analyst dump)

Signal Card ✓ · Market Disagreement ✓ (fair board) · Driver Stack ✓ (factor
trail) · Fragility Check ✓ (premortem + formal 0–100 score, published weights,
all tiers in the audit drawer) · Parlay MRI ✓ ·
Simulation Cloud ✓ (data-backed fair board cloud + illustrative Poisson tool) · Calibration Panel ✓ + Honest Band ✓ · CLV Tracker ✓
· Human Explainer (3 registers) ✓ · No-Bet Gate ✓.

## NFL House (community/belonging)

| Commitment | State |
|---|---|
| /house hub — rooms as doorways, belonging-first | DONE + footer-linked |
| Reader registers (teach/plain/math) end-to-end | DONE |
| Doorway selector wiring registers site-wide | DONE (localStorage) |
| Fan-type field on user profile | FUNCTIONAL via localStorage (register follows the reader on every surface); ACCOUNT persistence OWNER-gated — PRIVACY DRAFT WRITTEN (`docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md`) awaits OWNER sign-off; schema migration ships after (see community-moderation-policy.md) |
| Primary-nav placement of /house | OWNER — funnel doctrine says few doors |
| Live rooms (Sunday Couch / Brotherhood / No-Shame) | STAGED — written policy DONE (`docs/legal/community-moderation-policy.md`); moderation tooling DONE (schema + ladder law + appeals + /cockpit/moderation queue, 49 tests; UI hooks land with rooms); privacy review DRAFTED (awaits OWNER); remaining gates: responsible-play wiring, moderator coverage plan, closed pilot |
| Weekly NFL ritual (Mon→Mon) | DONE — canonical `lib/house/weekly-ritual.ts` (beatsForDay API); /house rail reads it. Wiring the content scheduler to the cadence is a worker change — DEFERRED (needs content-pipeline owner pass) |
| Register on Academy content | DONE — all four Academy floors re-registered (teach/plain/math), shared `useReaderRegister` hook + doorway selector on the course floor, copy verified against real game mechanics, banned-phrase-tested |
| NFL-first focus | DONE — all new work NFL-first |

## Data doctrine & stat factory

| Commitment | State |
|---|---|
| Five stat questions publish gate | DONE (doctrine) — enforcement grows with each envelope |
| Stat commandment (source/timestamp/definition/n/weakness/decision-use) | CONTRACT LIVE — MetricTerm carries weakness + decision-use, renderer shows both, Production view fully enveloped and test-pinned; every stat shipped this session (stability, gravity, protection-stress, sim cloud) carries definition + formula + known-weakness; remaining views envelope incrementally (add slug to FULLY_ENVELOPED_VIEWS as each completes) |
| Stat Stability Grade | DONE — production/snaps/edge views |
| Line Death Clock | DONE — capture-window fair-price drift + pp/hr decay rate on the Market Fair Board, plus a per-pick clock in the evidence audit drawer (PRO+): movement since publish, toward/against, rate/h, book basis. Time-to-zero stays OWNER-gated — it needs an edge definition, banned on pick surfaces until the fair-prob gate lifts |
| Market Gravity Index (quantified) | DONE — `marketGravityIndex` (conviction × book agreement × coverage/liquidity), badge on the Market Fair Board; measures the market's CONVICTION, never whether it is right |
| Protection Stress index | DONE — Player Lab trenches (0–100, pressure+sacks). QB Pressure *Sensitivity* PARKED — needs clean-vs-pressured efficiency splits not in this feed |
| Script Elasticity / False Favorite / Narrative Risk / Public Comfort | PARKED until defensible math exists |
| DuckDB/Polars/Dagster/dbt/ClickHouse | OWNER — infra decision, current stack not the bottleneck |
| New data sources (nflverse ecosystem already live; CFBD, nba_api, pybaseball, StatsBomb, MoneyPuck...) | OWNER+legal — every source through the Scraping Clearance Engine / rights registry first; NFL-first says not now |

## Jarvis Intelligence Core

| Commitment | State |
|---|---|
| Jarvis Memory Protocol — Postgres episodic store, decision ledger, review queue, recall behavior | STAGE 1 DONE — schema (jarvis_memory_events + jarvis_decisions + enums) with migration SQL, 8-state machine + transition law, conservative conflict detection, sensitivity guards, 9 server actions (supersession trail transactional), live cockpit panel (wired/not-wired from real DB probe, never faked), 45 tests. OWNER: run prod migration + DATABASE_URL to flip it wired. Remaining stages: review-queue UI, Owner Brief + Model Council integration, recall-before-answer wiring |
| Jarvis Agent Council upgrade — 23 seats into departments, seat-vs-subagent law, authority tiers, routing rules, handoff + subagent ledgers, council UI | DONE (registry + governance) — all 23 seats with full charters (6 draft-only / 3 manual / 14 not-wired preserved exactly), ASCEND standing-subagent under PRISM with AUDIT review, 13 routing rules as testable data, 10 guardrails pinned, ledgers typed with honest not_connected posture (store lands with a later migration), department cards + seat cards in cockpit. Acceptance-criteria tests in `jarvis-agent-council.test.ts` |

## Owner polish backlog (standing)

1. Optimizer real-pool env keys — OWNER (Vercel env)
2. Players Lab stat polish — DONE (stamps + math spot-check + stability)
3. Galaxy Twin live-row deepening — DONE (Crosswire pass): twin nodes now carry "market moving" (drift ≥ shared DRIFT_MOVING_PP) and "books argued" (cloud spread ≥ WIDE_SPREAD_PP) states from real captured odds only; inspector chips + legend + HUD wired; absent data renders no signal
4. Number formatting unification — DONE
5. Film Room Higgsfield slate render — OWNER (credits spend)
6. Jeff Mans weekly-show feed rights evaluation — DONE — rights-registry entries (`jeff-mans-one-mans-opinion` vendor_candidate + `jeff-mans-weekly-show` manual_research_only), automation off; questionnaire at `docs/legal/VENDOR_QUESTIONNAIRE_JEFF_MANS.md`; unlock path: official endpoints → counsel review → direct permission; outreach is OWNER
7. ADMIN_EMAILS in Vercel — OWNER

## Visual/immersive (first dump)

Reference stack saved (`docs/design/galaxy-build-references.md`). The world
layer (WebGL nebula, slate twin, cinematic entrance, motion kit) predates
this session and is mature; doctrine forbids new visual dependencies.
Immersive systems from the dumps (odds movement trails, probability clouds,
dependency webs, fragility meters) map onto items above — each ships
only attached to real data, in the existing grammar. The StatKing surface
redesign (32 pages, premium component system) landed via the friendly-fermat
consolidation.

## Reconciliation addendum (2026-06-12 night sweep)

Full cross-reference of tracker vs specs, polish backlog, policy
checklists, and all strategy docs. **Zero DONE-claims failed artifact
verification.** Drift absorbed below.

### Shipped but previously untracked (now DONE on the ledger)

ELO independent estimator (`elo-estimator.ts`) · Monte Carlo
edge-significance (`edge-significance.ts`) · Poisson soccer estimator
(`poisson.ts`) · per-prediction provenance stamp (`provenance.ts`) ·
calibration-drift monitor (`calibration-drift.ts`) · openfootball
adapter (`openfootball-source.ts`) · ToS/disclaimer pages
(`/terms`, `/privacy`).

### Newly tracked QUEUED (committed in strategy docs, never built)

| Item | Source | Size |
|---|---|---|
| ML independent estimator scaffold (XGBoost-style) | repo-firehose-review #4 | L |
| Public consensus/proof-of-record surface (design pass) | repo-firehose-review #6 | M |
| `/accountability` public page (loss autopsies + model changelog, public) | platform-gaps-triage 1+2 | M |
| Sentry/OTel observability (HIGH in opportunity-ledger) | opportunity-ledger §I | M |

### Buildable queue — CLEARED 2026-06-13 (all DONE, reviewed, gated green)

1. Memory review-queue + hygiene UI (`/cockpit/memory`) — DONE
2. Recall-before-answer wiring in Ask Jarvis (3 transparency phrasings) — DONE
3. Owner Brief memory section — DONE
4. Memory hygiene views — DONE (in the review-queue page)
5. `createJarvisDecision` + `createDecisionWithMemory` (transactional) — DONE
6. `linkMemoryToAgentRun` (agent-run relation migrated) — DONE
7. Handoff + Subagent Run ledger stores + write paths (migration `20260613000000_council_ledgers`) — DONE
8. Distress-signal detection law (`lib/community/distress-signals.ts`) — DONE; room pipeline hook lands with rooms
9. Moderator coverage plan (`docs/ops/MODERATOR_COVERAGE_PLAN.md`) — DONE
10. ML estimator scaffold — DONE · Proof-of-record `/proof` — DONE · `/accountability` — DONE · Sentry/OTel observability — DONE
11. Listener-log batch lane (lawful manual SiriusXM lane, 60 takes/show) — DONE

Every adversarial-review finding from both passes (3 CRITICAL + multiple
MAJOR) fixed. Nothing buildable remains un-owner-gated.

### OWNER-gated (consolidated, unchanged by sweep)

Merge PR #17 + Vercel env keys (incl. ADMIN_EMAILS, optimizer keys) ·
prod migrations (memory + moderation tables) · privacy review sign-off
(unlocks fan-type schema + rooms) · fair-prob gate on pick surfaces ·
QB pressure-sensitivity math approval · /house primary-nav ·
Film Room credits · Jeff Mans outreach · infra/data-source decisions ·
B2B/affiliate/mobile motions · live in-game feed purchase ·
subscription pricing model (monthly ladder vs weekly proposal in PR #14).

## Consolidation (2026-06-13 — eloquent-goldberg launch line)

All shippable improvement streams merged onto `claude/eloquent-goldberg-der80z`:
- **StatKing + visual uplift** (friendly-fermat): 30 stub pages built into real
  data-backed surfaces, 32 pages rewritten on the premium component system,
  filters/SEO/admin-auth wired. Fast-forwarded onto the launch line.
- **PR #18 (wonderful-ptolemy)**: NFL House, analyst voice/reader registers,
  Market Gravity Index, Simulation Cloud (illustrative), Protection Stress,
  Line Death Clock pp/hr, Academy doorway, community moderation policy v1,
  Jeff Mans rights entry. Merged with semantic conflict resolution — the
  data-backed cloud was split out as `MarketCloud` so both clouds coexist;
  `marketGravityIndex` + `fairHomeProbsByBook` both kept in `market-read.ts`.

Final consolidated gate numbers are recorded in
`handoff/claude/gse-consolidation-2026/`.

## Verification state (prior baseline)

4,349 web tests · 392 engine tests (4,898 total across workspaces) ·
tsc clean · lint clean · `next build` exit 0 (130 pages, pre-StatKing).
Two adversarial code-review passes run over all agent-built code
(2026-06-12/13 night): every finding (3+1 CRITICAL + multiple MAJOR)
fixed and re-verified — typed guard errors, transactional supersession,
P2002/P2025 error contracts, SUSPEND time-box law, honest routing
terminals, GL culling, real Merkle leaf hashes, bounded recall,
candidate-only transparency note.

**Go-live note:** production deploy happens from the owner's main-branch
flow — merging this branch is the owner's call; nothing here auto-deploys.
