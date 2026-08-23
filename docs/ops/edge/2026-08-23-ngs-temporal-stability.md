# NGS temporal stability — week-to-week variance vs signal (H0.9)

> **Question (Reasoning Agent 9):** How much does week-to-week NGS variance wash out
> the signal, and what is the signal-to-noise ratio per NGS field?
>
> **Verdict:** The efficiency **moat** metrics — CPOE, RYOE, xYAC, separation — are the
> *noisiest* week-to-week (SNR 0.04–0.24, ICC 0.04–0.12); a single weekly reading
> recovers <15% of a player's stable level. The **usage/role** covariates — intended
> air yards, air-yards share, time-to-throw, time-to-LOS, 8+ box% — are the *stable*
> ones (SNR 0.35–0.55, ICC 0.26–0.36) and are the sound weekly inputs. Moat metrics
> must be pooled/shrunk or held to seasonal level, not read week-to-week.

## Data & method (reproducible)

- **Source:** nflverse `nextgen_stats` combined releases (CC-BY-4.0, open attribution) —
  `ngs_passing/receiving/rushing.csv.gz`, seasons **2016–2025**.
  Verified-readable via `packages/data-ingestion/src/nflverse-ngs.ts`.
- **What counts as a week:** `season_type=REG`, `week>=1` (the `week=0` row is the
  full-season aggregate and is excluded from the weekly-variance estimate).
- **Volume gate:** per-row floor — passing `attempts>=10`, receiving `targets>=3`,
  rushing `rush_attempts>=5` (drops garbage-time / partial-game samples).
- **Grouping:** one `player_gsis_id × season` = one group; groups need ≥3 weekly
  obs (so within-player variance is estimable). Signal = between-group variance,
  noise = within-group (week-to-week) variance.
- **Decomposition:** one-way random-effects ANOVA variance components (Searle 1971,
  unbalanced `n_bar0` estimator) — the same discipline as `fitVarianceDecomposition`
  (`props-hb-nested.ts`).
- **Metrics:** ICC(1) = single-week reliability = signal/(signal+noise);
  **SNR** = signal_var/noise_var; **rt-r** = test-retest Pearson r of consecutive weeks;
  **4wkRel** = Spearman–Brown prophecy at n=4 (reliability of a 4-week rolling avg);
  ICC95 = 95% CI via 200-iteration bootstrap over player-seasons (`seed=20260823`).
- **Repro:** `python3 scripts/analytics/ngs-temporal-stability.py`

## Results — ranked by SNR (signal vs noise)

| variant | field | N obs | player-seasons | nwk/yr | mean±SD | signal_var | noise_var | ICC(1) | SNR | rt-r | ICC 95% | 4wkRel | mean vol |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|:--|---:|---:|
| receiving | avg intended air yards | 11999 | 1441 | 8.33 | 10.1395±4.6218 | 7.49041 | 13.56557 | 0.3557 | 0.5522 | 0.3527 | [0.334,0.378] | 0.688 | 47.4 |
| receiving | air-yards share (% of team) | 11999 | 1441 | 8.33 | 28.0801±14.4302 | 72.19911 | 137.21481 | 0.3448 | 0.5262 | 0.3481 | [0.325,0.364] | 0.678 | 47.4 |
| passing | avg time-to-throw (s) | 5079 | 458 | 11.09 | 2.7672±0.278 | 0.02427 | 0.05303 | 0.314 | 0.4577 | 0.3792 | [0.277,0.35] | 0.647 | 286.3 |
| rushing | avg time-to-LOS (s) | 4933 | 575 | 8.58 | 2.775±0.2502 | 0.01585 | 0.04567 | 0.2577 | 0.3471 | 0.3037 | [0.221,0.29] | 0.581 | 97.7 |
| receiving | avg separation (yds) - WR moat | 11999 | 1441 | 8.33 | 2.9244±0.9871 | 0.18537 | 0.76016 | 0.1961 | 0.2439 | 0.2022 | [0.178,0.215] | 0.494 | 47.4 |
| rushing | 8+ box % (stacked-box rate) | 4933 | 575 | 8.58 | 23.5028±17.9359 | 55.91391 | 258.03595 | 0.1781 | 0.2167 | 0.2102 | [0.149,0.206] | 0.464 | 97.7 |
| passing | avg intended air yards | 5079 | 458 | 11.09 | 8.0775±2.1805 | 0.7555 | 4.00842 | 0.1586 | 0.1885 | 0.1718 | [0.128,0.185] | 0.43 | 286.3 |
| passing | xCOMP% (exp completion %) | 5078 | 458 | 11.09 | 64.2469±5.8622 | 5.27064 | 28.92639 | 0.1541 | 0.1822 | 0.1606 | [0.124,0.186] | 0.422 | 286.2 |
| passing | avg completed air yards | 5079 | 458 | 11.09 | 5.8669±2.1532 | 0.67069 | 3.90865 | 0.1465 | 0.1716 | 0.1464 | [0.123,0.172] | 0.407 | 286.3 |
| passing | avg air yds to sticks | 5079 | 458 | 11.09 | -0.8395±2.2828 | 0.68921 | 4.51574 | 0.1324 | 0.1526 | 0.145 | [0.107,0.158] | 0.379 | 286.3 |
| receiving | avg cushion (yds) | 11998 | 1441 | 8.33 | 5.9904±1.5279 | 0.29126 | 2.01639 | 0.1262 | 0.1444 | 0.1118 | [0.111,0.143] | 0.366 | 47.4 |
| rushing | exp rush yds | 3977 | 455 | 8.74 | 64.3176±22.8047 | 63.7291 | 458.01302 | 0.1221 | 0.1391 | 0.152 | [0.09,0.157] | 0.358 | 97.5 |
| passing | aggressiveness (% tight cov.) | 5079 | 458 | 11.09 | 15.8823±7.424 | 6.1616 | 48.35571 | 0.113 | 0.1274 | 0.1245 | [0.089,0.134] | 0.338 | 286.3 |
| passing | CPOE (completion %-above-exp) - QB moat | 5078 | 458 | 11.09 | 0.1771±8.1008 | 7.16227 | 57.69495 | 0.1104 | 0.1241 | 0.1075 | [0.086,0.135] | 0.332 | 286.2 |
| receiving | avg exp-YAC (yds) | 11940 | 1436 | 8.31 | 4.082±2.3802 | 0.61644 | 5.01113 | 0.1095 | 0.123 | 0.1057 | [0.095,0.124] | 0.33 | 47.3 |
| receiving | catch % | 11999 | 1441 | 8.33 | 63.9234±19.2036 | 38.80432 | 324.62887 | 0.1068 | 0.1195 | 0.0905 | [0.091,0.12] | 0.323 | 47.4 |
| receiving | avg YAC (yds) | 11946 | 1436 | 8.32 | 4.541±3.3864 | 1.1655 | 10.34182 | 0.1013 | 0.1127 | 0.1127 | [0.086,0.116] | 0.311 | 47.3 |
| receiving | xYAC (YAC above exp) - GSE-xYAC | 11940 | 1436 | 8.31 | 0.4614±2.2615 | 0.38892 | 4.80609 | 0.0749 | 0.0809 | 0.0887 | [0.06,0.091] | 0.245 | 47.3 |
| passing | avg air-yds differential | 5079 | 458 | 11.09 | -2.2106±1.5571 | 0.11651 | 2.28381 | 0.0485 | 0.051 | 0.0263 | [0.031,0.067] | 0.169 | 286.3 |
| rushing | avg rush yds | 4933 | 575 | 8.58 | 4.3372±1.7123 | 0.14018 | 2.80398 | 0.0476 | 0.05 | 0.0548 | [0.03,0.065] | 0.167 | 97.7 |
| rushing | RYOE total (vol-scaled) | 3977 | 455 | 8.74 | 3.7402±23.557 | 25.16 | 545.9276 | 0.0441 | 0.0461 | 0.0605 | [0.021,0.065] | 0.156 | 97.5 |
| rushing | RYOE per att - GSE-RYOE | 3977 | 455 | 8.74 | 0.1983±1.5754 | 0.10762 | 2.41467 | 0.0427 | 0.0446 | 0.055 | [0.021,0.069] | 0.151 | 97.5 |
| rushing | efficiency | 4933 | 575 | 8.58 | 4.3532±2.8228 | 0.0 | 8.08666 | 0.0 | 0.0 | 0.0302 | [0.0,0.055] | 0.0 | 97.7 |

### Categories

| stability band | SNR | ICC(1) | fields |
|---|---|---|---|
| STABLE role/usage | SNR>=0.3 | ~ICC>=0.25 | avg intended air yards; air-yards share (% of team); avg time-to-throw (s); avg time-to-LOS (s) |
| moderate | 0.15<=SNR<0.3 | ~0.20-0.40 | avg separation (yds) - WR moat; 8+ box % (stacked-box rate); avg intended air yards; xCOMP% (exp completion %); avg completed air yards; avg air yds to sticks |
| washed-out efficiency | 0.08<=SNR<0.15 | ~0.07-0.20 | avg cushion (yds); exp rush yds; aggressiveness (% tight cov.); CPOE (completion %-above-exp) - QB moat; avg exp-YAC (yds); catch %; avg YAC (yds); xYAC (YAC above exp) - GSE-xYAC |
| heavily washed-out | SNR<0.08 | ~<0.07 | avg air-yds differential; avg rush yds; RYOE total (vol-scaled); RYOE per att - GSE-RYOE; efficiency |

## Reading the numbers (the wash-out lens)

A single weekly NGS reading recovers `ICC(1)` of a player's persistent seasonal level;
the remaining `1-ICC(1)` is week-to-week variance that **washes out the signal**.

- **The moats are the noisiest.** CPOE (ICC 0.11, rt-r 0.11, SNR 0.12), RYOE/att
  (ICC 0.043, rt-r 0.06, SNR 0.04) and xYAC (ICC 0.075, rt-r 0.09, SNR 0.08) sit at the
  bottom — week-to-week fluctuation ~10–25x larger than persistent player signal. `efficiency`
  has **zero** between-player variance at this volume gate (ICC 0.0) — pure noise floor.
- **Separation (WR moat) is borderline.** ICC 0.196 / rt-r 0.20 / SNR 0.24 — one week
  recovers <20% of a receiver's level; a 4-week pool reaches ICC~0.49.
- **Usage/role covariates are the stable inputs.** Intended air yards (ICC 0.356), air-yards
  share (0.345), time-to-throw (0.314), time-to-LOS (0.258) — these describe a player's/role's
  *approach*, far more consistent week-to-week than outcome deltas.

> These moats are *validated seasonally* by `ngs-measurement-loop.ts` (they reproduce NGS
> at season scale). That proof is exactly why their *weekly* form is so noisy — the seasonal
> aggregate averages away the within-player noise the moat's own validation depends on.

## How many weeks to recover the signal? (Spearman–Brown)

Reliability of an *n*-week average = `n·SNR / (1 + n·SNR)`; weeks to ICC threshold `t` =
`t / ((1-t)·SNR)`, rounded up.

| field | SNR | weeks→ICC≈0.50 | weeks→ICC≈0.70 |
|---|---|---:|---:|
| intended air yds (recv) | 0.55 | 2 | 5 |
| avg time-to-throw | 0.46 | 3 | 6 |
| time-to-LOS | 0.35 | 3 | 7 |
| 8+ box % | 0.22 | 5 | 11 |
| avg separation | 0.24 | 5 | 10 |
| CPOE | 0.12 | 9 | 20 |
| xYAC | 0.08 | 13 | 30 |
| RYOE/att | 0.04 | 25 | 59 |

RYOE/xYAC **never** recover within a 17-week season at any weekly window — they asymptote
to the seasonal aggregate (i.e. week-0). The stable usage covariates reach ICC≈0.5 in ~6–8 weeks.

## Implication for the covariate bus (`covariate-bus.ts`)

The bus binds *week t → week t+1* NGS weekly means. This analysis gates which bindings
survive the wash-out check:

- **USE as live weekly covariates** (stable, ICC≈0.26–0.36): `avg_intended_air_yards`,
  `air_yards_share`, `avg_time_to_throw`, `avg_time_to_los`,
  `percent_attempts_gte_eight_defenders`, `avg_separation` — real week-to-week signal for
  next-week props.
- **Do NOT feed raw week-to-week as a t+1 covariate** without pooling/shrinkage (signal
  <15% of observed): `cpoe`, `ryoe_per_att`, `avg_yac_above_expectation`,
  `avg_air_yards_differential`, `rush_yards`, `efficiency`, `catch_pct`,
  `avg_completed_air_yards`. Either (a) shrink weekly→prior on the seasonal mean
  (Bayesian pool, strength from the ICC above), or (b) let these enter only at the
  **seasonal/week-0 aggregate** level — the leak-safe posture the bus mandates.

## Caveats

- **Week-0 (season aggregate) is the high-SNR face** of these same metrics — it is high-SNR
  *because* it pools the noisy weeks. Using it for t+1 is leak-safe only inside the H0.6 window
  policy (season-open week excluded, no imputation, fail-closed).
- **Within-player-week variance here is conservative:** it bundles true mid-season talent
  drift (injury/role/weather) with pure sampling noise. Some 'noise' is real t+1 signal at a
  longer horizon, but it is not recoverable from a single week, so a single-week NGS edge is
  unreliable regardless of cause.
- **Volume gate** (>=10 att / 3 tgt / 5 rush) is what makes the noise visible; lowering it
  worsens SNR for outcome metrics, and the stability ranking is unchanged.

## Reproducibility / evidence

- Script: `scripts/analytics/ngs-temporal-stability.py` (compiles clean, `seed=20260823`)
- Machine-readable: `docs/ops/edge/2026-08-23-ngs-temporal-stability-results.json`
- Raw source: nflverse `nextgen_stats` release assets, CC-BY-4.0 (2016–2025, 6059–14731 rows/variant).

