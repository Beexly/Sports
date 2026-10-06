# [1570] Modeling Player and Team Performance in Basketball (arXiv:2007.10550)

**Citation:** Zachary Terner, Alexander Franks (2020). *Modeling Player and Team Performance in Basketball*. arXiv:2007.10550. URL: https://arxiv.org/abs/2007.10550
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT

a literature review with no original experiments, data analysis, or numerical results; surveys basketball player-evaluation methods (APM/RAPM, EPV, shot modeling, production curves) without performing any causal, injury, or workload analysis of its own. Replaced by 2501.17711.

## 1. Research question
A survey: what are the modern statistical and machine-learning methods for quantifying basketball team strategy and player performance? Covers team network models, spatial analysis, play detection (LDA on tracking data), plus-minus regressions, EPV, production/aging curves, shot efficiency/selection, hot hand, and defensive metrics. No original research question is tested.

## 2. Dataset / schema
No new data. References NBA box-score data (basketball-reference, back to 1946–47), NBA.com tracking-era summaries (from 1996–97), SportVU/Second Spectrum optical tracking (x,y at 20+ fps), NOAH/RSPCT ball-trajectory data. The only "data" shown are reproduced figures from cited papers (e.g., 115,000 shot attempts from 2014–15 in Franks et al. 2015b).

## 3. Method / model
Expository summaries of others' methods: APM (D_i = β_0 + Σ_p β_p x_ip + ε_i), RAPM ridge/lasso penalization (β̂ = argmin (D−Xβ)ᵀ(D−Xβ) + λβᵀβ), EPV macro/micro decomposition (v_it = E[Z_i|X_{i0},…,X_{it}]), EPVA, hierarchical logistic shot models with CAR spatial priors, NMF shot-region bases, multinomial shot-attempt models, Rao-Blackwellized FG% from ball trajectories, LDA play-type discovery, production-curve methods (hierarchical Bayes, GP, functional PCA, archetypoids, RAPTOR nearest-neighbor). The paper contributes no method of its own.

## 4. Equations & assumptions
Reproduces textbook equations from the literature (APM Eq. 1, RAPM Eq. 2, EPV Eqs. 3–6, shot models Eqs. 7–8). Assumptions discussed are the original papers' (semi-Markov macro states, shrinkage priors, etc.), not the review's.

## 5. Features / target
None of its own — describes features/targets used across ~100 cited works.

## 6. Validation design
None. No experiments, no train/test, no baselines, no new empirical claims. The one quantitative illustration (Figure 3's reversal paradox on defender distance) is reproduced from Franks et al. 2015b.

## 7. Numerical results / baselines
No original numerical results. Mentions others' numbers in passing (e.g., Miller & Sanjurjo's 11% hot-hand effect after bias correction; the "Dwight Effect" 10% paint-attempt reduction).

## 8. Code / data availability
Supplementary tables list R/Python scraping packages and data repositories. No analysis code (there is no analysis).

## 9. Leakage & limitations
As a review it inherits the limitations of the surveyed work, which it discusses honestly (multicollinearity in APM, unobserved strategic confounding, EPVA's blind spots on off-ball/defense). Its own limitation for GSE: basketball-only, descriptive rather than predictive, and the causal-inference content is a two-paragraph wishlist in the discussion ("causal thinking will be essential"), not a method.

## 10. GSE overlap
No gap filled. GSE's corpus already covers player-evaluation and rating methods; a 2020 basketball review adds no new machinery. The meta-metrics (discrimination/stability/independence, Franks et al. 2016) are the only conceptually portable piece, and they belong to the cited paper, not this one.

## 11. GSE implementation spec
None — there is nothing to implement that isn't better sourced from the primary papers (Cervone et al. 2016b for EPV, Franks et al. 2015b for defensive matchup models, Miller & Bornn 2017 for play discovery).

## 12. Reproducible test
Not applicable — no claims to test.

## 13. Acceptance / rejection gate
Rejected: review/survey with zero original experiments or results; basketball performance evaluation, off-lane for causal inference / injuries / workload; fails the "directly tied to prediction accuracy" bar — it catalogs methods rather than delivering one.

## 14. Improvement experiment
None for GSE. If the corpus needs the cited methods, the primary sources (not this review) should be read directly — several (EPV, RAPM) are likely already in the phase-1 corpus.
