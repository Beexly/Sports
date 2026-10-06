# [1617] Adaptive Liquidity in Prediction Markets via Online Learning (arXiv:2605.09599)

**Citation:** Enrique Nueve, Bao Nguyen, Rafael Frongillo, Bo Waggoner (2026). *Adaptive Liquidity in Prediction Markets via Online Learning*. arXiv:2605.09599. URL: https://arxiv.org/abs/2605.09599
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, ~13,500 words; Appendices A–G proofs scanned after reading the full body through Section 7).
**Verdict:** ADAPT — a working adaptive-liquidity framework (mixture of cost-function markets via online learning, with code released) that GSE can lift for any product with inventory or pricing: the log-sum-exp mixture preserves no-arbitrage and bounded loss with only a (1/β)log M overhead, and the hybrid slippage+liability signal is a ready-made state-dependent risk monitor. Adapt the mixture construction and the signal; the switching-regret theory is a bonus.

## 1. Research question
Prediction markets fix liquidity ex ante, forcing a static trade-off between price responsiveness and worst-case loss under nonstationary trading conditions. Can liquidity selection itself be treated as an online learning problem — mixing a family of cost-function markets via learnable weights — while preserving no-arbitrage, bounded worst-case loss, expressiveness, and positive upside?

## 2. Dataset / schema
No empirical data — theory + a stylized simulation: a two-outcome market with two LMSR experts (low/high liquidity), Fixed-Share learner, four designed regimes (R1/R4: sustained directional flow → inventory accumulation; R2: small oscillatory trades near neutral inventory; R3: large alternating trades, high flow, bounded inventory). Detailed setup in Appendix F; code at https://github.com/EnriqueNueve/Adaptive-Cost-Function-Liquidity-/tree/main.

## 3. Method / model
M liquidity regimes {C_k} (each an LMSR scaled via C_η(q) = ηC(q/η); larger η = higher liquidity) are mixed into one convex potential: C^mix(q;w) = (1/β)log(Σ_k w(k)e^{βC_k(q)}), β>0. Prices are a soft aggregation: ∇C^mix(q;w) = Σ_k π_k(q;w)∇C_k(q) with posterior weights π_k(q;w) = w(k)e^{βC_k(q)}/Σ_j w(j)e^{βC_j(q)}. Weight updates break payment telescoping, so a fee fee_t = [Δ_t^*]_+ = max{sup_q(C^mix(q;w_t) − C^mix(q;w_{t+1})), 0} compensates worst-case potential decreases (the smallest nonnegative uniform insurance premium). The hybrid structural signal Γ^hyb_{k,t} = a(S_{k,t} − (1/M)Σ_j S_{j,t}) + bL_k(q_t) (a,b>0) combines centered slippage S_{k,t} = D_{C_k}(q_t,q_{t−1}) (relative execution quality) with uncentered liability L_k(q) = max_o ρ(o)·q − (C_k(q)−C_k(0)) (absolute worst-case exposure). Fixed-Share/Hedge-style online learning over the signal gives switching-regret guarantees vs. the best ≤J-switch regime sequence in hindsight.

## 4. Equations & assumptions
- Mixture: C^mix(q;w) = (1/β)log(Σ_k w(k)e^{βC_k(q)}), β>0; small β → near-averaging, large β → soft maximum.
- Hessian decomposition: ∇²C^mix(q;w) = Σ_k π_k(q;w)∇²C_k(q) + β·Cov_{k∼π(q;w)}(∇C_k(q)) — mixture curvature = expected expert curvature + β × expert disagreement variance (Eqs. 5–6).
- Smoothness: L_mix ≤ L_max + βG² where L_max = max_k L_k, ‖∇C_k‖_* ≤ G.
- Payment: Pay^mix_t(r_t) = C^mix(q_t;w_{t+1}) − C^mix(q_{t−1};w_t) + fee_t; fee_t = [Δ_t^*]_+, Δ_t^* = sup_q(C^mix(q;w_t) − C^mix(q;w_{t+1})).
- Worst-case loss: sup_{T,(r_t),o} Loss_T(o) ≤ max_k B_k + (1/β)log M + C^mix(q_0;w_1) − min_o ρ(o)·q_0, B_k = max_o C_k^*(ρ(o)).
- Hybrid signal: Γ^hyb_{k,t} = a(S_{k,t} − (1/M)Σ_j S_{j,t}) + bL_k(q_t); slippage S_{k,t} = D_{C_k}(q_t,q_{t−1}); liability L_k(q) = max_o ρ(o)·q − (C_k(q)−C_k(0)).
- Regret: O(√(T log T)) vs. best sequence with ≤J switches (under mild burn-in); under regime dominance: ΣΓ^Φ − ΣΓ_{j_t} ≤ R^surr_T + 4aGRC_dom + O(|B|).
- Effective liquidity: b_eff,t = (Σ_k π_t^{(b)}(k;q_t)η_k^{−1})^{−1}.
- Assumptions: experts satisfy Axioms 1–4 on a common outcome space; full-support weights (w_t(k)>0, holds under multiplicative-weights); bounded trades; smooth costs (controls drift/mismatch terms).

## 5. Features / target
Features: per-regime slippage S_{k,t}, per-regime liability L_k(q_t), mixture weights w_t, posterior weights π_t. Target: minimize cumulative hybrid signal relative to the best J-switch regime sequence — i.e., adapt liquidity so the market sits at the right point on the price-impact/inventory-risk frontier at each round.

## 6. Validation design
Theory: axioms verification (no-arbitrage Thm. 3, bounded loss Thm. 4, expressiveness Thm. 5 for scaled families, positive directional upside Thm. 6); regret analysis via surrogate→mixed→realized signal chain (Thms. 9, 11, 12; Cor. 2). Simulation: 2-LMSR-expert, 2-outcome market, Fixed-Share over the hybrid signal, four regimes; tracks effective liquidity b_eff,t, mixture slippage, and liability vs. fixed low/high-liquidity benchmarks. No real market data.

## 7. Numerical results / baselines
- Regret: O(√(T log T)) switching regret; under dominance the mismatch terms (pricing-vs-learning weight gap, drift, fees) collapse to 4aGRC_dom + O(|B|), so average regret vanishes.
- Overhead of adaptivity: worst-case loss bound adds only (1/β)log M over the most conservative expert — negligible for moderate M and non-tiny β.
- Simulation behavior: in R1 (sustained directional flow) effective liquidity drops sharply to low after an initial adjustment as inventory risk accumulates; in R2 (oscillatory, neutral inventory) it jumps up and plateaus high — when liability is inactive the learner picks high liquidity to minimize slippage; in R3 (large alternating trades) the adaptive curve sits between the two fixed benchmarks, with slippage showing periodic spikes the mixture damps; in R4 liability dominates again and liquidity collapses. Slippage governs short-term responses (trade-size oscillations), liability governs long-term regime positioning (sharp transitions).
- Key qualitative result: the learner switches regimes state-dependently rather than smoothing — liquidity aligns with whichever risk (price impact or inventory) dominates.

## 8. Code / data availability
Code released: https://github.com/EnriqueNueve/Adaptive-Cost-Function-Liquidity-/tree/main (Appendix F details the simulation setup). No real data.

## 9. Leakage & limitations
- Pure simulation: the four regimes are designed to separate effects; no validation on real prediction-market order flow.
- Guarantees are on the hybrid surrogate signal, not on trader surplus, price accuracy, or information aggregation — the authors flag this explicitly.
- Equilibrium behavior under adaptive liquidity is unstudied: strategic traders could exploit predictable regime switches.
- The pricing-vs-learning weight mismatch (π_t vs. w_t) is a real distortion the paper bounds but doesn't eliminate.
- Only LMSR experts demonstrated; permutation/pair-betting markets sketched in Appendix G only.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's prediction-market tooling lane is thin and sports order-flow microstructure is a gap (line 143). This is **new** and pairs with 1616: where 1616 derives optimal quotes for a fixed-risk market maker, 1617 makes the *liquidity level itself* adaptive via online learning — the two compose (1617's mixture chooses the regime, 1616's HJB quotes within it). Nothing in the GSE corpus currently does state-dependent liquidity or expert-mixture pricing.

## 11. GSE implementation spec
1. **GSE adaptive pricing engine:** implement the mixture C^mix over M=3–5 LMSR-scaled regimes (η spanning GSE's typical price-impact range) for any GSE product that quotes prices — props, futures, or a future GSE prediction product. Update weights with Hedge/Fixed-Share over the hybrid signal; the released code is the starting template.
2. **Exposure monitor for pick slates:** even without a market, compute the hybrid signal components on GSE's pick log: slippage-analog = realized price impact of GSE's published picks on its own tracked lines; liability-analog = worst-case correlated-slate exposure. Use Γ^hyb as the single number that decides when GSE's "liquidity" (stake sizing / slate aggressiveness) should drop — formalizing what is currently gut feel.
3. **Ensemble pricing via the Hessian identity:** GSE's ensemble already mixes models; use the decomposition (curvature = expected curvature + β·disagreement) to widen GSE's quoted confidence intervals when expert models disagree — β becomes a tunable "disagreement penalty."
4. **Regime-switch detector:** the simulation's sharp-switching behavior (R1→R2 transition) is a template for GSE's steam detector: when the liability term spikes, drop liquidity (widen, reduce size) immediately rather than gradually.
5. **Effort:** ~1 week to port the mixture + hybrid signal; the regret theory needs no implementation.

## 12. Reproducible test
Dataset: GSE's pick/stake log + tracked line history, 2023–2025. Metrics: (a) compute Γ^hyb per week with a,b tuned on 2023; check that high-Γ weeks precede the worst realized drawdowns (rank correlation); (b) backtest a stake-sizing rule that scales stakes inversely with the liability component vs. flat staking — compare Sharpe and max drawdown. Baseline: the paper's simulation (adaptive interpolates between fixed extremes). Pass if the liability component predicts realized drawdown weeks with rank correlation ≥0.3 and the adaptive sizing rule improves risk-adjusted return ≥10% vs. flat staking without cutting total ROI by more than 5%.

## 13. Acceptance / rejection gate
**Adapt** the mixture construction and the hybrid signal as GSE's state-dependent exposure framework if the liability component correlates with realized drawdowns on GSE's log — the machinery is cheap and the (1/β)log M overhead guarantee means adaptivity costs almost nothing in worst-case terms. **Reject** the full online-learning weight-update loop as production pricing until it's tested against strategic/adversarial flow — the paper's no-equilibrium-analysis caveat is load-bearing for a real book. Keep the Fixed-Share learner as a research prototype (code exists), not a deployed pricer.

## 14. Improvement experiment
The paper's signal weights slippage and liability with static a,b. GSE's improvement: make a,b themselves adaptive — learn the (a,b) trade-off from GSE's own realized outcomes (meta-learning over the hybrid signal), so the market automatically discovers whether it's currently in a slippage-dominated or liability-dominated regime. Backtest on the pick log: does meta-learned (a,b) beat the best fixed (a,b) on the drawdown-prediction task? A second experiment: add a third signal term for informed-flow (1612's SCI) — Γ^hyb + c·SCI — so liquidity drops not just on inventory but on toxic flow, closing the loop between 1612, 1616, and 1617 into one adaptive market-making stack.
