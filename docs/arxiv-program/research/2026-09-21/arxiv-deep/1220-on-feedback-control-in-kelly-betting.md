# [1220] On Feedback Control in Kelly Betting: An Approximation Approach (arXiv:2004.14048)

**Citation:** Chung-Han Hsieh (2020). *On Feedback Control in Kelly Betting: An Approximation Approach*. arXiv:2004.14048. URL: https://arxiv.org/abs/2004.14048
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — never serve the Taylor closed form directly (ledger 1210 shows why), but adopt the paper's survival-interval math as hard guardrails: saturate any approximate fraction into (−1/Xmax, 1/|Xmin|), and use the closed-form expected-gain/variance formulas for fast pre-trade risk estimates.

## 1. Research question
The paper asks what can be said analytically about the popular Taylor-based approximation to Kelly betting: given the quadratic approximation of expected log growth with closed-form optimum K*_approx = E[X]/E[X²], what are its best achievable performance, its expected cumulative gain/loss and variance in closed form, when does it violate no-bankruptcy (survivability), and how far can it be from the true optimum?

## 2. Dataset / schema
No empirical dataset. Worked coin-flip example: X(k) = −0.9 with probability 0.05, X(k) = 0.2 with probability 0.95. All other results are analytic.

## 3. Method / model
Replace g(K) = E[log(1+KX(0))] with its second-order Taylor expansion around K = 0: K·E[X(0)] − (1/2)K²·E[X²(0)], solve the quadratic program in closed form, then analyze the approximate optimum's properties: Jensen-based upper bound on its true expected log growth, closed-form mean and variance of cumulative gain/loss, closed-form variance of log growth, and a Jensen-based upper bound on the gap g(K*) − g(K*_approx). Propose a saturation function to force the approximation back into the survival interval.

## 4. Equations & assumptions
- Approximation: E[log(1+KX(0))] ≈ K·E[X(0)] − (1/2)·K²·E[X²(0)]
- K*_approx = E[X(0)]/E[X²(0)] = μ/(μ²+σ²); alternative Merton form K̃_approx = μ/σ²
- Survival (Lemma 1): V(k) > 0 for all k and all paths iff −1/Xmax < K < 1/|Xmin|
- Saturation: K*_sat,s := SAT_s[K*_approx], clamping into [−1/Xmax, 1/|Xmin|]
- Theorem 2 (cash-financed, K ∈ [−1,1], −1<Xmin<0<Xmax<1): K* = 1 iff E[1/(1+X(0))] ≤ 1; K* = −1 iff E[1/(1−X(0))] ≤ 1
- Lemma 3: g(K*_approx) ≤ log(1 + μ²/(μ²+σ²)) ≤ log 2
- Lemma 4: G_K(N) = ((1+Kμ)^N − 1)·V(0); at K*_approx: ((1+μ²/(μ²+σ²))^N − 1)·V(0)
- Corollary 5 / Theorem 6: G_{K*_approx}(N) ≥ 0 for all N ≥ 1 (> 0 if μ ≠ 0), non-decreasing in N
- Lemma 7: var(G_K(N)) = ((μ_K²+σ_K²)^N − μ_K^{2N})·V²(0), μ_K = 1+Kμ, σ_K = Kσ
- Lemma 8: var(log(V(N)/V(0))) = N·(E[log²(1+KX(0))] − g²(K))
- Proposition 9: 0 ≤ g(K*) − g(K*_approx) ≤ log E[(1+K*X(0))/(1+K*_approx·X(0))]
Assumptions: i.i.d. bounded returns, log utility; the approximation analysis additionally assumes the quadratic is a good local fit (which the paper itself shows can fail).

## 5. Features / target
Inputs: return mean μ, variance σ², and bounds Xmin/Xmax. Target: approximate optimal fraction and its performance statistics.

## 6. Validation design
Analytic proofs plus the coin-flip counterexample. No empirical validation, no train/test split. The counterexample is the validation: it demonstrates the approximation can recommend a ruinous fraction.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Coin example (X = −0.9 w.p. 0.05, 0.2 w.p. 0.95): K*_approx ≈ 1.84, which lies outside the survival interval (−5, 1.111); worst-case path gives V(1) = 1 + 1.84·(−0.9) ≈ −0.656 < 0 — single-stage ruin with probability 0.05.
- Lemma 3 bound is tight: with σ² = 0 and riskless rate r > 0, K*_approx = 1/r and g = log 2.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage. The paper's own message is cautionary: the closed form it analyzes is the same family of approximation that ledger 1210 (1710.01787) shows producing negative growth on realistic gambles. The survival interval requires knowing Xmax/Xmin — for sports with American odds these are known per bet, but for open-ended portfolios they must be estimated. The saturation fix guarantees no bankruptcy but does not guarantee good growth. Sample-mean/sample-variance estimation of μ, σ² is mentioned only via SLLN asymptotics — no finite-sample analysis.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads. GSE's `apps/web/lib/staking/kelly-investigation.ts` currently computes exact single-bet Kelly — this paper governs what happens if GSE ever adds fast approximate sizing (e.g., a μ/σ² heuristic for multi-pick slates): the survival interval becomes a mandatory guardrail. The closed-form variance formulas (Lemmas 7–8) are new capability for pre-trade risk display. Extension, not duplicate.

## 11. GSE implementation spec
1. Add a `survivalClamp` to the staking lib: any stake fraction (exact or approximate) is hard-clamped into (−1/Xmax, 1/|Xmin|) computed from the bet's worst-case return before it can be served — the paper's SAT_s as a safety invariant with a unit test on the coin example (assert V(1) > 0 on the worst path). Effort: S.
2. Use Lemma 4/7/8 closed forms to display expected cumulative gain and its standard deviation for a candidate stake in the internal staking dashboard (fast, no simulation). Effort: S.
3. Proposition 9's gap bound as a monitoring metric: if the served fraction ever comes from an approximation, log the bound; alert if it exceeds a threshold. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks. Metric: (a) fraction of historical stakes that the survival clamp would have modified (should be ~0 for current exact sizing — a regression check), (b) calibration of the Lemma-7 predicted std-dev of cumulative gain vs. realized std-dev across bootstrap resamples of the season. Baseline: none (invariant + calibration check).

## 13. Acceptance / rejection gate
ADOPT the survival clamp if it modifies 0% of current production stakes (pure safety net, no behavior change) and the coin-example unit test passes. ADOPT the dashboard risk display if predicted vs. realized std-dev agree within 20%. REJECT either component otherwise.

## 14. Improvement experiment
Beyond the paper: replace the fixed Xmin/Xmax bounds with distributional bounds from GSE's calibrated outcome model (e.g., 99.9% worst-case return), making the survival interval adaptive to the actual risk of each market. Hypothesis: adaptive bounds are tighter (allow larger justified stakes) while preserving the no-bankruptcy guarantee.
