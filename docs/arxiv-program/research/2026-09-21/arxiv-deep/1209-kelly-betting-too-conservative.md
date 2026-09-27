# [1209] Kelly Betting Can Be Too Conservative (arXiv:1710.01786v1)

**Citation:** Hsieh, C.-H., Barmish, B. R., & Gubner, J. A. (2017). *Kelly Betting Can Be Too Conservative*. arXiv:1710.01786v1 [q-fin.PM]. URL: https://arxiv.org/abs/1710.01786
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; Restricted Betting Theorem, scalar lemma, hypercube/hypersphere cases, AAPL tick-data example, conclusion — all read).
**Verdict:** ADAPT — the Restricted Betting Theorem diagnoses a real GSE failure mode: fitting unbounded-support distributions (e.g., normal) to returns forces degenerate K*=0 ("bet nothing") no matter how large μ/σ, while data-driven (empirical-PMF) Kelly gives sensible fractions. Directly actionable: compute GSE Kelly stakes from the empirical distribution of engine edges, never from a fitted normal.

## 1. Research question
When does theoretical Kelly betting (known distribution f_X) prescribe bets far smaller than warranted — the opposite of the usual "Kelly is too aggressive" complaint — and what does the empirical-distribution practitioner get instead? (Abstract, Secs. I, III–IV)

## 2. Dataset / schema
- Toy: Bernoulli X ∈ {1, −x₀} with P(X=1)=1−ε (Sec. IV).
- Realistic: normal family N(μ,1), μ∈[0,4], m=1,000,000 samples per μ for empirical Kelly curve (Fig. 1).
- High-frequency: AAPL tick data, 2015-12-02, m=110,000 ticks, X(k)=(S(k+1)−S(k))/S(k).

## 3. Method / model
- Setup: i.i.d. return vector X∈ℝⁿ, bet fraction K, V(k+1)=(1+KᵀX(k))V(k); maximize g(K)=E[log(1+KᵀX)] over admissible K (1+Kᵀx≥0 ∀x in support).
- Restricted Betting Theorem (Sec. VI): any optimizing K satisfies h_X(−K) ≤ 1 where h_X is the support function h_X(y)=sup_{x∈X} yᵀx; the feasible set K={K: h_X(−K)≤1} is convex and closed.
- Scalar lemma (Sec. V): support [X_min, X_max] with X_min<0<X_max ⟹ K∈[−1/X_max, −1/X_min]; unbounded both sides ⟹ K*=0 forced — no betting at all, regardless of μ/σ.
- Hypercube (Σ|K_i|δ_i − ΣK_i x_{0i} ≤ 1) and hypersphere (r‖K‖ − Kᵀx₀ ≤ 1) support cases (Sec. VI); nested constraint sets K_r shrink with radius.
- Empirical counterpart: K̂* from f̂_X(x)=m⁻¹Σδ(x−x_i); rare tail events absent from finite samples → sensible bet sizes.

## 4. Equations & assumptions
- g(K) = E[log(1+KᵀX)]; confinement h_X(−K) ≤ 1; scalar K∈[−1/X_max, −1/X_min].
- Toy: K* = (1−ε(1+x₀))/x₀ < 1/x₀ no matter how small ε (eq. Sec. IV).
- Bad-sample probability: p_bad = 1−(1−ε)^M (ε=0.001, M=50 → ≈0.05).
- Assumptions: i.i.d. returns; E‖X‖<∞; sample cap m≤M due to non-stationarity ("untrustworthy old data").

## 5. Features / target
Inputs: return distribution (theoretical f_X or empirical f̂_X). Target: optimal Kelly fraction K*/K̂*.

## 6. Validation design
Analytic theorem + constructive examples + AAPL empirical contrast: empirical K̂*≈0.824 (82.4% of wealth — aggressive but sensible) vs theoretical GBM K*=0; matches Merton/Thorp continuous-time K*=μ̂/σ̂²≈0.825.

## 7. Numerical results / baselines
- Normal family: empirical K̂*(μ) rises 0→~0.9 as μ goes 0→4 (Fig. 1); theoretical K*=0 for ALL μ, σ.
- AAPL ticks: X_min≈−0.01 → bound −100≤K≤100 (non-binding vs |K|≤2 brokerage); empirical optimum 82.4%.

## 8. Code / data availability
None shared.

## 9. Leakage & limitations
- The "empirical is better" moral cuts both ways: the empirical PMF systematically UNDERESTIMATES tail risk (p_bad analysis) — the paper is honest about this but offers no correction beyond flagging sample-size research as future work.
- Sports-betting returns at fixed odds have bounded support by construction, so the degenerate K*=0 pathology bites only if GSE fits unbounded models (normals) to residuals/returns or bets parlays with heavy-tailed payoffs.

## 10. GSE overlap
- Complements 0626 (Kelly under probability uncertainty): 0626 handles uncertainty in p; this handles model-class/support misspecification. No existing ledger covers the support-confinement pathology or the empirical-vs-theoretical Kelly comparison. Directly relevant to how GSE turns engine outputs into stakes.

## 11. GSE implementation spec
1. NEVER fit unbounded-support distributions to returns for Kelly computation: compute Kelly fractions from the empirical distribution of historical engine edge realizations (per market type), i.e., data-driven Kelly K̂*.
2. Bound the empirical support explicitly: winsorize/trim at observed min/max (the support IS the constraint set); report the implied confinement interval [−1/X_max, −1/X_min] as a sanity check on every stake.
3. Sample-size guard: for rare-tail markets, compute p_bad = 1−(1−ε̂)^M with ε̂ the estimated tail-event rate and M the lookback; if p_bad > 0.05, shrink K̂* toward fractional Kelly (this paper's honest caveat operationalized).
4. Parlay/multi-leg products: apply the hypercube case — joint support constraints across legs, not independent per-leg Kelly.

## 12. Reproducible test
Backtest 2024–2025 NFL: (a) Kelly from fitted normal edge distribution vs (b) empirical-PMF Kelly vs (c) flat fractional Kelly. Accept (b) if it avoids the degenerate under-betting of (a) (stake > 0 on ≥90% of +EV slates where (a) stakes <25% of (b)) while matching/beating (c) on log growth with no worse drawdown; verify the p_bad guard fires on longshot markets.

## 13. Acceptance / rejection gate
ADAPT with the gate in §12. If empirical Kelly proves too aggressive in thin-sample markets, default those markets to the p_bad-shrunk fraction rather than to the theoretical model.

## 14. Improvement experiment
Hybrid estimator: empirical PMF body + parametric tail (extreme-value) graft — keeps the paper's data-driven sanity while fixing its admitted tail-blindness; compare tail-grafted Kelly vs plain empirical on longshot-heavy slates.
