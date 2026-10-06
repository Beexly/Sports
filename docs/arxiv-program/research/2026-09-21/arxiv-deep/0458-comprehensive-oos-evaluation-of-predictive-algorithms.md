# [0458] Comprehensive OOS Evaluation of Predictive Algorithms with Statistical Decision Theory (arXiv:2403.11016v3)

**Citation:** Dominitz, J., Manski, C.F. (2025). *Comprehensive OOS Evaluation of Predictive Algorithms with Statistical Decision Theory*. Revised April 16, 2025. arXiv:2403.11016v3. URL: https://arxiv.org/abs/2403.11016v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2009 lines, incl. Appendix A).
**Verdict:** ADAPT — adopt the minimax-regret evaluation doctrine for GSE engine validation: judge the engine by maximum regret across a state space of seasons/regimes (not a single backtest number), and evaluate the pick rule as a statistical decision function (bet/no-bet) rather than the probabilities in isolation.

## 1. Research question
ML practice evaluates predictors by K-fold or Common-Task-Framework (CTF) out-of-sample accuracy — ex post, on one realized training sample, assuming the future looks like the past. Should this be replaced by Wald's statistical decision theory (SDT): ex ante evaluation of a statistical decision function c(·): Ψ→C across (1) all possible training samples, (2) all populations that may generate training data, and (3) all populations of prediction interest — using minimax-regret as the decision criterion?

## 2. Dataset / schema
No new dataset or experiment. Illustrative settings: (a) treatment choice (surveillance vs. aggressive treatment) with a binary illness outcome, threshold rule, and kernel estimates of P(y=1|x) under bounded-variation cross-covariate restrictions (Manski 2023); (b) critique of Mullainathan & Obermeyer (2022): ~250,000 ER visits, 16,000+ covariates, ensemble of gradient-boosted trees + LASSO on tested/untested subsets, 5-fold CV tuning, 70/5/25 split — presented as an example of heuristic OOS validation lacking theoretical foundation. No sports data.

## 3. Method / model
Wald's SDT framework, restated for prediction:
1. **Decision criteria** (no data): Bayes risk min_c ∫L(c,s)dπ (eq. 1); minimax min_c max_s L(c,s) (eq. 2); **minimax regret (MMR)** min_c max_s [L(c,s) − min_d L(d,s)] (eq. 3).
2. **Statistical versions** (with sample data ψ∼Q_s): min_{c(·)∈Γ} ∫E_s{L[c(ψ),s]}dπ (eq. 4); minimax risk (eq. 5); **minimax regret** min_{c(·)} max_s (E_s{L[c(ψ),s]} − min_d L(d,s)) (eq. 6). A state of nature s = a (training-population, prediction-population) pair; the state space S lists all deemed-possible pairs.
3. **Prediction-based SDFs**: [data → prediction → action]; d(ψ) = argmin_c L[c, f(ψ)] for distributional predictors, or as-if optimization on a point prediction p(ψ). MSE loss (eq. 7) and misclassification-rate loss (eq. 8) as special cases.
4. **Binary-choice regret decomposition** (Appendix A, eqs. A1–A6): expected regret = R_{c(·)s}·|L(a,s)−L(b,s)| — error probability times loss magnitude. For MSE: regret = V_s[p(ψ)] + {E_s(y)−E_s[p(ψ)]}²; for MCR: regret = P(misclassify) − min[P_s(y=1), 1−P_s(y=1)].
5. **Computation**: Monte Carlo integration for E_s{L[c(ψ),s]}; grid search over S when smooth; the hard step is optimizing over SDFs Γ — proceed case-by-case, evaluating simple SDFs actually used.
6. **Clinical illustration** (Section 4.2): threshold px# = [U_x(A,0)−U_x(B,0)] / ([U_x(A,0)−U_x(B,0)] + [U_x(B,1)−U_x(A,1)]) (eq. 13); in the neutralized-disease special case px# = 1−U_xB (eq. 17); expected regret E_s{R_sx[φ_x(ψ)]} = |(1−p_sx)−U_xB|·Q_s{e[·]=1} (eq. 19); grid-plus-Monte-Carlo algorithm for maximum regret.

## 4. Equations & assumptions
- min_c ∫L(c,s)dπ; min_c max_s L(c,s); min_c max_s [L(c,s) − min_d L(d,s)]. (eqs. 1–3)
- Statistical: min_{c(·)∈Γ} ∫E_s{L[c(ψ),s]}dπ; min max E_s{L[c(ψ),s]}; min max (E_s{L[c(ψ),s]} − min_d L(d,s)). (eqs. 4–6)
- L[c,P(y|x)] = E[(y−c)²|x] (eq. 7); L[c,P(y|x)] = P(y≠c|x) (eq. 8).
- Bounded variation: P_s(y=1|x′) + λ−(x,x′) ≤ P_s(y=1|x) ≤ P_s(y=1|x′) + λ+(x,x′) ∀s∈S. (eq. 9)
- Binary regret: E_s{L[c(ψ),s]} = min[L(a,s),L(b,s)] + R_{c(·)s}·|L(a,s)−L(b,s)|. (eq. A2)
Assumptions: state space S specified by the analyst (the substantive modeling choice); weak regularity for expectations/extrema; sampling distribution Q_s known up to the state; cross-covariate restrictions (bounded variation, sparsity, etc.) chosen application-specifically — data at x′≠x inform P(y|x) only through these restrictions.

## 5. Features / target
Conceptual paper: no features. Targets of the framework: any prediction-based SDF (ML predictor + decision rule); the evaluated quantity is maximum regret across S. Clinical target: choose surveillance (A) vs. aggressive treatment (B) via estimated illness probability vs. threshold.

## 6. Validation design
No empirical validation — this is a position/methodology paper. "Validation" consists of: (a) worked clinical example with a computational algorithm for maximum regret (Manski 2023, kernel estimates under bounded-variation restrictions); (b) critique of Mullainathan & Obermeyer's CTF-style evaluation as theoretically unfounded; (c) acknowledgment that SDT is "often computationally demanding" and high-dimensional/ML-scale implementation is "not currently computationally tractable" — issued as a call to arms, not a solved problem.

## 7. Numerical results / baselines
None — no new numbers. Referenced quantitative facts: Bates, Hastie & Tibshirani (2024) sparse-logit example (n=90, p=1000, 4 nonzero coefficients, Bayes MCR 20%): naive 90%-coverage CIs for prediction error actually miscover 31%, needing ~1.6× widening — used to illustrate that CV-based uncertainty quantification is unreliable; Stoye (2012) analytic MMR rule under symmetric bounded variation λ±=±κ; ESS-style Monte Carlo for expected regret.

## 8. Code / data availability
None. (References Manski 2023 computations; no repository.)

## 9. Leakage & limitations
- **No tractable implementation for GSE-scale problems**: the authors admit optimizing over SDFs Γ has "no generally applicable approach" and high-dimensional ML settings are "not currently computationally tractable." The paper is a criterion, not an algorithm.
- Maximum regret is only as credible as the state space S — which is analyst-specified; a too-narrow S makes MMR look deceptively good (same "model space vs. state space" critique they level at robust-decision research).
- Minimax regret can be "ultrapessimistic"-adjacent: it optimizes for the worst state, potentially sacrificing large gains in likely states (Savage's critique of minimax applies in muted form).
- No guidance on choosing among admissible SDFs beyond the three criteria; the paper "does not take a stand" on cross-covariate restrictions.
- The clinical illustration assumes the welfare function U_x is *known* — in betting, the utility (bankroll growth, risk tolerance) is chosen, not known.
- Ex ante evaluation across "all possible training samples" requires a sampling model for NFL seasons — seasons are not i.i.d. draws (schedule structure, rule changes, evolving meta).

## 10. GSE overlap
**Extension — new evaluation doctrine.** Per the existing-research map: GSE's calibration lanes (CQR, Platt/isotonic, Venn-Abers) calibrate probabilities; paper 0452 (Actuary's Final Word) argues for proper scoring rules in *evaluating* one model; paper 0457 (BPDS) weights *combinations* by decision utility. This paper is complementary to both: it says evaluate the *pick rule as a decision function* by **maximum regret across a state space of regimes**, not by average backtest accuracy. Nothing in the corpus currently does regime-robust / worst-case evaluation of the engine — backtests report averages. The binary-regret decomposition (error prob × loss magnitude) maps directly onto bet/no-bet decisions with stake sizing. Not a duplicate.

## 11. GSE implementation spec
1. **Define the state space S**: each state = a (training-era, prediction-era) pair, e.g., train 2019–2022 → predict 2023; train 2020–2023 → predict 2024; plus stressed states (post-rule-change seasons, QB-injury clusters, weather-extreme slates). This directly confronts "the future may not look like the past."
2. **Define the SDF**: c(·) = [data → GSE probabilities → bet/no-bet + stake rule]. Loss = negative bankroll log-growth (or negative CLV) per slate.
3. **Compute regret per state**: for each candidate engine variant (v5.2.7 vs. challengers), Monte-Carlo over bootstrap resamples of the training era → expected loss; regret = expected loss − best-variant loss in that state.
4. **Report maximum regret** across S alongside the usual average backtest; prefer the engine with small maximum regret ("uniformly near-optimal") over the one with the best average but a catastrophic regime.
5. Effort: ~1–2 weeks (bootstrap harness over the existing picks DB + regime definitions); no new modeling.

## 12. Reproducible test
Dataset: GSE picks table (3,411 picks, v5.2.7) + challenger model histories + closing lines, 2019–2025. Protocol: define 6 states (three era-pairs + two stressed states + one rule-change state); for each engine variant, bootstrap 200 resamples of the training era, compute expected per-slate log-growth loss, take regret vs. best variant per state, report max regret. Expectation per paper: the variant with the best average backtest is not necessarily the minimax-regret choice — document whichever diverges and why.

## 13. Acceptance / rejection gate
Adopt MMR as a standing engine-selection criterion if the max-regret ranking disagrees with the average-backtest ranking on at least one real engine decision in 2024–2025 (i.e., it changes a choice we would otherwise make) — that demonstrates the doctrine adds information. If max-regret and average-backtest always agree, keep reporting MMR as a diagnostic but don't let it override averages (the paper's criterion is only worth its computational cost when it bites).

## 14. Improvement experiment
Go beyond the paper: the authors leave the state space S as an analyst's free choice — make it *adversarial* by adding an automated "regime generator" that searches over plausible perturbations (injury rates, line-shading shifts, weather distributions) for the state maximizing each engine's regret, i.e., compute max regret by optimization rather than by a hand-picked grid. This turns their case-by-case, grid-based computation into a stress-testing engine — and directly addresses their "call to arms" on tractability for one concrete domain.
