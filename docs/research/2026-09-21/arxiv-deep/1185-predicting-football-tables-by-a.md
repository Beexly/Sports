# [1185] Predicting Football Tables by a Maximally Parsimonious Model (arXiv:1805.08937v1)

**Citation:** Haugen, K. K., & Owren, B. (2018). *Predicting Football Tables by a Maximally Parsimonious Model*. Math. Appl. 1 (2018), 1–12. arXiv:1805.08937v1 [stat.AP]. URL: https://arxiv.org/abs/1805.08937
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the MAE statistical-properties appendix with Theorems A.1 and the E[MAE]/Var[MAE] derivations, and the Tippeliga 2009–2016 regression results).
**Verdict:** ADAPT — the parsimony argument plus the exact MAE null distribution (E[MAE] = (1/3)·(n²−1)/n, max = n/2) give GSE two things: a proper chance baseline for any season-table forecast product, and empirical support (goal difference beating table rank early, R² > 0.8 by round 7) for using early-season goal/point differential — not standings — as the parsimonious team-strength prior.

## 1. Research question
Can a maximally parsimonious model — the current league table itself (or goal difference), with no simulation of individual matches — predict final football tables competitively, and what are the exact statistical properties (min, max, expectation, variance) of the MAE table-prediction metric under random guessing? (Abstract; Secs. 1, 4)

## 2. Dataset / schema
Norwegian top flight (Tippeligaen/Eliteserien), seasons 2009–2016: round-by-round tables with points and goal difference per team per round. Schema: (season, round, team, rank, goal difference). Data via the RSSSF Norwegian Football Archive (Lars Aarhus); authors offer data + Fortran 90 code on request. Plus the illustrative example: Paul Merson's 2016/17 Premier League pre-season table prediction vs. the true final table (20 teams). (Secs. 1, 4)

## 3. Method / model
(1) Theory: for a predicted table permutation P of n teams with MAE = (1/n)Σ|P(i)−i|, derive min (0), max (n/2, attained by the reversed permutation, Theorem A.1), E[MAE] = (1/3)·(n²−1)/n and Var[MAE] = (n+1)(2n²+7)/(45n²) under uniform random guessing (Appendix A). (2) Empirics: for each round r of each Tippeliga season 2009–2016, regress final rank on round-r rank → R²_pos(r), and final rank on round-r goal difference → R²_gd(r); compare the curves. Proposed operational strategy: sort by goal difference early in the season, switch to the latest table later. (Secs. 2–4, App. A)

## 4. Equations & assumptions
- MAE = (1/n)Σ_{i=1}^n |P(i) − i|; MSE analog also defined (eq. 1.2); authors choose MAE for interpretability.
- Theorem A.1: max_P S(P) = n²/2 (even n), attained by P₀ = [n,n−1,…,1]; hence max MAE = n/2.
- E[MAE] = (1/3)·(n²−1)/n (eq. A.6); Var[MAE] = (n+1)(2n²+7)/(45n²) (eq. A.7).
- Round-r regressions: i = β₀ + β₁P(i) + ε_i (eq. 4.1), R²(r) curves for rank and goal difference.
- Worked example: n=20 → E[MAE]=6.65, max=10; Merson's MAE = 2.8; P(exact table by chance) = 1/20! ≈ 4×10^−19.
- Assumptions stated: uniform random permutation null; even n for the max proof; the parsimony claim assumes no structural breaks (promotion/relegation handled by restricting to in-season prediction after some rounds played).

## 5. Features / target
Inputs: round-r table rank or round-r goal difference per team. Target: final-season table rank (a permutation of 1..n). Horizon: rest-of-season (from round r to final).

## 6. Validation design
Eight seasons of round-by-round R² curves (2009–2016 Tippeligaen) — a genuine multi-season replication, though in-sample per season (regressions fit and evaluated on the same season's rounds; the *pattern* across 8 seasons is the evidence). No comparison against the simulation-based literature methods the paper critiques (authors acknowledge this as future work). The Merson example is illustrative, not a controlled comparison. (Secs. 4–5)

## 7. Numerical results / baselines
Paper's reported results: Merson's 2016/17 PL prediction MAE = 2.8 vs. random-guess E[MAE] = 6.65 (n=20) — presented as evidence of expert skill vs. chance. Tippeligaen 2016: R²_pos(r) reaches 0.80 by round 7 (80% of final-table variation explained 7 rounds in). Across 2009–2016: goal difference beats table rank (R²_gd > R²_pos) early in the season in 7 of 8 seasons; the one exception is 2016, where rank dominated all rounds. Roughly 80% explanatory power by mid-season for most seasons. Distinguish: R² values are in-sample per season; the cross-season consistency is the finding, not any single R².

## 8. Code / data availability
Data + Fortran 90 programs available from authors on request (no URL). No code link.

## 9. Leakage & limitations
(1) In-sample R² per season — the regressions are descriptive; no true out-of-sample table forecast is ever scored against the simulation methods they criticize (acknowledged); (2) Norwegian league only, 2009–2016 — generalizability to the NFL asserted, not shown; (3) no covariates: goal difference conflates schedule strength (early-season schedules are unbalanced); (4) the MAE null is uniform-random permutations — a strawman baseline no real forecaster resembles; (5) 2016 counterexample (rank beat goal difference all season) gets little discussion.

## 10. GSE overlap
Complements the ratings lane. The existing-research-map shows GSE tracks Elo, Massey/Sagarin/Colley, market-implied tiers (benbbaldwin), and FPI — but the *parsimony* question (how much does raw early-season point differential add over standings/market priors?) is not isolated anywhere in the corpus, and no ledger derives an exact null distribution for a table/rank forecast metric. Two concrete transfers: (a) the MAE null (E = (1/3)(n²−1)/n) as the chance baseline for any GSE season-standings product (division-winner tables, playoff seeding forecasts); (b) the goal-difference-early finding as a prior for NFL team strength: early-season point differential (schedule-adjusted — fixing the paper's flaw) as the parsimonious rating input before market/models stabilize.

## 11. GSE implementation spec
1. Build the NFL analog: for each week r of each season 2015–2025, regress final standings (division rank / win total) on week-r standings and on week-r schedule-adjusted point differential → R²_pos(r), R²_pd(r) curves. 2. Compare against GSE's current early-season team-strength prior: does schedule-adjusted point differential add explanatory power over the market-implied prior in weeks 1–6? 3. Adopt the winner as the early-season prior in the engine's team-strength module. 4. Publish the MAE-null formulas in the season-product methodology as the documented chance baseline. Effort: ~2–3 days (nflverse schedules + regression harness).

## 12. Reproducible test
Dataset: nflverse schedules/standings 2015–2024 (curve estimation) → 2025 (frozen test). Metric: out-of-sample R² (or rank-correlation) of final win totals predicted at each week r from (a) standings only, (b) schedule-adjusted point differential only, (c) GSE current prior. Baseline: (c) and the paper's standings-only model. Window: 2025 season, weeks 1–8, fixed in advance. Gate: adopt if (b) or (b)+(market) beats (c) by ≥0.03 out-of-sample R² in weeks 1–6.

## 13. Acceptance / rejection gate
ADOPT schedule-adjusted early point differential as the engine's weeks-1–6 team-strength prior if it beats the current prior by ≥0.03 out-of-sample R² on 2025 final win totals (weeks 1–6 forecasts); REJECT (keep current prior) otherwise. Documentation gate (independent): the MAE-null formulas are adopted into the season-product methodology docs regardless — they are exact math, not empirical claims.

## 14. Improvement experiment
Go beyond the paper: fix its two flaws at once — (1) schedule-adjust the differential (the paper's goal difference ignores fixture imbalance, which is worse in the NFL's 17-game season), and (2) run the *true* out-of-sample horse race the authors skipped: parsimonious differential-prior vs. a full simulation-based season forecast (Monte Carlo of remaining games from team strengths) scored on final-table MAE against the exact null. If the parsimonious model ties or wins, GSE gets a cheaper season-simulation engine with a published justification; if it loses, the paper's parsimony claim is bounded and the engine keeps the simulator.
