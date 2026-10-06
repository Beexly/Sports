# [1511] Efficient Market Dynamics: Unraveling Informational Efficiency in UK Horse Racing Betting Markets Through Betfair's Time Series Analysis (arXiv:2402.02623v1)

**Citation:** Narayan Tondapu (Microsoft, Redmond). arXiv:2402.02623v1. URL: https://arxiv.org/abs/2402.02623
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro, background 2.1–2.3, related works, data + preprocessing, experimental analysis 5.1–5.2, discussion, conclusions, references).
**Verdict:** ADAPT
replace the horse-racing venue with GSE's NFL odds feeds and lift the full efficiency-test battery (ADF/KPSS, autocorrelation decay, Hill tail index, generalized-Gaussian fit, volatility-clustering power-law exponent) as a line-absorption benchmark.
**GSE rationale:** A ready-made, replicable suite of market-efficiency tests: its headline finding (light-tailed, rapidly mean-reverting betting-exchange returns vs heavy-tailed financial returns) plus the volatility-decay exponent gap (α≈0.62 betting vs 0.1–0.4 finance) gives GSE a quantitative yardstick for how fast NFL lines absorb news — directly useful for CLV timing and market-microstructure calibration.

## 1. Research question
What are the stylized statistical facts of an online sports betting exchange (Betfair), and how do its informational-efficiency fingerprints compare with financial markets and prediction markets?

## 2. Dataset / schema
Betfair historical data, PRO plan (tick-by-tick), one month of UK horse racing: 1,056,766 price-change signals across 73 markets / 10 events, messages every 50 ms, average 9.86 runners per market, mean matched-bet interval ≈ 50 s (SD 450 s). Parsed JSON fields: runner change (ltp = last traded price, atb/atl available to back/lay, spb/spf/spn/spl starting prices, tv = traded volume, trd = traded price volume) + market definition (inPlay, numberOfActiveRunners, betDelay, marketBaseRate commission) + winners file. Net returns computed back and lay side with 5% commission deducted.
No public download URL for the dataset given in the paper (Betfair PRO historical data is a paid plan).

## 3. Method / model
Empirical stylized-facts analysis: log/simple/absolute/squared returns R_t = ln(P_t) − ln(P_{t−1}); unconditional distribution fit vs generalized Gaussian f(x,β) with β=1.19 best (β=1 Laplace, β=2 Gaussian); Hill tail-index estimator across k=1–10% tail fractions; two-sample Kolmogorov–Smirnov test for gain-loss asymmetry; ADF + KPSS stationarity tests per market (73 markets); autocorrelation of tick returns; power-law fit to absolute-return autocorrelation decay (nonlinear autocorrelation exponent α).

## 4. Equations & assumptions
Key equations: (1) R_t = ln(P_t) − ln(P_{t−1}); (2–4) log/simple return conversions; (5) generalized Gaussian density; (6) KS critical value D_c = c(α)·√((n_a+n_b)/(n_a·n_b)). Assumptions: log returns comparable to financial literature; per-market (not pooled) estimation for time-dependence facts; stationarity (tested, not assumed); price changes treated as return series like asset prices.

## 5. Features / target
Features: none (descriptive statistics, no predictive model). Target: the full statistical fingerprint — distribution shape, tail index, stationarity, autocorrelation structure, volatility clustering.

## 6. Validation design
Statistical tests rather than a prediction task: ADF (H0: unit root), KPSS (H0: stationary) on 3 sample markets + reported similar for all 73; KS test on positive vs negative returns (D=0.0068 < D_c=0.0080, p=0.1347 — cannot reject identical distributions).

## 7. Numerical results / baselines
Unconditional log returns over 41,588 intervals: mean −0.0018, SD 4.0323, skewness +0.0241, kurtosis 1.0994 (platykurtic — opposite sign/size pattern vs finance). Hill estimator −0.348 to −0.877 for k 1–10% (light tails). Positive/negative return halves: n=57,648 each, means 0.0001, SDs 3.769/3.628, kurtosis 1.362/1.325 — no gain-loss asymmetry. ADF rejects unit root in all 73 markets (e.g. −5.02 to −8.52, p≈0). Autocorrelation: large negative first lag, then rapidly negligible — no exploitable linear structure. Absolute-return power-law exponent α: mean 0.62435, SD 0.3052, range 0.1645–1.9755 — faster decay than financial 0.1–0.4 → quicker information absorption. Review finding: favorite-longshot bias strong on exchanges; exchanges more informationally efficient than dealer markets ([34],[35],[37]).

## 8. Code / data availability
No code released; data from paid Betfair PRO plan; preprocessing described (JSON→Pandas→CSV) but not shared.

## 9. Leakage & limitations
Stated: one-month sample (calendar effects untested); leverage effect and aggregational Gaussianity not studied; Hurst exponent mentioned in abstract but the conclusion admits a reliable Hurst estimate was deferred to future work — abstract overclaims relative to body. Added: single-author paper; references [1]–[16] are largely unrelated to betting markets (blockchain/AI-in-finance padding) and do not support the methodology; no predictive task, so no leakage concern but also no demonstrated betting edge; horse racing ≠ NFL microstructure (in-play suspension rules, bet delay differ).

## 10. GSE overlap
First Betfair stylized-facts paper in the 750 corpus; no duplication. Complements the market-efficiency papers already read (profit-bias identity 0001, OO-EPC/FL-GLM 0277, BBE agent-based exchange 0646-related lane) by adding an empirical efficiency-test battery rather than a model.

## 11. GSE implementation spec
- Replicate the full battery on GSE's NFL line-movement feeds (opening→closing odds at multiple books/exchanges): log-return distribution fit (generalized Gaussian β vs Gaussian), Hill tail index, ADF/KPSS stationarity, first-lag autocorrelation, absolute-return power-law decay exponent α.
- Decision rule: fit α on NFL feed; if α ≫ 0.4 (finance-like), the book's line absorbs news fast and CLV must be captured early (steam-chasing window narrow); if α ≈ finance range, slower absorption and mid-week edges persist.
- Favorite-longshot bias check: regress NFL moneyline payouts vs empirical win rates; if bias present, fade longshots / shade favorites in the engine's fair-price conversion.
- Synthetic data: use fitted β≈1.19 generalized Gaussian + α≈0.62 decay parameters to generate realistic synthetic odds-movement series for training ML models when real feed history is short (the paper's stated synthetic-data motivation, adapted to NFL).

## 12. Reproducible test
- Ingest ≥1 season of NFL spread/moneyline snapshots (e.g. hourly) from an odds API.
- Compute the five statistics above; pass/fail vs the paper's Betfair values (β≈1.19, kurtosis≈1.1, |first-lag AC|<0.1 beyond lag 1–2, α≈0.62).
- Report which books behave exchange-like (efficient) vs dealer-like (slow) — prioritizes where GSE's edge bets are placed.

## 13. Acceptance / rejection gate
ADAPT. Horses, not football, and a single descriptive month — but the efficiency-test battery is exactly the instrument GSE needs to quantify how fast NFL lines absorb information, and every test is replicable from the equations given. Adopt nothing wholesale; adapt the battery to NFL feeds.

## 14. Improvement experiment
Beyond the paper: run the efficiency battery *per book* across 5–8 NFL sportsbooks and compute an information-absorption speed ranking (first-lag autocorrelation decay + tail index per book). The paper describes one exchange; the follow-up tests whether GSE's realized edge (engine probability vs closing line) is systematically larger on slow-absorption books. If the per-book γ-proxy correlates with GSE's per-book closing-line value over a season (Spearman ρ > 0.5), the diagnostic stops being descriptive and becomes a placement-routing rule — the paper's tests repurposed from market description to execution, which the authors never do.
