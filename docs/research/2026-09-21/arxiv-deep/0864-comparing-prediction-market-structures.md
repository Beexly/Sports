# [0864] Comparing Prediction Market Structures, With an Application to Market Making (arXiv:1009.1446)

**Citation:** Brahma, A., Das, S. & Magdon-Ismail, M. (2010). *Comparing Prediction Market Structures, With an Application to Market Making*. arXiv:1009.1446 [cs.GT]. Rensselaer Polytechnic Institute. URL: https://arxiv.org/abs/1009.1446
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/1009.1446.txt (67,368 bytes, complete incl. references). Cross-checked against https://arxiv.org/abs/1009.1446.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — GSE does not run a market, but the bookmaker does: this paper's Bayesian market-maker (BMM) framework is a model of *how lines should move under asymmetric information*, and the consistency-index shock detector plus the adaptivity/convergence/loss tradeoff are directly usable design principles for GSE's market-implied probability engine.

## Citation / full-text source
A. Brahma, S. Das, M. Magdon-Ismail, RPI Dept. of Computer Science. Builds on Das (Quant. Finance 2005), Das (AAMAS 2008), Das & Magdon-Ismail (NIPS 2008), Hanson (2007 LMSR), Glosten & Milgrom (1985).

## Research question
How do inventory-based (Hanson LMSR) vs information-based market makers compare in real trading — and can a Bayesian market maker be built that converges tightly in equilibrium yet still adapts to repeated market shocks?

## Dataset / schema
- **Simulations:** 1,000 runs × 200 steps; true value ~ N(50, 12) truncated to [0,100]; jump prob p_j = 0.01 with Gaussian jumps (σ_j = 5) or adversarial uniform redraws; trader valuations ~ N(true value, 5²); trade sizes exponential (mean 20).
- **Live trading:** 6 experiments with 9–17 human traders (graduate Computational Finance / E-Commerce students), 10-minute games; novel symmetric design: traders simultaneously trade two markets (horizontal/vertical axes of a 2-D Gambler's Ruin random walk), one run by LMSR and one by BMM, market makers flipped between experiments. Trader signals improve ~1/√t as the walk unfolds; shocks introduced by changing random-walk parameters (p, S, z) with or without visible cues.

## Method
1. **LMSR recap:** spot ρ(q_t) = e^{q_t/b}/(1+e^{q_t/b}); trade cost C(Q;q_t) = b·ln(1+e^{(q_t+Q)/b}) − b·ln(1+e^{q_t/b}); max loss = **b·ln 2**. Spread δ(Q) and fluctuation magnitude formulas derived; fluctuations around equilibrium are asymmetric and persistent.
2. **ZP (zero-profit) baseline:** Glosten–Milgrom; Gaussian belief p_t(v) = N(μ_t, σ_t²); trader signal s ~ N(V, σ_ε²); information disadvantage ρ_t = σ_t/σ_ε; ask = μ_t + σ_ε·Q(ρ_t)·√(1+ρ_t²) (universal Q-function); range-based Bayesian belief updates from observed buy/sell/no-trade with bounds (z⁻, z⁺). Converges fast initially but adapts exponentially slowly after later shocks (overconfidence).
3. **BMM innovations:** (a) arbitrary trade sizes via mini-order heuristic — split Q into chunks of size α, quote VWAP of sequential fictitious ZP executions: ask = p(Q) = (1/Q)·Σ α_i·p_i; (b) shock adaptation via **consistency index** C(history) = L(μ_t, 2σ_t) − L(μ_t, σ_t), where L(μ,σ) = ∫ N(v;μ,σ)·∏_{i=1}^{W}(Φ(z⁺_i,v,σ_ε) − Φ(z⁻_i,v,σ_ε)) dv over a window W of recent trades; if C > 0, **σ_{t+1} = 2σ_t**. Single-spot-price interface: trader sees only the infinitesimal price, requests a side and size, gets a VWAP quote, may accept or cancel — canceled trades are informative (z⁻ = p_t, z⁺ = p(Q)).
4. **Parameterization:** LMSR b = 125; BMM μ_0 = 50, σ_0 = 12, σ_ε = 5, window W = 5 (experiments 1–2) then 10 (experiments 3–6).

## Equations / math / assumptions
- LMSR: ρ(q_t) = e^{q_t/b}/(1+e^{q_t/b}); C(Q;q_t) = b ln(1+e^{(q_t+Q)/b}) − b ln(1+e^{q_t/b}); max loss = b·ln 2 ≈ 8664.34 at b = 125.
- Fluctuation magnitude: sinh(Q/b)/(cosh(q_eq/b) + cosh(Q/b)); spread δ(Q) = (b/Q)·ln((cosh q_t/b + cosh Q/b)/(2cosh² q_t/2b)).
- BMM: belief update μ_{t+1} = μ_t + σ_t·B/A; σ_{t+1}² = σ_t²(1 − (AC+B²)/A²) with A,B,C functions of (z⁻, z⁺, μ_t, ρ_t, σ_ε); consistency index as above; spread = ask − μ_t = σ_ε·Q(ρ_t)·√(1+ρ_t²).
- Gaussian beliefs/signals assumed throughout; W is the master tradeoff knob.

## Features / target
Methodology/market-design paper — no prediction target; the evaluated quantities are market-maker profit/loss, spread, and RMSD of price from true value.

## Validation
- **Simulation (1,000 runs, matched average spread):** Gaussian shocks — BMM profit **+2081.35** vs LMSR **−2457.30**; RMSD **2.92 vs 5.38**; max loss 9479.82 vs 8662.32 (≈ LMSR's theoretical bound 8664.34). Uniform (adversarial) shocks — BMM profit +603.40 vs −1897.98; RMSD 8.78 vs 10.79; but BMM max loss **50,183.77** vs 8,384.42 — BMM is NOT loss-bounded.
- **Live trading (Table 3):** BMM profit beats LMSR in **5 of 6** experiments (e.g., Equilibrium(1): 47,231.77 vs −1,350.12, though ~30,000 came from one rogue trader buying at 100; IndivInfoShock: 20,226.44 vs −92.29); post-convergence RMSD_eq strongly favors BMM (LimitedInformation: 0.93 vs 14.56; Equilibrium(5): 1.00 vs 8.15). Counter-case: Equilibrium(4) — BMM lost **−10,588.86** vs LMSR −2,619.07 (misled when the true value was below the 50 starting point and traders had to sell endowments).
- **General law established:** inherent tradeoff between adaptability to shocks and convergence in equilibrium (and expected loss).

## Exact results with baselines
- Headline: at matched liquidity, BMM — profit +2,081 vs LMSR −2,457; price-discovery RMSD 2.92 vs 5.38 (Gaussian-shock sims); live profit wins 5/6.
- Caveat quantified: BMM worst-case loss ~6× LMSR's bound under adversarial uniform shocks.

## Code / data availability
No code or data link. All formulas fully specified; experimental platform described but not released.

## Leakage
N/A — market-design study.

## Limitations
- Tiny human samples (9–17 traders); student subjects, one rogue trader drove large profit swings; incentives (gift cards/extra credit) are weak vs real markets.
- BMM not loss-bounded — the worst case is genuinely bad (50k vs 8.4k); window W is its own tuning "black art" (5 → 10 across sessions).
- Pure dealer market; no limit order book integration; Gaussian assumptions; binary/continuous-value markets, not fixed-odds sports.

## GSE overlap vs existing-research-map
- **Gap #3 (market microstructure)**: the corpus has no model of *how the bookmaker sets lines* — this paper supplies one: treat the book as a Bayesian market maker with belief (μ_t, σ_t²), line = posterior mean, line-move size ∝ uncertainty, widen on inconsistent (one-sided) flow.
- Complements ledgers 0862/0863: those describe crowd vote dynamics; this describes the dealer's optimal response to them.

## Implementation spec (GSE adaptation)
1. **Bookmaker-as-BMM model for market-implied probabilities:** maintain a Gaussian belief over the "true" de-vigged probability; update on observed line moves using the range-based update logic (a line move toward the favorite that then holds = accepted trade, informative; a steam move that reverses = canceled trade, less informative). Line = μ_t; the book's *uncertainty* σ_t becomes GSE's confidence weight on the market-implied number in the ensemble.
2. **Consistency-index steam detector:** compute C(history) over a window of recent line moves (or ticket/handle flow if available); when recent flow is one-sided and inconsistent with current belief (C > 0), *increase* uncertainty (widen the effective spread) rather than mechanically following the move — this is the principled version of "don't chase steam."
3. **Adaptivity/convergence tradeoff as a design rule:** GSE's line-tracking filter needs the same knob BMM's window W provides — fast adaptation after injury news (shock) vs tight convergence in quiet markets. Tune it explicitly on historical news-event data rather than leaving it implicit.

## Reproducible test
1. Implement the BMM belief update on historical NFL line time series around known shocks (e.g., QB injury announcements): measure how fast μ_t reaches the post-news line vs a naive follow-the-line baseline, and whether the consistency index fires (C > 0) at the shock.
2. Gate: C(history) must fire on ≥80% of known news shocks with <20% false-fire rate in quiet windows; otherwise the transfer fails.

## Numeric gate
**Sims: BMM profit +2,081 vs LMSR −2,457; RMSD 2.92 vs 5.38 (Gaussian shocks); live: BMM beats LMSR profit 5/6 experiments; BMM unbounded max loss 50,184 vs LMSR bound 8,664.** For GSE: the gate is the shock-detection precision/recall above — not BMM's profit numbers, which belong to a dealer GSE isn't.

## Improvement experiment
Replace the fixed doubling rule (σ → 2σ) with a news-aware jump: when an external news classifier (ledgers 0858–0860 territory) confirms a genuine information event, allow an immediate larger variance reset; when no news is present, use a smaller multiplier. This targets BMM's weakness (false uncertainty increases on random one-sided flow) while keeping its shock adaptivity.

## Verdict
**ADAPT.** The BMM framework gives GSE a principled model of bookmaker line-setting under asymmetric information — belief, uncertainty-driven spreads, and a consistency-index shock detector — plus the adaptivity/convergence/loss tradeoff as an explicit design rule for the line-tracking filter. Not adoptable wholesale (GSE isn't a dealer; BMM's unbounded loss is a dealer's problem), but the components transfer.
