# [2143] A Composite Risk Measure Framework for Decision Making under Uncertainty (arXiv:1501.01126)

**Citation:** Pengyu Qian, Zizhuo Wang, Zaiwen Wen (2015). *A Composite Risk Measure Framework for Decision Making under Uncertainty*. arXiv:1501.01126. URL: https://arxiv.org/abs/1501.01126
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* a two-layer risk decomposition (inner risk over game outcomes given the model, outer risk over the posterior of the model's own parameters) that maps exactly onto GSE's stake-sizing problem: game randomness is not the only uncertainty — the engine's edge estimate itself is uncertain. Less conservative than full distributionally-robust sizing, with convex tractability.

## 1. Research question
Can stochastic programming, robust optimization, distributionally robust optimization, and worst-case risk models be unified in one framework — and can a Bayesian treatment of *distributional* uncertainty (uncertainty about the distribution parameters themselves) yield new, less-conservative decision models that still carry probabilistic guarantees? The answer is the composite risk measure (CRM): min_x μ(g_F(H(x,ξ))), where the inner risk measure g_F captures risk of the decision *given* a distribution F of uncertain parameters ξ, and the outer risk measure μ quantifies risk from *estimating* F (via its Bayesian posterior P_1).

## 2. Dataset / schema
Portfolio selection: daily returns of 359 S&P-500 stocks without missing data, 2010–2011. Rolling experiments: at each trading day, the past t=30 days of returns are used to form the posterior; dynamic portfolio recomputed daily over 3/4/2010–4/27/2011 (300 days). Comparison models: distributionally robust (Delage & Ye 2010), worst-case VaR (El Ghaoui et al. 2003), single-stock naive benchmark. Synthetic experiments: randomly pick 2 stocks, bootstrap 10^6 samples from fitted normal, repeat 1000 times.

## 3. Method / model
- **CRM unification (Sec. 3):** stochastic programming = singleton outer + expectation/VaR/CVaR inner; DRO = worst-case outer + expectation inner (worst-case WC(Z)=inf{α: P(Z≤α)=1}); robust optimization = both worst-case with point-mass distributions; worst-case VaR/CVaR = worst-case outer + VaR/CVaR inner. Theorem 3.5 (Artzner et al.): coherent ρ ⇔ ρ(X)=sup_{Q∈Q} E_Q[X] with Q={Q≪P: dQ/dP ≤ (1−δ)^{−1}} for CVaR_δ. Key result: the composite is *convex* when both inner and outer are convex risk measures (CVaR is; VaR is not).
- **Three new models (Sec. 4):** (1) VaR-Expectation (21): min_x VaR_δ(E_{ξ∼F}[H(x,ξ)]) — minimizes the upper bound of a one-sided δ-confidence interval for expected loss; decision-dependent distribution set F_x (less conservative than DRO's decision-independent set); probabilistic guarantee γ_VaR* ≤ γ_DR* (same δ). (2) CVaR-Expectation (33): min_x CVaR_δ(E_{ξ∼F}[H(x,ξ)]) — convex relaxation, solvable as LP. (3) CVaR-CVaR (32): min_{x,α} α + (1/(1−δ)) E[(CVaR_ε(H(x,ξ_F))−α)^+] — nested CVaR accounting for tail severity in both layers; solved via SAA as LP→SOCP (35); SAA sample complexity M ≥ C_1(H,F)/γ² [C_2(H,F) n + C_3(H,F) log(1/ε)] (36) with high probability.
- **Bayesian posterior:** for normal returns with Jeffreys prior, posterior f(μ,Σ)=N(μ|μ_0, t^{−1}Σ)·W^{−1}(Σ|tΣ_0, t−1) (40); the outer risk measure is taken over this posterior.

## 4. Equations & assumptions
- CRM objective: min_{x∈X} μ(g_F(H(x,ξ))), F∼P_1 (posterior), ξ∼F.
- VaR_δ(H(x,ξ)) ≜ inf{t: P(H(x,ξ)≥t) ≤ 1−δ} (2).
- WC(Z)=inf{α | P(Z≤α)=1} (17).
- VaR-Expectation: min_{x∈X} VaR_δ(E_{ξ∼F}[H(x,ξ)]) (21); reformulation as min_{x,F} sup_{F∈F}(E_F[H]) s.t. P_1(F∉F) ≤ 1−δ (22) ⇒ γ*_VaR ≤ γ*_DR.
- CVaR-CVaR: min_{x,α} α + 1/(1−δ) E[(CVaR_ε(H(x,ξ_F))−α)^+] (32); SAA-LP (34)→(35).
- CVaR-Expectation: min_{x∈X} CVaR_δ(E_{ξ∼F}[H(x,ξ)]) (33).
- Posterior (40); decision-dependent set F_x = {N(μ,Σ): μ^T x ≤ μ_0(x)^T x}.
- Coherent representation (Thm 3.5): ρ(X)=sup_{Q∈Q} E_Q[X].
- Assumptions: distribution parameterized by finitely many parameters (e.g., normal μ,Σ); H(x,ξ) convex in x for tractability of (35); VaR is non-convex so VaR-Expectation solved by ADM (alternating direction augmented Lagrangian), CVaR variants by LP/SOCP; Gaussian returns in the experiment; short-selling disallowed (x≥0, e^T x=1).

## 5. Features / target
Portfolio weights x (decision, long-only, sums to 1); uncertain parameters ξ = vector of stock returns; features = past 30-day returns; target = future daily return; loss H(x,ξ)=−ξ^T x. For GSE mapping (see §11): x = stake vector over the slate's bets, ξ = realized game outcomes, H = negative bankroll growth.

## 6. Validation design
- Experiment 1 (less conservative): 1000 repetitions, 2 random stocks, bootstrapped 10^6 samples; compare optimal values of VaR-Expectation (41) vs Delage-Ye DRO (42) with δ=0.95; scatter + difference histogram.
- Experiment 2 (tractability): n=4 stocks, N∈{5k,10k,20k,50k,100k} SAA samples, 100 repetitions — report mean/std of optimal value and compute time (MOSEK/Matlab); then N=5000 fixed, n∈{10,20,30,40,50} — report avg/min/max times.
- Experiment 3 (real trading): dynamic daily portfolio, random 4 stocks, 300 days (3/4/2010–4/27/2011), last-30-day window only (no lookahead), N=2000 SAA; compare average daily return and std vs DRO, worst-case VaR, single-stock.

## 7. Numerical results / baselines
- VaR-Expectation optimal value was higher (less conservative) than DRO in *all 1000* experiments; average 0.070% higher at δ=0.95 — same probabilistic guarantee, strictly better value.
- Tractability: at N=100,000, n=4 — VaR-Exp: ave 0.0004, std 4.63×10^{−5}, 9.26 s; CVaR-Exp: ave −0.0007, std 3.18×10^{−5}, 1.65 s; CVaR-CVaR: ave −0.0373, std 7.17×10^{−5}, 17.64 s. All converge as N grows (solution concentration, Fig 5.2).
- Scaling: n=50 stocks, N=5000 — VaR-Exp 6.38 s avg, CVaR-Exp 0.33 s avg, CVaR-CVaR 29.33 s avg (all "reasonable").
- Real trading (300 days): avg daily return — VaR-Exp 0.096%, CVaR-Exp 0.096%, CVaR-CVaR 0.087%, DRO 0.088%, worst-case VaR 0.087%, single-stock 0.078%; avg std — VaR/CVaR-Exp 1.49×10^{−2}, CVaR-CVaR 1.17×10^{−2}, DRO 1.19×10^{−2}, W-C VaR 1.17×10^{−2}, SS 2.17×10^{−2}. CRM models' volatilities "significantly smaller" than naive; VaR-Exp/CVaR-Exp achieved the best return rates.

## 8. Code / data availability
None stated (MOSEK/Matlab experiments; S&P data not redistributed).

## 9. Leakage & limitations
- Experiment 3 is rolling with 30-day lookback — no lookahead; sound protocol. Experiment 1's bootstrap is synthetic/illustrative only.
- Gaussian returns + Jeffreys posterior is convenient, not correct (fat tails); for sports, the analog is a conjugate-ish posterior over win probabilities — needs its own derivation (beta-binomial is natural).
- VaR-Expectation is non-convex (VaR outer) — ADM works for portfolios but has no global guarantee; the convex CVaR-Expectation is the safer adaptation target.
- Results are modest: 0.070% value improvement, return differences of a few bps/day — directionally favorable but not dramatic; the paper's honest claim is "robust performance," not dominance.
- Portfolio = continuous weights; GSE's slate is a handful of discrete bets — the method adapts but the n-scaling results overstate the sports use case.
- No transaction-cost/vig treatment — in betting the analog (vig) must be in H(x,ξ) explicitly.

## 10. GSE overlap
Existing-research map line 141: "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read." GSE's sizing is fixed-fraction (see ledger 2142's baseline description). Nothing in the repo treats the two-layer structure: **(inner) game-outcome risk given the engine's probabilities vs (outer) uncertainty about the engine's probabilities themselves**. Wang Transform (oracle3) and Kelly address only the inner layer. The CRM framework is new capability: a convex, tractable way to size a stake vector that penalizes both game variance (inner CVaR) and edge-estimation uncertainty (outer risk over the posterior of p). It unifies the map's scattered robust/Kelly threads into one decision objective.

## 11. GSE implementation spec
- **Decision:** stake vector x over the week's slate (n≈5–15 engine picks), long-only (no laying bets we don't have), Σx ≤ bankroll fraction cap.
- **Uncertain params:** ξ = realized margins/covers; loss H(x,ξ) = −(profit(x,ξ)) with vig baked in.
- **Inner risk g_F:** CVaR_ε over game outcomes *given* the engine's outcome distribution F (ε=0.10: average loss in worst 10% of game scenarios) — penalizes slate-correlation tail risk.
- **Outer risk μ:** CVaR_δ over the *posterior of the engine's win probabilities* (beta-binomial posterior per pick, updated on rolling 8 weeks of engine Brier/residual history): CVaR-Expectation model (33) — convex, LP-solvable via SAA. Outer δ=0.95.
- **Pipeline:** (1) per pick, posterior p_i ∼ Beta(a_i,b_i) from recent engine calibration history; (2) SAA: N=5000 draws of (p vector → outcome scenarios); (3) solve LP: min_x CVaR_0.95(E_outcomes[−profit]) — expected-profit-inner with outer tail penalty on parameter uncertainty; (4) stakes normalized to bankroll, published with the slate.
- **Effort:** ~2 weeks (posterior updater + SAA LP via scipy/cvxpy + backtest harness).

## 12. Reproducible test
Dataset: engine picks table (Neon) + nflverse results, 2022–2025 (4 seasons); rolling weekly: posterior over engine win-probs from prior 8 weeks of picks; slate = engine positive-EV picks each week (n≈8–14). Baselines: (a) current fixed-fraction sizing; (b) plain fractional Kelly on point estimates. Metric: bankroll growth + Calmar ratio + max drawdown, Kelly-style geometric-mean return. No-lookahead: posteriors use only games before the week.

## 13. Acceptance / rejection gate
**ACCEPT if on 4-season rolling backtest:** Calmar_CRM ≥ 1.10 × Calmar_best-baseline AND max-drawdown_CRM ≤ 0.90 × max-drawdown_best-baseline, with final bankroll ≥ baseline (no return sacrifice). **REJECT otherwise**, or if weekly LP solve exceeds 60 s (operational budget) or if posterior collapses to point estimates (outer layer vacuous).

## 14. Improvement experiment
Beyond the paper: make the inner risk measure *slate-aware* — replace independent per-pick CVaR with a joint CVaR over the portfolio loss that captures correlated tail events (e.g., divisional weather games moving together, correlated injury news). Implement via a Gaussian-copula scenario generator fit on historical pick residuals, then rerun the CVaR-Expectation LP on correlated scenarios. Hypothesis: correlation-aware inner CVaR further cuts max drawdown vs the independent-scenario version; measure the drawdown delta on the same 4-season window.

