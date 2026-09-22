# [2144] On Risk-Sensitive Decision Making Under Uncertainty (arXiv:2404.13371)

**Citation:** Chung-Han Hsieh, Yi-Shan Wong (2024). *On Risk-Sensitive Decision Making Under Uncertainty*. arXiv:2404.13371. URL: https://arxiv.org/abs/2404.13371
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* gives a variance-penalized Kelly objective with a single risk-aversion knob ρ, directly implementable as GSE's stake-sizing rule; at ρ=0 it reduces exactly to classical Kelly, and the paper's necessary-optimality conditions provide the sizing formula.

## 1. Research question
How should a decision-maker allocate a fraction of accumulated capital across m alternatives (one deterministic/riskless, m−1 stochastic) over a fixed number of stages N, when the objective must balance expected logarithmic growth (Kelly-style) against the *variance* of logarithmic growth? The paper formulates this as a stochastic control problem, derives necessary KKT optimality conditions for the allocation vector K, and illustrates with optimal-betting and inventory examples how the risk-aversion constant ρ shrinks the Kelly allocation.

## 2. Dataset / schema
No real datasets — two synthetic illustrative examples:
- **Optimal betting:** two alternatives: riskless X_1(k)=0 w.p.1; risky X_2(k)∈{−1/2,+1/2} with P(X_2=+1/2)=p∈(1/2,3/4).
- **Retail inventory:** two product categories, K_1+K_2=1 proportions of I_max=1000 units; demand X_2(k)∼Uniform(−1, X_max), X_1(k)=0 w.p.1; decision period n∈{1,5,10}.
Both are closed-form/analytic illustrations, not empirical validations on data.

## 3. Method / model
- **Setup:** stages k=0…N−1; feedback gain K_i(k)∈[0,1] = fraction of account V(k) allocated to alternative i; linear policy u_i(k)=K_i(k)V(k); unit-simplex constraint K∈K={K: K_i≥0, K^T 1=1} (convex). Account dynamics V(n)=⟨K, R_n⟩ V_0 with R_{n,i}=Π_{k=0}^{n−1}(1+X_i(k))>0, X(k) i.i.d., arbitrarily correlated components, bounded −1<X_min,i<0<X_max,i<1.
- **Objective (1):** U_n^ρ(K;X) = (1/n) E[log(V(n,K)/V_0)] − (ρ/(2n²)) var(log(V(n,K)/V_0)), ρ≥0 risk-aversion constant.
- **Lemma 3.1:** reformulates var as E[(log⟨K,R_n⟩)²] − (E[log⟨K,R_n⟩])², giving an equivalent problem (3) with equality/inequality constraints.
- **Lemma 3.2 (necessary optimality):** KKT conditions give per-alternative score: E[R_{n,i}/⟨K*,R_n⟩] − (ρ/n) E[log⟨K*,R_n⟩·R_{n,i}/⟨K*,R_n⟩] + (ρ/n) E[log⟨K*,R_n⟩] E[R_{n,i}/⟨K*,R_n⟩] = 1 if K_i*>0; ≤1 if K_i*=0. Proved via Lagrangian with λ=1 from complementary slackness (Eqs. 4–8).
- **When log-variance is convex** (verified in both examples via second derivative ≥0), the objective is concave and Lemma 3.2 is necessary *and sufficient*.

## 4. Equations & assumptions
- U_n^ρ(K;X) = (1/n) E[log(V(n,K)/V_0)] − (ρ/(2n²)) var(log(V(n,K)/V_0)) (1).
- sup_{K∈K} U_n^ρ(K;X) s.t. V(n)=⟨K,R_n⟩V_0 (2).
- Optimality (Lemma 3.2): E[R_{n,i}/⟨K*,R_n⟩] − (ρ/n)E[log⟨K*,R_n⟩·R_{n,i}/⟨K*,R_n⟩] + (ρ/n)E[log⟨K*,R_n⟩]E[R_{n,i}/⟨K*,R_n⟩] = 1 (K_i*>0); ≤1 (K_i*=0).
- Betting example: f(p,K_2,ρ) = −1 + 2p/(1+K*_2) − 2pρ log(1+K*_2)/(1+K*_2) + 2pρ(p log(1+K*_2)+(1−p) log(1−K*_2))/(1+K*_2) = 0; at ρ=0: K*_2 = 2(2p−1) = classical Kelly.
- v(K)=var(log(V(n,K)/V_0)); ∂²v/∂K_2² = 16p(1−p)(2+K_2 log((2+K_2)/(2−K_2)))/(K_2²−4)² ≥ 0 (convex in betting example).
- Assumptions: X(k) i.i.d. with *known* distribution; bounded payoffs; one deterministic alternative with r(k)≥0; simplex allocation (fully invested, no leverage, no shorting); fixed number of stages; Lemma 3.2 conditions are necessary only in general.

## 5. Features / target
No features — analytic payoff distributions. Target: optimal allocation vector K* (fraction of account per alternative). Inputs: payoff distribution parameters (p), risk-aversion ρ, decision period n.

## 6. Validation design
Analytic/synthetic only: (1) betting — sweep ρ∈{0,0.1,…,1} at p=0.6 and p=0.75, solve f(p,K_2,ρ)=0, plot K*_2 vs ρ (Figs. 1–3); (2) inventory — verify convexity of v(K) numerically for n∈{1,5,10} (Fig. 4), then solve via Lemma 3.2 with n=5, ρ=1/2. No train/test splits, no baselines against other methods, no real data.

## 7. Numerical results / baselines
- p=0.6: ρ=0 → K*_2=0.4 (Kelly); ρ=0.1 → K*_2≈0.3646 (paper: "slightly smaller"); ρ=1 → K*_2≈0.2035 (falls "by around 0.2").
- p=0.75: ρ=0 → K*_2=1; ρ=1 → K*_2≈0.5643.
- Finding: K*_2 "negatively affected by ρ and more sensitive to ρ as the probability of profiting becomes higher."
- Inventory (n=5, ρ=1/2): K*_1=1, K*_2=0 (full allocation to the safe category).
- Baselines: only the ρ=0 Kelly solution as the reference point; no competing methods compared.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- No empirical validation at all — purely illustrative; the "results" are analytic solutions of toy distributions, not evidence the rule beats anything on real data.
- Assumes the payoff distribution is *known exactly* — the paper does not handle estimation uncertainty in p (unlike ledgers 2142/2143). For GSE, p is the thing being estimated; applying this with a point estimate reintroduces exactly the overbetting risk Kelly is infamous for.
- i.i.d. assumption fails for sports slates (correlated games, regime shifts).
- Only necessary conditions in general; sufficiency requires convex log-variance, verified only for the two toy examples — unverified for realistic payoff distributions.
- Simplex constraint = fully invested, no cash, no leverage — GSE stakes a fraction of bankroll per game; the multi-alternative framing fits a slate, not a single game.
- The variance penalty is on *log* growth, which is the right object for bankroll compounding, but ρ has no principled calibration procedure — the paper offers no way to choose ρ from data.

## 10. GSE overlap
Existing-research map line 141: Kelly mentioned 12× in repo, zero papers read — this is the first actual Kelly-family paper read for GSE. The map's bet-sizing lane is empty; this paper slots directly into it as the theoretical foundation. Complements ledger 2143 (two-layer risk) and ledger 2142 (conformal bet/no-bet): those handle *whether* to bet and *how much to hedge estimation risk*; this one provides the core *growth-vs-variance sizing rule* with a tunable risk knob. None of the three duplicate each other.

## 11. GSE implementation spec
- **Per-game stake rule:** for each engine pick with estimated win prob p̂ and decimal odds o, compute the ρ-penalized Kelly fraction by solving the paper's optimality equation numerically (1-D root find on f(p̂,K,ρ)=0 with payoff X∈{o−1,−1}), i.e., a fractional-Kelly-like stake with ρ calibrated, not an arbitrary 0.25/0.5 fraction.
- **ρ calibration:** grid-search ρ∈[0,2] on rolling backtest to maximize Calmar ratio (not raw growth) — this answers the paper's open "how to choose ρ" with data.
- **Slate extension:** use the multi-alternative simplex form: each week's picks = alternatives, K = stake fractions summing to ≤1 (cash = deterministic alternative with r=0), payoffs correlated via historical pick-residual correlation.
- **Serving:** precompute stake per pick nightly after odds sync; cap single-game stake at 3% bankroll regardless of formula output (paper has no such guardrail; GSE needs one).
- **Effort:** ~1 week (root-finder + backtest + ρ grid search).

## 12. Reproducible test
Dataset: engine picks table + odds history + nflverse outcomes, 2022–2025. Protocol: rolling weekly backtest; per pick, p̂ from engine, odds from Odds API archive; stake from ρ-Kelly root-find vs baselines (a) fixed 1-unit, (b) full Kelly on p̂, (c) fixed fractional Kelly 0.25. Metrics: bankroll CAGR, Sharpe, Calmar, max drawdown, probability of ≥20% drawdown. ρ chosen on 2022–2023, locked, evaluated on 2024–2025 (no refit).

## 13. Acceptance / rejection gate
**ACCEPT if on locked 2024–2025 window:** Calmar_ρ-Kelly ≥ 1.10 × Calmar_best-baseline AND max-drawdown ≤ 0.90 × that of full-Kelly baseline (the variance penalty must earn its keep) AND CAGR ≥ CAGR of fixed-fraction baseline (no growth sacrifice). **REJECT otherwise**, or if optimal ρ on the tuning window is 0 (then it's just Kelly — nothing gained) or unstable across tuning folds (ρ flips sign of ranking).

## 14. Improvement experiment
Beyond the paper: make ρ *adaptive to bankroll state* — ρ_t = ρ_0 × (1 + κ·(DD_t/DD_max)), where DD_t is current drawdown: the variance penalty tightens automatically as the bankroll dips (a drawdown governor the static paper lacks). Backtest whether adaptive-ρ beats the best static ρ on Calmar and on the paper's own objective (expected log growth − variance penalty evaluated out-of-sample). Hypothesis: adaptivity cuts max drawdown without sacrificing CAGR, since it only binds in bad states.

