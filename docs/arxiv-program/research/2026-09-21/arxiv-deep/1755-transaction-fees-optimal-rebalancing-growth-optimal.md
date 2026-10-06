# [1755] Transaction fees and optimal rebalancing in the growth-optimal portfolio (arXiv:1009.3753)

## 1. Citation and full-text-read statement
**Citation:** Yu Feng, Matúš Medo, Liang Zhang, Yi-Cheng Zhang (2010). *Transaction fees and optimal rebalancing in the growth-optimal portfolio*. arXiv:1009.3753. URL: https://arxiv.org/abs/1009.3753
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; fee model Eq. 8 and partial-rebalancing results read in full, simulation sections skimmed).
**Verdict:** ADAPT — one sentence: the partial-rebalancing result (move only ε of the way toward the Kelly stake each week) gives GSE a principled stake-smoothing rule that beats intermittent resizing, but the fee model must be re-mapped from proportional transfer fees to the vig plus stake-churn costs of weekly betting.

## 2. Research question
How do transaction fees change the growth-optimal (Kelly) portfolio, which assumes costless constant rebalancing — and is it better to rebalance intermittently (every T steps) or partially (transfer only a fraction ε of the required amount)?

## 3. Method / model
Invest fraction f of wealth in a risky asset, rest in cash. Binary returns: x(t+1) = x(t)(1+r_1) w.p. 1/2+P_1; x(t)(1−r_1) w.p. 1/2−P_1 (1). Fee: proportional α|X| on transferred volume (argued the only asymptotically relevant fee: sub-linear fees α|X|^β vanish as wealth grows). Rebalancing mechanics with fees derived (Eq. 8): f[W(1+fr)−αX] = fW(1+r)−X, giving transfer X_{r>0} = Wrf(1−f)/(1−αf). Optimal rebalancing period T* found analytically for lognormal returns, generalized numerically to broad distributions and GARCH(1,1). Partial rebalancing: transfer only ε ∈ (0,1] of the required X; T ≈ 1/ε heuristic.

## 4. Mathematics / equations / assumptions
- Binary return model (1); Kelly fraction f* from maximizing expected log growth (standard).
- Fee-inclusive rebalancing condition (8); transfer volume X_{r>0} = Wrf(1−f)/(1−αf); no transfer needed when r<0 side analog.
- Optimal T* analytic for lognormal (formula in §4); interior optimum: fees make T*>1.
- Partial rebalancing: transfer εX per step; optimal ε interior in (0,1) (Fig. 7); "optimal growth rates are achieved for ε inside (0,1]… outperform the optimal values obtained with intermittent rebalancing for both studied values of α."
- Assumptions: stationary returns with finite variance; proportional fees; single risky asset + cash; discrete-time rebalancing.

## 5. Dataset / schema
Simulated: binary-return asset (Eq. 1), lognormal returns (analytic), broad stationary distributions, and GARCH(1,1)-generated returns (correlated). No real-market data.
## 6. Features and target
Inputs: return distribution, fee rate α, rebalancing period T or partial parameter ε. Target: long-run growth rate (expected log wealth per step).

## 7. Validation design
Numerical simulation across return distributions; analytic check for lognormal; GARCH(1,1) for correlated returns.

## 8. Exact results and baselines with numbers
No single headline number extracted (results in figures: growth rate vs T and vs ε curves). Qualitative exact claims: interior-optimal T*>1 under fees; interior-optimal ε beats optimal-T intermittent rebalancing at both fee levels studied; GARCH(1,1) shows the same pattern with correlated returns.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Fee = proportional transfer fee, not the vig (which is a per-bet cost on turnover, closer to a fixed cost per wager than a rebalancing transfer fee); single asset (no portfolio); simulation-only validation; the ε result is numerical, not analytic; GARCH(1,1) is the only correlated-returns check; no estimation error in f.

## 11. GSE overlap
GSE's sizer (1744/1746) recomputes Kelly stakes from the current bankroll — implicitly full rebalancing every week, which whipsaws stakes after wins/losses (stake churn). This paper says that's growth-suboptimal under frictions: better to move only ε of the way toward the new Kelly stake (damped updates), which beats resizing every T weeks. The vig (−110 ≈ 4.55%) is GSE's "fee" — every bet pays it, so stake churn has a real cost. Per the existing-research map, GSE has no stake-smoothing rule. New capability: a damped stake-update rule with an empirically tuned ε.

## 12. Implementation specification
Build "ε-damped stake updates": (a) each week compute the target Kelly stake vector s*_t from the sizer; (b) actual stakes s_t = s_{t−1} + ε(s*_t − s_{t−1}) with ε ∈ (0,1] (ε=1 recovers current behavior); (c) tune ε by backtest grid ε ∈ {0.2, 0.4, 0.6, 0.8, 1.0} maximizing terminal log growth net of vig; (d) also test intermittent variant (resize every T weeks, T ∈ {1,2,4}) to replicate the paper's horse race. Effort: ~0.5 day (one-line change + grid search).

## 13. Reproducible test
Dataset: 2023–2025 NFL backtest of the 1744/1746 sizer. Compare: full weekly rebalancing (ε=1) vs ε-damped (tuned) vs intermittent-T (tuned), all net of vig. Metrics: terminal log growth, stake-turnover (sum |Δs|), max drawdown. The paper predicts interior-optimal ε wins on growth; verify on real weekly data.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT ε-damping if the tuned ε<1 beats ε=1 on net terminal log growth by ≥ 2% annualized in the backtest; REJECT if ε=1 wins (frictions too small to matter at weekly frequency). Improvement experiment: make ε state-dependent — ε_t larger when the Kelly signal is strong (high edge, low σ per 1748) and smaller when noisy; test whether adaptive-ε beats fixed-ε. This fuses the paper's smoothing with the estimation-error gate.

**Verdict:** ADAPT — partial (ε-damped) stake rebalancing is a cheap, directly testable upgrade to GSE's weekly Kelly resizing, but the vig-as-fee mapping and the optimal ε must be calibrated on real backtest data.
