# [1554] Comparison of Combination Methods to Create Calibrated Ensemble Forecasts for Seasonal Influenza in the U.S. (arXiv:2202.11834)

**Citation:** Wattanachit, N., Ray, E. L., McAndrew, T. and Reich, N. G. (2022). *Comparison of Combination Methods to Create Calibrated Ensemble Forecasts for Seasonal Influenza in the U.S.* arXiv:2202.11834v2 [stat.AP]. URL: https://arxiv.org/abs/2202.11834
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 17 main pages + 7 supplement pages incl. Tables 1, S1, Figures 1–6, S1–S6, all equations, refs).
**Verdict:** ADAPT — the beta-transformed linear pool (BLP) is a 2-parameter calibration fix for the linear pool's proven overdispersion, directly applicable to recalibrating GSE's ensemble predictive distributions; the honest negative result (beta methods under-predict in test, equal weights fail) tells us exactly where to be careful.

## 1. Research question
The linear pool (weighted mixture of predictive distributions) is the workhorse of multi-model ensemble forecasting, but theory (Gneiting & Ranjan 2013) proves it produces overdispersed — miscalibrated — combined forecasts even when components are well-calibrated. Can parametric combination methods that **simultaneously optimize component weights and recalibrate** (beta-transformed linear pool, finite beta mixture) beat the standard linear pool and equally-weighted pool on both accuracy (log score) and probabilistic calibration (PIT uniformity) in a real multi-model forecasting operation — the CDC FluSight challenge, 27 models, 3 test seasons?

## 2. Dataset / schema
- **CDC ILINet wILI**: weekly % of outpatient visits for influenza-like illness, population-weighted, for the US national level + 10 HHS regions, seasons 2010/2011–2018/2019 (Figure 1). Public via CDC.
- **FluSight Network forecasts** (FluSightNetwork/cdc-flusight-ensemble, public): 27 individual models (Table S1 — teams: CU, Delphi, LANL, ReichLab, FluOutlook, Protea, FluX, UA; includes mechanistic SEIRS/SIRS Kalman filters, BMA, basis regression, delta density, empirical futures/trajectories, DBMplus, KCDE/KDE, SARIMA1/2, GLEAM, dynamic harmonic, ARLR, LSTM, EpiCos, uniform). Targets: **1–4 week ahead wILI** as binned probability distributions (bins [ℓᵢ, uᵢ)).
- **Splits:** training = all seasons preceding each test season (2010/11 onward); test = 2016/17, 2017/18, 2018/19 seasons. Parameters re-estimated per test season (12 sets: 4 targets × 3 seasons); weights are target-specific.

## 3. Method / model
Six combiners compared:
- **LP** (linear pool): f_LP(y) = Σₘ ωₘ fₘ(y), ω ≥ 0, Σω = 1 — Eq. 1. Baseline.
- **EW-LP**: LP with ωₘ = 1/M fixed.
- **BLP** (beta-transformed linear pool, Gneiting & Ranjan 2013): F_BLP(y) = B_{α,β}(Σₘ ωₘ Fₘ(y)) — Eq. 2; density f_BLP(y) = (Σωₘfₘ(y))·b_{α,β}(ΣωₘFₘ(y)) — Eq. 3. The beta CDF warps the linear pool's PIT: α=β=1 recovers LP; other values sharpen/widen or skew the tails (Figure 2). Adds exactly **2 parameters** to LP.
- **EW-BLP**: BLP with equal weights.
- **BMCK** (finite beta mixture, frequentist version of Bassetti–Casarin–Ravazzolo 2018): F_BMC_K(y) = Σₖ θₖ B_{αₖ,βₖ}(Σₘ ω_{km} Fₘ(y)) — Eq. 4; density Eq. 5. K = number of beta components, each with its own model weights.
- **EW-BMC_K**: equal-weight variant.
- **Binned-data modification (§2.4):** FluSight forecasts are discrete bin probabilities Pᵢ = F(uᵢ)−F(ℓᵢ) (Eqs. 6–7), so the likelihood is modified to log P_{BMC_K, j} = log[F_{BMC_K}(uⱼ) − F_{BMC_K}(ℓⱼ)] for the observed bin j, expressed via cumulative bin probabilities Σ_{i≤j} P_{m,i} — this makes BLP/BMCK estimable from binned submissions.
- **Estimation:** all parameters (weights + α,β) estimated **simultaneously** by maximizing average log score (MLE) on training data. K selected by leave-one-season-out CV with a 1-SE parsimony rule (§3.2.1): **K=2 selected for all 12 target-season pairs** (Table 1; higher K gave no substantial gain). Hence the reported method is **BMC2**.

## 4. Equations & assumptions
- LP: f_LP(y) = Σₘ ωₘ fₘ(y), ωₘ ≥ 0, Σωₘ = 1 (Eq. 1).
- BLP: F_BLP(y) = B_{α,β}(Σₘ ωₘ Fₘ(y)), α,β > 0 (Eq. 2); f_BLP(y) = (Σₘωₘfₘ(y)) b_{α,β}(ΣₘωₘFₘ(y)) (Eq. 3).
- BMCK: F_BMC_K(y) = Σₖ θₖ B_{αₖ,βₖ}(Σₘ ω_{km} Fₘ(y)) (Eq. 4); f_BMC_K density (Eq. 5).
- Binned log-likelihood: log P_{BMC_K,j} = log[ΣₖθₖB_{αₖ,βₖ}(Σₘω_{km}Σ_{i≤j}P_{m,i}) − ΣₖθₖB_{αₖ,βₖ}(Σₘω_{km}Σ_{i<j}P_{m,i})].
- Log score: LogS(f,y*) = log Pᵢ for y* ∈ [ℓᵢ,uᵢ) (truncated at −10 per CDC convention — formally no longer proper).
- PIT: zᵢ = F(y*), randomized within-bin for discrete targets; calibration = PIT ~ Uniform; Cramér distance ∫(F(x)−G(x))²dx summarizes miscalibration.
- **Assumptions:** component forecasts are binned PDFs submitted without access to model internals; MLE-on-log-score training transfers across seasons; 1-SE rule for K; log-score truncation doesn't distort rankings.

## 5. Features / target
- **Inputs:** the 27 models' binned predictive distributions per (week, region, target, season). No covariates.
- **Targets:** 1-, 2-, 3-, 4-week-ahead wILI (continuous incidence, binned). Seasonal targets (peak week/onset) excluded.
- **Horizon:** short-term, 1–4 weeks.

## 6. Validation design
- Retrospective application: train on all seasons before each test season; parameters updated per test season (12 parameter sets). Leave-one-season-out CV for K selection.
- **Baselines within study:** EW-LP (worst), LP, EW-BLP, EW-BMC2, BLP, BMC2. No external benchmark.
- **Metrics:** mean out-of-sample log score (truncated at −10) averaged over regions×weeks per target/season; PIT probability plots + Cramér distances for calibration. Training vs. test calibration compared to diagnose overfitting.
- Time-ordered splits (seasons never leak forward).

## 7. Numerical results / baselines
- **Overall (Figure 3b, all targets+seasons, test):** BMC2 **−3.02** (best) > BLP −3.03 > LP −3.06 > EW-BMC2 −3.13 > EW-BLP −3.13 > EW-LP −3.26. Margins are small between BMC2/BLP/LP.
- **By target (Figure 3a, test):** 1-wk: BLP best (−2.57); 2-wk: BLP −2.95 ≈ BMC2 −2.95; 3-wk: BMC2 −3.19; 4-wk: BMC2 −3.34. (EW-LP worst everywhere: −2.91/−3.22/−3.40/−3.50.)
- **By season (test, all targets):** 2016/17: BLP −2.93 (best); 2017/18: BMC2 −3.18; 2018/19: BMC2 −2.92.
- **Calibration:** BLP/BMC2 most calibrated for 1-wk ahead (lowest Cramér distances); calibration degrades with horizon for all beta methods. **Honest negative:** beta methods corrected LP overdispersion but introduced **systematic under-prediction** in test (PIT CDF below diagonal across all values; worse at longer horizons and in the severe 2017/18 season). LP/EW-LP were too wide in training (consistent with theory). BMC2 showed mild overfitting (train ≫ test consistency gap) but was always top-2 out-of-sample.
- **Equal weights fail:** EW variants strictly worse than their weighted counterparts on both accuracy and calibration, in train and test.
- BMC2 uses 2× the parameters of BLP but only marginally beat it in 2/4 targets and 5/12 target-season pairs → BLP is the practical recommendation.

## 8. Code / data availability
Stated: "All individual forecasts, data, and code used for conducting analyses presented in this manuscript are publicly available (FluSight Network, 2020; Wattanachit, 2021)." Code: https://github.com/NutchaW/forecast_calibration. Forecasts: https://github.com/FluSightNetwork/cdc-flusight-ensemble. Supplement: Wattanachit et al. 2022.

## 9. Leakage & limitations
- **Retrospective, not prospective:** authors stress these are retrospective fits; a live deployment would face model-set churn (27 models change year to year) — the paper notes equal-weight variants "could be useful in other applications where it might be difficult to estimate individual model weights when available models change over time" (Ray et al. 2022).
- **MLE ≠ calibration:** parameters maximize log score, not PIT uniformity — the authors flag this as the likely cause of residual miscalibration; post-hoc recalibration (e.g., Rumack et al. 2021) may be needed if calibration is the priority.
- **Overfitting signal:** BMC2's train/test gap; beta methods' under-prediction in test suggests the beta warp learned training-season shapes that didn't transfer — especially dangerous in extreme seasons (2017/18).
- **Truncated log score (−10)** is improper; zero-probability events are masked.
- K selected by CV *within* training, but the 1-SE rule still used test-season-adjacent validation — mild selection optimism possible.
- External validity to NFL: flu seasons are smooth, strongly seasonal, non-adversarial; sports outcomes have regime shifts and market efficiency. The under-prediction pathology (beta warp concentrating mass below realized extremes) could be *worse* for heavy-tailed sports scores.
- No comparison to non-parametric stacking (e.g., the FluSight Network's own stacked ensemble) or to simple recalibration baselines.

## 10. GSE overlap
Existing-research map: no GSE work applies beta-transformation calibration to ensemble predictive distributions — GSE's conformal/CQR work (Mimo's lane, per MEMORY) targets interval coverage, not full-distribution PIT calibration of a combined forecast. This is a **new capability** (distribution-level combiner calibration), complementary to ledger [1548] WIRED (which models dependence but does not recalibrate the marginal mixture) and [1552] diversity-weighting (which learns weights but not calibration). The paper's finding that equal weights fail while 2 extra calibration parameters beat plain LP directly informs GSE's combiner design.

## 11. GSE implementation spec
- **Data sources:** GSE engine sub-model predictive distributions per game (need per-model quantiles or binned probabilities for spread/total — if only point forecasts exist, first bootstrap predictive distributions per model from historical residuals, as in [1548]'s copula bootstrap).
- **Build:** implement BLP as a post-processing layer on the existing linear-pool consensus: (1) form LP CDF from sub-model CDFs with learned weights; (2) estimate (α, β) by MLE on log score over past seasons, per market type (spread/total/moneyline) — the paper's target-specific estimation; (3) publish B_{α,β}(F_LP(y)) as the calibrated forecast. Cost: 2 parameters beyond the pool.
- **Guardrail from the paper:** monitor PIT plots by week; the under-prediction pathology means we should regularize (α,β) toward (1,1) (shrinkage to LP) and validate on a held-out season before trusting the warp at long horizons.
- **Effort:** ~1 engineer-week (scipy.optimize on historical engine logs); BMC2 variant only if BLP's 2 parameters prove insufficient.

## 12. Reproducible test
2023–2024 NFL seasons as training, 2025 as test (strictly time-ordered): build per-game predictive distributions for ATS margin from each engine sub-model; compare LP (weight-optimized) vs. BLP vs. EW-LP on (a) mean log score of the realized margin bin, (b) PIT uniformity (Cramér distance), (c) 80% interval coverage. Baseline to beat: the plain linear pool at −3.06-equivalent — i.e., BLP must improve test log score by ≥0.02 nats (the paper's BMC2-vs-LP margin was 0.04) with no worse Cramér distance.

## 13. Acceptance / rejection gate
ADOPT the BLP layer if on the 2025 holdout it improves mean log score over the weight-optimized LP by ≥0.02 **and** its PIT Cramér distance is ≤ LP's (no calibration regression), with no systematic under-prediction (PIT CDF within ±0.05 of diagonal at all deciles). REJECT if the beta warp reproduces the paper's under-prediction pathology (PIT CDF below diagonal by >0.05) or if the log-score gain is <0.01 — the 2 parameters aren't earning their keep.

## 14. Improvement experiment
**Shrinkage-regularized BLP with market-relative estimation.** Estimate (α,β,ω) by penalized MLE: log-score minus λ·[(α−1)² + (β−1)²], shrinking the warp toward the identity (LP), with λ chosen by leave-one-season-out CV — directly attacking the paper's overfitting/under-prediction finding. Additionally, estimate separate (α,β) for games where the market total is high vs. low (pace regimes), since miscalibration in sports is regime-dependent. Hypothesis: shrinkage preserves BLP's 1-week-horizon gains (the paper's strongest result) while eliminating the tail under-prediction that hurt at longer horizons.
