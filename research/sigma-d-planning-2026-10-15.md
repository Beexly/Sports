# σ_d / DEFF planning computation — 2026-10-15

**Status: PLANNING entry (SPEC-A §8.3).** This is measurement infrastructure for
future-filter planning. It is **not a scored look**: no candidate was scored on
any new data, no new construction was evaluated, and the frozen filter remains
closed. The only computation performed on the frozen filter was a deterministic
rerun of the already-published `pit_round2.py`, undertaken solely to persist the
per-game difference vectors that the harness already computed internally — with
a hard reproduction assertion (below) that every published aggregate match.

## What changed

- `dfs/walk_forward/pit_round2.py` — three clearly-marked insertions
  (header block "SIGMA-D PLANNING PERSISTENCE (added 2026-10-15)", a recording
  loop in `summarise()`, and a write in `main()`). The change persists values;
  it alters **no computed value** (proven by the byte-identical rerun below).
- `dfs/walk_forward/pit_round2_pergame_diffs.jsonl` — NEW. 9,848 rows
  (4 candidates × 2,462 games): `{candidate, game_id, season, week, d}` where
  `d = CRPS_candidate − CRPS_baseline` per game, baseline = Gaussian
  μ = `spread_line`, σ = 13.45, exactly as `summarise()` computes it.

Scope note: `pit_round2.py` computes 4 of the program's 8 pit candidates. The
other 4 (round-1's three solos and the round-1 joint) live in
`pit_candidates.py` / `pit_joint.py`, which this job did not touch; their σ_d
below is recovered from their published SEs (as in the 2026-10-15 artifact
pack §4), not measured from vectors. Persisting their vectors is the same
one-line follow-up if it is ever wanted. **BQP/SWCC were not touched, run, or
scored on any corpus** — BQP's frozen scoring remains parked.

## Reproduction assertion (the tripwire, passed exactly)

- Data: nflverse `games.csv` from the upstream URL recorded in
  `data/gse-dataset/holdout.manifest.json`
  (`nflverse-data/releases/download/schedules/games.csv`); copy used sha256
  `55b458759b5e6fe735a9ecf03c0ea26f13beb9c5b60595e0b4190cd6ba888ca4`.
- Baseline: n = 2,462, CRPS = 7.154020678264436 — within 3.3e-7 of the locked
  7.154021 (harness lock tolerance 5e-7) and equal to the filter contract's
  recorded run value.
- The rerun's regenerated `pit_round2_result.json` is **byte-identical** to the
  published artifact (sha256 `0fa72d05639fbccb…` both): every candidate CRPS,
  mean delta, SE, t, flag count, chosen-parameter histogram, and unrounded
  float extra matches exactly. Tolerance statement: no tolerance was needed —
  maximum observed deviation on any aggregate is 0.

## σ_d — SD of per-game CRPS differences vs baseline (n = 2,462)

Sample SD (n−1 denominator — the same convention the harness's SE uses, and
each vector's implied SE = σ_d/√n reproduces its published SE digit-for-digit).

| Candidate | mean Δ | σ_d | Source |
|---|---|---|---|
| R2 integer-support discretized Gaussian | −0.001821 | **0.000680** | measured from persisted vector |
| R2 hetero-Gaussian β_T + key-number atoms (**family-2**) | −0.020822 | **0.293745** | measured from persisted vector |
| R2 Student-t, ν PIT-fit | −0.016043 | **0.266511** | measured from persisted vector |
| R2 empirical-quantile scale on total | −0.002478 | **0.387198** | measured from persisted vector |
| R1 hetero σ ∝ exp(β·\|S\|/10) | −0.005978 | 0.186664 | recovered: published SE × √2462 |
| R1 hetero σ ∝ exp(β·T/44) | −0.012282 | 0.234117 | recovered: published SE × √2462 |
| R1 symmetric-pair asymmetric Laplace | −0.001540 | 0.347537 | recovered: published SE × √2462 |
| R1 joint hetero (β_\|S\|, β_T) | −0.011398 | 0.236016 | recovered: published SE × √2462 |

Cross-check: family-2 σ_d measured from the vector = 0.293745 vs 0.2937
recovered earlier from the rounded published SE — agreement to the SE's
printed precision (the 4.5e-5 gap is the SE's 6-dp rounding, nothing else).

## DEFF — within-week correlation of the family-2 difference vector

Clusters = (season, week): **G = 163 weeks**, n = 2,462 games, mean cluster
size m̄ = 15.10 (min 13, max 16). Two estimators, stated:

1. **One-way random-effects ANOVA ICC(1)** (Shrout–Fleiss form, unequal-size
   m₀ = 15.104): MSB = 0.082190, MSW = 0.086575 → **ICC = −0.0034**;
   DEFF = 1 + (m₀−1)·ICC = **0.9525**.
2. **Cluster-robust variance ratio** (primary): DEFF = Var_CR(mean d) /
   Var_iid(mean d), CR variance with the G/(G−1) correction:
   Var_CR = 3.2850e-5 vs Var_iid = 3.5047e-5 → **DEFF = 0.9373**
   (SE_CR = 0.005732 vs SE_iid = 0.005920 = the published SE).

Reading: within-week correlation of family-2's per-game differences is
**zero within measurement precision** (the ICC point estimate is slightly
negative, the estimator's behavior at ρ ≈ 0). Both DEFF estimates sit below 1.

## Updated SPEC-A §5 planning inputs

**Planning input adopted: DEFF = 1.00.** The measurement says week-clustering
does not inflate the variance of a paired mean delta on this filter; no credit
is taken for the sub-1 point estimates, so the iid planning numbers stand
unchanged and conservative. Required n for a paired future-filter gate,
two-sided α = 0.05, 80% power, n = DEFF · (2.8016 · σ_d / δ)² with
σ_d = 0.293745 (family-2):

| True paired effect δ | n at DEFF = 1.00 (planning) | n at measured DEFF 0.9373 (arithmetic reference) |
|---|---|---|
| 0.0342 (the whole remaining gap) | **579 games** | 543 |
| 0.020 | **1,693 games** | 1,587 |
| 0.010 | **6,772 games** | 6,348 |

- MDE at the frozen window's own size (n = 2,462): **0.0166** (DEFF = 1.00);
  0.0161 at the measured DEFF.
- MDE for a single-season future freeze (n ≈ 272): **≈ 0.0499** — a one-season
  gate cannot resolve effects at the scale of the remaining gap (0.0342) at
  this noise level; §5's declared n must span multiple seasons, or the gate's δ
  must be declared at the single-season MDE.

## What this does not do

No candidate was promoted, weighted, or re-scored; no gate number moved;
emission remains ZERO_OBJECT; `walk_forward.json` untouched (the harness
cannot write it). The frozen filter's book stays closed — this entry exists so
the future filter's §5 power declaration can be written from measured σ_d and
a measured (null) week-clustering effect instead of assumed ones.
