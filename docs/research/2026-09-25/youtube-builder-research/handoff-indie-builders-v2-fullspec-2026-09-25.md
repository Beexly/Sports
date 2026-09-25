# HANDOFF v2 — Indie model-builder kernels → GSE engine (FULL SPEC)

Date: 2026-09-25. From: Motif. For: the coding agent.
Source: indie-model-builders-dossier-2026-09-25.md (same folder) — 4-source sweep, 24 candidates, 6 ranked Tier 1.

How to use this document: these are METHODOLOGY specs. The engine learns from each builder's approach and produces its own output — nothing is copied except where an MIT license explicitly allows it (Build 1 only, with attribution). No research is needed; every build below has exact inputs, method, output shape, which existing files to compose with, and what the test asserts.

---

## BUILD 1 — Per-player QB tracking + snap-share injury weighting (TreMatt03, MIT — code liftable with attribution)

His finding: team efficiency stats add nothing on top of Elo (0.632 vs 0.632 — don't waste feature work there). Rating passers INDIVIDUALLY — EPA per dropback tracked per player so it follows a trade or midseason takeover — was the single largest improvement: log loss 0.633→0.625, AUC 0.690→0.700. Injury absence weighting uses prior-games snap share with an anti-leakage test excluding the current week. Walk-forward 3,816 games 2012–2025: 65.2% acc, Brier 0.216.

### Spec

1. New file `packages/prediction-engine/src/nfl/qb-player-tracking.ts` (+ test). New files only.
2. Inputs: nflverse play-by-play (already ingested via `packages/data-ingestion/src/nflverse-cache.ts`).
3. Method:
   - Build per-QB rolling EPA/dropback keyed by `passer_player_id`, NOT by team — when a QB changes teams or takes over midseason, the rating follows the player. 16-game rolling window crossing seasons.
   - Availability weight: each QB's prior-games snap share (weeks strictly before the current week — the anti-leakage rule; his repo has `test_snap_share_excludes_the_current_week`, replicate that test).
   - Feed the per-player QB rating as a feature into the GBM scaffold in `packages/prediction-engine/src/ml-estimator.ts` (extend its feature contract; follow the existing honesty gates).
4. Output: `{ qbId, rollingEpaPerDropback, snapShare, effectiveQbRating }` per game-team.
5. COMPOSE WITH: `ml-estimator.ts` (feature contract + gates), `nflverse-cache.ts` (data).
6. His repo (MIT, may reference for detail but the spec above stands alone): https://github.com/TreMatt03/nfl-game-predictor — attribute if any code is adapted.

### Test asserts

- Fixture where a QB is traded midseason: his rating follows him to the new team, the old team's rating resets to the replacement.
- Snap-share computation on a fixture excludes the current week's snaps (anti-leakage).
- Null/non-finite QB data → null output, not a guess (same fail-closed law as `ml-estimator.ts`).

---

## BUILD 2 — Kalman team ratings + heteroscedastic ensemble + variance recalibration (howlscastle97, learn-only)

His architecture: (1) leakage-safe chronological features on nflverse — EWMA point differential, EPA aggregates, QB familiarity = share of last 16 starts by today's listed starter, rest, division, indoor; (2) JOINT Kalman filter over 32 team ratings + home-field, hyperparameters tuned by one-step predictive log-likelihood on seasons ≤2023; (3) deep ensemble of 5 heteroscedastic MLPs (mu + sigma heads) on beta-NLL (beta=0.5), variance recalibration scale 1.039; (4) weekly-refit walk-forward from 2021; (5) "square-3 rule": big model-market disagreements are treated as the model missing news, not free money. He publishes null results with reasoning.

### Spec

1. New file `packages/prediction-engine/src/nfl/kalman-team-ratings.ts` (+ test). New files only.
2. Method:
   - Kalman filter: state = 32 team strengths + home-field advantage; weekly update on game margins; hyperparameters (process/measurement noise) chosen by maximizing one-step-ahead predictive log-likelihood on pre-2024 seasons.
   - Features per game (all chronological, never peeking): EWMA point differential, EPA aggregates, `qbFamiliarity` = share of last 16 starts by the listed starter, rest differential, division flag, indoor flag.
   - Uncertainty: ensemble variance head with recalibration multiplier (pattern: his 1.039 — fit GSE's own constant on backtest, don't copy his number blindly).
   - Adopt the square-3 rule as a logged flag: when |model − market| exceeds threshold, emit `missingNewsSuspected: true` instead of an edge.
3. Output: `{ teamRatings: Record<team, number>, homeField, predictedMargin, sigma }` per game.
4. COMPOSE WITH: `packages/feature-store/src/metrics/tuned-elo-2403.ts` and `glicko2-modified-2310.ts` (rating-pattern neighbors — Kalman is additive, not a replacement), `nflverse-cache.ts`.

### Test asserts

- On a fixture season, ratings converge and one-step predictive log-likelihood beats a static-rating baseline.
- Feature builder on a fixture: `qbFamiliarity` for a first-time starter = 0; EWMA uses only prior weeks.
- Square-3 flag fires on a fixture with a 10-point model-market gap.

---

## BUILD 3 — Quantile prop pipeline + per-market bakeoff (seidcubro/PriorLine, learn-only)

His pipeline: nflverse → rolling/situational per-player-per-market features → ONE model per market via bakeoff (ridge wins rush attempts, elastic net wins rush yards/receptions, HGB wins passing, Poisson wins pass TDs, RF wins TD classifiers) → quantile models q10–q90 → edge = projection vs Odds API lines. 20,000 sims per matchup with Dirichlet touch-shares, every market read off the SAME simulated outcomes. Honest arc: blind 2025 backtest −4.3% ROI → found the structural fix (books shade lines toward overs; quantile medians beat means) → top tier +4.1% over 3,952 graded picks. "Every bucket was 14 to 29 points overconfident" before quantile recalibration.

### Spec

1. New file `packages/prediction-engine/src/props/quantile-prop-engine.ts` (+ test). New files only.
2. Method:
   - Per-market bakeoff harness: for each prop market (rush att/yds, receptions, pass yds/TDs, anytime TD), fit the candidate family set {ridge, elastic-net, HGB, Poisson, RF} on rolling/situational per-player features and keep the winner by held-out log-loss/Brier — the bakeoff is the deliverable, not a fixed model choice.
   - Quantile layer: fit q10–q90 per player-market; convert to P(over) from the quantile curve, NOT from a point estimate.
   - Simulation: 20,000 draws per matchup with Dirichlet touch-shares across skill players; read every market off the same simulated outcomes (one sim, all markets).
   - Over-shade correction: compare quantile medians vs means against closing lines; apply the shade adjustment his work found (books shade toward overs).
3. Output: `{ player, market, line, pOver, quantileCurve: [q10..q90], edge }`.
4. COMPOSE WITH: `packages/prediction-engine/src/props/conditional-td.ts` (anytime-TD math already wired), `packages/prediction-engine/src/props/hr-factors.ts` (factor-tilt pattern to mirror), The Odds API ingestion (already live per 2026-08-22).

### Test asserts

- Bakeoff on a fixture picks different winners for rush-att vs pass-TD markets (proves the harness discriminates).
- P(over) derived from quantiles matches the empirical over-rate on a held-out fixture within tolerance.
- Dirichlet touch-shares sum to 1 across skill players per sim draw.

---

## BUILD 4 — Ensemble voter with confidence grading (Sujar Henry, methodology only)

His recipe: 20+ features (Elo, recent win %, rest days, off/def EPA, market data, injury data added after feedback); ensemble of LogReg + decision trees + XGBoost + random forests VOTING; nflverse back to 2003, 6,234 games, holdout 2021–2025; weekly tables with confidence %; published hyperparameter notes (trees 50–200 → 200–500, max depth 12 to control overfitting). Self-reported 88% one week / 68% the next ("55–65% typical").

### Spec

1. New file `packages/prediction-engine/src/nfl/ensemble-voter.ts` (+ test). New files only.
2. Method:
   - Voters = estimators the engine ALREADY has: Elo-family rating, the GBM scaffold (`ml-estimator.ts`), a logistic regression on the 7-feature differential vector (Build 1 of the ethandjo handoff). Each voter outputs a win probability; the ensemble vote is the mean, with disagreement = spread across voters.
   - Confidence grading: tier picks by ensemble agreement AND probability distance from 0.5 — high-confidence tier = |p−0.5| large AND voter spread small. This mirrors his weekly confidence tables and R2's confidence-split analysis (9-1 on 60%+ picks).
   - Holdout protocol: tune on pre-2021, report on 2021–2025 seasons untouched.
3. Output: `{ winProb, voterProbs: number[], agreement, confidenceTier: "high"|"mid"|"low" }`.
4. COMPOSE WITH: `ml-estimator.ts`, feature-store Elo/Glicko metrics, the ethandjo game predictor (its output can be a fourth voter).

### Test asserts

- On a fixture, high tier contains only games where all voters agree within 5pp and |p−0.5| > 0.15.
- Holdout harness: training weeks never include the predicted week (walk-forward, same law as the ethandjo build).

---

## BUILD 5 — Ridge-on-one-hots schedule adjustment + prior-season blending (Damepivot, learn-only)

His method: team ratings = EPA/play split passing/rushing × offense/defense + success rate + explosive rate, schedule-adjusted by attributing each play to BOTH teams via ridge regression over one-hot team indicators (penalty shrinks thinly-sampled teams toward league average). Prior-season blending weight w(week) = n/(n+6). QB inputs: rolling EPA/dropback + CPOE, 16-game window crossing seasons. Situation: rest differential, division, indoor/outdoor, surface, timezone delta, kickoff hour, week. Held-out 2023–2025 (816 games): margin MAE 10.077 vs Elo 10.253; Brier 0.2182; calibration slope 0.998. "A ~10-point MAE is close to the practical floor."

### Spec

1. New file `packages/prediction-engine/src/nfl/schedule-adjusted-ratings.ts` (+ test). New files only.
2. Method:
   - Ridge regression: rows = plays (or games), columns = one-hot home-team + one-hot away-team indicators, target = EPA/play (or margin); the ridge penalty shrinks rarely-observed teams toward the league mean — that shrinkage IS the schedule adjustment.
   - Split ratings into four: pass-offense, rush-offense, pass-defense, rush-defense EPA/play.
   - Prior-season blend: `w = n/(n+6)` where n = games played this season; rating = w·current + (1−w)·prior-season.
   - Report calibration slope on holdout (his 0.998 is the bar to compare against, not copy).
3. Output: `{ team, passOff, rushOff, passDef, rushDef, blended: boolean }`.
4. COMPOSE WITH: feature-store rating metrics (additive), `nflverse-cache.ts`.

### Test asserts

- Fixture: a team with 2 games played gets a rating pulled visibly toward league average vs a team with 12 games (shrinkage works).
- Blend weight at week 1 ≈ 1/7 prior-heavy; at week 17 ≈ 17/23 current-heavy (formula verified).
- Calibration slope computed on a held-out fixture is reported (any value — the reporting is the requirement).

---

## BUILD 6 — Sealed ledger + isotonic calibration (bweezy615/Soothbet, open source)

His discipline: Elo + damped margin-of-victory + opponent-aware EPA form + rest → probabilities via ISOTONIC REGRESSION refit each season on prior seasons only. 11-book price shopping, de-vigged fair line. Weekly slate SEALED before kickoff and graded in public; Brier vs de-vigged closing market. 2,608-game walk-forward: 49.5% ATS vs 52.4% breakeven — he published the LOSING record: "It lost to the market… So we published the losing record."

### Spec

1. New file `packages/prediction-engine/src/nfl/sealed-ledger.ts` (+ test). New files only.
2. Method:
   - Isotonic calibration: fit isotonic regression mapping raw model probs → calibrated probs, refit each season using ONLY prior seasons' outcomes (never the current season).
   - Sealed ledger: before each week's kickoff, write `{ gameId, modelProb, calibratedProb, marketProb, sealedAt, hash }` with a tamper-evident hash; after results, grade Brier vs the de-vigged closing line.
   - Publish the record win or lose — the ledger is append-only; losing weeks stay visible.
3. Output: ledger entries + `{ brierVsMarket, record }` aggregates.
4. COMPOSE WITH: `apps/web/lib/calibration/prereg-eval.ts` (Wave 3 — the preregistration/seal pattern is already built; this ledger is its consumer), `eval/edge-lab/sealed-split.mjs` (sealed-split discipline), market de-vigging in `market/` modules.

### Test asserts

- Isotonic fit on a fixture is monotone non-decreasing and changes the raw probs.
- Ledger entry hash verifies; tampering with a prob after sealing breaks verification.
- Grading on a fixture computes Brier vs the closing line correctly.

---

## Standing rules (all builds)

- New files only. Never modify existing files or live code paths. No regression.
- Every module gets a test.
- Own branch, commit as you go.
- Log each finished item in `docs/research/2026-09-21/wiring/IMPLEMENTED.md` so nothing gets built twice.
- The repo's AGENTS.md governs everything else.
- Methodology is learned from and re-implemented as GSE's own output. The only code that may be adapted directly is TreMatt03's (MIT) — with attribution in the file header. Everything else: learn the idea, write our own implementation.
