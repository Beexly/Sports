# [1204] Kelly criterion for variable pay-off (arXiv:1411.3615v1)

**Citation:** Pérez Marco, R. (2014). *Kelly criterion for variable pay-off*. arXiv:1411.3615v1 [math.PR]. URL: https://arxiv.org/abs/1411.3615
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 5-page note, complete incl. references).
**Verdict:** REJECT — a clean 5-page theory note whose single result (variable-payoff Kelly fraction ≤ constant-average-payoff Kelly fraction) has no GSE application: NFL spread/moneyline/total markets have fixed known decimal odds at bet time, and the conservatism principle is already covered by existing ledgers 0171/0626/0813.

## 1. Research question
How does the Kelly-optimal fraction change when the pay-off b is not constant but a random variable with known distribution ρ (motivated by poker cash games and trading where "the pay-off is variable")? (Sec. 1, 3)

## 2. Dataset / schema
None — pure theory note. No empirical data, no simulations. The Pareto-tail remark cites the author's own arXiv:1409.4857 as a model; no data analyzed.

## 3. Method / model
Analytical derivation only: maximize expected exponential growth rate g(f) = q·log(1−f) + p·∫₀^∞ log(1+bf)·ρ(b)db over f ∈ [0,1]; prove unique maximizer via strict concavity; apply Jensen's inequality to the concave h(b) = b/(1+bf̂) to compare with the constant-payoff Kelly fraction.

## 4. Equations & assumptions
- Classical Kelly (Theorem 2.1): f*(p,b) = p − q/b = [p(1+b) − 1]/b, derived from g(f) = p·log(1+bf) + (1−p)·log(1−f), g′(f) = [(p(1+b)−1) − fb]/[(1+fb)(1−f)].
- Favorability with variable pay-off: p(1 + ∫₀^∞ b·ρ(b)db) > 1 (eq. 1) — identical to the constant-payoff condition with average pay-off b̄.
- **Fundamental integral equation** (Theorem 3.1): f̂(p,ρ) is the unique solution of ∫₀^∞ [b·ρ(b)/(1+bf̂)]db − (1−p)/[p(1−f̂)] = 0 (eq. 2).
- **Corollary 3.2:** f̂(p,ρ) ≤ f*(p,b̄) with b̄ = ∫bρ(b)db; equality iff pay-off is constant (Dirac ρ), by Jensen on h(b) = b/(1+bf̂).
- Assumptions: p constant across rounds; ρ known, non-negative, integral finite; no minimum bet unit; no leverage (remark notes Thorp's extension to leveraged risk).

## 5. Features / target
N/A — analytical result. Inputs: win probability p, pay-off distribution ρ. Target: optimal fraction f̂.

## 6. Validation design
None — no numerical verification, no baselines, no worked examples.

## 7. Numerical results / baselines
No numbers. The only quantitative content is the inequality f̂ ≤ f*(p,b̄) and the integral equation.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Assumes the full pay-off distribution ρ is *known* — in the motivating applications (poker, trading) it is estimated, reintroducing exactly the estimation-error problem this note sidesteps (compare ledger 0626, which handles parameter uncertainty directly).
- No treatment of correlated rounds, time-varying p, or transaction costs.
- External validity to GSE: zero — GSE's bet types (SPREAD/MONEYLINE/TOTAL) have contractually fixed decimal odds known before the bet; pay-off is never a random variable at decision time.

## 10. GSE overlap
Subsumed: existing ledgers 0171 (ADOPT — practical Kelly review incl. fractional/robust variants), 0626 (ADAPT — Kelly under probability uncertainty), 0813 (ADAPT — diversification/limited-info Kelly) already establish conservative, uncertainty-aware Kelly sizing as GSE's protocol. This note adds only the Jensen inequality formalizing "uncertain pay-off ⇒ shade down" — a one-line corollary of principles already adopted.

## 11. GSE implementation spec
None — nothing to build beyond existing Kelly protocol.

## 12. Reproducible test
N/A.

## 13. Acceptance / rejection gate
Reject — see verdict.

## 14. Improvement experiment
If variable pay-offs ever enter GSE (e.g., cash-out values in live betting), the integral equation (2) would be the sizing primitive — but that is a speculative future lane, not current GSE.
