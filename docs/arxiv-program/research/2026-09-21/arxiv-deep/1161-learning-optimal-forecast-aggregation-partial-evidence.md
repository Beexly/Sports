# [1161] Learning of Optimal Forecast Aggregation in Partial Evidence Environments (arXiv:1802.07107)

**Citation:** Yakov Babichenko, Dan Garber (2018). *Learning of Optimal Forecast Aggregation in Partial Evidence Environments*. arXiv:1802.07107v1 [cs.LG], Technion. URL: https://arxiv.org/abs/1802.07107
**Ledger completed:** 2026-09-21. **Read:** full paper including appendix A (proofs of Lemmas 2–4).
**Verdict:** ADAPT
The paper's core technique (aggregate in log-odds space with a learned linear rule via online gradient descent) is a concrete, implementable calibration layer for GSE's probability blending. The injectivity condition converts into an actionable ensemble-design rule: never include redundant sub-models that see identical evidence.

## 1. Research question
In a *repeated* setting where the aggregator sees only experts' forecasts (never their evidence) but observes realized outcomes, can she *learn* the optimal (fully Bayesian) aggregation? Experts are Bayesian with a common prior; each sees a different subset of conditionally independent signals (the "partial evidence" model, evidence matrix A ∈ {0,1}^{n×m}).

## 2. Dataset / schema
Theory; no empirical dataset. Impossibility illustrated with a worked example: μ=1/2, three signals correct with prob. 3/4, A=[[1,1,0],[0,1,1]] — both experts forecast 1/2 while the optimal aggregation is 1/4 or 3/4 (regret ≈ 0.024/period).

## 3. Method / model
Translate to log-likelihood space: r̃*(s) = Σ_j(x̃_j − μ̃) + μ̃, F̃_i = Σ_{j∈A_i}(x̃_j − μ̃) + μ̃, i.e. F̃ = Aỹ + μ̃1_n and r̃* = h*·z̃ + μ̃ with h* = 1_m(AᵀA)^{-1}Aᵀ. Log loss becomes convex in h → **online gradient descent** on an unbiased gradient estimator. Extreme forecasts (outside [τ, 1−τ], τ=T^{−1/2}) handled by "follow the extreme expert" (forecast nτ / 1−nτ / 1/2). Prior-ignorant version: phase 1 estimates μ̂ by empirical frequency (T₁ = nσ^{−1}√T rounds of forecasting 1/2), phase 2 runs OGD with the estimate.

## 4. Equations & assumptions
- Bordley optimal aggregation (eq. 1): r*(s) = (1−μ)^{m−1}Πx_j / [(1−μ)^{m−1}Πx_j + μ^{m−1}Π(1−x_j)].
- Log-odds linearization: F̃ = Aỹ + μ̃1_n; optimal rule is linear: h* = 1_m A_l^{−1}, A_l^{−1} = (AᵀA)^{−1}Aᵀ.
- **Thm. 1 (static, injective A):** even the prior-ignorant aggregator learns; regret Õ(nσ_min(A)^{−1}√T).
- **Thm. 2 (dynamic/adversarial C_t, injective A):** prior-aware aggregator learns with the same rate.
- **Prop. 1:** non-injective A → even prior-aware aggregator cannot learn (strictly positive per-period regret forever).
- **Prop. 2:** dynamic + prior-ignorant → cannot learn (regret ≥ T ln 2).
- Extreme-forecast lemmas: P(ω=1 | some expert forecasts ≤ α) ≤ nα (Lemma 2); both-sides-extreme has prob. ≤ 2nα (Lemma 4).
- Random-matrix remark: if m/n ≤ C < 1, σ_min = Ω(√n) w.h.p. → regret Õ(√(nT)).
- **Assumptions:** binary event, log loss, Bayesian honest experts, common prior, conditionally independent signals, fixed evidence matrix A; prior bounded away from 0/1.

## 5. Features / target
Not applicable — inputs are expert forecast profiles F_t; target = optimal Bayesian aggregation r*(s_t).

## 6. Validation design
Analytical: OGD regret bounds (Lemma 1, Hazan) applied to the convexified log-likelihood loss; impossibility via indistinguishable forecast profiles under non-injective A.

## 7. Numerical results / baselines
Theoretical rates only: Õ(nσ^{−1}√T) regret in the learnable regimes; the worked Example 1 quantifies the non-injective failure (per-period regret ≈ 0.024 in log-loss units). No simulations.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Log loss, not Brier — the convexity argument is log-loss-specific; GSE uses both, so fine.
- Requires the partial-evidence structure (conditionally independent signals, fixed A) — real sub-models share correlated features; the result degrades gracefully but the exact rates assume it.
- Injectivity is knife-edge: σ_min(A) near zero → arbitrarily slow learning; the Õ(√(nT)) rate needs substantially fewer signals than experts.
- One binary event at a time; multi-outcome (spreads/totals as distributions) not covered.
- Phase 1 burns nσ^{−1}√T rounds forecasting 1/2 — in GSE's repeated setting this is just historical data, so it's free.

## 10. GSE overlap
Completes the aggregation triptych with 1159 (independence doctrine) and 1160 (minimax two-forecast rules). Where 1160 gives the *one-shot* answer, 1161 gives the *repeated* answer — which is GSE's actual setting (every slate is another round with observed outcomes). The prescription: **stop averaging probabilities; learn a linear rule in log-odds space.** GSE already has the history to be "prior-aware," which is exactly the condition needed for the harder dynamic (season-shifting) regime.

## 11. GSE implementation spec
1. **Log-odds blending layer:** for each game, collect component probabilities (engine model, market-implied, any sub-model) as log-odds z̃_i = logit(p_i) − logit(μ̂) (μ̂ = empirical base rate per market). Final probability = logit(h·z̃ + logit(μ̂)) with h learned by online gradient descent on log loss over historical slates (closed-form-ish update, eq. 6 — one pass over history).
2. **Injectivity audit:** if two components are deterministic functions of the same evidence (e.g., two models on identical features), drop one — Prop. 1 says redundant evidence structure can permanently block learning, and at minimum it wastes the σ_min.
3. **Extreme-forecast rule:** when any source posts p outside [τ, 1−τ] (τ from sample size), blend toward it aggressively per Lemmas 2–4 (an extreme Bayesian forecast is evidence, not noise) — but cap influence at the nα bound.
4. **Effort:** ~2 days (OGD on history is trivial; the audit reuses 1159's).

## 12. Reproducible test
Dataset: historical games with GSE model probs, market-implied probs, outcomes. Baseline: current blending (simple average / precision scheme from 1160). Metric: out-of-sample log loss (and Brier as secondary). Success = learned log-odds-linear h beats both baselines with a paired test; ablation: drop redundant components and confirm no degradation (injectivity audit).

## 13. Acceptance / rejection gate
ADAPT the log-odds-linear OGD blending layer iff it beats simple averaging on out-of-sample log loss. ADOPT the injectivity audit as a standing rule (dedupe redundant sub-models). REJECT the phase-1 "forecast 1/2" procedure — GSE has history, so initialize h from it directly. REJECT applying the dynamic-regime guarantee without re-estimating μ̂ per regime (season, market) — the prior-aware condition is load-bearing.

## 14. Improvement experiment
The paper fixes A (experts' evidence sets don't change). GSE's components *do* change (model updates). Extend to **time-varying h_t with forgetting**: run OGD with a sliding window / exponential decay and compare vs full-history h on regime-shifted stretches (e.g., post-injury-news slates). Test whether adaptive h detects that a component's evidence set changed (its weight should collapse) faster than a quarterly refit. Second: multi-class extension — apply the same log-odds-linear learning per outcome class (home/away/draw or over/under) with a shared h, and test vs independent per-class fits.
