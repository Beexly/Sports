# 1163 Prediction Diversity and Selective Attention in the Wisdom of Crowds (arXiv:2001.10039)

**Citation:** Davi A. Nobre, José F. Fontanari (2020). *Prediction diversity and selective attention in the wisdom of crowds*. arXiv:2001.10039v2. URL: https://arxiv.org/abs/2001.10039
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v2, 7 pp, via arxiv.org/pdf).
**Verdict:** ADAPT

Adopt the diversity-prediction-theorem identity as a weekly ensemble diagnostic (decompose ensemble MSE = mean individual MSE − prediction diversity) and take the paper's negative result as a design constraint: never use prediction spread alone as a confidence signal.

## 1. Research question
Does increasing prediction diversity improve crowd accuracy, as the popular reading of Page's diversity prediction theorem suggests? Three estimation experiments test whether diversity (spread of estimates) correlates with collective error, and whether the famous accuracy of "the crowd" is an artifact of selective attention.

## 2. Dataset / schema
Three experiments with STEM students at University of São Paulo (Jan 2020): (1) candies in a jar: N=105 guesses, truth G=636; (2) paper strip length: N=139 guesses, truth G=22.4 cm; (3) book page count: N=139 guesses, truth G=784 pages. Schema: one scalar estimate g_i per subject per task. Plus 10⁴ "virtual experiments" per task: N∈{10,20,40,60} estimates drawn without replacement from the original samples. Data access: not stated in paper (author-collected, no URL given).

## 3. Method / model
No ML model. Method: (a) compute collective estimate as arithmetic mean ⟨g⟩; (b) fit normalized-guess histograms with Gaussian (strip) or two-piece normal (jar, book) — descriptive only; (c) bootstrap-style virtual experiments to measure correlation between relative diversity δ^{1/2}/⟨g⟩ and relative collective error γ^{1/2}/G across group sizes; (d) measure P(γ^{1/2}/G < 0.05) vs group size N.

## 4. Equations & assumptions
- Quadratic collective error: γ = (⟨g⟩ − G)².
- Average quadratic individual error: ε = (1/N)Σ(g_i − G)².
- Prediction diversity: δ = (1/N)Σ(g_i − ⟨g⟩)² (variance of estimates; called "precision" in stats literature).
- Page's diversity prediction theorem: γ = ε − δ (exact algebraic identity; no independence assumption needed).
- Dimensionless form: γ/G² = ε/G² − δ·⟨g⟩²/(⟨g⟩²G²).
- The authors' key analytic point: γ = ε − δ does NOT imply increasing δ decreases γ, because ε and δ are not independent — raising diversity can raise individual error unpredictably.
- Assumption behind virtual experiments: resampling without replacement from the empirical estimate pool approximates fresh experiments (stationarity of the estimate distribution).

## 5. Features / target
Inputs: scalar human estimates g_i. Target/analysis quantities: collective error γ, diversity δ, and their dimensionless forms; the "target" is the binary question of whether diversity predicts collective accuracy (answer: no).

## 6. Validation design
Empirical: 3 real experiments, each supplemented by 10⁴ resampled virtual experiments at group sizes 10/20/40/60. Reported: Pearson r between relative diversity and relative collective error at each N; P(collective error <5%) vs N fitted to αe^{−βN²} (jar experiment: α=0.12, β=0.0021 in the large-N regime); histogram fits (R² 0.77–0.94, descriptive). No train/test split — descriptive/exploratory statistics.

## 7. Numerical results / baselines
- Candies (G=636): crowd ⟨g⟩=531 (error 16.5%), better than 70% of individuals; distribution right-skewed (skewness μ̃3=0.73), best single guess 630.
- Paper strip (G=22.4 cm): crowd ⟨g⟩=22.0 cm (error 1.8%), better than 85% of individuals, best guess 22.5 cm.
- Book pages (G=784): crowd ⟨g⟩=561 (error 28.4%), better than only 63% of individuals; skewness μ̃3=1.22; best single guess 800 (error 2%).
- Pearson r(diversity, collective error): jar — r=−0.005 (N=10), 0.04 (N=20), 0.06 (N=40), 0.07 (N=60); strip — r=0.28 (N=10), 0.11 (N=20), −0.049 (N=40), −0.11 (N=60). All |r|≤0.28: no significant correlation at any group size.
- Group-size effects: jar experiment — optimal group size N=5 maximizes P(relative error <5%) at 14%; a single random estimate beats any aggregation with N≥20; P(error<5%) decays as αe^{−βN²}. Strip experiment — P(error<5%) increases monotonically with N; a single estimate has 30% chance within 5%.
- Interpretation (paper's claim): when the crowd is systematically biased, adding members converges the mean to the wrong value; when unbiased, aggregation helps. The alleged crowd accuracy is "most likely an artifice of selective attention."

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Tiny samples (105–139 humans, 3 tasks) — all conclusions rest on narrow task types.
- Virtual experiments resample from the same pool: within-task correlations are baked in; cannot test across genuinely different tasks.
- The theorem γ=ε−δ is a tautology (identity, like Price's equation) — the paper's real contribution is the empirical non-correlation.
- Human scalar estimates, not probabilistic forecasts or model ensembles; no uncertainty quantification.
- Selective-attention critique is itself a narrative claim, not a tested hypothesis.
- External validity to NFL: weak as a forecasting result, but the algebraic identity transfers exactly to any mean-ensemble.

## 10. GSE overlap
Extension, not duplicate. The 750-program already has ensemble/combination papers, and CEPT is Garrett's ensemble theory lane (existing-research-map), but no ledger I checked uses γ=ε−δ as an operational ensemble diagnostic. GSE's engine (v5.2.7) produces multi-model picks; the decomposition gives a per-week, per-market accounting of where ensemble error comes from.

## 11. GSE implementation spec
Adapt the identity as a weekly ensemble diagnostic over GSE's model pool:
1. For each game-week and market (spread/ML/total), collect each model's probability forecast p_j and outcome Y.
2. Compute ensemble mean q̄, individual MSEs ε=(1/M)Σ(p_j−Y)², diversity δ=(1/M)Σ(p_j−q̄)², and verify γ=(q̄−Y)²=ε−δ (exact; use as a data-quality check).
3. Log per week: ε, δ, γ, and δ/ε (fraction of individual error canceled by diversity). Track δ/ε over the season per market.
4. Decision rule: if δ/ε is persistently low (<0.1) for a market, the pool is redundant — drop/retrain the most correlated models; if ε is large but δ is also large, the problem is individual model error, not diversity. Do NOT use δ as a confidence proxy for any single game (the paper's negative result).
5. Effort: ~half day; pure pandas on the existing picks table (Neon Postgres).

## 12. Reproducible test
Dataset: 2024 + 2025 NFL regular-season games with GSE component-model probabilities. Metric: per-week decomposition values + full-season Brier of the ensemble. Baseline comparison: none needed for the diagnostic itself; the operational claim to test is that weeks with high δ/ε have lower ensemble Brier than weeks with low δ/ε (Spearman ρ between weekly δ/ε and weekly Brier, expecting ρ<0). Time window: 2025 season. If |ρ|<0.2, the diagnostic is descriptive only — still keep it as accounting, but don't build selection rules on it.

## 13. Acceptance / rejection gate
ADOPT the diagnostic permanently if (a) the identity verifies exactly on real data (sanity), and (b) either the Spearman test above holds with p<0.05 OR the decomposition changes at least one model-retention decision in a documented weekly review. REJECT as an operational tool if the numbers are never consulted after 4 weeks of logging — keep the negative result (don't trust spread-as-confidence) as a standing design rule regardless.

## 14. Improvement experiment
Beyond the paper: extend the identity to weighted ensembles — derive γ_w = ε_w − δ_w + (q̄_w − q̄)²-style terms (weighted mean vs unweighted mean shift) and compute how much of GSE's weighted-ensemble gain over the unweighted mean comes from diversity vs from upweighting skilled models. This separates "we picked better models" from "we hedged better," directly informing whether GSE should invest in more models or better model weighting.
