# [0820] Risk-Constrained Kelly Gambling (arXiv:1603.06183)

**Citation:** Enzo Busseti, Ernest K. Ryu, Stephen Boyd (2016). *Risk-Constrained Kelly Gambling*. arXiv:1603.06183. URL: https://arxiv.org/abs/1603.06183
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; 71KB; read §§1–7 in full).
**Verdict:** ADAPT — the drawdown-probability bound E[(r'b)^{−λ}] ≤ 1 ⇒ P(W_min < α) < β with λ = log β/log α, and the resulting convex risk-constrained Kelly (RCK) problem, give GSE a principled fractional-Kelly dial: maximize log-growth subject to a hard guarantee on bankroll-drawdown probability. Directly implementable, with the paper's own numbers showing the bound is tight (~30% above realized risk).

## 1. Research question
The Kelly criterion maximizes long-run growth but can produce brutal drawdowns (in their example, ~40% chance of losing 30% of wealth). Can we add a drawdown-risk constraint P(W_min < α) < β to Kelly gambling while keeping the problem convex and tractable? The paper derives a sufficient bound on drawdown probability that is convex in the bet vector b, yielding the risk-constrained Kelly (RCK) problem, plus a quadratic approximation (QRCK) connected to Markowitz mean-variance.

## 2. Dataset / schema
Synthetic: (a) finite outcomes — n=20 (19 risky bets + cash), K=100 outcomes; π_i uniform-normalized; returns uniform[0.7,1.3] with 30 entries set to 0.2 and 30 to 2 (~45% chance of an extreme return in a draw); (b) infinite-outcome example (§7.2). Evaluation: 10,000 Monte Carlo wealth trajectories, t=1..100. No real data — this is a methods paper validated by simulation.

## 3. Method / model
Kelly setup: bet fractions b ≥ 0, 1'b = 1 (b_n = cash, r_n = 1 a.s.); wealth multiplies by r'b each round; maximize E[log(r'b)]. Drawdown risk: P(W_min < α), W_min = min_t w_t. Key result (Eq. 6): for λ = log β/log α, E[(r'b)^{−λ}] ≤ 1 ⟹ P(W_min < α) < β — proved via the stopping time τ = inf{t : w_t < α} and a change-of-measure/martingale argument (Appendix Lemma 5). RCK problem (Eq. 7): maximize E[log(r'b)] s.t. 1'b=1, b≥0, E[(r'b)^{−λ}] ≤ 1 — convex (constraint is convex in b; objective concave). λ→0 recovers unconstrained Kelly. QRCK (§6): quadratic Taylor approximation of the log objective around b=e_n → a Markowitz-like mean-variance problem; λ acts as the risk-aversion knob trading growth vs drawdown risk. Infinite-outcome case handled via sampling/convex-optimization machinery from §2.

## 4. Equations & assumptions
Wealth: w_t = w_{t−1}(r_t'b). Bound: E[(r'b)^{−λ}] ≤ 1 ⇒ P(W_min < α) < β, λ = logβ/logα (Eq. 6). RCK: max_b E[log(r'b)] s.t. 1'b=1, b≥0, E[(r'b)^{−λ}] ≤ 1 (Eq. 7). QRCK: quadratic approximation ≈ Markowitz with risk aversion ∝ λ.
Assumptions (stated): E[r_i] < ∞; one risk-free "bet" with certain return 1 (cash); bets are repeated i.i.d. rounds with the same return distribution; b fixed across rounds (no rebalancing rule beyond fixed fractions). The bound is sufficient, not necessary — feasible set is a restriction of the true drawdown-constrained problem.

## 5. Features / target
Decision variable: bet fraction vector b. Target: maximize expected log-growth subject to the drawdown-probability guarantee. Horizon: indefinite repeated play; simulations over 100 rounds.

## 6. Validation design
Monte Carlo: 10,000 trajectories × 100 rounds per bet vector; compares Kelly vs RCK (λ=6.456, 5.5) vs QRCK (λ=0, 6.456, 2.8) on growth rate E[log(r'b)], the analytic bound e^{λlogα}, and realized P(W_min<α). No real data, no out-of-sample protocol beyond fresh simulation draws — appropriate for a methods paper but the tightness claim rests on the authors' chosen data-generating process.

## 7. Numerical results / baselines
Table 1 (α=0.7, β=0.1): Kelly — growth 0.062, realized drawdown risk 0.397 (40% chance of a 30% drawdown); RCK λ=6.456 — growth 0.043, bound 0.100, realized 0.073; RCK λ=5.5 — growth 0.047, bound 0.141, realized 0.099. True constrained optimum growth lies in [0.047, 0.062]. Table 2 (QRCK): λ=0 — 0.054/1.000/0.218; λ=6.456 — 0.027/0.100/0.025; λ=2.8 — 0.044/0.368/0.100 (at matched 10% risk, RCK growth 0.047 > QRCK 0.044 — the exact convex form beats the quadratic approximation). Bound tightness: "typically around 30% or so higher than the actual risk" across many instances (Figure 2). These are the paper's claims on synthetic data.

## 8. Code / data availability
No code or data; method fully specified (convex program solvable with cvxpy/ECOS; Monte Carlo described exactly).

## 9. Leakage & limitations
- Synthetic validation only; the 30%-tightness claim is on the authors' DGP (heavy-tailed by construction: 0.2/2.0 spikes).
- Fixed-fraction, i.i.d.-round assumption: real betting has time-varying edges and correlated simultaneous bets; the bound is per-round-distribution, not per-slate.
- The RCK constraint is sufficient but not necessary — leaves growth on the table vs the true constrained optimum (gap 0.043 vs ≤0.062).
- No shorting/leverage beyond b≥0; sportsbooks don't offer the "cash" asset cleanly (unbet bankroll earns ~0, fine).
- λ must be chosen: the paper hand-tunes λ=5.5 to hit β≈0.1 — in practice this needs a calibration loop.

## 10. GSE overlap
Existing-research map: Kelly appears 12×; ledger 0813 (Kelly game diversification) and 0816 (logistic Skeptic) are the closest reads. Nothing in the map constrains Kelly by drawdown probability — fractional Kelly is used heuristically, never derived from a drawdown guarantee. This paper supplies the missing derivation: fractional-Kelly-as-drawdown-constraint. Connects to sizing lane and ledgers 0817/0818 (drawdown risk).

## 11. GSE implementation spec
Adaptation: replace heuristic fractional Kelly with RCK. For each pick, engine gives win prob p̂ and decimal odds o (binary outcome — the two-outcome special case the paper notes has closed forms); choose stake fraction b solving max E[log(1+b(X))] s.t. E[(1+bX)^{−λ}] ≤ 1 with λ = logβ/logα, e.g., α=0.7 (tolerate 30% bankroll drawdown), β=0.05 (5% chance). Calibrate λ on the picks DB so realized drawdown frequency matches β. Multi-pick slates: extend b to a vector over simultaneous picks with the joint outcome distribution (ties to ledger 0819's slate allocator). Effort: ~3–4 days (binary-outcome RCK solver + calibration loop + backtest).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks) with engine probs and closing odds. Protocol: walk-forward 2024→2025; per pick solve RCK (α=0.7, β=0.05) vs (a) full Kelly, (b) half Kelly heuristic; simulate bankroll paths. Metric: log-growth, realized P(drawdown > 30%), max drawdown. Baseline: half Kelly. Also verify the bound empirically: check realized drawdown frequency ≤ β on the holdout.

## 13. Acceptance / rejection gate
ADAPT if RCK achieves ≥90% of half-Kelly's log-growth while realized drawdown frequency stays ≤ β on the 2025 holdout (i.e., the guarantee holds out-of-sample and the growth cost is small) — else keep the heuristic fractional Kelly and note RCK as tested.

## 14. Improvement experiment
Two extensions: (1) Time-varying λ: make the risk-aversion parameter regime-dependent (tighten λ when the engine's recent calibration degrades — the ledger-0816 "rainy season" analog); test whether adaptive-λ beats fixed-λ on risk-adjusted growth. (2) Slate-level RCK: generalize the scalar bound to the multi-pick vector case using the joint distribution of same-week picks (correlated Bernoulli outcomes), and compare against the ledger-0819 MPC slate allocator — the two approaches (chance-constrained Kelly vs tracking MPC) are natural competitors for the same staking slot.
