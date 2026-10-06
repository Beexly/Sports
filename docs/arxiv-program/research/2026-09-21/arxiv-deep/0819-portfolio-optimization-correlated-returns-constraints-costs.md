# [0819] Portfolio Optimization with Correlated Returns under Constraints, Transaction Costs and Different Borrow/Lend Rates (arXiv:1410.8042)

**Citation:** Vladimir Dombrovskii, Tatyana Obedko (2014). *Portfolio Optimization in the Financial Market with Correlated Returns under Constraints, Transaction Costs and Different Rates for Borrowing and Lending*. arXiv:1410.8042. URL: https://arxiv.org/abs/1410.8042
**Ledger completed:** 2026-09-21. **Read:** full text (fetched PDF https://arxiv.org/pdf/1410.8042, 8 pages, read in full via pdftotext; local cache held only the abstract page).
**Verdict:** ADAPT — the model-predictive-control (MPC) formulation for allocating across simultaneous positions under position limits, quadratic transaction costs, and a target growth trajectory maps to GSE's slate-level staking problem (multiple correlated picks per week, bankroll growth target, vig as transaction cost); but the paper's own results are figure-only with zero exact numbers, so the adaptation is structural, not empirical.

## 1. Research question
How to dynamically allocate wealth across n risky assets + a risk-free asset (+ borrowing) when returns are serially correlated, under hard position constraints, quadratic transaction costs, and different borrowing vs lending rates — without assuming any return distribution or correlation structure? The problem is posed as dynamic tracking of a deterministic reference (benchmark) portfolio with a desired growth rate.

## 2. Dataset / schema
Russian Stock Exchange MICEX daily prices (via finam.ru): Sberbank, Gazprom, VTB, LUKOIL, NorNickel, Rosneft, Sibneft; 5-asset portfolios over ~1,500 trading days (~4 years); the illustrated experiment runs 20.07.2007–11.09.2014 (~6 years). Risk-free: bank account with r₁=0.0001 (lending), r₂=0.0002 (borrowing) per day. Predictor: VAR(2) on returns, OLS-estimated on trailing 200-day windows, plus a 2-day-window sample-mean modification to capture short-run trends.

## 3. Method / model
MPC (receding horizon): at each day k, solve for predictive trades u(k+i/k), i=0..m−1 (m=10) minimizing criterion (8): (1) conditional MSE between portfolio value and reference portfolio V⁰(k+1)=(1+μ₀)V⁰(k), μ₀=0.0015/day target; (2) penalty on wealth below desired value (ρ(k,i)=0.1 weight); (3) quadratic transaction costs [u(k+i/k)−u(k+i−1/k)]'R(k,i)[u(k+i/k)−u(k+i−1/k)], R=diag(10⁻⁴,…,10⁻⁴) — linear price impact. Constraints: borrowing cap u_{n+1} ≤ u_{n+1}^{max}; short-sale bounds |u_i^{min}|, long-sale caps u_i^{max}; parametrized as βᵢV(k), γᵢV(k) with βᵢ=−0.6, γᵢ=3 (short selling and leverage allowed). Returns η(k) assumed only to be a serially correlated non-stationary multivariate process with finite conditional moments E[η(k+i)|F_k], E[η(k+i)η(k+j)'|F_k]=Θ_{ij}(k) — no distribution, no correlation-structure assumptions. Reduces to a quadratic program solved with MATLAB quadprog; only the first control u(k/k) is applied, then re-solved daily.

## 4. Equations & assumptions
Reference: V⁰(k+1) = (1+μ₀)V⁰(k), μ₀=0.0015 (Eq. 7). Criterion J(k+m/k) = E{[V(k+m)−V⁰(k+m)]²/F_k} + shortfall penalty + transaction-cost term (Eq. 8). Predictor: η(k+1) = ν + A₁η(k) + A₂η(k−1) + ω(k+1), E[ω]=0 (VAR(2)). QP form: Y(k+m/k) = [2V(k)G(k) − F(k)]U(k) + U(k)'[H(k)+R(k)]U(k) under linear constraints (19).
Assumptions (stated): finite conditional first/second moments; positive-definite transaction-cost matrices R(k,i)>0; VAR(2) is an adequate return predictor (authors admit forecasting is "too large a topic" and sensitivity analysis is out of scope). Position bounds proportional to wealth.

## 5. Features / target
Features: predicted conditional means and second moments of returns over horizon m from the VAR(2). Target: trade vector minimizing tracking error to the reference growth path. Horizon: m=10 days predictive, applied daily.

## 6. Validation design
Single in-sample-style demonstration on MICEX data; VAR(2) estimated on 200 days prior to the tracking period then held fixed ("considered constant along the entire period" — a weakness). No train/test split, no competing baseline, no statistical tests. Results are Figures 1–3 only: (1) tracking vs reference portfolio values ("smooth curve of growth" close to benchmark); (2) Gazprom position path; (3) Gazprom returns. No numeric performance metrics anywhere.

## 7. Numerical results / baselines
No exact numbers reported — all results are figure-only. Claimed qualitatively: the tracking strategy produces a smooth wealth-growth curve following the deterministic benchmark (0.15%/day target) over 2007–2014 across combinations of the five assets. Parameter values used: μ₀=0.0015, V(0)=1, R(k,i)=diag(10⁻⁴), ρ=0.1, βᵢ=−0.6, γᵢ=3, m=10. These parameter choices are asserted, not optimized or justified. Treat the empirical contribution as a proof-of-concept illustration, not evidence.

## 8. Code / data availability
No code. Data: MICEX via finam.ru (public historical prices). Method reproducible from the equations with any QP solver (quadprog / cvxpy / OSQP).

## 9. Leakage & limitations
- Zero quantitative results: no returns, no Sharpe, no tracking-error statistics, no baseline comparison — the "tested on real data" claim rests on three figures.
- VAR(2) parameters frozen for 6 years after a 200-day fit; the authors note trending behavior violates VAR assumptions and patch it with an ad hoc 2-day mean.
- Hyperparameters (μ₀, ρ, R, β, γ, m) are set by hand with no sensitivity analysis (explicitly out of scope).
- Equities with daily rebalancing; sports slates are weekly with simultaneous correlated outcomes — the correlation structure (same-game / same-team picks) is actually better suited to this framework than equities, but the paper doesn't go there.
- Borrowing/shorting machinery has no sportsbook analog (no leverage, no shorting); only the long-only constrained version transfers.

## 10. GSE overlap
Existing-research map: portfolio optimization appears (Markowitz 10×, WP 1710.00431 Kelly-decoupled is the next assigned paper), MPC appears nowhere, transaction-cost-aware staking appears nowhere. The distinct contribution: receding-horizon stake allocation across a *slate* of simultaneous picks with a bankroll growth target and per-pick position caps. Connects to sizing lane (Kelly papers 0813/0816) — this is the multi-pick generalization Kelly alone doesn't handle (correlated simultaneous bets).

## 11. GSE implementation spec
Adaptation: "slate MPC staker." Each week, GSE has K simultaneous picks with engine win probabilities p̂_k, market prices, and a correlation structure (same-game picks correlated; divisional games weakly). Solve a QP: minimize E[(bankroll − target path)²] + λ·shortfall penalty + vig term, subject to 0 ≤ stake_k ≤ cap·bankroll, Σ stakes ≤ max_exposure·bankroll. Target path: (1+μ₀) per week with μ₀ set from the engine's historical weekly growth. Correlations from historical joint outcomes of same-slate picks. Re-solve weekly (receding horizon m=4 weeks). This generalizes flat Kelly (which ignores cross-pick correlation and the growth-path target). Effort: ~4–6 days (correlation estimation + QP + backtest harness).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks) grouped by weekly slate; joint outcome history for correlation. Protocol: walk-forward 2024→2025; each week solve the slate QP with p̂ from the engine and correlation from trailing 2 seasons; compare bankroll growth vs (a) flat stakes, (b) independent capped Kelly per pick. Metric: log-bankroll growth, max drawdown, Calmar. Baseline: independent Kelly.

## 13. Acceptance / rejection gate
ADAPT if the slate-MPC staker beats independent capped Kelly on 2025-holdout log-bankroll growth with max drawdown no worse, demonstrating that cross-pick correlation handling adds value — else the added complexity is rejected and GSE stays with per-pick Kelly caps.

## 14. Improvement experiment
Two extensions: (1) Replace the paper's frozen VAR(2)-style correlation with a learned same-game correlation model (e.g., spread+total pick pairs on the same game are negatively/positively correlated depending on side) — estimate empirically from the picks DB and test whether learned vs constant correlation changes allocations. (2) Add the paper's shortfall-penalty term explicitly as a drawdown-aversion knob and tune it against the CED framework from ledger 0818 — unifying the MPC staker with the drawdown-risk budget.
