# [1748] Gambling under unknown probabilities as a proxy for real world decisions under uncertainty (arXiv:2312.10331)

## 1. Citation and full-text-read statement
**Citation:** David J. Aldous (UC Berkeley), F. Thomas Bruss (Université Libre de Bruxelles) (2020; published Amer. Math. Monthly 130 (2023) 303–320). *Gambling under unknown probabilities as a proxy for real world decisions under uncertainty*. arXiv:2312.10331. URL: https://arxiv.org/abs/2312.10331
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; toy-model derivations read, discussion sections 8–9 skimmed).
**Verdict:** ADAPT — one sentence: the closed-form expected-growth-under-estimation-error formula gives GSE a principled edge-vs-RMSE betting gate (only bet when |edge| exceeds probability-estimation error), but the even-odds/small-edge approximations must be re-derived for general sports odds before deployment.

## 2. Research question
In competitive interactions under uncertainty where agents act on perceived probabilities of only roughly-known accuracy (measured by mean-squared error), can one formalize the intuition that more accurate probability estimators do better — and specifically, what does estimation error cost a Kelly bettor who sizes stakes from perceived rather than true probabilities?

## 3. Method / model
Framework: bet size proportional to perceived advantage (p_perc − p_implied); estimator accuracy measured by MSE. Six toy models: (1) gentleman's bet (two agents, differing perceived probabilities); (2) bookmaker vs gambler perception gaps; (3) "bet I'm better than you" (even-odds bets conditional on each believing they're more skillful); (4) Kelly rules under unknown probabilities; (5) "pistols at dawn" (timing under uncertainty); (6) prediction markets (contracts bought ∝ κ(p_perc − p_implied), "roughly the Kelly strategy"). Kelly section: even-odds bets, true probability 0.5+δ (small δ), perceived δ_perc = δ_true + ξ with ξ ~ Normal(0, σ²); stake a = max(0, 2δ_perc) (the Kelly fraction for perceived edge); realized growth evaluated at the TRUE δ.

## 4. Mathematics / equations / assumptions
- Kelly growth rate (even odds, small edge δ, stake fraction a): growth rate = 2aδ − a²/2 (16); known-δ optimum a = 2δ, optimal growth 2δ².
- Under estimation error (δ_perc = δ + ξ, ξ~N(0,σ²), staking a = max(0, 2δ_perc)): realized growth = 2(δ_true² − ξ²) if ξ > −δ_true, else 0.
- Expected growth: E[growth rate] = 2(δ²−σ²)Φ(δ/σ) + 2σδφ(δ/σ) (17), with S(y) := E[Z²1(Z>y)] = yφ(y) + Φ(−y), φ/Φ standard normal pdf/cdf. "For δ>0 we see the usual 'quadratic' behavior in both δ and σ."
- Core implication (my reading, directly from (17)): the (δ²−σ²) term dominates — expected Kelly growth is positive only when the true edge exceeds the estimation-error standard deviation (|δ| ≳ σ); estimation variance enters quadratically and negatively.
- Authors' note: "could agents do better if they knew the typical accuracy of their perceived probabilities and adjusted their actions somewhat?" — preliminary study "found it difficult to improve on the growth rate (17)," i.e., naive Kelly on perceived probs is hard to beat even knowing σ, but the gate (bet only if δ_perc/σ large) is the actionable margin.
- Assumptions: even odds; δ small (first-order approximation); p_true not near 0 or 1; ξ normal; Kelly's "available favorable bets" requirement (game against nature, no agent interaction in §5).

## 5. Dataset / schema
None — analytic toy models (6 of them) with numerical illustrations of closed-form expressions. No real data.
## 6. Features and target
Not applicable (theory). Inputs: true edge δ, estimation-error std σ. Output: expected log-growth rate under Kelly staking on perceived probabilities.

## 7. Validation design
None empirical — analytic derivation with numerical evaluation of (17).

## 8. Exact results and baselines with numbers
No empirical numbers. Analytic results: (17) in closed form; Figure 3 shows "the usual error-squared behavior" of gains vs opponent error; the qualitative finding that expected growth under perceived-probability Kelly scales as (δ²−σ²) — estimation error must be smaller than edge for positive expected growth.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Even-odds + small-δ approximations don't cover general sports odds (the Kelly fraction a=2δ is specific to even odds; for decimal odds o the fraction is (bp−q)/b); normal error model for ξ is assumed, not estimated; p_true bounded away from 0/1 excludes longshots (props!); no correlation across simultaneous bets; the "difficult to improve on (17)" remark is preliminary and unquantified; toy models, no sports data.

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE tracks calibration (ECE, temperature scaling, CQR) but has NO rule linking calibration error to stake sizing — the engine bets its point probabilities at face value. This paper supplies the missing link: σ in (17) is exactly the engine's probability-estimation RMSE (measurable from calibration history), and δ is the perceived edge vs the market. It complements ledger 1746 (Markov's compound-distribution uncertainty, which models the same error structurally) and 1744/1745 (which assume p known). New capability: an estimation-error-aware betting gate.

## 12. Implementation specification
Build the "δ/σ gate" for GSE stakes: (a) estimate σ per market type (spread/moneyline/total, and per edge bucket) as the RMSE of engine win-prob vs realized outcomes on a rolling window (this is just the calibration curve's RMSE); (b) for each pick with perceived edge δ_perc = p_engine − p_market, compute the expected-growth factor from (17) with (δ=δ_perc, σ); (c) stake only if E[growth] > 0 with margin (e.g., δ_perc > 1.5σ), and scale the Kelly fraction by Φ(δ_perc/σ) (probability the perceived edge has the right sign); (d) re-derive (16)–(17) for general decimal odds before coding (replace a=2δ with f*=(bp−q)/b and redo the ξ-integration numerically). Effort: ~1 day (derivation + rolling-RMSE tracker + gate).

## 13. Reproducible test
Dataset: 2023–2025 NFL picks with engine p, market-implied p, outcomes. Compute rolling σ (probability RMSE) per market. Backtest: Kelly stakes with vs without the δ/σ gate (and vs Φ-scaled stakes). Baselines: ungated Kelly, half-Kelly. Metrics: terminal log growth, max drawdown, fraction of staked picks with δ_perc < σ (should go to ~0 under the gate). Sanity check: verify (17) numerically by Monte Carlo (sample ξ, stake max(0,2δ_perc), average realized growth) before trusting the gate thresholds.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the δ/σ gate if gated Kelly beats ungated Kelly on terminal log growth with max drawdown no worse, over 2023–2025, with the improvement concentrated in picks where δ_perc/σ < 1.5 (the gate's target population); REJECT if the gate just throws away good bets (growth drops). Improvement experiment: replace the normal-ξ assumption with the engine's empirical error distribution (bootstrap residuals from the calibration history) and recompute the optimal stake by direct numerical integration — a distribution-free version of (17); test whether heavy-tailed calibration errors (common in longshot props) push the optimal gate stricter than the normal model suggests.

**Verdict:** ADAPT — the (δ²−σ²) expected-growth formula is the principled edge-vs-error gate GSE's staking lacks, but it must be re-derived for general odds and validated against the engine's empirical error distribution.
