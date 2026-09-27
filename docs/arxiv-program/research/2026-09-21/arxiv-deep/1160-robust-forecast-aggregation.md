# [1160] Robust Forecast Aggregation (arXiv:1710.02838)

**Citation:** Itai Arieli, Yakov Babichenko, Rann Smorodinsky (2018). *Robust Forecast Aggregation*. arXiv:1710.02838v3 [q-fin.EC], Technion. URL: https://arxiv.org/abs/1710.02838
**Ledger completed:** 2026-09-21. **Read:** full paper including appendices A–D (proofs) and E.
**Verdict:** ADAPT
The precision-weighted two-forecast scheme and the average-prior Bayes scheme are directly implementable upgrades to how GSE combines its model probability with market-implied probabilities. The many-expert impossibility result is a guardrail against naive ensemble averaging.

## 1. Research question
An *ignorant aggregator* sees only experts' probabilistic forecasts (not their information structure or the common prior). Evaluated by worst-case regret vs an *omniscient expert* (who knows the structure and all signals) under square loss: when can she aggregate nearly optimally, and what scheme does it?

## 2. Dataset / schema
Theory; no empirical dataset. Adversarial information structures constructed via posterior-belief martingales (Aumann–Maschler splitting lemma). Motivating example: three conflicting rain forecasts (Accuweather 77%, Yahoo 60%, Weather Channel 90%).

## 3. Method / model
- **Blackwell-ordered** (one expert's signal nests the other's): **precision scheme** f_pre — weights ∝ φ(x) = 1/(x(1−x)) when |x₁−x₂| ≤ 0.4, ∝ √φ(x) when > 0.4; adopts 0/1 forecasts at extremes, 1/2 on (0,1)/(1,0).
- **Conditionally independent signals:** **average-prior scheme** f_avg — apply Bordley's Bayes formula with a dummy prior = (x₁+x₂)/2. Variant e_p (Prop. 2): dummy prior 0.49(x₁+x₂), +0.02 if sum > 1.

## 4. Equations & assumptions
- Relative loss (Lemma 1): L(f,P) = E[(f(x(s)) − x̂(s))²]; regret R_C(f) = sup_{P∈C} L(f,P).
- Bordley aggregation: P(ω=1|s) = (1−μ)^{n−1}Πx_i / [(1−μ)^{n−1}Πx_i + μ^{n−1}Π(1−x_i)] — prior + forecasts are sufficient.
- **Thm. 1 (Blackwell):** min regret = (1/8)(5√5−11) ≈ **0.0225**, achieved by f_pre. Naive schemes worse: DeGroot simple average = 1/16 = **0.0625**; follow-the-most-extreme = **0.0714** (worse than averaging!).
- **Thm. 2 (conditionally independent):** R(f_avg) = **0.0260**, lower bound 0.0225; Prop. 2 variant → 0.0250; Conjecture 3: 0.0225 tight for i.i.d.
- **Thm. 4 (many i.i.d. experts):** R ≥ 1/4 − 3√(log n/n) → 1/4 as n→∞ — with many conditionally-i.i.d. experts and unknown prior, no scheme beats predicting 1/2.
- **Assumptions:** binary state, common prior, non-strategic experts, square loss, one-shot interaction; the many-expert result additionally needs conditional i.i.d. signals.

## 5. Features / target
Not applicable — inputs are pairs (x₁, x₂) of expert probability forecasts; target = omniscient posterior.

## 6. Validation design
Analytical: zero-sum game between aggregator and adversarial nature; exact maxmin strategies derived (precision scheme from the α*(x,y) first-order condition, eq. 8); worst-case optimizations verified numerically in Matlab over compact domains K₁–K₄.

## 7. Numerical results / baselines
- Precision scheme regret 0.0225 vs DeGroot 0.0625 vs min-entropy 0.0714 — precision weighting cuts worst-case regret by ~3× vs averaging.
- Average-prior 0.0260 vs lower bound 0.0225 (gap 0.0035; variant 0.0250).
- n-expert impossibility: at n=10⁶ the guaranteed regret floor is already ≈ 1/4 − 0.011 — effectively 1/2-forecasting territory.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **Worst-case regret, not average-case:** the schemes are minimax-optimal against adversarial information structures; on typical (non-adversarial) structures simpler schemes may do as well — but the ordering (precision > average > extreme-following) is still informative.
- Binary state only; square loss only; two-expert results; the i.i.d. conjecture is unproven.
- One-shot setting: GSE has repeated interactions and can *learn* the prior — which the paper itself notes is sufficient for optimal aggregation. The value here is for combining sources whose joint structure is unknown (e.g., a new market or a new model).
- Prop. 1: with unrestricted correlation, nothing beats 1/2 — the schemes need the Blackwell or conditional-independence structure to bite.

## 10. GSE overlap
Direct hit on the **forecast-combination lane** (pairs with 1159's independence doctrine and 1161's partial-evidence aggregation). GSE routinely combines two probability sources with unknown joint structure: its model vs the market-implied probability (or vs a second model). Today the natural default is a simple average — this paper says the average has 3× the worst-case regret of precision weighting, and "follow the sharper forecast" is even worse than averaging. Also reinforces 1159: with many correlated sub-model outputs and no calibrated prior, averaging is provably vacuous — pick the best expert or enforce independence.

## 11. GSE implementation spec
1. **Model + market blend:** replace any simple average of GSE probability p_G and market-implied p_M with the **precision scheme**: w_i ∝ 1/(p_i(1−p_i)) when |p_G−p_M| ≤ 0.4, ∝ 1/√(p_i(1−p_i)) beyond; snap to 0/1 at extremes.
2. **Prior-free Bayes blend:** where a base rate is unavailable, use the **average-prior scheme**: dummy prior μ̂ = (p_G+p_M)/2 in Bordley's formula. Compare vs precision scheme on backtests.
3. **Ensemble guardrail:** for combining >2 correlated sub-model probabilities without a fitted prior, do NOT average — select the single best-calibrated expert (mimicking expert 1 achieves best-expert loss under i.i.d., §7.1.2) or fit the joint structure first.
4. **Effort:** ~1 day (both schemes are closed-form).

## 12. Reproducible test
Dataset: historical games with GSE model probabilities, market-implied probabilities, outcomes. Baselines: simple average, follow-sharper, market-only. Metric: Brier score. Success = precision scheme and/or average-prior scheme beat simple average out-of-sample with statistical significance; document the win rate when |p_G−p_M| > 0.4 (the sqrt-weighting regime).

## 13. Acceptance / rejection gate
ADAPT the precision scheme iff it beats simple averaging on backtested Brier score. ADAPT the average-prior scheme iff it beats or matches precision-weighting when the base rate is unstable (early season). REJECT "follow the most extreme forecast" as a combination rule — provably worse than averaging (0.0714 > 0.0625). REJECT averaging more than ~3 correlated sub-model outputs without a fitted prior — Theorem 4 says the information gain vanishes.

## 14. Improvement experiment
GSE is *not* one-shot — it can learn the prior. Fit the empirical prior μ̂ per market/week from historical data and plug it into the exact Bordley formula (which is optimal given prior + forecasts under conditional independence). Test whether learned-prior Bordley beats the minimax schemes — the paper's own remark says prior knowledge suffices for optimal aggregation, so this should dominate, at the cost of prior-estimation error. Measure the crossover: how much history is needed before learned-prior wins.
