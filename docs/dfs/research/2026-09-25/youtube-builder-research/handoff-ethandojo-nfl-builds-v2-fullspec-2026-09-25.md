# HANDOFF v2 — @ethandojo NFL builds → GSE engine (FULL SPEC)

Date: 2026-09-25. From: Motif. For: the coding agent.
Supersedes v1 (handoff-ethandojo-nfl-builds-2026-09-25.md) — v1 told you WHAT, this tells you exactly HOW.
Source: full Instagram profile sweep of @ethandojo (Ethan Do). No public repo of his exists — the recipe below is from his own videos, and every gap he left is specified here so no research is needed.

Repo investigated 2026-09-25. Everything under COMPOSE WITH already exists — use it, do not rebuild it.

---

## BUILD 1 — Game outcome predictor (his model, fully specified)

His words: NFLverse 2018–present, XGBoost, features = QB efficiency / explosive play rate / turnover margin / pass rush / point differential / player availability, adjusts for roster changes, 10,000 Monte Carlo sims. Posted 10-6 Wk1, 11-5 Wk2.

### Feature vector (all from nflverse play-by-play, which `packages/data-ingestion/src/nflverse-cache.ts` + `nflverse-source.ts` already ingest)

1. `qbEPA` — QB EPA per dropback, trailing 4 games (`epa` where `passer_player_id` = starter, `qb_dropback` = 1)
2. `explosiveRate` — share of offensive plays gaining 10+ yards rushing or 20+ yards passing, trailing 4 games
3. `turnoverMargin` — (takeaways − giveaways) per game, trailing 4 games
4. `passRush` — pressures per opponent dropback, trailing 4 games (fall back to sack rate if charting absent)
5. `pointDiff` — average scoring margin, trailing 4 games
6. `availability` — share of offensive snaps by projected starters (injury/inactive adjustment, 0–1)
7. `rosterCarryover` — returning-production share vs prior season (0–1); multiplies that team's prior-season features. This is his "accounting for roster changes."

All seven as differentials: (team value − opponent value). Label: 1 = team won.

### Method

1. New file `packages/prediction-engine/src/nfl/ethandojo-game-predictor.ts` (+ test). New files only.
2. Model: extend the GBM scaffold in `packages/prediction-engine/src/ml-estimator.ts` — it is the repo's XGBoost-concept port (additive stumps, logistic link) and already carries the honesty gates (min sample size, staleness, feature-schema hash, fail-closed nulls). Follow its `MlFeatureVector` contract pattern; do not invent a new ML framework.
3. Training: walk-forward. Train on 2018 through prior season, predict each week of the current season, refit weekly. Never train on the week being predicted.
4. Output per game: `{ winProb, projectedScoreHome, projectedScoreAway }`. Win prob comes from the GBM; projected scores from `expected-metrics/` scoring models already in the repo.
5. Season sim: 10,000 Monte Carlo season replications composing with the pattern in `packages/prediction-engine/src/nfl/parsimonious-season.ts` → output `{ projectedWins, playoffOdds }` per team.
6. Benchmark gate: log weekly record exactly like he does. His bar: 10-6 (62.5%) then 11-5 (68.8%). The module must beat a coin-flip baseline and match-or-beat his posted record before it is trusted.

### Test asserts

- Feature builder on a fixed nflverse fixture returns the 7 differentials hand-computed.
- `predictWinProb` returns null (not a guess) when any feature is null/non-finite — same fail-closed law as `ml-estimator.ts`.
- Walk-forward harness on two fixture seasons runs without label leakage (train weeks strictly before predict week).

---

## BUILD 2 — Highlight reel detector

His words: auto-detect TDs/INTs from crowd-noise spikes + commentary cues. His stack: Python/OpenCV/Whisper/FFmpeg.

### Spec

1. Python module in `gse-ml-service/app/models/highlight_detector.py` (his stack is Python; the vision/audio work lives here, not in TS).
2. Inputs: game broadcast video file (mp4).
3. Method: (a) extract audio with FFmpeg, compute short-time energy envelope — flag spikes > 3σ above the trailing-5-minute mean; (b) transcribe commentary with Whisper, flag cue phrases ("touchdown", "intercepted", "pick six", "end zone"); (c) a play counts as a highlight only when an audio spike and a cue phrase co-occur within a 15-second window.
4. Output: `[{ tStart, tEnd, type: "TD" | "INT", confidence }]` — clip boundaries with 5s padding each side.
5. TS wrapper `packages/prediction-engine/src/film/highlight-detector.ts` exposing `detectHighlights(videoRef)` → the output shape above. New files only.
6. Test asserts: on a synthetic audio fixture (spike + cue transcript), returns exactly the flagged windows; on flat audio, returns [].

Heavier lift — needs a film source. Specified so no research needed.

---

## BUILD 3 — Defensive coverage analyzer

His words: pre/post-snap alignment → coverage classification + team tendencies. His stack: Python/OpenCV/YOLOv8/PyTorch.

### Spec

1. Python module `gse-ml-service/app/models/coverage_classifier.py`.
2. Inputs: All-22 or broadcast frame sequence for a play (pre-snap frame + 1s post-snap).
3. Method: YOLOv8 player detection → derive safety depth, corner leverage, box count → rule-based classifier to {Cover 0, Cover 1, Cover 2, Cover 3, Cover 4/Quarters, Cover 6, Man} pre-snap AND post-snap (two labels per play — disguise = pre ≠ post).
4. Output per play: `{ preSnap, postSnap, disguised: boolean }`. Aggregate per team: coverage distribution + disguise rate + tendency by down/distance.
5. TS wrapper `packages/prediction-engine/src/film/coverage-analyzer.ts`. New files only.
6. Test asserts: fixture with deep safeties + off corners → Cover 3; single-high + press → Cover 1 Man; pre≠post → disguised=true.

Heavier lift — needs a film source. Specified so no research needed.

---

## BUILD 4 — Contract value analyzer

His words: production-per-dollar — who is worth their contract vs overpaid. His stack: Python/Pandas/Streamlit.

### Spec

1. New file `packages/prediction-engine/src/nfl/contract-value.ts` (+ test). Pure TS, no Streamlit — the engine doesn't do Streamlit.
2. Inputs: player season production + cap hit. Production metric: total EPA (from nflverse ingestion, already in-house). Cap hits: NEW ingestion adapter `packages/data-ingestion/src/overthecap-salaries.ts` — OverTheCap tables, player → cap hit. (No salary source is currently ingested; grep 2026-09-25 confirmed.)
3. Method: `valuePerDollar = totalEPA / capHitMillions`. Rank within position group; flag top-decile as surplus, bottom-decile as overpaid.
4. Output: `[{ player, position, totalEPA, capHitM, valuePerDollar, percentileVsPosition, flag }]`.
5. Test asserts: fixture with two same-position players, higher EPA-per-dollar ranks first; zero/negative cap hit → excluded, not ranked.

---

## BUILD 5 — 4th-down decision grader

His words: grade every 4th-down call (punt/FG/go) against analytical models. Compose — do not rebuild.

### Spec

1. New file `packages/prediction-engine/src/nfl/fourth-down-grader.ts` (+ test).
2. COMPOSE WITH (all exist): `packages/data-ingestion/src/fourth-down-playbook.ts` (optimal decisions), `packages/feature-store/src/metrics/fourth-down-grid-2309.ts` (break-even grid), `packages/prediction-engine/src/expected-metrics/win-probability.ts` (WP).
3. Method: for each actual 4th-down play, compute WP(go) − WP(actual call) using the repo's own WP model. Grade: A (optimal), B (within 1pp WP), C (1–3pp), D (>3pp). Aggregate per team/week: coaching aggressiveness grade. Cross-check against the existing `signals/situational/fourth-down-coaching-aggressiveness.ts` — the grader scores individual calls, that module scores tendencies; they are complements, not duplicates.
4. Output: `[{ gameId, playId, call, optimalCall, wpLost, grade }]` + team aggregates.
5. Test asserts: fixture 4th-and-2 at midfield going for it when playbook says go → grade A, wpLost ≈ 0; punting there → grade D, wpLost > 0.

---

## BUILD 6 — Fantasy trade analyzer

His words: sort players into buckets comparing overall value, disparity, matchup-adjusted performance, PPR-aware. His stack: Python/Pandas/Streamlit.

### Spec

1. New file `packages/prediction-engine/src/fantasy/trade-analyzer.ts` (+ test). Pure TS.
2. Inputs: rest-of-season projected fantasy points per player (engine projections), league settings `{ ppr: 0 | 0.5 | 1, rosterSlots }`, Team A gives [players], Team B gives [players].
3. Method: convert projections to settings-adjusted values; apply matchup adjustment (±% from opponent-defense vs position, existing defensive signals); bucket each player into tiers (elite/starter/flex/replaceable) by percentile; trade verdict = sign(sum B − sum A) with magnitude: fair (<5% gap), wins/loses (5–15%), fleece (>15%).
4. Output: `{ verdict, valueDeltaPct, tiersA, tiersB, explanation }`.
5. Test asserts: even swap → fair; star-for-two-flexes in PPR → computes without crashing and tiers are assigned.

---

## BUILD 7 — AI offensive coordinator

His words: train on opponent defensive personnel, alignment, tendencies → recommend formations and plays. His stack: Python/PyTorch.

### Spec

1. New file `packages/prediction-engine/src/nfl/offensive-coordinator.ts` (+ test). The recommendation function is TS; any LLM re-ranking is agent-layer, not this module.
2. Inputs: opponent defensive features per situation — personnel grouping, coverage distribution (from Build 3 when film exists; from charting/tendencies otherwise), blitz rate, box count vs run.
3. Method: for the current game state (down/distance/field position), score candidate plays by historical EPA/play of that play-type vs that defensive look (from nflverse, already ingested). Return top 3 with expected EPA and the defensive tendency each exploits.
4. Output: `[{ formation, playType, expectedEPA, exploits }]`.
5. Test asserts: vs a blitz-heavy look, top recommendation's expectedEPA > base rate; empty opponent data → returns null, not a guess.

---

## BUILD 8 — Game film splitter

His words: auto-cut raw footage into individual plays via player stillness + snap cadence, optional per-play processing. His stack: Python/PySceneDetect/OpenCV.

### Spec

1. Python module `gse-ml-service/app/models/film_splitter.py`.
2. Inputs: broadcast video file.
3. Method: (a) frame differencing — play boundaries at stillness→motion transitions (huddle breaks); (b) audio — snap-cadence energy burst confirms play start; a boundary requires motion onset within 2s of a cadence burst. Optional per-play hook: run Build 2/3 on each segment.
4. Output: `[{ playIndex, tStart, tEnd }]` (JSON sidecar).
5. TS wrapper `packages/prediction-engine/src/film/film-splitter.ts`. New files only.
6. Test asserts: synthetic fixture with 3 motion bursts + cadence markers → exactly 3 segments.

Heavier lift — needs a film source. Specified so no research needed.

---

## BUILD 9 — Opponent exploit finder

His words: film + data → statistical outliers and weaknesses, attackable areas. His stack: Python/Pandas/Streamlit.

### Spec

1. New file `packages/prediction-engine/src/nfl/exploit-finder.ts` (+ test). Pure TS, no Streamlit.
2. Inputs: opponent defensive EPA/play allowed split by situation — down, field zone, play type (run/pass), personnel, coverage shell (from nflverse, already ingested).
3. Method: for each split with n ≥ 30 plays, compute percentile vs league; flag bottom-15th-percentile splits as exploits, ranked by (plays faced × EPA allowed).
4. Output: `[{ situation, epaAllowed, percentile, playsFaced, attackWith }]` sorted by exploit score.
5. Test asserts: fixture where team allows 0.35 EPA/play vs play-action (n=60) → flagged #1 with attackWith="play-action".

---

## BUILD 10 — Draft copilot

His words (demo): conversational fantasy draft advisor — debated Achane vs Lamb at 1.09, took Jefferson at 2.11.

### Spec

1. COMPOSE WITH: `apps/web/components/fantasy/draft-assistant.tsx` already exists — the copilot is the agent/logic layer behind it, not a new UI.
2. New file `packages/prediction-engine/src/fantasy/draft-copilot.ts` (+ test).
3. Method: given `{ pickNumber, rosterSoFar, availablePlayers, adp, projections }`, recommend next pick by max (projected value − positional scarcity penalty + roster-need bonus). Expose `recommendPick()` returning `{ player, reasoning }` — reasoning is a short human-readable string (this is what the demo showed on screen).
4. Output per pick: `{ player, projectedPoints, tier, reasoning }`.
5. Test asserts: at 1.09 with both available, picks the higher value-minus-scarcity player and reasoning names both candidates.

---

## Standing rules (all builds)

- New files only. Never modify existing files or live code paths. No regression.
- Every module gets a test.
- Own branch, commit as you go.
- Log each finished item in `docs/research/2026-09-21/wiring/IMPLEMENTED.md` so nothing gets built twice.
- The repo's AGENTS.md governs everything else.

## Honest gaps (do not invent)

- His exact feature engineering, XGBoost hyperparameters, and training split are his and unknown — the spec above is a faithful implementation of his stated recipe, not a copy of his code.
- Film builds (2, 3, 8) need a game-film source the engine doesn't have yet — specified so they can be built the moment film is available.
- Salary data needs the new OverTheCap adapter (Build 4) — no salary source is currently ingested.
