# [0305] Arbitrage-Free Combinatorial Market Making via Integer Programming (arXiv:1606.02825)

**Citation:** Christian Kroer, Miroslav Dudík, Sébastien Lahaie, Sivaraman Balakrishnan (2016). *Arbitrage-Free Combinatorial Market Making via Integer Programming*. arXiv:1606.02825v2. URL: https://arxiv.org/abs/1606.02825
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1135 lines).
**Verdict:** REJECT — prediction-market microstructure theory with no applicable GSE surface: GSE consumes odds, it doesn't run a combinatorial prediction market, and the Frank-Wolfe/IP machinery solves a problem Garrett doesn't have.

## 1. Research question
Can a cost-based combinatorial prediction market maker guarantee both bounded loss and (practically) no arbitrage — despite arbitrage-free pricing being #P-hard — by describing valid payoff vectors with an integer program and using an IP solver as a Frank-Wolfe oracle for Bregman projections onto the arbitrage-free price set? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Yahoo! Predictalot** combinatorial prediction market, 2010 NCAA Men's Division I Basketball Tournament (March 18 – April 5, 2010; 64 teams, 6 rounds, 2⁶³ outcome space).
- **93,036 bets placed; 63,689 retained (68%)** — 56% expressible as bundles over atomic tournament variables (game winners, team win counts), 12% comparison bets ("Duke wins more games than Cornell"); excluded: compound comparisons (6%), upset-count (3%), seed-sum (3%). Comparison bets = 17% of final dataset.
- Trade data contains shares purchased and total cost paid; initial Predictalot prices unavailable → price initialization from a 6-hour window (27→21 hours before first match); game-settling times handcrafted (settled 100 minutes after game start).
- **Access:** not shared; Yahoo! internal data.

## 3. Method / model
- **Cost-based market making (Sec. 2.1):** state θ ∈ ℝ^I (shares sold), cost function C convex; price of bundle δ = C(θ+δ)−C(θ); instantaneous prices p(θ)=∇C(θ). LMSR example: C(θ)=log(Σ_i e^θi), p_i(θ)=e^θi/Σ_j e^θj.
- **Arbitrage-free prices = marginal polytope M = conv(Z)**, Z = valid payoff vectors; arbitrage exists iff p(θ) ∉ M. Bregman projection µ* = argmin_{µ∈M} D(µ‖θ), D(µ‖θ)=R(µ)+C(θ)−θ·µ (mixed Bregman divergence, R = convex conjugate of C). Proposition 2.4: guaranteed arbitrage profit ≤ D(µ*‖θ), extracted by moving the market to a state with p(θ*)=µ*.
- **FWMM (Mechanism 1):** interleaves trades under C with (a) fast LCMM linear-constraint arbitrage removal and (b) full arbitrage removal via Bregman projection.
- **Projection via fully-corrective Frank-Wolfe (Algorithm 2, "ProjectFW"):** iterate (1) minimize F(µ)=R̄(µ)+C(θ)−θ·µ over conv(active vertices Z_{t−1}); (2) find descent vertex z^t = argmin_{z∈Z} (θ^t−θ)·z — implemented by an **IP solver call** (Gurobi 5.5); (3) add to active set. Z specified compactly as `Z = {z ∈ {0,1}^I : A'z ≥ b}` (2). FW gap g(µ)=max_{z∈Z} ∇F(µ)·(µ−z) bounds suboptimality; convergence O(L·diam(M)/t).
- Two FW adaptations: **contracted polytope** M₀=(1−ε)M+εu (Krishnan et al. 2015) to handle LMSR's unbounded boundary derivatives; **profit-guaranteed stopping** (Prop. 4.1: moving to θ̂=∇R̄(µ̂) guarantees profit ≥ D(µ̂‖θ)−g(µ̂); stop when g(µ_t) ≤ (1−α)D(µ_t‖θ) → extract ≥α-fraction of available arbitrage).
- **Partial outcomes (Sec. 3.2):** as games settle, switch to C_σ(θ)=sup_{µ∈V_σ}[θ·µ−R(µ)] (5) — prices of settled securities fixed to 0/1 (LMSR analog of conditioning). IP-based logical settling (Algorithm 3, InitFW) extends the partial outcome to securities implied by settled ones.
- **Compositional market design:** atomic tournament variables (team win counts X_t, game winners G_{r,t} with IP constraints z{X_t=r}=z{G_{r,t}=t}−z{G_{r+1,t}=t}), sums (Gaussian-initialized), comparisons (union-bound LCMM constraints tighter than LP relaxation). Initial prices Gaussian-discretized; projected onto LCMM polytope.
- Liquidity parameter b in C(θ)=b·Σ_j ln(Σ_x e^{θ_{j,x}/b}) (4); tested budgets {0.1, 1, 10, 100, 1000} at fixed b=150; each trade = new agent with constant budget; limit orders randomized from average price p̄ to 1 across 3 seeds.

## 4. Equations & assumptions
- `R(µ) := sup_{θ'} [θ'·µ − C(θ')]` (1); `D(µ‖θ) := R(µ) + C(θ) − θ·µ`
- `Z = {z ∈ {0,1}^I : A'z ≥ b}` (2)
- `M̃ = {µ ∈ ℝ^I : µ_i ∈ [0,1], A'µ ≥ b}` (3, LP relaxation)
- `C(θ) = b Σ_{j∈J} ln(Σ_{x∈X_j} e^{θ_{j,x}/b})` (4)
- `C_σ(θ) = sup_{µ∈V_σ} [θ·µ − R(µ)]` (5)
- `min_{µ∈M} F(µ)` (6), F(µ)=D(µ‖θ); `z^t := argmin_{z∈Z} ∇F(µ_t)·z`; gap `g(µ) := max_{z∈Z} ∇F(µ)·(µ−z)`
- Proposition 4.1: guaranteed profit ≥ D(µ̂‖θ) − g(µ̂); stop when `g(µ_t) ≤ (1−α)D(µ_t‖θ)`
- Stopping conditions of ProjectFW: (i) extract α-fraction of arbitrage; (ii) D ≤ ε_D (coherent prices); (iii) interrupted → non-negative profit guaranteed
- Assumptions: traders are risk-neutral, have sufficient budgets, and reveal beliefs by trading (standard); IP solver tractable on typical instances; comparison constraints via union bound are valid relaxations; the counterfactual replay (limit orders drawn from [p̄,1]) faithfully represents trader intentions.

## 5. Features / target
- **Inputs:** trade requests (bundles δ), per-trade budget; IP-constraint descriptions of securities; partial outcomes as games settle.
- **Target:** arbitrage-free, bounded-loss prices p(θ) on all securities; forecast accuracy (log-likelihood of realized outcomes).

## 6. Validation design
- Counterfactual replay of 63,689 Predictalot trades through three market makers: IND (independent LMSRs per variable), LCMM (linear constraints), FWMM (LCMM + Bregman projections).
- Metric: log-likelihood of realized values — average over variables and over purchased bundles, at hourly summaries + every 100 trades. 3 random seeds; budget sweep {0.1,1,10,100,1000}; projection time limit 30 minutes.

## 7. Numerical results / baselines
- Optimal budget: 10 for IND/LCMM, 100 for FWMM; LCMM/FWMM far less budget-sensitive than IND.
- **FWMM vs LCMM improvement:** variables 2.1%–5.6%, median 3.3% (all budgets/seeds); bundles 0.9%–3.2%, median 2.2%. Excluding the first 16 games (where they track together), median improvement rises to **12.4%** for securities, 5.6% for bundles.
- First successful Bregman projection completed only at timestamp 2010-03-21 13:58:50 (after 45 of 63 games settled) with the 30-min limit — projection is only feasible late in the tournament once the outcome space shrinks.
- Once projections succeed: accuracy improvement of FWMM over LCMM 0%–80% for variables (median 38%), 0%–44% for bundles (median 9%).
- Before the first projection, FWMM already occasionally exceeds LCMM via the IP-based partial-outcome extension (logical settling).
- Total runtime: ~5 hours to replay 22 days of trades on a standard workstation.

## 8. Code / data availability
None stated (Java implementation with Gurobi 5.5; Yahoo! data proprietary).

## 9. Leakage & limitations
- **The experiment is heavily synthetic:** initial prices, settling times, and the entire limit-order construction (drawn uniform from [p̄,1] with arbitrary budgets) are fabricated; the "trader beliefs" are inferred from realized average prices, circularly feeding prices into a price-accuracy test.
- Bregman projection only feasible with <30-min limit after 45/63 games settled — the method doesn't scale to large live outcome spaces in real time.
- Log-likelihood of bundle purchases rewards pricing accuracy on the *most-traded* securities, which is partly a liquidity artifact.
- **No connection to real sportsbook odds or to a real prediction-market operator's P&L** — it's a mechanism-design paper evaluated on replayed play-money data.

## 10. GSE overlap
Existing-research map (Sections 1–3): Polymarket/Kalshi tooling, oracle3 (Wang Transform + Kelly), and "prediction-market-ecosystem-triage" are inventoried — GSE *consumes* prediction-market prices as features, it does not *operate* a combinatorial market. **Nothing in the repo builds or needs a market maker.** The map has no arbitrage-detection or market-making lane at all. Out-of-scope by design: a new capability, but one with no consumer inside GSE's architecture (spread/moneyline/total engine + props + DFS).

## 11. GSE implementation spec
Not recommended (REJECT). If a prediction-market surface were ever built (e.g., a GSE community contest with internal credits), this paper would be the blueprint: LMSR cost function per variable family + IP-constraint specification of valid payoff vectors + Frank-Wolfe Bregman projection for arbitrage removal + LCMM fast-path. Effort for a real port: 6–10 engineer-weeks (IP solver integration, real-time projection budget). No current GSE lane justifies it.

## 12. Reproducible test
A mechanism-verification test (no GSE forecasting lane is involved): dataset = a self-constructed combinatorial market on the 2026 NFL playoff bracket (14 outcomes) with three security families (team-wins-Super-Bowl, team-wins-conference, division-represented-in-Super-Bowl), priced from The Odds API closing lines — a 14-outcome space small enough for exact IP. Implement (a) LCMM (per-family LMSR + cross-family arbitrage removal) and (b) the paper's FWMM (direct LMSR over the sum-of-payoffs outcome space + Frank-Wolfe Bregman projection to remove arbitrage). Generate a fixed synthetic limit-order flow (seeded RNG, documented in the run log). Metric: bundle log-likelihood of each mechanism's prices against the realized bracket on the test half of the order flow. Baseline: LCMM. Time window: one tournament replay (the 2025–26 NFL playoffs, January 2026). Gate: FWMM must beat LCMM on bundle log-likelihood by ≥ 5% median across 5 random order-flow seeds; if it cannot clear that bar on a 14-outcome space, the paper's mechanism advantage does not survive contact with real (non-synthetic) bookmaker-implied structure, and the rejection stands.

## 13. Acceptance / rejection gate
**Reject for the current program.** Adopt only if Garrett ever commissions a GSE-operated combinatorial prediction surface (real or play-money); the gate would then be a counterfactual-replay replication: FWMM must beat LCMM on bundle log-likelihood by ≥5% median on GSE's own contest data with a real (not synthetic) order flow.

## 14. Improvement experiment
For a hypothetical GSE prediction surface, the paper's bottleneck is the 30-minute projection limit. The authors' own suggestion — interleaving IP with local search to produce extra descent vertices instead of solving every IP to optimality — is the concrete follow-up: a hybrid local-search/IP Frank-Wolfe variant evaluated on how early in the tournament (i.e., how large the outcome space) projections become tractable. This is a real algorithmic advance over the paper's Algorithm 2.
