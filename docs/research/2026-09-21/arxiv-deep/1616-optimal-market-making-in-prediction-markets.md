# [1616] Optimal Market Making in Prediction Markets (arXiv:2607.17991)

**Citation:** Dominik Feil, Max Nendel (2026). *Optimal Market Making in Prediction Markets*. arXiv:2607.17991. URL: https://arxiv.org/abs/2607.17991
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, ~15,000 words; Appendices A–C proofs and D scanned after reading the full body through Section 5).
**Verdict:** ADAPT — the first stochastic-control treatment of prediction-market market making, with a logit-belief price diffusion, inventory skew rules, and a quantified risk/return trade-off. GSE doesn't run a book, but the framework ports directly to GSE's live pricing/exposure engine: the belief-volatility specification σ(t,x), the skew-as-function-of-inventory rule, and the settlement-risk penalty are reusable design components. Adapt as principles + parameterizations, not as a literal HJB solver.

## 1. Research question
How should a market maker optimally quote bid/ask in a prediction market (binary $1/$0 settlement, limit order book) when prices are conditional probabilities in (0,1) and leftover inventory faces binary settlement risk? The paper develops the stochastic control framework, proves existence/uniqueness of the optimal quoting strategy, and quantifies its risk reduction vs. a myopic benchmark.

## 2. Dataset / schema
No empirical data — theory + numerical simulation. The Monte Carlo comparison uses 10,000 simulated price paths from the paper's own model (parameters in Table 1). The authors state the empirical functional form of order intensities in prediction markets "has not yet been studied systematically," so intensity parameters are modeling choices, not calibrations.

## 3. Method / model
Price = conditional probability p_t = f(L_t), f: ℝ→(0,1) strictly increasing C² with bounded Lipschitz g = f″/f′ (logistic f(x) = 1/(1+e^(−x)) used; then L_t = ln(p_t/(1−p_t)) is log-odds, and g(x) = −tanh(x/2)). Latent belief diffusion dL_t = μdt + σdW_t with drift μ(t,x) = −a(t,x)g(x), a = σ²/2 chosen so p_t is a martingale: dp_t = p_t(1−p_t)σ(t, ln(p_t/(1−p_t)))dW_t. Market maker posts bid/ask π^b, π^a ∈ [0,1]; executions are Poisson with intensities Λ^b, Λ^a (increasing in own quote, decreasing in other side's; curvature condition sup Λ·Λ″/(Λ′)² < 2 guarantees a unique optimal quote). Objective: E[X_T + q_T·Y + Φ(p_T,q_T) − γ∫q_s²ς(s,p_s)²ds], with running inventory penalty γ and terminal settlement penalty Φ(p,q) = −γ_T q²p(1−p). HJB reduced 4D→3D (cash eliminated); existence/uniqueness of classical solution via fixed-point contraction κ = 4Λ̄/β ∈ (0,1); optimal quotes characterized pointwise (Prop. 3.2) and verified (Thm. 3.3).

## 4. Equations & assumptions
- Belief diffusion: dL_t = μ(t,L_t)dt + σ(t,L_t)dW_t; μ(t,x) = −a(t,x)g(x), a = σ²/2 (martingale drift cancellation).
- Price SDE (logistic): dp_t = p_t(1−p_t)·σ̃(t,p_t)dW_t, σ̃(t,p) = σ(t, ln(p/(1−p))).
- Volatility spec: σ(t,x) = σ_0 + σ_1(t/T)^η + σ_2/(1+x²) — baseline + time-acceleration (faster info near settlement) + uncertainty peak at p=1/2.
- Objective: E[X_T + q_T Y + Φ(p_T,q_T) − γ∫_0^T q_s²ς(s,p_s)²ds]; Φ(p,q) = −γ_T q²p(1−p).
- Reduced HJB: 0 = −∂_tV − ½ς²∂²_ppV + γq²ς² − 1_{q<Q}H^b(t,p;(V(q)−V(q+Δ))/Δ) − 1_{q>−Q}H^a(⋯), V(T,p,q) = Φ(p,q).
- Optimal quote: π^{b,*}(z) = (u^b)^{−1}(z), u^b(π) = G^b(p,π) − Λ^b/∂_πΛ^b; π^{a,*}(z) = (u^a)^{−1}(z), u^a(π) = G^a(p,π) + Λ^a/∂_πΛ^a; z_b = (V(q)−V(q+Δ))/Δ.
- Spread = π^a − π^b; Skew = (π^a+π^b)/2 − p.
- Assumptions: market efficiency (price = belief martingale), risk-neutral pricing of fills, fixed trade size Δ, bounded inventory grid, Poisson order flow, no adverse-selection modeling of takers.

## 5. Features / target
State: (t, p, q). Controls: bid/ask quotes π^b, π^a ∈ [0,1]. Target: maximized expected terminal wealth net of inventory/settlement risk penalties. Outputs analyzed: spread(t,p,q), skew(t,p,q), and Monte Carlo PnL distributions vs. myopic baseline.

## 6. Validation design
Numerical: implicit-Euler finite-difference backward solve of the reduced HJB on a (t,p,q) grid (p ∈ [10⁻³, 1−10⁻³], Neumann boundaries), fixed-point iteration per time step reusing one LU decomposition; quotes via trilinear interpolation + pointwise maximization. Monte Carlo: 10,000 Euler–Maruyama paths from p_0 = 1/2, Poisson-sampled fills, Bernoulli(p_T) settlement; optimal (inventory-constrained) vs. myopic baseline (unconstrained, maximizes instantaneous mark-to-market profit). No real-market data anywhere.

## 7. Numerical results / baselines
Parameters: T=1; σ_0=0.6, σ_1=0.3, σ_2=0.1, η=3; A_0=100, A_1=150, ξ=2; ν=1; k_0=35, k_1=50, κ=1.5; γ=4·10⁻³, γ_T=10⁻³; Q=100, Δ=10. Structural findings: (i) spread decreases over time as k(t) rises, but widens near settlement for p≈1/2 where settlement risk peaks and unwinding time is short; spreads larger closer to p=1/2 at any fixed t. (ii) Skew at zero inventory: positive for p<1/2, negative for p>1/2 (asymmetric intensities, not inventory) — effect grows toward boundaries; inventory shifts skew in the expected direction (long→negative skew, short→positive); near p→0/1 curves converge since p(1−p)→0 kills risk. (iii) γ (running) matters most early; γ_T (terminal) matters most near settlement. Monte Carlo (10,000 paths) — Optimal vs. Baseline: mean PnL 12.39 vs. 12.47; std(PnL) 10.34 vs. 28.11; mean |q_T| 15.23 vs. 49.37; VaR_5% 4.20 vs. 32.41; ES_5% 9.68 vs. 40.50. The optimal strategy keeps ~99.4% of expected profit while cutting PnL std by 63%, terminal inventory by 69%, and VaR_5% by 87%.

## 8. Code / data availability
None stated. Numerical scheme fully specified (Section 4.2) but no code or calibrated parameters released.

## 9. Leakage & limitations
- Zero empirical content: intensities are assumed, not estimated from any order-book data; the paper explicitly notes prediction-market intensity forms are unstudied.
- No adverse selection: takers are Poisson noise, so the model can't capture informed-flow risk — the main risk in real prediction markets (cf. 1612's informed-whale problem).
- Fixed trade size Δ and a coarse inventory grid; complementary-contract netting assumed frictionless.
- The 10,000-path comparison is in-model: the optimal strategy is evaluated on paths generated by the same assumptions it was derived under.
- Real GSE use would need the full HJB machinery simplified — the paper's own remark flags the fixed-point iteration as the practical numerical route.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's prediction-market tooling lane is thin and sports-market order flow/microstructure is a listed gap (line 143). This is **new**: the first optimal-control market-making framework for binary prediction markets, and the only paper in the wave giving a complete quoting-risk system (belief diffusion + intensity model + settlement penalty). It complements 1615 (fair-odds wedge — what odds *should* be) with *how to quote* around them, and 1617 (adaptive liquidity) with the risk-aversion machinery that paper's online learner lacks.

## 11. GSE implementation spec
1. **Live win-probability engine:** adopt the volatility spec σ(t,x) = σ_0 + σ_1(t/T)^η + σ_2/(1+x²) for GSE's in-game win-probability diffusion — volatility accelerating toward the final whistle (η≈3) and peaking at 50/50. Fit σ_0, σ_1, σ_2 per sport on GSE's play-by-play win-probability paths.
2. **Exposure skew rule:** for any GSE product with directional exposure (contest entries, published pick slates, affiliate positions), implement the skew rule — shift published confidence/pricing against the exposure side proportionally to q·p(1−p), i.e., flatten exposure hardest when the event is a coin flip.
3. **Settlement penalty in pick selection:** add the terminal penalty Φ = −γ_T q²p(1−p) to GSE's pick-optimizer as an exposure term — penalize correlated pick slates most when individual legs are near 50/50.
4. **Kalshi/Polymarket quoting bot (if GSE ever runs one):** the paper's fixed-point iteration (contraction κ = 4Λ̄/β) is the implementable solver; start with the skew rule + spread widening near settlement as heuristics.
5. **Effort:** ~1 week for the volatility spec fit + skew/penalty terms; the full HJB quoter is a separate project.

## 12. Reproducible test
Dataset: GSE's historical in-game win-probability paths (any sport) + pick-slate logs. Metrics: (a) fit σ(t,x) per sport via MLE on observed win-probability increments; check η>1 (acceleration) and the 1/(1+x²) peak at p=0.5; (b) backtest the skew rule on GSE's published picks: does exposure-weighted pick selection (penalty term active) reduce realized drawdown vs. the unpenalized slate at comparable hit rate? Baseline: the paper's own 63% std / 87% VaR reductions are in-model upper bounds — expect materially less on real data. Pass if the σ(t,x) spec fits better (AIC) than constant volatility and the penalty term cuts realized slate variance ≥10% at equal ROI.

## 13. Acceptance / rejection gate
**Adapt** the volatility specification and the skew/penalty rules if σ(t,x) beats constant-volatility on GSE's win-probability paths (AIC) — these are cheap, model-free wins. **Do not** implement the full HJB quoter unless GSE actually operates a quoting book; the PDE machinery is overkill for a research/picks product, and the intensity parameters have no empirical basis to calibrate against. The paper's intensity assumptions (Poisson, no adverse selection) are the first thing to replace with 1612's informed-flow model if a real quoter is ever built.

## 14. Improvement experiment
The paper's biggest gap — no adverse selection — is exactly 1612's strength. GSE's improvement: couple the two — run the 1616 quoting HJB with order intensities split into uninformed (Poisson, as here) and informed (arriving when the 1612 SCI signal fires) components, and widen quotes asymmetrically when SCI is elevated. Test in the paper's Monte Carlo harness: does the SCI-aware quoter preserve the 99%-of-profit result while cutting ES_5% further when informed flow is injected? If yes, GSE has a market-making design that neither paper provides alone — and a publishable result in its own right.
