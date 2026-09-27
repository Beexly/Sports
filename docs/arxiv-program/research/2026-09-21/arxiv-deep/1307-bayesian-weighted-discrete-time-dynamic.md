# [1307] Bayesian weighted discrete-time dynamic models for association football prediction (arXiv:2508.05891v1)

**Citation:** Roberto Macrì-Demartino, Leonardo Egidi, and Nicola Torelli (2025). *Bayesian weighted discrete-time dynamic models for association football prediction*. arXiv:2508.05891v1. URL: https://arxiv.org/abs/2508.05891v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 26 pages). Note: preprint, not peer-reviewed.
**Verdict:** ADAPT — adaptive commensurate-prior machinery for time-varying team attack/defense strengths (separate evolution precisions per period, spike-and-slab shrinkage); directly portable to GSE's NFL dynamic team-rating models. (Replacement for REJECT 1109.)

## 1. Research question
Can football goal-based prediction models be improved by letting team attack/defense abilities evolve with *period-specific, adaptive* borrowing from the past (commensurate priors), instead of a single constant evolution precision?

## 2. Dataset / schema
Five seasons 2020/21–2024/25 of German Bundesliga, English Premier League, Spanish La Liga; data from football-data.co.uk. Each season split into two half-season periods → 10 time periods. Forecast scenarios for 2024/25: entire second half, last three rounds, last round. Six goal-based models: bivariate Poisson (BP), diagonally-inflated BP (DIBP), double Poisson (DP), negative binomial (NB), Skellam (SM), zero-inflated Skellam (ZISM).

## 3. Method / model
Weighted dynamic prior: βᵢ,att,τ | βᵢ,att,τ−1 ~ N(βᵢ,att,τ−1, 1/φ_att,τ), separately for defense, with period-and-ability-specific commensurate precisions φ. Spike-and-slab hyperpriors on each φ: continuous mixture of spike N+(100, 0.1) and slab N+(0, 5), slab probability p_l = 0.99. Fit via Stan MCMC: 4 chains × 2000 iterations, 1000 burn-in. Zero-sum identifiability constraints per period. Implemented in footBayes R package (≥2.1.0); reproduction code at https://github.com/RoMaD-96/BayesWDFM. R 4.4.3.

## 4. Equations & assumptions
Commensurate prior: θ | θ₀, φ ~ N(θ₀, 1/φ). Spike-and-slab: φ_{k,τ} ~ N+(μ_s, ψ_s)(1−p_l) + N+(μ_l, ψ_l)p_l. Scoring rates: log λ₁ = β₀ + home + β_att(h) + β_def(a). Baselines use fixed evolution precision σ ~ Cauchy+(0,5) (Owen 2011; Egidi et al. 2018). Metrics: Brier = (1/M)ΣΣ(p_{r,m} − δ_{r,m})²; ACP = mean probability of observed outcome; RPS; pseudo-R² = geometric mean of outcome probabilities. Assumptions: goal counts conditionally structured per model family; periods are half-seasons; borrowing structure is per-period, not team-specific.

## 5. Features / target
Inputs: historical match scores only (no covariates). Target: three-way outcome probabilities (home/draw/away) via goal-count distributions.

## 6. Validation design
Three forward scenarios (second half, last 3 rounds, last round of 2024/25) across three leagues × six models, comparing weighted-dynamic vs Owen (2011) vs Egidi et al. (2018) on Brier, ACP, RPS, pseudo-R². Time-ordered by design.

## 7. Numerical results / baselines
Weighted dynamic consistently best. Final round: Bundesliga BP Brier 0.593, ACP 0.409; EPL Skellam Brier 0.545, DIBP ACP 0.449; La Liga DIBP Brier 0.462, ACP 0.485. Last three rounds: La Liga DIBP Brier 0.499, ACP 0.454. Second half: Bundesliga BP Brier 0.661, ACP 0.387; EPL BP Brier 0.579. Gains are small but consistent (e.g., La Liga DIBP Brier 0.499 vs 0.518/0.521). Computation: 32–55% faster than baselines (EPL ZISM 32% faster than Owen, 55% faster than Egidi et al.); R̂ ≈ 1.00, bulk/tail ESS in the thousands.

## 8. Code / data availability
Code: https://github.com/RoMaD-96/BayesWDFM. Method in footBayes R package ≥2.1.0. Data: football-data.co.uk (public).

## 9. Leakage & limitations
Gains are modest (hundredths of Brier points) — consistent but small. Soccer only; NFL transfer needs re-derivation (points, not goals; no draws). Covariance parameter in BP held constant. No covariates (injuries, market value, xG) — the authors' own suggested extension. Spike-and-slab hyperparameters (μ_s=100, p_l=0.99) are strong modeling choices with limited sensitivity analysis in this read. Half-season periods are coarse; weekly NFL adaptation is finer-grained.

## 10. GSE overlap
Extension: GSE has Bayesian/state-space and team-rating lanes, but no adaptive commensurate-prior borrowing design documented. Cite `~/workspace/arxiv-sweep/existing-research-map.md`. Not duplicative.

## 11. GSE implementation spec
(a) Port to NFL: weekly periods, team offensive/defensive strength parameters for points (or EPA-based) outcomes, separate φ_att/φ_def per week; (b) implement in Stan/PyMC following the footBayes structure; (c) spike N+(100,0.1)/slab N+(0,5) as starting hyperpriors, tune p_l on 2022–2023; (d) forecast 2024 weekly against GSE's current rating model. Effort: ~1-2 engineer-weeks.

## 12. Reproducible test
Dataset: 2024 NFL regular season, weekly team strength estimation, predict weeks 5–18. Metric: Brier score on win/loss (and RPS on spread buckets). Baseline to beat: GSE's current static-decay team ratings — the weighted-dynamic model must win on Brier by ≥0.005 to justify the complexity.

## 13. Acceptance / rejection gate
ADAPT into the ratings pipeline if the NFL port beats the current model on 2024 Brier with the φ posteriors showing genuine adaptivity (some weeks in slab regime — e.g., around the trade deadline); REJECT if φ posteriors collapse to the spike (no adaptivity learned) or Brier doesn't improve.

## 14. Improvement experiment
Make φ team-specific and hierarchical (volatile teams get more slab mass a priori) and add injury/covariate inputs to the scoring-rate equation — the paper's two suggested extensions combined, testing whether structured covariates beat pure score-history adaptivity.
