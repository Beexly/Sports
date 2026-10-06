# [1179] Robust Forecast Aggregation via Additional Queries (arXiv:2512.05271v1)

**Citation:** Frongillo, R., Monroe, M., Neyman, E., & Waggoner, B. (2025). *Robust Forecast Aggregation via Additional Queries*. arXiv:2512.05271v1 [cs.GT]. URL: https://arxiv.org/abs/2512.05271
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the partial-information model, the difference-query construction, the complexity-regime theorems, and the Chebyshev/equioscillation minimax reduction).
**Verdict:** ADAPT — the query-complexity framework tells GSE exactly which "extra questions" to ask its model panel: difference queries recover optimal aggregation with only n queries, and the d-vs-√n scaling laws give a principled budget for how many structured follow-up evaluations (overlap diagnostics, conditional forecasts) are worth running per game.

## 1. Research question
Beyond asking each expert for a single forecast, what *additional queries* (higher-order or structured questions, formalized as DAG-elicitable queries) provably improve worst-case aggregation accuracy, and what is the optimal tradeoff between the number/complexity of queries and the achievable worst-case error? (Abstract; Sec. 1)

## 2. Dataset / schema
No real data. Fully theoretical: the partial-information model has n experts each observing an independent mean-zero signal indexed by subsets of experts; the target is the sum of all signals. Query budget d < n; complexity notions: query complexity (number of queries), order complexity (depth of higher-order reasoning), agent complexity (how many experts are queried). (Secs. 2–3)

## 3. Method / model
Elicitation is modeled as queries on a DAG of information sets. Key construction: *difference queries* (ask expert i for the difference between its forecast and a peer's) recover the optimal (Bayesian) aggregation with only n queries — exponentially fewer than naive higher-order elicitation. For a query budget d < n, the paper characterizes the exact best achievable worst-case error. Under linear aggregation with agent/order complexity d, three regimes: d = o(√n) → error 1 − Θ(d²/n); d = Θ(√n) → limiting error strictly between 0 and 1; d = ω(√n) → upper bound decays exponentially in d. Proof technique: reduce optimal aggregation to a constrained polynomial minimax problem and solve it via Chebyshev polynomials and equioscillation arguments. (Secs. 3–5)

## 4. Equations & assumptions
- Model: n experts; signals X_S for subsets S of experts, independent, mean-zero; target Y = Σ_S X_S; expert i observes {X_S : i ∈ S} and reports E[Y | its information].
- Exact minimax worst-case error with query budget d < n: 1 − d/n.
- Linear-aggregation regimes (agent or order complexity d): error = 1 − Θ(d²/n) for d = o(√n); limit strictly in (0,1) at d = Θ(√n); exponentially decaying upper bound for d = ω(√n).
- Assumptions stated: independent signals (the whole analysis rests on this); linear aggregation for the regime theorems; truthful reporting; squared-error loss. The correlated-signal extension is explicitly left open.

## 5. Features / target
Inputs: experts' forecasts plus answers to structured queries (differences, higher-order expectations). Target: the sum of latent signals (real-valued). One-shot elicitation.

## 6. Validation design
Pure theory: exact minimax characterizations and asymptotic regimes. No simulations, no real data, no train/test. The "validation" is the tightness of the bounds (exact 1 − d/n; matching upper/lower Θ rates). (Secs. 4–5)

## 7. Numerical results / baselines
No numerical experiments. The quantitative claims are the closed forms above: with n experts and d < n queries the best worst-case error is exactly 1 − d/n; the √n phase transition for linear aggregation (sub-√n: polynomial 1 − Θ(d²/n); super-√n: exponential decay). Distinguish: these are worst-case error bounds in the independent-signal model, not measured accuracy gains.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
(1) Everything hinges on *independent* signals — GSE's model panel is heavily correlated (shared nflverse inputs), and the paper explicitly leaves correlated signals open, so the 1 − d/n and √n results are inspirational, not directly applicable; (2) no empirical validation whatsoever — not even synthetic simulations of the query schemes; (3) elicitation framing assumes cooperative truthful experts; GSE's "experts" are its own models, so queries must be re-interpreted as offline computations, which the paper doesn't discuss; (4) squared error, real-valued target — the binary-probability case is not treated.

## 10. GSE overlap
New conceptual capability. Nothing in the existing-research-map covers structured elicitation or "what extra to ask the panel": the repo aggregates single forecasts per model (gse-lab, ML brief ensembling) and the market-microstructure lane reads market prices, but no work asks *conditional* or *difference* questions of the model panel (e.g., "how would your forecast change if the market moved 2 points?" — the analog of a difference query). Complements ledgers 1174/1175 (aggregation rules) by addressing the *input* side: richer per-model interrogation before combining. The overlap-diagnostic angle (which queries reveal shared vs. private information across components) is genuinely new for the repo.

## 11. GSE implementation spec
1. Operationalize "queries" as offline model interrogations: for each game and each engine component, compute (a) the base forecast, (b) difference queries — forecast under perturbed inputs (key player out, line moved ±2), (c) conditional forecasts given the consensus of the other components. 2. Build the overlap diagnostic: the covariance structure of difference-query responses estimates how much *private* vs. shared signal each component carries — use it to prune redundant components (ties to ledger 1178's sparsity finding). 3. Feed difference-query responses as extra features into the ledger-1175 peer-expectation aggregator. Effort: ~1 week (perturbation harness per component + diagnostic dashboard).

## 12. Reproducible test
Dataset: GSE `picks` history 2024–2025; per-component forecasts plus perturbation responses computed offline. Metric: Brier/log-loss walk-forward 2025. Baselines: base-forecast-only aggregation (ledger-1177 SGP) vs. base + difference-query features. Gate: adopt the interrogation layer if it improves log-loss ≥0.003 (DM p<0.05). Secondary gate: the overlap diagnostic must identify at least one redundant component pair (private-signal share <10%) that, when pruned, does not hurt accuracy — validating the diagnostic itself.

## 13. Acceptance / rejection gate
ADOPT structured model interrogation if (a) adding difference-query features improves 2025 walk-forward log-loss by ≥0.003 over base-forecast aggregation (DM p<0.05), AND (b) the overlap diagnostic's redundancy calls are confirmed by ablation (removing a flagged component changes log-loss by <0.001); REJECT otherwise. Cost veto: if per-game interrogation compute exceeds 5× the base inference cost without meeting (a), reject on economics.

## 14. Improvement experiment
Go beyond the paper: attack its open problem empirically — estimate the *actual* correlation structure of GSE's component signals and test whether the paper's √n-style scaling survives correlation. Concretely, simulate the paper's query game on the empirical joint distribution of component forecasts (fitted copula), vary the query budget d, and map the realized error-vs-d curve against the 1 − d/n benchmark. If correlation breaks the scaling, derive the empirical correction factor; if it roughly holds, GSE gets a usable query-budget rule for how many interrogations per game are worth the compute.
