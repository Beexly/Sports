# [0690] Predicting the 2026 FIFA World Cup with Sufficient Dimension Reduction of Elo Rating Histories (arXiv:2606.24171v1)

**Citation:** Mina Rezaei, S. Yaser Samadi (2026). *Predicting the 2026 FIFA World Cup with Sufficient Dimension Reduction of Elo Rating Histories*. arXiv:2606.24171v1. URL: https://arxiv.org/abs/2606.24171v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2606.24171.txt`, ar5iv-converted HTML text; I read the complete paper, §§1–6, all tables).
**Verdict:** ADAPT — the SDR-of-rating-history idea transfers to GSE's team-strength time series; adapt the Poisson goal head to spread/total outcomes and use GSE's own rating histories instead of monthly Elo differences.

## 1. Research question
Does a short history of recent team-strength ratings contain predictive information beyond the current rating value alone, and can categorical sufficient dimension reduction (SIR/SAVE) extract it as a low-dimensional score for probabilistic match-outcome forecasting? The testbed is the 2026 FIFA World Cup (first 48-team edition), evaluated on out-of-sample 2018 and 2022 World Cups.

## 2. Dataset / schema
- Match results: `github.com/martj42/international_results`, 49,257 matches from 1872-11-30 to 2026-06-01 (public GitHub repo). Schema per match: date, home team, away team, home score, away score, tournament name, city, country, neutral-venue indicator. 72 records with missing scores excluded.
- Elo ratings: computed by the authors from the match file, all teams start at R₀=1,500; match-importance weights κ ∈ {60 World Cup finals, 35 continental championships, 25 qualifiers, 20 friendlies/other}; home advantage ζ=100 non-neutral, ζ=0 neutral; goal-difference multiplier Γ (1 for ≤1 goal, 3/2 for 2, (11+Δg)/8 for ≥3).
- Training sizes: M1–M7 use n=20,775 matches from Jan 2000 to the barrier. SDR models (M8–M11) trained only on matches involving WC-qualified teams from Jan 2010: n=2,756 (2018 barrier; 47.2% home win / 23.8% draw / 29.0% away win) and n=4,179 (2022 barrier); refit for 2026 on n=7,082 matches to 2026-06-01.
- Test: 2018 WC (n=64) + 2022 WC (n=64) = 128 matches, information barriers at tournament opening matches.
- Excluded from SDR estimation: Curaçao (insufficient history; Elo-only Poisson fallback M3 used in simulation).

## 3. Method / model
Eleven models compared. The novel ones (M8–M11): build a K=6-dimensional vector of lagged monthly Elo differences per match, whiten it (x̃ = Σ̂_X^{-1/2}(x−x̄)), run categorical SDR (SIR or SAVE) on the 3 outcome classes to get projection B (K×d), then feed the d SDR scores z = Bᵀx̃ into a Poisson double-regression for home/away goals (Eqs. 4–5 analog, Eqs. 7–8). M8=SIR d=1, M9=SIR d=2, M10=SAVE d=1, M11=SAVE d=2. Baselines: M1 Elo-logistic, M2 full logistic (8 features), M3 Poisson with current Elo, M4 ARIMA-forecasted-Elo Poisson, M5 NNAR-forecasted-Elo Poisson, M6 XGBoost (400 rounds, depth 4, ν=0.05), M7 ensemble average of M1,M2,M3,M6. 2026 tournament forecast via N=5,000 Monte Carlo replications with official 48-team group structure and slot-template knockout bracket.

## 4. Equations & assumptions
- Elo update: R′_h = R_h + κΓ(S_h − E_h), E_h = 1/(1 + 10^{−(R_h+ζ−R_a)/400}); S_h ∈ {0, 0.5, 1}.
- SIR kernel: M̂_SIR = Σ_c π̂_c x̄_c x̄_cᵀ (whitened class means), rank ≤ C−1 = 2.
- SAVE kernel: M̂_SAVE = Σ_c π̂_c (I_K − Σ̂_c)² (class-conditional covariances), detects variance-separation (draws = low-variance regime).
- Poisson double regression: G^H_m ~ Poisson(λ^H_m), log λ^H_m = μ^H + Σ_j ξ_j z_{m,j} + δ^H N_m + η_1 Ḡ^+_h + η_2 Ḡ^−_a (home); mirror for away with −ξ sign. Scoreline grid truncated at g_max=8, probabilities renormalized.
- RPS: RPS_m = ½[(p̂^H_m − 1[Y_m=H])² + (p̂^H_m + p̂^D_m − 1[Y_m∈{H,D}])²]; uniform forecast expected RPS = 2/9.
- 2026: symmetrized probabilities P(h wins) = ½[P(H|h home) + P(A|a home)]; xPtŝ_t = N⁻¹Σ_s(3W_{t,s}+D_{t,s}); knockout draws resolved by 50/50 coin flip.
- Assumptions: goals conditionally independent given rates; matches conditionally independent; neutral venue (ζ=0) for all WC matches; class means/covariances stationary 2010–barrier.

## 5. Features / target
- SDR models: x_m ∈ ℝ⁶ (current + 5 lagged monthly Elo differences), whitened → z ∈ ℝᵈ (d=1,2), plus rolling goals scored/conceded (last 6) and neutral-venue indicator.
- Targets: home goals G^H_m and away goals G^A_m (Poisson), converted to outcome probabilities {H, D, A} by scoreline summation.
- Prediction horizon: single match; tournament stage probabilities via simulation.

## 6. Validation design
Strict information barriers at tournament opening matches; all parameters (including ARIMA orders, SDR kernels, Poisson coefficients) re-estimated separately per backtest from pre-barrier data only. Baselines: logistic (M1, M2), Poisson (M3), ARIMA/NNAR-forecast Elo (M4, M5), XGBoost (M6), ensemble (M7). Metric: ranked probability score (proper) + accuracy. 128 WC matches total across two backtests.

## 7. Numerical results / baselines
Table 4 combined RPS (n=128): M9 SIR d=2: **0.127** (2018: 0.121, 2022: 0.133), acc 0.688; M11 SAVE d=2: **0.127** (0.123/0.131), acc 0.680; M8 SIR d=1: 0.129, acc 0.688; M10 SAVE d=1: 0.129, acc 0.695; ensemble M7: 0.209, acc 0.547; M3 Poisson current-Elo: 0.212, acc 0.516; M4 ARIMA: 0.213; M5 NNAR: 0.214; M1: 0.219; M2: 0.217. Every SDR model beats every non-SDR model. The authors state the first direction carries almost all the gain; the second adds a small draw-probability refinement.
- Fitted M1: α̂=(0,−0.5932,−0.7781), β̂=(0,−0.00328,−0.00629), γ̂=(0,+0.262,+0.670).
- Fitted M3: μ̂^H=0.035, ξ̂=0.00146, δ̂^H=−0.085, μ̂^A=−0.442, δ̂^A=+0.263, η̂=(0.090,0.157,0.108,0.167).
- Spain vs Morocco illustration (Δ=200): M1 → (61.4%, 22.9%, 15.7%); M3 (λ^H=1.68, λ^A=0.89) → (63.1%, 22.6%, 14.3%).
- ARIMA orders across 47 WC teams: 30 chose (0,1,0), 3 (1,0,0), 3 (1,1,1), 2 (0,1,1), 2 (0,1,3), 2 (1,1,0), 5 other; NNAR(1,1,2) dominant (81% of teams).
- 2026 forecast: Spain champion probability 16.6% (SAVE) / 16.5% (SIR) from 5,000 sims; illustrative bracket final Spain–Argentina 50.7/49.3. (All pre-tournament numbers; now verifiable against reality — see §9.)

## 8. Code / data availability
None stated for model code. Match data: https://github.com/martj42/international_results. Method stack uses standard R functions (auto.arima, nnetar); no repository linked in the paper.

## 9. Leakage & limitations
- Small backtest: only 128 World Cup matches; the large RPS gap (0.127 vs 0.209) is impressive but the standard error of the mean RPS over 64-match blocks is wide — the within-group differences (e.g., d=1 vs d=2) are not reliably distinguishable.
- SDR models trained on matches of WC-qualified teams only (different, richer sub-population than M1–M7's all-matches training) — part of the gap may be training-population selection, not just the trajectory signal. The authors don't run M3 on the same restricted sample as an ablation.
- Class-mean alignment (x̄₀^H=+160.9, x̄₀^D=−9.4, x̄₀^A=−184.4) means SIR≈LDA on these data; the "SDR" win is mostly linear discriminant on history.
- Knockout draws settled by 50/50 coin flip — ignores extra-time/PK skill differences; goal independence assumed (Dixon–Coles low-score correction not applied); no team-specific attack/defense.
- Temporal: the 2026 World Cup was played 2026-06-11 to 2026-07-19 — the paper's flagship predictions are now checkable against realized outcomes (a replicability opportunity, not a flaw).
- External validity to NFL: soccer's Poisson goal structure does not transfer; the transferable component is the SDR-of-rating-history pipeline, which is sport-agnostic.

## 10. GSE overlap
Existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`): mentions Elo, Glicko, TrueSkill, Massey/Sagarin/Colley, "dynamic Elo", nested AR(1) team strength, and nfelo/nfelounits — ratings exist in the corpus. SDR (SIR/SAVE on rating histories) does NOT appear in the map: new capability, not a duplicate. GSE's engine predicts spread/moneyline/total — no Poisson-goal head exists, which is correct for football.

## 11. GSE implementation spec
1. Build per-team weekly rating-history panel from GSE's existing strength ratings (or nflverse EPA-based team ratings): K=6 lagged weekly rating differences per game.
2. Whiten the K-vector on training window; compute SIR kernel (class means on cover/no-cover/over-under classes) and SAVE kernel (class covariances); keep top d=2 eigenvectors (rank bound C−1=2 for 3-class outcomes).
3. Replace GSE's single current-rating-difference feature in the game-outcome head with the 2 SDR scores: ordered-logit or distributional head for margin and total.
4. Train on 2010–2023, validate 2024, test 2025 NFL seasons; compare against current-rating-only baseline on log-loss/Brier for ATS and totals.
Effort: ~2–3 days (rating panel + SIR/SAVE are ~50 lines of linear algebra; the head is existing).

## 12. Reproducible test
Dataset: nflverse 2010–2025 regular-season games (drop playoffs for training; test on 2025). Features: 6 lagged weekly rating-difference vectors from GSE's team-strength series, whitened. Model: SIR d=2 + ordered logit vs baseline ordered logit on current difference only. Metric: mean log-loss on ATS win/loss and O/U, time-ordered split (train ≤2023, val 2024, test 2025). Baseline to beat: the current-difference-only model.

## 13. Acceptance / rejection gate
ADAPT if the SDR-score model reduces mean log-loss vs the current-difference baseline by ≥0.005 on the 2025 test window with the same feature budget (no extra raw inputs); reject if the gain is <0.005 or vanishes when the baseline is given the same lagged vector unreduced (i.e., the win is just from using history, not the reduction).

## 14. Improvement experiment
SAVE's variance direction specifically isolates the draw (low-variance) regime in soccer. For NFL: build the SDR slices on outcome classes {cover, push/no-cover} × {over, under} (a 2×2 design) and test whether the second SAVE direction captures "high-variance game scripts" (weather, backup QB) — a variance-regime detector for totals that the mean-based rating difference misses. If it separates over/under residual variance out of sample, it becomes a totals-specific feature GSE doesn't have.
