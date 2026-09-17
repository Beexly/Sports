---
modelVersion: v5.3.0
status: PROPOSED
date: 2026-09-13
author: motif
supersedes: v5.2.7
---

# CalibrationProposal — Beat desk, prop alignment, context matrix, calibrated confidence (v5.2.7 → v5.3.0)

## The gap

Three verified facts about the current engine:

1. **Displayed confidence is a heuristic market-echo composite, not a calibrated win probability.** `scoring.ts:551` sums consensus, depth, edge, movement, rest, form, quality, H2H, venue, uncertainty, cross-market, schedule stress, +10 base. The code documents calibration as founder-gated. The board ranks on `rankingP` (independent blend, 0.7 weight) while the public number is the heuristic. Two different truths on one card.
2. **Thresholds are static vibes.** 70 → Premium, grade bands on fixed confidence/edge cutoffs. None are fit to realized outcomes. A 70 today means whatever the heuristic felt like.
3. **Whole signal classes are missing.** Beat writers, reporter news, coach pressers, Reddit/team-sub sentiment: zero ingestion. Props: the DB has no prop market at all, so cross-market consistency is unchecked. Travel (beyond raw rest days), unit-level O-vs-D matchups, coaching/scheme clashes: not scored. The shadow-signal framework exists (`game_signals`, trust levels, `pick_signal_snapshots`) but the shadows are empty — injuries, officials, weather, milestones all sit at `BLOCKED_MISSING_SOURCE`.

This proposal closes all three gaps in one version bump.

## Decision

Ship **v5.3.0** as five interlocking moves:

1. **Calibrated confidence** — fit the factor vector to realized outcomes; displayed confidence becomes `round(calibrated_p × 100)`.
2. **Stronger thresholds** — Premium and grade bands re-fit from backtested CLV/ROI, and Premium becomes a conjunction (edge + beat agreement + prop alignment + data quality), not a single number.
3. **Beat desk** — ingest beat writers, reporters, coach pressers, Reddit into per-game beat vectors with source trust weights and freshness decay. Writes into the existing `game_signals` table.
4. **Prop alignment** — pull the day's props and team totals; check cross-market script consistency against every side/total pick. Aligned → boost, conflicted → penalty + human-review flag.
5. **Context matrix** — travel, rest differentials, unit-level O-vs-D matchups, coaching/scheme clashes become scored columns in the game×factor matrix with learned weights.

All three new layers run in **shadow first** (4–8 weeks, logged, scored against realizations) before they move the public number.

## Layer 1 — Calibrated confidence

**Target.** One number on the card that means what it says: a 70 wins ~70%.

**Method.**
- Training rows: every historical pick with a settled result. Features: the full factor vector already computed per pick (consensus, depth, edge, movement, rest, form, quality, H2H, venue, uncertainty, cross-market, schedule stress) **plus** the three new layers below.
- Model: regularized logistic regression first (glass-box; weights are inspectable and match the "show their work" brand), GBM as challenger. Output is a genuine probability by construction.
- `confidence = round(calibrated_p × 100)`. `rankingP` and `calibrated_p` converge to the same object — the two-truths problem ends.
- Fallback: when the calibrated model lacks coverage (new league, thin history), fall back to the current heuristic and mark the pick `isBootstrap`-style so the board can label it.

**What stays.** `factorBreakdown` keeps every component and weight — the public "why" doesn't change, only the number it rolls up to becomes honest.

## Layer 2 — Stronger thresholds

- **Refit from backtest.** Sweep candidate cutoffs over 2+ seasons of settled picks; pick the Premium cutoff at the point where marginal CLV and ROI turn durably positive. Same for grade bands: Elite/Strong/Solid/Lean become backtested win-rate buckets, not round numbers.
- **Premium becomes a conjunction.** `PREMIUM` requires ALL of: calibrated confidence ≥ cutoff, shrunk edge ≥ min_edge, beat-vector agreement (no unresolved negative beat flag), prop alignment ≥ neutral, dataQualityScore ≥ bar. One red light → Free, no matter how loud the model is. This is what "stronger threshold" means mechanically.
- **Grade bands** keep the two-input shape (confidence + edge) but on the calibrated inputs with refit cutoffs.

## Layer 3 — Beat desk

**Sources, tiered by trust:**
- T1 — Official: team PR, injury reports, coach press conferences (transcripts).
- T2 — Established beat writers, one or two per team, curated list.
- T3 — National reporters/aggregators (Schefter/RapSheet tier) for breaking news.
- T4 — Reddit team subs + fan sentiment (volume + polarity, never single posts).

**Pipeline per item:** ingest → classify (injury / lineup / scheme / motivation / weather / off-field) → entity-resolve to team/player/game → polarity × magnitude → freshness decay (half-life ~24–48h; injury news decays slower, motivational quotes faster) → source trust weight.

**Trust is earned, not assigned.** Every source starts at its tier prior; weights update on a rolling window by how that source's signals correlated with realized outcomes — a tipster leaderboard the engine maintains itself. A beat writer whose injury scoops keep predicting line moves and results gains weight automatically.

**Output:** per-game beat vector in `game_signals` (the table already exists with trust levels — this is its purpose): `injury_impact`, `lineup_news`, `scheme_notes`, `motivation`, each with weight, sources, timestamps. Unresolved high-magnitude negative items (e.g., starting QB downgraded Saturday) act as a **hold flag**: the pick still generates but cannot go Premium until resolved or game time.

**Shadow first.** The desk runs 4–8 weeks writing signals and *would-have* adjustments, scored against realizations, before any weight touches confidence.

## Layer 4 — Prop alignment

**New dependency:** a prop odds feed (player props + team totals). The DB has no prop market today — this layer needs a vendor decision (founder-gated).

**Mechanics.**
- Per game, pull the day's props. Derive the **prop-implied game script**: pace, pass-heaviness, scoring level (e.g., QB over passing yards + WR overs + high team total ⇒ shootout script).
- Every side/total pick implies a script too (an Over pick implies scoring; a home-favorite spread pick implies game control).
- **Alignment score** = similarity between the two scripts. Aligned → small confidence boost. Conflicted (engine on Under, props screaming shootout) → penalty **and** a review flag — conflicts are information, not just noise.
- **Team-total consistency** as its own signal: spread-implied team total vs market team total. Divergence is a cross-market edge the current engine never sees.

**Anti-circularity guard.** Props and sides often share a bookmaker consensus root. The alignment layer must use *independent* prop sources where possible and down-weight alignment when the prop board is just echoing the same steam as the side.

## Layer 5 — Context matrix

Each becomes a scored column; weights learned (Layer 1), not hand-set:

- **Travel:** miles, time zones crossed, altitude delta, road-trip game number. Sport-specific (NBA back-to-backs ≠ NFL short weeks ≠ MLB getaway days).
- **Rest:** replace the flat rest-days bonus with the rest *differential*, non-linear — 1 day is noise, 3+ is signal. Keep the existing `restDaysHome/Away` fields as inputs.
- **O-vs-D unit matchups:** unit grades (pass O vs pass D, run O vs run D, etc.), and the attack angle — does the offense's strength hit the defense's weakness? Cover-relevant, not just win-relevant.
- **Coaching/scheme:** head-to-head coaching ATS history, scheme-clash tags (e.g., zone-run vs light boxes), 4th-down aggressiveness (moves totals), coordinator-change early-season priors.
- **Schedule stress** already exists as a component — it gets the travel/rest columns as proper inputs instead of heuristics.

## The matrix — how it composes

Every game is a row. Columns: market factors (existing) + beat vector + prop alignment + context. The calibrated model (Layer 1) learns the weights and the important interactions (rest × altitude, injuries × spread size, etc.). New columns start at heuristic priors, graduate to learned weights with history. The `factorBreakdown` JSON stays the public glass box — every column shows its contribution.

## Rollout — direct to production (founder override 2026-09-13)

Founder killed the shadow period: "we're way too far behind." The layers ship directly behind `CALIBRATION_ADJUSTMENTS_ENABLED` (kill switch — one env change rolls back to the v5.2.7 heuristic). Backtesting on historical data still happens before anything ships. Weekly monitoring from launch: per-layer CLV, calibration drift, trust leaderboard, Premium slate size. The conjunction gate fails safe — its failure mode is fewer Premium picks, not bad ones.

## Engineering plan

- `packages/prediction-engine/src/scoring.ts` — add beat/context/prop components; add calibration module (`calibration/fit.ts`, `calibration/apply.ts`); keep heuristic as fallback.
- `packages/ingestion-pipeline/src/` — new `beat-desk/` ingestor (RSS/API/scrape → classify → resolve → `game_signals`); prop feed client; context column builders (travel/rest/units/coaching).
- `apps/web/app/api/cron/` — beat-desk refresh cron (15–30 min), prop pull cron (mornings + pregame).
- DB — `game_signals` (exists, use it); new `prop_snapshots` table (lines at pick time, mirrors `odds_line_snapshots`); `beat_items` staging table for raw ingested items before vectorization.
- `docs/` — backtest report per layer before promotion; this proposal is the first doc.

## Founder-gated decisions

1. **Beat source list** — which writers per team, Reddit API access (needs credentials), presser transcript source.
2. **Prop vendor** — which feed, cost, sports covered. Nothing in this proposal works without it.
3. **Public board flip** — calibrated confidence replaces the heuristic on the card (factorBreakdown stays as the "show your work" layer).
4. **Version/rollout** — v5.3.0 bump timing; whether the NFL Sunday board is the debut or it shadows through September.

## What this is NOT

- Not a model swap: Poisson/Dixon-Coles/Elo/Skellam independents stay; this is the layer that turns them *plus everything else* into one honest number.
- Not auto-publish expansion: `CALIBRATION_AUTO_PUBLISH` stays false; holds and conflicts route to human review.
- Not Reddit-as-oracle: T4 sentiment is the lowest tier, volume-gated, and can never single-handedly move a pick.

## Open questions / risks

- Prop feed cost and coverage may force a phased sports rollout (NFL first).
- Beat-writer licensing/scraping terms per outlet — prefer RSS/API, no ToS games.
- Early-season priors (new coordinators, rookie QBs) need shrinkage so small samples don't dominate learned weights.
- The conjunction gate will shrink the Premium slate — that is the point, but slate size should be monitored.
