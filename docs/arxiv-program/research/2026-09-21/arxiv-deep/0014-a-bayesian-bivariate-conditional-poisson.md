# [0014] A Bayesian bivariate conditional Poisson regression for goal dependence in the English Premier League (arXiv:2608.07168)

**Citation:** Marcus Nolan, Wagner Barreto-Souza, Luiza S.C. Piancastelli, Raanju R. Sundararajan (2026). *A Bayesian bivariate conditional Poisson regression for goal dependence in the English Premier League*. arXiv:2608.07168v1. URL: https://arxiv.org/abs/2608.07168
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v1), all 706 lines — §1 introduction, §2 data (exploratory EPL match statistics), §3 methodology (BCP likelihood, empirical-Bayes priors, Stan/HMC, PPCs, WAIC/ELPD-LOO selection), §4 results + discussion, §5 conclusion, software/data availability, references.
**Verdict:** ADAPT — not for soccer modeling itself (outside every GSE lane), but the Bayesian conditional-bivariate Poisson + PSIS-LOO directional-comparison framework is directly portable to NFL home/away points joint modeling for correlated spread/total lines. The catch: this paper models scorelines with attendance and fouls only — no team strength parameters at all — so GSE would re-specify the intensity regressions with its own team/efficiency features.

## 1. Research question
Whether allowing signed (negative or positive) home–away goal dependence via a Bayesian bivariate conditional Poisson (BCP) regression improves EPL scoreline modeling over independent-Poisson (Dixon–Coles-style) models; which directional factorization (home→away vs away→home) predicts better; and whether attendance and fouls explain part of home advantage.

## 2. Dataset / schema
1,140 EPL matches from three seasons (2018–19, 2020–21, 2023–24; attendance variation spans pre-pandemic crowds, closed doors, and post-pandemic crowds). Per match: home goals, away goals, stadium attendance, home fouls, away fouls. Publicly sourced; authors describe the construction steps (§2). No tracking/xG/player-level data; no team-strength indicators in the model.

## 3. Method / model
BCP(λ₁,λ₂,φ) reparameterization of Berkhout & Plug (2004) per Piancastelli et al. (2023a): Y₁ ~ Poisson(λ₁); Y₂ | Y₁=y₁ ~ Poisson(μ₂ e^{φy₁}) with μ₂ = λ₂ exp(−λ₁(e^{φ}−1)). Log-linear intensities: log λ_{j,i} = β_{0,j} + β_{j,Att} log(Attᵢ+1) + β_{j,F} FS_{i,j} (fouls suffered by team j). Empirical-Bayes priors: each θ ~ N(0, sê(θ̂_MLE)²), independent. Stan/HMC, 4 chains × 2,000 iterations (1,000 warmup). Model selection by PSIS-LOO (and WAIC); posterior predictive checks on marginal mean/variance, goal correlation, and proportion of home losses; directionality compared via conditional ELPD₂ = Σᵢ E[log p(y_{i,2} | y_{i,1}, θ)]. Three fits: BCP A→H, BCP H→A, independent Poisson.

## 4. Equations & assumptions
Eq. (1) representation above. Joint pmf: f(y₁,y₂|λ₁,λ₂,φ) = λ₁^y¹λ₂^y²/(y₁!y₂!) · exp{−λ₁(1+y₂(e^φ−1)) − λ₂ exp{−λ₁(e^φ−1)+φy₁} + φy₁y₂}. E(Y₂)=λ₂; Var(Y₂)=λ₂+λ₁λ₂(e^φ−1)²; Cov(Y₁,Y₂)=λ₁λ₂(e^φ−1); Corr = (e^φ−1)·√(λ₁λ₂/(1+λ₂(e^{λ₁(e^φ−1)²}−1))). φ=0 ⇒ independence; sign(φ) sets dependence direction; correlation in φ is nonlinear with near-zero |φ| giving strongest dependence. Likelihood (2): product over matches of the joint pmf. Posterior (4): π(β,φ|y,X) ∝ f(y|β,φ,X)π(β)p(φ). PPC: p(y_rep|y) = ∫ p(y_rep|θ)p(θ|y)dθ. ELPD_i = E_{θ~p(θ|y_{-i})}[log p(y_i|θ)]. Assumptions: matches independent; Y₂'s distribution conditional on Y₁ is a modeling choice (directional factorization), not causal; attendance log-shift log(Att+1) for closed-door games; prior independence of all parameters; authors note the correlation structure is a "predictive factorization" and that attendance is "an adjusted association rather than a causal crowd effect."

## 5. Features / target
Inputs: log(Attendance+1), fouls suffered by the modeled team (two foul covariates), no team-strength terms. Target: joint home/away goal counts (2-vector per match). No forward horizon — in-sample posterior predictive assessment only.

## 6. Validation design
PSIS-LOO (leave-one-match-out) ELPD on the joint distribution plus conditional ELPD₂ for directionality; posterior predictive checks with 4,000 replications vs independent-Poisson baseline; MCMC diagnostics (R̂≈1, n_eff, trace plots). No held-out season or chronological split — LOO over all 1,140 matches.

## 7. Numerical results / baselines
- ELPD-LOO (joint): BCP A→H −3552.0, BCP H→A −3552.1, independent Poisson −3565.0 — dependence helps (≈13 ELPD points); directions indistinguishable jointly.
- Conditional ELPD₂: H→A −1721.8 vs A→H −1817.2 — conditional accuracy favors modeling away goals given home goals.
- φ (H→A): posterior mean −0.107, 95% CI [−0.147, −0.066] — one home goal multiplies the away conditional mean by exp(−0.107) ≈ 0.899 (≈10% reduction, "not a 10% reduction in the probability of scoring").
- β_{1,Att} (attendance → home goals): 0.024, 95% CI [0.013, 0.034] — ≈0.024% expected home-goal increase per 1% attendance increase (elasticity); β_{2,Att}: 0.000, CI [−0.011, 0.011].
- Foul effects: β_{1,AF} 0.012, CI [−0.001, 0.025]; β_{2,HF} 0.007, CI [−0.008, 0.022] — both 95% CIs include zero; at most weak association.
- PPCs: all models reproduce marginal means/variances; independent Poisson fails on the observed goal correlation and home-loss proportion; BCP replicates match them.
- Sampling: 4 chains × 2,000 (1,000 warmup); R̂≈1.0, large n_eff.

## 8. Code / data availability
Stan code "available from the authors upon request" (not released); match statistics and attendance from publicly accessible sources with construction steps in §2 — partially reproducible in principle, not in practice.

## 9. Leakage & limitations
No held-out validation (LOO only); three cherry-picked seasons confound attendance with pandemic conditions/team composition/scoring environment; no team attack/defense strengths — the authors flag this as the main missing piece; attendance effect is descriptive, not causal; trace plots omitted "to save space" (rely on R̂/n_eff claims); Stan code and replication scripts not public; foul covariates are a crude proxy (no red cards, xG, rest, weather, referees).

## 10. GSE overlap
New capability, no duplication. GSE models spreads/totals; this paper's joint home/away points distribution with signed dependence is a statistical tool the engine-benchmark lane doesn't currently list. Closest existing concepts: Poisson score models generally and the listed match-prediction literature. The transferable insight: conditional ELPD₂ as a directionality diagnostic and PSIS-LOO for comparing joint vs independent scoreline models. Not a competitor to existing GSE work.

## 11. GSE implementation spec
ADAPT path: fit a BCP (or NFL count analogue — negative binomial/CMP variants) to NFL home/away points with intensities parameterized by GSE's existing team strength features (off/def EPA, success rate, injuries, weather) instead of attendance/fouls; compare joint vs independent specifications via PSIS-LOO; use the fitted joint distribution to derive correlated spread+total probabilities (parlay/market pricing). Engineering: reimplement in Stan or PyMC; match-level LOO over 3–5 NFL seasons. Effort: 2–4 days for a first fit, including the directional-comparison diagnostic.

## 12. Reproducible test
The paper's own test, ported: on 3+ seasons of NFL scores, fit (a) independent home/away point models, (b) BCP-style conditional joint models in both directions, with team-strength covariates; compare PSIS-LOO and PPCs on home/away correlation and margin tails. Accept only if the conditional specification beats the independent baseline by ≥5 ELPD points and reproduces the observed home–away point correlation the independent model misses.

## 13. Acceptance / rejection gate
ADOPT the technique (not the soccer model) if the test in §12 passes on NFL data with GSE features; keep the H→A vs A→H directional diagnostic as a standing check whenever joint scoreline models are compared. Do not adopt the attendance/foul covariate story — it has no NFL analogue at this specificity.

## 14. Improvement experiment
The experiment the paper didn't run: add hierarchical team attack/defense effects (its own suggested extension, citing Egidi et al. 2018) and re-run the conditional ELPD₂ comparison — dependence may shrink once team quality is modeled, and that shrinkage is itself the quantity of interest for market applications. For GSE, the sharper version: include market-implied team totals as an intensity offset and test whether residual dependence survives; if it does, it is genuine joint-shape signal the market's independent spread/total pricing may miss.
