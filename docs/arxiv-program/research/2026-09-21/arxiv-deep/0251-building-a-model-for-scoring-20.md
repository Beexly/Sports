# [0251] Building a model for scoring 20 or more runs in a baseball game (arXiv:1011.1996v1)

**Citation:** Huber, M. R. & Sturdivant, R. X. (2010). *Building a model for scoring 20 or more runs in a baseball game*. The Annals of Applied Statistics, 4(2). DOI: 10.1214/09-AOAS301. arXiv:1011.1996v1. URL: https://arxiv.org/abs/1011.1996
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~26,930 chars, complete).
**Verdict:** REJECT — an MLB tail-event (20+ run games) case study with no transfer path to GSE's NFL engine: scoring is not a rare-event regime in football, and the era-segmented exponential IAT model has no analogue in any GSE product lane.

## 1. Research question
How often can we expect an MLB team to score ≥20 runs in a game (a rare event: 224 occurrences since 1901, 0.13% of games), and can the historical inter-arrival times (IATs) be modeled as a memoryless Poisson process — first with a single exponential model, then with era-specific exponential rates — to predict the probability of the next occurrence?

## 2. Dataset / schema
All MLB regular-season games 1901–2008 (through end of 2008 season; plus two 2009 events): 171,797 games played; 222 games with a team scoring ≥20 runs (224 including 1901–2009 full). Source: Baseball-Reference "Play Index" (accessed May 2009) for occurrence lists, Retrosheet.org annual game logs for date verification. Schema per event: team, date, and IAT = cumulative count of MLB games between consecutive 20+-run games (continuous count wrapping across seasons; event assumed first game of the day, or last game of the day for second games of doubleheaders). Public data (Retrosheet).

## 3. Method / model
(1) Single exponential model: MLE λ̂ = 1/mean(IAT); fit assessed via EDF vs CDF plot, QQ plot, and three GOF tests (Kolmogorov–Smirnov, Anderson–Darling, Pearson χ² with 10 df from decade binning). (2) Outlier analysis of the 10 worst-fit points → identified clustering in 1967–1975 and 1985–1992 (largest IAT: 1985 Phillies, 9,723 games; 1967 Cubs, 7,181). (3) ANOVA on IAT by baseball era (Dead Ball 1901–1919, Lively Ball 1920–1941, Integration 1942–1960, Expansion 1961–1976, Free Agency 1977–1993, Long Ball 1994–current) with family-wise 95% pairwise comparisons. (4) Separate exponential MLE per era with per-era QQ/EDF plots and A–D + K–S tests. All analysis in R.

## 4. Equations & assumptions
- Exponential pdf: f(t; λ) = λe^{−λt} for t ≥ 0 (0 otherwise), λ > 0.
- E[T] = 1/λ; Var(T) = 1/λ² (mean = SD, used as a diagnostic).
- Memoryless property: the only continuous distribution for IATs of a memoryless process.
- MLE: λ̂ = 1/mean(IAT).
- Prediction: P(event within t games) = 1 − e^{−λ̂t} (computed from the fitted CDF: 1,425 games → 87%; 300 games → 34.3%; 600 games → 57.4% under the Long Ball rate).
- Assumptions: occurrences are independent across games/seasons (Poisson); rate constant within each era; daily ordering assumption (event = first game of the day) introduces only small IAT error; era boundaries are exogenously defined.

## 5. Features / target
Inputs: era label of the current date; elapsed games since last 20+-run event. Target: probability of at least one ≥20-run game occurring within the next t games. No covariates beyond era.

## 6. Validation design
No train/test split and no prediction backtest. Model fit judged by (a) graphical fit (EDF vs CDF, QQ plots with 95% confidence bounds), (b) GOF hypothesis tests (K–S, A–D, χ²) against H₀: model fits, (c) ANOVA + pairwise comparisons for era heterogeneity. Predictions (e.g., the April 18, 2009 Indians 22–4 game being "high probability") are post-hoc illustrations, not evaluated out-of-sample.

## 7. Numerical results / baselines
Single exponential: mean IAT = 760.8 games; λ̂ = 0.001314444. GOF rejects: K–S = 0.1581 (exact p = 0.000026); A–D = 8.207 (critical 2.534 at 0.25% level); χ² = 44.616 vs critical 18.31 at 5% (df = 10).
Era rates (MLE λ̂; mean IAT; SD IAT): Dead Ball 0.001632613 (612.5; 859.7); Lively Ball 0.002495138 (400.8; 439.4); Integration 0.001538142 (650.1; 813.2); Expansion 0.000433401 (2,307.3; 2,088.3); Free Agency 0.000640466 (1,561.4; 2,135.8); Long Ball 0.001408975 (709.75; 709.79). ANOVA on IAT by era: p < 0.0001; pairwise: Expansion and Free Agency differ significantly from all other eras but not from each other; no other eras differ.
Era GOF: Dead Ball rejected (A–D = 4.054, p ≪ 0.0025; K–S p = 0.03348); all other eras pass (A–D p > 0.15–0.25; K–S p = 0.53–0.98). Dead Ball failure attributed to anomalous clusters: 12 events in 1901–1902 and 10 in 1911–1912 vs 11 in the other 16 years of the era (hypothesized: 1901 AL expansion diluted pitching).
Illustrative predictions (Long Ball era, λ = 0.001408975): after an IAT of 1,425 games (Opening Day 2009), P(next event within the game-day count context) = 87%; after 300 games (one month), 34.3%; after 600 games, 57.4%. Event-count facts: Yankees lead with 25 occurrences; only Arizona, Houston, Tampa Bay never scored 20+ (through 2009); 1939 Yankees and 1950 Red Sox the only teams with 3 in one season; record 30 runs (2007 Rangers). All numbers are the paper's claims from public Retrosheet/Baseball-Reference data.

## 8. Code / data availability
Analysis in R; no code link stated. Data public (Retrosheet.org, Baseball-Reference Play Index) but the assembled IAT series is not shared.

## 9. Leakage & limitations
- Era boundaries are defined ex post from baseball history; fitting rates within pre-labeled eras and then "confirming" era differences is circular — the ANOVA finding partly restates the era definitions.
- The daily-ordering assumption (event treated as first game of the day) injects ±tens of games of noise into IATs, negligible at IAT ~760 but material for the short-IAT tail.
- Post-hoc prediction stories (the 2009 Indians game) are not backtests; the model was fit on data including the predicted events' predecessors but its hit rate is never measured.
- No covariates: park effects, DH rule, expansion, interleague play are all absorbed into coarse era dummies; the Dead Ball era failure shows the era model breaks exactly when the sub-era rate is non-constant — the same flaw it was built to fix.
- Selection: "rare event" defined by the authors' <1% threshold; the 20-run cutoff is arbitrary and results would differ at 18 or 25.
- External validity to NFL: essentially none. NFL scoring is not a rare-event process (every game has multiple scores); GSE's totals lane works with per-play EPA distributions and weather/situational models, not tail-event inter-arrival models. No mechanism in the paper transfers.

## 10. GSE overlap
Duplicate in the narrowest methodological sense, new in domain — and neither matters for GSE. The existing-research map's gap list asks for NFL-relevant modeling (live spread/total surfaces, weather physics, Kelly sizing); nothing here applies. Poisson/exponential IAT modeling overlaps conceptually with paper [0249]'s scoring-tempo Poisson analysis, but that one is NFL-relevant whereas this is an MLB trivia-scale rare-event study. No GSE product lane (engine picks, props, DFS, in-play) has a use for 20+-run-game forecasting. Verdict: no overlap worth building on.

## 11. GSE implementation spec
None — REJECT, no build. The closest NFL analogue (modeling occurrences of ultra-rare game events, e.g. 50+ point team games, via era-segmented exponential IATs) has no betting or content application: markets price totals directly, and a memoryless tail-event forecast adds nothing over the totals distribution.

## 12. Reproducible test
Not applicable — REJECT. (A reproduction would re-derive IATs from Retrosheet 1901–2008 and re-run the GOF battery; runnable but pointless for GSE.)

## 13. Acceptance / rejection gate
REJECT stands. Reconsider only if a concrete GSE lane emerges for tail-event forecasting with a betting or content payoff (none exists today).

## 14. Improvement experiment
Within the paper's own frame: replace fixed historical era boundaries with a changepoint-detection model (e.g., Bayesian piecewise-exponential with unknown changepoints fit by reversible-jump MCMC) and compare out-of-sample one-step-ahead predictive log-likelihood against the fixed-era model on a rolling origin from 1920 onward — this would test whether the "era" story is a real regime structure or an artifact of hand-labeled boundaries, which is exactly the circularity the current paper never resolves.
