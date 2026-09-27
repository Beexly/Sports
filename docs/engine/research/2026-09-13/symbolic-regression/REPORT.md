# Machine Discovery of NFL Predictive Metrics — Prototype Report

**Date:** 2026-09-13
**Lane:** GSE machine-discovery (inspired by the Sept 2026 OpenAI Navier–Stokes agent claim — the *method*, not the math)
**Question:** Can symbolic regression discover compact, predictive formulas from NFL play-by-play that no human designed?
**Honesty policy:** null results reported as null. Every claim below is backed by a held-out-seasons evaluation.

## Data

- Source: nflverse play-by-play parquet, seasons 2020–2025, downloaded from
  `github.com/nflverse/nflverse-data` (release tag `pbp`). Free, no account.
- Train: seasons 2020–2023. Holdout: seasons 2024–2025 (never seen during search).
- **Target A — play EPA from pre-snap features only** (no leakage: down, distance,
  yardline, time remaining, quarter, score differential, shotgun, no-huddle).
  Play type (run/pass) deliberately excluded — it is decided at/after the snap.
  Train n=165,330 plays / holdout n=82,261.
- **Target B — drive ends in a score (TD/FG = 1) from drive-start state**
  (yardline, time, quarter, score diff, down, distance). Time-censored drives
  ("End of half") excluded. Train n=22,810 drives / holdout n=11,271. Base rate 40.8%.

## Method

- Symbolic regression via `gplearn` (pure Python, free), function set
  {+, −, ×, ÷(protected), √|·|, log|·|, |·|, −, 1/·, max, min, sin, cos}.
- Search budget: population 3,000 × 150 generations × 2 seeds per target,
  tournament size 50, parsimony 0.0001. (An early small-budget run collapsed to
  degenerate constants — over-aggressive parsimony on a flat MSE landscape —
  so the budget was scaled up ~40× before drawing conclusions.)
- Features standardized; formulas converted back to raw football units with sympy.
- Baselines: constant predictor (train mean / base rate).
- Reference: `HistGradientBoosting` (bounds how much signal exists at all —
  if HGB can't find it, the machine can't either).

## Results

### Target A — play EPA from pre-snap state: NULL (confirmed)

| model | holdout R² (2024–2025) |
|---|---|
| Dumb baseline (train mean) | 0.0000 |
| Best GP-discovered formula (of 2 seeds × 3,000 pop × 150 gen) | **−0.0222** |
| Gradient-boosting reference | 0.0078 |

The machine's best formulas were degenerate near-constants dressed in
`log(min(...))`/`sin(...)` scaffolding, e.g. (raw units):

`log(-Min(-0.761, sin((0.9983*down - 1.9888)/(2.0609*shotgun - 1.2792)), 0.8244*Max(-1.492, 0.2445*ydstogo - 2.0664)))`

All top-5 "discoveries" were cosmetic rewrites of the same constant prediction —
identical R² and MAE. Nothing beats guessing the mean.

**Football translation:** there is almost nothing to find. Expected-points models
are zero-sum calibrated, so the average EPA of a play in *any* pre-snap situation
is ≈ 0 by construction. The strongest single linear correlate (|r| = 0.022,
distance) explains 0.05% of EPA variance. 99%+ of play EPA is decided *after* the
snap — by execution, not situation. A null here is the correct scientific answer,
not a methods failure: even a 3,000-tree gradient booster explains 0.8%.

### Target B — drive scores from drive-start state: INTERESTING (not a breakthrough)

| model | holdout AUC (2024–2025) |
|---|---|
| Dumb baseline (base rate 40.8%) | 0.5000 |
| Best GP-discovered formula (seed 42) | **0.5818** |
| Runner-up (seed 7, independent run) | 0.5661 |
| Gradient-boosting reference | 0.6268 |

(Correction: an early aborted run logged HGB AUC 0.5645 — that was a measurement
bug, `predict()` class labels instead of `predict_proba()`. The correct reference
is 0.6268, and both CSVs carry the corrected number.)

**Best discovered formula** (raw football units, sympy-simplified):

```
score_drive ≈ sin( | −0.2007·ydstogo + min(0.0446·yardline_100 − 2.3621,
                                           0.2007·ydstogo − 1.0574) + 1.0574 |^0.5 )
```

(GP raw form: `sin(sqrt(min(X_yardline, X_ydstogo) − X_ydstogo))` on standardized
features. Both seeds independently converged on the same structural family.)

**What it says in football terms:** scoring chance is governed by a
*min-bottleneck* between field position and distance — your drive is only as
promising as the worse of (how far you are from the end zone) and (how much you
need on this down) — passed through a saturating squashing function (the
`sin(√|·|)` wrapper is the GP's way of building a sigmoid-like saturator out of
the allowed operators). No widely-used football metric has this exact
min-bottleneck structure; expected-points models are smooth everywhere, while
the machine chose a hard kink.

**Honest assessment:** genuinely novel structure, validated on two held-out
seasons, both seeds agreeing — but it captures only ~65% of the ranking signal
a plain gradient booster finds ((0.5818−0.5)/(0.6268−0.5)), and the absolute
signal is modest (drive-start state alone will never be a strong predictor).
Interesting, not a breakthrough. The value is the *form*, not the accuracy:
a compact, interpretable, machine-found shape worth testing as a feature inside
bigger models.

## Verdict

- **Target A (play EPA): NULL.** Confirmed twice (two seeds, plus a 3,000-tree
  GBM reference at R² 0.008). Pre-snap situation explains <1% of play EPA —
  the rest is decided after the snap. Correct scientific answer, not a failure.
- **Target B (drive scoring): INTERESTING.** Machine found a novel
  min-bottleneck formula (AUC 0.5818 vs 0.5 baseline, HGB 0.6268) that no human
  designed, stable across seeds and held-out seasons.
- **No breakthrough.** Nothing discovered beats standard ML or changes how
  football should be measured today. The prototype proves the *pipeline* works;
  the white space is real but needs richer targets.

## What I'd try next

1. **Richer targets with real signal:** EPA²/WPA²-style leverage targets
   (variance is more predictable than mean — a big play's *leverage* is largely
   situational), 4th-down go/for-go decision surfaces, or red-zone TD rate.
2. **Richer features:** personnel groupings, pre-snap motion, defensive box
   count, spread/total (market-implied team strength) — all pre-snap legal.
3. **Longer evolution + PySR:** gplearn's Python engine is fast but its search
   dynamics needed a 40× budget increase to escape degenerate constants; PySR
   (Julia) has better constant optimization and multi-objective search.
4. **Use discovered forms as features:** plug the min-bottleneck term into a
   GBM and test whether it adds anything over raw features — that is the real
   commercial test of a "discovered metric."
5. **Symbolic distillation of HGB:** fit HGB first, then run symbolic
   regression against *its* predictions (smooth target, strong gradient) —
   a standard trick for extracting interpretable formulas from black boxes.

## Reproducibility

## Verdict

*(filled after the run completes)*

## Next steps

*(filled after the run completes)*

## Reproducibility

- `prep.py` — builds both datasets from `data/pbp_*.parquet`
- `discover.py` — original full discovery (Target A completed; Target B was
  killed mid-run by a service restart — superseded below)
- `discover_b.py` — Target B rerun with per-seed checkpoints (`ckpt_b_seed*.pkl`);
  safe to re-run, skips finished seeds
- `assemble_b.py` — builds `formulas_b.csv` from checkpoints
- `formulas_a.csv`, `formulas_b.csv` — top formulas per target with holdout numbers
- `discovery.log`, `discovery_b.log` — run logs
- `wpa2.py` — queued follow-up: WPA² win-leverage protocol (not yet run)
- Environment: `python3 -m venv .venv && .venv/bin/pip install pandas scikit-learn gplearn pyarrow sympy`
