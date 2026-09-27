# [1358] Beating the Best Constant Rebalancing Portfolio in Long-Term Investment: A Generalization of the Kelly Criterion and Universal Learning Algorithm for Markets with Serial Dependence (arXiv:2507.05994v1)

**Citation:** Lam, D. K. (2025). *Beating the Best Constant Rebalancing Portfolio in Long-Term Investment: A Generalization of the Kelly Criterion and Universal Learning Algorithm for Markets with Serial Dependence*. arXiv:2507.05994v1 [q-fin.PM]. URL: https://arxiv.org/abs/2507.05994
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 19 pages, complete).
**Verdict:** ADAPT — the k-parallel Universal Portfolio (k-PUP) algorithm and the generalized Kelly criterion for block-wise i.i.d. markets give GSE a concrete, theoretically grounded way to exploit periodic structure (day-of-week effects, situational/rest spots, calendar anomalies) in its bankroll allocation: decompose the bet sequence into k periodic subsequences and run universal-portfolio allocation per subsequence, which provably beats the best constant (flat-Kelly) strategy in cumulative wealth; the stock-market experiments must be re-run on GSE's own bet history before any staking change.

## 1. Research question
Cover's Universal Portfolio is asymptotically consistent with the best constant-rebalancing portfolio in hindsight, yet its cumulative wealth lags far behind in practice. Can an online algorithm that exploits the market's *serial dependence* (e.g., day-of-week effects) eventually *exceed* the best constant strategy's cumulative wealth — without side information or distributional assumptions — and what is the Kelly criterion's generalization to markets with periodic dependence? (Sec. 1)

## 2. Dataset / schema
CRSP daily adjusted closing prices (USD), 1992-12-31 to 2019-12-31: 6,798 trading days, 27 years. Four NYSE/NASDAQ blue chips: Honeywell (HON), Boeing (BA), AMD, JPMorgan (JPM). k-PUP strategies for k ∈ {1,…,10} numerically approximated by Riemann summation over a discretization of the simplex B⁴ with 11,437 points (step 0.025). Covers the 1994 bond crash, Asian crisis, dot-com crash, 2008 crisis, pre-COVID period (Fig. 1). (Sec. 4)

## 3. Method / model
- **k-cyclic constant strategy** (Def. 1): b^k_n = (b_{kt+1},…,b_{kt+k})_{t≥0}, looping k fixed portfolios b_i ∈ B^m; k=1 reduces to the constant strategy. Motivating use: 5-cyclic weekly routine exploiting day-of-week effects (Example 1).
- **k-PUP learning algorithm** (eq. 2.5): b_{kt+i} = ∫_{B^m} b·∏_{j=0}^{t−1}⟨b, x_{kj+i}⟩μ(b)db / ∫_{B^m} ∏_{j=0}^{t−1}⟨b, x_{kj+i}⟩μ(b)db — i.e., decompose the return sequence into k subsequences (one per cycle position) and run an independent Universal Portfolio on each; initial portfolios uniform (1/m,…,1/m). μ = uniform or Dirichlet(1/2,…,1/2).
- **Theorem 1:** sublinear worst-case regret vs the best k-cyclic constant strategy in hindsight: max log S_n(b^k_n) − log S_n(b_n) ≤ k(m−1)(log n + 1) (uniform μ), or ≤ k(m−1)/2·log n + 1 + k log 2 (Dirichlet(1/2)).
- **Corollary 1:** if k ≡ 0 mod h, best k-CC ≥ best h-CC pointwise; best k-cyclic (k ≥ 2) strictly beats best constant in wealth at every n.
- **Generalized Kelly (Sec. 3):** k-log-optimal portfolios maximize EΣ_{i=1}^k log⟨b_i, X^i⟩ (Def. 2); Kuhn–Tucker condition E∏_{i=1}^k (⟨b^i,X^i⟩/⟨b^{i*},X^i⟩)^{1/k} ≤ 1 (Lemma 2, via AM–GM on the directional derivative with dominated-convergence limit (3.1)).
- **Theorem 2:** in a block-wise i.i.d. market (i.i.d. random return matrices of block length k), the k-cyclic strategy built from k-log-optimal portfolios attains the highest asymptotic growth rate among *all* dynamic strategies: lim W_{kt+k}(b^{k*}_n) = max (1/k)EΣ log⟨b_i,X_i⟩ a.s. (Breiman-style proof via Markov inequality + Borel–Cantelli).
- **Corollary 2:** the (2.5) algorithm attains that optimal rate *without knowing the joint distribution*, and with cycle length dk for any d ≥ 1 (so unknown k is handled by taking the product of candidate k's).

## 4. Equations & assumptions
- Wealth/growth: S_n(b_n) = ∏_{i=1}^n⟨b_i,x_i⟩, W_n(b_n) = (1/n)log S_n(b_n) (Sec. 2).
- Universal Portfolio: b_n = ∫ b·S_{n−1}(b)μ(b)db / ∫ S_{n−1}(b)μ(b)db (2.2); S_n(b^{UP}_n) = ∫ S_n(b)μ(b)db < max_b S_n(b) ∀n (2.3) — the strict inequality the paper overcomes.
- k-PUP update (2.5) as above; regret bounds of Thm. 1 as above.
- k-log-optimality: (b*_1,…,b*_k) = argmax EΣ_{i=1}^k log⟨b_i,X^i⟩ (Def. 2).
- Optimal rate: max_{(b_1,…,b_k)} (1/k)EΣ_{i=1}^k log⟨b_i,X_i⟩ (Thm. 2).
- Assumptions: no-short simplex B^m; no transaction costs; positive returns; all expectations well-defined; block-wise i.i.d. structure for the Kelly generalization (not needed for the Thm. 1 regret bound, which is distribution-free); Riemann-sum approximation error assumed negligible (footnote 3 addresses it).

## 5. Features / target
Not an ML paper. Inputs: the realized return sequence x_1^n; the cycle length k (tunable). Output: the dynamic portfolio sequence b_n and its wealth/growth vs the hindsight benchmarks (best constant, best k-cyclic constant).

## 6. Validation design
Single long-horizon backtest (6,798 days) with k ∈ {1,…,10}; benchmarks: buy-and-hold per stock, best k-CC in hindsight per k, 1-PUP (= Universal Portfolio). Metrics: final wealth, growth rate, average return, Sharpe ratio (Table 1). Convergence diagnostics: growth-rate gaps max W_n(b^k_n) − W_n(b^{k-PUP}_n) and W_n(b^{k-PUP}_n) − W_n(b^{1-PUP}_n) over time (Fig. 3); subsequence discrepancy analysis (Fig. 4: mean/variance of best-constant returns per subsequence). No transaction costs, no walk-forward tuning of k (k is swept, best reported ex post — see Sec. 9).

## 7. Numerical results / baselines
- Final wealth (Table 1, n=6798): best 1-CC (hindsight) 38.46; 1-PUP 28.05; **2-PUP 44.98** (beats best constant); 6-PUP 38.86 (marginally beats); 4-PUP 37.20, 9-PUP 37.73 (just below); 3/5/7/8/10-PUP 31.3–36.1.
- Growth rates: 2-PUP 0.000560 vs best 1-CC 0.000537 vs 1-PUP 0.000490. Sharpe: 1-PUP highest (55.92) vs 2-PUP 54.46 — higher growth does not mean higher Sharpe.
- Best k-CC in hindsight explodes with k: 446.7 (k=2), 934.2 (k=4), 1773.7 (k=6), 3054.2 (k=10) vs 38.46 (k=1) — up to ~80×, the headroom the algorithm chases.
- Even k systematically beats odd k (Corollary 1 divisibility); convergence of W_n(b^{k-PUP}) to best k-CC slows as k grows (Thm. 1 bound ∝ k).
- Key falsification: W_n(b^{k-PUP}_n) − W_n(b^{1-PUP}_n) does not converge to 0 for any k > 1 (Fig. 3 right) → returns are not i.i.d. → the classical Kelly criterion is *invalidated* in this market; the k>1 outperformance is the evidence.
- Practical guidance (Sec. 5): k=2 or 6 suggested; unknown k handled by product-of-candidates cycle length or by ensembling across k (Lam 2024; Cesa-Bianchi & Lugosi 2006 exponential weighting).

## 8. Code / data availability
None stated for code. Data: CRSP (proprietary, via advisor); the 4-stock subset is fully identified (HON, BA, AMD, JPM, 1992–2019) so the experiment is re-runnable from any CRSP/equivalent feed.

## 9. Leakage & limitations
- k is swept over {1,…,10} and the winners (k=2, 6) reported ex post — there is no walk-forward or cross-validated selection of k; a live investor could not have known to pick k=2.
- The best k-CC benchmark is pure hindsight (thousands in wealth) — the algorithm captures only a fraction of that headroom, and the gap grows with k.
- No transaction costs: k-cyclic strategies rebalance across different portfolios per cycle position, so turnover (and cost drag) is higher than the constant strategy — the wealth comparisons ignore this.
- Riemann discretization (11,437 points on B⁴) is coarse; footnote 3's error analysis is asymptotic hand-waving, not a measured bound.
- Block-wise i.i.d. is a strong idealization of "serial dependence"; real calendar effects are not exactly periodic with fixed k.

## 10. GSE overlap
Garrett's corpus has extensive Kelly-sizing work (this reader's own 1200/1203/1205/1208/1209) but all of it assumes i.i.d. outcomes and a single constant Kelly fraction — none addresses periodic/serial structure in the bet sequence or learns the allocation online. The k-cyclic generalization and the distribution-free k-PUP learner are new capability: GSE's current Kelly protocol has no notion of day-of-week or situational periodicity in bankroll deployment. Complements (does not duplicate) the existing Kelly stack.

## 11. GSE implementation spec
- **Periodic bankroll allocation:** partition GSE's historical bet sequence into k = 7 (day-of-week) or k = situational buckets (rest days, back-to-back, divisional) subsequences; run the k-PUP update (2.5) with μ = Dirichlet(1/2) over the *simultaneous-pick portfolio* simplex (weights across concurrent picks) instead of stocks — each subsequence learns its own Kelly-style allocation tuned to that cycle position's return characteristics.
- **k-log-optimal sizing:** for the chosen k, estimate the joint distribution of per-position pick returns from history and solve Def. 2's maximization (concave — standard solver) to get the k position-specific Kelly portfolios; deploy as the periodic staking schedule.
- **Unknown-k handling:** per Corollary 2, ensemble across candidate k (2, 5, 7, 14) with exponential weighting rather than committing to one periodicity.
- Effort: 2–3 weeks (history ETL + simplex solver + backtest harness); paper's discretization approach ports directly since GSE's concurrent-pick count per slate is small (m ≤ 10).

## 12. Reproducible test
Dataset: GSE's logged picks + odds + outcomes, 2023–2025, timestamped. Partition into k=7 day-of-week subsequences; run k-PUP vs flat fractional-Kelly baseline on the simultaneous-pick portfolio. Metric: final bankroll multiple and max drawdown over the full window, with transaction-cost-equivalent penalty (vig) applied per bet. Gate on bankroll multiple, not Sharpe.

## 13. Acceptance / rejection gate
ADAPT the periodic allocation if, on a walk-forward backtest (k chosen on 2023, evaluated on 2024–2025), the k-PUP bankroll multiple exceeds flat fractional-Kelly by ≥10% with max drawdown no worse than 1.2× the baseline's; otherwise REJECT periodicity and keep the flat Kelly protocol.

## 14. Improvement experiment
Make k *adaptive*: replace the fixed cycle length with a learned regime detector (e.g., a hidden-Markov model over market regimes: normal, steam/line-move days, playoff) and run one universal-portfolio learner per latent regime instead of per calendar position — test whether latent-regime decomposition beats fixed-calendar decomposition on the same walk-forward bankroll metric, since real serial dependence is regime-driven, not strictly periodic.
