# [0467] Probabilistic Prediction for Binary Treatment Choice (arXiv:2110.00864v1)

**Citation:** Manski, C. F. (2021). *Probabilistic Prediction for Binary Treatment Choice*. arXiv:2110.00864v1. URL: https://arxiv.org/abs/2110.00864v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2316 lines).
**Verdict:** ADAPT — the Wald minimax-regret / as-if-optimization framework ports directly to GSE's publish/bet/abstain decisions under probability uncertainty; it fills the decision-theory gap (Kelly is mentioned 12× in the repo with zero papers read) with a criterion that optimizes decisions, not probability accuracy.

## 1. Research question
When choosing between surveillance (A) and aggressive treatment (B) for a patient with illness probability p_x, how should statistical decision theory — specifically **minimax regret (MMR)** over as-if optimization with *estimated* probabilities — guide the use of probabilistic predictions? And, as a methodological critique: why do biostatistics and computer-science evaluations of prediction models (accuracy, AUC, calibration) miss what matters, namely the quality of the *decisions* the predictions induce?

## 2. Dataset / schema
No real clinical dataset. The paper works with:
- A stylized clinical setup: aggressive treatment is better iff p_x exceeds a threshold; utilities normalized.
- **Simulations:** an "illustrative two-covariate" (ITP) example with p_{m0}=0.2, p_{M0}=0.6, λ_±=±0.1, U_{0B}=0.6; Monte Carlo max-regret computations with 20,000 draws on a 50×50 parameter grid; an ecological-inference example with constrained least squares.
- The empirical content is illustrative/proof-of-concept, not a data analysis.

## 3. Method / model
- **Wald statistical decision theory:** states of nature s, sampling distributions Q_s, statistical decision functions φ(ψ); evaluation by **maximum regret** (not Bayes risk): max_s E_s[R_s(φ)].
- **As-if optimization:** estimate the illness probability p̂_x, then choose treatment as if the estimate were true (threshold rule); the paper characterizes the *maximum regret* of this plug-in rule and of randomized variants.
- **Closed-form results:** no-data and uninformative-data minimax rules; one-observation regret; Hoeffding-based finite-sample bounds for the sample-analog rule; bounded-variation extensions for pooling two samples; weighted (kernel) estimators with optimized weights.
- **Ecological inference:** when only group-level outcome rates are known, bound the conditional probabilities and minimize maximum regret via constrained least squares.

## 4. Equations & assumptions
Paper's equation spine: Wald criteria — Bayes risk, maximin, minimax regret (Eqs. 1–9); the clinical normalization U(A,0)=1, U(A,1)=0, U_B ∈ (0,1), and the **threshold rule** p_x* = 1 − U_B: choose B iff p_x > p_x* (Eqs. 10–21); **regret** R_s[φ(ψ)] = |(1−p_s) − U_B| · e[p_s, φ(ψ), U_B], where e is the probability the rule chooses the inferior treatment (Eqs. 22–25); no-data MMR = min[(1−p_m) − U_B, U_B − (1−p_M)] (Eqs. 26–29); uninformative-data randomized rule with q = [U_B − (1−p_M)]/(p_M − p_m) and MMR equal to the product of the two endpoint gaps divided by (p_M − p_m) (Eqs. 30–33); one-observation maximum regret ¼·max[(1−U_B)², U_B²] (Props); Hoeffding bound max_s E_s[R_s(n/N)] ≤ δ + max[(1−p_m) − U_B, U_B − (1−p_M)]·exp(−2Nδ²) (Eqs. 34–36); bounded-variation pooled-sample extension (δ+α_1λ) + max(gaps)·exp[−2(N_0+N_1)δ²]; weighted-estimator analysis (Eqs. 37–39); ecological constrained-least-squares formulation (Eq. 40). Assumptions: utilities are known and the normalization is without loss *for the decision problem as posed* (it neutralizes disease-specific structure); illness probabilities lie in a known bounded interval [p_m, p_M]; samples are i.i.d. within groups; bounded-variation (Lipschitz-type) smoothness when pooling.

## 5. Features / target
- **Input:** patient covariates x (in the examples, one or two binary covariates), sample data of illness outcomes.
- **Target:** the binary treatment decision (surveillance vs aggressive treatment) — notably, the *decision* is the target, not the probability estimate; the probability is an instrument.
- Horizon: single decision point.

## 6. Validation design
- **Analytical:** propositions with proofs for no-data, uninformative-data, one-observation, and large-sample cases.
- **Computational:** Monte Carlo evaluation of maximum regret (20,000 draws, 50×50 grid over the state space) for weighted estimators; ecological-inference example solved by constrained least squares.
- **No real-data validation** and no comparison against standard ML evaluation metrics on a real task — the "validation" is that the decision-theoretic criteria are coherent and computable.

## 7. Numerical results / baselines
- ITP weighted-estimator example (Table 1, exact): sample sizes (N_0,N_1) and minimized maximum regret at optimal weight — (10,10): 0.030 at w=0.751; (5,15): 0.034 at 0.863; (15,5): 0.023 at 0.752; (20,20): 0.021 at 0.858; (10,30): 0.026 at 0.911; (30,10): 0.016 at 0.800. Optimal weights heavily favor the own-group sample but borrow substantially from the other group.
- Ecological example: maximum regret 0.011 for (10,10) and 0.008 for (20,20).
- Closed forms: one-observation max regret = ¼·max[(1−U_B)², U_B²]; the Hoeffding bound above. All numbers are the paper's computations on synthetic setups.

## 8. Code / data availability
None stated (computations credited to collaborators Gmeiner/Litvin; no public code in the extracted text).

## 9. Leakage & limitations
- **No real data:** every number is from synthetic/illustrative setups; the clinical framing is a vehicle, not an application.
- **Utility normalization:** setting U(A,0)=1, U(A,1)=0 collapses the decision problem to a single threshold — real betting decisions have richer utility (Kelly growth, risk limits, correlation across simultaneous bets) that the threshold rule can't express.
- **Known bounds:** the MMR results need a known interval [p_m, p_M] for the true probability; in sports the "true" probability is unobservable and the interval must itself be estimated (e.g., from market dispersion), reintroducing the uncertainty the theory assumes away.
- **Two-covariate simplification:** the worked examples are low-dimensional; the 50×50 grid computation scales badly to rich feature spaces.
- **Critique of ML metrics is partly strawman:** modern sports modeling already evaluates decisions (CLV, ROI, Kelly growth) — the paper's complaint lands harder on biostatistics than on GSE's actual practice.
- External validity: the math transfers; the clinical numbers don't.

## 10. GSE overlap
Per `existing-research-map.md`, this fills a **named gap**: Gap #1 — "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read." Manski's minimax-regret framework is the decision-theoretic complement to Kelly: where Kelly maximizes expected log-growth assuming known probabilities, MMR minimizes worst-case regret under probability *uncertainty* — exactly GSE's situation when the engine probability and the market price disagree and neither is known to be right. The repo's decision lane (Wang Transform in oracle3, fourth-down WP models) has no plug-in-decision regret analysis. This is a **new capability** (regret-based pick/abstain thresholds), not a duplicate.

## 11. GSE implementation spec
- **Data:** GSE engine backtest: engine probability p̂, market-implied probability q, realized outcomes, and realized P&L per pick, 2020–2025.
- **Adaptation:** frame the publish/bet decision as Manski's binary choice: "bet" (aggressive) vs "pass" (surveillance). Define utility via expected Kelly growth (or realized CLV) rather than clinical welfare; the threshold becomes a function of edge and odds. Compute the *maximum regret* of the current as-if rule (bet iff edge > threshold) over a plausible interval [p_m, p_M] for the true probability — calibrated from historical engine-vs-market disagreement. Use the weighted-estimator logic (Table 1 style) to optimally blend engine and market probabilities before thresholding.
- **Serving:** offline decision-policy design; the output is a published threshold policy + blended-probability weights, refreshed each offseason. No real-time component.
- **Effort:** 2–3 engineer-weeks (backtest harness + regret computation on a grid over the disagreement interval).

## 12. Reproducible test
On 2020–2024 NFL backtest: (a) compute the engine-vs-market disagreement interval per game (e.g., ±1 std of historical engine calibration error around p̂); (b) evaluate the maximum regret of three policies — current as-if threshold, MMR-optimal randomized threshold (paper's q formula adapted), and the regret-optimal blended-probability rule — via Monte Carlo over the interval (20,000 draws, paper's protocol); (c) compare realized 2024 P&L and worst-decile regret across policies. Baseline to beat: the current as-if policy on maximum regret.

## 13. Acceptance / rejection gate
**Adopt** the MMR threshold policy iff, on the 2024 holdout season, it achieves realized P&L ≥ 90% of the current policy's P&L AND its worst-decile (by pre-game disagreement) regret is ≤ 0.7× the current policy's — i.e., it buys robustness without giving up the edge. **Reject** (keep current thresholds) if the MMR policy sacrifices >15% of P&L for its robustness, or if the disagreement interval can't be calibrated tightly enough to make the regret bounds informative (interval width > 0.2 makes the bounds vacuous).

## 14. Improvement experiment
Extend the paper past its binary-decision limit into GSE's real problem: **portfolio regret** — simultaneous correlated bets (spread + total + moneyline on the same game). Formulate the multi-decision minimax-regret problem with a Kelly-growth utility and solve the small-n case (2–3 simultaneous markets) by grid search over the joint disagreement region. Test whether the portfolio-MMR stake vector beats independent per-market Kelly on walk-forward risk-adjusted growth (Sharpe of bankroll). This turns Manski's single-decision theory into the multi-bet decision tool the repo's Gap #1 actually needs.
