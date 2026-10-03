# HANDOFF v3 — Video batch + sewer-dive model/data updates → GSE engine (FULL SPEC)

Date: 2026-09-25. From: Motif. For: the coding agent.
Sources (same folder on the bus):
- `sewer-dive-video-batch-2026-09-25.md` + `sewer-dive-video-batch-reverify-2026-09-25.md` (Garrett's 38 video/link batches, fully graded)
- `sewer-dive-new-builders-2026-09-25.md` (18 second-wave builders)
- `sewer-dive-datasets-apis-2026-09-25.md` (13 datasets, 13 APIs, pipelines)

How to use this document: METHODOLOGY specs, not code to copy. The engine learns from each source's approach and produces its own output. Direct adaptation is allowed ONLY where an MIT/Apache license is marked — with attribution in the file header. No research needed; every build has exact inputs, method, output shape, which existing files to compose with, and what the test asserts.

Numbering: V-series = video kernels, W-series = second-wave builders, D-series = data/API intake. Builds 1–15 (indie v2/v2b) and the 10 ethandjo builds are separate — check them before starting so nothing is built twice.

Non-overlap notes (checked against IMPLEMENTED.md Wave 3): `prereg-eval.ts`, `sealed-split.mjs`, `conditional-td.ts`, `hr-factors.ts`, `nfl-regime-change.ts` exist — the builds below COMPOSE with them, never re-implement them. V4 (replay engine) is complementary to sealed-split (split discipline); V4 is the live/replay execution path.

---

## PART A — VIDEO KERNELS

### BUILD V1 — Leakage anti-pattern test library (GreenCode, "I Trained AI to Predict Sports")

His finding: a public builder's sports classifier hit "insane 85% accuracy" from Elo-feature leakage, then he honestly retracted it on camera with corrected code. Kernel: the canonical leakage anti-patterns, encoded as executable probes.

### Spec

1. New file `packages/prediction-engine/src/eval/leakage-antipatterns.ts` (+ test). New files only.
2. Method — implement three leakage probes, each taking a feature-builder function and a fixture dataset and returning `{ leaked: boolean, detail: string }`:
   - **Future-Elo probe:** feed a fixture where a team's rating is computed with and without post-game information; the probe flags any feature whose value changes when future games are included.
   - **Current-week snap-share probe:** replicate TreMatt03's `test_snap_share_excludes_the_current_week` pattern — availability/snap features must be computable from weeks strictly before the target week.
   - **Sign-convention probe:** the urwishpatel2003 lesson from the sewer dive — a fixture with a known spread-sign bug that falsely produced 86% backtest accuracy; the probe asserts predicted sign matches the market's sign convention on the fixture.
3. Output: `{ probes: [{ name, leaked, detail }] }`; a `runAllProbes()` that fails loudly if any probe detects leakage.
4. COMPOSE WITH: `packages/prediction-engine/src/calibration/prereg-eval.ts` (run probes as a prereg gate), `apps/web/lib/.../sealed-split.mjs` (split discipline).
5. License: learn-only. No code of his exists to copy; the retraction is the lesson.

### Test asserts

- Fixture with future-Elo contamination → future-Elo probe returns `leaked: true`.
- Clean fixture → all probes return `leaked: false`.
- Sign-convention fixture with flipped spread → probe catches it.

---

### BUILD V2 — Seal-last-season holdout + null-classification ingestion standard (rugby model series Ep 2)

His validation protocol, stated explicitly: "seal off the last season... that's always gonna be our out of sample test element"; null-classification by league (Opta didn't collect a stat = missing, not zero — e.g. Pro D2 lacks stats); triple-verify every prompt/data pull; archive-don't-delete; handle promotion/relegation explicitly. Kernel: engine-wide ingestion standards.

### Spec

1. New file `packages/data-ingestion/src/holdout-discipline.ts` (+ test). New files only.
2. Method:
   - `sealLastSeason(games)`: splits a game list into train (all but the most recent complete season) and holdout (the most recent complete season). The holdout season is NEVER touched by feature selection, hyperparameter choice, or calibration — assert this by tracking a `sealed` flag on the dataset object that throws if a training function receives it.
   - `classifyNull(stat, leagueHasStat)`: returns `{ value, isNull }` — when a league/source does not collect a stat, the feature is null, never zero. Downstream aggregators must skip nulls (test: a league without the stat contributes zero weight, not a zero value).
   - Promotion/relegation handler: `mapTeamIdentity(teamId, season)` — when a team changes league/tier between seasons, its rating history is namespaced by (team, tier) so a promoted team's prior-tier stats don't pollute the new tier's baselines.
3. Output: `{ train, holdout, sealed }` from the splitter; `{ value, isNull }` from the null classifier.
4. COMPOSE WITH: existing nflverse/CFB ingestion loaders; `sealed-split.mjs` (this is the season-level sibling of that file-level discipline).
5. License: learn-only.

### Test asserts

- Splitter on a 5-season fixture: holdout = exactly the latest complete season; passing the holdout object to a mock trainer throws.
- Null classifier: missing-by-league stat → `isNull: true`; aggregator skips it (mean unchanged).
- Promotion fixture: team's tier-2 history does not enter tier-1 baseline.

---

### BUILD V3 — Broadcast-video movement primitive: optical-flow camera compensation + perspective transform (abdullahtarek)

His pipeline: YOLOv8 detection (players/referees/ball) + multi-frame trackers, custom YOLO fine-tuning, KMeans pixel-clustering team assignment, OPTICAL FLOW for camera-motion compensation, perspective transform to real-world meters, ball interpolation, per-player speed/distance. The NBA variant confirms the architecture cross-sport (court-keypoint detection → top-down tactical map). Kernel: the optical-flow + perspective-transform stack is the primitive for deriving NGS-like movement metrics from broadcast video — one of the most important long-term lanes for the site.

### Spec

1. New file `packages/prediction-engine/src/tracking/cv-movement-primitive.ts` (+ test). New files only. This build is the MATH + DATA CONTRACT foundation — not the detector (no YOLO weights in this repo).
2. Method:
   - `estimateCameraMotion(prevFrame, currFrame)`: interface + reference implementation of dense optical flow (Farneback) producing a per-pixel motion field; subtract the dominant global motion (RANSAC on the flow field) to get camera-compensated player displacements. Pure-TS reference on small fixture frames; document that production swaps in an OpenCV binding.
   - `perspectiveTransform(points, homography)`: 3×3 homography mapping image pixels → field meters. Include `fitHomographyFromYardlines(detectedYardlines)` — yard-line detections give known world coordinates (field is 120×53.3 yd); solve the homography by least squares.
   - `deriveMovementMetrics(tracklets)`: from camera-compensated, world-coordinate tracklets → per-player speed, distance, acceleration; ball interpolation across dropped frames.
   - Data contract (the deliverable the detector team / a future agent implements against): `Tracklet { id, team, frames: [{ t, xPx, yPx, xM, yM, speed }], role }`.
3. Output: `{ tracklets: Tracklet[], metrics: { playerId, distanceM, topSpeedMs, avgSpeedMs }[] }`.
4. COMPOSE WITH: nothing existing yet — this founds the tracking lane. Future: NGS ingestion (the site's #1 priority data source) for validation of derived metrics.
5. License: learn-only (his repo license unchecked — do NOT port his code; the spec above stands alone).

### Test asserts

- Homography fixture: known yard-line pixel coords → world coords within 0.5 yd.
- Camera-motion fixture: pure camera pan with static players → compensated displacements ≈ 0.
- Ball interpolation: 3 dropped frames → interpolated positions within tolerance of ground truth.

---

### BUILD V4 — Deterministic replay backtester: one engine path for live and replay (Edgerunner)

His architecture: deterministic low-latency prediction-market trading engine — live market data ingestion, fair-value estimation, fixed-point dislocation strategy vs venue L2 order book, inline risk gates, paper-trade execution, DETERMINISTIC REPLAY for historical backtesting (live and replay share one engine path), decision/trade journal, explicit inactive state without config — "never invents prices." Rust + Axum + React + WebSockets, built for a hackathon. Kernel: the sealed replay discipline for GSE's backtests.

### Spec

1. New file `packages/prediction-engine/src/backtest/deterministic-replay.ts` (+ test). New files only.
2. Method:
   - `ReplayEngine`: takes an event stream (timestamped market snapshots + game events) and a strategy function; the SAME strategy function is used for live evaluation and replay — enforced by a single `StrategyFn` type both paths accept.
   - Determinism: seeded RNG threaded through every stochastic draw; `replay(events, seed)` twice → byte-identical decision journal. Test asserts journal equality.
   - Decision journal: every decision logged as `{ t, state, decision, reason }` — the audit trail.
   - Explicit inactive state: the engine has `ACTIVE` / `INACTIVE_NO_CONFIG` states; without a valid config it sits in inactive and emits nothing — never a guess.
   - "Never invents prices": fail-closed market-data rule — if a market snapshot is missing for a timestamp, the engine skips the decision (logged as `SKIPPED_NO_MARKET`) rather than interpolating a price.
   - Inline risk gates: `maxExposure`, `killSwitch(reason)` — gates evaluated before every decision.
3. Output: `{ journal: Decision[], pnl, skipped }`.
4. COMPOSE WITH: `sealed-split.mjs` (data discipline), `prereg-eval.ts` (declare the backtest hypothesis before replaying).
5. License: learn-only.

### Test asserts

- Same events + seed twice → identical journals.
- Missing market snapshot → `SKIPPED_NO_MARKET`, no invented price.
- No config → engine stays inactive, zero decisions.
- Risk gate breach → killSwitch fires, journal records it.

---

### BUILD V5 — Model-output CSV contract for bakeoffs (8rain Station)

Their platform: define thesis → AI generates formatted model CSV → upload → +EV edges across 100+ sportsbooks. They PUBLISHED the upload spec (`upload-spec.txt`) — a ready-made model-output contract. Kernel: GSE's own model-submission/eval format, so every future model bakeoff speaks one schema.

### Spec

1. New files: `docs/research/2026-09-25/model-output-contract.md` (the contract doc) + `packages/prediction-engine/src/eval/model-submission-schema.ts` (+ test). New files only.
2. Method — define and validate the submission schema:
   - Required columns: `event_id, market, selection, probability, fair_price, model_id, generated_at`.
   - Thesis block: each submission carries `{ thesis, features_used, training_window, known_limitations }` — the honesty metadata.
   - Validator: rejects submissions with missing columns, probabilities outside (0,1), duplicate event_ids, or `generated_at` after the event start (anti-leakage timestamp rule).
   - Emit the canonical CSV writer so all GSE models output the identical format.
3. Output: validated `ModelSubmission` objects; CSV string on demand.
4. COMPOSE WITH: `prereg-eval.ts` (thesis block feeds the prereg declaration), V4's replay engine (submissions are replayable inputs).
5. License: learn-only — study their spec's SHAPE, write our own schema.

### Test asserts

- Valid submission → passes, CSV round-trips.
- `generated_at` after event start → rejected (leakage).
- Probability 1.2 → rejected; duplicate event_id → rejected.

---

### BUILD V6 — Generalized Poisson TD model + rare-event distributions + 12-game SOS ratings (Excel LADZ)

His full recipe (recovered from channel content): TeamRankings.com + Pro Football Reference data via Excel Power Query; 12-game trailing offensive/defensive ratings; prior-season Bayesian-style blending early in the season; strength-of-schedule adjustments; hypothesis-tested ~10% home-field advantage; GENERALIZED POISSON for touchdowns (TD counts under-dispersed vs Poisson); SEPARATE field-goal, safety, extra-point, and overtime treatment; 5,000 Monte Carlo sims per matchup. No public track record — educational framework, not a validated edge; the workbook is Patreon-gated, so we re-implement from the recovered recipe, never from his file.

### Spec

1. New file `packages/prediction-engine/src/nfl/generalized-poisson.ts` (+ test). New files only.
2. Method:
   - `trailingRatings(team, games, window=12)`: 12-game trailing offensive/defensive ratings, SOS-adjusted (opponent-strength weighted), with prior-season Bayesian blending: `rating = w * trailing + (1-w) * priorSeason`, where `w` ramps 0→1 over the first ~6 weeks.
   - `generalizedPoisson(k, theta, lambda)`: the GP distribution (handles under-dispersion, `lambda < 0`); fit per-team TD lambda from trailing offensive/defensive ratings.
   - Rare events as separate distributions: field goals (Poisson on attempts × make-rate), safeties (Bernoulli, tiny p), extra points (conditional on TDs), overtime (separate OT scoring model, not a continuation of regulation).
   - `simulateMatchup(home, away, n=5000)`: Monte Carlo over the TD/FG/safety/XP/OT components → score distribution → P(home win), P(spread cover), P(over).
   - Home-field: parameter, default from his hypothesis test (~10% scoring bump) but FIT on GSE's own backtest — don't hardcode his number blindly.
3. Output: `{ pHomeWin, pCover, pOver, scoreDist: { home, away }[] }`.
4. COMPOSE WITH: `nflverse-cache.ts` (data), V4 replay engine (sim outputs are replayable), existing Monte Carlo patterns in the repo.
5. License: learn-only — recipe re-implemented, never his workbook.

### Test asserts

- GP with negative lambda on a fixture: variance < mean (under-dispersion holds).
- Early-season fixture: rating blends prior season (w < 1); late-season: w ≈ 1.
- 5,000 sims: score frequencies stable across seeds within tolerance; safeties rare (< 2% of sims).

---

### BUILD V7 — Shot-feature → probability construction discipline (McKay Johns xG)

His recipe: working code-backed expected-goals model (soccer; shot features like distance/angle/play type, Python ML). Kernel: the shot-feature → probability construction discipline transfers to GSE's NFL metric building and backtest hygiene.

### Spec

1. New file `packages/prediction-engine/src/eval/feature-construction-recipe.ts` (+ test). New files only.
2. Method — a reusable recipe template for "situation features → probability" models:
   - `defineFeatureSpace(spec)`: declares the feature list with types and units (his pattern: distance, angle, play type — the NFL analog: down, distance, yardline, personnel, score differential).
   - `fitAndReport(X, y)`: fits the estimator, then emits the standard report — calibration curve bins, Brier, log-loss, and a FEATURE ABLATION table (drop-one-feature Δlog-loss) so every new metric ships with its own evidence.
   - Backtest-hygiene wrapper: chronological split only; asserts no future features via V1's probes.
3. Output: `{ model, report: { brier, logLoss, calibrationBins, ablation } }`.
4. COMPOSE WITH: V1 probes (hygiene), `ml-estimator.ts` (estimator scaffold), W3 ablation harness (shared ablation logic — import, don't duplicate).
5. License: learn-only.

### Test asserts

- Fixture: ablation table ranks the known-signal feature above noise features.
- Shuffled-time fixture → hygiene wrapper throws.

---

### BUILD V8 — Pro-bettor model-development process checklist (Rob Pizzola / Circles Off)

His content: a working pro walks through his first model step by step (2017–18 NHL; he notes it wouldn't work today). Kernel: the end-to-end PROCESS discipline of a working pro — process transfers across sports even though the model is stale.

### Spec

1. New file `docs/research/2026-09-25/model-process-checklist.md`. Doc-only build, no code.
2. Content: the ordered checklist — (1) define the beatable market + why it might be soft; (2) data inventory with provenance; (3) leakage review BEFORE first fit (run V1 probes); (4) preregister hypothesis/metric/threshold (prereg-eval.ts); (5) walk-forward validation vs closing line (W2 ritual); (6) honest-negative writeup if it fails (the joscho11/sjpagano discipline); (7) ship criteria: calibration gates (W1) + sealed holdout (V2) both green.
3. This checklist becomes the definition of "done" for every future model build in this handoff.

---

## PART B — SECOND-WAVE BUILDERS

### BUILD W1 — Calibration gates: Brier/log-loss/AUC/ECE with isotonic rejection (sjpagano)

His discipline: NFL win-probability model with a real held-out 2025 test — Brier .1613, log loss .4831, AUC .8459, ECE .0331 — and he TESTED isotonic calibration and REJECTED it when it worsened the holdout. Kernel: calibration is a gate with a reject path, not a ritual.

### Spec

1. New file `packages/prediction-engine/src/calibration/calibration-gates.ts` (+ test). New files only.
2. Method:
   - `computeMetrics(probs, outcomes)`: Brier, log-loss, AUC, ECE (10 bins).
   - `tryIsotonic(probs, outcomes, holdout)`: fits isotonic on train, evaluates on holdout; returns `{ applied: boolean, deltaBrier }` — applies ONLY if holdout Brier improves, otherwise returns the uncalibrated probs with `applied: false` and logs the rejection (his exact discipline).
   - Gate thresholds are config, not constants — his numbers (.1613 etc.) are reference points, not targets.
3. Output: `{ brier, logLoss, auc, ece, isotonicApplied }`.
4. COMPOSE WITH: existing calibration code in the repo (additive gate, not replacement).
5. License: learn-only.

### Test asserts

- Fixture where isotonic overfits → `applied: false`, original probs returned.
- Fixture where isotonic helps → `applied: true`, Brier improves.
- Perfect-probability fixture → Brier 0, ECE 0.

---

### BUILD W2 — Walk-forward validation vs the closing-market benchmark (benbr11/edgelabs)

His result: NFL winner model at 65.9% accuracy against an ~66% closing-market benchmark — model-vs-market parity demonstrated on paper, with walk-forward validation and committed model cards/reports. Kernel: the closing line is the honesty benchmark for every GSE model.

### Spec

1. New file `packages/prediction-engine/src/eval/closing-line-benchmark.ts` (+ test). New files only.
2. Method:
   - `walkForwardSeasons(predictFn, seasons)`: expanding-window walk-forward — train on seasons < t, predict season t, never peeking.
   - `vsClosingLine(predictions, closingLines)`: accuracy of model vs accuracy implied by the closing line (his ~66% reference); emits `{ modelAcc, closingAcc, edge }` per season and overall.
   - Model card emitter: writes the run's config, data window, metrics, and verdict to a markdown model card (his committed-reports discipline).
3. Output: `{ seasons: [{ season, modelAcc, closingAcc, edge }], overall, modelCard }`.
4. COMPOSE WITH: V2 holdout splitter (final season stays sealed — walk-forward runs on the unsealed portion), V5 submission schema (predictions in canonical form).
5. License: learn-only.

### Test asserts

- Fixture where the model = closing line → edge ≈ 0.
- Walk-forward on fixture: no season's training window includes its test season.
- Model card contains config + metrics + verdict.

---

### BUILD W3 — ATS ensemble with feature ablation + tier-kill rule (joscho11)

His work: NFL ATS ensemble over 4,300+ games, walk-forward with feature ablation — and he KILLED his own sparse "ULTRA" tier rather than overselling it. Kernel: ablation evidence + the discipline to drop what doesn't earn its place.

### Spec

1. New file `packages/prediction-engine/src/nfl/ats-ablation-harness.ts` (+ test). New files only.
2. Method:
   - `ablate(features, target, model)`: drop-one-feature walk-forward Δlog-loss table (shared logic with V7 — put the core in one place and import it in the other; V7 owns it, this file imports).
   - `tierKill(tiers, threshold)`: each model tier must beat the configured holdout threshold by a significance margin; tiers that don't are dropped with a logged reason (his ULTRA-tier kill, encoded).
   - ATS focus: predictions are against-the-spread probabilities, graded vs closing spreads.
3. Output: `{ ablation: [{ feature, deltaLogLoss }], survivingTiers, killedTiers: [{ tier, reason }] }`.
4. COMPOSE WITH: V7 (ablation core), W2 (walk-forward + closing-line grading).
5. License: learn-only.

### Test asserts

- Fixture: noise feature ablation Δ ≈ 0; signal feature Δ > 0.
- Tier below threshold → killed with reason logged; surviving tiers listed.

---

### BUILD W4 — Leakage-aware anytime-TD with EV odds integration (CHZN1, MIT)

MIT-licensed, leakage-aware anytime-TD probabilities with EV odds integration. One of the two strongest MIT models in the GitHub dive; ports directly into GSE's TD-prompt work.

### Spec

1. New file `packages/prediction-engine/src/props/anytime-td-mit.ts` (+ test). New files only.
2. Method — ADAPT his approach with attribution (MIT allows it):
   - Per-player anytime-TD probability from rolling role features (routes/target share/red-zone usage — learn the feature pattern, implement on nflverse).
   - Leakage guards: all features strictly pre-kickoff (assert with V1's probes).
   - EV integration: `ev = p * decimalOdds - 1`; emit edge only when EV exceeds threshold AND the W1 calibration gate passes for the TD probability.
   - Header attribution: `// Adapted from CHZN1/nfl-anytime-td-model (MIT) — methodology re-implemented for GSE.`
3. Output: `{ player, pAnytimeTd, fairOdds, ev }`.
4. COMPOSE WITH: `props/conditional-td.ts` (existing anytime-TD math — reconcile, don't duplicate), `props/quantile-prop-engine.ts` (v2 Build 3 — the quantile TD path), W1 gates, V1 probes.
5. License: **MIT — adaptation permitted with attribution.**

### Test asserts

- Post-kickoff feature in fixture → leakage probe fires, build refuses.
- EV math on fixture: known p and odds → exact EV.
- Attribution header present.

---

### BUILD W5 — Luck-neutralized EPA + deserve-to-win distributions (dgrifka, MIT)

MIT-licensed NFL simulator with "luck-neutralized" EPA and deserve-to-win distributions. Kernel: strip luck (fumbles recovered, tipped INTs, etc.) before rating teams.

### Spec

1. New file `packages/prediction-engine/src/nfl/luck-neutralized-epa.ts` (+ test). New files only.
2. Method — ADAPT with attribution (MIT):
   - `neutralize(play)`: adjusts EPA for high-variance luck events (fumble recovery randomness, tipped interceptions, missed FGs beyond expectation) — each adjustment is a documented, reversible transform, not a black box.
   - `deserveToWin(game)`: replays the game's play sequence with neutralized EPA → win-probability distribution → "deserve-to-win %" (his distribution concept).
   - Ratings built on neutralized EPA rather than raw EPA.
3. Output: `{ team, rawEpa, neutralizedEpa, deserveToWinPct }` per game.
4. COMPOSE WITH: `nflverse-cache.ts`, existing EPA features in the repo.
5. License: **MIT — adaptation permitted with attribution.**

### Test asserts

- Fixture game decided by a fluke fumble-recovery TD → neutralized EPA < raw EPA for the beneficiary.
- Deserve-to-win sums to 1.0 across both teams.
- Attribution header present.

---

### BUILD W6 — Event-driven win-probability replay (saahilmanekar/snapshift, MIT)

MIT-licensed, event-driven historical game replay with streamed win probabilities. Kernel: replay infrastructure for WP-model stress-testing (e.g., replaying 2025 blowouts through a candidate WP model).

### Spec

1. New file `packages/prediction-engine/src/backtest/wp-event-replay.ts` (+ test). New files only.
2. Method — ADAPT with attribution (MIT):
   - `replayGame(events, wpModel)`: feeds play-by-play events through a WP model function in chronological order, streaming `{ t, wp }` after each event.
   - Stress harness: `stressTest(wpModel, gameSet)` — runs a set of historical games (blowouts, comebacks, OT) and reports max WP error vs a reference, plus the worst single-game divergence.
   - Deterministic: same events → same stream (no RNG inside the replay path; the WP model owns its randomness via V4's seeded convention).
3. Output: `{ gameId, wpStream: [{ t, wp }], maxErr, worstGame }`.
4. COMPOSE WITH: V4 deterministic-replay (this is the WP-specific frontend to that engine — import its journal, don't rebuild it).
5. License: **MIT — adaptation permitted with attribution.**

### Test asserts

- Replay of a fixture game through a constant-0.5 WP model → stream is flat 0.5.
- Same game twice → identical streams.
- Attribution header present.

---

## PART C — DATA / API INTAKE

### BUILD D1 — PropLine intake: prop settlement, line history, Pinnacle-anchored no-vig lines

PropLine (`github.com/proplineapi/propline-mcp`, pushed 2026-09-21): prop settlement data, line history, and Pinnacle-anchored no-vig lines. The single best odds-data lead in the sewer dive.

### Spec

1. New file `packages/data-ingestion/src/propline-intake.ts` (+ test). New files only.
2. Method:
   - Client for the PropLine MCP/server surface: fetch prop lines + line history + no-vig fair lines per event/market/player.
   - As-of discipline: every line stored with `captured_at`; queries are as-of (never serve a future line for a past timestamp — V2's null-classification spirit).
   - Settlement: ingest graded results to close the loop for CLV/edge grading (feeds W2's closing-line benchmark).
3. Output: `{ eventId, market, player, lines: [{ ts, price, fairNoVig }], settled }`.
4. COMPOSE WITH: The Odds API ingestion (already live) — PropLine is additive, not a replacement.
5. License: n/a (data via their API; respect their terms).

### Test asserts

- As-of query for t → returns the latest line with captured_at ≤ t, never a later one.
- No-vig fair line present on the fixture; missing settlement → `settled: false`, not null.

---

### BUILD D2 — Forecast-vintage weather stack (Open-Meteo Previous Runs + NWS)

The leakage-safe weather stack: Open-Meteo Previous Runs gives historical forecast vintages (what the forecast SAID at the time), NWS for US operational forecasts. Kernel: weather features must be as-forecasted, never as-observed.

### Spec

1. New file `packages/data-ingestion/src/weather-vintage.ts` (+ test). New files only.
2. Method:
   - `getVintageForecast(lat, lon, gameTime)`: pulls the Open-Meteo Previous Runs vintage — the forecast issued ~24/48/72h before kickoff — for temp, wind, precipitation probability.
   - NWS fallback for US stadiums (`api.weather.gov`).
   - As-of rule: for a game at time T, only vintages issued before T−Xh are eligible; observed weather is NEVER a feature (only a label for forecast-error analysis).
3. Output: `{ gameId, vintageTs, tempF, windMph, precipProb, source }`.
4. COMPOSE WITH: existing weather usage in the repo (migrate callers to vintage-only; flag any observed-weather features as leakage via V1 probes).
5. License: n/a (free APIs).

### Test asserts

- Fixture: vintage issued after kickoff → rejected.
- Observed-weather value passed as a feature → V1-style probe flags it.

---

### BUILD D3 — Sleeper intake: free depth charts + injuries

Sleeper public API — free, no key: depth charts and injury designations.

### Spec

1. New file `packages/data-ingestion/src/sleeper-intake.ts` (+ test). New files only.
2. Method:
   - Pull depth charts + injury report per week; map to GSE team/player IDs.
   - Injury designations feed the availability weighting pattern (cf. v2 Build 1's snap-share weighting — same anti-leakage rule: designations as of the prediction time, never updated retroactively).
3. Output: `{ team, week, depthChart: [...], injuries: [{ player, designation, asOf }] }`.
4. COMPOSE WITH: v2 Build 1 (qb-player-tracking — availability inputs).
5. License: n/a (free public API).

### Test asserts

- Retroactively-updated designation in fixture → intake keeps the as-of version.
- Player ID mapping covers all 32 teams on the fixture.

---

### BUILD D4 — Scored CFB play-by-play intake (cfbfastR)

~2.2M scored CFB plays from 2004 via the sportsdataverse CFB pipeline — the college data foundation.

### Spec

1. New file `packages/data-ingestion/src/cfbfastr-intake.ts` (+ test). New files only.
2. Method:
   - Loader for the scored CFB PBP dataset (local cache pattern mirroring `nflverse-cache.ts`).
   - `asOf` filtering: plays queryable by game/week/season with the same sealed-split discipline as the NFL side.
   - Promotion/relegation-style handling for conference realignment (V2's `mapTeamIdentity` pattern — teams changing conferences get namespaced histories).
3. Output: cached PBP frames queryable by `{ season, week, team }`.
4. COMPOSE WITH: `nflverse-cache.ts` (mirror its interface), V2 (identity mapping).
5. License: n/a (open data).

### Test asserts

- Conference-realignment fixture: team's pre-move history namespaced.
- As-of query returns only plays before the cutoff.

---

## PART D — FOLLOW-UP QUEUE (not builds — research pulls)

These need a transcript/paper/artifact read before they become builds. Do NOT build on the video description alone.

1. **Radke papers** — David Radke (Blackhawks hockey strategy & analytics): LINHAC 2022 best paper on modeling passing lanes from NHL puck/player tracking data; IJCAI/AAMAS/RLC publications on MultiAgentRL, reward/value functions. Pull the papers — directly transferable to GSE's tracking-valuation lanes. (Source: reverify upgrade of `hiWQiTynYyU`.)
2. **nVenue model-vault interview** — Kelly Pracht (co-founder/CEO) describing a "model vault for players and teams" fusing historical + real-time live-game data into probabilities; "1B+ predictions" claimed (unverifiable). Get the transcript for the architecture. (Source: reverify upgrade of `vqOR6rPTyG8`.)
3. **AWS NFL agent GitHub link** — "Use Vector Search to Supercharge Your Agents" (TiDB + Titan + AgentCore over NFL data). Resolve `go.aws/3ZsWjqY` → assess the agent-over-NFL-data pattern. (Source: video batch FOLLOW-UP.)
4. **CUPPS thesis** — Alex Cupps's Calculated Upside Player Prospecting System (UC Riverside data-science master's thesis); won "So You Think You Can Tout." Interview had no math — find the thesis. Relevant to draft/DFS lanes. (Source: video batch FOLLOW-UP.)
5. **Rugby Ep 1 API** — the series' data came from an open free API discovered via Claude Research (5 req/sec). Watch Ep 1 to name it. (Source: video batch LEARN #2.)
6. **sharperedge.ai series** — "How to Build A Profitable Sports Betting Model With Ai [EPISODE 1]"; description gives zero methodology. Transcript/live watch to determine funnel vs method. (Source: reverify upgrade of `uMkm-GQa2KE`.)
7. **NRL Excel model** — "I Built an AI Sports Betting Model in 20 Minutes — $4,800 on NRL" (unverified); downloadable model files via Google Drive; free data source aussportsbetting.com/data. Inspect the value-bet mechanics. (Source: video batch FOLLOW-UP.)
8. **7 blocked videos** — `l5Y_aiohV0k`, `M6L3Gl2X7-M`, `rne3Xs16z6k`, `oi_D-TnzW4Y`, `DxfCH6-C4ZU`, `L23oIHZE14w`, `OUbxNLlC15w`, `7gtNErGOhjw`, `wabA1DtYUrM` — YouTube 429-throttled this VM twice. Need a live-browser watch pass. (Source: reverify.)

---

## STANDING RULES (all builds)

- New files only. Never modify existing files or live code paths. No regression.
- Every module gets a test.
- Own branch, commit as you go.
- Log each finished item in `docs/research/2026-09-21/wiring/IMPLEMENTED.md` so nothing gets built twice.
- V8's process checklist is the definition of "done" for every model build above: leakage probes (V1) → prereg → walk-forward vs closing line (W2) → calibration gates (W1) → sealed holdout (V2) → honest writeup.
- The repo's AGENTS.md governs everything else.
- Methodology is learned from and re-implemented as GSE's own output. Direct adaptation is allowed ONLY for the MIT-marked builds (W4: CHZN1, W5: dgrifka, W6: snapshift) — with attribution in the file header. Everything else: learn the idea, write our own implementation.
- Suggested build order: V1 → V2 → W1 → W2 → W4 → W5 → V6 → V4 → W6 → V3 → V5 → V7 → D1 → D2 → D3 → D4 → W3 → V8. (V1/V2/W1/W2 are the honesty foundation everything else stands on.)
