# [2145] Beyond CVaR: Leveraging Static Spectral Risk Measures for Enhanced Decision-Making in Distributional Reinforcement Learning (arXiv:2501.02087)

**Citation:** Mehrdad Moghimi, Hyejin Ku (2025). *Beyond CVaR: Leveraging Static Spectral Risk Measures for Enhanced Decision-Making in Distributional Reinforcement Learning*. arXiv:2501.02087. URL: https://arxiv.org/abs/2501.02087
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* spectral risk measures (convex blends of CVaRs, e.g. Mean-CVaR) give GSE a tunable tail-risk objective for season-long betting policy selection that fixes CVaR's "blindness to success"; the QR-SRM algorithm optimizes it with convergence guarantees and interpretable evolving risk preferences.

## 1. Research question
In risk-sensitive RL, applying a fixed risk measure per step yields time-inconsistent policies, while dynamic risk measures are uninterpretable. Prior static-risk-measure work was limited to plain CVaR. The paper asks: can a distributional-RL algorithm optimize the broader class of *static spectral risk measures* (SRM) — convex combinations of CVaRs at different levels — with convergence guarantees, while exposing the *intermediate* (time-evolving) risk preferences so the learned policy stays interpretable?

## 2. Dataset / schema
Three environments (all synthetic/simulated, no real datasets):
- **American put option trading** (Tamar et al. 2017 setup): underlying follows Geometric Brownian Motion; per step, exercise or hold.
- **Mean-reversion trading** (Coache & Jaimungal 2023): mean-reverting asset price; agent buys/sells.
- **Windy Lunar Lander:** larger state/action space, stochastic transitions (Gym-style).
Risk spectra tested: CVaR ϕ_α(u)=(1/α)1_{[0,α]}(u); WSCVaR ϕ_{α⃗,w⃗}=Σ_i w_i(1/α_i)1_{[0,α_i]}; exponential (ERM) ϕ_λ(u)=λe^{−λu}/(1−e^{−λ}); dual power (DPRM) ϕ_ν(u)=ν(1−u)^{ν−1}. Seeds: multiple (std reported; e.g., 5 seeds in Lunar Lander).

## 3. Method / model
- **SRM definition (3):** SRM_ϕ(Z)=∫_0^1 F_Z^{−1}(u) ϕ(u) du, ϕ non-increasing, ∫ϕ=1. Equivalently SRM_μ(Z)=∫_0^1 CVaR_α(Z) μ(dα) (4) — a convex combination of CVaRs (Kusuoka 2001).
- **Supremum representation (5)–(6):** SRM_ϕ(Z)=sup_{h∈H}{E[h(Z)]+∫_0^1 ĥ(ϕ(u))du}, attained at closed-form h_{ϕ,Z}(z)=∫_0^1 F_Z^{−1}(α)+(1/α)(z−F_Z^{−1}(α))^− μ(dα). Objective: max_π SRM_ϕ(G^π)=max_π max_h J(π,h)=max_h(max_π J(π,h)) (7), J(π,h)=E[h(G^π)]+∫ĥ(ϕ(u))du.
- **QR-SRM (Alg. 1):** alternate — (Step 1, outer) h_l=argmax_h J(π*_{l−1},h) via the *closed-form* (6) from the initial-state return distribution (novel vs Bäuerle & Glauner 2021's global optimization); (Step 2, inner) π*_l=argmax_π J(π,h_l) via quantile-regression DRL on an *augmented* MDP X:=X×S×C (S=[G_MIN,G_MAX] accumulated discounted reward, C=(0,1] discount factor), transitions S_{t+1}=S_t+C_t R_t, C_{t+1}=γC_t; greedy rule a_{G,h}(x,s,c)=argmax_a E[h(s+cG(x,s,c,a))] (10); Bellman iteration η_{k+1,l}=T^{G_l} η_{k,l} (11).
- **Theorem 4.1 (convergence):** J(π_{k,l},h_l) ≥ max_{π∈π_M} J(π,h_l) − ϕ(0)cγ^{k+1}G_MAX (13); J(π*_l,h_l) bounded, monotone increasing in l, lower-bounds the objective. Note: unlike CVaR (single sufficient statistic b/q_α), SRM needs no such reduction — authors accept a scalable-but-weaker guarantee rather than Bäuerle's expensive quantile search.
- **Interpretability (Sec. 5, Thm 5.1):** via Pflug & Pichler 2016 decomposition of coherent risk measures, ρ(Z)=sup_{ξ̃}E[ξ̃·ρ_{ξ̃}(Z|F_t)], the return distribution yields intermediate risk levels αξ_t^α and weights ξ_t^αμ(dα)/ξ (9) — computed from the CDF of the return (Thm 5.1, worked example: ρ(G)=2+0.5(0.6·1.2·6.73+0.4·0.7·8.32)=5.5875). Decomposition used *only to explain*, never to optimize (Hau et al. 2023 showed decomposition-based optimization claims are inaccurate).

## 4. Equations & assumptions
- SRM_ϕ(Z)=∫_0^1 F_Z^{−1}(u)ϕ(u)du (3); SRM_μ(Z)=∫_0^1 CVaR_α(Z)μ(dα) (4).
- h_{ϕ,Z}(z)=∫_0^1 F_Z^{−1}(α)+(1/α)(z−F_Z^{−1}(α))^− μ(dα) (6).
- max_π SRM_ϕ(G^π)=max_π max_h J(π,h); J(π,h)=E[h(G^π)]+∫_0^1 ĥ(ϕ(u))du (7).
- (T^π η)(x,a)=E_π[(b_{R,γ})_# η(X′,A′)|X=x,A=a] (8); quantile rep η_θ(x,a)=(1/N)Σ_i δ_{θ_i(x,a)}, θ_i=F_{G(x,a)}^{−1}(τ̂_i).
- Greedy: a_{G,h}(x,s,c)=argmax_a E[h(s+cG(x,s,c,a))] (10); update G_{k+1,l} =^D R(x,a)+γG_{k,l}(X′,S′,C′,a_{k,l}(X′,S′,C′)) (11).
- Convergence bound (13): gap ≤ ϕ(0)cγ^{k+1}G_MAX; monotone J(π*_l,h_l).
- Intermediate risk: ρ_ξ(Z|F_t)=∫_0^1 CVaR_{αξ_t^α}(Z|F_t)·(ξ_t^α μ(dα)/ξ) (9).
- Assumptions: infinite-horizon discounted MDP, rewards bounded [R_MIN,R_MAX] with R_MIN≥0; history-dependent policies; ϕ bounded; (for Thm 4.1) exact return-distribution representation in the limit; practical runs use function approximation (theory-practice gap acknowledged).

## 5. Features / target
RL environments: state features are environment-specific (option price/time-to-expiry; mean-reverting price/position; lander state/wind). Target: policy π maximizing SRM_ϕ of cumulative discounted return G^π. Decision is sequential action selection (exercise/hold, buy/sell, thruster control).

## 6. Validation design
- American option: QR-SRM(ϕ_α), α∈{0.2,0.6,1.0} — check each α's policy maximizes its own CVaR_α(G); exercise-boundary analysis (Fig. 3).
- Mean-reversion: QR-SRM with ERM(ϕ_{λ=12}), DPRM(ϕ_{ν=4}), WSCVaR(α⃗_2=[0.1,0.6,1.0],w⃗_2=[0.2,0.3,0.5]) vs QR-DQN (risk-neutral), QR-CVaR (Bellemare et al. 2023 static CVaR), QR-iCVaR (Dabney et al. 2018a per-step risk). Metrics: CVaR_{1.0/0.5/0.2}, ERM_4.0, DPRM_2.0, WSCVaR scores (Table 2, means ± std across seeds).
- Windy Lunar Lander: QR-SRM(ϕ_{α=1}), QR-SRM(WSCVaR α⃗_3=[0.2,1.0], w⃗_3=[0.5,0.5]) vs same baselines; metrics E, CVaR_{0.5}, CVaR_{0.2}, WSCVaR (Table 3).
- Appendix I: ablation on number of quantiles.

## 7. Numerical results / baselines
- American option: QR-SRM(ϕ_α) finds the policy with highest CVaR_α(G) for each α∈{0.2,0.6,1.0}; as α drops 1.0→0.6→0.2, policy more conservative, exercises sooner → higher CVaR_{0.2} but lower CVaR_{1.0} (the expected risk-aversion trade).
- Mean-reversion (Table 2, means ± std): QR-SRM(ϕ_{α=1}): CVaR_{1.0}=1.43±0.03, CVaR_{0.5}=0.03±0.04, CVaR_{0.2}=−1.36±0.09 — beats QR-DQN (1.40±0.09, −0.24±0.17, −1.76±0.27) on all three; matches QR-CVaR (1.48±0.07, −0.02±0.10, −1.42±0.21). QR-iCVaR(α=0.5) sub-optimal at CVaR_{0.5} (0.14±0.04 vs 0.27±0.03) — confirms per-step risk measures misalign with static objectives. WSCVaR model QR-SRM(ϕ_{α⃗_2,w⃗_2}): best on ERM_4.0/DPRM_2.0/WSCVaR rows (e.g., WSCVaR_{α⃗_2}^{w⃗_2}=0.24±0.02 vs QR-DQN −0.18±0.16). Mixed WSCVaR(α⃗_3=[0.2,1.0], w⃗_3=[0.5,0.5]): trades one risk measure off another as intended.
- Lunar Lander (Table 3): QR-SRM(ϕ_{α=1}) within 1 std of QR-DQN on expectation (slightly worse, attributed to state augmentation); QR-SRM(WSCVaR) achieves highest WSCVaR while improving CVaR_{0.2}/CVaR_{0.5} "without a great impact on expected return." QR-CVaR collapsed on 3/5 seeds (poor); authors attribute CVaR-only failures to "Blindness to Success" (Greenberg et al. 2022) — ignoring the right tail.
- Key qualitative claim: weighting expectation alongside tail (Mean-CVaR/WSCVaR) fixes CVaR's blindness while keeping tail protection.

## 8. Code / data availability
None stated in the paper text I read (no URL given).

## 9. Leakage & limitations
- All experiments are simulated environments with known dynamics — zero real-data validation; the "outperformance" is over other simulated RL policies, not over any betting or financial baseline.
- Function-approximation gap: convergence theorem assumes exact distributional representation; practical QR runs violate it (authors acknowledge discrepancies).
- State augmentation (x,s,c) inflates the state space — hurt Lunar Lander expectation slightly; scaling to GSE's high-dimensional slate state could be costly.
- The paper's own caution (via Hau et al. 2023): decomposition must not be used for optimization — interpretability only.
- No guidance on *choosing* ϕ/weights — the practitioner's real decision (which spectrum?) is left open; the paper shows a menu, not a selection rule.
- Infinite-horizon discounted MDP framing fits trading better than a fixed-length NFL season; the undiscounted finite-horizon mapping needs care.

## 10. GSE overlap
Existing-research map: calibration/uncertainty lane covers CQR and conformal WP; the *decision objective* for season-long policy choice is uncovered. GSE currently selects its posting/selection policy implicitly (fixed rules); no paper in the repo gives a principled objective for trading off expected season profit vs worst-season tail risk. This paper is new capability: a *family* of tail-risk objectives (Mean-CVaR = λ·E + (1−λ)·CVaR) with an algorithm to optimize a selection policy against them and an interpretability readout (which matches the "show their work" copy doctrine). Complements ledgers 2142 (per-game bet/no-bet certificates), 2143 (weekly slate sizing), 2144 (per-game stake fraction): this one governs the *season-level* policy — e.g., which selection threshold to use across the year.

## 11. GSE implementation spec
- **Framing:** finite-horizon (18-week season, γ≈1) "episode" = one season; state = (week, bankroll, current record/drawdown); actions = selection policy parameters for the week (e.g., EV threshold for posting a pick, stake multiplier); reward = weekly profit.
- **Objective:** WSCVaR with α⃗=[0.2,1.0], w⃗=[0.5,0.5] (Mean-CVaR): maximize 0.5·E[season profit] + 0.5·CVaR_{0.2}(season profit) — protects against worst-quintile seasons while keeping expected growth.
- **Return distribution:** quantile-regression model over season outcomes learned from backtest simulation (bootstrap resampling of weekly engine-pick outcomes, 10k simulated seasons); the closed-form outer update (6) gives the weighting function h over the season-return distribution.
- **Interpretability deliverable:** the intermediate risk readout (9) tells us, mid-season, how the effective risk preference has shifted given realized bankroll — publishable as "how our risk posture adapts" content.
- **Effort:** ~3 weeks (season simulator + QR return model + ϕ selection grid + backtest).

## 12. Reproducible test
Dataset: 2022–2025 engine picks + odds + nflverse outcomes. Build 10,000 bootstrapped seasons (resample weeks with replacement from the 4 seasons of weekly pick outcomes). Candidate: selection policy maximizing Mean-CVaR(0.5,0.5) via the QR-SRM-style objective vs baselines (a) fixed EV-threshold rule, (b) pure-expectation policy, (c) pure-CVaR_{0.2} policy. Metrics: E[season profit], CVaR_{0.2}(season profit), P(season loss), max drawdown. No lookahead: bootstrap only from weeks preceding each simulated decision.

## 13. Acceptance / rejection gate
**ACCEPT if:** on 10k bootstrapped seasons, the Mean-CVaR policy achieves CVaR_{0.2}(season profit) ≥ 1.15 × CVaR_{0.2} of the fixed-threshold baseline AND E[season profit] ≥ 0.95 × baseline expectation (tail protection must cost ≤5% of expectation) AND P(season loss) ≤ 0.8 × baseline. **REJECT otherwise**, or if the result is driven entirely by the expectation weight (then it's not a risk result — check by zeroing w on CVaR_{1.0}).

## 14. Improvement experiment
Beyond the paper: *learn the spectrum* — instead of hand-picking α⃗,w⃗, fit them from revealed preference: choose the (α⃗,w⃗) that maximizes the correlation between the policy's implied weekly risk posture and Garrett's actual historical override decisions (when he overrode/held back picks). This grounds the risk spectrum in the operator's demonstrated risk tolerance rather than an arbitrary choice — a human-calibrated SRM. Then re-run the season test with the learned spectrum and compare to the hand-picked one.

