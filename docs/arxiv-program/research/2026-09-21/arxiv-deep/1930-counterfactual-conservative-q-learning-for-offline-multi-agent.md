# [1930] Counterfactual Conservative Q Learning for Offline Multi-agent Reinforcement Learning (arXiv:2309.12696)

**Citation:** Jianzhun Shao, Yun Qu, Chen Chen, Hongchang Zhang, Xiangyang Ji (2023). *Counterfactual Conservative Q Learning for Offline Multi-agent Reinforcement Learning*. arXiv:2309.12696. URL: https://arxiv.org/abs/2309.12696
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Offline MARL suffers both offline distribution shift and the curse of dimensionality in the joint action space. The naive approach (MACQL: standard CQL on the joint policy) induces a penalty that grows exponentially in the number of agents — far too conservative. Can per-agent counterfactual regularization keep CQL's lower-bound guarantee with milder pessimism? The paper proposes CFCQL under CTDE and proves the guarantee survives.

## 2. Dataset / schema
Offline MARL benchmarks: Multi-agent Particle Environments (Cooperative Navigation, Predator-Prey, World) with Random/Med-Rep/Medium/Expert datasets; Multi-agent MuJoCo (HalfCheetah-v2); SMAC-style coordination tasks mentioned. Baselines: OMAR, MACQL (joint CQL), IQL. Datasets are the standard offline-MARL D4RL-like collections.

## 3. Method / model
**CFCQL (Eq 4).** CTDE paradigm. Policy evaluation: Q̂_{k+1} ← argmin_Q α[Σ_{i=1}^n λ_i E_{s∼D, a^i∼μ^i, a^{−i}∼β^{−i}}[Q(s,a)] − E_{s∼D, a∼β}[Q(s,a)]] + Bellman error Ê_D(π,Q,k), with Σλ_i=1, λ_i≥0. Each agent i's OOD actions are penalized *counterfactually* — marginalizing agent i's action while holding other agents' actions fixed at the behavior data — then linearly combined with weights λ_i. This penalizes per-agent deviations instead of joint deviations, avoiding the exponential blowup.

## 4. Equations & assumptions
- CFCQL evaluation (Eq 4): Q̂_{k+1} ← argmin_Q α[Σ_{i=1}^n λ_i E_{s∼D,a^i∼μ^i,a^{−i}∼β^{−i}}[Q(s,a)] − E_{s∼D,a∼β}[Q(s,a)]] + Ê_D(π,Q,k).
- Theorem 4.1: V̂^π(s)=E_{π(a|s)}[Q̂^π(s,a)] lower-bounds the true policy value from exact evaluation.
- Theorem 4.2: CFCQL's conservatism is milder than MACQL's (quantified gap), while still a lower bound.
- Theorems 4.3/4.4: performance guarantees showing the milder conservatism translates to better safe-policy-improvement bounds.
- Assumptions: CTDE; discrete or continuous per-agent actions; behavior joint policy β factorizable per agent for the counterfactual expectations; λ_i fixed hyperparameters.

## 5. Features / target
Input: global state + per-agent observations. Target: joint conservative Q(s,a) trained with counterfactual per-agent penalties; decentralized per-agent policies. Horizon: discounted infinite-horizon.

## 6. Validation design
Benchmark-based (offline MARL datasets), not time-ordered. Baselines: OMAR, MACQL, IQL. Metrics: normalized episode return, mean±std over seeds. Datasets: Random/Med-Rep/Medium/Expert per environment.

## 7. Numerical results / baselines
- MPE Cooperative Navigation (Table 1): CFCQL 62.2±8.1 / 52.2±9.6 / 65.0±10.2 / 112±4 (Random/Med-Rep/Medium/Expert) vs MACQL 45.6±8.7 / 25.5±5.9 / 14.3±20.2 / 12.2±31 and OMAR 34.4±5.3 / 37.9±12.3 / 47.9±18.9 / 114.9±2.6 — CFCQL best or tied-best on all four; MACQL collapses on Medium/Expert (over-conservatism).
- Predator-Prey: CFCQL 78.5±15.6 / 71.1±6 / 68.5±21.8 vs MACQL 25.2±11.5 / 11.9±9.2 / 55±43.2 — large wins on Random/Med-Rep.
- MaMuJoCo HalfCheetah (Table 2/3): CFCQL competitive/best (exact numbers in tables; direction favors CFCQL over MACQL/IQL).
- Pattern: the CFCQL–MACQL gap is largest where data is weakest (Random/Med-Rep) — exactly the regime where conservatism calibration matters most.

## 8. Code / data availability
None stated in the paper.

## 9. Leakage & limitations
- λ_i weights are fixed hyperparameters (Σλ_i=1); no adaptive scheme.
- Counterfactual expectations require sampling a^i∼μ^i per agent — cost scales linearly in agents (fine) but the joint Q still takes the full joint action as input.
- Experiments are standard MARL benchmarks; the "agents" are homogeneous robots, not portfolio positions — the mapping to betting is analogical.
- No analysis of correlated behavior policies (bets in a slate are correlated through the engine's edge estimates; β^{−i} conditioning may be less clean).

## 10. GSE overlap
Reframes the slate problem: instead of one agent picking a stake *vector* (joint action space 5^13 for a 13-bet slate — where joint CQL is hopelessly conservative), treat each bet as an agent choosing its own stake, coupled through a shared exposure cap and correlated outcomes. No repo work does multi-agent or portfolio-coupled stake selection (Kelly is per-bet independent; gap #1). New capability.

## 11. GSE implementation spec
1. Model each slate position i as an agent: action a^i ∈ {0, 0.25u, 0.5u, 1u, 2u}; shared reward = weekly portfolio profit; global state = slate context + running exposure.
2. Train CFCQL: joint Q-network over (state, stake vector) with the counterfactual penalty (Eq 4) — penalize agent i's stake deviations holding other bets' stakes at historical values, λ_i ∝ 1/(number of bets) or ∝ Kelly weight.
3. Decentralized execution: per-bet stake policy π^i(a^i | slate features, exposure so far), applied sequentially through the slate with the exposure cap as a hard constraint.
4. Keep the scalar CQL (1923) as the single-bet baseline.
5. Effort: ~3 weeks (joint-Q architecture + counterfactual sampling on top of the 1923 pipeline).

## 12. Reproducible test
Dataset: GSE logged picks 2021–2024 (train 2021–2023, test 2024). Baselines: (a) independent per-bet CQL (1923), (b) joint-action CQL/MACQL over the stake vector (expected to be over-conservative), (c) fractional-Kelly. Metrics: 2024 ROI, max drawdown, and exposure-cap violation rate (should be 0 for CFCQL by construction). Diagnostic: verify the learned Q lower-bounds realized portfolio return (Theorem 4.1 check).

## 13. Acceptance / rejection gate
ADOPT iff on 2024 CFCQL beats independent-CQL ROI by ≥1pp with max drawdown no worse AND the lower-bound diagnostic holds on ≥90% of weeks; if MACQL is not actually over-conservative in this domain (gap < 1pp), REJECT the multi-agent machinery as unnecessary complexity.

## 14. Improvement experiment
Learn λ_i adaptively: weight each bet's counterfactual penalty by its historical edge variance (high-variance bets get more conservatism). Tests whether risk-aware penalty allocation beats uniform λ_i — the paper fixes λ, but in a portfolio, not all positions deserve equal pessimism.
