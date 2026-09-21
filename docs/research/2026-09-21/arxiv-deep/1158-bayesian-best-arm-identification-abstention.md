# [1158] Bayesian Best-Arm Identification with Abstention: A Polynomial-to-Exponential Phase Transition (arXiv:2606.29203)

**Citation:** Yuqi Huang, Yunlong Hou, Vincent Y. F. Tan (2026). *Bayesian Best-Arm Identification with Abstention: A Polynomial-to-Exponential Phase Transition*. arXiv:2606.29203v1 [cs.LG], National University of Singapore. URL: https://arxiv.org/abs/2606.29203
**Ledger completed:** 2026-09-21. **Read:** full text (main, 15 pages) plus appendices A–F in full (77 pages total): A (prior top-two-gap density), B (Thm. 2.1: error guarantee, RT/T→C† a.s., tail P(C†≤x)=κν√(8x)+o(√x), quantile bound rT,α ≥ (1−ε)α²T/(8κν²)), C (Thm. 3.1: flat local subprior, oracle 2-arm reduction, bathtub-principle lower bound), D (Thm. 3.3 forced-decision bound), E (Thm. 3.4 minimax bound Φ(−Δ√T/2−zα)), F (Thm. 4.1: Fisher–Rao extension, IC-PGWS Algorithm 2, matching upper bound).
**Verdict:** ADAPT
Scoped narrowly to *strategy selection*, not game prediction: the PGWS protocol (allocate evaluation budget ∝ inverse-squared posterior gaps; abstain from shipping when terminal evidence falls below a Monte-Carlo-calibrated α-quantile) is a principled upgrade to how GSE evaluates and ships engine versions. The bandit framing does not map to single-game prediction.

## 1. Research question
In Bayesian fixed-budget best-arm identification (sample K arms for T rounds, then recommend the best), what happens if the learner may terminally abstain ("inconclusive") subject to an abstention budget α? The error metric becomes *undetected* error: recommending a suboptimal arm without abstaining.

## 2. Dataset / schema
Theory + Gaussian simulations. Experiments: K=5 arms, prior μ_i ∼ N(ν_i, σ_0²), ν=[5,5,3,3,2], σ_0=1, rewards N(μ_i,1). Calibration: M_cal=10⁵ prior simulations for the abstention quantile; evaluation: M_test=10⁶ independent prior draws. Methods: PGWS(α) for α∈{0,0.01,0.03,0.05}, Unif(α) (uniform allocation + same abstention rule), BayesElim (Atsidakou et al. 2023, forced decision).

## 3. Method / model
**PGWS (Posterior Gap Weighted Sampling with Abstention):** maintain Gaussian posteriors μ_i|F_t ∼ N(M_i(t), V_i(t)); forced exploration until each arm pulled ≥√(t+1); otherwise sample arm i with probability p_i(t) ∝ Δ̂_i(t)^{−2} (inverse squared posterior-mean gap to the leader — leader and closest challenger get equal probability). Terminal statistic R_T = min_{j≠b̂_T} (M_{b̂_T}(T)−M_j(T))²/(V_{b̂_T}(T)+V_j(T)) (smallest pairwise posterior Gaussian exponent separating the leader). Abstain iff R_T < r_{T,α}, the lower α-quantile of R_T under the Bayesian law (estimated offline by Monte Carlo; boundary randomization for exact calibration). Large-T approximation: r^{asy}_{T,α} = α²T/(8κ_ν²).

## 4. Equations & assumptions
- Objective (eq. 1.1): min_π P(b̂_a ∉ {a*, ?}) s.t. P(b̂_a = ?) ≤ α. Optimal value E_T(α) (eq. 1.2).
- Top-two gap (eq. 1.4): Γ := μ_(1) − μ_(2).
- **Hardness parameter:** κ_ν = Σ_{i≠j}∫f_i(x)f_j(x)Π_{k≠i,j}F_k(x)dx = (1/(σ_0√π))Σ_{i<j}w_ij exp(−(ν_i−ν_j)²/(4σ_0²)); P_ν(Γ≤ε) = κ_νε + o(ε) (Lemma A.1).
- **Phase transition (Thms. 2.1, 3.1, Cor. 3.2):** (1/(α²T))log E_T(α) → −1/(8κ_ν²); i.e., E_T(α) = exp(−α²T/(8κ_ν²) + o(α²T)). PGWS achieves it (optimal).
- **Forced decision (Thm. 3.3):** liminf √T·E_T(0) ≥ √(2/π)·κ_ν — only polynomial Ω(T^{−1/2}).
- Posterior certification (Lemma 2.1): E_T(PGWS(α)) ≤ (K−1)e^{−r_{T,α}}.
- **Frequentist (Thm. 3.4):** max{E_{T,μ+}, E_{T,μ−}} ≥ Φ(−Δ√T/2 − z_α); abstention improves only lower-order terms: exp(−Δ²T/8 − Δz_α√T/2 − z_α²/2 + O(log T)). The phase transition is *exclusively Bayesian*.
- **Beyond Gaussian (Thm. 4.1):** same exponent −1/(8κ²) for regular one-parameter exponential families, with κ the top-two tie density in Fisher–Rao coordinates s(μ)=∫√I(v)dv (eq. 4.1); Beta–Bernoulli example: s(μ)=2arcsin√μ.
- **Assumptions:** known product prior; continuous prior (unique best arm a.s.); Gaussian or regular exponential-family rewards; iterated limit T→∞ then α↓0.

## 5. Features / target
Not applicable — bandit model. Arms = candidate strategies; "features" are posterior means/variances; target = identity of the best arm.

## 6. Validation design
Monte-Carlo from the prior; abstention threshold calibrated per (sampling rule, T, α) on 10⁵ simulations; evaluated on 10⁶ fresh draws. Metrics: empirical undetected-error probability vs T (log scale), empirical abstention rate vs α (calibration check). Proof machinery behind the claims (App. C–F): the lower bound builds a "flat local subprior" Qρ dominating the Gaussian prior on a compact gap interval, reduces the K-arm problem to a 2-arm Gaussian-shift hypothesis test via an oracle revealing the top-two arms' midpoint (transformed observations Z_t i.i.d. N(θ/2,1); scalar sufficient statistic V), and applies a bathtub-principle rearrangement to show the α abstention budget is optimally spent at small |V|; the general exponential-family case repeats this in the Fisher–Rao information coordinate with local-MLE ordering. No real data.

## 7. Numerical results / baselines
- **Phase transition visible:** PGWS(α>0) curves approximately affine on the log scale (exponential decay); forced-decision PGWS(0) and BayesElim decay polynomially slower (Figure 1a).
- **Calibration exact:** empirical abstention tracks α across all T, not overly conservative (Figure 1b).
- **Adaptive allocation matters:** PGWS(α) achieves significantly lower undetected error than Unif(α) at every α ∈ {0, 0.01, 0.05} across all budgets (Figure 2) — concentrating samples on leader + closest challengers resolves the near-tie instances that dominate Bayes error.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **Asymptotic regime:** the tight exponent is in the iterated limit T→∞ then α↓0; finite-T/α behavior is only empirical (though the simulations are reassuring at 10⁶ draws).
- **Known prior required:** κ_ν and the quantile r_{T,α} depend on the prior; GSE would need to *fit* a prior over strategy quality — misspecification breaks the optimality claim (the abstention calibration itself stays valid by construction, but the exponent doesn't).
- **Frequentist caveat (their Thm. 3.4):** if GSE's evaluation is better modeled as fixed-instance rather than Bayesian-average, abstention buys only lower-order improvements — the headline phase transition does not apply.
- Gaussian/exponential-family rewards; the ship/no-ship decision is terminal (no sequential early stopping).
- Five-arm Gaussian simulations only; no real-data validation.

## 10. GSE overlap
New sub-lane: *evaluation budget allocation + ship/abstain decisions* for competing engine versions/strategies. Complements 1153's safe-policy-improvement (Algorithm 3, an LCB ship-gate): 1153 decides *whether* to ship; this paper adds *how to spend the evaluation budget getting there* (inverse-gap weighting) and *exact abstention calibration* (α-quantile of the evidence statistic). The near-tie insight — selection error is dominated by nearly-tied candidates, so spend abstention exactly there — is the same principle as 1153's disagreement abstention, now in model-selection form.

## 11. GSE implementation spec
1. **Candidate set:** the current production engine + K−1 challenger configurations (new features, recalibrations, threshold variants). Fit a prior over per-version edge from historical version performance.
2. **PGWS evaluation:** allocate backtest/paper-trade weeks with p_i ∝ 1/gap² where gap = posterior-mean edge difference to the leader; forced exploration floor early. Track posterior means/variances of each version's edge.
3. **Ship/abstain gate:** compute R_T (eq. 2.3) from the posteriors; abstain from shipping (keep incumbent) iff R_T < r̂_{T,α}, with r̂ estimated by Monte Carlo from the fitted prior at α = 0.05 (ship a new version at most 5% of cycles on inconclusive evidence — note: here abstention = *not shipping*, which is the safe default).
4. **Effort:** ~3 days (posterior tracking + Monte Carlo calibration + gate), reusing 1153's LCB gate as a cross-check.

## 12. Reproducible test
Dataset: historical engine-version backtests (or constructed challenger variants evaluated on past seasons). Baseline: equal-split evaluation + "ship if point estimate beats incumbent." Metric: fraction of shipped versions that underperform the incumbent out-of-sample (undetected error), and evaluation-weeks used. Success = PGWS allocation + abstention gate ships fewer bad versions at equal-or-lower evaluation cost.

## 13. Acceptance / rejection gate
ADAPT the allocation rule iff inverse-gap weighting reaches the same ship-decision confidence with ≥20% fewer evaluation weeks than equal-split on historical version comparisons. ADAPT the calibrated abstain-from-shipping gate iff it blocks ≥1 historically-bad ship while passing the historically-good ones. REJECT the asymptotic exponent claims as a decision criterion (GSE lives at finite T); REJECT if the prior over version quality can't be fit credibly — fall back to 1153's distribution-free LCB gate.

## 14. Improvement experiment
Replace the fixed α with an **adaptive abstention budget** tied to the cost of a bad ship: α_t = α_0 · (estimated regret of shipping wrong / cost of one more evaluation week). When evaluation is cheap (backtest), α shrinks (evaluate more, abstain less); when evaluation is expensive (live paper-trading), α grows. Test whether adaptive-α dominates fixed-α on total (evaluation cost + bad-ship regret). Second: extend PGWS to **early stopping** — the paper is terminal-only; add an intermediate R_t check that stops evaluation early when evidence is decisive either way.
