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
| No-vig implied probability engine | DONE — `market-read.ts` (Shin, consensus, disagreement) |
| Market disagreement surface | DONE (first mount) — Market Fair Board on /observatory |
| Model% vs market% on pick surfaces | STAGED — audit-drawer contract bans fair-prob/EV terms until owner lifts it |
| Uncertainty bands public ("when NOT to trust us") | DONE — Honest Band on /performance |
| Simulation cloud (distribution, not fake certainty) | DONE — per-book no-vig P(home) dots on every fair-board game (real samples, labeled zoom, never invented variance) |
| Parlay correlation | DONE — Parlay MRI now shows the **Dependency Coefficient** (bound-leg share, labeled structural-not-statistical) |
| Kelly/stake guidance | PARKED from public surfaces — Elite-gated educational only |

## Product modules (10 from the analyst dump)

Signal Card ✓ · Market Disagreement ✓ (fair board) · Driver Stack ✓ (factor
trail) · Fragility Check ✓ (premortem + formal 0–100 score, published weights,
all tiers in the audit drawer) · Parlay MRI ✓ ·
Simulation Cloud ✓ (fair board) · Calibration Panel ✓ + Honest Band ✓ · CLV Tracker ✓
· Human Explainer (3 registers) ✓ · No-Bet Gate ✓.

## NFL House (community/belonging)

| Commitment | State |
|---|---|
| /house hub — rooms as doorways, belonging-first | DONE + footer-linked |
| Reader registers (teach/plain/math) end-to-end | DONE |
| Doorway selector wiring registers site-wide | DONE (localStorage) |
| Fan-type field on user profile (register follows account) | PRIVACY DRAFT WRITTEN — `docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md` awaits OWNER sign-off; schema migration ships after |
| Primary-nav placement of /house | OWNER — funnel doctrine says few doors |
| Live rooms (Sunday Couch / Brotherhood / No-Shame) | STAGED — written policy DONE; privacy review DRAFTED (awaits OWNER sign-off); remaining gates: moderation tooling, responsible-play wiring |
| Weekly NFL ritual (Mon→Mon) | DONE — canonical `lib/house/weekly-ritual.ts` (beatsForDay API); /house rail reads it, content jobs must too — one module, no drift |
| Register on Academy content | DONE — all four Academy floors re-registered (teach/plain/math), shared `useReaderRegister` hook extracted, copy verified against real game mechanics, banned-phrase-tested |
| NFL-first focus | DONE — all new work NFL-first |

## Data doctrine & stat factory

| Commitment | State |
|---|---|
| Five stat questions publish gate | DONE (doctrine) — enforcement grows with each envelope |
| Stat commandment (source/timestamp/definition/n/weakness/decision-use) | PARTIAL — freshness stamps ✓, explainers ✓, stability ✓; full envelope per metric QUEUED |
| Stat Stability Grade | DONE — production/snaps/edge views |
| Line Death Clock | DONE (price space) — per-pick clock in the evidence audit drawer (PRO+): market movement since publish, toward/against, rate/h, book basis. Time-to-zero stays OWNER-gated — it needs an edge definition, banned on pick surfaces until the fair-prob gate lifts |
| Market Gravity Index (quantified) | PROPOSAL WRITTEN — `docs/models/market-gravity-index-proposal.md` (convergence math on captured snapshots, null guards, weaknesses); OWNER approves math, then build |
| QB Pressure Sensitivity / Protection Stress indices | PROPOSAL WRITTEN — `docs/models/qb-pressure-indices-proposal.md` (EPA clean-vs-pressured split via FTN join; blitz-adjusted protection stress); OWNER approves math, then build |
| Script Elasticity / False Favorite / Narrative Risk / Public Comfort | PARKED until defensible math exists |
| DuckDB/Polars/Dagster/dbt/ClickHouse | OWNER — infra decision, current stack not the bottleneck |
| New data sources (nflverse ecosystem already live; CFBD, nba_api, pybaseball, StatsBomb, MoneyPuck...) | OWNER+legal — every source through the Scraping Clearance Engine / rights registry first; NFL-first says not now |

## Jarvis Intelligence Core

| Commitment | State |
|---|---|
| Jarvis Memory Protocol — Postgres episodic store, decision ledger, review queue, AI Ops panel, recall behavior | QUEUED (owner dump 2026-06-12, behind current queue per owner) — full spec at `docs/ai/jarvis/JARVIS_MEMORY_BUILD_SPEC_2026-06-12.md` |

## Owner polish backlog (standing)

1. Optimizer real-pool env keys — OWNER (Vercel env)
2. Players Lab stat polish — DONE (stamps + math spot-check + stability)
3. Galaxy Twin live-row deepening — partially shipped pre-session; further Crosswire pass QUEUED
4. Number formatting unification — DONE
5. Film Room Higgsfield slate render — OWNER (credits spend)
6. Jeff Mans weekly-show feed rights evaluation — DONE (`jeff-mans-one-mans-opinion` in rights registry, vendor_candidate, automation off; questionnaire at `docs/legal/VENDOR_QUESTIONNAIRE_JEFF_MANS.md`; outreach is OWNER)
7. ADMIN_EMAILS in Vercel — OWNER

## Visual/immersive (first dump)

Reference stack saved (`docs/design/galaxy-build-references.md`). The world
layer (WebGL nebula, slate twin, cinematic entrance, motion kit) predates
this session and is mature; doctrine forbids new visual dependencies.
Immersive systems from the dumps (odds movement trails, probability clouds,
dependency webs, fragility meters) map onto QUEUED items above — each ships
only attached to real data, in the existing grammar.

## Verification state (this session)

3,900+ web tests · 356 engine tests · tsc clean · lint clean ·
`next build` exit 0. Branch: `claude/laughing-thompson-x9xr6f` (supersedes
`claude/wonderful-ptolemy-qh7pnq` — fast-forwarded, all 13 commits carried).
**Go-live note:** production deploy happens from the owner's main-branch
flow — merging this branch is the owner's call; nothing here auto-deploys.
