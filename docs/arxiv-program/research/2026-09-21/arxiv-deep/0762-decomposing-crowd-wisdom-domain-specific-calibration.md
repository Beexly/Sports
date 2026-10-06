# [0762] Decomposing Crowd Wisdom: Domain-Specific Calibration Dynamics in Prediction Markets (arXiv:2602.19520v2)

**Citation:** Nam Anh Le (2026). *Decomposing Crowd Wisdom: Domain-Specific Calibration Dynamics in Prediction Markets*. arXiv:2602.19520v2. URL: https://arxiv.org/abs/2602.19520
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2602.19520.txt`; complete paper incl. appendices, verified end-to-end).
**Verdict:** ADAPT — the logistic-recalibration slope framework, horizon/domain decomposition, extremizing transform, and Bayesian measurement-error calibration are directly portable to GSE's market-relative probability calibration; adopt the measurement recipe, adapt the domain taxonomy to sports-specific structure (sport × days-to-kickoff × line-move).

## 1. Research question
Are prediction-market prices interpretable as probabilities, and if calibration is imperfect, what is its structure? Using Kalshi + Polymarket trade-level data (note: the assignment abstract says "353 million trades across 429,000 binary contracts"; the paper body reports 292 million trades across ~327,000 contracts — 64.7M on 210,608 Kalshi markets + 227.6M on 116,000 resolved Polymarket contracts), the author asks whether calibration is a domain-agnostic property or a structured function of event domain, time-to-resolution, and trade size.

## 2. Dataset / schema
Two pre-collected datasets via Jonathan Becker's framework (github.com/Jon-Becker/prediction-market-analysis):
- **Kalshi** (CFTC-regulated CLOB, binary $1.00/$0.00 contracts, prices $0.01–$0.99): 64.7M trades across 210,608 binary contracts, ~16.8B contracts traded, cutoff 2025-12-31. Per trade: contract id, execution price (cents), # contracts, initiator side, ms-precision timestamp. Per market: contract id, event category, resolution status, outcome (yes/no), close time. 98.6% of past-close markets resolved definitively.
- **Polymarket** (Polygon blockchain, same CLOB mechanism, pseudonymous wallets): 227.6M trades across 116,000 resolved contracts, 61.3B contracts traded. Timestamps from block numbers with ~3-hour noise (two shortest time bins unreliable).
- Six Kalshi domains via deterministic ticker-prefix mapping: Sports (NFL/NBA/MLB/NHL), Politics, Crypto, Finance, Weather, Entertainment. Polymarket via regex on market titles: only Sports/Crypto/Politics comparable (Finance thin: 2,516 vs 38,058; Weather/Entertainment negligible; 42.5% "Other").
- Table 1 domain stats (Kalshi): Sports 55,637 markets / 43.2M trades / median vol 76 / base rate 41.3%; Politics 6,609 / 4.9M / 127 / 40.2%; Crypto 76,181 / 6.5M / 35 / 40.7%; Finance 38,058 / 4.3M / 38 / 37.7%; Weather 26,911 / 4.4M / 74 / 24.0%; Entertainment 7,212 / 1.5M / 60 / 38.0%. Trade sizes heavily right-skewed: median 40 contracts; 0.15% of trades (>10,000 contracts) = ~15% of contract volume.

## 3. Method / model
(a) **Cell-level logistic recalibration**: for trades with price p_i in (0,1) and outcome y_i in {0,1}, fit logit(P(y_i=1)) = a + b·logit(p_i) by MLE (L2 C=10). Slope b is the calibration measure: b=1 calibrated; b>1 underconfident (compressed toward 50%, favourite–longshot bias); b<1 overconfident (too extreme). Filtered to prices [5,95] cents, markets ≥10 trades, ≥200 trades per analysis cell. Grid: 6 domains × 9 horizon bins × 4 size bins = 216 cells. 58.7M Kalshi + 220.1M Polymarket trades enter the calibration analysis.
(b) **Additive decomposition** (frequentist, sequential projection Type I): θ(d,τ,s) = μ(τ) + α_d + β_d(τ) + γ_d(s) + ε, with sum-to-zero identifying constraints on α, β(·), γ(·). 72 parameters / 216 cells.
(c) **Bayesian hierarchical model** (NumPyro HMC, 4 chains × 4000 iters, 2000 warmup; max R̂=1.000, min bulk ESS 4,070, no divergences): θ_obs ~ N(μ(τ)+α_d+β_d(τ)+δ_d·(log s − mean log s), σ²); μ(τ)~N(1.0,0.5²); α~N(0,σ_α²) sum-to-zero; β~N(0,σ_β²) doubly centred; δ~N(0,σ_δ²); HalfCauchy(0,1) hyperpriors. Non-centred parameterisation.

## 4. Equations & assumptions
(1) logit(P(y_i=1)) = a + b·logit(p_i), logit(x)=log{x/(1−x)}. (2) Log-likelihood ℓ(a,b)=Σ_i[y_i log π_i + (1−y_i) log(1−π_i)], π_i=σ(a+b·logit(p_i)). (3) θ(d,τ,s)=μ(τ)+α_d+β_d(τ)+γ_d(s)+ε with constraints Σ_d α_d=0, Σ_d β_d(τ)=0 ∀τ, Σ_s γ_d(s)=0 ∀d. (7) SS_tot=Σ[θ−θ̄]². (8) SS_res=Σ[θ−θ̂]². (9) WLS: φ̂=argmin Σ w[θ−θ̂]², w=1/SE². (10) Δ_d=(1/T)Σ_τ[θ(d,τ,s_L)−θ(d,τ,s_S)]. (11)–(16) Bayesian levels (see §3c). (17) Recalibration transform: p* = σ(θ̂·logit(p)) = p^θ̂/(p^θ̂+(1−p)^θ̂); θ̂>1 extremises, θ̂<1 moderates. Example (18): p=0.70, θ̂≈1.83 (politics, 1 week out) → p*≈0.83.
Assumptions: logistic recalibration slope in logit space is a valid scalar calibration summary; additive separability of domain/horizon/size (tested: multiplicative log-slope fit nearly identical; size×horizon interaction adds only 2.6% variance); analysis cells are independent-ish (bootstrap clustering addresses market-level serial correlation); within-cell stationarity over the sample period (limitation §7.5: stability over time is "an open question").

## 5. Features / target
Features (analysis covariates): domain d (6), time-to-resolution τ (9 bins: 0–1h, 1–3h, 3–6h, 6–12h, 12–24h, 24–48h, 2d–1w, 1w–1mo, 1mo+), trade-size s (4 bins: Single=1, Small 2–10, Medium 11–100, Large>100). Target: realised binary outcome y_i; the modelled quantity is the cell-level recalibration slope b (one slope per 216 cells).

## 6. Validation design
Descriptive decomposition on the full Kalshi sample (no train/test split — it is a measurement study, not a forecasting model; the paper is explicit the decomposition is descriptive). Validation comes from: (i) cross-platform replication on Polymarket (structurally different exchange, 11× deeper politics liquidity); (ii) Bayesian hierarchical model with posterior predictive check; (iii) trade-level and market-clustered bootstraps; (iv) Type I/II/III sums-of-squares robustness; (v) price-range ([2,98],[10,90],[1,99]) and regularisation (C=1,10,100) robustness; (vi) inverse-variance-weighted decomposition. Baselines: a domain-agnostic single-slope model is implicitly the null the paper rejects (it "misses the largest source of calibration variation").

## 7. Numerical results / baselines
- Variance decomposition (Type I): universal horizon μ 30.2%, domain intercept α 14.6%, domain×horizon β 26.0%, domain×size γ 16.5%; total R²=0.873, adjusted 0.810 (72 params, 216 cells, residual 12.7%). Type II/III: β 26.0%, γ 16.1–16.5% regardless of order. Weighted (1/SE²): total R²=0.995, μ dominates at 0.74.
- F-tests: α F(5,144)=33.16; β F(40,144)=7.40; γ F(18,144)=10.42 — all p<10⁻¹⁶.
- Horizon effect: cell-mean μ(τ) rises from 0.99 (0–1h) to 1.32 (1mo+).
- Domain slopes by horizon (Kalshi, Table 3): Politics 1.34/0.93/1.32/1.55/1.48/1.52/1.83/1.83/1.73; Sports 1.10/0.96/0.90/1.01/1.05/1.08/1.04/1.24/1.74; Crypto 0.99/1.01/1.07/1.01/1.01/1.21/1.12/1.09/1.36; Finance 0.96/1.07/1.03/0.97/0.98/0.82/1.07/1.42/1.20; Weather 0.69/0.84/0.74/0.87/0.91/0.97/1.20/1.20/1.37; Entertainment 0.81/1.02/1.00/0.92/0.89/0.84/1.07/1.11/0.96.
- Bayesian domain intercepts (posterior mean, 95% CI): Politics +0.151 [0.122,0.179]; Sports +0.010 [−0.020,0.039]; Crypto +0.005; Finance +0.006; Weather −0.086 [−0.115,−0.057]; Entertainment −0.085 [−0.114,−0.056]. Max frequentist/Bayesian discrepancy 0.005.
- Politics scale effect: Large 1.74 vs Single 1.19; Δ=+0.53, 95% trade-level bootstrap CI [0.29,0.75]; market-clustered mean +0.59 CI [0.13,1.29]. Sports Δ=+0.07 [−0.07,0.26] (null). Polymarket politics Δ=+0.11 [−0.15,0.39] (not significant) — platform-specific.
- Contract-weighted vs trade-weighted slopes in Politics: contract-weighted exceeds trade-weighted by mean 0.33 (peak 0.54 at 2d–1w); Polymarket gap collapses to +0.05.
- Bayesian scale sensitivity: Politics δ=+0.088 [0.072,0.103], only domain with CI above zero.
- Posterior predictive: 208/216 cells (96.3%) inside 95% intervals.
- Politics subcategories (Section 4): Electoral College 1.53–2.87; Other Politics 1.42–2.38; Governor 1.19–4.02; NYC Mayor 1.12–3.18; Trump Administration 0.54–1.64 across time bins.
- Polymarket cross-platform means (7 reliable bins): Politics 1.313 vs Kalshi 1.637; Sports 1.082 vs 1.150; Crypto 1.049 vs 1.114.
- Robustness (Appendix A): total R² 0.861–0.885 across price ranges; identical at C=1/10/100 and with volume≥100 filter.

## 8. Code / data availability
Analysis code, domain classification rules (560+ Kalshi ticker patterns, Polymarket regexes), and the full 216-cell calibration matrix (CSV) at https://github.com/namanhz/prediction-market-calibration and as supplementary material. Data collection framework/pre-collected dataset: https://github.com/Jon-Becker/prediction-market-analysis/; raw data public via Kalshi API (trading-api.readme.io) and Gamma API/Polygon indexer.

## 9. Leakage & limitations
No lookahead leakage by design (prices precede resolution; slopes are measurement, not forecasts). Adversarial notes: (i) abstract-vs-body discrepancy (353M/429K vs 292M/~327K) suggests the abstract describes an earlier sample; (ii) cells are not independent — trades within a market are serially correlated; the author mitigates with market-clustered bootstraps but the decomposition regression itself treats 216 cell slopes as independent observations; (iii) Polymarket timestamps have ~3h noise, contaminating short-horizon bins; (iv) the scale effect does not replicate on Polymarket — the highest-leverage trading finding is platform-specific; (v) domain classification is coarse (Simpson's-paradox diagnostic shows the politics 1–3h bin is a subcategory mix); (vi) trader identities unobserved, so the bilateral-cancellation mechanism is hypothesis, not identification; (vii) temporal stability untested — decomposition may drift; (viii) US-centric platforms only.

## 10. GSE overlap
Extension, not duplicate. The research map (~/workspace/arxiv-sweep/existing-research-map.md) already covers GSE's calibration stack: CQR, grouping loss (2210.16315), temperature scaling, Platt scaling, isotonic regression, Venn-Abers, reliability diagrams/LRD (2207.13770), ECE by sport/week. What is NEW here: (a) the logistic-recalibration **slope as a function of market structure** (domain × horizon × size) rather than a global post-hoc fix; (b) the **extremizing transform** p*=p^θ/(p^θ+(1−p)^θ) with empirically estimated θ per slice; (c) the **universal horizon effect** — favourite–longshot bias worsening with time-to-event, a direct analogue of GSE futures/prop markets far from resolution; (d) trade-weighted vs contract-weighted aggregation insight (relevant to how GSE blends market feeds); (e) Bayesian hierarchical calibration with measurement-error propagation for noisy per-cell slopes.

## 11. GSE implementation spec
- **Data**: GSE engine probabilities + realised outcomes across 2020–2025 nflverse + sportsbook closing lines / odds-API snapshots (The Odds API, 20K credits/mo plan). Slice engine probabilities into cells: sport (NFL/NCAAF/MLB...) × days-to-event bins (game-day, 1–3d, 3–7d, 7d+, futures) × stake/liquidity bins.
- **Method**: Fit per-cell logistic recalibration logit(P(y))=a+b·logit(p̂) exactly per §2.3 (prices restricted to [0.05,0.95], ≥200 obs/cell, L2 C=10). Fit the additive decomposition θ=μ(τ)+α_sport+β_sport(τ)+γ_sport(liquidity) with the paper's sum-to-zero constraints (72→adapted parameter count).
- **Serving**: store the fitted per-cell θ̂ in a calibration table; at inference, map each engine probability to p* = p^θ̂/(p^θ̂+(1−p)^θ̂) before Kelly sizing or publication. Re-fit monthly; track cell slope drift as a monitoring metric.
- **Extension experiment**: test whether sportsbook-implied probabilities need the same θ as engine probabilities (two calibration matrices: engine→outcome, book→outcome) to detect where GSE's edge is miscalibration vs information.
- Effort: ~2–3 days for the per-cell recalibration + decomposition; ~1 day to wire p* into the existing calibration stack (sits before/after temperature scaling — test ordering).

## 12. Reproducible test
Dataset: GSE engine win-probability picks 2023–2024 NFL seasons with realised outcomes (nflverse pbp outcomes). Metric: log loss and ECE on held-out 2025 NFL season, comparing (i) raw engine probabilities, (ii) globally Platt-scaled (existing baseline), (iii) per-cell extremized p* with θ̂ fit on 2023–2024 cells (sport×horizon slices). Gate in §13.

## 13. Acceptance / rejection gate
ADOPT the per-cell extremizing layer if, on the 2025 NFL held-out season, p* beats global Platt scaling by ≥0.003 log-loss AND ≥10% relative ECE reduction, with the per-cell θ̂ estimates statistically distinguishable from 1 (95% CI excluding 1 in ≥3 of the sport×horizon cells). Otherwise REJECT as not worth the complexity over the existing calibration stack.

## 14. Improvement experiment
Extend the decomposition with a **market-disagreement covariate**: for each event, compute the cross-book implied-probability spread (The Odds API consensus) and add δ·spread to the slope model. Hypothesis: bilateral-cancellation-style compression also exists across sportsbooks — events with wide book disagreement should show engine underconfidence (θ>1) because the engine hedges the disagreement. If validated, recalibrate conditionally on live book spread, not just static sport×horizon cells.
