# [2152] Weighted Sets of Probabilities and Minimax Weighted Expected Regret (arXiv:1302.5681)

**Citation:** Joseph Y. Halpern, Samantha Leung (2013). *Weighted Sets of Probabilities and Minimax Weighted Expected Regret: New Approaches for Representing Uncertainty and Making Decisions*. arXiv:1302.5681. URL: https://arxiv.org/abs/1302.5681
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* MWER with likelihood updating is the decision-theoretic foundation for GSE's *model ensemble management*: keep a weighted set of candidate outcome models (engine versions, calibration variants), update weights by the likelihood of observed game outcomes, and make weekly pick/stake decisions by minimizing maximum *weighted* expected regret. Bad models are automatically downweighted; the rule provably converges to standard expected utility under the true model. No other paper in the lane gives a *learned* weighting over the uncertainty set.

## 1. Research question
Representing uncertainty as a *set* of probability measures (rather than one) breaks learning: measure-by-measure updating doesn't concentrate on the truth. Can we fix this with *weighted* sets of probabilities — (Pr, α_Pr) pairs with a principled updating rule — and build a decision rule (minimax weighted expected regret, MWER) on top that (a) is less conservative than maximin expected utility, (b) learns the right model over time, and (c) admits an axiomatic characterization in static and dynamic settings?

## 2. Dataset / schema
No data — pure decision theory: running example is the T-800 cupcake-delivery robot (states = # broken cupcakes, acts = cont/back/check); dynamic-inconsistency example is a two-stage restaurant decision tree. All results are theorems/proofs.

## 3. Method / model
- **Weighted probabilities:** P^+ = {(Pr, α_Pr)} with α_Pr ∈ [0,1] = "significance" weight per measure.
- **Likelihood updating:** on observing E, α_Pr ← Pr(E)/sup_{Pr'∈P} Pr'(E) (sup over measures updating to the same conditional). Key theorem: if observations come from a stable measure, weights of the closest measures → 1 and all others → 0 a.s. — the weighted set collapses to the truth, unlike measure-by-measure updating. Hence MWER → SEU (subjective expected utility) in the limit.
- **MWER decision rule:** reg_{M,P^+}(f) = sup_{Pr∈P}(α_Pr · Σ_s Pr(s)·reg_M(f,s)); prefer f over g iff its maximum weighted expected regret is smaller. Generalizes MER (minimax expected regret); strictly less conservative than MMEU (maximin expected utility) since regret is measured against the per-measure optimum.
- **Axiomatization:** static and dynamic (with likelihood updating) characterizations of MWER preferences.
- **Dynamic inconsistency:** MWER (like all non-Bayesian rules per Epstein & Le Breton) can be dynamically inconsistent — ex-ante optimal plans may not be followed ex-post. Discusses standard remedies (resolute choice, sophisticated planning) and subtleties specific to MWER.
- **Weight determination:** natural approach to initial weights discussed (e.g., from prior confidence in each model).

## 4. Equations & assumptions
- reg_M(f,s) = max_{g∈M} u(g(s)) − u(f(s)) (regret of act f in state s vs menu M).
- MER: reg_{M,P}(f) = sup_{Pr∈P} Σ_s Pr(s)·reg_M(f,s).
- MWER: reg_{M,P^+}(f) = sup_{Pr∈P}(α_Pr · Σ_s Pr(s)·reg_M(f,s)).
- Likelihood update: α_Pr^{new} = Pr(E)/sup_{Pr'} Pr'(E).
- Assumptions: finite state space; bounded utility; stable data-generating measure for the convergence theorem; menu M of acts fixed.

## 5. Features / target
Abstract states/acts/outcomes. Target: act minimizing maximum weighted expected regret.

## 6. Validation design
None — theorems and worked examples only (cupcake robot, restaurant tree).

## 7. Numerical results / baselines
No numerical results. Qualitative: in the cupcake example, MER and MWER both select "check" (inspect before deciding); MMEU-style reasoning would differ. The convergence theorem (weights → truth a.s.) is the paper's "result."

## 8. Code / data availability
None.

## 9. Leakage & limitations
- Zero empirical content — no experiments, no simulations, no real decisions evaluated.
- The convergence theorem needs a *stable* data-generating measure; sports DGPs drift (rule changes, meta shifts), so weights may chase a moving target — needs windowing, which the paper doesn't discuss.
- Dynamic inconsistency is a real hazard for season-long planning: a weekly MWER re-optimization can deviate from the ex-ante season plan; the paper discusses remedies but doesn't resolve which to use.
- Initial weights are a free choice ("natural approach" is informal) — in practice this is a prior that needs justification.
- Finite-state, single-decision framing; extending to sequential weekly decisions requires the dynamic version with all its subtleties.
- Computational cost of sup over a large weighted set each week — needs the set kept small (prune low-weight measures).

## 10. GSE overlap
Existing-research map: 2151 does minimax regret over MDP *samples* (uniform max, no learning); this paper adds *learned weights* with a convergence guarantee — the ensemble actually improves as evidence accumulates. Nothing in the corpus addresses how GSE should manage *multiple competing engine variants* (v5.2.7 vs recalibrated variants vs challenger models) at decision time. Current practice (per memory) is a single engine version's picks. MWER gives the rule: maintain the weighted set of model variants, likelihood-update on observed outcomes each week, and choose stakes/picks minimizing maximum weighted expected regret — a principled challenger-management layer that degrades gracefully (a bad variant's weight → 0) instead of requiring a hard cutover. The dynamic-inconsistency analysis also directly informs GSE's season-plan-vs-weekly-reoptimization tension.

## 11. GSE implementation spec
- **Weighted set:** P^+ = {(engine variant v, α_v)} — variants: production v5.2.7, recalibrated variants (different calibration windows), a market-following variant, a conservative-prior variant. 4–6 measures max.
- **Likelihood updating:** weekly, α_v ← L_v(week's outcomes)/max_{v'} L_{v'}(week's outcomes) on a rolling 8-week window (addresses the non-stationarity the paper ignores); prune variants with α < 0.05.
- **Decision rule:** for each candidate weekly slate action (which picks to post + stake tiers), compute per-variant expected regret vs that variant's own optimal slate; choose the action minimizing max_v α_v · E_v[regret]. Served as a final "slate audit" before posting.
- **Dynamic-consistency guard:** adopt resolute choice — commit to the season-level policy from 2149 and only allow MWER to veto/attenuate individual weeks, never to rewrite the season plan.
- **Effort:** ~1–2 weeks (variant registry + likelihood updater + MWER slate audit).

## 12. Reproducible test
Dataset: engine predictions DB with per-variant backtests (or reconstruct variants by recalibrating on different windows), 2022–2025. Walk-forward weekly: maintain weights, apply MWER slate selection vs baselines: (a) single production variant, (b) uniform-weight minimax regret (2151-style), (c) Bayesian model averaging by expected profit. Metrics: season profit, Sharpe, max drawdown; plus weight-trajectory diagnostics (does the best variant's weight → 1? how fast after a regime change?).

## 13. Acceptance / rejection gate
**ACCEPT if walk-forward:** season profit ≥ 1.05 × best single-variant baseline AND max drawdown ≤ best baseline's AND the weight of the ex-post best variant exceeds 0.5 within 8 weeks of a regime change (learning actually happens on a sports-relevant timescale). **REJECT if** MWER underperforms the single production variant on profit or weights oscillate without concentrating (then the DGP is too non-stationary for the convergence theorem to bite).

## 14. Improvement experiment
Beyond the paper: *hierarchical* weights — group variants by family (calibration variants vs structural variants) with group-level and within-group weights, testing whether hierarchical likelihood updating concentrates faster after regime changes than the flat version. Second axis: replace the paper's exact likelihood with a *calibration-aware* likelihood (weight by proper scoring rule on probabilities, not just outcome likelihood) and test whether proper-score weighting selects better-performing variants for the profit objective.

