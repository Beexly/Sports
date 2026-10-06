# [0424] Biases in Expected Goals Models Confound Finishing Ability (arXiv:2401.09940v2)

**Citation:** Davis and Robberechts (2024). *Biases in Expected Goals Models Confound Finishing Ability*. arXiv:2401.09940v2. URL: https://arxiv.org/abs/2401.09940v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 862 lines).
**Verdict:** ADAPT — this is the single most important methodological caution in the wave for GSE's props program: expected-metric residuals confound player skill with training-data composition, and the paper's cross-fitting / multi-calibration / shrinkage remedies should be mandatory in every GSE expected-yards/prop model.

## 1. Research question
Does a player's goals-above-expected (GAX) measure finishing skill, or is it confounded by the composition of the data the xG model was trained on? The paper demonstrates that because high-volume elite finishers contribute disproportionately to training data, standard xG models systematically misprice those same players' shots — so GAX conflates "finishing ability" with "the model was fit on shots like yours."

## 2. Dataset / schema
StatsBomb Open Data; the 2015/16 Big Five logistic xG model uses 43,110 open-play shots. Features: shot x/y coordinates, distance, angle, body part. Case studies: Paul Pogba (242 open-play shots, cumulative xG 20.85, 17 goals), Riyad Mahrez (289 shots, 17 deflected = 5.9%), Lionel Messi (375 goals from 1,862 open-play shots). Messi training-bias experiment: inject 4,000 shots from a +25% finisher into training and re-measure. Access: public (StatsBomb Open Data).

## 3. Method / model
(1) Simulation study: 10,000 repetitions; true finishing skill multipliers α ∈ {0, 5, 10, 15, 25%} applied to a baseline conversion model; shot volumes {50, 75, 100, 125, 150} per season; measure how often GAX correctly identifies the skilled finisher over 5 seasons. (2) Multi-calibrated xG: calibration groups defined by position × smoothed shot-volume category (low < 0.875 shots/90, high > 2.526 shots/90), with position priors per 90 (attacker 2.1, midfielder 1.1, defender 0.4) and a 270-minute weight. (3) Empirical demonstrations: Pogba long-range subset, Mahrez deflected-shot subset, Messi training-contamination experiment.

## 4. Equations & assumptions
Stated in the paper:
- GAX = Σ_i (G_i − xG_i)
- Multi-calibration: separate calibration within groups g = position × smoothed shot-volume bin; group xG adjusted toward the group's empirical conversion rate with prior weight equivalent to 270 minutes at the position prior (2.1/1.1/0.4 per 90)
Assumptions: (a) the logistic xG model is correctly specified conditional on location/body part — the bias demonstrated comes from training composition, not misspecification; (b) finishing skill acts multiplicatively (α) on baseline conversion; (c) position × volume bins are sufficient to capture the relevant heterogeneity; (d) deflected shots are a separable, excludable category.

## 5. Features / target
xG model features: shot location (x/y), distance, angle, body part. Simulation parameters: skill multiplier α, shots per season. GAX target: goals minus cumulative xG per player-season. Multi-calibration grouping features: position, shots per 90 (smoothed).

## 6. Validation design
Simulation: 10,000 repetitions per (α, volume) cell; the "detection rate" is the fraction of 5-season runs where cumulative GAX is positive. Empirical: case studies (Pogba, Mahrez, Messi) comparing standard xG vs. multi-calibrated xG vs. StatsBomb's proprietary xG. League-wide: all EPL 2015/16 players with ≥ 5 goals (n = 63), comparing exceedance rates under the three xG variants. No cross-validation in the ML sense — the validation is the simulation plus the contamination experiment.

## 7. Numerical results / baselines
Simulation (Table 1 — average ± SD of GAX over 10,000 repetitions, Hypothesis 1; exact):
- α=0%: 25 shots −0.00±1.39; 50: −0.02±1.97; 75: −0.01±2.42; 100: −0.06±2.78; 125: −0.00±3.06; 150: 0.01±3.43
- α=5%: 0.12±1.41; 0.22±2.01; 0.36±2.47; 0.44±2.83; 0.61±3.11; 0.75±3.50
- α=10%: 0.23±1.43; 0.48±2.03; 0.73±2.52; 0.93±2.87; 1.23±3.16; 1.48±3.55
- α=15%: 0.35±1.46; 0.72±2.07; 1.11±2.57; 1.42±2.92; 1.84±3.23; 2.21±3.61
- α=25%: 0.60±1.51; 1.22±2.14; 1.85±2.65; 2.38±3.00; 3.08±3.34; 3.70±3.73
Detection examples: with α=25% and 100 shots/season, the probability of outperforming xG in ≥ 4 of 5 seasons is 70.0%; with α=10% and 125 shots, only 41.6%.
Case studies: Pogba — 242 open-play shots, xG 20.85, 17 goals, but his long-range subset overperforms. Mahrez — 289 shots, 17 deflected (5.9%); GAX 14.61 including deflections vs. 9.03 excluding. Messi contamination — adding 4,000 shots by a +25% finisher to training drops Messi's measured GAX from 127.6 to 120.8 (over 5%).
Messi biography: 375 goals from 1,862 open-play shots; standard model xG 247.43; StatsBomb xG 246.00; high-volume-attacker baseline 274.3; weighted-average baseline 225.01; GAX rises from 127.57 to 149.99 (~17% increase) under the corrected baseline.
EPL 2015/16, players with ≥ 5 goals (n=63): 50 exceed standard xG (average 16.72%); 51 exceed multi-calibrated xG (average 20.00%); 47 exceed StatsBomb xG (average 12.78%).
My interpretation: the table's core message is variance dominance — even a +25% finisher at 150 shots/season has SD 3.73 around a mean GAX of 3.70. Single-season GAX is mostly noise; the contamination result (120.8 vs 127.6) shows the bias is real but second-order relative to that noise.

## 8. Code / data availability
Data: StatsBomb Open Data (public). Code: none stated in the extracted text.

## 9. Leakage & limitations
Adversarial: (a) The paper's remedy (multi-calibration) is demonstrated, not proven optimal — the position priors (2.1/1.1/0.4) and 270-minute weight are chosen, not learned. (b) The simulation assumes skill is multiplicative and constant — real finishing skill may be situational (the paper's own Pogba long-range finding hints at this). (c) Deflected shots are excluded as "atypical," but the boundary of "atypical" is judgmental; the same logic could exclude any shot type that breaks the model. (d) The Messi contamination experiment injects an implausibly large 4,000-shot block — a stress test, not a realistic training mix. (e) n=63 league-wide sample is small for the exceedance-rate claims. External validity to NFL: very high — the mechanism (stars overrepresented in training data; their residuals then misattributed to skill) applies directly to NFL expected-yards models fit on all plays, where elite QBs/WRs dominate the training sample. The deflected-shot analogue: tipped passes, broken plays, Hail Marys.

## 10. GSE overlap
Extension of deeply covered work, and a mandatory methods patch. The map lists the xG player/position-adjusted paper (2301.13052) as a deeply covered standout — this paper is its adversarial sibling: where 2301.13052 adjusts xG for the player, this paper shows the adjustment itself can be biased by training composition. The map's model-research brief covers calibration topics (conformal calibration, grouping loss) but nothing on training-data contamination of expected-metric residuals. For GSE's props program — which lives and dies on yards-above-expected and CPOE-style residuals — this is the "unknown unknown" made known. Cite against `docs/research/2026-09-18-props-reverse-engineering/`: any prop edge derived from residual-based player ratings must pass this paper's checks first.

## 11. GSE implementation spec
Add a "residual hygiene" module to the props pipeline: (1) Cross-fitting: every expected-yards/CPOE model is fit with K-fold cross-fitting so no player's residual is ever computed from a model trained on his own plays (kills the self-contamination the paper demonstrates). (2) Multi-calibration: calibrate expected-yards models within position × volume bins (QB/RB/WR/TE × touches-per-game terciles) with empirical-Bayes priors per position, mirroring the paper's 2.1/1.1/0.4 priors and 270-minute weight (translate to ~4 games of touches). (3) Atypical-play exclusion list: tipped passes, Hail Marys, kneel-downs, spike plays excluded from both training and residual evaluation — the Mahrez-deflection rule. (4) Shrinkage: all published player residual ratings shrunk toward positional means with volume-dependent shrinkage factors. Effort: 2–3 days; mostly re-plumbing the existing expected-metrics code, no new data needed.

## 12. Reproducible test
Dataset: nflverse 2021–2024. Experiment A (contamination): fit the baseline expected-rush-yards model on all RB carries, then refit after downweighting/removing the top-5 RBs by volume; measure the change in those RBs' yards-above-expected (the paper's Messi experiment, NFL edition). Experiment B (calibration): compare raw vs. cross-fit vs. multi-calibrated (position × volume) residual ratings on predicting next-season performance. Metric: out-of-sample correlation of the residual rating with following-season yards per carry / yards per target; plus the contamination delta in Experiment A. Time window: fit 2021–2023, predict 2024.

## 13. Acceptance / rejection gate
ADOPT cross-fitting + multi-calibration as mandatory pipeline hygiene if EITHER: (a) Experiment A shows a contamination effect — removing top-5 volume RBs changes their measured yards-above-expected by ≥ 5% (the paper's Messi bar was >5%); or (b) Experiment B shows cross-fit/multi-calibrated residuals predict next-season efficiency better than raw residuals by ≥ 0.03 correlation points. If neither holds — i.e., NFL expected-yards models show no measurable contamination — document the null result and keep cross-fitting anyway as cheap insurance (it costs one line of sklearn config), but do not claim a GSE edge from it.

## 14. Improvement experiment
The paper's multi-calibration bins are static (position × volume). Run a learned-grouping experiment: use a decision tree on the residual surface to discover the grouping that maximizes residual heterogeneity (e.g., it might find down × field-zone × defensive-front instead of position × volume), then multi-calibrate within the learned groups. If learned groups beat the paper's hand-chosen bins on the §12 next-season prediction gate, GSE gets a genuinely better-than-paper residual rating — and a publishable-style result for the props program. If the tree rediscovers position × volume, the paper's bins are validated and the experiment cost one afternoon.
