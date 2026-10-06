# [1219] Necessary and Sufficient Conditions for Frequency-Based Kelly Optimal Portfolio (arXiv:2004.12099)

**Citation:** Chung-Han Hsieh (2020). *Necessary and Sufficient Conditions for Frequency-Based Kelly Optimal Portfolio*. arXiv:2004.12099. URL: https://arxiv.org/abs/2004.12099
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — use the necessary-and-sufficient optimality conditions as the correctness certificate for GSE's constrained Kelly solver, and implement the Dominant Ratio Trading Algorithm's sliding-window expected-ratio test as the redundancy screen (with the strict out-of-sample discipline the paper's backtest lacks).

## 1. Research question
The paper asks for exact characterizations of the frequency-based Kelly-optimal portfolio: necessary *and* sufficient conditions for optimality (prior work had sufficiency only), whether the Dominant Asset Theorem can be strengthened to necessity ("invest everything in asset j is optimal iff j is dominant"), plus expected-ratio optimality, asymptotic relative optimality, and trader survivability (no bankruptcy) — then bridges theory to practice with a dominant-ratio trading algorithm backtested on ETF data.

## 2. Dataset / schema
Backtest illustration: three ETFs — Vanguard Total World Stock (VT), Vanguard Total Bond Market (BND), Vanguard Total International Bond (BNDX) — daily closes from February 14, 2019 to February 14, 2020 (252 trading days), sourced from Wharton Research Data Services. Sliding estimation window M = 20 days (robustness checked M = 1, 5, 15, …, 60). No train/test split; the full year is both estimation and evaluation.

## 3. Method / model
Maximize g_n(K) = (1/n)·E[log(1 + KᵀX_n)] over the unit simplex, where X_{n,i} = ∏_{k=0}^{n−1}(1+X_i(k)) − 1 is the n-step compound return. Derive KKT-based necessity and sufficiency (Theorem 3.1), prove the Extended Dominant Asset Theorem (Theorem 3.2), expected-ratio optimality (Lemma 3.3), asymptotic relative optimality via Borel–Cantelli (Lemma 3.4), and a survivability lemma (simplex ⇒ V(n) > 0). Practical algorithm: estimate R_{ij}(k) = (1/M)·Σ_{ℓ=0}^{M−1}(1+x_i(k−ℓ))/(1+x_j(k−ℓ)); if R_{ij} ≤ 1 for all i ≠ j, set K_j*(k) = 1 (all-in on j), else 0 — a bang-bang controller.

## 4. Equations & assumptions
- g_n(K) = (1/n)·E[log(1 + KᵀX_n)]; X_{n,i} = ∏_{k=0}^{n−1}(1+X_i(k)) − 1
- Theorem 3.1: K* optimal iff E[(1+X_{n,i})/(1+K*ᵀX_n)] = 1 when K_i* > 0, ≤ 1 when K_i* = 0
- Theorem 3.2 (Extended Dominant Asset): K* = e_j iff E[(1+X_i(0))/(1+X_j(0))] ≤ 1 for all i ≠ j
- Lemma 3.3: E[(1+KᵀX_n)/(1+K*ᵀX_n)] ≤ 1 and E[log((1+KᵀX_n)/(1+K*ᵀX_n))] ≤ 0 for any K
- Lemma 3.4: lim sup_{n→∞} (1/n)·log((1+KᵀX_n)/(1+K*ᵀX_n)) ≤ 0 almost surely
- For n = 1, Theorem 3.1 reduces to the classical Cover–Thomas result (their Theorem 16.2.1)
Assumptions: i.i.d. returns, known bounded distribution (Xmin,i > −1), long-only simplex, log utility. The backtest additionally assumes the sliding window estimates the expectation adequately.

## 5. Features / target
Inputs: asset return distributions (or rolling-window realized returns). Target: Kelly-optimal weight vector K* and rebalancing-frequency analysis.

## 6. Validation design
Theorems are proved; the backtest is illustrative only. No out-of-sample split (same year used for rolling estimation and performance), no transaction costs, no baselines beyond buy-and-hold, single 1-year window, three ETFs. The "similar performance" across M values is reported qualitatively.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- V(0) = 1 → V(252) ≈ 1.23 (~23% return) for the Dominant Ratio Trading Algorithm with M = 20, vs. buy-and-hold (lower, exact figure not quoted — shown graphically).
- Similar trading performance for sliding windows M = 1, 5, 15, …, 60.
- Trading signals K_i(k) show "bang-bang" (all-or-nothing) behavior.
(My note: with no costs, no out-of-sample split, and one cherry-pickable year, treat the 23% as illustrative, not evidence.)

## 8. Code / data availability
"MATLAB script" mentioned as run by the author; no code link. Data via Wharton Research Data Services (subscription).

## 9. Leakage & limitations
The backtest is in-sample: the dominance condition is evaluated on the same rolling window that determines the trade — no walk-forward discipline. One year, three highly-trending ETFs (2019–2020 equities bull run), no costs, no risk adjustment. The all-in bang-bang rule is theoretically optimal under the assumptions but reckless under estimation error — the paper's own survivability lemma only guarantees positivity, not drawdown control. Assumes i.i.d.; 2019–2020 included the COVID crash onset (Feb 2020), a regime break the window method cannot handle gracefully.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads. This paper strengthens ledger 1213's (1807.05265) Dominant Asset Theorem from sufficiency to necessity — together they give GSE a complete, certified dominance test. GSE's `apps/web/lib/staking/kelly-investigation.ts` has no optimality certificate for its solver and no redundancy screen. New capability, not a duplicate.

## 11. GSE implementation spec
1. Use Theorem 3.1 as a unit-test certificate: after GSE's constrained Kelly solver returns K*, assert E[(1+X_{n,i})/(1+K*ᵀX_n)] ≤ 1 + tol for all zero-weight picks and = 1 ± tol for positive-weight picks, on the empirical distribution. Any violation fails the build. Effort: S.
2. Implement the R_{ij}(k) sliding-window dominance test over each slate's mutually-exclusive/correlated picks as the redundancy screen (shared with ledger 1213's spec), but with walk-forward evaluation: the window used for the test must end before the bet is placed. Effort: M.
3. Replace the paper's bang-bang all-in with capped reallocation (existing fractional ceiling); log all triggers. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks grouped by slate. Metric: solver-certificate pass rate (must be 100%) and, for the dominance screen, realized ROI per unit drawdown vs. current card. Baseline: current card. Walk-forward only.

## 13. Acceptance / rejection gate
ADOPT the certificate test unconditionally if it passes on historical data (it is a correctness property, not a performance bet). ADOPT the dominance screen only if it improves realized ROI/drawdown ≥ 10% walk-forward (same gate as ledger 1213). REJECT the screen otherwise.

## 14. Improvement experiment
Beyond the paper: replace the fixed-M sliding window with an adaptive window chosen by a stationarity test (e.g., only extend M while the return distribution passes a change-point test), so the dominance test uses the longest *stable* history. Hypothesis: adaptive-M dominates any fixed M on walk-forward ROI/drawdown.
