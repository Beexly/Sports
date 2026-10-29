# How Combine Speed Builds: A Selection-Aware Test of Defensive-Line Peak Speed

## Abstract

The 40-yard finish hides how speed builds, but screening movement features can make apparent gains look larger than they are. In a nested audit selecting among 12 position-by-phase candidates, pooled held-out RMSE changed by just -0.0033 yd/s (95% fixed-OOF interval -0.0099 to +0.0027); early acceleration was not selected. A follow-up, post-screen DL analysis found a larger -0.0497 yd/s change among 46 exposed players, but this is a discovery estimate, not confirmatory validation. Transfer was inconsistent for fixed post-snap windows and negligible for context-adjusted speed and pressure outcomes. The analysis supports no first-step, pass-rush, causal, or draft-cutoff claim.

For DL evaluators, early speed build is a hypothesis to check against role-matched college film, not a draft-grade adjustment.

## Why split the 40?

Prospects can share a finish time but reach it differently. We define early acceleration over the first second of movement, later acceleration over 10–20 yards, and retention as the speed ratio near 40 versus 20 yards.

This “early acceleration” is post-onset speed gain, not speed from a stationary start; without a stimulus timestamp, it excludes reaction time and movement before threshold crossing.

## Data and design

We derived player features from Combine 40-yard traces using a centered three-frame median filter. Onset was the first speed ≥1 yd/s on two consecutive frames; early acceleration is mean smoothed-speed gain over the next second. We averaged available attempts.

Distance phases use signed x-course progress from onset, not official start-line splits. The primary early feature is time-based.

We used the [NFL Big Data Bowl 2027 dataset](https://www.kaggle.com/competitions/nfl-big-data-bowl-2027/data). All 793 tracked 40-yard attempts passed 10 Hz cadence and nonnegative-speed checks. Outcome-blind plots covered 19 attempts across ten DL feature ranks; 774 were not visually inspected. PCA places the movement axis within about one degree of x. Signed x progress reaches 40 yd in 572 attempts versus 590 by cumulative path; phase ranks agree closely (rho=0.999 late acceleration; 0.9997 retention). Course calibration is undocumented, so x is inferred; the time-based primary feature is unaffected.

The NFL outcome is rookie-season p90 of per-play peak speed. Longer plays offer more chances to reach high speeds; role and play type are uncontrolled. It is not pass-rush success.

The primary 100-play early-only sample includes 46 defensive linemen (2023: 13; 2024: 19; 2025: 14). Requiring all three 40-yard phases reduces the complete-case ablation to 34. The primary baseline uses only pre-draft information: official 40 time, 10-yard split, height, and weight. Separate sensitivities add draft capital and post-draft NFL subposition indicators; those are not needed for the primary result.

We fit ridge regression, holding out one class at a time. Imputation and scaling used training classes only; alpha came from a fixed grid. Only 2025 is forward-in-time. Player-bootstrap intervals resample fixed out-of-fold errors; game-cluster sensitivity resamples games and refits models.

## Findings

The most conservative test modeled feature selection inside each training split. A nested audit over 12 position-by-phase candidates on 161 complete players gave a pooled OOF RMSE change of -0.0033 yd/s (95% fixed-OOF interval: -0.0099 to +0.0027). It selected WR late acceleration for the 2023 outer fold and DL late acceleration for 2024 and 2025; it did not select DL early acceleration. The nested family covers only these 12 candidates and does not correct for the broader discovery search across drills, outcomes, exposure cutoffs, and processing choices.

![Nested selection across position and 40-yard phase](../outputs/fig_position_phase_nested_selection.png)

In a separate post-screen discovery analysis at the 100-play threshold, adding early acceleration to the pre-draft baseline reduced pooled out-of-fold RMSE by 0.050 yd/s at ridge alpha 5 (95% fixed-prediction player-bootstrap interval: -0.090 to -0.009). Each held-out cohort improved: -0.050 yd/s for 2023, -0.040 for 2024, and -0.063 for 2025. At alpha 20, error also fell by 0.041 yd/s (interval: -0.068 to -0.012). An added draft-capital and subposition sensitivity also favors the feature on 42 players (change -0.048 yd/s; interval -0.082 to -0.014). These estimates use the same data that motivated the feature and should not be read as expected out-of-sample lift.

Among 27 DLs with both attempts, attempt 1 and 2 alone also reduced held-out RMSE at alpha 5 (-0.064 and -0.066 yd/s; intervals -0.112 to -0.017 and -0.106 to -0.027). Both effects were negative in each cohort. This overlapping subset is not independent validation.

Across 250 play-count-balanced splits of rookie games (all 46 players had ≥2 games per half), half-season p90 ranks had median Spearman ρ=0.81 (partition range 0.74–0.87). Refitting the locked model favored early acceleration in every split; median RMSE changes were -0.030 to -0.043 yd/s. These ranges are not confidence intervals or independent validation.

![Split-half target repeatability and early-acceleration model sensitivity](../outputs/fig_dl_game_speed_split_half.png)

Across nine onset/smoothing definitions, all 18 pooled and 54 fold comparisons favored early acceleration (alpha-5 RMSE changes -0.0358 to -0.0497 yd/s). This reuses the screened sample.

The forward 2025 fold trained only on 2023–2024 and reduced full-play target RMSE by 0.063 yd/s on 14 players (95% fixed-prediction player-bootstrap interval: -0.109 to -0.009). Because screening included all three cohorts, this is exploratory, not independent confirmation.

Phase ablations have different coverage. At alpha 5, early acceleration changed RMSE by -0.042 yd/s (n=42; interval -0.079 to -0.007); late acceleration by +0.010 (n=42; -0.002 to +0.022); retention by -0.003 (n=34; -0.019 to +0.012). The three-phase block changed it by -0.025 (n=34; -0.073 to +0.013). On the same 34 players, early acceleration changed RMSE by -0.054 (-0.085 to -0.024), versus +0.014 for late acceleration and -0.003 for retention. These exploratory ablations do not adjust for broader screening.

Early acceleration repeatability was higher for DLs (ICC(A,1)=0.727, n=63; interval 0.570–0.833) than DBs (0.201), OLs (0.581), or WRs (0.051). This is same-session, not between-day, reliability.

Fixed-window tests weaken the interpretation. For complete 1–4-second windows after `ball_snap` (≥90% frames, endpoint within 0.1 s, no gap >0.2 s), samples were 45–46 DLs. At alpha 5, pooled RMSE changes ranged -0.0054 to +0.0070 yd/s; all pooled intervals crossed zero. The 2025 fold varied by horizon: the 1-second alpha-5 result worsened by +0.0185 yd/s (interval +0.0117 to +0.0256), while 3–4 seconds improved; alpha-20 signs also varied. DL upper-tail speeds were 6–7 yd/s versus 8–9 for DB/WR, with weak within-position Combine correlations.

For 46 players, median outcome coverage was 268.5 plays across 14 games; median game-cluster p90 SE was 0.149 yd/s. Across 1,000 draws, each player's p90 was independently sampled from that player's game-resampling distribution before refitting. Median alpha-5 RMSE change was -0.0402 (simulation interval -0.0648 to -0.0182), improving in every draw. Independent player draws omit shared game, opponent, and weather shocks; this does not address selection bias or add a cohort.

We also modeled four-second per-play peak speed using alignment, down, distance, blitz role, snap speed, and recent pre-snap speed (15,067 windows, 45 DLs). At alpha 5, incremental RMSE change was -0.00016 yd/s in cohort-held-out validation (interval -0.00289 to +0.00183) and -0.00113 in 2025 (13 players; -0.00257 to +0.00020); alpha 20 was similarly near zero. This in-game diagnostic is not a pre-draft model.

The association did not transfer to first-step screens. In stationary-snap blitzes, early acceleration changed one-second speed-gain RMSE by +0.0028 yd/s (n=48; interval -0.0140 to +0.0195), and worsened displacement RMSE by +0.0113 yd. Pressure-rate RMSE change was -0.0003 (-0.0011 to +0.0006; n=48); get-off RMSE worsened by +0.0037 s (n=57). Context-adjusted pressure Brier improved only 0.000052 (<0.1%). These outcomes depend on alignment, assignment, and team context.

![Summary of speed transfer and measurement checks](../outputs/dl_early_acceleration_summary.png)

One outcome-blind 2024 matched pair had identical official 40 and 10-yard times but early acceleration differed by 1.64 yd/s². Held-out predictions separated; the added feature improved one player’s error and worsened the other’s. The figure shows observed p90 values; this is illustrative, not individual validation.

![Matched Combine profiles and held-out speed predictions](../outputs/dl_speed_profile_case_illustration.png)

## Practical use and limits

The finding is conditional on players with sufficient tracked rookie-season exposure; these post-draft cutoffs cannot be applied at draft time, and the analysis cannot estimate draft-bust risk for players without exposure. Direction is stable across overlapping thresholds, but effect size and sample size change:

| Minimum tracked plays | Complete DL players | RMSE change, alpha 5 (95% fixed-OOF interval) |
|---:|---:|---:|
| 25 | 67 | -0.0362 (-0.0636, -0.0077) |
| 50 | 57 | -0.0535 (-0.0857, -0.0186) |
| 100 | 46 | -0.0497 (-0.0901, -0.0092) |
| 200 | 34 | -0.0640 (-0.1006, -0.0228) |

These cohorts overlap; they are not independent replications. At the 200-play cutoff the forward 2025 fold has only 10 players and its alpha-5 interval includes zero. For DL prospects with similar official 40 and split results, first-second Combine acceleration is a hypothesis about full-play peak speed only. It may be a follow-up evaluation cue for scouts to compare movement profiles, alongside football-specific film and role evidence. It should not be used as a proxy for post-snap burst or pass-rush production: fixed-window and pressure analyses did not show consistent transfer. This establishes no draft cutoff or training prescription.

Screening positions, outcomes, and drills creates selection optimism. On the same 161 players used by the nested audit, a locked DL early-acceleration term changed RMSE by -0.0102 (-0.0149 to -0.0055), but that term followed the wider search and is not an independent confirmation. Only three cohorts are available. Full-play peaks depend on role, assignment, health, opportunity, and tracking duration. Fixed-window results validate neither individuals nor training prescriptions; future cohorts are needed.

## Reproducibility

The notebook `nfl_combine_speed_analysis.ipynb` rebuilds the profiles and analyses from the official competition data. The next confirmatory question is locked to first-second post-snap speed gain on stationary-snap DL blitz opportunities; its current 32-player result is exploratory and does not show incremental prediction (see [`PRIMARY_OUTCOME_CHARTER.md`](PRIMARY_OUTCOME_CHARTER.md)). The full search and current-notebook versus historical-output boundaries are documented in [`ANALYSIS_SEARCH_REGISTRY.md`](ANALYSIS_SEARCH_REGISTRY.md), with attempt-level and model uncertainty in [`MEASUREMENT_UNCERTAINTY.md`](MEASUREMENT_UNCERTAINTY.md). Analysis scripts and detailed design notes are included in `nfl_speed_project_code.zip`. The current writeup is under 2,000 words and uses four figures plus one table.


