# [1208] Weighted entropy and optimal portfolios for risk-averse Kelly investment (arXiv:1708.03813v1)

**Citation:** Kelbert, M., Stuhl, I., & Suhov, Y. (2017). *Weighted entropy and optimal portfolios for risk-averse Kelly investments*. arXiv:1708.03813v1 [math.PR]. URL: https://arxiv.org/abs/1708.03813
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 25 pp; Theorems 1.1, 2.1, 3.1, 3.2, 4.1, 4.2 and Examples 1.1–4.3 read in full).
**Verdict:** ADAPT — weighted-entropy generalization of Kelly with a no-ruin constraint yields three GSE-portable results: (1) state-dependent (Markov-regime) proportional Kelly fractions via an explicit fixed-point equation, (2) a formal abstention/sit-out rule (D=0 when no positive balance solution), and (3) outcome weighting ϕ for prioritizing high-value slates.

## 1. Research question
For log-optimal investment under a risk-averse no-ruin constraint, when the objective is a *weighted* log-growth (weights ϕ assign utility to different outcomes), what is the optimal strategy — and does proportional betting survive the weighting? (Sec. 1)

## 2. Dataset / schema
None — probability-theoretic finance. Worked examples: IID binary (Kelly recovery), two-state Markov chain, two-asset IID, uniform/Gaussian IID with piecewise-linear returns.

## 3. Method / model
- Setup: Markov trials ε_n with transition p(i,k); return function g(i,k); weight function ϕ(i,k)≥0; stake C_j with recursion Z_j = Z_{j−1}(1 + C_{j−1}g/Z_{j−1}) (eq. 1); objective ES_n, S_n = Σ ϕ(ε_{j−1},ε_j) ln(Z_j/Z_{j−1}) (eq. 2).
- Strategy class (eq. 6): predictable (a0), sustainable 0≤C_j<Z_j (a1), no-ruin 1+C_jg/Z_j ≥ b (a2), weighted (q,g)-balance (a3).
- Theorem 1.1: (a) S_n − A_n is a supermartingale for cumulative weighted KL entropy A_n (Gibbs inequality for weighted entropy, eq. 11); (b) equality (martingale) ⟺ proportional betting C_{j−1} = D(ε_{j−1})Z_{j−1} with D solving the WE-balance equation D(i)·Σ_l p(i,l)ϕ(i,l)g(i,l)/(1+D(i)g(i,l)) = 0 (eq. 8, alternatives i3A/i3B); (c) D^O(i) = positive root if feasible else 0; (d) if D^O>0 everywhere, optimality holds over the full (a0)–(a2) class.
- Theorems 2.1/3.1/3.2/4.1/4.2: same structure with a riskless asset (Scheme II), K risky assets (vector D, concave maximization, eqs. 34–49), and fully general discrete-time trials.
- Example 1.1 (IID binary, g(1)=−g(0)=γ): D^O = (p(1)−p(0))/γ if b≤p(0)≤p(1), γ≥p(1)−p(0), else 0 (eq. 17) — Kelly with an explicit sit-out rule.
- Example 1.2 (two-state Markov): state-dependent D^O(i) = (p(i,1)−p(i,0))/γ per current state i (eq. 18) — regime-conditional Kelly fractions.
- Example 4.2 (Gaussian): if Eϕ(ε₁)g(ε₁) ≤ 0 → D^O = 0 (cautious trader sits out); else D₀ capped by D₊ from no-ruin.

## 4. Equations & assumptions
- Objective: ES_n = EΣϕ ln(1+Cg/Z) (eq. 2); balance: Σ_l ϕ(i,l)p(i,l)g(i,l)/(1+D(i)g(i,l)) = 0 (eq. 8/i3A); optimal C = D(i)Z.
- Binary Kelly: D^O = (p(1)−p(0))/γ (eq. 17); Markov: D^O(i) = (p(i,1)−p(i,0))/γ (eq. 18); multi-asset: ∇β(D⁰)=0 with concave β (eq. 48–49).
- Assumptions: known transition laws p (estimated from history in practice); returns g bounded below a.s. (Remark 4.1); b>0 fixed; weight ϕ fixed ex ante (Remark 1.4: g and ϕ can themselves be optimized).

## 5. Features / target
N/A analytic. Inputs: state i (Markov regime), outcome weights ϕ, no-ruin floor b. Output: proportional stake D(i) ∈ [0,1) or 0 (abstain).

## 6. Validation design
Proof-based (supermartingale/Gibbs); concavity of each β_{j−1} in d(i) (negative-definite Hessian) guarantees the fixed point is the global maximizer.

## 7. Numerical results / baselines
No empirical numbers — theorem paper. Qualitative: D^O=0 (sit out) is the modal recommendation when the outlook is unfavorable; the binary example quantifies exactly when.

## 8. Code / data availability
None; the fixed-point equation is one-dimensional per state and trivially solvable numerically.

## 9. Leakage & limitations
- No data/estimation: p, g, ϕ assumed known; GSE must plug engine-estimated probabilities (estimation error unaddressed — pairs with ledger 0626's uncertainty treatment).
- The (q,g)-balance condition (a3) is restrictive; the "no formal answer" case (D₀ > D₊, Example 4.1) leaves the optimum unidentified under tight ruin constraints.
- Continuous-time extension explicitly deferred as future work.

## 10. GSE overlap
- New to corpus: no existing ledger covers (a) Markov state-dependent Kelly fractions, (b) a formal abstention rule derived from the sizing objective itself, or (c) outcome-weighted log-growth. Ledgers 0171/0626/0813/1200 cover static/fractional/uncertain Kelly only. Directly serves the thin "pick selection/abstention" lane.

## 11. GSE implementation spec
1. Define a small observable state space (e.g., market regime × slate liquidity tier, or weather/injury flags) with engine-estimated transition/conditional win probabilities p(i,·).
2. Per state i, solve Σ_l ϕ(i,l)p(i,l)g(i,l)/(1+D(i)g(i,l)) = 0 for D(i) (1-D root find); if no root in [0,D₊] → D(i)=0 = formal sit-out for that state.
3. Choose weights ϕ: ϕ=1 default; up-weight high-liquidity/high-confidence slates (e.g., ϕ ∝ expected CLV or playoff-week weight).
4. Set no-ruin floor b (e.g., b=0.8 → never risk more than 20% of bankroll on one slate's worst case); cap D(i) ≤ D₊ = (1−b)/max-loss.
5. Multi-pick slates: use the vector version (Theorem 3.1) — maximize concave β(D) over the feasible polygon; sit out picks whose gradient component ≤ 0.

## 12. Reproducible test
Backtest 2024–2025 NFL with a 2–4 state regime model: compare (a) flat fractional Kelly vs (b) state-dependent D(i) with sit-out states, ϕ=1 and ϕ=CLV-weighted. Accept if (b) matches or beats (a) on log-bankroll growth with strictly fewer losing slates played and no worse max drawdown; the abstention rule must fire (D=0) on at least 5% of historical slates to be non-vacuous.

## 13. Acceptance / rejection gate
ADAPT with the gate in §12. If state estimation is too noisy to beat flat Kelly, keep only the sit-out rule (single-state version, eq. 17) as the abstention criterion.

## 14. Improvement experiment
Estimate p(i,·) with Bayesian shrinkage toward the marginal (addressing the paper's known-probability assumption via 0626-style uncertainty), and optimize ϕ itself (Remark 1.4) — e.g., learn slate weights that maximize out-of-sample risk-adjusted growth.
