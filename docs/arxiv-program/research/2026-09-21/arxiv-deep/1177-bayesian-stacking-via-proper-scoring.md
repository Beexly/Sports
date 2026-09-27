# [1177] Bayesian Stacking via Proper Scoring Rule Optimization Using a Gibbs Posterior (arXiv:2509.04203v1)

**Citation:** Wadsworth, S., & Niemi, J. (2025). *Bayesian Stacking via Proper Scoring Rule Optimization Using a Gibbs Posterior*. arXiv:2509.04203v1 [stat.ME]. URL: https://arxiv.org/abs/2509.04203
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the Gibbs-posterior construction, the consistency theorem, the static/dynamic simulations, the SIR study, and the FluSight application).
**Verdict:** ADAPT — a principled stacking engine for GSE's ensemble: the Gibbs posterior over simplex weights, π_n^(η)(ω) ∝ exp{−η n S_n(ω)} π(ω), tunes combination weights directly against the proper scoring rule GSE actually cares about (log-loss/Brier), with a dynamic-risk extension (discount α=0.98) for nonstationary model skill.

## 1. Research question
Can Bayesian stacking be generalized beyond log-score/BMA by placing a Gibbs (generalized-Bayes) posterior over simplex weights driven by *any* proper scoring rule, and does the resulting "scoring-rule stacking" beat BMA, equal weighting, and pseudo-BMA on static, dynamic, and real forecasting tasks? (Abstract; Sec. 1)

## 2. Dataset / schema
Four empirical settings (Secs. 4–6): (a) Static simulation: truth = 0.65×N(3,1)+0.35×N(6.5,1); six unit-variance normal candidate models with means {0,2,4,6,8,10}; sample sizes {10,20,50,100,200}; 500 replicates; 1,000 test draws. (b) Dynamic simulation: 50 time points, component means following a random walk with variance 0.01; 500 replicates. (c) SIR epidemic simulation: 3,000 replicates, 35 weeks, four candidate models, 10,000 predictive draws, Dirichlet(50·1_4) prior, η=1. (d) Real data: FluSight 2023–24, 53 regions, 29 weeks, one-week-ahead hospitalization forecasts from multiple teams' models. All synthetic; FluSight is public (CDC). (Secs. 4–6)

## 3. Method / model
Stacking weights ω on the simplex get a Gibbs posterior: π_n^(η)(ω) ∝ exp{−η n S_n(ω)} π(ω), where S_n(ω) is the average proper score (e.g., log score, CRPS, Brier) of the ω-weighted linear pool on n observations, η>0 is a learning-rate/temperature, and π(ω) is a Dirichlet prior. Point estimate = posterior mean ("SGP" — scoring-rule Gibbs posterior). Dynamic extension: exponentially discounted risk with discount α=0.98 so weights adapt to drifting model skill. Theory: posterior concentration/consistency for fixed model sets under IID data. Comparators: BMA, equal weights (EQW), average of single-best (AVS), pseudo-BMA. (Secs. 2–3)

## 4. Equations & assumptions
- Gibbs posterior: π_n^(η)(ω) ∝ exp{−η n S_n(ω)} π(ω); S_n(ω) = (1/n) Σ_i S(F_{ω,i}, y_i) for proper scoring rule S.
- Static simulation uses η=15; SIR uses η=1 with π = Dirichlet(50·1_4); dynamic uses discounted risk with α=0.98.
- Assumptions stated (theorem): IID data, fixed candidate model set, proper scoring rule, correct prior support. The authors note the theorem does not cover the dynamic/nonstationary case — the α=0.98 extension is empirical. Linear pools are used throughout; the paper acknowledges linear pools can remain miscalibrated even when sharp.

## 5. Features / target
Inputs: predictive distributions (or predictive draws) from each candidate model per observation. Target: the realized outcome (continuous in simulations; hospitalization counts in FluSight). Horizon: one-step-ahead (one week in FluSight/SIR).

## 6. Validation design
Simulations: repeated replicates with fresh test draws (honest Monte Carlo). FluSight: genuine prospective-style evaluation over 29 weeks × 53 regions, one-week-ahead, comparing SGP vs. BMA/AVS/EQW on the same candidate forecasts; missing forecasts are excluded (limitation noted). Time-ordering respected in the real-data application. (Secs. 5–6)

## 7. Numerical results / baselines
Paper's reported results (my summary of their tables/figures): (a) Static sim: SGP concentrates on the best-supported models as n grows; beats BMA/EQW on the proper-score criterion it targets. (b) Dynamic sim: discounted SGP (α=0.98) tracks the drifting best model better than static stacking. (c) FluSight 2023–24 (headline real-data result): SGP was the best method in 31 of 53 regions and the worst in only 3; weekly first-place counts — SGP 14, BMA 8, AVS 5, EQW 2 (of 29 weeks). Distinguish: these are proper-score rankings on hospitalization forecasts, not sports-betting outcomes; η was tuned per setting (15 static, 1 SIR), so some tuning optimism applies.

## 8. Code / data availability
Not stated in paper.

## 9. Leakage & limitations
(1) Consistency theorem is IID + fixed-model-set only — the dynamic α=0.98 variant GSE would actually use has no theory; (2) missing forecasts excluded — in GSE, components drop in/out (injury-news models, market feeds), and the paper gives no guidance for ragged panels; (3) linear pools can stay miscalibrated (authors' own caveat) — stacking sharpens discrimination but GSE still needs the calibration stack on top; (4) η tuning is ad hoc per experiment; (5) all real-data evidence is one FluSight season — single-regime risk.

## 10. GSE overlap
Extension of existing practice. The repo combines models (gse-lab ensembles, ML brief "ensembling," opponent-adjusted EPA builds) but the existing-research-map shows combination weights are set by accuracy heuristics or BMA-style logic — no Gibbs-posterior/proper-score stacking read exists in the corpus, and no dynamic (discounted) weight adaptation for drifting model skill. The calibration stack (CQR, temperature scaling) is per-model, not a combination rule. This slots between the combiner and the calibration layer: SGP gives the weights, CQR recalibrates the pool. Complements ledgers 1174/1175/1178 (other aggregation rules) — this is the Bayesian-proper-score member of that family.

## 11. GSE implementation spec
1. Candidate set: GSE engine components (EPA-based, market-relative, tracking/NGS-derived) emitting per-game win probabilities. 2. Implement the Gibbs posterior with S = log score (primary; Brier as robustness check), Dirichlet prior, η tuned by walk-forward. 3. Posterior mean weights via MCMC or simple importance sampling on the simplex (few components → cheap). 4. Dynamic mode: discounted risk α=0.98 recomputed weekly for in-season skill drift. 5. Feed the SGP pool into the existing CQR calibration layer. Effort: ~3–4 days including the walk-forward η/α tuner.

## 12. Reproducible test
Dataset: GSE `picks` history 2024 (tuning η, α) → 2025 (frozen test), per-component game probabilities. Metric: log-loss and Brier, walk-forward by week. Baselines: equal weights, BMA-style likelihood weights, current GSE combiner. Window: 2025 regular season fixed in advance. Gate: adopt if SGP beats the best baseline on log-loss by ≥0.005 with DM p<0.05.

## 13. Acceptance / rejection gate
ADOPT SGP (static or dynamic, whichever tuned better) if 2025 walk-forward log-loss improves ≥0.005 over the best baseline (DM p<0.05) without a Brier regression; REJECT otherwise. Ragged-panel veto: if a component missing >10% of weeks breaks the weight sampler, the implementation must handle ragged panels (e.g., renormalize over available models) before any ship decision — the paper's exclusion of missing forecasts is not acceptable in production.

## 14. Improvement experiment
Go beyond the paper: make η itself adaptive — a hierarchical Gibbs posterior where η_t follows the recent volatility of the score differential between SGP and the best single model (high disagreement → lower η, trust the prior; stable regime → higher η, exploit). The paper fixes η per experiment; an adaptive learning rate directly addresses the single-regime risk of the FluSight evidence and GSE's regime shifts (e.g., post-injury QB changes). Compare fixed-η vs. adaptive-η walk-forward log-loss.
