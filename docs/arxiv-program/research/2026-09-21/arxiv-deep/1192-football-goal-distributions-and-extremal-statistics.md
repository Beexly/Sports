# [1192] Football goal distributions and extremal statistics (arXiv:cond-mat/0110605v2)

**Citation:** J. Greenhough, P. C. Birch, S. C. Chapman, G. Rowlands (2001). *Football goal distributions and extremal statistics*. arXiv:cond-mat/0110605v2. URL: https://arxiv.org/abs/cond-mat/0110605v2
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF; all sections read, references skimmed).
**Verdict:** REJECT

A descriptive statistical-physics study of soccer goal-count distributions with no predictive model, no out-of-sample test, no calibration, and no betting evaluation; the heavy-tail characterization it offers has no actionable transfer to GSE's NFL spreads/totals/fantasy/calibration lanes. To be replaced by a new full-paper read (ledger 1351, not yet selected/read at the time of this ledger).

## 1. Research question
Do the distributions of goals scored by home teams, away teams, and the total in domestic football matches follow Poisson or negative-binomial statistics, or are their tails better described by extremal (extreme-value) statistics? The authors pool >135,000 domestic matches from 169 countries (1999–2001) plus ~13,000 English top-division and ~5,000 FA Cup matches (1970/71–2000/01) and test which family fits the full distribution including the tail.

## 2. Dataset / schema
- Worldwide domestic league matches, 169 countries, 1999–2001: **>135,000 matches**; only home/away/total goal counts used.
- English top division, 1970/71–2000/01: **~13,000 matches**.
- FA Cup, 1970/71–2000/01: **~5,000 matches**.
- Schema: integer goal counts per team per match; no team identities, dates, odds, or covariates used in the analysis. Data source described as a football results database (no URL given in the paper as extracted); effectively unreplicable as stated. Proprietary/unsourced for practical purposes.

## 3. Method / model
Empirical probability density functions (PDFs) of home goals, away goals, and total goals are constructed and fitted, over their entire ranges, to: Poisson distributions, negative-binomial distributions (NBD), and the three classical extreme-value families (Gumbel, Fréchet, Weibull). Parameters are fitted by the authors' fitting procedure (details as extracted: moment/matching-based fits with tail comparisons); no train/test split, no cross-validation, no predictive evaluation.

## 4. Equations & assumptions
- Poisson: P(n) = e^(−λ) λ^n / n! with team/league-specific λ.
- Negative binomial as the standard over-dispersed alternative.
- Extreme-value families: Gumbel (shape parameter a = 1), Fréchet (a = 1.04 home, a = 1.10 away), Weibull; fitted to the pooled worldwide domestic PDFs.
- Assumptions: matches within a pooled set are treated as draws from one stationary distribution (no team-strength, era, or league heterogeneity modeled); tail departures are interpreted as evidence for an extremal process rather than mixture effects.

## 5. Features / target
No features; the "model" is a univariate distributional fit. Target: the empirical PDF of home goals, away goals, and total goals.

## 6. Validation design
No train/validation/test split and no out-of-sample validation. "Validation" consists of visual and moment-level comparison of fitted PDFs against empirical PDFs, plus a contrast set: English top-division and FA Cup data are shown to be adequately fit by Poisson/NBD (consistent with earlier-season analyses) and *not* consistent with extremal statistics — the opposite of the pooled worldwide result.

## 7. Numerical results / baselines
- Pooled worldwide domestic matches: Poisson and NBD fail over the full range; tails best described by Fréchet with **a = 1.04 (home)**, **a = 1.10 (away)**, and Gumbel (**a = 1**) for total goals.
- Tail transition points (where empirical PDFs depart from Poisson/NBD): home beyond ≈ **μ + 3σ (~6 goals)**, away beyond ≈ **μ + 4σ (~6 goals)**, total beyond ≈ **μ + 3σ (9 goals)**.
- Total-goal moments: domestic **μ = 2.9, σ = 1.9**; English league **2.6, 1.7**; FA Cup **2.8, 1.8**.
- Mean home-minus-away goal difference: **0.51** (domestic pooled).
- English top-division and FA Cup: Poisson/NBD adequate; no extremal signature.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **No predictive content at all**: the paper fits distributions to the same data it describes; nothing is forecast, backtested, or evaluated out of sample.
- **Pooling artifact risk**: aggregating 169 heterogeneous leagues (different means and variances) mechanically generates heavy tails; the paper does not rule out that the "extremal" tail is a mixture effect rather than an intrinsic scoring process. The English-only contrast (Poisson/NBD adequate) supports this concern.
- Soccer-only; no market or betting analysis; no calibration; 2001 vintage with no modern tracking/event covariates.
- Major unstated assumption: stationarity of goal distributions across countries, seasons, and competitions within each pooled set.

## 10. GSE overlap
The existing-research map already inventories Poisson, Dixon-Coles, Skellam, and negative-binomial score-modeling machinery, plus Fischer/Heuer soccer Poisson-vs-ML (2408.08331). GSE's totals work is NFL-focused; this paper adds no estimation technique, no predictive model, and no calibration method beyond "fit Fréchet to the tail," which is not actionable for spreads/totals pricing. Duplicate-in-spirit of already-covered distribution-modeling territory, with weaker (purely descriptive) methodology.

## 11. GSE implementation spec
Not applicable — rejection is at the problem level. If a tails-of-totals question ever arose for NFL, the build would be: fit Poisson/NBD/Fréchet to nflverse score differentials and totals, compare tail quantiles out of sample, and test whether the tail model moves any line — a weekend project, not this paper's method.

## 12. Reproducible test
Not applicable. A sanity reproduction would fit NBD vs Fréchet to any large soccer results database and recover heavy home/away tails in pooled multi-league data and their absence in single-league data — reproducing the paper's descriptive claim without any predictive implication.

## 13. Acceptance / rejection gate
Reject: no predictive model, no out-of-sample evaluation, no market test, and the central empirical claim is plausibly a pooling artifact. No numeric gate can be satisfied because no forecast is produced.

## 14. Improvement experiment
None proposed — the gap is the absence of prediction, not the quality of the fits. A genuinely useful version of this paper would ask whether tail-aware (Fréchet/NBD-mixture) total-goals models beat Poisson baselines on out-of-sample log-loss and CLV in totals markets; the authors do not attempt this.

**Verdict:** REJECT
