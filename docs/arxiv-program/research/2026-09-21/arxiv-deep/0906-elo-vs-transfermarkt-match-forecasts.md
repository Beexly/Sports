# [0906] Match forecasts in UEFA club competitions: Elo ratings versus Transfermarkt valuations (arXiv:2609.21674v1)

## Citation / full-text source

- arXiv:2609.21674v1 — full text: https://arxiv.org/pdf/2609.21674
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Gergely Csurilla, László Csató (2026). *Match forecasts in UEFA club competitions: Elo ratings versus Transfermarkt valuations*. arXiv:2609.21674v1 [econ.EM]. URL: https://arxiv.org/abs/2609.21674v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 27 pages incl. appendix).
## Verdict

**ADAPT** — equal-weight forecast pooling of a performance-based rating with a market-implied strength measure is a cheap, proven upgrade path for GSE's NFL team-strength blend.

## 1. Research question
Are pre-season Football Club Elo ratings (strictly performance-based) and lagged Transfermarkt squad market values (crowd-based estimates of squad quality) substitutes or complements for forecasting UEFA Champions League and Europa League match outcomes? The paper compares Elo-only, Transfermarkt-only, joint, and forecast-pooled models, and asks which aggregation procedure is best for each of three forecast targets (goal difference, expected-goals difference, ordered win/draw/loss).

## 2. Dataset / schema
- Match records from FotMob (https://www.fotmob.com/): date, home/away clubs, final score, expected goals (xG). Covers UCL + UEL group stage, league phase, knockout, seasons 2020/21–2024/25. Qualifying rounds excluded; 3 cancelled/awarded fixtures excluded. **1,503 matches total; common Elo–Transfermarkt sample = 1,394.**
- Explanatory variables: (a) Football Club Elo Ratings (http://clubelo.com/) observed **1 September** of the forecast season; (b) lagged Transfermarkt squad market value from previous season (t−1), log-transformed. Transfermarkt coverage: 100% UCL, 98.3% Elo / 98.3% TM... precisely: Champions League N=689 (Elo 100%, TM 98.3%), Europa League N=814 (Elo 100%, TM 88.1%). 17 club-season observations lack lagged TM (mean Elo 1487.3 vs 1712.3 for covered — missingness concentrated in lower-rated clubs).
- COVID controls: home-venue indicator H_it, crowd-restriction indicator C_it (all of 2020/21 flagged + 8 verified closed-door matches 2021/22).
- Proprietary-ish but replicable: FotMob/clubelo/Transfermarkt are public web sources; no dump provided.

## 3. Method / model
- Three forecast targets: realized goal difference GD, expected-goals difference xGD (linear OLS, Eq. 6, with competition/phase/season FE + home controls); ordered outcome R∈{0,1,2} (ordered probit, Eqs. 7–8; multinomial logit, Eq. 11, as robustness).
- Five forecast specifications per target: historical expanding-window benchmark (mean / Laplace-smoothed frequencies), Elo-only, Transfermarkt-only, joint Elo+TM (same equation), equal-weight pool of the two single-indicator forecasts, and an estimated combination (OLS stacking for continuous targets; convex RPS-minimizing weight ω∈{0,0.05,…,1} for probabilities) estimated only on earlier out-of-sample forecasts.
- Expanding-window recursive forecasts; headline evaluation = 2023/24 (238 matches) + 2024/25 (362) = **600 evaluation matches**; 2022/23 (238) used to fit combination parameters.
- Robustness: 7 sample restrictions (no extra time, no finals, no neutral/relocated, no 2nd legs, no last matchday, both, no 2024/25 league phase) + league-phase slope-break diagnostics + Elo functional-form check.

## 4. Equations & assumptions
- (1) GD_it = G^h_it − G^a_it; (2) xGD_it = xG^h_it − xG^a_it; (3) R_it ∈ {0,1,2} ordered outcome.
- (4) Elo_it = Elo^h_t − Elo^a_t (1-Sept snapshot); (5) TM_it = log V^h_{t−1} − log V^a_{t−1}.
- (6) Y_it = α + X_it′β + γ_H H_it + γ_C H_it C_it + δ_c(i) + ρ_p(i) + λ_t + u_it (OLS).
- (7) R*_it = X_it′β + γ_H H_it + γ_C H_it C_it + δ_c(i) + ρ_p(i) + λ_t + ε_it, ε∼N(0,1); (8) R_it = j iff κ_{j−1} < R*_it ≤ κ_j, cutpoints freely estimated, no intercept.
- (11) Multinomial logit with draw as base (η_1 = 0).
- (12) Out-of-sample R² vs expanding historical benchmark; (13) RPS = (1/2N)Σ_iΣ_{k=0}^{1}(Σ_{j=0}^{k} p̂_ij − 1{R_i ≤ k})², reported ×100; (14) Brier; (15) log loss; (16) loss differentials Δ_i = L_iA − L_iB with cluster-robust (unordered team-pair-season) SEs, Diebold–Mariano style t-tests.
- (17) Ŷ^eq = 0.5 Ŷ^Elo + 0.5 Ŷ^TM; (18) outcome-by-outcome probability averaging; (19) stacking Ŷ^stack = a_t + b_E Ŷ^Elo + b_T Ŷ^TM (unconstrained); (20) p̂^rps = (1−ω)p̂^Elo + ω p̂^TM, ω minimizing prior RPS; (21) Elo expected score W_it(h) = 1/(1+10^{−(Elo_it + h H_it)/400}).
- Assumptions: indicators fixed at season start (no within-season updating); forecasts conditional on realized fixtures/contexts; no outcome/xG leakage from forecast season; season FE omitted at forecast origin.

## 5. Features / target
Features: Elo difference, log Transfermarkt difference (standardized in-sample), home-venue indicator + crowd-restriction interaction, competition/phase/season FEs. Targets: goal difference, xG difference, ordered W/D/L (home perspective).

## 6. Validation design
Time-ordered expanding window (no shuffling): train on all seasons τ < t, forecast season t, indicators frozen pre-season. 600-match headline evaluation across two seasons. Baselines: historical expanding-window mean/frequencies; Elo-only vs TM-only vs joint vs two pools. Metrics: RMSE, OOS R², RPS (headline for probabilities), Brier, log loss, success rate (descriptive). Pairwise significance via clustered loss-differential t-tests.

## 7. Numerical results / baselines
- In-sample (Table 4, N=1394): GD adj-R² = 0.254 (Elo), 0.236 (TM), 0.261 (joint); standardized coefs 0.977 / 0.938 single, 0.662 / 0.358 joint. xGD adj-R² = 0.297 / 0.295 / 0.314. Ordered probit pseudo-R² = 0.108 / 0.100 / 0.112. Correlation(Elo diff, log-TM diff) = **0.877**.
- Out-of-sample (Table 5, N=600). GD RMSE / R²: Historical 1.958/0.000; Elo 1.710/0.237; TM 1.710/0.237 (identical at reported precision); Joint 1.698/0.248; Equal-weight 1.695/0.251; Stacked 1.686/0.259.
- xGD RMSE / R²: Historical 1.386/0.000; Elo 1.183/0.272; TM 1.186/0.268; Joint 1.173/0.284; Equal-weight 1.172/0.285; Stacked 1.168/0.290.
- Ordered probit 100×RPS / Brier / log loss / success: Historical 23.068/0.207/1.029/0.510; Elo 19.729/0.183/0.932/0.558; TM 19.533/0.182/0.928/0.577; Joint 19.539/0.182/0.926/0.560; **Equal-weight 19.431/0.182/0.923/0.568**; Estimated 19.480/0.182/0.925/0.563. (Multinomial logit nearly identical; eq-pool 19.452.)
- Pairwise tests (Table 6, RPS×100): Equal-weight vs Elo Δ=−0.297, SE 0.148, 95% CI [−0.588,−0.007], **p=0.045**; vs TM Δ=−0.102, SE 0.150, p=0.499 (not significant). Joint vs Elo p=0.012; Joint vs TM p=0.980. Estimated pooling never significantly beats equal weighting.
- Estimated probability-pool weights: ω = 0.35–0.40 on Transfermarkt (Table A.1); stacking slopes for GD ≈ (0.608, 0.466) 2023/24, (0.587, 0.454) 2024/25 with intercepts 0.234/0.268.
- Ranking flips by season (Table A.2): joint best in 2023/24, TM-only best in 2024/25; equal-weight best only over the pooled 600. Robustness: equal-weight pool has best RPS under **all 7 sample restrictions** (Table 7). No league-phase slope break (all p > 0.2, Table 8). Raw Elo difference beats canonical Elo expected-score transform (Table A.5).
- Calibration (Table A.4): observed home-win frequency exceeds mean predicted probability **in every bin** (e.g., joint model [0.0,0.2) bin: predicted 0.133 vs observed 0.236) — systematic under-prediction of home wins.

## 8. Code / data availability
None stated. Data sources named (FotMob, clubelo.com, transfermarkt.com) but no replication package or code link.

## 9. Leakage
Clean by design: indicators frozen at pre-season (1-Sept Elo, lagged TM), expanding window, no within-season outcome leakage. Minor: Elo on 1 Sept technically post-dates some early domestic matches; TM "lagged" values are crowd estimates that may already embed knowledge of summer transfers for season t — mild information overlap, acknowledged. Missing-TM club-seasons skew low-Elo (selection). Stacking weights estimated on only 238 forecasts — high variance (why equal weights won for probabilities).

## Limitations
- Combination gains are small everywhere (GD RMSE 1.710 → 1.686; RPS 19.729 → 19.431) and model rankings flip across seasons — the "best" aggregator is target- and season-dependent.
- Pre-season-only design deliberately ignores betting odds (the strongest known signal) and within-season updating — not a recipe for the best possible model, only for the best fixed-origin blend.
- Soccer-only, 5 seasons, 2 competitions; 600 evaluation matches is modest for probability-score distinctions (TM vs Elo p=0.510).
- Systematic home-win miscalibration in all models; paper reports it but does not fix it.
- No code/data released; Transfermarkt values have known heterogeneous bias (Coates & Parshakov 2022).

## 10. GSE overlap
GSE already holds both ingredients the paper blends: performance-based ratings (Elo, nfelo/nfelounits, Massey/Sagarin/Colley, benbbaldwin objective ratings in the 2026-09-17/18 benchmark drops) and market-implied strength (benbbaldwin market-implied tiers, de-vigged consensus, CLV-as-label per existing-research-map). The existing-research-map covers "market microstructure" and "ratings" lanes but **no paper read yet tests forecast pooling of the two families head-to-head with proper scoring rules**, and none documents the continuous-target (stacking) vs probability-target (equal-weight) split. This is an extension, not a duplicate. RPS is not currently in GSE's reported metric set (Brier/log loss/ECE are).

## 11. GSE implementation spec
1. Build weekly-frozen NFL analog: GSE Elo (performance) + market-implied spread/total-implied team strength (de-vigged closing lines, e.g. Pinnacle via The Odds API) as the two fixed-origin indicators per game-week.
2. Fit three outcome models per the paper: margin OLS, (xG analog: EPA-differential OLS), ordered probit on W/D/L — or map to GSE's existing spread/moneyline/total pipeline.
3. Implement the five-way comparison: single-indicator models, joint model, equal-weight pool, expanding-window estimated stacking (continuous) / RPS-grid weights (probabilities).
4. Add RPS (×100) to the calibration dashboard alongside Brier/log loss.
5. Effort: small — 1–2 days of modeling on existing nflverse + odds tables; no new data licensing.

## 12. Reproducible test
Dataset: nflverse 2018–2025 regular seasons + de-vigged Pinnacle closing lines (existing Odds API captures). Protocol: expanding-window weekly forecasts, indicators frozen Tuesday pre-week; evaluate 2023–2025 seasons. Baselines: GSE Elo-only, market-only, joint, equal-weight pool, estimated stacking. Metrics: RMSE/OOS-R² on margin, RPS/log loss on moneyline-implied trichotomy (or binary home-win Brier). Gate below.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the pooled blend iff the equal-weight pool beats GSE-Elo-only by ≥ 0.10 RPS×100 with Diebold–Mariano p < 0.05 (clustered by matchup-season) on the 2023–2025 test window; REJECT (keep single best) otherwise. For margin RMSE, require ≥ 0.01 RMSE improvement from stacking at p < 0.10.

## 14. Improvement experiment
The paper's estimated weights lose to fixed 0.5 weights for probabilities (estimation noise on 238 forecasts). Try **shrinkage pooling**: ω̂ = λ·0.5 + (1−λ)·ω_RPS with λ chosen on the expanding window, or hierarchical weights by week (early-season → more market weight, late-season → more performance weight), since market values embed off-season information while Elo needs games to learn. Also fix the paper's unaddressed home-win miscalibration with a post-hoc intercept recalibration per bin before pooling.

**Verdict: ADAPT** — the equal-weight performance+market pooling result is directly portable to GSE's NFL rating blend, with RPS as the headline scoring rule.
