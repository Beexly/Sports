# [0567] Modelling between- and within-season trajectories in elite athletic performance data (arXiv:2405.17214)

**Citation:** Spyropoulou, M., Hopker, J., & Griffin, J. E. (2024). *Modelling between- and within-season trajectories in elite athletic performance data*. arXiv:2405.17214. URL: https://arxiv.org/abs/2405.17214
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7286 lines per wc -l: Sects. 1–5, Appendix A, Appendix B MCMC sampler 3343–7230, Appendix C).
**Verdict:** ADAPT — decompose GSE team-strength time series into between-season (career) and within-season (form/peaking) trajectories with a constrained Bernstein-polynomial within-season component, plus B-spline age curves for player-prop aging effects and asymmetric-tail errors. The sport is swimming, but the decomposition, shrinkage-for-sparse-athletes, and skew-error machinery are exactly what NFL weekly team ratings and player props need.

## 1. Research question
How do you separate an athlete's career trajectory (between-season trend) from their within-season peaking cycle when observations are irregular, confounded, and sparse? The paper builds a continuous-time Bayesian hierarchical model doing both, extending Griffin et al. (2022) in four directions: (1) within-season change modeled with a constrained Bernstein polynomial (Wang & Ghosh 2012); (2) an error distribution with different heaviness in each tail; (3) a B-spline population ageing function; (4) global-local shrinkage priors for sparse athletes. Applied to elite 100m/200m freestyle swimming.

## 2. Dataset / schema
500 swimmers per event×gender (fastest personal bests 2008–2023, min 5 performances): 100m female 23,669 perfs (median 37.5, min 5, max 267); 100m male 23,440 (38/5/191); 200m female 21,112 (33/5/274); 200m male 19,696 (32/5/162). Confounders: 25m-pool dummy (paper also cites environmental/geographical confounders in Griffin et al. 2022). Each athlete i has S_i seasons, n_{i,j} irregular observations per season, age a_i at first season; ages span ~25 years → L=31 equally spaced knots for the B-spline.

## 3. Method / model

The MCMC sampler (Appendix B, 3343–7230) is a Gibbs sampler with joint updates and interweaving (Yu & Meng 2011), plus adaptive Metropolis–Hastings random walks (univariate tuned to 0.3 acceptance, Atchadé & Rosenthal 2005; multivariate ASWAM, Atchadé & Fort 2010):
- Linear-model representation: y_{i,j} = B_{i,j}δ + X_{i,j}ζ + Z_{i,j}F_i + D_{i,j}β^{(i,j)} + (α/√(1+α²))z_{i,j} + ε*_{ij}; Lomax prior on λ_i^{−2}, τ_i², ψ_1^{−2}, ψ_2² via data augmentation (Makalic & Schmidt 2016): ψ_1²∼IG(1,1/ξ_1), λ_i²∼IG(1,1/ρ_i), ψ_2²∼IG(1,1/ξ_2), τ_i²∼IG(1,1/κ_i), ξ_1,ξ_2,ρ_i,κ_i∼IG(1/2,1).
- Joint block: MH-RW on (ψ_1²,ψ_2²) and (λ_i²,τ_i²) (M+1 blocks), likelihood marginalizing β^{(i)}, F_i, β^{(i,j)} with V_{i,j}=σ_i²diag(ω_{i,j})+ψ_1²λ_i²D_{i,j}^TD_{i,j}.
- Sampled Gaussian blocks: (β^{(i)},F_i)|ψ_1²,ψ_2² ∼ N(Q_1^{−1}(ΣU_{i,j}^TV_{i,j}^{−1}r_{i,j}), Q_1^{−1}), Q_1=ΣU_{i,j}^TV_{i,j}^{−1}U_{i,j}; β^{(i,j)}|· ∼ N(Q_2^{−1}(·),Q_2^{−1}), Q_2=(1/ψ_1²λ_i²)I_C+D_{i,j}^TW_{i,j}^{−1}D_{i,j}, W_{i,j}=σ_i²diag(ω_{i,j}).
- Skew-t augmentation: z_{i,j,k} ∼ truncated N on [0,∞); θ via MH-RW marginalizing ζ,δ; (ζ,δ)|· ∼ N(P^{−1}Q,P^{−1}); β^{(i)} ∼ N((1/Q_2)(1/ψ_2²τ_i² β + 1/ψ_1² Σ(1/λ_i²)β^{(i,j)}), (1/Q_2)I_C), Q_2=(1/ψ_2²τ_i² + 1/ψ_1² Σ(1/λ_i²)).
- Interweaving (Yu & Meng 2011): reparameterize h_{i,j}=β^{(i,j)}−β, sample (ζ,δ,β) ∼ N((P*)^{−1}Q*, (P*)^{−1}), then deterministic back-transform β^{(i,j)}←β^{(i,j)}+β−β_old, β^{(i)}←β^{(i)}+β−β_old.
- Variance blocks: σ_i² ∼ IG(σ_a²+Σn_{i,j}, b*), σ_m² ∼ IG(10^{−2}+Mσ_a², 10^{−2}+Σ(σ_a²/σ_i²)), σ_a² via MH (Gamma-ratio density), α via MH (N(0,3²) prior term α²/3²), β ∼ N(q_1^{−1}(1/ψ_2²)Σ(1/τ_i²)β^{(i)}, q_1^{−1}I_C), q_1=(1/ψ_2²)Σ(1/τ_i²)+1/ψ_3²; λ_i²∼IG(1+CS_i/2, ·+1/ρ_i), τ_i²∼IG(1+C/2, ·+1/κ_i), ψ_1²∼IG(1+(C/2)ΣS_i, ·+1/ξ_1), ψ_2²∼IG(1+MC/2, ·+1/ξ_2), ψ_3²∼IG(10^{−2}+C/2, 10^{−2}+βᵀβ/2), ψ_δ²∼IG(10^{−2}+L/2, 10^{−2}+Σδ_i²/2), σ_μ²∼IG(10^{−2}+M/2, 10^{−2}+(1/2)ΣF_{i,1}²/ω_i^μ), σ_η²∼IG(10^{−2}+½Σ(S_i−1), 10^{−2}+½ΣΣ(F_{i,j}−F_{i,j−1})²/ω_{i,j}^η); auxiliaries ρ_i,κ_i,ξ_1,ξ_2 ∼ IG(3/2, 1+1/·).
- t-df updates: ν_1, ν_2, ν^μ, ν^η via adaptive MH-RW (prior ∝ ν·exp(−0.1ν)), then ω_{i,j,k}∼IG((ν_1+1)/2, ½((resid)²/σ_i²+ν_1)), φ_{i,j,k}∼IG((ν_2+1)/2, ½(z_{i,j,k}²/σ_i²+ν_2)), ω_i^μ∼IG((ν^μ+1)/2, ½(ν^μ+F_{i,1}²/σ_μ²)), ω_{i,j}^η∼IG((ν^η+1)/2, ½(ν^η+(F_{i,j}−F_{i,j−1})²/σ_η²)).

y_{i,j,k} = g(t_{i,j,k}) + f_{i,j}(t_{i,j,k}−a_i−j+1) + x_{i,j,k}ζ + ε_{i,j,k} (Eq. 1). Population ageing function g(t): cubic B-spline with L=31 knots, length scale θ~Exponential(1) (Eq. 2). Individual trajectory split: between-season f*_{i,j}(x) = f*_{i,j}(0) + x·η_{i,j} (linear interpolation between season-start levels, x∈(0,1)) plus within-season h*_{i,j}(z) = Σ_{k=2}^{K}Σ_{v=1}^{k−1} β^{(i,j)}_{k,v} b_{k,v}(z) with b_{k,v}(z)=C(k,ν)z^ν(1−z)^{k−ν}, ν=1..k−1, K=6 (Eq. 3; restricted Bernstein polynomial, h*_{i,j}(0)=h*_{i,j}(1)=0 for identifiability). Season-start levels follow a random walk with t-distributed increments: f*_{i,1}(0)/σ_μ² ~ t_{ν^μ}, η_{i,j}/σ_η² ~ i.i.d. t_{ν^η} (heavy tails → abrupt career changes allowed). Hierarchy for RBP coefficients: β^{(i,j)}~N(β^{(i)}, ψ₁²λ_i I_C), β^{(i)}~N(β, ψ₂²τ_i I_C), β~N(0, ψ₃²I_C), C=K(K−1)/2=15, with global-local shrinkage via standardized Lomax(1/2) priors: λ_i^{−2}, τ_i², ψ_1^{−2}, ψ_2^{−2} ~ Lomax(1/2), p(x)=α^{−1}(1+x)^{−(1+α)} (heavy tail, finite mass at zero — chosen because the horseshoe's half-Cauchy caused MCMC instability). Errors: generalized skew-t with separate tail dfs — ε=ε*+α/√(1+α²)z, ε*~N(0,ωσ_i²), z~TN_{[0,∞)}(0,φσ_i²), ω~IG(ν₁/2,ν₁/2), φ~IG(ν₂/2,ν₂/2); reduces to skew-t when ν₁=ν₂; left-tail heaviness = min(ν₁,ν₂), right-tail = ν₁. Inference: blocking + ASIS-style interweaving Gibbs sampler (Yu & Meng 2011), joint updates, adaptive MCMC (Atchadé & Rosenthal 2005; Atchadé & Fort 2010), MH random-walk blocks marginalizing over ζ,δ; Lomax implemented as IG scale mixture (Makalic & Schmidt 2016 style). Computationally expensive; authors flag variational Bayes as future work.

## 4. Equations & assumptions
- Observation model (Eq. 1): y_{i,j,k} = g(t_{i,j,k}) + f_{i,j}(t_{i,j,k}−a_i−j+1) + x_{i,j,k}ζ + ε_{i,j,k}, f_{i,j}(x) on (0,1) — the within-season fraction.
- Population trajectory (Eq. 2): g(t)=Σ_l δ_l B((t−d_l)/θ), cubic B-splines, equally spaced knots, θ~Exp(1).
- Within-season RBP (Eq. 3): h*_{i,j}(z)=Σ_{k=2}^{K}Σ_{v=1}^{k−1} β^{(i,j)}_{k,v} b_{k,v}(z), K=6, with b_{k,v}(z)=C(k,ν)z^ν(1−z)^{k−ν}.
- Random-walk season starts: f*_{i,1}(0)/σ_μ² ~ t_{ν^μ}, η_{i,j}=f*_{i,j+1}(0)−f*_{i,j}(0), η_{i,j}/σ_η² ~ t_{ν^η}; ν^μ, ν^η ~ Ga(2,0.1).
- Linear-model form (Eq. 4): y_{i,j} = B_{i,j}δ + X_{i,j}ζ + Z_{i,j}F_i + D_{i,j}β^{(i,j)} + ε_{i,j} (Z gives the interpolation; D evaluates RBP basis).
- Univariate summary measures (App. A proof): ∫_0^1 ε(z)dz = Σ_n (1/(n+1))Σ_v a_{n,v}; ∫_0^1 ε(z)²dz = Σ a_{n1,v1}a_{n2,v2} B_{n1,n2,v1,v2} with B_{n1,n2,v1,v2}=C(n1,v1)C(n2,v2)(v1+v2)!(n1+n2−v1−v2)!/(n1+n2+1)!.
- Within-season variability: Δ_i = ψ₁²λ_i Σ_{n,v} B_{n,n,v,v}; average athlete-vs-population effect size: Γ_i = ψ₂²τ_i Σ_{n,v} B_{n,n,v,v}.
- Errors: separate left/right tail heaviness ν₁, ν₂; skewness parameter α~N(0,3²); athlete error scale σ_i²~IG(σ_a², σ_a²/σ_m²).
- Assumptions: seasons are one year; confounder effects linear in ζ; small-season-count athletes strongly shrunk; RBP endpoint constraints (h*=0 at 0,1) chosen, not learned; career trajectory piecewise linear between season starts.

## 5. Features / target
Target: observed performance (race time; lower = better). Features: age/time (continuous), within-season time fraction z∈(0,1), confounders (25m-pool dummy; environmental/geographical in the base model). Output: posterior career trajectory, within-season trajectory, population ageing curve, error density, empirical CDFs of Δ_i and Γ_i across athletes (Fig. 4), posterior mean error densities on original and log scale (Fig. 5).

## 6. Validation design
No holdout forecasting reported. Validation is inferential: posterior summaries, 95% credible intervals on trajectories, posterior mean error densities, empirical distributions of within-season variability across athletes, comparison of error-tail estimates between left and right tails.

## 7. Numerical results / baselines
- Strong within-season effect: e.g., Swimmer 1 improves from ~57s at age 15 to ~53s at 25 career-wise, plus ~2s within-season improvement; Swimmers 1/3/4 show 2/1/2.5s within-season improvements peaking in September (major championships July–August). Swimmer 3's level improves ~3.5s between ages 15 and 21.
- Population within-season trajectory: fairly flat, ~0.3s improvement January–April, constant April–September.
- Ageing function: reverse-J shape, rapid improvement 15–20, peak ~24, slow decline; improvement 15–20 is −1.5s for women vs −2.5s for men; age of peak typically 23–28 (sport/gender/individual-dependent).
- Errors: clearly positively skewed; right tail (worse-than-expected) much heavier than left tail (left tail close to normal) — elites rarely massively underperform relative to overperforming; attributed to athletes being near their optimum (improvements hard; poor performances from illness/injury/execution).
- Δ_i and Γ_i distributions have very heavy right tails (few athletes with large effects); Γ_i is shifted left of Δ_i — season-on-season variability within a swimmer is smaller than between-swimmer variability, i.e., athletes can replicate their seasonal peaking pattern through training.
- 200m freestyle appendix (C) confirms the same qualitative patterns.

## 8. Code / data availability
No code repository or data link given; data are elite swimming performance databases (PB selection 2008–2023). Appendix B gives the full Gibbs sampler explicitly.

## 9. Leakage & limitations
Adversarial notes: (a) no out-of-sample prediction is demonstrated — everything is in-sample posterior description, so "peaking in September" could be fit, not forecast; (b) MCMC is "computationally expensive" per the authors — a weekly NFL re-fit needs the variational-Bayes version that doesn't exist yet; (c) swimming is a closed, individual, CGS sport — team sports add opponent confounding the model has no term for; (d) the one-year-season assumption, reverse-J age curve, L=31 knots, K=6 RBP degrees, and the Lomax(1/2)/Ga(2,0.1) priors are sport- and data-scale-specific; (e) the RBP endpoint constraints h*(0)=h*(1)=0 and the between-season piecewise-linear interpolation are chosen, not learned — shape restrictions could mask real form dips (e.g., mid-season slumps); (f) the "heavy downside tail" finding is for timed events where underperformance dominates; team-sport performance is margin-based, where the tail asymmetry may look different; (g) the horseshoe alternative was unstable — a warning that prior choice is load-bearing here, not decorative.

## 10. GSE overlap
Extension. The corpus has state-space team-strength models and calibration work, but no between/within-season decomposition of team ratings, no B-spline age curves, and no asymmetric-tail error modeling for performance data. This is new machinery for GSE's longitudinal modeling.

## 11. GSE implementation spec
1. Team form decomposition: model each NFL team's weekly EPA/play (or GSE's rating) 2015–2025 as y_{team,season,week} = g(season-index) + f_{team,season}(week/18) + opponent/confounder terms, with f split into between-season level and within-season RBP — this separates "the Chiefs are declining as a roster" from "the Chiefs start slow and peak in December." 2. Player-prop age curves: fit the cubic B-spline population ageing function to position-level performance (e.g., QB EPA/dropback, WR yards/route by age) for age-adjustment in props — the reverse-J with position-specific peaks. 3. Replace Gaussian error assumptions in GSE's form model with the asymmetric-tail skew-t: the paper's finding (downside tail heavier) matches NFL reality (injuries → sudden collapse is more likely than sudden superstar emergence). Start with a non-Bayesian prototype (penalized likelihood) to avoid the MCMC cost. Effort: ~2–3 weeks for the prototype on existing nflverse data.

## 12. Reproducible test
Dataset: NFL team EPA/play per week 2015–2025 (nflverse), player-season age + performance for QBs/WRs/RBs. Protocol: fit the between/within-season decomposition; test whether the within-season component predicts second-half season performance better than a flat season average (rolling: fit weeks 1–9, predict weeks 10–18, compare MSE). For age curves: fit B-spline on 2015–2022, predict 2023–2025 age-related performance changes vs a linear age term.

## 13. Acceptance / rejection gate
Adopt the decomposition if the within-season trajectory component reduces second-half prediction MSE by ≥5% vs the flat-season-average baseline on the 2015–2025 rolling test — then within-season form is real signal, not noise. Reject if the gain is <2%: NFL's 17-game season may be too short for the within-season Bernstein component to beat a simple recency-weighted average, and the extra complexity isn't justified.

## 14. Improvement experiment
The paper's missing piece is forecasting. Build the forward-looking version: extend the model with a predictive distribution for the remaining within-season trajectory given weeks 1–k (the hierarchical prior naturally supports this — teams with few observations borrow from population/athlete-level curves). Backtest: at each week k=4..14, predict rest-of-season team strength and compare against GSE's current form estimator on log-loss of game outcomes. If the hierarchical within-season forecast wins, GSE gains a principled "team is rounding into form" signal — the exact analogue of the paper's swimmers peaking for August championships, applied to December football.
