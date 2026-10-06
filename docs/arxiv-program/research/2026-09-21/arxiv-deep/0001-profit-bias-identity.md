# 0001 The profit-bias identity in sports betting: bookmaker profit as the public's prediction error (arXiv:2609.06739v1)

**Citation:** Jacek P. Dmochowski (2026). *The profit-bias identity in sports betting: bookmaker profit as the public's prediction error*. arXiv:2609.06739v1. URL: https://arxiv.org/abs/2609.06739v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, including supplementary information and references).
**Verdict:** ADOPT — the exact decomposition of bookmaker profit into hold, shading × public lean, and outcome covariance gives GSE a mathematically airtight auditing framework for any public-money / CLV / book-bias analysis.

## 1. Research question

The paper derives an exact, assumption-light identity relating a sportsbook's expected profit on a two-outcome market to (a) the book's hold, (b) the public's systematic prediction error (the book's "bias"), and (c) the covariance between the book's line shading and the realized outcome. It asks: when the public systematically backs the losing side — i.e., the book's price deviates from true win probabilities — how does that mispricing decompose into book profit, and is the observed public error a genuine inefficiency or a book-induced artifact (shading), or simply chance (outcome covariance)? Empirically it tests this on MLB run-line betting splits, asking whether bettors really back losers more than winners, and if so, whether it is shading (prices following money), public bias, or luck.

## 2. Dataset / schema

- **Sample:** 1,139 MLB games, 2026-05-31 through 2026-08-28.
- **Betting splits:** DraftKings Network run-line betting splits, sampled hourly (percentage of bets and handle on home/away run line at each price point); split data are sparse — not every game has a full hourly series.
- **Prices:** run-line prices (home and away), from which the spread s and vig parameter φ are reconstructed per game.
- **Outcomes:** final scores from the ESPN scoreboard API; realized margin M and home/away cover indicators.
- **Schema (per game):** game id, date/time, home/away teams, hourly series of (home bet %, home handle %, home price, away price), final score, realized margin M, spread s, vig φ.
- **Access:** proprietary (DraftKings Network splits via its public-facing splits pages; ESPN scoreboard API is public). The author reconstructs rather than observes handle, so the dataset is replicable only in the sense that anyone can re-scrape the same public split feeds; true handle-weighted quantities are not observable to outsiders.

## 3. Method / model

The core is an exact accounting identity, not a fitted model. Define for spread s: book's expected profit per unit of handle E[π(s)], the public's probability of backing the losing side Q(s), and the vig parameter φ (with φ = 0 being fair odds). The paper proves E[π(s)] = (1+φ)Q(s) − φ, then decomposes Q(s) into a margin-distribution term and two bias terms: λ(s) (the book's "shading," i.e., how the price differs from the no-vig fair price as a function of public money) and δ(s) (the public's directional prediction error / bias), plus θ(s) (a weighting tied to the margin distribution). Under symmetric vig and no pushes this yields Q(s) = 1/2 + 2θ(s)λ(s) + 2F_m(s)F̄_m(s)δ(s), and E[π(s)] = (1−φ)/2 + 2(1+φ)[θ(s)λ(s) + F_m(s)F̄_m(s)δ(s)]. The general asymmetric-vig form is E[π(s)] = h + Dθ(s)λ(s) + DF_m(s)F̄_m(s)δ(s), where h is the hold and D is a scaling constant. Empirically: (1) a pooled bootstrap test of whether the public's losing-side share differs from 50%; (2) the same test stratified by favorite identity (home favorite vs away favorite); (3) hourly dynamics of the losing-side share; (4) local projections of home bet share on price changes (and the reverse regression) to test whether prices follow money (shading) or money follows prices; (5) reconstruction of the book's per-game profit from splits and prices, compared against the theoretical hold; (6) calibration checks of the author's margin-distribution model (average mispricing and largest local departure vs a calibrated simulation); (7) bounds on the three profit components (aligned shading ≤ 3.7 pp, outcome covariance ≤ 5.2 pp, shading-profit slope 1.35% of handle per percentage point of shading).

## 4. Equations & assumptions

Core identities (quoted exactly as in the paper):

- E[π(s)] = (1+φ)Q(s) − φ
- Q(s) = b_{h,L}(s)P(M<s) + b_{v,L}(s)P(M>s)
- Q(s) = 1/2 + 2θ(s)λ(s) + 2F_m(s)F̄_m(s)δ(s)  (symmetric vig, no pushes)
- E[π(s)] = (1−φ)/2 + 2(1+φ)[θ(s)λ(s) + F_m(s)F̄_m(s)δ(s)]
- General asymmetric-vig form: E[π(s)] = h + Dθ(s)λ(s) + DF_m(s)F̄_m(s)δ(s)
- Public-belief model: Y = X + ε + V, M = X + U
- Q(s) = P(public backs losing side)

Assumptions stated in the paper: two-outcome market; the book sets prices and the public's money shares are taken as given (no equilibrium model of how the book chooses s); margin distribution F_m estimated from historical margins; in the main decomposition, symmetric vig and no pushes (the general form relaxes this); the public-belief model assumes the public's perceived outcome Y equals the true signal X plus noise ε plus a bias term V, and the book's margin model M = X + U. The empirical profit reconstruction assumes split percentages proxy handle shares (handle-weighting is reconstructed, not observed). The local projections assume linearity and, for the causal reading, that price changes are not confounded by simultaneous news — the paper is explicit that the analysis is mostly noncausal.

## 5. Features / target

Not a prediction paper in the ML sense; there are no model features. The "inputs" per game are: the run-line spread s, home/away prices, the hourly public bet/handle shares, and the realized final margin M. The "targets" analyzed are: Q(s) (probability the public backs the losing side), the book's per-game profit π(s), the shading term λ(s), the public bias term δ(s), and the outcome-covariance term. Stratification variable: favorite identity (home favorite vs away favorite). Hourly analysis variable: time to first pitch.

## 6. Validation design

There is no train/test split — this is an accounting identity plus hypothesis tests on a single observational sample, not a predictive model. Validation consists of: (1) bootstrap hypothesis tests (pooled and stratified) for Q(s) ≠ 50%; (2) local-projection regressions with t-statistics and p-values for price→share and share→price directions; (3) comparison of reconstructed mean book profit (5.20%, 95% CI [0.88, 9.35]) against the theoretical hold (4.39%); (4) a calibration check of the margin model: average mispricing +0.48 pp, 95% CI [−2.42, +3.38], largest local departure 5.8 pp vs 9.4 pp under a calibrated simulation, p = 0.54 (i.e., no evidence of miscalibration); (5) component bounds: aligned shading at most 3.7 pp, outcome covariance at most 5.2 pp. No out-of-sample prediction is performed.

## 7. Numerical results / baselines

All numbers below are the paper's, quoted exactly:

- Pooled home-share gap: 56.4% versus 50.6%, difference 5.8 percentage points, bootstrap p = 0.0004, n_L = 584, n_W = 555. (Authors' claim: pooled, the public backs the losing side significantly more often.)
- Stratified (authors' key result — the pooled effect disappears):
  - Home favorites: −1.5 pp, p = 0.51, n = 608
  - Away favorites: +0.6 pp, p = 0.79, n = 531
- Hourly dynamics:
  - Home underdogs' losing-side share: 46.9% ± 2.6 to 52.0% ± 2.1 (rises toward first pitch)
  - Home favorites: 54.4% ± 2.4 to 53.8% ± 2.0 (flat)
- Local projections (price → home share): a one-percentage-point price increase lowers home share by about 0.2 points; peak β = −0.20, t = −3.11, p = 0.002, n = 1090.
- Reverse (share → price): |β| ≤ 0.010, all p > 0.27, n = 1103 — i.e., no evidence that prices chase money within the hourly data; money chases (or reacts to) prices.
- Reconstructed mean book profit: 5.20%, 95% CI [0.88, 9.35], vs 4.39% hold, N = 1,139; per-game SD 73.8%.
- Favorite lean: +29.6 pp for home favorites, −24.5 pp for visitor favorites (the public leans toward the favorite; sign flips with favorite identity).
- Margin-model calibration: average mispricing +0.48 pp, 95% CI [−2.42, +3.38]; largest local departure 5.8 pp vs 9.4 pp under calibrated simulation, p = 0.54.
- Component bounds: aligned shading at most 3.7 pp; outcome covariance at most 5.2 pp; shading-profit slope 1.35% of handle per percentage point of shading.
- Stated limitations (authors' own): one book, one sport, one market; reconstructed rather than handle-weighted profit; sparse split data; mostly noncausal; two-outcome markets only.

## 8. Code / data availability

None stated. No code repository, no data download link, no supplementary data file described. Data sources named (DraftKings Network splits, ESPN scoreboard API) but no replication package.

## 9. Leakage & limitations

- **The pooled 5.8 pp "public backs losers" result is a composition artifact.** The authors themselves show it vanishes under stratification by favorite identity (−1.5 pp, p = 0.51; +0.6 pp, p = 0.79). Any GSE use of this paper must condition on favorite identity; the headline pooled number is misleading on its own. (This is the authors' conclusion, and it is the single most important methodological warning in the paper.)
- **Reconstructed, not observed, handle.** Book profit is reconstructed from bet-percentage splits, not handle percentages. If large bettors behave differently from the median bettor (they do — "dumb money" vs "smart money" skew), the 5.20% mean and its wide CI [0.88, 9.35] are biased in an unknown direction. Per-game SD of 73.8% shows the estimate is extremely noisy.
- **One book, one sport, one market, one season window.** DraftKings run lines, MLB, May–August 2026. No evidence the identity's empirical magnitudes (or even signs) transfer to NFL spreads/totals, to other books, or to moneylines.
- **Mostly noncausal.** The local projections are predictive regressions on observational hourly data; simultaneous news (lineup announcements, weather) moves both prices and shares. The reverse-regression null (|β| ≤ 0.010, all p > 0.27) is evidence against strong within-hour price-chasing-money, but absence of evidence at hourly granularity is not evidence of absence at finer granularity.
- **Sparse splits.** Not all 1,139 games have complete hourly series; selection effects (which games get full split coverage — typically higher-profile games) are unstated.
- **Two-outcome markets only.** The identity does not cover three-outcome markets (soccer 1X2) or parlays; extension is not derived.
- **The calibration check has low power.** Largest local departure 5.8 pp vs 9.4 pp under simulation, p = 0.54, with CIs spanning ±3 pp — the margin model could be meaningfully miscalibrated and this test would not catch it.

## 10. GSE overlap

Directly extends GSE's existing prediction-market / CLV / book-bias lane rather than duplicating it. The existing-research map inventories: prediction-market ecosystem triage (2026-08-09), prediction-market tool bookmarks, Kalshi tooling, market-implied ratings, and extensive calibration work (CQR, grouping loss, temperature/Platt/isotonic calibration, LRD, ECE-by-slice). What this paper adds that GSE does not have: (1) an exact algebraic decomposition of book profit into hold + shading×lean + outcome covariance — GSE's CLV work measures value against closing lines but does not decompose *why* the book profits; (2) the favorite-identity stratification warning, which is directly actionable: any GSE "public is biased" analysis must condition on who is favored, or it will manufacture phantom bias from composition effects; (3) the local-projection test for price-follows-money vs money-follows-price, which GSE can run on its own odds-movement data. Market microstructure and Kelly-under-uncertainty are already flagged as priority gaps in the map; this paper is microstructure-adjacent (price formation) and sharpens rather than fills the Kelly gap.

## 11. GSE implementation spec

1. **Data:** Pull public betting-split feeds (DraftKings Network–style bet%/handle% splits where available; fallback: any split source GSE already ingests) plus a historical odds feed (The Odds API, already on Garrett's 20K credits/month plan) for NFL spreads/totals, 2024–2026 seasons. Outcomes from nflverse.
2. **Reconstruct the identity per game:** estimate the margin distribution F_m per market from historical margins; compute spread s, vig φ, hold h from the two-sided prices; compute the public's losing-side share Q(s) from splits; decompose realized book-side profit per game into the three terms (h, Dθ(s)λ(s), DF_m(s)F̄_m(s)δ(s)).
3. **Stratification gate:** every public-bias statistic is computed pooled AND stratified by favorite identity (home favorite / away favorite / pick'em). Ship only stratified numbers; report pooled numbers with the composition warning attached.
4. **Price-vs-money direction test:** replicate the local projections on GSE's intraday odds + splits: regress share changes on lagged price changes and price changes on lagged share changes; report both directions.
5. **Serving:** batch pipeline (nightly), not real-time; outputs feed the GSE research corpus as a "book profit decomposition" table per slate, and any public-facing "public money is wrong here" content must pass the stratification gate first.
6. **Effort estimate:** 2–3 days for the NFL spread/total reconstruction prototype; the math is closed-form, the work is data plumbing.

## 12. Reproducible test

Using GSE's own data: NFL regular-season spreads and totals, 2024 and 2025 seasons, from The Odds API (prices) + nflverse (margins/outcomes) + the best available public-split feed. For each game, compute the author's decomposition and the stratified losing-side-share test (home favorite vs away favorite). Metric: the stratified gap in Q(s) vs 50% with bootstrap p-values, and the fraction of book profit attributable to each of the three components. Baseline to beat: the paper's MLB finding that stratification eliminates the pooled effect — the test succeeds if GSE's pipeline reproduces the pooled-vs-stratified contrast on NFL data (i.e., detects whether a pooled "public backs losers" claim survives favorite-identity stratification). Time window: full 2024–2025 NFL regular seasons. Runnable as a batch notebook; no new data purchases needed.

## 13. Acceptance / rejection gate

ADOPT the decomposition framework if, on 2024–2025 NFL spreads/totals: (a) the pipeline reproduces the paper's qualitative pattern — a pooled losing-side share significantly ≠ 50% that shrinks toward zero (|gap| < 2 pp, p > 0.10) under favorite-identity stratification — OR finds a stratified gap that survives (|gap| ≥ 3 pp, p < 0.05), which would be a genuine, tradable public-bias signal; and (b) the three-component profit attribution is computable for ≥ 90% of games without manual intervention. REJECT (keep as reference only) if split coverage is too sparse (< 60% of games) or the decomposition terms are numerically unstable (component magnitudes swinging > 10 pp across bootstrap resamples).

## 14. Improvement experiment

Go beyond the paper in the direction it explicitly leaves open: replace reconstructed handle with *actual* handle proxies. The paper's weakest link is using bet-percentage splits to reconstruct handle-weighted profit. GSE-side experiment: (1) obtain a handle% split source (several feeds publish handle% alongside bet%); (2) run the identical decomposition with bet%-reconstructed vs handle%-reconstructed profit and quantify the divergence — the paper's identity predicts the gap between the two reconstructions equals exactly the covariance between bet size and outcome conditional on side, a quantity the paper bounds (≤ 5.2 pp) but never measures; (3) extend the identity to three-outcome markets (1X2/EPL draws) by adding a push/draw state to Q(s) — the algebra generalizes by splitting P(M<s), P(M>s), P(M=s), and testing it on EPL data would be a novel contribution the paper does not attempt.
