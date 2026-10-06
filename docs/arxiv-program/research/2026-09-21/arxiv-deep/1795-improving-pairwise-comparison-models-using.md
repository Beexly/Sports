# 1795 Improving Pairwise Comparison Models Using Empirical Bayes Shrinkage (arXiv:1807.09236v1)

**Citation:** Stephen Ragain, Alexander Peysakhovich, Johan Ugander (2018). *Improving Pairwise Comparison Models Using Empirical Bayes Shrinkage*. arXiv:1807.09236v1. URL: https://arxiv.org/abs/1807.09236v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Maximum likelihood estimation of Bradley-Terry-Luce / conditional-multinomial-logit team strengths has high variance in small-data, sparsely-connected settings (e.g., a 16-game NFL season with weak cross-conference connectivity). Can Empirical Bayes (James–Stein) shrinkage of the MLE — with the shrinkage direction and magnitude driven by an estimated *pairwise* uncertainty (covariance) matrix rather than independent per-team variances — improve out-of-sample prediction of win percentages and matchup probabilities, and which covariance estimator (observed/expected Fisher information vs. four bootstrap variants) works best for sports data?

## 2. Dataset / schema

- **NFL2016:** all 256 regular-season games, 32 teams, 16 games/team; conference/division structure → poor cross-conference connectivity.
- **NBA2016:** all 1,260 games, 30 teams, 82 games/team; better connectivity (2 cross-conference games per pair).
- **Semi-synthetic:** real NFL2016 schedule (matchup matrix B^D fixed), team "skills" drawn uniform on the simplex, outcomes sampled from the implied BTL model — ground truth known.
- **MLB2016:** 214,865 at-bats (restricted to strongly-connected component), 787 batters + 309 pitchers; bipartite Rasch structure.
- **AllOurIdeas:** 143,704 survey comparisons among 67 figures (efficiency/small-sample study).
- **Access:** no data/code links in the paper; NFL/NBA/MLB game results reproducible from public archives (Retrosheet cited for MLB).

## 3. Method / model

Two-stage: (1) fit BTL/MNL MLE γ̂_MLE via iterative Luce spectral ranking (I-LSR), with a Dirichlet(ε,…,ε) prior (ε = 10⁻⁶) to keep bootstrap replicates strongly connected; (2) shrink via the James–Stein form γ̂_SHR = (I − R)γ̂_MLE + Ru with R̂ = (I + AS)⁻¹, where S estimates the precision Σ⁻¹ (so no matrix inversion of Σ is needed) and A is a Dirichlet prior covariance on the true parameters. Six covariance estimators compared: observed Fisher Σ̂_𝒥, expected Fisher Σ̂_ℐ, and four bootstraps — blocked/non-blocked × parametric/non-parametric (Σ̂_{b,p}, Σ̂_{b,np}, Σ̂_{nb,p}, Σ̂_{nb,np}) — with Ledoit–Wolf shrinkage of the bootstrap sample covariance toward diagonal in all empirical results.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- BTL choice rule: p_{ij} = γᵢ/(γᵢ + γⱼ); log-likelihood ℓ(γ;𝒟) = Σ_{(i_k,j_k)∈𝒟} log(γ_{i_k}) − log(γ_{i_k} + γ_{j_k}).
- James–Stein: γ̂_JS = (I − Σ(Σ+A)⁻¹)γ̂_MLE + Σ(Σ+A)⁻¹u.
- Inversion-free shrinkage: R̂ = (R̂⁻¹)⁻¹ = (I + AS)⁻¹, with S = N·𝒥(γ̂_MLE,𝒟) or N·ℐ(γ̂_MLE,𝒟).
- Ledoit–Wolf: Σ̂_SHR = (1−ν)Σ̂_S + νσ̄I, σ̄ = (1/n)Σᵢσ̂ᵢ.
- Prior covariance: A_{ii} = γ̂_{MLE,i}(1−γ̂_{MLE,i})/(n(n+1)), A_{ij} = γ̂_{MLE,i}γ̂_{MLE,j}/(n+1); shrink target uᵢ = 1/n.
- Data factorization: Pr(𝒟) = Pr(B^𝒟)(Π_{(i,j)∈𝒟} p_{ij}) — the matchup-distribution term is what standard choice modeling ignores.

Assumptions stated: MNL/BTL is the data-generating process (semi-synthetic tests); matchup structure and outcomes independent; for the Rasch/MLB case, batters shrink toward the batter mean and pitchers toward the pitcher mean (separate u baselines); win percentage is an acceptable proxy for parameter accuracy on real data (schedules not identical).

## 5. Features / target

Features: none beyond the comparison graph (who played whom) — pure strength estimation. Target: pairwise win probabilities p_{ij} and team win percentages.

## 6. Validation design

Semi-synthetic: 1,000 random ground-truth draws × resampled seasons; metrics α (relative MSE improvement on γ*) and β (relative improvement on mean pairwise-probability error ‖γ−γ′‖_P = (1/n²)Σ_{i,j}|p_{ij} − p′_{ij}|). Real data: 2-fold CV (train on half the games, predict the other half), averaged over 1,010 runs for NFL/NBA; MLB: train on 5%, test on 95% (2020-fold CV); AllOurIdeas: subsample-size sweep, 25 shuffles. No leakage: test matchups/outcomes never in training.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly:

- **Semi-synthetic (NFL2016 schedule, expected Fisher):** parameter MSE reduced 51% (α = 0.51); pairwise-probability error reduced 12% (β = 0.12).
- **NFL2016 win% MSE:** MLE 0.0591 → observed Fisher 0.0525 (−11.1%), expected Fisher 0.0499 (−15.5%), parametric blocked bootstrap Σ̂_{b,p} 0.0491 (**−16.8%**), parametric non-blocked Σ̂_{nb,p} 0.0491 (−16.8%); non-parametric bootstraps ≈ −0.9% (useless — they can't resample single-occurrence matchups).
- **NFL2016 matchup-level Brier MSE:** Fisher −5.4%/−7.2%; parametric bootstraps −9.2% each; non-parametric −1%.
- **NBA2016 win% MSE:** MLE 0.0104 → best (parametric non-blocked bootstrap) 0.0094 (−9.1%); matchup-level gains <1% (42 games/team in training — shrinkage matters less with data).
- **MLB2016 Rasch (train 5% / test 95%):** win% MSE 0.0209 → 0.0180 (−13.8%, observed Fisher) → 0.0173 (**−17.2%**, expected Fisher); shrinkage correctly contracts batters and pitchers to *separate* baselines and accounts for pitcher strength faced (unlike Efron–Morris on raw averages).
- **AllOurIdeas:** large matchup-error reductions at small sample sizes; win-rate error reduced even at large samples.
- Practical guidance from the paper: use parametric bootstrap when feasible (best); Fisher information when bootstrapping is intractable (MLB: 214k at-bats); blocked bootstrap suits static schedules (NFL), non-blocked suits irregular ones (MLB rotations).

## 8. Code / data availability

No code or data links in the paper. I-LSR algorithm from Mayr et al. (2015) is public; all estimators implementable from the equations above.

## 9. Leakage & limitations

- **Win% as proxy:** schedules aren't identical, so win% prediction conflates strength with schedule — the paper acknowledges this; the semi-synthetic β = 0.12 on true pairwise probabilities is the cleaner number.
- **BTL-only world:** no margin-of-victory, no home field, no time dynamics — a real NFL rating needs all three; shrinkage is a variance-reduction wrapper, not a feature model.
- **Bootstrap cost:** parametric bootstrap with per-replicate MLE is expensive at GSE scale (fine for 32 NFL teams, heavy for player-level graphs).
- **Prior choice is ad hoc:** the Dirichlet A-matrix and u = 1/n target are reasonable defaults, not tuned; the double-shrinkage problem (shrinking Σ̂ and γ̂ simultaneously) is unsolved in general — ν chosen by CV.
- **Non-parametric bootstrap failure mode** is itself a finding: on sparse NFL-like data it captures ~nothing (−0.9%); anyone implementing this must use the parametric variant.

## 10. GSE overlap

The corpus has Elo/Glicko/TrueSkill rating ledgers and a Bayesian win-probability ledger (1789), but no ledger addresses the **variance of rating estimates** or applies shrinkage to pairwise-comparison parameters — the exact small-data regime GSE lives in (17-game NFL seasons, early-season ratings from 2–4 games, cross-conference games rare). The paper's NFL2016 experiment is literally GSE's problem: 256 games, 32 teams, weak inter-conference edges. The conference-connectivity insight (high uncertainty on cross-conference pairs) maps directly to GSE's early-season AFC-vs-NFC pricing. Not a duplicate; fills the rating-regularization gap.

## 11. GSE implementation spec

1. **Shrinkage wrapper for team ratings:** after each ratings update (Elo/BTL-style), compute expected Fisher information Σ̂_ℐ from the season's matchup graph, form R̂ = (I + AS)⁻¹ with S = N·ℐ, and publish γ̂_SHR = (I−R̂)γ̂_MLE + R̂u (u = league-average rating). Zero change to the rating model itself — pure post-processing.
2. **Cross-conference uncertainty:** use the diagonal of Σ̂ to flag high-variance pairs (early-season inter-conference games) and widen published probability intervals / reduce stake sizing there — connects to the abstention/sizing lane.
3. **Player-level extension:** apply the Rasch variant (separate shrink targets per position group) to player-impact ratings, mirroring the MLB batter/pitcher treatment.
4. Cost: ~2 days (ratings pipeline exists; Fisher computation on a 32-node graph is trivial).

## 12. Reproducible test

Dataset: NFL 2015–2025 game results. Baseline: current engine team ratings (MLE-equivalent). Protocol: at each week 1–8 of 2023–2025, fit ratings on games so far, apply Fisher-shrinkage, predict rest-of-season win% and game outcomes. Metrics: Brier score on game outcomes, MSE on final win%, calibration curves. Success gate below.

## 13. Acceptance / rejection gate

**Adopt as a permanent post-processing step if** shrunk ratings beat unshrunk on rest-of-season Brier score in ≥2 of 3 test seasons (2023–2025) with no calibration degradation (ECE within 0.003), replicating the paper's −5% to −9% matchup-level gains; **reject** if gains vanish once margin-of-victory and home-field features are included (the paper's BTL has neither — richer likelihoods may already soak up the variance). Either way, keep the Fisher-information uncertainty diagnostic (§11.2) as a standing model-health metric.

## 14. Improvement experiment

**Schedule-aware matchup-distribution model:** the paper's core theoretical point is that Pr(𝒟) = Pr(B^𝒟)·Πp_{ij} and the matchup term is unmodeled. Build Pr(B^𝒟) for the NFL explicitly — the schedule is *known in advance* (rotation formulas + prior-year standings), so future matchup graphs are deterministic, not random. Use the known future schedule to compute the *expected* Fisher information for games not yet played, and shrink current ratings toward minimizing expected future-prediction variance rather than in-sample variance. Hypothesis: schedule-aware shrinkage beats the paper's retrospective version early in the season (weeks 1–4), when the unplayed schedule dominates uncertainty. Test: weeks 1–4 ratings, 2023–2025, predict weeks 5–17; success = Brier improvement ≥0.004 over the paper's method. If it works, this is a genuinely novel contribution worth publishing.

**Verdict:** ADAPT
