# [1477] Are Betting Markets Better than Polling in Predicting Political Elections? (arXiv:2507.08921v1)

**Citation:** Laurie E. Cutting, Sarah S. Hughes-Berheim, Paul M. Johnson, Hiba Baroud, Brett Goldstein (2025). *Are Betting Markets Better than Polling in Predicting Political Elections?* arXiv:2507.08921v1. URL: https://arxiv.org/abs/2507.08921
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf, §§1–4 + Figs. 1–4 + references/appendix; ~25 pages).
**Verdict:** ADAPT
**Verdict rationale:** not for the election result (n=1, possibly manipulation-driven), but for the transferable BSTS methodology that decomposes market-implied probability series into signal (random-walk state variance) vs noise (observation variance); adapt to NFL line-movement/steam analysis, plus hard evidence that money-at-stake markets beat stated-opinion polls.

## 1. Research question
Did Polymarket betting-market data predict the 2024 US presidential election better than traditional pre-election polling — nationally and in seven swing states — and what dynamics (event reactivity, temporal structure, key drivers) distinguish the two data sources? Analyzed descriptively and via Bayesian Structural Time Series (BSTS) models fit and forecast from each source.

## 2. Dataset / schema
- **Polymarket:** daily closing prices on "Trump wins presidency (full ballot)" markets, downloaded via Kaggle (Andrade 2024); ~$3.7B wagered on the 2024 presidential election; national + 50 state-level series, Apr 2024 – Nov 4 2024 (election day); daily granularity, near-complete.
- **Polling:** FiveThirtyEight aggregator (shut down March 2025; Dunbar 2025), national + state; all available surveys per day; multiple polls per day summarized by mean ± SD; intermittent sampling (missingness higher, esp. state-level). Full pollster list in Appendix A.
- Swing-state focus: Arizona, Georgia, North Carolina, Pennsylvania, Michigan, Nevada, Wisconsin.

## 3. Method / model
**BSTS (Brodersen et al. 2015; Scott & Varian 2013):** observation y_t = Z_t'α_t + ε_t, ε_t~N(0,H_t) (1); state α_{t+1} = T_t α_t + R_t η_t, η_t~N(0,Q_t) (2).
**Driver analysis:** local-level + regressors (3) y_t = μ_t + β'x_t + ε_t, ε_t~N(0,σ²); (4) μ_{t+1} = μ_t + η_t, η_t~N(0,τ²); x_t = 50 state-level Polymarket Trump-win odds; spike-and-slab priors on β for sparse selection. Semilocal-linear-trend and local-linear-trend variants tested; local-level marginally best (others relegated to supplement).
**Forecasting:** regressor-free local-level (5)–(6), trained on data up to 8 cutoff dates (Jun 28, Jul 14, Jul 22, Sep 11, Oct 5, Oct 18, Oct 29, Nov 4 2024), projected to election day with 95% predictive intervals; evaluated on temporal stability, event reactivity, uncertainty width.

## 4. Equations & assumptions
- BSTS: (1)–(6) as above. Variance-ratio interpretation: τ²=0 → mean-reverting Gaussian noise; σ²→0 → random walk.
- Implied probability = Polymarket closing price (no de-vigging discussed — binary market, prices sum ≈1).
- Assumptions: closing prices are unbiased probability estimates (no manipulation — later questioned); polls' daily mean±SD is a sufficient summary; BSTS Gaussian state-space adequate for bounded [0,1] probabilities (no logit transform mentioned); regressor forecasts unnecessary since forecasting models drop regressors.

## 5. Features / target
Features: daily Polymarket Trump-win probabilities (national + 50 states); daily poll aggregates (mean, SD). Targets: binary — Trump wins presidency; Trump wins each swing state. Evaluation is binary-accuracy-at-cutoff (mean line above/below 50%; 95% PI excluding 50%).

## 6. Validation design
Pseudo-prospective: BSTS models trained only on data available at each of 8 cutoff dates, forecast to election day — a genuine rolling-origin design. No cross-validation across elections (n=1 election). Descriptive: visual comparison of full series vs events (debates Jun 26/Sep 10, assassination attempt Jul 13, Harris nomination Jul 21). Regressor-importance via spike-and-slab inclusion probabilities.

## 7. Numerical results / baselines
- **Descriptive (Figs. 1–2):** Polymarket favored Trump at all but 2 time points (May, Sep 2024); Trump win prob peaked ~67% in October, stayed >55% until election day; diverged from polling ±1 SD from October. Polling hovered ~45% Trump nationally throughout. Polymarket hit 95% (per X posts) before midnight election day.
- **Swing states:** Polymarket clearly superior in AZ, GA, NC (GA/NC rarely below 55%, often 60–80%, "never actually battleground states"); NV, PA clear for Trump from mid-October; PA slightly less clear. WI/MI: both sources ~chance (means ~50/50) — polls arguably better at flagging "too close to call"; largest Nov-3 dips in MI/WI.
- **Forecasting (Fig. 4):** from Oct 18 onward, Polymarket's 95% predictive interval no longer crosses the 50% line (firm Trump prediction); polling mean never favored Trump and its PI always straddled 0.5; on election day polling predicted Harris. 5/7 swing states' Polymarket PIs above 50% by mid-to-late October (AZ/NC/GA from Oct 18; NV/PA from Oct 29).
- **Dynamics:** Polymarket series is random-walk-like (τ²>0 — predictive intervals fan out with horizon); polling is Gaussian noise about a mean (σ²>0, τ²≈0 — flat intervals). Polymarket reacted to events (jump after Jul 13 attempt; drop after Jul 21 Harris entry); polling barely moved.
- **Drivers (Fig. 3):** PA and MI highest spike-and-slab inclusion probabilities for the national market; 95% credible intervals on the fit tight.
- Baselines compared: only polling vs Polymarket (no other market — IEM predicted Harris, noted as a caveat; Kalshi state data started post-October due to regulation).

## 8. Code / data availability
"Code and data necessary to reproduce all analyses" claimed in Supplementary Materials (not verified live). Polymarket data: public Kaggle dataset (Andrade 2024). Polling: FiveThirtyEight (defunct as of Mar 2025 — replication data at risk).

## 9. Leakage & limitations
Adversarial notes: (1) **n=1 election** — no out-of-sample replication; the headline result may not generalize (authors admit this). (2) **Manipulation confound:** the October Trump surge coincides with a single actor's ~$30M in bets across multiple accounts (Osipovich/WSJ 2024) plus wash-trading accusations (Fortune, Oct 2024) — the authors flag this themselves; the "superior prediction" may partly be a whale's thumb on the scale. (3) Sample bias: crypto-only (17–20% of Americans), officially non-US (CFTC settlement) with VPN circumvention — representativeness unknown; possibly just capturing under-polled Republican men (higher crypto ownership). (4) Single-market comparison: IEM predicted Harris — cherry-picking Polymarket flatters the thesis. (5) No de-vigging/calibration analysis of market prices; 95%-before-midnight claim is from X posts, not the data. (6) Bounded probabilities modeled with Gaussian BSTS without transformation. For GSE: none of this transfers to sports directly — election markets are one-shot, low-frequency, and politics-specific; the value is strictly methodological (below) plus the general money-vs-opinion evidence.

## 10. GSE overlap
Existing-research-map check: GSE corpus already covers Polymarket/Kalshi tooling (prediction-market triage 2026-08-09), CLV as a training label, de-vigged consensus, beat-the-close, and line movement/steam — i.e., the "markets are smarter" stance is already GSE doctrine, and this paper's election result adds no new sports evidence. What is **not** in the corpus: a formal time-series decomposition of market-implied probability movements into persistent-signal vs noise components. That is the transferable piece.

## 11. GSE implementation spec
Adapt the BSTS local-level model to NFL betting-market data: target = de-vigged market-implied win probability (or spread/total) time series from the odds API (public, already in GSE's stack) from open to close; fit (5)–(6) per game; use the estimated τ²/σ² ratio as a **steam-vs-noise classifier** — high τ² (random-walk-like, persistent moves) = informed money/steam; low τ² (mean-reverting noise) = public churn. Event-reactivity analysis: align line moves to news timestamps (injury reports, weather) to measure which events actually move markets. Output feeds the existing CLV/beat-the-close lane: only bet/fade moves classified as informed. Data: The Odds API (existing account) + nflverse for outcomes. Effort: ~3–4 days (BSTS via CausalImpact-style or statsmodels; per-game fits are trivial).

## 12. Reproducible test
Dataset: NFL 2023–2024 regular-season games, hourly de-vigged moneyline-implied probabilities from open to kickoff (Odds API). Fit BSTS local-level per game; classify moves by τ²/σ² ratio. Metric: do games flagged "informed steam" (top-quartile τ²/σ² with net move ≥2%) beat the closing line (CLV>0) more often than unflagged moves? Baseline: raw line-move direction (no decomposition) and random move selection. Strictly pre-kickoff features only.

## 13. Acceptance / rejection gate
ADAPT-accept iff informed-steam-flagged moves achieve mean CLV ≥ +1.5% (de-vigged) vs ≤ +0.3% for unflagged moves over the 2023–2024 test set with n ≥ 200 flagged moves (binomial significance); otherwise reject (the decomposition adds nothing over raw line movement).

## 14. Improvement experiment
Replace the Gaussian observation model with a manipulation-robust variant: add a jump/outlier component (à la the paper's own wash-trading caveat) so single-whale dumps (the Polymarket $30M case) are classified as jumps rather than informed drift — test whether jump-filtered τ²/σ² classifies steam more accurately than the vanilla BSTS on games with known single-source line moves (e.g., respected-money alerts). This directly addresses the paper's biggest weakness and is the piece the authors left as future work ("harden these markets").
