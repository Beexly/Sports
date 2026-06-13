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
| Simulation cloud (distribution, not fake certainty) | DONE — illustrative Poisson margin distribution on /observatory (scoring-event domain) |
| Parlay correlation | DONE — Parlay MRI; "Dependency" coefficient named in the vitals UI (2026-06-12) |
| Kelly/stake guidance | PARKED from public surfaces — Elite-gated educational only |

## Product modules (10 from the analyst dump)

Signal Card ✓ · Market Disagreement ✓ (fair board) · Driver Stack ✓ (factor
trail) · Fragility Check ✓ (premortem layer; a formal numeric score touches
gated pick surfaces — DEFERRED to the model-vs-market un-gate decision) · Parlay MRI ✓ ·
Simulation Cloud ✓ · Calibration Panel ✓ + Honest Band ✓ · CLV Tracker ✓
· Human Explainer (3 registers) ✓ · No-Bet Gate ✓.

## NFL House (community/belonging)

| Commitment | State |
|---|---|
| /house hub — rooms as doorways, belonging-first | DONE + footer-linked |
| Reader registers (teach/plain/math) end-to-end | DONE |
| Doorway selector wiring registers site-wide | DONE (localStorage) |
| Fan-type field on user profile | FUNCTIONAL via localStorage (register follows the reader on every surface); ACCOUNT persistence OWNER-gated — needs schema migration + privacy sign-off (see community-moderation-policy.md) |
| Primary-nav placement of /house | OWNER — funnel doctrine says few doors |
| Live rooms (Sunday Couch / Brotherhood / No-Shame) | STAGED — moderation policy v1 WRITTEN (docs/legal/community-moderation-policy.md); now blocked on: cockpit moderation queue, privacy sign-off, closed pilot |
| Weekly NFL ritual (Mon→Mon) | DONE as doctrine + /house rail; wiring the content scheduler to the cadence is a worker change — DEFERRED (needs content-pipeline owner pass) |
| Register on Academy content | DONE — doorway selector on the Academy course floor (lessons are static curriculum; the register drives generated explanations site-wide) |
| NFL-first focus | DONE — all new work NFL-first |

## Data doctrine & stat factory

| Commitment | State |
|---|---|
| Five stat questions publish gate | DONE (doctrine) — enforcement grows with each envelope |
| Stat commandment (source/timestamp/definition/n/weakness/decision-use) | DONE as PROCESS — every stat shipped this session (stability, gravity, protection-stress, sim cloud) carries definition + formula + known-weakness; enforced per new metric, not a one-time deliverable |
| Stat Stability Grade | DONE — production/snaps/edge views |
| Line Death Clock | DONE — capture-window drift + pp/hr decay rate on the Market Fair Board |
| Market Gravity Index (quantified) | DONE — `marketGravityIndex` (conviction × agreement × liquidity), badge on Market Fair Board (2026-06-12) |
| Protection Stress index | DONE — Player Lab trenches (0–100, pressure+sacks). QB Pressure *Sensitivity* PARKED — needs clean-vs-pressured efficiency splits not in this feed |
| Script Elasticity / False Favorite / Narrative Risk / Public Comfort | PARKED until defensible math exists |
| DuckDB/Polars/Dagster/dbt/ClickHouse | OWNER — infra decision, current stack not the bottleneck |
| New data sources (nflverse ecosystem already live; CFBD, nba_api, pybaseball, StatsBomb, MoneyPuck...) | OWNER+legal — every source through the Scraping Clearance Engine / rights registry first; NFL-first says not now |

## Owner polish backlog (standing)

1. Optimizer real-pool env keys — OWNER (Vercel env)
2. Players Lab stat polish — DONE (stamps + math spot-check + stability)
3. Galaxy Twin live-row deepening — twin carries live board posture (shipped); further Crosswire animation pass is polish, not blocking — DEFERRED
4. Number formatting unification — DONE
5. Film Room Higgsfield slate render — OWNER (credits spend)
6. Jeff Mans weekly-show feed rights evaluation — DONE (registry entry `jeff-mans-weekly-show`, manual_research_only; unlock path: official endpoints → counsel review → direct permission)
7. ADMIN_EMAILS in Vercel — OWNER

## Visual/immersive (first dump)

Reference stack saved (`docs/design/galaxy-build-references.md`). The world
layer (WebGL nebula, slate twin, cinematic entrance, motion kit) predates
this session and is mature; doctrine forbids new visual dependencies.
Immersive systems from the dumps (odds movement trails, probability clouds,
dependency webs, fragility meters) map onto QUEUED items above — each ships
only attached to real data, in the existing grammar.

## Verification state (this session)

3,939+ web tests · 360 engine tests · tsc clean · lint clean ·
`next build` exit 0. Branch: `claude/wonderful-ptolemy-qh7pnq`.
**Go-live note:** production deploy happens from the owner's main-branch
flow — merging this branch is the owner's call; nothing here auto-deploys.
