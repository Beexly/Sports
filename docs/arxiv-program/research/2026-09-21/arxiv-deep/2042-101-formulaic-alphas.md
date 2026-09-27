# [2042] 101 Formulaic Alphas (arXiv:1601.00991)

**Citation:** Zura Kakushadze, Geoffrey Lauprete, Igor Tulchinsky (2015). *101 Formulaic Alphas*. arXiv:1601.00991v1. URL: https://arxiv.org/abs/1601.00991
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, 22 pages; ar5iv HTML truncated so PDF used).
**Verdict:** ADOPT

*Why:* the formulaic-alpha operator grammar and the "alpha as code" mining blueprint are directly portable to GSE signal discovery; this is the anchor reference for the whole lane.

## 1. Research question
What do real-life quantitative trading alphas actually look like, and what are their empirical properties? The paper publishes explicit formulas — that are also executable computer code — for 101 real production alphas (WorldQuant, used with permission), then characterizes their return distribution, pair-wise correlations, and dependence on volatility and turnover.

## 2. Dataset / schema
Proprietary WorldQuant production data: per-alpha annualized daily Sharpe ratio, daily turnover, cents-per-share, and daily realized return volatility for the 101 alphas; a 101x101 sample covariance matrix of alpha returns. Collection window: Jan 4, 2010 – Dec 31, 2013. Inputs used by the alphas themselves: daily open, close, high, low, volume, VWAP, returns, plus fundamental data (market cap) and binary industry classifications (GICS/BICS/NAICS/SIC) for industry neutralization. Raw market data not published; the 101 formulas are published.

## 3. Method / model
Not a training method — a disclosure + empirical characterization study. The 101 alphas were selected "largely based on simplicity considerations" from a much larger proprietary pool. Each alpha is a closed-form formulaic expression built from the operator set defined in Appendix A (delay, correlation, covariance, rank, mean, std, min, max, sum, product, scale, ts_rank, signed power, decay_linear, industry neutralization, etc.) over price/volume/fundamental inputs. The empirical analysis regresses alpha returns on volatility/turnover and fits a factor-style decomposition of the pair-wise correlation matrix using ln(turnover) as a candidate factor loading.

## 4. Equations & assumptions
- Alpha definition (trader's, quoted from Tulchinsky et al. 2015): "an alpha is a combination of mathematical expressions, computer source code, and configuration parameters that can be used, in combination with historical data, to make predictions about future movements of various financial instruments."
- Example mean-reversion alpha (eq. 2): α = −ln(today's open / yesterday's close), a "delay-0" alpha traded at the open.
- Return-volatility scaling (eq. 1): R_i ~ σ_i × T_i^X? — empirically the paper reports α-return scales with realized volatility with exponent √? ≈ 0.76 for their 101 alphas: R_i ~ σ_i^0.76 (correlation of returns with volatility, fitted exponent ≈ 0.76).
- Correlation factor decomposition: pair-wise correlations Ψ_{ij} regressed on tensor products of 1-vector and ln(turnover)-vectors, i.e., linear regression of Ψ_{24} over 1, 1⊗lnτ + lnτ⊗1, and lnτ⊗lnτ; result: turnover terms have poor explanatory power; intercept ≈ mean correlation.
- Assumptions: alphas' reported Sharpe/turnover/volatility are truthfully reported production figures; industry neutralization fully removes sector bias; 2010–2013 window is representative.

## 5. Features / target
Inputs per alpha: close-to-close daily returns, open, close, high, low, volume, VWAP; some alphas use market cap and industry classifications. Target: future returns of individual stocks (cross-sectional, holding period ~0.6–6.4 days). Alpha output is interpreted as an expected-return (position) signal.

## 6. Validation design
Descriptive/empirical — no predictive train/test split of a model. Empirical properties computed over Jan 2010–Dec 2013 production window. No baselines (it is a disclosure paper, not a model comparison). Reported: distributions of Sharpe, turnover, cents-per-share, holding period; mean/median pair-wise correlation; regressions of return on volatility and turnover; regression of pair-wise correlations on log-turnover factor structure.

## 7. Numerical results / baselines
- Average (median) pair-wise correlation of the 101 alphas: 15.9% (14.3%) — low, so a large alpha count does NOT imply redundancy.
- Average holding period ranges approximately 0.6–6.4 days.
- Alpha returns strongly correlated with realized volatility; scaling exponent ≈ 0.76 (eq. 1).
- Alpha returns show NO statistically significant dependence on turnover — direct confirmation of Kakushadze & Tulchinsky (2015).
- Turnover (log) has poor explanatory power for pair-wise alpha correlations (Table 4 regression), though log turnover correlates weakly-but-nonzero with log volatility (Table 5); turnover may still matter for specific (idiosyncratic) risk in a factor model.

## 8. Code / data availability
The 101 formulas ARE the code (Appendix A, C-style expressions with operator definitions). Raw performance data is proprietary; not published. The appendix defines every operator used, so the full operator grammar is recoverable from the paper.

## 9. Leakage & limitations
- Survivorship/selection: the 101 were hand-picked for simplicity from a large pool — they are not a random sample; tail alphas may be less clean.
- Production Sharpe/turnover figures are self-reported by the firm (no independent audit).
- 2010–2013 window only; alpha decay means many may no longer work.
- No explicit multiple-testing accounting: 101 formulas shown, but the search space that produced them is unreported (the data-mining critique the paper itself motivates).
- External validity to NFL: operators (ts_rank, delay, correlation, decay_linear) transfer to any panel data including play-by-play/team-game panels, but equity alphas themselves are not sports signals.

## 10. GSE overlap
No overlap in the existing research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md` has no alpha-mining/factor-mining entry) — this is a new capability: the first formulaic signal-mining grammar for GSE. Related-but-distinct: the arXiv program's existing GP/symbolic-regression ledgers (if any in other waves) cover symbolic regression, not the alpha-as-formula + factor-zoo + correlation-control stack.

## 11. GSE implementation spec
Build "SportsAlpha" miner on this grammar:
1. **Inputs:** play-by-play-derived team-game panel: per-team per-game stats (EPA/play, success rate, explosiveness, pressure rate, yards/play, turnover margin, pace, rest days), plus betting-market inputs (closing line, line movement, total movement) and derived features. Fundamental analogues: team payroll/efficiency, coach tenure; industry-neutralization analogue: division/conference de-meaning.
2. **Operator set:** copy Appendix A: rank, delay(d), correlation(x,y,d), covariance, delta, scale, ts_rank, ts_min/max/mean/std/sum, signedpower, decay_linear, industry-neutralize → division-neutralize, if-then, etc. Formulae output per-game signal values.
3. **Mining loop:** random formula generation + GP mutation (see AutoAlpha/AlphaForge ledgers) scored by out-of-sample IC vs. spread-cover outcome; keep factors with pairwise |corr| < 0.5, building a "factor zoo" exactly as Kakushadze's 101.
4. **Portfolio use:** fixed-weight or dynamic-weight combination (AlphaForge pattern) of the zoo to produce a game-level edge signal; translate to spread/total probabilities via calibration.
5. Effort: ~2–3 weeks for operator engine + backtest harness; mining is compute-bound.

## 12. Reproducible test
Dataset: nflverse play-by-play 2009–2025 aggregated to team-game panel (need ≥ 5 seasons to mirror the 4-year window). Baseline: a single hand-built mean-reversion signal (e.g., −ln(recent ATS margin / market expectation)). Metric: IC (rank correlation) between mined-signal value and spread cover (binary) on a strictly out-of-sample season block (train 2009–2019, validate 2020–2022, test 2023–2025), plus mean |pairwise correlation| of the mined zoo.

## 13. Acceptance / rejection gate
ADOPT if: mined factor zoo achieves mean out-of-sample |IC| ≥ 2× the hand-built baseline IC on the 2023–2025 test block AND mean pairwise |corr| ≤ 0.25 (diversification holds like the 15.9% in the paper) AND the combined signal improves base-model Brier by ≥ 0.002 on held-out season with deflated-Sharpe / reality-check multiple-testing gate passed. REJECT otherwise.

## 14. Improvement experiment
Go beyond the paper's static formula set: mine formulas with the GSE-specific "delay-0" concept — i.e., formulas restricted to information available at bet-placement time (no lookahead), and add a market-aware fitness: reward factors whose edge is NOT explained by closing-line movement (residualize factor IC against line movement first). This targets signals the market doesn't already price — the paper's alphas don't do this residualization. Also replicate the correlation-factor analysis on sports signals: test whether "signal turnover" (how often a signal changes sign) explains signal correlations — the paper's turnover result may flip in sports.
