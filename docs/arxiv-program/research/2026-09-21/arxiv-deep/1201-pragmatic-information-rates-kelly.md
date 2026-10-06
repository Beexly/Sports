# [1201] Pragmatic Information Rates, Generalizations of the Kelly Criterion, and Financial Market Efficiency (arXiv:0903.2243v4)

**Citation:** Weinberger, E. D. (2009). *Pragmatic Information Rates, Generalizations of the Kelly Criterion, and Financial Market Efficiency*. arXiv:0903.2243v4 [q-fin.GN]. URL: https://arxiv.org/abs/0903.2243
**Ledger completed:** 2026-09-21. **Read:** full text (PDF of v4 via arxiv.org, 23 pages, complete incl. references and Figure 1).
**Verdict:** REJECT — withdrawn by the author (v5, 2026-02-28); self-described as expository ("results presented here are well known in the literature"); the Kelly extension is the standard Cover–Thomas horse-race result and there is no empirical or GSE-applicable content.

## 1. Research question
Can "pragmatic information" (information actually used in a decision, formalized as mutual information between messages and outcomes) be extended to information *rates*, and applied to (1) the Kelly criterion / horse-race log-optimal portfolio with side information and history dependence, and (2) a definition of market efficiency as zero pragmatic information of the "tradable past" with respect to current prices? (Abstract, Introduction)

## 2. Dataset / schema
None — pure theory/exposition. No data, no simulations, no empirical tests.

## 3. Method / model
- Defines pragmatic information I(A;M) = Σ_m Σ_A Pr(A,m) log[Pr(A,m)/(Pr(m)Pr(A))] (eq. 2); proves existence of pragmatic information rates i(α;μ) for stationary processes (Cesaro-sum argument) and quotes the ergodic theorem for mutual information rates (Barron 1985).
- Horse-race Kelly: portfolio S_N = Π b_n^T X_n; doubling rate W_N = E[(log₂S_N)/N]; with track take T (Σ1/R_i = T): optimal doubling rate W*_N = (1/N)Σ_n D(p(n)‖q) − log₂T, attained at b = p(n). With ergodic side-message stream μ(n): the increase in optimal doubling rate equals the pragmatic information of the messages; for general stationary X with side info, ΔW ≤ i(X;μ) (Jensen-bound proof).
- Market efficiency: efficient ⟺ i(P;μ⁻) = h(P) − h(P|μ⁻) = 0, where μ⁻ is the "tradable past". For GARCH(1,1) returns with h(P) = ½log₂(2πeσ₀²) and h(P|μ⁻) = ½log₂(2πeσ_n²), E[i] ≥ 0 with strict inequality by Jensen unless σ_n = R_n = σ₀ a.s. — hence GARCH(1,1) markets "cannot be efficient."
- Noisy Coding Theorem framed as a phase transition in mutual information; bubble run-ups characterized as willful-ignorance lowering of the market's pragmatic channel capacity.

## 4. Equations & assumptions
- Pragmatic info: I(A;M) as eq. 2; wrong-code bounds H(α|μ) + I(α;μ) ≤ E_μ[l(α)] ≤ H(α|μ) + I(α;μ) + 1.
- Horse race: E[log₂Σb_iX_i(n)] = Σ_i p_i(n)log₂(b_iR_i) = D(p‖q) − D(p‖b) − log₂T, optimal at b = p(n) (D(p‖b) ≥ 0).
- Efficiency condition: i(P;μ⁻) = 0; GARCH derivation: E[i] = −½E[log₂{1 + α[(σ_{n−1}/σ₀)²−1] + γ[(R_{n−1}/σ₀)²−1]}] ≥ −½log₂{1} = 0 via Jensen, strict otherwise.
- Assumptions: stationary/ergodic processes; logs base 2; no short sales; track probabilities q_i = 1/(R_iT); GARCH(1,1) with α+β+γ = 1.

## 5. Features / target
N/A — theory. Inputs: message ensemble, outcome ensemble, price process. Target: pragmatic information rate; optimal doubling rate; efficiency verdict.

## 6. Validation design
None — no empirical validation of any kind; the GARCH "proof" is a Jensen-inequality argument, not a test.

## 7. Numerical results / baselines
No numbers anywhere in the paper. All results are inequalities, existence theorems, and limit statements.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **Withdrawn by the author** (v5 withdrawal notice, 2026-02-28) — correctness/evolution of the claims is explicitly disavowed.
- The abstract concedes the Kelly results are "well known in the literature" — this is a reframing paper, not a results paper.
- The GARCH-inefficiency "proof" shows E[i] > 0 under the model's own assumptions (volatility predictability), which is circular as an efficiency test: it assumes a predictable-volatility DGP and concludes predictability exists.
- No connection to sports betting markets, discrete-outcome bookmaker odds, or finite-horizon bankroll growth — the horse-race section assumes the bettor knows p(n) up to side messages, the opposite of GSE's estimation-error problem.

## 10. GSE overlap
None actionable. The mutual-information framing of "value of side information" is conceptually adjacent to GSE's edge measurement, but GSE measures edge via calibration/CLV, not information rates, and this paper offers no implementable estimator. Existing ledgers 0171/0626/0813 cover Kelly practice more directly.

## 11. GSE implementation spec
None.

## 12. Reproducible test
N/A.

## 13. Acceptance / rejection gate
Reject — see verdict.

## 14. Improvement experiment
None warranted for a withdrawn expository paper.
