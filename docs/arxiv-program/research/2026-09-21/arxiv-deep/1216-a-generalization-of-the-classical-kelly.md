# [1216] A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation (arXiv:2003.02743)

**Citation:** Joseph D. O'Brien, Kevin Burke, Mark E. Burke, B. Ross Barmish (2020). *A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation*. arXiv:2003.02743. URL: https://arxiv.org/abs/2003.02743
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — use the correlation-aware Kelly fraction for GSE's sequential edges (streaks/momentum in team strength and line value), estimating the correlation parameters strictly out-of-sample with the paper's constrained least-squares procedure.

## 1. Research question
The paper asks how the classical Kelly formula changes when bet outcomes are temporally correlated rather than independent: what is the optimal constant fraction over a finite horizon of n correlated even-money bets, how does it differ from the classical 2p−1, and how much expected log growth is gained by accounting for correlation (including a fully time-varying fraction)?

## 2. Dataset / schema
No empirical dataset. Illustrative Markov-chain example with memory depth 1: P(X_k = 1 | X_{k−1}) = ω0 + ω1·X_{k−1}, with the worked example x_{−1} = 1, ω0 = 0.55, ω1 = 0.20, n = 2. Parameter estimation is discussed via constrained least squares on observed sequences (no real data used).

## 3. Method / model
Model the win/loss sequence as a Markov chain of memory depth m (depth 1 worked in closed form; higher memory via a state-space recursion). Derive the optimal finite-horizon constant Kelly fraction K_n and the optimal time-varying fractions K̃_k. Estimate (ω0, ω1) by constrained least squares. Compare expected log growth (ELG) of: classical Kelly (ignores correlation), correlation-aware constant fraction, and correlation-aware time-varying fractions.

## 4. Equations & assumptions
- Memory-1 model: P(X_k = 1 | X_{k−1}) = ω0 + ω1·X_{k−1}
- Optimal constant fraction: K_n = 2·(E[H_n]/n) − 1, where H_n counts wins in n trials
- E[H_n]/n = λ_n·p0 + (1 − λ_n)·p_∞, with p0 = ω0 + ω1·x_{−1}, p_∞ = (ω0 − ω1)/(1 − 2·ω1), λ_n = (1/n)·(1 − (2·ω1)^n)/(1 − 2·ω1)
- Time-varying fractions: K̃_k = 2·p_k − 1; the constant K_n is their average
Assumptions: binary even-money outcomes, stationary Markov dependence of known memory depth, known (or consistently estimated) transition parameters, log utility.

## 5. Features / target
Inputs: outcome history (to estimate ω0, ω1) and horizon n. Target: optimal stake fraction (constant K_n or time-varying K̃_k).

## 6. Validation design
Analytic derivation plus the numerical example. Parameter estimation sketched (constrained least squares) but not validated on real data. No train/test split, no out-of-sample test — the ELG comparisons are computed under the assumed true model.

## 7. Numerical results / baselines
Quoted exactly from the paper's example (x_{−1} = 1, ω0 = 0.55, ω1 = 0.20, n = 2):
- Classical Kelly ELG ≈ 0.053
- Correlation-aware constant-fraction ELG ≈ 0.082
- Time-varying fraction ELG ≈ 0.088
Interpretation (mine): accounting for correlation gains ~55% more ELG than classical Kelly in this example; time-varying adds a further ~7% over the constant version.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
The ELG gains are computed under the true model — with estimated (ω0, ω1), gains shrink and estimation error can flip the sign of the adjustment. No guidance on choosing memory depth m from data (overfitting risk). Binary even-money structure does not directly cover American-odds sports bets; the mapping to general payoffs is not derived. Sports "correlation" here means autocorrelation of outcomes/edges across time (e.g., a team's form streak), which is weaker and less stationary than the paper's fixed Markov chain.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads; GSE's `apps/web/lib/staking/kelly-investigation.ts` assumes each bet is an independent trial — it has no temporal-correlation adjustment. If GSE's edges exhibit autocorrelation (e.g., model mispricing that persists across weeks for the same team, or streaky calibration residuals), this paper supplies the missing adjustment: a new capability, not a duplicate.

## 11. GSE implementation spec
1. Test for edge autocorrelation: on GSE backtest data, estimate lag-1 autocorrelation of per-pick realized edge (outcome − implied prob residual) by team and by market. If significant, fit the paper's memory-1 (or memory-m state-space) model per team/market with constrained least squares on a rolling window. Effort: M.
2. Implement correlation-aware sizing: scale the Kelly fraction by the paper's K_n / (2p−1) adjustment factor, or use time-varying K̃_k = 2p_k − 1 with p_k from the Markov update — gated behind the existing fractional cap. Effort: M.
3. Guardrail: if the autocorrelation estimate is not significant at 95% on the trailing window, fall back to classical Kelly (avoid fitting noise). Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks with timestamps, team IDs, and realized outcomes. Metric: realized log-bankroll growth of (a) current independent-trial sizing vs. (b) correlation-aware sizing, with parameters estimated only on data before each bet (strict rolling out-of-sample). Baseline: (a). Window fixed in advance.

## 13. Acceptance / rejection gate
ADOPT correlation-aware sizing if the autocorrelation is statistically significant in at least one major market AND the sizing beats baseline realized log growth by ≥ 3% on the held-out window. REJECT otherwise (independence assumption stands).

## 14. Improvement experiment
Beyond the paper: replace the fixed-memory Markov chain with a Bayesian regime-switching model where correlation parameters themselves evolve (e.g., coaching changes break streaks), and size using posterior-predictive p_k. Hypothesis: regime-aware correlation sizing beats fixed-parameter sizing when team strength is nonstationary.
