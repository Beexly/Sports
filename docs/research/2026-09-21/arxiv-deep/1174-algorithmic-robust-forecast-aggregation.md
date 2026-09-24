# [1174] Algorithmic Robust Forecast Aggregation (arXiv:2401.17743v1)

**Citation:** Guo, Y., Hartline, J. D., Huang, Z., Kong, Y., Shah, A., & Yu, F.-Y. (2024). *Algorithmic Robust Forecast Aggregation*. arXiv:2401.17743v1 [cs.GT]. URL: https://arxiv.org/abs/2401.17743
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including zero-sum game formulation, best-response oracles, discretization/covering analysis, Lipschitz aggregator, and the numerical experiments).
**Verdict:** ADAPT — an adversarial stress-test framework for GSE ensemble aggregation: the closed-form zero-sum-game aggregator bounds worst-case regret when member models are correlated or misspecified, and the experiment protocol (N=20, M=400, L=inf) is directly reusable as a robustness harness for the engine's combiner.

## 1. Research question
How should one aggregate forecasts from multiple experts when the information structure (joint distribution of signals given the binary state) is unknown — i.e., find the aggregator minimizing worst-case (minimax) additive regret under quadratic loss, and is the resulting aggregator computable? (Abstract; Sec. 1)

## 2. Dataset / schema
No real data. Synthetic numerical experiments only: the paper discretizes a family of two-expert conditionally-independent information structures. Experiment parameters reported: N=20, M=400, L=inf (a grid/discretization of the signal space with N=20 forecast bins, M=400 nature strategies, and unbounded Lipschitz-type regularization L=inf per the paper's notation). (Secs. 5–6)

## 3. Method / model
Minimax forecast aggregation is formulated as a zero-sum game: the aggregator player chooses an aggregation rule (mapping the two experts' binary forecasts to a probability) while the adversarial "nature" player chooses the worst-case conditionally independent information structure. The paper computes the game value via multiplicative-weights / no-regret dynamics with best-response oracles on both sides. Because the space of information structures is infinite, they construct finite coverings using total-variation-distance (TVD) and earth-mover-distance (EMD) discretization, prove the aggregator class is Lipschitz so discretization error is controlled, and derive an explicit near-minimax aggregator from the equilibrium (a log-odds/log-likelihood-like aggregator of the two forecasts). (Secs. 2–4)

## 4. Equations & assumptions
- Setting: binary state omega in {0,1}; two experts each issue a forecast (posterior) x_i in [0,1]; aggregator f(x_1, x_2) in [0,1]. Quadratic (Brier) loss.
- Regret of aggregator f under information structure pi: R(f, pi) = E_pi[(f(X) - omega)^2] - inf_{g} E_pi[(g(X) - omega)^2], i.e., excess loss over the Bayesian (optimal) aggregator that knows pi.
- Minimax regret: min_f max_pi R(f, pi); existing lower bound quoted as approximately 0.0225 (prior work).
- Assumptions stated: experts are conditionally independent given the state; forecasts are calibrated posteriors of the experts; squared loss; the "nature" adversary is restricted to conditionally independent structures (Sec. 2). Correlated-expert structures are out of scope for the equilibrium computation.

## 5. Features / target
Inputs: two scalar forecasts x_1, x_2 in [0,1]. Target: probability of the binary event. Horizon: one-shot aggregation (no time dimension in the theory).

## 6. Validation design
No train/test split on real data. Validation is game-theoretic (minimax regret certificate) plus the synthetic experiment with N=20 bins, M=400 nature strategies, L=inf, reporting achieved regret of the computed aggregator vs. baselines (simple average, average-prior, previous state of art). (Secs. 5–6)

## 7. Numerical results / baselines
Reported regrets (Sec. 6; my interpretation: these are the paper's computed worst-case or achieved regrets in the discretized game):
- Simple average of forecasts: 0.0625.
- Average-prior aggregator: 0.0260.
- Previous state of the art: 0.0250.
- Proposed aggregator: 0.0226.
- Existing lower bound: approximately 0.0225.
Paper claims the new aggregator is essentially minimax (0.0226 vs. lower bound ~0.0225). Distinguish: these are regrets in the discretized synthetic game, not out-of-sample errors on real forecasting data. The paper explicitly notes real-world experiments are future work.

## 8. Code / data availability
Not stated in paper.

## 9. Leakage & limitations
No real data, so no leakage; the risk is external validity: (1) the two-expert conditionally-independent setting is narrow — GSE ensembles have many correlated members, and the paper's guarantees do not cover correlated information structures; (2) regret numbers are game-theoretic certificates in a discretized synthetic setting, not measured forecasting gains; (3) quadratic loss only — no result for log loss or for decision-relevant losses (Kelly/ROI); (4) authors state real-world experiments are future work, so empirical robustness on actual expert panels is untested.

## 10. GSE overlap
This is a genuinely new capability, not a duplicate. The existing-research-map's ensemble coverage: the repo has extensive model-combination practice (gse-lab, opponent-adjusted EPA builds, the 15-area ML brief lists "ensembling") but no deep read on *robust/adversarial* forecast aggregation, and the 58-paper dossiers have no minimax-aggregation paper. Garrett's own CEPT lane (docs/research/cept/) is an ensemble theory, but it is a causal e-process theory, not a minimax aggregation rule — complementary, not duplicative. The repo's calibration stack (CQR, temperature scaling, grouping loss) addresses per-model calibration, not cross-model worst-case aggregation. New capability: a certified worst-case combiner for correlated/misspecified member models.

## 11. GSE implementation spec
1. Implement the aggregator in the GSE ensemble layer: input = member-model win probabilities for a game, output = combined probability via the paper's log-odds-style rule with the tuned mixture parameter. 2. Data: backtest on GSE historical picks (repo `picks` table, 3,411 picks per MEMORY.md) — treat engine model versions/components as the "experts." 3. Protocol: walk-forward by season; evaluate Brier/log-loss vs. current averaging combiner. 4. Extend beyond the paper: test with >2 experts (the paper's theory is two-expert; a GSE-appropriate extension averages over pairwise applications or fits the natural n-expert generalization and measures regret vs. the two-expert rule). Effort: ~2–3 days for the harness + backtest; the n-expert extension is research-grade.

## 12. Reproducible test
Dataset: GSE engine historical predictions (Neon `picks` table), 2024–2025 NFL seasons, moneyline/spread/total probability outputs from each engine component. Metric: Brier score and log-loss, walk-forward by week. Baseline to beat: current GSE combiner (simple/weighted average) on the same games. Test window: full 2025 regular season (fixed before running). Gate: adopt only if the minimax-style aggregator beats the baseline on both Brier and log-loss with statistical significance (Diebold-Mariano, p<0.05).

## 13. Acceptance / rejection gate
ADOPT into the ensemble if, on the 2025 walk-forward test, Brier score improves by ≥0.002 and log-loss improves by ≥0.005 vs. the current combiner, with Diebold-Mariano p<0.05 on both; REJECT (keep current combiner) otherwise. Robustness sub-gate: the aggregator must not lose to the baseline in any single month-slice by more than 0.003 Brier (worst-case behavior is the point of this paper).

## 14. Improvement experiment
Go beyond the paper: run the paper's own zero-sum protocol *on GSE's empirical expert panel* — i.e., estimate the actual joint distribution of member-model forecasts conditional on outcomes from the picks history, then solve the restricted minimax game against an adversary that perturbs within a TVD ball of the empirical structure. This yields a data-driven robust aggregator tuned to the engine's real correlation structure, relaxing the paper's conditional-independence restriction; compare its walk-forward regret to both the paper's plug-in rule and the current combiner.
