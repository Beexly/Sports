# [0501] Statistical Enhanced Learning for Modeling and Prediction of Tennis Matches at Grand Slam Tournaments (arXiv:2502.01613v2)

**Citation:** N. Buhamra and A. Groll (2025). *Statistical Enhanced Learning for Modeling and Prediction of Tennis Matches at Grand Slam Tournaments*. arXiv:2502.01613v2. URL: https://arxiv.org/abs/2502.01613v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,551 lines, incl. appendices).
**Verdict:** ADAPT — the "statistically enhanced" feature-engineering recipe (Elo + nonlinear age transforms as differences) plus strictly time-ordered expanding-window evaluation ports directly to NFL team-strength modeling; drop the tennis-specific features, keep the protocol.

## 1. Research question
Does "statistically enhanced learning" — augmenting conventional covariates (age, rank, points) with statistically motivated engineered features (Elo ratings, nonlinear age transformations) — improve out-of-sample prediction of Grand Slam tennis match winners across logistic regression, GAM/spline, and random forest model classes? The framework follows Felice et al. (2023, arXiv:2306.17006).

## 2. Dataset / schema
- 5,013 matches from 47 men's Grand Slam tournaments, 2011–2022, assembled with the R package `deuce` (Kovalchik 2019).
- No missing values; retirements and walkovers excluded.
- Key columns: player age, ATP rank, ATP points, Elo rating (computed), derived age transforms; all features entered as *differences* between the two players.
- Target: first-named player wins the match (binary).
- Access: public via the `deuce` R package. Code for the paper's models: **not stated in paper**.

## 3. Method / model
Three model classes, each fit on 21 feature combinations (conventional, enhanced, and mixed sets):
- Logistic regression (linear).
- GAM with P-splines (Eilers & Marx) for nonlinear covariate effects.
- Random forest: 400 trees; `mtry` tuned via 10-fold cross-validation (ranger implementation, Wright & Ziegler 2017).

Enhanced features: Elo rating; Age.30 = |age − 30|; Age.int = distance of age outside the [28, 32] interval (0 inside). All features enter as player differences. Note: the paper's stated subtraction direction and its later coefficient interpretations appear inconsistent — flag when reimplementing.

## 4. Equations & assumptions
Feature definitions (faithful to paper):
- Age.30 = |age − 30|
- Age.int = 0 if 28 ≤ age ≤ 32, else min(|age − 28|, |age − 32|)
- All covariates x enter as differences x = x_player1 − x_player2.

No closed-form model equations are printed beyond the standard logistic/GAM/RF forms (treated as known). Assumptions: (a) pairwise differences are sufficient statistics for the matchup (no interaction terms beyond what RF/splines discover); (b) Elo computed on the same 2011–2022 window is a valid strength proxy; (c) excluding retirements/walkovers does not bias the win model; (d) expanding-window refits approximate a true forecasting setup.

## 5. Features / target
- Conventional: Age, Rank, Points (all as differences).
- Enhanced: Elo, Age.30, Age.int (all as differences).
- 21 combinations per model class (singles, pairs, triples, full set).
- Target: binary — first-named player wins. Horizon: single match.

## 6. Validation design
- Main: expanding-window prediction on the four 2022 Grand Slams (Australian Open, French Open, Wimbledon, US Open), training on all prior tournaments.
- Appendix A: leave-one-tournament-out cross-validation over all 47 tournaments.
- Appendix B: rolling window of the last 12 tournaments as training data.
- Metrics: classification rate, likelihood (mean predicted probability of the true outcome), Brier score. All splits are strictly time-ordered — no future leakage in the design.

## 7. Numerical results / baselines
Main expanding-window results (exact as printed):
- Linear, Points+Rank+Elo: classification 0.795.
- Linear, Points+Elo+Age.int: likelihood 0.701.
- Best linear Brier: 0.153.
- Spline, Elo+Age.30: classification 0.792, likelihood 0.703, Brier 0.149.
- RF, Points+Rank+Age.30+Elo (table): 0.820 classification, 0.667 likelihood, 0.151 Brier; conclusion reports classification 0.8202.

Appendix A (leave-one-tournament-out), exact bests:
- Linear: Rank+Elo classification 0.749; Points+Rank+Elo likelihood 0.659, Brier 0.170.
- RF: Rank+Elo classification 0.773; Points+Rank+Elo likelihood 0.645, Brier 0.174.

Appendix B (rolling 12-tournament window), exact bests:
- Linear: classification ~0.647 (Points+Rank+Age.int); likelihood 0.501; Brier 0.293.
- RF: Points+Rank+Age.30+Elo — classification 0.789, likelihood 0.659, Brier 0.165.

Pattern: enhanced features (Elo + age transforms) help most model classes/metrics; RF with the full enhanced set wins overall; the rolling short window degrades linear models sharply but RF holds up.

## 8. Code / data availability
Data via R package `deuce` (public). Model code: none stated. Framework reference: Felice et al. 2023, arXiv:2306.17006.

## 9. Leakage & limitations
- **Elo lookahead:** Elo ratings computed over the full 2011–2022 window may leak post-match information into early-tournament features unless recomputed strictly expanding-window; the paper does not document the Elo computation protocol in the extract.
- **Subtraction-direction inconsistency** between stated feature construction and coefficient interpretation — the sign of every reported effect is suspect until re-derived.
- **No betting-odds benchmark.** Odds are the obvious baseline for match prediction; the paper compares only feature sets against each other, so "0.82 classification" has no market-relative meaning.
- Grand Slams only (best-of-5, 128-draw): findings may not transfer to best-of-3 tour events, let alone team sports.
- Likelihood/Brier gains from enhanced features are modest in absolute terms (e.g., Brier 0.153 → 0.149).
- External validity to NFL: tennis is a two-player zero-sum game with no teammates, no coaching adjustments, no weather; the *feature-engineering philosophy* transfers, the features do not.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE already has Elo/dynamic ratings deeply covered (map's metrics inventory: Elo, Glicko, TrueSkill; state-space 1701.05976) — so the Elo component is **duplicate**. What is *new* (extension): (a) the nonlinear age/development transforms (Age.30/Age.int style) applied to team-strength features — the map has no age-curve feature engineering for NFL (roster age, QB age curves); (b) the discipline of strictly time-ordered expanding-window + rolling-window evaluation reported side by side, which the map's ML brief lists as commissioned but not yet delivered. Cite: `docs/research/2026-09-18-ml-research-brief.md` (areas: online learning, continuous learning loop).

## 11. GSE implementation spec
- Features: for each NFL game, compute team-strength differences: Elo diff (existing), plus "statistically enhanced" transforms — (a) roster-age transforms: |mean starter age − 27|, distance outside [25,29]; (b) QB-age curve transforms: |qb_age − 29|, distance outside [27,32]; (c) rest-day asymmetry transforms; (d) rolling EPA/play with nonlinear recency decay.
- Models: logistic regression, GAM (pyGAM), random forest / gradient boosting — 3 model classes × feature-set ablation mirroring the paper's 21-combo design, but with NFL feature families.
- Data: nflverse 2015–2025; Elo from existing GSE pipeline.
- Training protocol: expanding-window (train ≤ season T−1, test season T) AND rolling 3-season window, both reported — directly copying the paper's main + Appendix B design.
- Serving: weekly refit is cheap (logistic/GAM); RF/GBM refit nightly. Effort: ~2 weeks.

## 12. Reproducible test
- Dataset: nflverse regular-season games 2018–2024; features frozen as-of kickoff; Elo from GSE pipeline recomputed strictly expanding-window.
- Metric: log-loss and Brier on each held-out season (expanding window), plus classification accuracy.
- Baseline to beat: logistic regression on Elo diff alone (the "conventional" analog). Test the enhanced set (Elo + age transforms + rest transforms) in all three model classes.
- Report per-season and pooled; 7 held-out seasons (2018–2024).

## 13. Acceptance / rejection gate
ADOPT the enhanced feature set if, pre-registered: pooled held-out log-loss improves by ≥ 0.005 over the Elo-only logistic baseline AND the gain appears in ≥ 5 of 7 held-out seasons (consistency, not one lucky year). REJECT if the pooled gain is < 0.002 or concentrated in ≤ 2 seasons — the tennis gains likely do not survive NFL noise.

## 14. Improvement experiment
Go beyond the paper: learn the *shape* of the age transform instead of hand-picking |age−30| / [28,32] — fit a 1D P-spline on QB age and on roster mean age inside the GAM, then distill the fitted spline into a piecewise-linear feature for the production logistic model. The paper fixes the functional form a priori; letting the data choose the peak-age window could beat their hand-tuned transforms and gives GSE an interpretable age-curve artifact for content.
