# [2150] Decision Making under Model Misspecification: DRO with Robust Bayesian Ambiguity Sets (arXiv:2505.03585)

**Citation:** Charita Dellaporta, Patrick O'Hara, Theodoros Damoulas (2025). *Decision Making under Model Misspecification: DRO with Robust Bayesian Ambiguity Sets*. arXiv:2505.03585. URL: https://arxiv.org/abs/2505.03585
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* DRO-RoBAS is the missing *outer* layer for GSE's decision stack: the engine's outcome model is always misspecified (sports DGP ≠ any parametric family; contaminated by weird seasons, tanking teams, weather outliers). Centering the ambiguity set at a *robust* posterior predictive (NPL-MMD) instead of the raw empirical/standard-posterior distribution gives stake/pick decisions with worst-case guarantees that survive misspecification — the exact failure mode of naive DRO, which either excludes the DGP (optimizer's curse) or explodes into useless conservatism.

## 1. Research question
DRO protects against distributional uncertainty via worst-case risk over an ambiguity set — but Bayesian DRO inherits the standard posterior's fragility to model misspecification: the set must be stretched so large to contain the DGP that decisions become pointlessly conservative (or, if sized optimistically, the DGP falls outside and the decision is over-optimistic). Can we build ambiguity sets centered at a *misspecification-robust* posterior predictive, with a discrepancy (MMD) that works for any model family, and keep the problem tractable?

## 2. Dataset / schema
Simulated: Newsvendor (demand ξ, cost f(x,ξ)=h·max(x−ξ,0)+b·max(ξ−x,0), b=8, h=3, n=20 obs, J=100 reps, D=1 and 5) and Portfolio (5-D Gaussian returns, n=100, weights x≥0, Σx_i=1, maximize return). Misspecification cases: (1) bimodal Gaussian DGP vs unimodal Gaussian model; (2) Huber contamination η∈{0,0.1,0.2} of training set (Gaussian→Gaussian, Exponential→Gaussian, 5-D Gaussian on 3/5 dims).

## 3. Method / model
- **DRO-RoBAS:** min_x sup_{P: MMD(P, P̂_n^{pred,NPL}) ≤ ε} E_{ξ∼P}[f_x(ξ)], where the nominal P̂ is the posterior predictive of a *robust* Bayesian posterior — Bayesian Nonparametric Learning (NPL, Lyddon et al. 2018; Fong et al. 2019) with MMD loss instead of likelihood, so the posterior stays near the DGP even when the model family excludes it (NPL-MMD posterior can be bimodal even when the model is unimodal).
- **Dual in the RKHS:** the MMD-DRO problem admits a tractable dual formulation in the reproducing kernel Hilbert space.
- **Probabilistic guarantees:** high-probability bounds on the tolerance ε so the ambiguity set contains the DGP and the DRO objective upper-bounds the true objective.
- **Baselines:** BDRO (Shapiro et al. 2023, expected worst-case over standard posterior + KL ball), DRO-BAS_PP / DRO-BAS_PE (Dellaporta et al. 2024, KL balls around posterior predictive / expected KL), empirical MMD (Staib & Jegelka 2019, MMD ball around empirical measure).
- **Flexibility:** works for any model family, including likelihood-free models (DRO-BAS_PE is limited to exponential families; BDRO/DRO-BAS_PP need closed-form or MCMC posteriors).

## 4. Equations & assumptions
- DRO game: min_{x∈X} sup_{P∈A} E_{ξ∼P}[f_x(ξ)] (1).
- BDRO: min_x E_{Π(θ|ξ_{1:n})}[sup_{P: d_KL(P‖P_θ)≤ε} E_P[f_x]] (2); DRO-BAS_PP: KL ball around posterior predictive (3); DRO-BAS_PE: expected-KL ball (4).
- DRO-RoBAS: MMD ball around NPL-MMD robust posterior predictive; RKHS dual; high-probability ε calibration.
- Assumptions: bounded costs; kernel choice for MMD; NPL prior beliefs about the DGP; i.i.d. training observations (contamination only in training, test = clean P̃).

## 5. Features / target
Demand vectors / return vectors ξ; decision x = order quantity / portfolio weights. Target: decision minimizing worst-case expected cost over the ambiguity set.

## 6. Validation design
J=100 repetitions; n=20 (newsvendor) / n=100 (portfolio); out-of-sample mean and variance of cost/return on fresh DGP draws; ε swept (markers per ε); well-specified (η=0) vs contaminated (η=0.1, 0.2) vs structurally misspecified (bimodal DGP) comparisons.

## 7. Numerical results / baselines
- **Bimodal DGP, misspecified unimodal model (newsvendor):** standard posteriors concentrate *between* the modes → DRO-BAS/BDRO need huge ε → conservative, high out-of-sample cost. DRO-RoBAS's NPL-MMD posterior is bimodal despite the unimodal model; consistently lower out-of-sample variance than empirical MMD (univariate); competitive in multivariate (empirical MMD slightly better on mean, unaffected by misspecification by construction).
- **Huber contamination (newsvendor):** at η=0, DRO-BAS beats RoBAS (well-specified case favors standard Bayes). At η>0, RoBAS shows the best out-of-sample mean-variance tradeoff; even empirical MMD degrades (training≠test discrepancy hits empirical methods too).
- **Portfolio, η=0.1:** for ε<0.2, empirical DRO degrades fast while RoBAS is unaffected; at ε≥0.2 they converge (MMD's intrinsic robustness kicks in). At η=0.2 the gap magnifies — the empirical nominal is corrupted by outliers; RoBAS's robust nominal is not.
- **Cost:** RoBAS is computationally heavier (RKHS optimization + NPL sampling); scalability via Fourier features/low-rank approximations left to future work.

## 8. Code / data availability
Implementation details in Appendix B; no public code link extracted.

## 9. Leakage & limitations
- Simulations only; no real-data validation (newsvendor/portfolio are synthetic DGPs).
- In well-specified or low-misspecification settings, standard DRO-BAS *beats* RoBAS with lower compute — robustness has a price; a misspecification detector should gate which to use.
- ε still must be chosen; guarantees are high-probability, not exact; kernel choice affects everything and isn't automated.
- Higher computational cost (RKHS dual + NPL posterior sampling) — weekly re-solving may be heavy without the suggested approximations.
- NPL requires prior beliefs about the DGP — another modeling choice that can itself be wrong.
- Contamination model assumes test = clean distribution; in sports, the "test" (next week's games) can itself contain the outliers.

## 10. GSE overlap
Existing-research map: 2143's composite risk framework has an *outer* risk over uncertain distribution parameters but uses a standard (non-robust) posterior — exactly the fragility this paper fixes. No paper so far addresses model misspecification of the engine itself. The engine's outcome model is *always* misspecified: no parametric family captures the true NFL DGP, and the training data is contaminated (tanking teams, backup-QB games, weather anomalies, COVID-season weirdness). This paper gives the principled outer layer: center decisions on a robust posterior predictive and optimize worst-case over an MMD ball — so stake sizing and bet/no-bet calls carry guarantees even when the engine's model is wrong. It also explains *why* naive empirical DRO would fail for GSE (Fig. 1 right: stretched sets, absurd conservatism → posting nothing).

## 11. GSE implementation spec
- **Robust nominal:** replace the engine's point-estimate outcome distribution with an NPL-MMD robust posterior predictive per game: bootstrap-resample historical game outcomes with MMD-based reweighting (downweighting contaminated/outlier games) instead of plain empirical frequencies.
- **Ambiguity set:** MMD ball (Gaussian kernel on the outcome space: {home win by >3, ...} or point-differential bins) around the robust predictive, ε calibrated per §4's high-probability rule on a validation window.
- **Decision rule:** stake = Kelly fraction computed against the *worst-case* distribution in the ball (adversarial expected log-growth), not the nominal — i.e., robust Kelly. Bet/no-bet gate: post only if worst-case edge > 0.
- **Misspecification gate:** run a quick MMD two-sample check between recent outcomes and the model's predictive; if misspecification is low, fall back to standard (cheaper) sizing per the paper's own finding.
- **Serving:** weekly batch before slate finalization; per-game robust predictive + worst-case edge; log ε and the MMD distance as audit fields.
- **Effort:** ~2–3 weeks (NPL-MMD resampling, kernel MMD machinery, robust-Kelly solver).

## 12. Reproducible test
Dataset: engine predictions + outcomes 2022–2025. Walk-forward weekly: for each game, build robust predictive from prior data, compute worst-case edge in the MMD ball, size via robust Kelly vs baselines: (a) standard Kelly on point estimates, (b) empirical-MMD DRO, (c) standard Bayesian DRO. Metrics: final bankroll, Sharpe, Calmar, max drawdown, and "optimizer's curse" diagnostic = gap between predicted edge and realized edge (should shrink under RoBAS). Stress split: evaluate separately on "contaminated" weeks (backup QBs, extreme weather, divisional chaos) vs clean weeks.

## 13. Acceptance / rejection gate
**ACCEPT if walk-forward:** final bankroll ≥ 1.1 × best baseline AND max drawdown ≤ 0.85 × best baseline's AND the predicted-vs-realized edge gap is ≤ 0.7 × the standard-Kelly baseline's (the optimizer's curse is actually reduced). **REJECT if** robust Kelly posts <50% of the baseline's bet volume (degenerate conservatism — the Fig. 1-right failure) or bankroll < baseline on clean weeks by >5% (robustness price too high where the model is fine).

## 14. Improvement experiment
Beyond the paper: *adaptive* ε per game from the misspecification detector (high MMD distance → larger ball), instead of one global ε — testing whether per-game ambiguity sizing beats the paper's fixed-ε on the bankroll metrics. Second axis: learn the kernel (deep kernel on game features) rather than fixing a Gaussian kernel on outcomes, so the MMD ball respects football-relevant similarity (divisional games near each other in kernel space).

