# [2184] Time Series Prediction under Distribution Shift using Differentiable Forgetting (arXiv:2207.11486v1)

**Citation:** Stefanos Bennett and Jase Clarkson (2022, Oxford / Alan Turing Institute). *Time Series Prediction under Distribution Shift using Differentiable Forgetting*. ICML Workshop on Principles of Distribution Shift 2022. arXiv:2207.11486v1. URL: https://arxiv.org/abs/2207.11486
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* gradient-learned forgetting curves (bi-level optimization) replace ad-hoc fixed rolling windows for training under regime change; directly applicable to weighting historical NFL seasons when training GSE's engine (coaching/QB/era shifts = distribution shift), with a concrete implementable algorithm and open code.

## 1. Research question
Time-series prediction under distribution shift (concept drift) is usually handled with hand-chosen forgetting: fixed windows, exponential decay with grid-searched rate. Can the forgetting mechanism itself be *learned* — its parameters optimized by gradient descent on validation performance — so that more expressive (multi-parameter) decay shapes become fittable, trading off sample relevancy against effective sample size automatically?

## 2. Dataset / schema
- **Synthetic** (from Kuznetsov & Mohri 2020): 4 settings × 192 Monte Carlo runs, t = 1..3000, ε_t ~ N(0, 0.05²): FixedRegime (θ_t = -0.9 on t∈[1000,2000], 0.9 else — abrupt change points), RandomWalk (θ_t = 1 - t/1500 — gradual drift), RandomRegime (stochastic switching between θ=-0.5/0.9 — irregular change points), Stat (θ=-0.5 constant — no shift). Features: X_t = (Y_{t-1}, Y_{t-2}, Y_{t-3}), no-intercept linear model. Split: train t=1..2875, validation 2876..2975, test 2976..3000.
- **Real financial:** 19 years of daily log-returns for 50 NYSE equities. Task 1 (Factor): Fama–French 3-factor risk model — Y_t^(i) - RF_t = θ_t^(i)T X_t, X_t = (1, MR_t, SB_t, HL_t), θ∈R⁴. Task 2 (Vol): forecast next-day |return| for 15 ETFs from 5 lagged absolute returns, θ∈R⁵. Protocol: expanding time-series CV — start with 6 years training, 150-day validation, next 150 days out-of-sample; roll forward 150 days per update.

## 3. Method / model
Weighted ERM: R̂_t(θ) = Σ_{τ=1}^{t-1} α_{|t-1-τ|} L(f(X_τ;θ), Y_τ), where weights come from a forgetting mechanism α(i;η) parameterized by η. Two mechanisms: (3) exponential decay α(τ;η) = exp(-η₁τ) → **GradExp**; (4) mixed decay α(τ;η) = exp(-η₁τ - η₂τ² - η₃log(τ+1)) → **GradMixedDecay**. Joint bi-level optimization: min_η g^U(η, θ̂) s.t. θ̂ ∈ argmin_θ g^L(η,θ), with g^U = validation loss (most recent T-t* samples — assumes distribution changes little over short spans, Kuznetsov & Mohri) and g^L = α-weighted training loss. Differentiated via the implicit function theorem (Gould et al. 2016, Lemma 3.1): ∂θ̂/∂η_i = -(∇²_θ g^L|θ̂)^-1 ∂/∂η_i ∇_θ g^L|θ̂, then chain rule for d g^U/dη_i. Training: 5 restarts from random init, 50 epochs SGD each. Baseline GradSearchExp: same mechanism (3) fit by grid search. Baselines: Stationary (unweighted), Window (uniform fixed-length recent window), StateSpace (random-walk parameter state), ARIMA, DBF (Kuznetsov & Mohri two-step discrepancy-based forecasting).

## 4. Equations & assumptions
- One-step-ahead path-dependent risk: R_t(θ) = E_{Y_t~π_t(·|X_t)}[L(f(X_t;θ), Y_t) | {(X_τ,Y_τ)}_{τ=1}^{t-1}]; time-varying conditional label distribution Y_t|X ~ π_t(·|X).
- Risk estimator: R̂_t(θ) = Σ_{τ=1}^{t-1} α_{|t-1-τ|} L(f(X_τ,θ), Y_τ).
- Forgetting mechanisms: α(τ;η) = exp(-η₁τ); α(τ;η) = exp(-η₁τ - η₂τ² - η₃log(τ+1)).
- Bi-level: min_η g^U(η,θ̂(η)), θ̂(η) = argmin_θ g^L(η,θ); g^U(η,θ) := Σ_{(X_t,Y_t)∈D_valid} L(f(X_t,θ),Y_t); g^L(η,θ) := Σ_{(X_τ,Y_τ)∈D_train} α(t*-τ;η) L(f(X_τ,θ),Y_τ).
- Implicit differentiation (Lemma 3.1, Gould et al. 2016): ∂θ̂(η)/∂η_i = -(∇²_θ g^L(η,θ)|θ̂)^-1 ∂/∂η_i ∇_θ g^L(η,θ)|θ̂ (requires g^L twice continuously differentiable in each argument).
- Assumptions: (i) validation = most recent samples, justified by "distribution does not change substantially in a small time span"; (ii) monotone-decreasing forgetting encodes "recent samples more relevant"; (iii) more expressive mechanisms trade adaptivity for effective sample size; (iv) Wilcoxon significance caveat (see §9).

## 5. Features / target
Synthetic: features = 3 lags of the series; target = next value Y_t. Real Factor task: features = (1, market MR, size SB, book-to-market HL factors); target = equity excess return. Real Vol task: features = 5 lagged absolute returns; target = next-day absolute return. Prediction horizon: one step ahead.

## 6. Validation design
Synthetic: fixed time-ordered split (train/val/test as above), 192 Monte Carlo runs per setting; paired Wilcoxon signed-rank test at 5% vs the best model per dataset. Real: expanding-window time-series CV (6y train / 150d val / 150d OOS, stepped 150 days). Baselines: Stationary, Window, StateSpace, ARIMA (not for factor task), DBF. Metric: MSE.

## 7. Numerical results / baselines
Table 1 — MSE (best per column bold; star = significantly worse than best at 5%, paired Wilcoxon). Columns: FixedRegime ×10⁻³, RandomWalk ×10⁻³, RandomRegime ×10⁻³, Stat ×10⁻³, Factor ×10⁻⁴, Vol ×10⁻⁵:
- Stationary: 4.00*, 17.2*, 4.20, 2.54, 2.60*, 8.77
- Window: 2.62*, 3.10*, 4.63*, 2.57*, 2.62*, 8.96
- StateSpace: 2.73**, 3.30*, 5.25*, 2.60*, 3.81*, 9.75*
- Arima: 2.65*, 13.4*, 4.41*, 2.57*, –, 9.24*
- Dbf: 4.44*, 23.3*, 4.55*, 2.64*, 5.11*, 10.7*
- GridSearchExp: 2.63, 3.00, 4.31*, 2.58*, 2.59*, 8.94
- GradExp: 3.96*, 17.2*, 4.20, 2.55, 2.59*, 8.77
- GradMixedDecay: 2.60, 2.80, 4.39*, 2.57*, 2.49, 8.76
Paper's claims: GradMixedDecay best in 4 of 6 datasets (FixedRegime, RandomWalk, Factor, Vol) and near-best in RandomRegime and Stat; GradExp ≈ GridSearchExp, showing gradient optimization matches grid search where grid search is feasible, while enabling the more expressive 3-parameter mechanism that grid search cannot afford. In the no-shift Stat setting, Stationary (2.54) wins — forgetting only helps under actual shift.

## 8. Code / data availability
Code: https://github.com/jase-clarkson/pods_2022_icml_ts. Financial data: 19y NYSE daily returns (proprietary source; processing in Appendix A — not fully replicable without the same vendor feed).

## 9. Leakage & limitations
Adversarial read: (i) real-data Wilcoxon tests violate the independence assumption (correlated time series) — authors disclose this; significance stars on real columns are overstated; (ii) Vol column: GradMixedDecay 8.76 vs Stationary 8.77 — a tie, not a win; (iii) synthetic settings are AR(1) with known breaks — far simpler than NFL regime change; (iv) gradient fitting needs 5 restarts × 50 SGD epochs per model update — cost scales with refits, though cheap for linear models; (v) implicit differentiation needs twice-differentiable lower-level objectives — incompatible with tree models (LightGBM) unless the forgetting weights are fit on a differentiable surrogate then frozen; (vi) the "validation = most recent data" assumption breaks under abrupt mid-validation regime change (exactly when forgetting matters most); (vii) NFL seasons are ~17 games — the effective-sample-size tradeoff bites much harder than in 19 years of daily data.

## 10. GSE overlap
GSE's engine training protocol is not documented in the existing-research map as using learned sample weighting — the 2026-09-17 gse-lab drop computes hand-built metrics with implicit fixed windows, and "online learning" is a commissioned-but-unresulted topic in the 2026-09-18 ML brief. Era/coaching/QB regime change (e.g., pre/post-2011 CBA rest edges, rule changes, new OCs) is exactly the paper's "distribution shift" setting, and GSE currently handles it with fixed windows at best. New capability: a principled, gradient-fitted alternative to hand-chosen lookback windows, with the mixed-decay mechanism able to learn non-monotone relevance (e.g., "last season matters, 2 seasons ago less, but the same-coach era 3 seasons ago matters again" — something pure exponential decay cannot express but the η₂τ²/η₃log terms approximate).

## 11. GSE implementation spec
1. Data: per-game team feature rows 2009–2026 (nflverse): features = gse-lab metric set; target = ATS cover / win.
2. Model: logistic regression (differentiable — required by Lemma 3.1) as the surrogate for the η-fitting step; then apply learned weights to the production LightGBM as sample weights (two-stage, sidestepping the non-differentiability limitation).
3. Forgetting mechanisms: fit α(τ;η) = exp(-η₁τ) and the mixed form (4) on a rolling basis each offseason: train = games from 2009 to season S-1, validation = season S-1 (most recent full season), using the bi-level gradient routine (5 restarts × 50 epochs; cheap for logistic regression).
4. Deployment: weight each historical game by α(age-in-games; η̂) when training the season's engine; η̂ refit each offseason and mid-season at the Week 9 checkpoint.
5. Regime-aware extension: fit separate η per era segment (pre/post major rule change) — the paper's future-work direction, doable immediately.
6. Effort: ~3 engineer-days (logistic surrogate + bi-level loop + weight plumbing into LightGBM sample_weight).

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level rows, features = EPA/play, success rate, dropback/rush EPA, turnover margin, pressure rate (both teams), target = ATS cover vs closing line. Baselines: (a) Stationary = unweighted logistic regression on all history; (b) Window = last 3 seasons uniform. Candidate: logistic regression with GradMixedDecay weights fit per the paper's protocol (train 2015–2023, validation 2024, test 2025; then roll: train 2015–2024, val 2025 for the final read). Metric: log-loss on the held-out season + Brier score. Leakage control: strictly expanding windows; validation = most recent season exactly as the paper prescribes.

## 13. Acceptance / rejection gate
**Adopt learned forgetting weights iff** the GradMixedDecay-weighted model beats BOTH baselines (Stationary and 3-season Window) by ≥ 0.003 log-loss on the held-out 2025 season AND the learned decay curve is non-degenerate (effective sample size ≥ 300 games — guards against η̂ collapsing to "last month only"). Reject if it fails to beat the fixed Window baseline (the paper's own Stat-setting result warns forgetting adds nothing without real shift), or if the two-stage surrogate (logistic η̂ → LightGBM weights) shows a sign flip vs the paper's linear-model results. Mid-season refit only if the offseason fit clears the gate.

## 14. Improvement experiment
Beyond the paper: learn **feature-group-specific** forgetting curves — separate η vectors for (i) personnel-dependent features (QB EPA, pressure rate — fast decay, rosters churn), (ii) scheme/coaching features (play-action rate, blitz rate — medium decay, OCs turn over every ~3 years), (iii) structural features (home-field, altitude — near-zero decay). The paper fits one global α; a grouped α_k(τ;η_k) with a shared validation objective would let the engine forget QB-specific history fast while retaining structural history — the multi-rate forgetting the NFL's layered regime changes actually demand. Fit via the same bi-level gradient machinery, with an L2 penalty pulling group curves toward the global curve to preserve effective sample size.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2207.11486 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
