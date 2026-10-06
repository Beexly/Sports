# [1745] Gambling and Rényi Divergence (arXiv:1901.06278)

## 1. Citation and full-text-read statement
**Citation:** Cédric Bleuler, Amos Lapidoth, Christoph Pfister (ETH Zurich) (2019). *Gambling and Rényi Divergence*. arXiv:1901.06278. URL: https://arxiv.org/abs/1901.06278
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; proofs in Section IV skimmed for statements, theorems/propositions read in full).
**Verdict:** ADAPT — one sentence: the one-parameter β-utility family gives GSE a closed-form fractional-Kelly-like risk dial and an information-theoretic decomposition of edge for mutually-exclusive-outcome markets, but it is pure theory with no empirical validation, so the β↔fraction mapping must be calibrated on GSE data.

## 2. Research question
For gambling on horse races (mutually exclusive outcomes with bookmaker odds), what betting strategies maximize a one-parameter family of utility functions U_β = (1/β) log E[S^β] that contains Kelly's logarithmic criterion (β→0) and the expected-return criterion (β=1) as special cases — and what is the connection to Rényi divergence, including when the gambler has side information?

## 3. Method / model
Analytic derivation. Setup: m horses, win probabilities p_i > 0, bookmaker odds o_i (decimal, "for 1"), gambler allocates fractions b_i ≥ 0 of wealth γ_0; wealth relative S = b_X o_X where X is the winning horse. Maximizes U_β = (1/β) log E[S^β] over probability-vector allocations b (full investment), then extends to partial investment (cash reserve b_0 > 0, Props. 9–10) and to side information Y observed before betting (Theorem 6, via a novel conditional Rényi divergence). Rényi order α matched to β via α = 1/(1−β).

## 4. Mathematics / equations / assumptions
- Wealth relative: S ≜ b_X o_X (1); wealth after n races γ_n; doubling rate lim_{n→∞} (1/n) log(γ_n/γ_0) = E[log S] a.s. (2).
- Utility: U_β ≜ (1/β) log E[S^β] (3) = log[ Σ_i p_i (b_i o_i)^β ]^{1/β} (4) — log of a weighted power mean. β ∈ {−∞, 0, 1, ∞} give min / geometric mean / arithmetic mean / max of {b_i o_i}.
- Rényi divergence of order α: D_α(p_X‖q_X) ≜ 1/(α−1) log Σ_x p(x)^α q(x)^{1−α} (5).
- Novel conditional Rényi divergence: D_α(p_{X|Y}‖q_{X|Y}|p_Y) ≜ α/(α−1) log Σ_y p(y) [Σ_x p(x|y)^α q(x|y)^{1−α}]^{1/α} (6) — stated to differ from other conditional-Rényi definitions in the literature.
- Theorem 1 (β ∈ (−∞,0)∪(0,1), b a probability vector): (1/β) log E[S^β] = log c + D_{1/(1−β)}(p‖r) − D_{1−β}(g‖b) (9), with g_i ≜ p_i^{1/(1−β)} o_i^{β/(1−β)} / Σ_j p_j^{1/(1−β)} o_j^{β/(1−β)} (10); b = g uniquely maximizes U_β. Three-term reading: log c = odds fairness only (subfair c<1, fair c=1, superfair c>1); D_{1/(1−β)}(p‖r) = bookmaker's probability-estimate error (zero iff odds ∝ 1/p_i); −D_{1−β}(g‖b) = gambler's allocation error (zero iff b=g).
- Proposition 2 (β→0): recovers E[log S] = log c + D(p‖r) − D(p‖b) (12); optimal b_i = p_i (proportional/Kelly betting).
- Proposition 3 (β≥1): (1/β) log E[S^β] ≤ log max_i (p_i^{1/β} o_i) (13); optimal = all wealth on one horse (the argmax) — "risky: if that horse loses, the gambler will be broke."
- β→+∞: all on argmax o_i (maximizes best-case payoff, ignores probabilities). β→−∞: b_i = c/o_i (maximizes worst-case payoff; risk-free, S = c regardless of winner).
- Side information (Theorem 6): optimal strategy with pre-bet observation Y expressed via the conditional Rényi divergence of (6); properties in Props. 7–8.
- Partial investment (Props. 9, Theorem 10): with cash reserve b_0^*>0, optimal b_i^* = γ_i b_0^* with Γ normalizing constant from Eqs. (89)–(96); only bet when the "fairness" condition 1 − Σ_{i∈J} 1/o_i > 0 holds.
- Assumptions: p_i > 0, o_i > 0; i.i.d. races with constant odds/probabilities for the growth-rate statement; gambler reinvests all wealth each race.

## 5. Dataset / schema
None — pure information-theoretic theory paper. No datasets, no simulations, no empirical results.
## 6. Features and target
Not applicable (theory). The "inputs" are the probability vector p, odds vector o, and risk parameter β; the "output" is the optimal allocation b^*(β).

## 7. Validation design
None — analytic proofs only, no simulations or backtests.

## 8. Exact results and baselines with numbers
No numerical results reported. Results are closed-form characterizations: the optimal allocation b^*(β) = g (Eq. 10) for all β<1, the single-horse corner solutions for β≥1, and the three-term decomposition (9).

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
No empirical validation whatsoever — the β-family's practical behavior (drawdowns, growth, sensitivity to misestimated p) is untested; the i.i.d. constant-odds assumption behind the doubling-rate claim fails for sports markets (odds move, edges decay); the mutually-exclusive-outcome setup covers moneylines/parlay legs but not simultaneous independent bets (spreads/totals across games); the side-information result assumes the conditional distribution p(x|y) is known exactly — the estimation-error problem is assumed away; no connection drawn to fractional Kelly (the β<0 region is more conservative than Kelly, but the paper never prices its growth/drawdown tradeoff).

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE's sizing lane has Kelly "mentioned 12×, no paper read" and no deployed fractional-Kelly machinery; the engine outputs win probabilities and the market gives odds, but there is no information-theoretic edge accounting. The decomposition (9) is new capability: it splits realized utility into bookmaker unfairness (log c — the vig), bookmaker mispricing D(p‖r) (the edge, in bits), and allocation error D(g‖b) (the staking mistake) — a per-bet diagnostic GSE does not currently compute. Complements wave-4's "Risk-Constrained Kelly for Mutually Exclusive Outcomes" (a constrained-optimization treatment) with a closed-form parametric family instead.

## 12. Implementation specification
Build a "β-Kelly" sizing module for GSE's mutually-exclusive markets (moneylines, single-game props with discrete outcomes): (a) inputs: engine win probabilities p, decimal odds o from the odds API; (b) compute c (vig/fairness), the edge term D_{1/(1−β)}(p‖r), and the closed-form allocation g(β) from Eq. (10) for a grid β ∈ {−2, −1, −0.5, −0.25, 0}; (c) map β to an effective fractional-Kelly by matching the allocation's variance to f-Kelly on a calibration set; (d) log the three decomposition terms per bet as edge diagnostics in the pick record. Effort: ~1 day (closed form, no training).

## 13. Reproducible test
Dataset: 2023–2025 NFL moneyline picks with engine probabilities and closing decimal odds. For each β in the grid, simulate bankroll growth staking g(β) (normalized, with cash reserve per Theorem 10 when c<1 makes some horses unbettable). Baselines: full Kelly (b=p), half-Kelly, flat. Metrics: terminal log growth, max drawdown, and the decomposition terms' correlation with realized P&L. Verify the closed form first: assert b^*(β→0) = p numerically.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the β-dial as GSE's moneyline staking rule if some β<0 beats half-Kelly on terminal log growth with max drawdown ≤ 0.8× half-Kelly's drawdown over the 2023–2025 window, with the winning β stable across season-halves; REJECT (stay with fractional Kelly) otherwise. Improvement experiment: replace the point probabilities p with the engine's posterior (or conformal) distribution over p and maximize E_p[U_β] — a Bayes-β-Kelly that folds estimation error into the allocation; test whether the optimal β drifts toward 0 (less tempering needed) as probability uncertainty is internalized, which would unify this paper with the estimation-error lane (2312.10331).

**Verdict:** ADAPT — closed-form β-family and edge decomposition are directly usable for mutually-exclusive markets, but the β↔fraction mapping and growth/drawdown behavior must be calibrated empirically since the paper offers no numbers.
