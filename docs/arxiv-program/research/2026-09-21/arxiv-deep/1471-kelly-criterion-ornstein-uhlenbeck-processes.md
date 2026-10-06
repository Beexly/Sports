# [1471] Application of the Kelly Criterion to Ornstein-Uhlenbeck Processes (arXiv:0903.2910v1)

**Citation:** Lv, Y., & Meister, B. K. (2009). *Application of the Kelly Criterion to Ornstein-Uhlenbeck Processes*. arXiv:0903.2910v1 [q-fin.PM]. URL: https://arxiv.org/abs/0903.2910
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — duplicate of ledger 1368, which already deep-read this exact paper (arXiv:0903.2910v1) on 2026-09-21 with an ADAPT verdict; the valuable content is already in the corpus. Replaced by ledger 1500 (arXiv:2604.25280v1).

## 1. Research question
Same as ledger 1368: does an optimal self-financing log-utility (Kelly) trading strategy exist in a complete market of mean-reverting Ornstein–Uhlenbeck price processes, and can the optimal fractions be written explicitly?

## 2. Dataset / schema
No empirical dataset (theory paper). Same as ledger 1368.

## 3. Method / model
Same as ledger 1368: log-price OU dx_t = (a − b x_t)dt + σdW_t; optimal fraction vector f*_t = R^{−1} c_t with R = σσᵀ; one asset f*_t = (μ_t − r)/σ² where μ_t = a − b log S_t + 0.5σ²; mean-variance equivalent objective F(x) = c_tᵀx − 0.5xᵀRx; local/global correlation structures and estimation sensitivity discussed.

## 4. Equations & assumptions
See ledger 1368. Assumptions already recorded there: complete frictionless continuous-time market, nonnegative wealth, known drift/volatility.

## 5. Features / target
Same as ledger 1368.

## 6. Validation design
Same as ledger 1368 (no empirical backtest).

## 7. Numerical results / baselines
Same as ledger 1368 (estimation-sensitivity rule: 1% σ-error ≈ 2% drift-error).

## 8. Code / data availability
See ledger 1368.

## 9. Leakage & limitations
Duplicate read — no new limitations beyond those in ledger 1368 (frictionless continuous trading, known parameters, no odds limits/liquidity). This entry exists only to satisfy the replace-on-duplicate rule.

## 10. GSE overlap
Ledger 1368 (`1368-kelly-criterion-ornstein-uhlenbeck-processes.md`) already holds this paper's content with an ADAPT verdict: dynamic Kelly fraction f_t* = R^{−1}c_t with mean-reverting drift, the first corpus source for Kelly sizing when the edge itself moves. Writing a second ledger would double-count.

## 11. GSE implementation spec
Not applicable — see ledger 1368.

## 12. Reproducible test
Not applicable — see ledger 1368.

## 13. Acceptance / rejection gate
REJECT as duplicate: the paper's arXiv ID (0903.2910v1) matches ledger 1368 exactly, and the reserve replacement (1500) was fully read instead.

## 14. Improvement experiment
Not applicable — improvement experiments belong on ledger 1368.
