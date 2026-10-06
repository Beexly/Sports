# cbratkovics/fantasy-football-ai — Dossier

**Stars:** 16 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-09-29 (very alive) · **Created:** 2025-07-28

## 1. Vision
An evidence-first weekly NFL fantasy-point projection pipeline (QB/RB/WR/TE) where the *evaluation harness is the product*: one as-of feature module, random-forest champion vs XGBoost challenger, strictly lagged features with a real leakage test, a frozen 2024 test season + a fully out-of-sample 2025 season scored with no tuning touching it, and a weekly GitHub Actions job that decides on its own whether to publish, hold, or promote a challenger. Ships a decision lab with replayable receipts.

## 2. The Ask
Python 3.11, nflverse data via nflreadpy, dbt Core + dbt-duckdb on MotherDuck's free tier (10 GB / 10 compute-hrs per month — one weekly build uses minutes), GitHub Actions for the Tuesday job, ~$0/month total. No database, no secrets, no LLM in the scoring path.

## 3. Constraints
- **License: MIT** — clean adoption.
- Modest stated edge: MAE 4.49 vs 4.80 baseline on 5,914 player-games (2025 OOS), within ±3 at 46.0% vs 43.2%. Honest about being "a modest, consistent edge... not a breakthrough" against a noise floor of ~8 points SD.
- One-person operation; the weekly job's publish/hold/promote policy is code, not a team.
- Small star count for its quality — the best ideas in this category are not the most starred.

## 4. GSE lens
This repo is the single sharpest mirror in the whole category, and it hurts in at least four places:
1. **No-leakage by test, not by hope.** `tests/test_asof_no_leakage.py` recomputes 200 real rows from scratch using only earlier games, then perturbs the target week's stats and asserts nothing changes. GSE's first real reasoning trace returned INVALID (an honest refusal — good), but the engine has no equivalent temporal-safety harness. Walk-forward calibration just started; without a leakage gate, every number it produces is suspect until proven otherwise.
2. **One feature module.** Training, eval, and serving all call the same `asof.py` (65 lagged features). GSE has a 47-signal registry with zero producers — the mirror image problem: features imagined, none computed. One canonical module that *everything* calls is the discipline GSE needs when producers finally get built.
3. **Publish/HOLD/PROMOTE as code.** The Tuesday job runs data contracts → drift (PSI) → score → shadow-evaluate challenger → commit. A contract failure opens a GitHub Issue with the diagnosis; a HOLD is a named state, not a shrug. GSE has **no enforcement tooling** (no claim-matrix, no manifest checks) — the tau table got computed and never consumed, and nothing in the system noticed. A weekly self-gating job would have flagged that the day it happened.
4. **Artifacts, not claims.** Every evaluation is one JSON with input hash, commit, metric definitions, cohorts, folds. GSE's current claims (e.g. "+6.77pp held-out") should live in exactly this kind of artifact, not in chat memory.
5. Drift monitoring (PSI per feature vs training reference, with season-boundary-aware reference selection) — GSE has no drift story at all; the 2026 live-check leg will be flying blind against model trained on 2022–2025.

## 5. Verdict
**REBUILD** — MIT makes direct adoption legal, but GSE's architecture is its own; the right move is re-implementation of the *methods*: leakage test, one feature module, artifact-per-evaluation, publish/hold/promote weekly job, PSI drift monitor. This repo is the template for GSE's enforcement tooling gap.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/cbratkovics/fantasy-football-ai
- Gitdiagram: https://gitdiagram.com/cbratkovics/fantasy-football-ai
- Star history (16 stars): https://star-history.com/#cbratkovics/fantasy-football-ai
- github.dev: https://github.dev/cbratkovics/fantasy-football-ai
