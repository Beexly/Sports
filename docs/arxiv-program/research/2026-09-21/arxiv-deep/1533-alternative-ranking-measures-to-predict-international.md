# [1533] Alternative ranking measures to predict international football results (arXiv:2405.10247)

**Citation:** Roberto Macrì Demartino, Leonardo Egidi, Nicola Torelli (2024). *Alternative ranking measures to predict international football results*. arXiv:2405.10247. URL: https://arxiv.org/abs/2405.10247
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a Bayesian Bradley-Terry-Davidson posterior-median strength-difference covariate for goal-based and result-based forecasters is directly implementable in GSE's team-strength feature stack.

## 1. Research question
Does a Bayesian Bradley-Terry-Davidson (BTD) derived team ranking improve the predictive performance of statistical goal-based models and machine-learning result-based algorithms for international football, compared with the well-established FIFA ranking? The paper answers this by forecasting the 2022 FIFA World Cup (Qatar) and the 2023 CAF Africa Cup of Nations (Ivory Coast), each split into group and knockout stages, using Brier score as the accuracy metric.

## 2. Dataset / schema
International men's football matches 2018–2023: FIFA World Cups, UEFA Euro Championships, and normal friendlies; Olympic Games and matches involving a national B-team or U-23 lineup excluded. Training uses an iteratively updated dataset 2018→2023; test scenarios are the 2022 World Cup (group + knockout) and 2023 AFCON (group + knockout). Data source stated: Kaggle dataset "international-football-results-from-1872-to-2017" (martj42) — https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017. Schema: per-match home/away team, goals, tournament type, date. FIFA ranking points taken from the FIFA ranking published just before each tournament (World Cup: dateId=id13869; AFCON: 21 Dec 2023, dateId=id14233).

## 3. Method / model
Two-stage pipeline. Stage 1: fit a hierarchical Bayesian BTD model on historical match results (Win/Draw/Loss via Davidson extension) with Gaussian priors on log-strengths; compute the posterior median of each team's log-strength ψ_k; form the difference ω_n = ψ_{h_n} − ψ_{a_n} as a "relative log-strength" predictor, MAD-normalized. Stage 2: add ω_n as an extra covariate in (a) three dynamic goal-based Poisson models — double Poisson, bivariate Poisson, diagonal-inflated bivariate Poisson (fitted with the R `footBayes` package, attack/defense abilities evolving as AR(1) per season/year, sum-to-zero identifiability constraints) and (b) three result-based ML algorithms — random forest, ANN, MARS (R `caret`). Compare against the same models using FIFA ranking-point differences as the covariate instead.

## 4. Equations & assumptions
- BT base: p_ij^W = α_i/(α_i+α_j), with Σα_k = 1 (identifiability) (Eq. 1).
- Log reparam: p_ij^W = exp(ψ_i)/(exp(ψ_i)+exp(ψ_j)), Σψ_k = 0, ψ = log α (Eq. 2).
- Davidson draws (Eq. 3): p_ij^W = exp(ψ_i)/Z, p_ij^D = exp(γ+(ψ_i+ψ_j)/2)/Z, p_ij^L = exp(ψ_j)/Z, where Z = exp(ψ_i)+exp(ψ_j)+exp(γ+(ψ_i+ψ_j)/2); γ→+∞ makes ties certain, γ→−∞ eliminates them, γ=0 leaves outcome to strengths only. Prior art noted: Rao-Kupper η variant (Eq. given).
- Hierarchical Bayesian BTD (Eq. 4): w_ij | p_ij^W ~ Bernoulli(p_ij^W); d_ij | p_ij^D ~ Bernoulli(p_ij^D); ψ ~ N(μ_ψ, σ²_ψ); γ ~ N(μ_γ, σ²_γ). Priors chosen per Whelan (2017) fairness desiderata (swap-invariance, properness), Gaussian log-strengths satisfy all four.
- Double Poisson (Eq. 5): X_in | λ_1n ~ Poisson(λ_1n); Y_jn | λ_2n ~ Poisson(λ_2n); log(λ_1n) = θ + att_{h_n} + def_{a_n} + (φ/2)ω_n; log(λ_2n) = θ + att_{a_n} + def_{h_n} − (φ/2)ω_n; ω_n = rank_points_{h_n} − rank_points_{a_n} (FIFA points or BTD log-strengths).
- Bivariate Poisson (Eq. 6): (X_in, Y_jn) ~ BivPoisson(λ_1n, λ_2n, λ_3n), log(λ_3n) = β_0 (constant covariance across matches; reduces to double Poisson when λ_3n = 0).
- Diagonal-inflated bivariate Poisson (Eq. 7): P(X=x,Y=y) = (1−p)·BP(λ_1n,λ_2n,λ_3n) if x≠y; (1−p)·BP + p·D(x,ξ) if x=y, countering draw underestimation.
- Dynamic AR(1) team effects: att_{i,τ} ~ N(att_{i,τ−1}, σ²_att), def_{i,τ} ~ N(def_{i,τ−1}, σ²_def), τ=2..T; initialized att_{i,1} ~ N(μ_att, σ²_att), def_{i,1} ~ N(μ_def, σ²_def); sum-to-zero constraint per season; one season = one year.
- MAD normalization: x_MAD = (x − M(x))/M(|x − M(x)|), M = median.
- Brier score: b = (1/N) Σ_n Σ_{r=1..3} (p_rn − δ_rn)², r ∈ {win, draw, loss}; lower is better; range [0, 2] for three categories.
Assumptions: match outcomes conditionally independent given strengths; Poisson goal counts (with correlation handled only via λ_3); team abilities piecewise-constant within a year; draws modeled only via Davidson γ, not via in-match dynamics.

## 5. Features / target
Input features: historical W/D/L results (2018–2023) for the BTD strength estimation; per-match attack/defense abilities, baseline θ, home effect implicit in θ; the added covariate ω_n = normalized strength difference (BTD posterior-median log-strength difference or FIFA points difference). Target: three-way match outcome (home win / draw / away win) for result-based models; goals (X_in, Y_jn) for goal-based models, with the three-way process derived by aggregation. Horizons: single upcoming tournament matches (group and knockout stages separately).

## 6. Validation design
Iterative/tournament-block evaluation: models trained on all international matches 2018 up to each tournament; test = 2022 World Cup matches (64) split group vs knockout, and 2023 AFCON matches split group vs knockout. Both ranking systems (FIFA points vs BTD log-strengths) run through identical pipelines for paired comparison. Baselines: the six base models (3 Poisson + RF/ANN/MARS) with FIFA-ranking covariate serve as the baseline for the same six with the BTD covariate. Metric: Brier score on the three-way outcome. Splits are time-ordered (training strictly precedes tournaments).

## 7. Numerical results / baselines
2022 FIFA World Cup Brier scores (Table 1, lower = better):
- Group stage — FIFA vs BTD: Diag.Infl. 0.620/0.629; Biv.Pois. 0.617/0.618; Double Pois. 0.622/0.623; MARS 0.640/0.660; ANN 0.627/0.660; Random Forest 0.713/0.745.
- Knockout stage — FIFA vs BTD: Diag.Infl. 0.530/0.510; Biv.Pois. 0.546/0.535; Double Pois. 0.543/0.527; MARS 0.486/0.503; ANN 0.465/0.471; Random Forest 0.493/0.461.
2023 AFCON Brier scores (Table 2):
- Group stage — FIFA vs BTD: Diag.Infl. 0.679/0.682; Biv.Pois. 0.673/0.682; Double Pois. 0.670/0.677; MARS 0.679/0.690; ANN 0.703/0.702; Random Forest 0.736/0.687.
- Knockout stage — FIFA vs BTD: Diag.Infl. 0.681/0.677; Biv.Pois. 0.658/0.660; Double Pois. 0.670/0.656; MARS 0.645/0.650; ANN 0.666/0.661; Random Forest 0.834/0.884.
Paper's interpretation: FIFA ranking marginally better in heterogeneous group stages (WC); BTD better in knockout stages of both tournaments and in the AFCON group stage — i.e., BTD wins when teams are similar in ability. FIFA vs BTD normalized strength correlation: WC Pearson ρ_p = 0.90, Spearman ρ_s = 0.88, Kendall τ = 0.69; AFCON ρ_p = 0.91, ρ_s = 0.89, τ = 0.74.

## 8. Code / data availability
Code: https://github.com/RoMaD-96/Bayesian_BTD (R 4.2.3, footBayes, bpcs, caret packages). Data: Kaggle martj42 international-football-results-from-1872-to-2017.

## 9. Leakage & limitations
Adversarial notes: (1) The BTD model is fit on 2018–2023 results and the same matches train the downstream forecasters — strengths estimated partly from the test tournaments' own era data; strictly time-ordered within the iterative scheme, but the posterior median strength for a tournament team pools the full 2018–2023 window rather than data strictly before each match (lookahead within the estimation window). (2) No significance testing of the small Brier-score gaps (e.g., 0.530 vs 0.510 knockout) — differences are consistent but tiny; random-forest knockout AFCON 0.834 vs 0.884 shows high model variance on ~16-match knockout samples. (3) Tiny test sets (16 knockout matches) make Brier comparisons noisy. (4) FIFA ranking points used are the pre-tournament publication — correct practice — but the BTD strength for 2023 AFCON uses "matches played throughout 2018 to the end of 2023", potentially including AFCON 2024-01 matches themselves; ambiguous. (5) Only two tournaments tested; no betting-market baselines; no calibration assessment beyond Brier. (6) International football ≠ NFL: draw modeling (γ) is irrelevant to NFL moneyline/spread; Poisson goals ≠ NFL scoring. External validity to NFL comes via the ranking-as-feature recipe, not the sport-specific models.

## 10. GSE overlap
Existing map: team_ratings lane already covers Bradley-Terry, Elo, Glicko, TrueSkill, Dixon-Coles, Skellam, Poisson, and "state-space team strength" as an ML-brief topic; the map's "standouts already absorbed" does NOT include this paper. GSE's engine (v5.2.7) generates SPREAD/MONEYLINE/TOTAL picks from its own model; there is no existing BTD-posterior-median strength-difference covariate feeding the forecaster per the map. This is an extension, not a duplicate: the novel, portable piece is the two-step recipe (fit Bayesian BTD on W/L/T outcomes → posterior-median log-strength difference → inject as MAD-normalized covariate into any goal/points-based model with a φ scaling coefficient).

## 11. GSE implementation spec
1. Data: nflverse play-by-play / schedules 2002–2026 for team game outcomes; derive W/L/T at team-week level.
2. Fit Bayesian BTD (no draws in NFL → γ→−∞ limit, or plain BT with home-field order effect via Beaver/Gokhale additive term) in Stan/PyMC: ψ ~ N(0, σ²_ψ), hierarchical σ_ψ estimated; posterior median ψ_k per team per week using expanding window (fit weekly, strengths as of that week — avoid the paper's pooled-window lookahead).
3. Feature: ω_n = MAD-normalized (ψ_home − ψ_away) added as a linear covariate to GSE's points/spread regression (equivalent of the paper's φ/2 term) or as a model-blend input.
4. Dynamic extension: per-year AR(1) attack/defense as in the paper, adapted to offense/defense efficiency splits at week resolution.
5. Effort: ~1–2 days to prototype in the gse-lab; serving = weekly refit is cheap (32 teams, ~300 games).

## 12. Reproducible test
Dataset: nflverse schedules 2020–2025, weekly expanding-window Bayesian BT strengths (fit with data strictly before each game week). Metric: Brier score on three-way-equivalent NFL outcomes — use moneyline win probability calibration (Brier) and spread-cover Brier. Baseline: GSE v5.2.7 engine pick probabilities without the BTD covariate. Test window: 2023–2025 regular seasons, walk-forward weekly. Must be runnable in the existing gse-lab Python stack.

## 13. Acceptance / rejection gate
ADOPT the covariate into the engine if, on the 2023–2025 walk-forward test, adding ω_n reduces moneyline Brier score by ≥0.002 (paired, by week) AND does not worsen spread-cover Brier; REJECT (drop the feature) if the Brier delta is <0.001 in either direction or negative. Decision after one full backtest run.

## 14. Improvement experiment
Beyond the paper: make the BTD strength time-varying within season via a state-space random walk ψ_{k,t} ~ N(ψ_{k,t−1}, σ²) (Glickman-style dynamic BT) instead of the paper's pooled posterior median, and add a score-differential (margin-of-victory) weighted likelihood (Stern/Harville style) so blowouts move strengths more than 1-point wins — then test whether the dynamic, margin-aware BTD covariate beats the static posterior-median version on the same NFL walk-forward gate.
