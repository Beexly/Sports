# Verdict: carter-tyra/pgatour-ai — **REAL** (with named gaps)

**carter-tyra/pgatour-ai**, TypeScript + Python monorepo, pushed 2026-06-10. Same author as AIntelligent-Oddz, but a different animal entirely.

## 1. What was actually read (git-trees + contents API)

**Python modeling service** (`services/modeling/src/pgatour_ai_modeling/`) — real, tested logic, zero `pass` stubs, zero TODOs:
- **`features.py`** (886 lines): real feature engineering. `compute_player_features` builds per-player: long-term SG mean, recent-24-round SG mean, SG component means (off-tee / approach / around-green / putting), volatility = population stdev of SG, `course_fit` = course average − long-term average, field-strength-adjusted SG. Leakage guard is real: `as_of` cutoff filters rows to `captured_at <= as_of` and tournaments that started before the target; stable JSON hashing of inputs; versioned feature-set manifests.
- **`inference.py`** (1,358 lines): the actual model. Skill blend: `0.65·long_term_centered + 0.25·recent_centered + 0.07·field_adjusted + 0.03·course_fit`, clamped ±1.25. Per-player sigma from clamped volatility. Seeded Monte Carlo tournament simulation (rank counting over the field, `rng.normal` draws) with additive Laplace smoothing. Markets: outright, top-5/10/20, make/miss cut. Outputs fair American odds, model edge vs market implied probability, uncertainty penalties, driver/risk explainability strings, idempotent DB writes to `model_runs`/`predictions` with input hashes. **No trained ML** (no sklearn/xgboost) — it's hand-rolled SG + simulation, which is the standard golf modeling approach anyway (same family as DataGolf's method).
- **`backtesting.py`** (1,042 lines): real evaluation — Brier score, log loss, calibration (decile bins, weighted error), coverage, probability drift, closing-line value when pre-start market snapshots exist; scoped evaluations (overall/market/tournament/decile). Docs set promotion gates: ≥500 known outcomes, ≥75% coverage, calibration error ≤8%, Brier ≤0.18, log loss ≤1.10 — model-backed bets **fail closed** below that.
- **`simulation.py`** (51 lines): the one honest scaffold — self-labeled "scaffold, not the final production model," establishes the deterministic sim contract. Not a fake; labeled.
- **Tests** (`tests/`): real pytest — `test_inference.py` (fair-odds assertions, missing-feature→low-confidence behavior), `test_backtesting.py` (outcome mapping per market incl. WD/DQ handling, calibration bins), `test_features.py` (155 lines, 18 asserts).

**Ingest** (`services/ingest/src/ball-dont-lie.ts`, 75KB): real adapter — ~13 normalize functions + ~14 sync functions for players, tournaments, courses, holes, tee times, field entries, round results/stats/scorecards, season stats, futures; zod-validated paginated fetch; raw-snapshot-before-normalization contract (S3/MinIO + Postgres); CLI seed/history/data-quality/data-status. **Data source: balldontlie.io's golf endpoints** (GOAT tier — `v1/courses`, `v2/tournaments`, `v1/player_round_stats`, `v1/futures`, etc.).

**DB + domain** (`packages/db/src/schema.ts`, 50KB; 11 migrations; `packages/domain/src/odds.ts`): canonical entities for players/tournaments/courses/markets/odds/round results/model runs/backtests/alerts/watchlists; real odds math (no-vig normalization, Kelly sizing, dead-heat).

**Web app** (`apps/web`): thin — page routes are 400–600-byte wrappers delegating to real feature views (`betting-view.tsx` 22.7KB, `research-view.tsx` 26.9KB, `portfolio-view.tsx` 19.7KB, `live-view.tsx` 10.5KB). Per its own README it runs on **deterministic seed data** — the product surface is a demo, not wired to live model output.

**Commit history**: 24 commits, 2026-05-23 → 2026-06-10, iterative (ingest foundation → seed runner → migrations → command center → CI). Real build cadence, not a one-shot dump.

## 2. What's missing (honest gaps)

- **No license.** No LICENSE file; GitHub license API returns 404. **Method-only — cannot lift code, only ideas.**
- **No committed backtest results.** Results land in DB tables (`model_backtests`, `model_evaluations`) — none shipped in the repo. Promotion gates are documented but no passing/failing run is visible.
- **No trained ML** — heuristic SG blend, not a fitted model.
- Web product layer is seed-data demo; the intelligence-terminal views are the real surface.
- package.json `"private": true` — author treats it as his own build, not a library.

## 3. vs AIntelligent-Oddz

Not the same story. Oddz = architecture-only skeleton (`def predict: pass` everywhere). This = the author actually finishing the job: implemented math, tests, migrations, CI (postgres service + migrate + check on every push), honest scaffold labels where scaffolding exists. Either this was the real project and Oddz the sketch, or he leveled up between repos. Either way: **this repo has genuine method content; Oddz had none.**

## 4. Portable method detail (for Garrett's golf-adjacent lanes)

1. **Feature recipe**: decompose player skill into long-term SG mean / recent 24-round SG / 4 SG components / volatility (pstdev) / course_fit (course avg − baseline) / field-strength-adjusted SG. All reproducible from round stats with an `as_of` leakage cutoff — the leakage discipline (immutable raw snapshots, input hashing, versioned manifests) is the best thing in the repo.
2. **Blend weights as a starting point**: 0.65 long-term / 0.25 recent / 0.07 field-adjusted / 0.03 course fit — empirically tunable.
3. **Placement-market simulation**: Monte Carlo over per-player score distributions + Laplace smoothing; fair-odds conversion; model edge vs no-vig market prob.
4. **Promotion gates**: Brier ≤0.18, calibration error ≤8%, ≥500 outcomes, fail-closed automation — a usable template for GSE's own model promotion criteria.
5. **Data source lead**: balldontlie.io golf endpoints (GOAT tier) as a licensed SG/round-stats feed — worth checking against DataGolf pricing for a golf lane.

## 5. Follow-up worth it?

**Yes, method-level only.** Worth filing a method teardown (feature recipe, blend weights, simulation approach, promotion gates) into the corpus — adjacent to golf lanes and the leakage/backtest discipline is solid. **Not worth**: lifting code (no license), expecting shipped validation numbers (none exist), or treating the web app as production (seed-data demo). Optional: the author is a real builder with a real golf pipeline — a collaboration/licensing conversation is a warmer lead than most, if Garrett ever wants one.
