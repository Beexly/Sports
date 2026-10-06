# [1543] A Bayesian Marked Spatial Point Processes Model for Basketball Shot Chart (arXiv:1908.05745)

**Citation:** Jieying Jiao, Guanyu Hu, Jun Yan (2019). *A Bayesian Marked Spatial Point Processes Model for Basketball Shot Chart*. arXiv:1908.05745. URL: https://arxiv.org/abs/1908.05745
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — joint modeling of where attempts happen (non-homogeneous Poisson intensity over NMF archetypal shot types) and whether they succeed, with the fitted intensity entering the success model as a covariate, is directly portable to NFL: target-location intensity × completion/success models for QBs and receivers, plus clustering players into archetypal styles from fitted coefficients.

## 1. Research question
Is a basketball player's field-goal percentage higher at locations where he shoots more often? The paper builds a Bayesian joint marked spatial point process: shot locations as a non-homogeneous Poisson process, make/miss marks via logistic regression with the location's fitted intensity as a covariate (coefficient ξ), testing ξ ≠ 0 vs ξ = 0 by DIC and LPML on Curry, Durant, Harden, James (2017–18) and the top-50 shooters.

## 2. Dataset / schema
2017–18 NBA regular season shot charts (NBAsavant.com: stats.nba.com + ESPN shot tracker consolidation): per shot — game date, opponent, period, time left, make/miss mark, 2PT/3PT type, distance (rounded to foot), (x, y) coordinates. Four focal players: Curry (740 shots, 57% 3PT rate), Durant, Harden, James (1409 shots); FG% 45% (Harden)–52% (James). Extended set: top 50 most frequent shooters (813–1,517 shots). NMF bases built from 2016–17 kernel intensity estimates of 407 players with 50+ makes. Access: NBAsavant.com (no direct link stated).

## 3. Method / model
Marked point process (S, M): locations from NHPP with λ(s_i) = λ_0 exp(X(s_i)^T β) (1), where X = 10 NMF basis "shot types" (basis 1: long 2s; 2–3: wing 3s; 4–5: restricted area; 7: top-of-key 3s; 8: center 3s; 9: corner 3s; 10: mid-range 2s) on a 50×35 one-foot grid. Mark model: m(s_i)|Z ~ Bernoulli(θ(s_i)), logit θ(s_i) = ξ λ(s_i) + Z(s_i)^T α (2), with intensity × shot-type interaction plus shot distance, seconds left, period dummies, playoff-opponent indicator. Priors: vague — λ_0 ~ G(0.01, 0.01); β, ξ, α ~ N(0, 100) (4). Inference: Metropolis-within-Gibbs in nimble; Poisson integral by Riemann approximation on the 50×35 grid; 60,000 iterations, 20,000 burn-in, thin 10 (4,000 draws); convergence via trace plots. Model comparison: DIC and LPML decomposed into intensity + conditional-mark components (Zhang et al. 2017).

## 4. Equations & assumptions
- λ(s_i) = λ_0 exp(X^T(s_i) β) (1); locations likelihood Π_i λ(s_i) exp(−∫_B λ(s) ds).
- logit θ(s_i) = ξ λ(s_i) + Z^T(s_i) α (2).
- Joint log-likelihood (3); posterior π(Θ|S,M) ∝ L(Θ|S,M) π(Θ) (5); priors (4).
- DIC = Dev(Θ̄|S,M) + 2p_D (joint DIC = intensity DIC + mark DIC).
Assumptions: Poisson (no clustering/inhibition of attempts beyond covariates); intensity constant within each 1-ft grid box; NMF bases from the prior season are adequate archetypes; ξ linear in λ(s); vague priors non-influential.

## 5. Features / target
Inputs: spatial basis loadings (10 NMF shot types), shot distance, shot type (2PT/3PT), time left, period, opponent playoff status. Targets: attempt locations (intensity) and make/miss marks. Horizon: per-shot, within season.

## 6. Validation design
Simulation studies: 200 replicates per setting on a [−1,1]² square (λ_0 ∈ {0.5, 1} → ~850/1700 points; ξ = 0.5; α_1 ∈ {0.8, 1, 2}) — empirical bias ≈ 0, posterior SD ≈ empirical SD, 95% CI coverage ≈ nominal 0.95. Real-data model comparison: DIC + LPML for ξ ≠ 0 vs ξ = 0 per player. Benchmarks: the two nested variants against each other (no external baseline). Secondary analysis: Ward hierarchical clustering of 51 players into 5 groups from fitted coefficients.

## 7. Numerical results / baselines
Paper's reported numbers (quoted), Table 1. Curry: intensity-INDEPENDENT mark preferred (DIC 2379.2 vs 2391.3; LPML −1189.6 vs −1195.7). Durant: ξ ≠ 0 (DIC 2977.1 vs 2985.7; LPML −1489.6 vs −1493.8). Harden: ξ ≠ 0 (1744.4 vs 1753.7; −872.4 vs −877.0). James: ξ ≠ 0 (760.8 vs 802.0; −380.8 vs −401.2). Top 50: 40/50 (80%) favored the intensity-dependent model; all estimated ξ > 0; intensity × shot-type interactions all insignificant; for the 10 intensity-independent players, shot distance significantly negative in every model. Clustering: 5 shot-pattern groups (e.g., Curry/Harden/James group: fewer long/mid 2s, more 3s especially left-wing; Durant group: more long/mid-range 2s).

## 8. Code / data availability
Methods use R packages nimble, NMF, spatstat (named, no repo link). Data via NBAsavant.com.

## 9. Leakage & limitations
Adversarial notes: (1) 80%-positive finding is descriptive — no causal identification of why intensity and accuracy correlate (familiarity vs selection vs defensive attention). (2) Poisson assumption ignores within-game clustering of attempts. (3) NMF bases from the prior season may misrepresent current-season styles. (4) Curry — the most interesting case — rejects the intensity-dependent mark, so the headline 80% has a famous counterexample. (5) DIC/LPML differences for some players are modest (Curry ΔDIC = 12, Durant ΔDIC = 8.6). (6) Single season, no out-of-sample prediction of future makes.

## 10. GSE overlap
Existing map: spatial shot/target modeling exists in the corpus (e.g., 1536's spatial probit for soccer shots), but a marked point process that jointly models attempt intensity and success with intensity-as-covariate, built on NMF archetypal bases with player clustering from fitted coefficients, is not inventoried. Directly relevant to NFL target-location and route data.

## 11. GSE implementation spec
1. Adapt to NFL: target locations (NGS) as NHPP with intensity over NMF-derived archetypal target zones (short-left, deep-middle, etc., built from prior-season target data); completion/success mark model with fitted target intensity as covariate (ξ) — test whether QBs complete more where they target more.
2. Extend to EPA per target/carry: continuous mark model (Gaussian or hurdle) with intensity covariate.
3. Cluster QBs/receivers into archetypal styles from fitted basis coefficients (Ward, k=5) for matchup-typing and DFS stacking decisions.
4. Effort: ~2 weeks in the gse-lab on NGS 2022–2025 target data.

## 12. Reproducible test
Dataset: NGS target/completion locations 2022–2024 fit, 2025 held-out. Metric: DIC/WAIC comparison of ξ ≠ 0 vs ξ = 0 completion models per QB (min. 200 attempts); held-out log-loss of completion probability. Gate: intensity-dependent mark must beat ξ = 0 on held-out log-loss for a majority of qualifying QBs before the ξ mechanism is used in projections.

## 13. Acceptance / rejection gate
ADOPT the intensity + mark joint framework and the NMF-archetype clustering if the QB replication shows ξ ≠ 0 winning on held-out log-loss for most qualifying QBs; REJECT the assumption that ξ > 0 universally (Curry counterexample — fit per player, don't pool); REJECT DIC-only model selection — require held-out log-loss confirmation.

## 14. Improvement experiment
Beyond the paper: model attempt clustering (Cox/Log-Gaussian Cox process instead of Poisson); time-varying intensity (within-game, by score state); defender-proximity as a mark covariate (the missing defensive-attention confounder); and test the causal direction with a within-player experiment — does accuracy lead intensity (selection) or follow it (familiarity)? Use early-season intensity to predict late-season accuracy vs the reverse.
