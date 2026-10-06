# [0564] Convergence and stationary distribution of Elo rating systems (arXiv:2410.09180)

**Citation:** Cortez, R., & Tossounian, H. (2025). *Convergence and stationary distribution of Elo rating systems*. arXiv:2410.09180. URL: https://arxiv.org/abs/2410.09180
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 11399 lines; sections 1–5, all theorems and numerical experiments).
**Verdict:** ADAPT — the theory gives GSE two concrete engineering rules: (1) equilibrium Elo error scales as √K, quantifying the K-factor responsiveness-vs-noise trade-off; (2) raw Elo ratings are biased estimators of true skill, but the transformed prediction b(rating-diff) is unbiased for the true win probability — so trust GSE's probability calibration even when ratings look systematically off. No new estimator, but principled backing plus a K-factor selection law.

## 1. Research question
What is the large-time behavior of the Elo process? The authors prove (for fixed N and K, no scaling limit, no compactness assumptions) that the Elo Markov chain has a unique stationary distribution π to which it converges a.s. and in Wasserstein metrics, and characterize π: finite exponential moment, full support on the zero-sum subspace, and quantitative √K convergence to true skills.

## 2. Dataset / schema
No real data. Four Monte Carlo experiments, all N=2 players, b(x)=tanh(0.5x), binary scores {−1,1}: (4.1) density of X¹ for 5 values of ρ¹∈[0,1], K=0.4, 5×10⁷ samples/curve; (4.2) density for 5 values of K∈[0.02,1.2], ρ¹=0, 5×10⁷ samples/curve; (4.3) E[X¹] vs ρ¹ over 101 ρ¹∈[−1,1], K=1, 5×10⁵ samples/point; (4.4) E[|X¹−ρ¹|] over 100 logarithmically spaced K∈[10⁻³,1], ρ¹=0.5, 5×10⁴ samples/point.

## 3. Method / model
Elo as a Markov chain on the zero-sum subspace Z_N: at each step pick a uniform random ordered pair (i,j), sample score S^{ij}∼σ^{ij}, update X^i ← X^i + K(S^{ij} − b(X^i−X^j)), X^j ← X^j − K(S^{ij} − b(X^i−X^j)). Proof machinery: Lemma 5 (natural-coupling contraction estimate), Lemma 7 (Foster–Lyapunov drift giving exponential moments), tightness of Cesàro means → existence of π, natural-coupling → uniqueness and a.s. convergence, Lyapunov + coupling → full support.

## 4. Equations & assumptions
- Update rule (Eq. 1): X^i ← X^i + K{S^{ij} − b(X^i−X^j)}, X^j ← X^j − K{S^{ij} − b(X^i−X^j)}.
- Expected-score model (Eq. 3): E[S^{ij}] = b(ρ^i−ρ^j), with b(x)=tanh(cx) (Eq. 2).
- Assumptions (A1)–(A5): X_0,ρ ∈ Z_N; b odd, strictly increasing, L-Lipschitz with ℓ_M>0 on compact sets (Eq. 4); E[S^{ij}]=b(ρ^i−ρ^j), σ^{ji}=−σ^{ij}; KL<1 (Eq. 4); supp(σ^{ij})⊇{−1,1} (upsets possible both ways). §1.3 discussion: symmetrization trick removes HFA from the model (b̃(u)=b(u+c) for HFA noted but excluded); KL<1 is standard; ℓ_M=b'(M) for logistic.
- Coupling: Lemma 6 inequality (Eq. 7): ‖X_{t+1}−Y_{t+1}‖²−‖X_t−Y_t‖² ≤ −2K(1−KL)|X_t^{I_t}−X_t^{J_t}−Y_t^{I_t}+Y_t^{J_t}|·|b(X_t^{I_t}−X_t^{J_t})−b(Y_t^{I_t}−Y_t^{J_t})|.
- Lyapunov (Lemma 7, Eqs. 8–9): V_a(x)=Σ_i cosh(a(x^i−ρ^i)), E[V(X_1)|X_0=x]−V(x) ≤ −cV(x)+c̃ via Taylor expansion (first-order term non-positive since b and sinh increasing; choose a small so the second-order term is controlled).
- Theorem 10: natural coupling → ‖X_t−Y_t‖ non-increasing a.s., limit H≡0 proved by contradiction (H>0 ⇒ M_t→∞ ⇒ ‖Z_t‖→∞ contradicts the uniform moment bound of Theorem 8).
- Theorem 11: existence of π via tightness of Cesàro means μ_t=(1/t)ΣΘ^kν (Θ is the one-step kernel map, continuous under weak convergence — Krylov–Bogolyubov), exponential-moment bound inherited, uniqueness from Theorem 10, W_p convergence by dominated convergence.
- Theorem 22: supp(π)=Z_N (full support) via Lemmas 17–21: N=2 binary-score maps E_±(u)=u+K{±1−b(2u)} diverge to ±∞ and expand inverse preimages (Lemmas 17–18), reachability of any interval via win/loss paths (Lemma 19), extension to N players and general scores in [−1,1] using (A5) (Lemma 20), path broadening to positive-probability neighborhoods (Lemma 21).
- Variance identity (Lemma 13): K·Var(S^{IJ}) ≤ E[|X^I−X^J−ρ^I+ρ^J|·|b(X^I−X^J)−b(ρ^I−ρ^J)|] ≤ 2K.
- Key estimate (Lemma 15): E[|X^I−X^J−ρ^I+ρ^J|] ≤ √(8K/ℓ_η) for K ≤ ℓ_η/2, η=1+2max_i|ρ^i|.
- Zero-sum identities (Lemma 9): ‖x‖²=(1/2N)Σ_{i,j}(x^i−x^j)², |x|_1 ≤ (1/N)Σ_{i,j}|x^i−x^j|.
- Main bound (Theorem 16 / Theorem 1(vii)): E[(1/N)|X−ρ|_1] ≤ ((N−1)/N)·√(8K/ℓ_η) for X∼π and all K ≤ ℓ_η/2, where η = 1+2max_i|ρ^i| and ℓ_η is the inverse-Lipschitz constant of b on [−η,η] — i.e., C√K with C independent of K (and ≈1 for the (N−1)/N factor).
- Key coupling lemma (Lemma 5): ‖E_α(x)−E_α(y)‖² − ‖x−y‖² ≤ −2K(1−KL)|x^i−x^j−y^i+y^j|·|b(x^i−x^j)−b(y^i−y^j)|.

## 5. Features / target
No features. Target: theoretical characterization of the Elo process's limit — existence/uniqueness of π, tail behavior, support, bias, and rate of convergence to true skills in K.

## 6. Validation design
Pure mathematics: all eight claims of Theorem 1 proved analytically (sections 2–3, Theorems 8, 10, 11, 16, 22). Monte Carlo (section 4) only illustrates: densities, bias plots, and the √K scaling.

## 7. Numerical results / baselines
- Theorem 1 summary: (i) bounded moments of all orders + bounded exponential moment of some small order; (ii) natural coupling makes ‖X_t−Y_t‖ non-increasing a.s. → 0; (iii) unique stationary π; (iv) π has finite exponential moment; (v) weak convergence L(X_t)→π; (vi) W_p convergence; (vii) E[(1/N)|X−ρ|_1] ≤ C√K for small K, C independent of N,K; (viii) supp(π)=Z_N (full support, unbounded).
- Simulations: density of X¹ is smooth and somewhat bell-shaped for small K; as K grows (K up to 1.2 with L=0.5) the spread comes from the emergence of two bumps rather than a single widening bump, and curves become progressively rougher (existence/smoothness of the density is listed as an open problem); E[X¹]≠ρ¹ for ρ¹≠0 (ratings overestimate positive skill, underestimate negative — bias direction observed for K=1), while E[b(2X¹)] lands exactly on the diagonal b(2ρ¹) — Proposition 12: the transformed prediction is an unbiased estimator of the true win-probability transform; E[|X¹−ρ¹|] fits C√K tightly for K≪1/L and grows linearly away from 0.

## 8. Code / data availability
No code repository listed; no real data. Monte Carlo procedures described in section 4 (t*=200 burn-in, m up to 5×10⁷ samples); no scripts or links provided.

## 9. Leakage & limitations
Adversarial notes: (a) all numerics are N=2 with one specific (b,K,L) — the √K law is proved general but never numerically verified for N>2 or realistic schedules; (b) the KL<1 assumption means max per-game swing is bounded by 1/L — realistic for chess (K=10–40, 1/L∼1000) but NFL margins of victory break any fixed-L logistic calibration, and the bias analysis assumes random opponents rather than scheduled matchups; (c) the √K result is small-K only — numerics show linear growth away from 0, so it cannot be used to tune large K; (d) computing the actual bias E[X]−ρ remains open (listed as future work) — the paper cannot tell you how to debias a rating; (e) Proposition 12's unbiasedness is about the mean of the transformed variable, not about a single rating snapshot, and still assumes the model is correctly specified; (f) no convergence rate in t is proved for the unbounded process.

## 10. GSE overlap
Direct overlap. GSE runs dynamic Elo-type team-strength ratings — the map inventory shows Elo and dynamic-Elo coverage in the benchmark corpus. This paper doesn't duplicate any catalog entry: it adds rigorous error-scaling and bias structure (not a new rating variant). It sits next to the existing "Elo/Glicko/TrueSkill" cluster as theory, not a competitor.

## 11. GSE implementation spec
1. K-factor scheduling rule: since equilibrium |rating − skill| scales as √K, halve steady-state rating error by cutting K by 4× — formalize the existing in-season K choice as an explicit responsiveness/noise frontier rather than a fixed constant. 2. Add a monitoring metric: rolling standard deviation of GSE's Elo ratings ≈ Ĉ√K; estimate Ĉ from one NFL season, then flag drift when observed dispersion deviates (injury news, structural breaks). 3. Calibration policy: when win-probability calibration diagnostics and raw rating levels disagree, trust the probabilities — the paper proves E[b(2X)]=b(2ρ) exactly at stationarity, so a "systematically biased-looking rating, well-calibrated probabilities" combination is the theoretically expected regime, not a bug. Effort: ~3 days (parameter sweeps on existing GSE Elo pipeline, no new model).

## 12. Reproducible test
Dataset: NFL game results 2015–2025 (nflverse) fed through GSE's existing Elo. Protocol: for K ∈ {2, 4, 8, 16, 32}, fit Elo each season with pre-season rating carryover, then regress |Elo − (end-of-season SRS-equivalent true skill proxy)| averaged over teams on √K. Baselines: the paper's predicted linear-in-√K relationship vs a null of flat-in-K. Metric: R² of the √K fit and per-K rating standard deviation ≈ Ĉ√K.

## 13. Acceptance / rejection gate
Adopt the √K frontier for K-factor scheduling if the 2015–2025 fit yields R² ≥ 0.6 on the √K regression of team-level rating dispersion — then GSE's Elo obeys the paper's scaling and K choices can be made from an explicit error budget. Reject if the relationship fails (R² < 0.3): NFL's schedule structure (17 games, division clustering) may violate the random-matching theory and K remains purely empirical.

## 14. Improvement experiment
The paper's open question — computing the bias E[X]−ρ — can be attacked empirically for the NFL: at season end, treat final Elo as X and next-season win total (or championship) as ρ-proxy, and estimate the bias curve E[X]−ρ as a function of rating level over 2015–2025. If the curve is stable across seasons (paper's numerics suggest it may not depend on K), apply it as a shrinkage correction to GSE's preseason Elo — a debiased Elo built directly on this paper's theory, which the authors themselves list as desirable future work.
