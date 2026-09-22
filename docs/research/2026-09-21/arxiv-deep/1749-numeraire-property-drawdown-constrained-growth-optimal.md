# [1749] The Numéraire Property and Long-Term Growth Optimality for Drawdown-Constrained Investments (arXiv:1206.2305)

## 1. Citation and full-text-read statement
**Citation:** Constantinos Kardaras (LSE), Jan Obłój (Oxford), Eckhard Platen (UTS) (2012). *The Numéraire Property and Long-Term Growth Optimality for Drawdown-Constrained Investments*. arXiv:1206.2305. URL: https://arxiv.org/abs/1206.2305
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; theorem statements and the Azéma–Yor construction read in full, proofs in Appendix A skimmed).
**Verdict:** ADAPT — one sentence: the drawdown-constrained growth-optimal portfolio gives GSE a principled drawdown governor (state-dependent fraction in the Kelly fund vs cash, set by the acceptable drawdown parameter α), but the continuous-semimartingale machinery must be discretized to weekly betting and the α↔fraction rule implemented numerically.

## 2. Research question
For a long-run investor restricted to strategies satisfying a linear drawdown constraint (wealth never below α × running maximum), does a growth-optimal (numéraire) strategy exist within the constrained class, is it unique, and can it be expressed explicitly in terms of the unconstrained growth-optimal (Kelly) portfolio?

## 3. Method / model
Market: d-dimensional continuous semimartingale S (discounted by a baseline asset); wealth processes X = 1 + ∫(H, dS). Admissible class: nonnegative wealth processes satisfying the α-drawdown constraint (α ∈ [0,1)). Introduces the numéraire property via expected relative return. Key tool: the Azéma–Yor transformation (Carraro et al. 2012 general semimartingale version) — an explicit, model-independent bijection between all wealth processes and drawdown-constrained ones. Shows the Azéma–Yor transform ^αX̂ of the unconstrained numéraire X̂ has the numéraire property within the α-drawdown-constrained class, asymptotically and when sampled at times of its maximum; uniqueness along stopping-time sequences tending to infinity; turnpike theorem (3.6): asymptotically growth-optimal = limit of finite-horizon numéraire strategies.

## 4. Mathematics / equations / assumptions
- Wealth: X = 1 + ∫_0^· (H_t, dS_t), H predictable, S-integrable.
- Drawdown constraint: X_t ≥ α · max_{s≤t} X_s (linear, α ∈ [0,1)).
- Numéraire property (via expected relative return): X̂ such that X/X̂ is a nonnegative local martingale (unconstrained case, Theorem 1.3 under no-arbitrage-of-first-kind (A1) + long-run growth (A2)).
- Azéma–Yor transform ^αX̂: model-independent, pathwise function of X̂ and its running maximum; has the numéraire property in the constrained class.
- Operational form: "investing at each time a fraction of current wealth — depending on the current level of drawdown — in the fund represented by X̂ and the remaining fraction in the baseline asset." With savings account as baseline, X̂ and ^αX̂ share the same instantaneous Sharpe ratio; both on the Markowitz efficient frontier; ^αX̂ "trades off long-term growth for a path-wise capital guarantee in the form of a drawdown constraint."
- Decomposition: modeling → construct X̂ (the Kelly fund); preferences → choose α.
- Assumptions: frictionless market, continuous price paths, no arbitrage of the first kind, sufficient long-run market growth; finite-horizon optimizers may depend on horizon (no uniform supermartingale property in constrained class).

## 5. Dataset / schema
None — pure stochastic-analysis theory in a general continuous semimartingale market model. Appendix B gives an illustrative example.
## 6. Features and target
Not applicable (theory). Inputs: the unconstrained numéraire portfolio X̂, drawdown parameter α. Output: the constrained-optimal wealth process ^αX̂ and its state-dependent risky fraction.

## 7. Validation design
None empirical; illustrative example in Appendix B.

## 8. Exact results and baselines with numbers
No numerical results. Theoretical: existence/uniqueness of the drawdown-constrained numéraire; explicit Azéma–Yor construction; turnpike convergence; same-Sharpe/frontier placement result.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Continuous-time, frictionless, continuous-path market — sports betting is discrete-time with fixed event dates and no continuous rebalancing; the Azéma–Yor fraction rule is stated as "depending on the current level of drawdown" but the explicit discrete-time formula must be reconstructed from the transform (paper works in continuous time); finite-horizon strategies depend on horizon (no clean finite-season statement); assumes the unconstrained Kelly fund X̂ is known — the estimation-error problem is untouched; no transaction costs.

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE has no drawdown-control layer on its staking — no α parameter, no governor. Wave-4's drawdown ledgers ("You are in a drawdown," drawdown-modulated feedback control, stop-loss thresholds) are diagnostic/reactive; this paper is the constructive counterpart: a growth-optimal strategy that NEVER violates the drawdown bound by construction, via a state-dependent Kelly-fund/cash mix. It sits naturally on top of ledgers 1744 (KellyBoost portfolio = the X̂ fund) and 1746 (leverage dial): X̂ = growth-optimal pick portfolio; the governor scales exposure by drawdown state. New capability: pathwise capital guarantee.

## 12. Implementation specification
Build the "α-governor": (a) maintain bankroll B_t and running max M_t; current drawdown state d_t = B_t/M_t; (b) each week, compute the unconstrained growth-optimal portfolio X̂ (from 1744's KellyBoost or 1746's two-knob sizer); (c) risky fraction π(d_t; α) from the Azéma–Yor rule — implement the discrete-time version: scale the Kelly stakes by π = max(0, (d_t − α)/(1 − α))-style linear rule as a first approximation (exact: π = 1 − α/d_t, i.e., risk only the cushion above the α floor — the standard drawdown-control rule this literature implies), remainder in cash; (d) α chosen by Garrett's risk preference (start α = 0.7, i.e., never lose >30% from peak). Effort: ~1 day (state tracker + scaling wrapper around the existing sizer).

## 13. Reproducible test
Dataset: 2023–2025 NFL backtest of the 1744/1746 sizer with and without the α-governor (α ∈ {0.5, 0.7, 0.8}). Metrics: terminal log growth, max drawdown (must satisfy ≤ 1−α by construction — verify the guarantee holds on discrete weekly data), fraction of weeks at reduced exposure, Sharpe. Baselines: unconstrained sizer, fixed half-Kelly. Verify the discrete-time guarantee: assert min_t(B_t/M_t) ≥ α − tolerance.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the α-governor if the guaranteed drawdown bound holds empirically (min B_t/M_t ≥ α − 0.02) while terminal log growth is ≥ 80% of the unconstrained sizer's (i.e., the guarantee costs ≤ 20% of growth); REJECT if the governor whipsaws (frequent full-cash weeks destroying growth). Improvement experiment: make α adaptive — tighten α after calibration-error spikes (link to 1748's σ tracker) and relax it in well-calibrated regimes; test whether adaptive-α beats fixed-α on drawdown-adjusted growth. This fuses the drawdown guarantee with the estimation-error gate.

**Verdict:** ADAPT — the Azéma–Yor drawdown governor is the principled capital-guarantee layer GSE's staking stack lacks, but it needs discrete-time implementation and empirical pricing of the growth cost of the guarantee.
