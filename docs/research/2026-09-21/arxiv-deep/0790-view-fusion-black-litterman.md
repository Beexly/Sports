# 0790 — View fusion via a Bayesian interpretation of Black-Litterman for portfolio allocation (2301.13594v1)

**Verdict:** ADAPT — ensembles lane.
**Source:** full text read in full (`/tmp/ledgers-read/2301.13594.txt`), 758 lines. Not from abstract.
**Authors:** Spears, Roberts (Oxford-Man Institute, RAEng) — arXiv 2301.13594v1 (Jan 2023). Domain: finance/portfolio, but the core machinery is model fusion under correlated/unknown-correlated predictions — directly transferable to ensembles.

## Citation / full-text source
- arXiv ID: `2301.13594v1`, "View fusion vis-à-vis a Bayesian interpretation of Black-Litterman for portfolio allocation".
- Full text read from local wrapped cache `/tmp/ledgers-read/2301.13594.txt` (lines 1–758). No public code repo found in the paper.

## Question
How do you combine predictions AND uncertainty estimates from multiple view-generating models (ARIMA, boosted regression, GP) whose cross-correlation is unknown or unreliable, inside a Bayesian Black-Litterman / APT portfolio framework — and does model fusion beat any single view model net of transaction costs?

## Dataset / schema
- CRSP and IBES via WRDS, daily U.S. equities 1992–2022; top 2,000 stocks by market cap.
- Five risk factors plus 70 SIC industry factors (BL-APT factor model).
- Constructed for **bi-monthly rebalancing** over a 29-year evaluation window (annual performance tables 1993–2021, Appendix A.3).
- All view-model results normalized ex-post so annualized return volatility equals the benchmark (S&P 500 TR) volatility for fair comparison.

## Method
- BL-APT: Bayesian Black-Litterman on an Arbitrage Pricing Theory factor model. View models produce mean prediction q and epistemic/aleatoric uncertainty decomposition (law of total variance, eq. 34).
- Four fusion methods implemented for fusing simultaneous views (Section 3):
  1. **PW (precision-weighted)**: naive inverse-covariance weighting — assumes zero cross-covariance between view sources.
  2. **CI (Covariance Intersection, Uhlmann/Julier)**: consistent fusion under *unknown* correlation; convex combination of information matrices.
  3. **ICI (Inverse Covariance Intersection, Noack et al.)**: tighter consistent bounds than CI by exploiting common-information structure.
  4. **CU (Covariance Union, Reece & Roberts)**: consistent union for possibly *inconsistent* sources (views that may contradict).
- Portfolio objective includes a transaction-cost model (Gârleanu–Pedersen style) with closed-form optimal weights; risk aversion set to 10; bi-monthly rebalance.

## Equations / assumptions
- PW fusion: `Σ̂ = (Σ̂₁⁻¹ + … + Σ̂S⁻¹)⁻¹`, `μ̂ = Σ̂(Σ̂₁⁻¹μ̂₁ + … + Σ̂S⁻¹μ̂S)`.
- CI/ICI/CU: covariance-consistency framework from multi-sensor data fusion (Julier–Uhlmann; Noack–Sijs–Hanebeck; Reece–Roberts).
- Predictive variance decomposition: `var(y*|x*,D) = var_θ|D(E[y*|x*,θ]) + E_θ|D(var(y*|x*,θ))` — first term epistemic (reducible), second aleatoric (irreducible).
- BL-APT posterior predictive `p(r|q)` is multivariate normal with closed-form covariance and mean derived via completing-the-square and Lemma 1 (Appendix A.1).
- Assumptions: normality of view errors; factor model structure; transaction-cost model parameters; rolling-window uncertainty estimates (20-obs windows for prior ξ; arbitrary choice, authors acknowledge).

## Features / target
- Features: factor loadings (5 risk factors + 70 industry factors), time-series histories of returns for each view model.
- Target: asset returns `r`; view predictions `q` per source with uncertainty (Ω epistemic, F aleatoric).
- View models: ARIMA (1-yr rolling window, epistemic from 6-month out-of-sample error-variance minus aleatoric, floor 1e-8), CatBoost (2-yr window, aleatoric from loss, epistemic from ensemble variance), GP (scikit-learn RBF+white-noise kernel, 1-yr window; aleatoric = white-noise kernel noise level, epistemic = total − aleatoric).

## Validation
- 29 years of **out-of-sample bi-monthly rebalancing** (1993–2021); per-year metrics: cumulative return, return vol, Sharpe, IR, Sortino, max drawdown — all net of transaction costs, volatility-normalized to the S&P 500 TR benchmark.
- Statistical testing of annual-Sharpe differences: pairwise 1-sided t-tests (after checking independence via Ljung-Box on pairwise differences — 1 of 28 rejected at 10%; Shapiro-Wilk normality rejected in 3 cases; outliers checked visually), 2-sided BCa bootstrap 90% CIs for paired differences of means, Wilcoxon signed-rank for median of differences.

## Exact results / baselines
- Median Sharpe over 29 years increased through fusion methods: PW **0.11**, CU **0.16**, CI **0.38**, ICI **0.48** (single-view-based methods: medians 0.01–0.53, means 0.21–0.30; fusion means 0.17–0.31).
- Global Sharpe over the full 29 years: PW 0.10 → ICI **0.34**.
- ICI outperformed ARIMA and GP on the mean-Sharpe tests; CI outperformed ARIMA only. Fusion methods beat single-view models on median metrics (ICI and CI both outperformed GP on the median-difference BCa CIs).
- PW (zero cross-covariance assumption) was the weakest fusion — authors note assuming independence yields inconsistent estimates and hurts trading.
- Benchmark check: S&P 500 TR beat **all** view- and fusion-based models on almost every test — view models themselves were too weak to compete with the market portfolio; fusion improved relative standing but did not beat the index.
- Clear performance decay: Sharpe ratios of view-based models declined significantly over the 30-year period.

## Code / data
- No code released (no repo link in the paper). Data: CRSP/IBES via WRDS (proprietary, requires subscription). Appendix gives view-model implementation details (scikit-learn GP, CatBoost, ad-hoc ARIMA epistemic recipe) sufficient to reimplement.

## Leakage
- Normalization of results to ex-post benchmark volatility is done ex-post (stated, benign for method comparison). View models re-fit on rolling windows bi-monthly; GP uses only a 1-year rolling window — no obvious future leakage beyond the acknowledged ex-post volatility normalization. Epistemic uncertainty estimates use recent out-of-sample windows (lagging, fine).

## GSE overlap
- Checked against `~/workspace/arxiv-sweep/existing-research-map.md`: no documented existing FFORMA/FEBAMA/mAFTER/median-consensus implementation found, and no BL-style fusion or CI/ICI/CU fusion method was in the map. No overlap with the CEPT ensemble-theory lane or the 2026-09-18 ML brief's ensembling topic.

## Implementation (GSE adaptation)
- GSE application: **fusion of correlated prediction sources under unknown correlation**. GSE has multiple pick-generating signals (engine model, market-implied/CLV, analyst adjustments, LLM panels) whose pairwise correlations are unknown and unstable — exactly the CI/ICI use case.
- ICI is preferable to naive precision-weighting: PW fusion assumes independent sources; GSE's sources share information (market feeds into engine and vice versa), so PW would be overconfident — the paper's PW-underperformance is direct evidence.
- Epistemic/aleatoric decomposition (eq. 34) maps to GSE calibration: model-uncertainty (epistemic, reducible with more history) vs market noise (aleatoric). GSE should track them separately rather than as one variance number.

## Reproducible test
- Take N correlated pick-probability sources on GSE's historical pick set (e.g., engine v5 spread probs + market-implied probs + a booster model).
- Fuse via (a) simple average, (b) PW inverse-variance, (c) CI, (d) ICI; compare out-of-sample log-loss / Brier vs best single source with a Diebold–Mariano test.
- Expectation per paper: ICI ≥ CI > average ≥ PW when sources are positively correlated with unknown magnitude.

## Numeric gate
- ICI/CU/CI fusion beats PW and simple averaging on the test above by ≥ 1% log-loss improvement over the best single source, with consistency (fused variance not understated vs empirical).

## Improvement experiment
- Adaptive fusion weights: blend CI/ICI with a tracking of which source is currently best (mAFTER-style per ledger 0786) — combine the *correlation-robustness* of ICI with *time-adaptivity*.
- Use CU sparingly for contradictory signals (e.g., engine vs market on injury-news games) per the authors' suggestion.

## Verdict
**ADAPT** — ensembles lane. Not a finance paper to adopt (portfolio objective, 30-year decay, no code, proprietary data), but the CI/ICI/CU fusion-under-unknown-correlation machinery is precisely the missing piece in GSE's ensemble story: it handles correlated forecast sources without pretending they're independent, and empirically beats naive precision-weighting. The epistemic/aleatoric decomposition is also directly usable in the GSE calibration lane.

## Limitations

1. **No realistic strategy / no drawdown control (authors' own caveat):** "Future practical work could be based on more realistic investment strategies, not the least incorporating methods of drawdown control." The empirical BL-APT backtest is a utility demonstration, not a tradable strategy.
2. **Arbitrary transaction-cost scaling (authors' own wording):** "we make the *somewhat arbitrary assumption* that at each time step the total investable capital is one-tenth of the sum of the daily dollar volumes of the assets in our trade universe." The 10 bps / 1%-of-volume impact model and the capital rule are stated assumptions, not estimated facts.
3. **Absolute views only, Gaussian noise:** the fusion analysis "assume[s] absolute views" with $P$ of full rank, and view noise is modeled as "zero-mean white-noise" — the normality assumption was *rejected* in 3 cases by the authors' own Shapiro–Wilk test at the 10% level, and CU is only suggested, not empirically validated, for contradictory signals.
4. **My observation — no live validation and Gaussian throughout:** everything downstream stays normal (posterior, predictive, returns), so tail risk is understated by construction; there is no walk-forward/out-of-sample trading validation of the fused allocations on live markets.
